import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import { Reveal } from "@/components/landing/reveal";

const SCREENSHOT_SRC = "/screenshots/review-queue.png";
const SCREENSHOT_PATH = path.join(process.cwd(), "public", "screenshots", "review-queue.png");
// 16:10 matches a typical dashboard capture — kept fixed so the section
// reserves its final height before the image loads (no layout shift).
const ASPECT_RATIO = "1440 / 900";

function screenshotExists() {
  try {
    return fs.existsSync(SCREENSHOT_PATH);
  } catch {
    return false;
  }
}

export function ProductScreenshot() {
  const showMissingNote = process.env.NODE_ENV !== "production" && !screenshotExists();

  return (
    <section className="relative w-full border-t border-border/60 py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <Reveal className="mx-auto max-w-5xl">
          <div
            className="landing-panel relative w-full overflow-hidden"
            style={{ aspectRatio: ASPECT_RATIO }}
          >
            <Image
              src={SCREENSHOT_SRC}
              alt="Getrive's review queue: a flagged Reddit or Hacker News post next to its drafted reply, with options to edit, send, or skip."
              fill
              loading="lazy"
              sizes="(min-width: 1024px) 1024px, 100vw"
              className="object-cover object-top"
            />
            {showMissingNote && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/95 p-8 text-center font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                <span style={{ color: "var(--accent-glow)" }}>Dev only — screenshot missing</span>
                <span className="max-w-sm normal-case tracking-normal text-muted-foreground/70">
                  Add an image at public/screenshots/review-queue.png to replace this placeholder.
                </span>
              </div>
            )}
          </div>
          <p className="mt-6 text-center text-[15px] leading-relaxed font-light text-muted-foreground">
            Every match lands here — read the post, edit the draft, send or skip.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
