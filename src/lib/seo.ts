import { MONITORED_CHANNEL_NAMES, formatChannelList } from "@/lib/channels";

const FALLBACK_SITE_URL = "http://localhost:3000";

// Every SEO surface (metadataBase, canonical URLs, sitemap.xml, robots.txt)
// keys off this. Set NEXT_PUBLIC_APP_URL to the real production domain
// before launch — until then this falls back to localhost so dev builds
// still produce valid absolute URLs.
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? FALLBACK_SITE_URL).replace(/\/$/, "");

export const SITE_NAME = "Getrive";

export const SITE_TITLE = "Getrive — Find your first users without cold-pitching";

// Kept under ~155 chars so Google doesn't truncate it in the SERP snippet —
// "HN" instead of "Hacker News" here (unlike everywhere else on the site),
// and "& more" instead of naming every one of the five channels, is the
// tradeoff that keeps this within budget.
// Used for <meta name="description">, og:description, and twitter:description.
export const SITE_DESCRIPTION =
  "Getrive listens on Reddit, HN, IndieHackers & more for people describing your exact problem, then helps you reply authentically. Nothing posts without you.";

// Longer form for surfaces without a snippet-length constraint — llms.txt
// and structured data, where more context helps an LLM cite Getrive
// accurately rather than optimizing for a SERP pixel width. Names every
// monitored channel rather than "& more" since there's no length pressure
// here.
export const SITE_DESCRIPTION_LONG = `Getrive listens across ${formatChannelList(MONITORED_CHANNEL_NAMES)} for people already describing the exact pain point your product solves, then helps you reply authentically. Nothing posted without you.`;

// Route segments that require a session (or are dead ends like verify-email)
// — kept out of the sitemap and blocked in robots.txt since there's nothing
// for a crawler to index behind a login wall.
export const PRIVATE_ROBOTS_DISALLOW = [
  "/projects",
  "/onboarding",
  "/settings",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/",
];
