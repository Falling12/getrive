import type { MetadataRoute } from "next";
import { SITE_URL, PRIVATE_ROBOTS_DISALLOW } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_ROBOTS_DISALLOW,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
