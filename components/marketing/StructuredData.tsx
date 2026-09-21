import { PLANS, PLAN_ORDER } from "@/lib/pricing/plans";
import { SITE_NAME, SITE_TAGLINE, siteOrigin } from "@/lib/seo/site";

/**
 * JSON-LD for the landing page.
 *
 * Offers are generated from the same PLANS config the pricing table and the
 * billing engine read, so the structured data cannot advertise a price the
 * product does not charge.
 */
export function StructuredData({ faqs }: { faqs: ReadonlyArray<{ q: string; a: string }> }) {
  const origin = siteOrigin();

  const graph = [
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      description: SITE_TAGLINE,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      ...(origin ? { url: origin } : {}),
      offers: PLAN_ORDER.map((id) => ({
        "@type": "Offer",
        name: PLANS[id].name,
        price: (PLANS[id].price.monthly / 100).toFixed(2),
        priceCurrency: "USD",
        category: PLANS[id].price.monthly === 0 ? "free" : "subscription",
      })),
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ];

  return (
    <script
      type="application/ld+json"
      // Serialised from typed data above, not from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) }}
    />
  );
}
