import { chromium } from "@playwright/test";
import fs from "node:fs";
const OUT = "/private/tmp/claude-501/-Volumes-External-program-side-earshot/1698f6c2-d42f-4f10-b25c-ad4e4cca4414/scratchpad";
const { token, projects } = JSON.parse(fs.readFileSync(`${OUT}/session.json`, "utf8"));
const projectId = projects[0].id;
const base = "http://localhost:3100";
const browser = await chromium.launch();
for (const [tag, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]] as const) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addCookies([{ name: "authjs.session-token", value: token, url: base }]);
  const page = await ctx.newPage();
  await page.goto(`${base}/projects/${projectId}/targeting/v2`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/targeting-v2-${tag}.png`, fullPage: true });
  await page.goto(`${base}/projects/${projectId}/targeting`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/targeting-v1-${tag}.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
console.log("done");
