import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, siteOrigin } from "@/lib/seo/site";

/** Generated from PUBLIC_ROUTES so the sitemap cannot drift from the routes. */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin() ?? "";
  const lastModified = new Date();
  return PUBLIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${origin}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
