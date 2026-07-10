import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Only the public marketing/legal surface — everything under /projects,
// /onboarding, /settings, and the auth flow requires a session and is
// blocked in robots.ts, so there's nothing to list here for it.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
