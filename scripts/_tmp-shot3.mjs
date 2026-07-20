import { chromium } from "@playwright/test";

const PROJECT_ID = process.argv[2];
const OUT_DIR = process.argv[3];

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: "/Volumes/External/program/side/earshot/.tmp-recordings/storage-state.json",
  viewport: { width: 1440, height: 1300 },
});
const page = await context.newPage();
page.on("pageerror", (err) => console.log("[page error]", err.message));

await page.goto(`http://localhost:3000/projects/${PROJECT_ID}/targeting/v2`, { waitUntil: "networkidle", timeout: 30000 });
const tiles = page.locator('button[aria-controls="targeting-deck-drawer"]');
const count = await tiles.count();
for (let i = 0; i < count; i++) {
  await tiles.nth(i).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT_DIR}/fix-module-${i}.png`, fullPage: true });
}
await browser.close();
