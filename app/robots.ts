import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo/site";

/**
 * Only the marketing surface is indexable. Everything behind authentication,
 * the API and the setup screen are disallowed — indexing them would surface
 * pages that always redirect, and /setup names a deployment's missing
 * configuration.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/admin", "/onboarding", "/api/", "/setup", "/login", "/signup", "/invite/"],
      },
    ],
    // Omitted rather than guessed when the deployment does not know its own
    // address; the disallow rules above still apply.
    sitemap: origin ? `${origin}/sitemap.xml` : undefined,
    host: origin ?? undefined,
  };
}
