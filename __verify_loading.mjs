import { chromium } from "@playwright/test";
import fs from "fs";

const outDir = "/tmp/loading-verify";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext();
// Throttle network so a fast local dev server still shows a visible
// loading state, closer to what production feels like.
const client = await context.newCDPSession(await context.newPage());
const page = context.pages()[0];
await client.send("Network.enable");
await client.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 400,
  downloadThroughput: (2 * 1024 * 1024) / 8,
  uploadThroughput: (2 * 1024 * 1024) / 8,
});

const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
await page.fill('input[name="email"]', "loading-boundary-test@example.com");
await page.fill('input[name="password"]', "TestPassword123!");
await page.screenshot({ path: `${outDir}/1-login-filled.png` });
await page.getByRole("button", { name: "Sign in", exact: true }).click();

// Poll the URL directly rather than waitForURL's default "load" wait —
// a long-lived connection (SSE poll stream, analytics) can keep the
// browser's load state pending even once the route we care about is showing.
for (let i = 0; i < 100 && !/\/projects\//.test(page.url()); i++) {
  await page.waitForTimeout(150);
}
console.log("Logged in, landed on:", page.url());
await page.screenshot({ path: `${outDir}/2-landed.png` });

// Navigate to Signals — the exact click the user reported as "frozen".
const signalsLink = page.locator('a[href*="/signals"]').first();
await signalsLink.click();
// Grab a screenshot ASAP after the click, before the new page settles, to
// try to catch the loading fallback in-flight.
await page.waitForTimeout(150);
await page.screenshot({ path: `${outDir}/3-signals-mid-nav.png` });
await page.waitForTimeout(4000);
await page.screenshot({ path: `${outDir}/4-signals-settled.png` });
console.log("Signals page URL:", page.url());

// Click into a signal detail page if one exists — the card's "Reply" link
// is the actual navigation to /signals/[id] (see signal-card.tsx).
const signalCard = page.getByRole("link", { name: "Reply" }).first();
if (await signalCard.count()) {
  await signalCard.click();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${outDir}/5-signal-detail-mid-nav.png` });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${outDir}/6-signal-detail-settled.png` });
  console.log("Signal detail URL:", page.url());
}

// Navigate to Dashboard.
const dashLink = page.locator('a[href*="/dashboard"]').first();
if (await dashLink.count()) {
  await dashLink.click();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${outDir}/7-dashboard-mid-nav.png` });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${outDir}/8-dashboard-settled.png` });
  console.log("Dashboard URL:", page.url());
}

console.log("Console/page errors:", JSON.stringify(errors, null, 2));
await browser.close();
