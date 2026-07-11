import { chromium } from "@playwright/test";

async function main() {
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage();

  const posthogPosts: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("posthog")) {
      posthogPosts.push(req.url());
    }
  });

  await page.goto("http://localhost:3000/", { waitUntil: "load" });
  await page.waitForTimeout(1500);

  // Real interaction: mouse movement, scrolling, a click — the kind of
  // activity session replay/heatmaps actually need to have something to show.
  await page.mouse.move(200, 300);
  await page.mouse.move(400, 500, { steps: 10 });
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(500);
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(500);

  const ctaButton = page.getByRole("link", { name: /Deploy instrument/i }).first();
  if (await ctaButton.count()) {
    await ctaButton.hover();
  }

  await page.waitForTimeout(4000);

  console.log("PostHog capture POSTs seen:", posthogPosts.length);

  const distinctId = await page.evaluate(() => {
    const raw = Object.keys(localStorage).find((k) => k.startsWith("ph_") && k.endsWith("_posthog"));
    if (!raw) return null;
    try {
      return JSON.parse(localStorage.getItem(raw) ?? "{}").distinct_id;
    } catch {
      return null;
    }
  });
  console.log("Client distinct_id:", distinctId);

  await browser.close();
  return distinctId;
}

main()
  .then((id) => {
    if (id) console.log("DISTINCT_ID_FOR_LOOKUP=" + id);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
