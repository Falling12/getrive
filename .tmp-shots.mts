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
  for (const seg of ["home", "targeting", "results"]) {
    await page.goto(`${base}/projects/${projectId}/${seg}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${seg}-${tag}.png`, fullPage: true });
  }
  // redirect check
  const resp = await page.goto(`${base}/projects/${projectId}/signals?status=not-replied`, { waitUntil: "domcontentloaded" });
  console.log(tag, "legacy /signals landed on:", page.url(), resp?.status());
  await ctx.close();
}
await browser.close();
console.log("done");
