import type { Metadata } from "next";
import { notFound } from "next/navigation";

// =============================================================================
// DYNAMIC INDUSTRY PAGES: /industries/[slug]
// =============================================================================
// Generates individual SEO-optimized pages for each product category.
// Each page targets "[category] + liquidation/excess/surplus" keywords.
// =============================================================================

const SITE_URL = "https://thestuffbuyers.com";

interface IndustryData {
  name: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroDescription: string;
  whatWeBuy: string[];
  whoSells: string[];
  whySellToUs: string;
}

const INDUSTRIES: Record<string, IndustryData> = {
  electronics: {
    name: "Electronics & Consumer Technology",
    metaTitle:
      "Sell Excess Electronics Inventory — Electronics Liquidation Buyer",
    metaDescription:
      "Sell surplus electronics, consumer tech, and IT equipment to The Stuff Buyers. We buy excess inventory of computers, smartphones, audio/video, peripherals, and more. 48-hour quotes.",
    heroTitle: "Sell Excess Electronics & Consumer Technology Inventory",
    heroDescription:
      "The Stuff Buyers purchases surplus, overstock, and closeout electronics from retailers, wholesalers, manufacturers, and Amazon FBA sellers. From consumer tech to enterprise IT equipment, we make competitive offers on electronics inventory you need to move.",
    whatWeBuy: [
      "Smartphones, tablets, and mobile accessories",
      "Laptops, desktops, and computer peripherals",
      "Audio equipment, headphones, and speakers",
      "TV and home theater equipment",
      "Smart home devices and IoT products",
      "Gaming consoles and accessories",
      "Networking and IT infrastructure equipment",
      "Camera and photography equipment",
      "Wearable technology and fitness trackers",
      "Consumer electronics accessories and cables",
    ],
    whoSells: [
      "Consumer electronics retailers clearing seasonal or discontinued models",
      "Distributors with cancelled or over-ordered tech shipments",
      "Manufacturers with excess production runs or superseded product lines",
      "Amazon FBA sellers with slow-moving or restricted electronics ASINs",
      "IT departments decommissioning enterprise equipment",
      "Refurbishment operations with excess open-box inventory",
    ],
    whySellToUs:
      "Electronics depreciate faster than almost any other category. Every day excess tech sits in your warehouse, it loses value. Our partner network includes specialized electronics resellers who understand tech pricing and can move inventory quickly through secondary channels — protecting your brand while recovering maximum value.",
  },

  "toys-games": {
    name: "Toys & Games",
    metaTitle: "Sell Excess Toys & Games Inventory — Toy Liquidation Buyer",
    metaDescription:
      "Sell surplus toys, games, and play equipment to The Stuff Buyers. We buy excess toy inventory from retailers, distributors, and Amazon sellers. 48-hour quotes. No contracts.",
    heroTitle: "Sell Excess Toys & Games Inventory",
    heroDescription:
      "Toy inventory is seasonal and trend-driven. When it doesn't sell, it needs to move fast. The Stuff Buyers purchases excess, overstock, and closeout toys and games from businesses nationwide.",
    whatWeBuy: [
      "Action figures and collectible toys",
      "Board games, card games, and puzzles",
      "Educational and STEM toys",
      "Outdoor play equipment and ride-ons",
      "Dolls, playsets, and accessories",
      "Building sets and construction toys",
      "Plush toys and stuffed animals",
      "Arts, crafts, and creative play supplies",
      "Licensed character merchandise",
      "Seasonal and holiday toy inventory",
    ],
    whoSells: [
      "Toy retailers with post-holiday or post-season overstock",
      "Distributors carrying cancelled orders or excess case packs",
      "Importers with container loads that didn't clear retail",
      "Amazon FBA sellers with toys approaching long-term storage fees",
      "Manufacturers discontinuing product lines",
    ],
    whySellToUs:
      "Toy inventory that misses its selling window — holiday, back-to-school, trending IP — loses value rapidly. Our buyer network moves toy overstock through discount retail, international markets, and secondary channels that don't compete with your primary distribution.",
  },

  "health-beauty": {
    name: "Health & Beauty",
    metaTitle:
      "Sell Excess Health & Beauty Inventory — Cosmetics Liquidation Buyer",
    metaDescription:
      "Sell surplus health, beauty, and personal care inventory to The Stuff Buyers. We buy excess cosmetics, skincare, supplements, and wellness products. 48-hour quotes.",
    heroTitle: "Sell Excess Health & Beauty Inventory",
    heroDescription:
      "Health and beauty products have shelf lives, reformulations, and packaging changes that create excess. The Stuff Buyers purchases surplus HBA inventory from businesses nationwide — including short-dated goods and discontinued formulations.",
    whatWeBuy: [
      "Skincare and anti-aging products",
      "Cosmetics and makeup",
      "Hair care products and styling tools",
      "Personal care and hygiene products",
      "Dietary supplements and vitamins",
      "Over-the-counter health products",
      "Fragrances and perfumes",
      "Bath and body products",
      "Oral care products",
      "Men's grooming and personal care",
    ],
    whoSells: [
      "Beauty retailers clearing seasonal or reformulated lines",
      "HBA distributors with over-ordered or cancelled shipments",
      "Manufacturers with excess production or packaging changes",
      "Amazon sellers with restricted or slow-moving beauty ASINs",
      "Pharmacies and drug stores with surplus OTC inventory",
    ],
    whySellToUs:
      "Health and beauty inventory often carries expiration dates and brand sensitivity requirements. Our network includes HBA-specialized buyers who understand lot dating, brand protection needs, and the secondary market channels that move beauty products without channel conflict.",
  },

  "tools-hardware": {
    name: "Tools & Hardware",
    metaTitle: "Sell Excess Tools & Hardware Inventory — Tool Liquidation Buyer",
    metaDescription:
      "Sell surplus tools, hardware, and industrial equipment to The Stuff Buyers. We buy excess inventory of power tools, hand tools, fasteners, and more. 48-hour quotes.",
    heroTitle: "Sell Excess Tools & Hardware Inventory",
    heroDescription:
      "The Stuff Buyers purchases overstock, surplus, and closeout tools and hardware from retailers, distributors, manufacturers, and industrial suppliers nationwide.",
    whatWeBuy: [
      "Power tools and cordless tool systems",
      "Hand tools and tool sets",
      "Fasteners, screws, nails, and bolts",
      "Plumbing supplies and fixtures",
      "Electrical components and wiring",
      "Paint, coatings, and application tools",
      "Safety equipment and PPE",
      "Measuring and layout tools",
      "Storage and organization systems",
      "Outdoor power equipment",
    ],
    whoSells: [
      "Hardware retailers clearing discontinued lines or planogram resets",
      "Tool distributors with excess or cancelled orders",
      "Manufacturers with superseded models or excess production",
      "Industrial suppliers downsizing inventory",
      "Amazon sellers with slow-moving tool inventory",
    ],
    whySellToUs:
      "Tools and hardware hold their value better than many categories, but warehouse space is expensive. Our buyer network includes tool resellers, contractor supply channels, and international markets that can move your surplus without undercutting your primary pricing.",
  },

  "general-merchandise": {
    name: "General Merchandise",
    metaTitle:
      "Sell General Merchandise Closeouts — Surplus Merchandise Buyer",
    metaDescription:
      "Sell closeout merchandise, surplus goods, and general merchandise overstock to The Stuff Buyers. Housewares, apparel, home goods, sporting goods, and more. 48-hour quotes.",
    heroTitle: "Sell General Merchandise & Closeout Inventory",
    heroDescription:
      "From housewares to apparel, sporting goods to home décor — The Stuff Buyers purchases general merchandise closeouts and surplus from businesses across the United States.",
    whatWeBuy: [
      "Housewares and kitchen products",
      "Home décor and furnishings",
      "Apparel, clothing, and accessories",
      "Sporting goods and fitness equipment",
      "Bedding, linens, and textiles",
      "Pet products and supplies",
      "Office and school supplies",
      "Seasonal and holiday merchandise",
      "Automotive accessories",
      "Luggage and travel goods",
    ],
    whoSells: [
      "Retailers clearing seasonal overstock or store closures",
      "Department stores with cross-category surplus",
      "General merchandise distributors with cancelled orders",
      "Amazon and ecommerce sellers liquidating mixed inventory",
      "Import companies with unsold container loads",
    ],
    whySellToUs:
      "General merchandise is our bread and butter. We have deep relationships across every secondary market channel — from discount retailers and dollar stores to international wholesale buyers. Whatever your mix of goods, we can find the right buyer and get you a competitive recovery.",
  },

  "food-beverage": {
    name: "Food & Beverage",
    metaTitle:
      "Sell Excess Food & Beverage Inventory — Food Liquidation Buyer",
    metaDescription:
      "Sell surplus food, beverage, and grocery inventory to The Stuff Buyers. We buy short-dated, overstock, and closeout food products. Fast quotes for time-sensitive inventory.",
    heroTitle: "Sell Excess Food & Beverage Inventory",
    heroDescription:
      "Food and beverage inventory is time-sensitive by nature. The Stuff Buyers purchases surplus, short-dated, and closeout food products — moving quickly to maximize recovery before expiration dates become a factor.",
    whatWeBuy: [
      "Shelf-stable food and grocery items",
      "Beverages, juices, and water",
      "Snack foods and confectionery",
      "Canned and packaged goods",
      "Health and specialty food products",
      "Short-dated and near-expiration inventory",
      "Seasonal food and holiday items",
      "Bulk ingredients and food service supplies",
      "Pet food and animal nutrition",
      "Discontinued or reformulated food products",
    ],
    whoSells: [
      "Food distributors with short-dated or over-ordered products",
      "Manufacturers with excess production or label changes",
      "Retailers clearing seasonal grocery overstock",
      "Import companies with unsold food shipments",
      "Food brokers with discontinued or delisted items",
    ],
    whySellToUs:
      "Speed matters in food liquidation. Our network includes discount grocery chains, food banks, international buyers, and closeout specialists who can move food inventory fast — before date codes become a liability. We prioritize rapid turnaround for time-sensitive inventory.",
  },
};

