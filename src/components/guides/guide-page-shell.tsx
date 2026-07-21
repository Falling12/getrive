import Link from "next/link";
import { AuthMark } from "@/components/auth/auth-mark";
import { Button } from "@/components/ui/button";
import { brandSans, brandMono } from "@/lib/fonts";
import type { Guide } from "@/lib/guides";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

export interface HowToStep {
  name: string;
  text: string;
}

// Article + BreadcrumbList JSON-LD for a single guide page. Mirrors the
// @graph pattern in app/page.tsx (Organization/@id reference rather than
// re-declaring the org inline) so this resolves as the same publisher
// entity across the site instead of a disconnected one.
//
// `howToSteps` is optional and only worth passing for a guide whose body
// actually is a numbered, sequential playbook (visible <ol> steps) —
// structured data is expected to mirror what's really on the page, not
// added everywhere just because it's available. Most guides here are
// prose/reference, not a literal procedure, so they skip it.
export function GuideJsonLd({ guide, howToSteps }: { guide: Guide; howToSteps?: HowToStep[] }) {
  const url = `${SITE_URL}/guides/${guide.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: guide.title,
        description: guide.description,
        url,
        datePublished: guide.publishedDate,
        dateModified: guide.updatedDate,
        author: { "@id": `${SITE_URL}/#organization` },
        publisher: { "@id": `${SITE_URL}/#organization` },
        mainEntityOfPage: url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides` },
          { "@type": "ListItem", position: 3, name: guide.title, item: url },
        ],
      },
      ...(howToSteps
        ? [
            {
              "@type": "HowTo",
              "@id": `${url}#howto`,
              name: guide.title,
              description: guide.description,
              step: howToSteps.map((step, index) => ({
                "@type": "HowToStep",
                position: index + 1,
                name: step.name,
                text: step.text,
              })),
            },
          ]
        : []),
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}

// Shared wrapper for /guides content pages — same public-surface pattern as
// LegalPageShell (reachable signed in or out), but wider (max-w-3xl vs
// max-w-2xl) and with a mid-scroll signup CTA, since these pages exist to
// both stand alone in search and convert a reader into a signup.
export function GuidePageShell({ guide, children }: { guide: Guide; children: React.ReactNode }) {
  return (
    <div
      className={`${brandSans.variable} ${brandMono.variable} theme-getrive min-h-[100dvh] bg-background font-sans text-foreground`}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="w-fit">
              <AuthMark />
            </Link>
            <Button
              render={<Link href="/signup" />}
              nativeButton={false}
              className="landing-btn-glow rounded-lg font-mono text-[10px] tracking-widest uppercase"
              style={{
                backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 90%)",
                color: "var(--accent-glow)",
                boxShadow: "inset 0 0 0 1px var(--accent-glow)",
              }}
            >
              Get started
            </Button>
          </div>
          <nav className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            <Link href="/guides" className="transition-colors hover:text-foreground">
              Guides
            </Link>
          </nav>
          <div>
            <h1 className="text-3xl font-medium tracking-wide text-foreground">{guide.title}</h1>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Published {formatDate(guide.publishedDate)}
              {guide.updatedDate !== guide.publishedDate && ` · Updated ${formatDate(guide.updatedDate)}`}
            </p>
          </div>
        </header>

        <article className="flex flex-col gap-6 text-sm leading-relaxed text-foreground/90 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:tracking-wide [&_h2]:text-foreground [&_li]:leading-relaxed [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </article>

        <footer className="flex flex-col gap-4 border-t border-border pt-6">
          <div className="flex gap-4 font-mono text-[11px] text-muted-foreground">
            <Link href="/guides" className="transition-colors hover:text-foreground">
              More guides
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/" className="ml-auto transition-colors hover:text-foreground">
              Back to Getrive
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
