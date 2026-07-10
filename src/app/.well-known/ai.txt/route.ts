import { NextResponse } from "next/server";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

// Emerging, unstandardized convention (informally modeled on the IETF
// individual draft draft-car-ai-txt-wellknown) for declaring AI usage
// preferences per site — no crawler is known to enforce this yet, so it's
// advisory alongside robots.txt, not a replacement for it.
export const dynamic = "force-static";

export function GET() {
  const body = `# ai.txt for ${SITE_NAME}
Spec-Version: 0.1
Site-Name: ${SITE_NAME}
Site-URL: ${SITE_URL}
Contact: senkcsani@gmail.com

Training: allow
Scraping: allow
Indexing: allow
Caching: allow
Attribution: recommended

Agent: *
`;

  return new NextResponse(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
