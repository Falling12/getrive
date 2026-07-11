import { chromium, type BrowserContext, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = path.resolve(__dirname, "../tiktok-showcase/public");
const TMP_VIDEO_DIR = path.resolve(__dirname, "../.tmp-recordings");
const VIEWPORT = { width: 1080, height: 1920 };
const ACCENT = "#4a6a5e"; // Field Sage — Getrive's single accent, from DESIGN.md

const EMAIL = process.env.GETRIVE_EMAIL;
const PASSWORD = process.env.GETRIVE_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set GETRIVE_EMAIL and GETRIVE_PASSWORD env vars before running.");
  process.exit(1);
}

// Injected into every recorded context so the real mouse cursor + click
// ripples are baked into the footage itself, matching a real device demo.
const CURSOR_OVERLAY_SCRIPT = `
(() => {
  const cursor = document.createElement("div");
  cursor.id = "__rec_cursor";
  Object.assign(cursor.style, {
    position: "fixed",
    top: "0px",
    left: "0px",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    background: "${ACCENT}",
    border: "2px solid rgba(255,255,255,0.92)",
    boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
    zIndex: "2147483647",
    transition: "transform 30ms linear",
    willChange: "transform",
  });
  const attach = () => {
    if (!document.body.contains(cursor)) document.body.appendChild(cursor);
  };
  document.addEventListener("DOMContentLoaded", attach);
  attach();

  let lastX = window.innerWidth / 2;
  let lastY = window.innerHeight / 2;
  const move = (x, y) => {
    lastX = x; lastY = y;
    cursor.style.transform = \`translate(\${x - 7}px, \${y - 7}px)\`;
  };
  move(lastX, lastY);

  window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY), { capture: true, passive: true });

  window.addEventListener("mousedown", (e) => {
    const ripple = document.createElement("div");
    Object.assign(ripple.style, {
      position: "fixed",
      top: "0px",
      left: "0px",
      width: "14px",
      height: "14px",
      borderRadius: "50%",
      border: "2px solid ${ACCENT}",
      transform: \`translate(\${e.clientX - 7}px, \${e.clientY - 7}px)\`,
      pointerEvents: "none",
      zIndex: "2147483647",
      boxSizing: "border-box",
    });
    document.body.appendChild(ripple);
    const anim = ripple.animate(
      [
        { width: "14px", height: "14px", transform: \`translate(\${e.clientX - 7}px, \${e.clientY - 7}px)\`, opacity: 0.6 },
        { width: "40px", height: "40px", transform: \`translate(\${e.clientX - 20}px, \${e.clientY - 20}px)\`, opacity: 0 },
      ],
      { duration: 350, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" }
    );
    anim.onfinish = () => ripple.remove();
  }, { capture: true });

  document.addEventListener("DOMContentLoaded", () => attach());
})();
`;

async function smoothMove(page: Page, x: number, y: number, steps = 25) {
  await page.mouse.move(x, y, { steps });
}

async function login(context: BrowserContext): Promise<string> {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(EMAIL!);
  await page.locator("#password").fill(PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 });

  if (page.url().replace(BASE_URL, "") === "/projects" || page.url().endsWith("/projects")) {
    const fairdueLink = page.getByRole("link", { name: /fairdue/i });
    await fairdueLink.click();
    await page.waitForURL(/\/projects\/[^/]+\/dashboard/, { timeout: 20000 });
  }

  const match = page.url().match(/\/projects\/([^/]+)\//);
  if (!match) throw new Error(`Could not determine projectId from URL: ${page.url()}`);
  const projectId = match[1];
  await page.close();
  return projectId;
}

async function recordClip(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  storageStatePath: string,
  name: string,
  run: (page: Page, projectId: string) => Promise<void>,
  projectId: string
) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    storageState: storageStatePath,
    recordVideo: { dir: TMP_VIDEO_DIR, size: VIEWPORT },
    reducedMotion: "no-preference",
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE_URL });
  await context.addInitScript(CURSOR_OVERLAY_SCRIPT);

  const page = await context.newPage();
  try {
    await run(page, projectId);
  } finally {
    const video = page.video();
    await page.close();
    await context.close();
    if (video) {
      const recordedPath = await video.path();
      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.copyFileSync(recordedPath, path.join(OUT_DIR, `${name}.mp4`));
      console.log(`Saved ${name}.mp4`);
    }
  }
}

