import type { Metadata } from "next";
import Link from "next/link";
import { AuthMark } from "@/components/auth/auth-mark";
import { brandSans, brandMono } from "@/lib/fonts";
import { GUIDES } from "@/lib/guides";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Guides — ${SITE_NAME}`,
  description: "Practical, no-fluff guides on finding your first users through founder-led outreach on Reddit and Hacker News.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndexPage() {
  return (
    <div
      className={`${brandSans.variable} ${brandMono.variable} theme-getrive min-h-[100dvh] bg-background font-sans text-foreground`}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-6">
          <Link href="/" className="w-fit">
            <AuthMark />
          </Link>
          <div>
            <h1 className="text-3xl font-medium tracking-wide text-foreground">Guides</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Practical playbooks for finding your first users without cold-pitching — written for
              founders doing this manually, whether or not you ever use Getrive.
            </p>
          </div>
        </header>

        <ul className="flex flex-col gap-6">
          {GUIDES.map((guide) => (
            <li key={guide.slug} className="border-b border-border pb-6 last:border-0">
              <Link href={`/guides/${guide.slug}`} className="group flex flex-col gap-1.5">
                <h2 className="text-lg font-medium text-foreground transition-colors group-hover:text-accent">
                  {guide.title}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{guide.description}</p>
              </Link>
            </li>
          ))}
        </ul>

        <footer className="flex gap-4 border-t border-border pt-6 font-mono text-[11px] text-muted-foreground">
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link href="/" className="ml-auto transition-colors hover:text-foreground">
            Back to Getrive
          </Link>
        </footer>
      </div>
    </div>
  );
}
