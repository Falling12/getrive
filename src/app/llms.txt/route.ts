import { NextResponse } from "next/server";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION_LONG } from "@/lib/seo";
import { FAQS } from "@/lib/faq";

// llms.txt (https://llmstxt.org) — a curated Markdown index for AI
// assistants, distinct from robots.txt (access control) and the sitemap
// (exhaustive URL list). Deliberately short on PAGES (only what a founder
// researching Getrive would want an LLM to read and cite, not every route
// in the app) but not thin on CONTEXT — the body below restates the actual
// how-it-works/pricing/trust copy from the landing page itself, since an
// LLM reading just page titles can't answer "what does Getrive do" or
// "is it free" any better than not having this file at all. The FAQ block
// is generated from the same FAQS array as FaqSection/the FAQPage JSON-LD
// on the homepage (see lib/faq.ts) so all three surfaces stay in sync.
export const dynamic = "force-static";

export function GET() {
  const faqBlock = FAQS.map((faq) => `### ${faq.question}\n\n${faq.answer}`).join("\n\n");

  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION_LONG}

## What it does

Getrive continuously polls the Reddit subreddits, Hacker News feed, and IndieHackers feed a founder chooses, oldest-checked-first. Every post is scored for relevance against that founder's actual product description and positioning (not keyword-matched) — only genuine, high-intent matches surface. For each match, Getrive drafts a specific, honest reply using the product's positioning and the post's own wording, ready for human review. Nothing is posted automatically; the founder remains the final operator on every reply. Signups are traced back to the exact post and channel that produced them via tracked links, so attribution is measured rather than guessed.

## Pricing

Early access, one plan, $0/month. No paid tier yet. Included: Reddit + Hacker News + IndieHackers monitoring, AI relevance scoring, reply & outreach drafting, signup attribution.

## FAQ

${faqBlock}

## Pages

- [Homepage](${SITE_URL}/): Full product explanation, how it works, pricing, and FAQ.
- [Privacy Policy](${SITE_URL}/privacy): What data Getrive collects, why, and who it's shared with.
- [Terms of Service](${SITE_URL}/terms): Terms governing use of the Getrive application.
`;

  return new NextResponse(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