async function main() {
  fs.mkdirSync(TMP_VIDEO_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const loginContext = await browser.newContext({ viewport: VIEWPORT });
  const projectId = await login(loginContext);
  const storageStatePath = path.resolve(TMP_VIDEO_DIR, "storage-state.json");
  await loginContext.storageState({ path: storageStatePath });
  await loginContext.close();
  console.log("Logged in. projectId =", projectId);

  const only = process.argv.slice(2);
  const shouldRun = (name: string) => only.length === 0 || only.includes(name);

  // --- dashboard.mp4 ---
  if (shouldRun("dashboard"))
  await recordClip(browser, storageStatePath, "dashboard", async (page) => {
    await page.goto(`${BASE_URL}/projects/${projectId}/dashboard`, { waitUntil: "networkidle" });
    await page.getByText("Users acquired through Getrive").waitFor({ state: "visible" });
    await smoothMove(page, 540, 500);
    await page.waitForTimeout(600);
    await smoothMove(page, 540, 620, 20);
    await page.waitForTimeout(1200);
    const needsAttention = page.locator("text=Needs attention").first();
    if (await needsAttention.count()) {
      await needsAttention.scrollIntoViewIfNeeded();
      await smoothMove(page, 540, 1200, 25);
      await page.waitForTimeout(1400);
    } else {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(1000);
    }
    await smoothMove(page, 540, 900, 15);
    await page.waitForTimeout(1500);
  }, projectId);

  // --- signal_detail.mp4 ---
  if (shouldRun("signal_detail"))
  await recordClip(browser, storageStatePath, "signal_detail", async (page) => {
    await page.goto(`${BASE_URL}/projects/${projectId}/signals?status=not-replied`, {
      waitUntil: "networkidle",
    });
    const replyLinks = page.getByRole("link", { name: /^Reply$/ });
    await replyLinks.first().waitFor({ state: "visible" });
    const count = await replyLinks.count();

    // Find a signal that hasn't been drafted yet, so we capture a real,
    // un-cached skeleton -> drafted-text transition rather than an instant
    // load from a previously-generated draft.
    let foundSkeleton = false;
    for (let i = 0; i < count; i++) {
      const link = page.getByRole("link", { name: /^Reply$/ }).nth(i);
      await smoothMove(page, 900, 400 + i * 20, 15);
      await link.hover();
      await page.waitForTimeout(200);
      await link.click();
      await page.waitForURL(/\/signals\/[^/]+$/, { timeout: 15000 });
      await page.getByText(/Getrive AI draft/i).waitFor({ state: "visible", timeout: 20000 });

      const hasSkeleton = await page
        .getByText("Writing a draft reply")
        .isVisible()
        .catch(() => false);
      if (hasSkeleton) {
        foundSkeleton = true;
        break;
      }
      // Already drafted — go back and try the next one.
      await page.goBack();
      await replyLinks.first().waitFor({ state: "visible" });
    }
    if (!foundSkeleton) {
      console.warn("No un-drafted signal found — using whichever signal is currently open.");
    }

    // Real Claude call — capture the natural skeleton -> drafted-text transition.
    await page.getByRole("button", { name: /Regenerate angle/i }).waitFor({ state: "visible", timeout: 30000 });
    await page.waitForTimeout(600);

    await smoothMove(page, 540, 700, 20);
    await page.waitForTimeout(1400);

    const copyButton = page.getByRole("button", { name: /Copy reply.*open post/i });
    await copyButton.scrollIntoViewIfNeeded();
    await smoothMove(page, 800, 1100, 20);
    await page.waitForTimeout(500);
    await copyButton.hover();
    await page.waitForTimeout(300);
    await copyButton.click();
    await page.waitForTimeout(1500);
  }, projectId);

  // --- sources.mp4 ---
  if (shouldRun("sources"))
  await recordClip(browser, storageStatePath, "sources", async (page) => {
    await page.goto(`${BASE_URL}/projects/${projectId}/sources`, { waitUntil: "networkidle" });
    await page.getByText("Sources", { exact: true }).first().waitFor({ state: "visible" });
    await smoothMove(page, 540, 400, 20);
    await page.waitForTimeout(600);
    await smoothMove(page, 700, 550, 20);
    await page.waitForTimeout(1200);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(600);
    await smoothMove(page, 540, 900, 20);
    await page.waitForTimeout(1500);
  }, projectId);

  // --- users_attribution.mp4 ---
  if (shouldRun("users_attribution"))
  await recordClip(browser, storageStatePath, "users_attribution", async (page) => {
    await page.goto(`${BASE_URL}/projects/${projectId}/users`, { waitUntil: "networkidle" });
    await page.getByText("User attribution").waitFor({ state: "visible" });
    await smoothMove(page, 540, 450, 20);
    await page.waitForTimeout(700);
    await smoothMove(page, 540, 650, 20);
    await page.waitForTimeout(1500);
    await smoothMove(page, 540, 900, 15);
    await page.waitForTimeout(1300);
  }, projectId);

  await browser.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
