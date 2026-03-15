import type { Metadata } from "next";

// =============================================================================
// INDUSTRIES HUB: /industries
// =============================================================================
// Hub page linking to all industry verticals. Critical for internal link
// architecture (hub-and-spoke model).
// =============================================================================

const SITE_URL = "https://thestuffbuyers.com";

export const metadata: Metadata = {
  title: "Industries We Serve — Excess Inventory Buyers by Category",
  description:
    "The Stuff Buyers purchases excess inventory across all major product categories: electronics, toys, health & beauty, tools, housewares, food & beverage, sporting goods, and more.",
  alternates: {
    canonical: `${SITE_URL}/industries`,
  },
};

const INDUSTRIES = [
  {
    slug: "electronics",
    name: "Electronics & Consumer Technology",
    description:
      "Computers, smartphones, audio/video equipment, peripherals, smart home devices, and consumer tech accessories.",
  },
  {
    slug: "toys-games",
    name: "Toys & Games",
    description:
      "Action figures, board games, puzzles, outdoor play equipment, educational toys, dolls, and gaming accessories.",
  },
  {
    slug: "health-beauty",
    name: "Health & Beauty",
    description:
      "Personal care products, cosmetics, supplements, OTC health products, skincare, haircare, and wellness goods.",
  },
  {
    slug: "tools-hardware",
    name: "Tools & Hardware",
    description:
      "Power tools, hand tools, fasteners, plumbing supplies, electrical components, and industrial hardware.",
  },
  {
    slug: "general-merchandise",
    name: "General Merchandise & Apparel",
    description:
      "Clothing, accessories, housewares, kitchen goods, home décor, bedding, sporting goods, and seasonal merchandise.",
  },
  {
    slug: "food-beverage",
    name: "Food & Beverage",
    description:
      "Shelf-stable food products, beverages, snacks, specialty items, and short-dated goods approaching sell-by dates.",
  },
];

export default function IndustriesPage() {
  return (
    <main>
      <section aria-labelledby="hero-heading">
        <h1 id="hero-heading">
          Industries We Serve — We Buy Excess Inventory in Every Category
        </h1>
        <p>
          From consumer electronics to food and beverage, The Stuff Buyers
          purchases excess, surplus, and closeout inventory across all major
          product categories. If it has a SKU and you can&apos;t move it, we
          want to hear about it.
        </p>
      </section>

      <section aria-labelledby="categories-heading">
        <h2 id="categories-heading">Product Categories</h2>
        <div>
          {INDUSTRIES.map((industry) => (
            <article key={industry.slug}>
              <h3>
                <a href={`/industries/${industry.slug}`}>{industry.name}</a>
              </h3>
              <p>{industry.description}</p>
              <a href={`/industries/${industry.slug}`}>
                Learn more about selling {industry.name.toLowerCase()} →
              </a>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="additional-heading">
        <h2 id="additional-heading">Additional Categories We Purchase</h2>
        <p>
          Beyond our core verticals, we also buy excess inventory in automotive
          parts, furniture and home furnishings, industrial and commercial
          equipment, sporting goods and outdoor gear, pet products, office
          supplies, and more. Have something that doesn&apos;t fit neatly into a
          category? <a href="/#intake-form">Submit it anyway</a> — we evaluate
          every opportunity.
        </p>
      </section>

      <section aria-labelledby="cta-heading">
        <h2 id="cta-heading">Ready to Sell Your Inventory?</h2>
        <a href="/#intake-form">Get a Quote →</a>
      </section>

      <nav aria-label="Breadcrumb">
        <ol itemScope itemType="https://schema.org/BreadcrumbList">
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <a itemProp="item" href="/"><span itemProp="name">Home</span></a>
            <meta itemProp="position" content="1" />
          </li>
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <span itemProp="name">Industries</span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>
    </main>
  );
}
