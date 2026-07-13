import { LandingPage } from "@/components/landing/landing-page";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION_LONG } from "@/lib/seo";
import { FAQS } from "@/lib/faq";

// No page-level metadata export here — this route's title/description are
// identical to the root layout's defaults (see layout.tsx), so it inherits
// them rather than duplicating the same strings.

// @graph links three entities together (Organization → WebSite →
// SoftwareApplication via @id references) rather than one flat
// SoftwareApplication block, so search engines can resolve Getrive as a
// distinct brand entity, not just a page. The $0/early-access offer mirrors
// pricing-section.tsx exactly — keep them in sync if pricing changes.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION_LONG,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      publisher: { "@id": `${SITE_URL}/#organization` },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        category: "SaaS",
      },
    },
    // Sourced from the same FAQS array FaqSection renders (see lib/faq.ts)
    // so this never drifts from what's actually visible on the page —
    // structured data is expected to reflect real page content, not just
    // live in a hidden script tag. This is also the single highest-leverage
    // schema type for AI answer engines citing a direct answer to a common
    // question ("is Getrive free", "does it post automatically") instead of
    // having to summarize prose.
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ],
};

export default async function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingPage />
    </>
  );
}
