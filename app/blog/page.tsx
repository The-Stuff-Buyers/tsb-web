import type { Metadata } from "next";

// =============================================================================
// BLOG INDEX: /blog
// =============================================================================
// Content marketing hub. Blog posts target informational and long-tail
// keywords that feed into the commercial intent pages.
// =============================================================================

const SITE_URL = "https://thestuffbuyers.com";

export const metadata: Metadata = {
  title: "Blog — Inventory Liquidation Tips, Industry News & Insights",
  description:
    "Expert insights on selling excess inventory, inventory liquidation strategies, dead stock management, and supply chain optimization from The Stuff Buyers.",
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
};

// =============================================================================
// SUGGESTED BLOG POST TOPICS FOR CONTENT MARKETING
// =============================================================================
// Each post should target a specific long-tail keyword cluster.
// The agent should generate these over time to build topical authority.
//
// HIGH PRIORITY (target within first 30 days):
// 1. "How to Sell Excess Inventory: A Complete Guide for Businesses"
//    → targets: how to sell excess inventory, get rid of excess inventory
// 2. "What Is Dead Stock? And How to Turn It Into Cash"
//    → targets: what is dead stock, dead stock meaning, sell dead stock
// 3. "Inventory Liquidation: Everything You Need to Know"
//    → targets: inventory liquidation, how to liquidate inventory
// 4. "5 Signs It's Time to Liquidate Your Excess Inventory"
//    → targets: when to liquidate inventory, excess inventory problems
// 5. "Amazon FBA Liquidation: How to Sell Slow-Moving FBA Inventory"
//    → targets: Amazon FBA liquidation, sell FBA inventory
//
// MEDIUM PRIORITY (30-60 days):
// 6. "The True Cost of Holding Dead Stock in Your Warehouse"
//    → targets: cost of dead stock, carrying cost inventory
// 7. "How Inventory Liquidation Brokers Work (And Why It Matters)"
//    → targets: inventory liquidation broker, how liquidation works
// 8. "Retail Overstock: Why It Happens and What to Do About It"
//    → targets: retail overstock, overstock solutions
// 9. "Closeout Merchandise: A Buyer's Guide for Businesses"
//    → targets: closeout merchandise, closeout buyer
// 10. "Warehouse Clearance: How to Clear Inventory Without Losing Value"
//     → targets: warehouse clearance, clear inventory
//
// ONGOING (monthly):
// - Industry-specific liquidation guides (electronics, toys, HBA, etc.)
// - Case studies / success stories
// - Supply chain news and commentary
// - Seasonal inventory management tips
// =============================================================================

export default function BlogPage() {
  return (
    <main>
      <section aria-labelledby="hero-heading">
        <h1 id="hero-heading">
          The Stuff Buyers Blog — Inventory Liquidation Insights
        </h1>
        <p>
          Expert guidance on selling excess inventory, managing dead stock,
          navigating liquidation, and optimizing your supply chain. From The
          Stuff Buyers team.
        </p>
      </section>

      <section aria-labelledby="posts-heading">
        <h2 id="posts-heading">Latest Posts</h2>
        {/* Blog posts will be rendered here as they're created */}
        <p>
          New content coming soon. In the meantime,{" "}
          <a href="/#intake-form">get a quote</a> for your excess inventory
          or reach us at{" "}
          <a href="mailto:quotes@thestuffbuyers.com">
            quotes@thestuffbuyers.com
          </a>
          .
        </p>
      </section>

      <nav aria-label="Breadcrumb">
        <ol itemScope itemType="https://schema.org/BreadcrumbList">
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <a itemProp="item" href="/"><span itemProp="name">Home</span></a>
            <meta itemProp="position" content="1" />
          </li>
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <span itemProp="name">Blog</span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>
    </main>
  );
}
