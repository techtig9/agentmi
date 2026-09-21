import type { Metadata } from "next";

/**
 * Canonical origin for absolute URLs (sitemap, canonical tags, OG images).
 *
 * Returns null when the deployment has not been told its own address.
 * Guessing here would be worse than saying nothing: a canonical tag pointing
 * at the wrong origin actively tells search engines to index someone else's
 * copy, and a localhost fallback would ship a dead URL into production
 * metadata. Callers omit the tag instead.
 */
export function siteOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  // VERCEL_PROJECT_PRODUCTION_URL is the stable production domain.
  // VERCEL_URL is the per-DEPLOYMENT hostname and changes on every push, so
  // using it for a canonical tag points search engines at an ephemeral URL
  // that will not be the live site tomorrow. Preferred order matters here.
  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionDomain) return `https://${productionDomain.replace(/\/+$/, "")}`;

  // Only as a last resort, and only so preview deployments have absolute URLs
  // at all. Previews are noindex via robots.txt, so an ephemeral canonical
  // there is harmless.
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return null;
}

export const SITE_NAME = "Agentmi";
export const SITE_TAGLINE = "Build, test, evaluate and deploy AI agents";

/** Public, indexable marketing routes. The sitemap is generated from this. */
export const LEGAL_SLUGS = ["privacy", "terms", "refund", "cookies", "subprocessors", "ai-disclosure"] as const;

export const PUBLIC_ROUTES = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/changelog", priority: 0.5, changeFrequency: "weekly" as const },
  ...LEGAL_SLUGS.map((slug) => ({
    path: `/legal/${slug}`,
    priority: 0.3,
    changeFrequency: "yearly" as const,
  })),
];

/**
 * Per-page metadata with a canonical URL.
 *
 * Every page that calls this gets a canonical tag, which is what stops the
 * same content being indexed under a preview domain and the production one.
 */
export function pageMetadata({
  title,
  description,
  path,
  noindex = false,
}: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}): Metadata {
  const origin = siteOrigin();
  const url = origin ? `${origin}${path}` : undefined;
  return {
    title,
    description,
    // No canonical at all when the origin is unknown — a wrong one is worse.
    alternates: url ? { canonical: url } : undefined,
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: { title, description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}
