import { NextResponse } from "next/server";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION_LONG } from "@/lib/seo";

// llms.txt (https://llmstxt.org) — a curated Markdown index for AI
// assistants, distinct from robots.txt (access control) and the sitemap
// (exhaustive URL list). Deliberately short: only the pages a founder
// researching Getrive would actually want an LLM to read and cite, not
// every route in the app.
export const dynamic = "force-static";

export function GET() {
  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION_LONG}

## Product

- [Homepage](${SITE_URL}/): What Getrive does, how the listen-then-reply workflow works, and pricing.

## Legal

- [Privacy Policy](${SITE_URL}/privacy): What data Getrive collects, why, and who it's shared with.
- [Terms of Service](${SITE_URL}/terms): Terms governing use of the Getrive application.
`;

  return new NextResponse(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
