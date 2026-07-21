// Single source of truth for the /guides content section — the index page,
// each guide's page.tsx, and sitemap.ts all read from this array rather
// than hand-listing slugs in three places (same pattern as FAQS in
// lib/faq.ts and MONITORED_CHANNEL_NAMES in lib/channels.ts).
//
// These are real, standalone-useful guides (not thinly-veiled ads) that
// happen to target search phrases close to what a founder in Getrive's
// audience actually types into Google — "get first users", "founder led
// sales", "hacker news monitoring". Each one only mentions Getrive where
// it's the honest next step after the manual approach described.

export interface Guide {
  slug: string;
  title: string;
  // SERP/OG description — kept under ~155 chars.
  description: string;
  publishedDate: string; // ISO date
  updatedDate: string; // ISO date
}

export const GUIDES: Guide[] = [
  {
    slug: "how-to-get-your-first-users",
    title: "How to Get Your First Users Without Cold-Pitching",
    description:
      "A practical playbook for finding your first users in communities where they're already describing the problem you solve — no cold DMs required.",
    publishedDate: "2026-07-21",
    updatedDate: "2026-07-21",
  },
  {
    slug: "founder-led-sales-reddit",
    title: "Founder-Led Sales on Reddit: How to Reply Without Getting Banned",
    description:
      "How to find relevant Reddit threads, write a reply that helps first, and stay inside subreddit self-promo rules instead of getting shadowbanned.",
    publishedDate: "2026-07-21",
    updatedDate: "2026-07-21",
  },
  {
    slug: "hacker-news-monitoring-for-leads",
    title: "How to Monitor Hacker News and Reddit for Product Leads",
    description:
      "Manual search operators, Algolia's HN API, and RSS feeds you can use today to catch people describing your exact problem — before you need to automate it.",
    publishedDate: "2026-07-21",
    updatedDate: "2026-07-21",
  },
  {
    slug: "cold-outreach-alternative",
    title: "Cold Outreach Isn't Working? Here's the Alternative",
    description:
      "Why cold email and cold DM reply rates keep falling, and what founder-led, community-first outreach looks like instead.",
    publishedDate: "2026-07-21",
    updatedDate: "2026-07-21",
  },
  {
    slug: "product-market-fit-signals",
    title: "How to Spot Product-Market Fit Signals Before You Have Metrics",
    description:
      "The qualitative signals worth tracking before you have enough users for a retention curve to mean anything — and where to actually find them.",
    publishedDate: "2026-07-21",
    updatedDate: "2026-07-21",
  },
  {
    slug: "customer-discovery-for-solo-founders",
    title: "Customer Discovery for Solo Founders: A Practical Process",
    description:
      "A lightweight customer discovery process that doesn't require a research budget, a network, or blocking off a full week of interviews.",
    publishedDate: "2026-07-21",
    updatedDate: "2026-07-21",
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