// -- Static params for build-time generation ----------------------------------
export function generateStaticParams() {
  return Object.keys(INDUSTRIES).map((slug) => ({ slug }));
}

// -- Dynamic metadata ---------------------------------------------------------
export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const industry = INDUSTRIES[params.slug];
  if (!industry) return {};

  return {
    title: industry.metaTitle,
    description: industry.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/industries/${params.slug}`,
    },
    openGraph: {
      title: industry.metaTitle,
      description: industry.metaDescription,
      url: `${SITE_URL}/industries/${params.slug}`,
      type: "website",
    },
  };
}

// -- Page Component -----------------------------------------------------------
export default function IndustryPage({
  params,
}: {
  params: { slug: string };
}) {
  const industry = INDUSTRIES[params.slug];
  if (!industry) notFound();

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${industry.name} Inventory Purchasing`,
    description: industry.metaDescription,
    serviceType: `${industry.name} Inventory Liquidation`,
    provider: {
      "@type": "Organization",
      name: "The Stuff Buyers LLC",
      url: SITE_URL,
    },
    areaServed: { "@type": "Country", name: "United States" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />

      <main>
        <section aria-labelledby="hero-heading">
          <h1 id="hero-heading">{industry.heroTitle}</h1>
          <p>{industry.heroDescription}</p>
          <a href="/#intake-form">Get a Quote →</a>
        </section>

        <section aria-labelledby="what-heading">
          <h2 id="what-heading">
            What {industry.name} Inventory Do We Buy?
          </h2>
          <ul>
            {industry.whatWeBuy.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="who-heading">
          <h2 id="who-heading">Who Sells {industry.name} Inventory to Us?</h2>
          <ul>
            {industry.whoSells.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="why-heading">
          <h2 id="why-heading">
            Why Sell {industry.name} Inventory to The Stuff Buyers?
          </h2>
          <p>{industry.whySellToUs}</p>
        </section>

        <section aria-labelledby="cta-heading">
          <h2 id="cta-heading">
            Ready to Sell Your {industry.name} Inventory?
          </h2>
          <p>Get a no-obligation recovery quote in 48 hours.</p>
          <a href="/#intake-form">Get a Quote →</a>
          <p>
            Email:{" "}
            <a href="mailto:quotes@thestuffbuyers.com">
              quotes@thestuffbuyers.com
            </a>
            <br />
            Phone: <a href="tel:+13143585293">(314) 358-5293</a>
          </p>
        </section>

        <nav aria-label="Breadcrumb">
          <ol itemScope itemType="https://schema.org/BreadcrumbList">
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <a itemProp="item" href="/"><span itemProp="name">Home</span></a>
              <meta itemProp="position" content="1" />
            </li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <a itemProp="item" href="/industries">
                <span itemProp="name">Industries</span>
              </a>
              <meta itemProp="position" content="2" />
            </li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span itemProp="name">{industry.name}</span>
              <meta itemProp="position" content="3" />
            </li>
          </ol>
        </nav>
      </main>
    </>
  );
}
