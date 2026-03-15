import type { Metadata } from "next";
import { WithContext, Service } from "schema-dts";

// =============================================================================
// SEO LANDING PAGE: /sell-dead-stock
// =============================================================================
// Target keywords:
//   "sell dead stock" / "dead stock buyer" / "buy dead stock"
//   "obsolete inventory buyer" / "discontinued merchandise buyer"
// =============================================================================

const SITE_URL = "https://thestuffbuyers.com";
const PAGE_URL = `${SITE_URL}/sell-dead-stock`;

export const metadata: Metadata = {
  title: "Sell Dead Stock — Turn Obsolete Inventory Into Cash",
  description:
    "Sitting on dead stock or obsolete inventory? The Stuff Buyers purchases discontinued merchandise, shelf pulls, and warehouse dust-collectors nationwide. Quote in 48 hours. No contracts.",
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: "Sell Dead Stock — The Stuff Buyers",
    description:
      "Turn dead stock into cash. We buy obsolete, discontinued, and non-moving inventory. 48-hour quotes. No contracts.",
    url: PAGE_URL,
    type: "website",
  },
};

const serviceJsonLd: WithContext<Service> = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Dead Stock & Obsolete Inventory Purchasing",
  description:
    "We purchase dead stock, obsolete inventory, discontinued merchandise, shelf pulls, and non-moving goods from businesses nationwide. Competitive quotes within 48 hours.",
  provider: {
    "@type": "Organization",
    name: "The Stuff Buyers LLC",
    url: SITE_URL,
  },
  areaServed: { "@type": "Country", name: "United States" },
  serviceType: "Dead Stock Acquisition",
};

export default function SellDeadStockPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />

      <main>
        <section aria-labelledby="hero-heading">
          <h1 id="hero-heading">
            Sell Your Dead Stock — We Buy the Stuff Nobody Else Wants
          </h1>
          <p>
            Dead stock costs you money every day it sits in your warehouse —
            storage fees, insurance, tied-up capital, and opportunity cost. The
            Stuff Buyers purchases obsolete inventory, discontinued merchandise,
            shelf pulls, and the dusty pallets everyone else ignores.
          </p>
          <a href="/#intake-form">Get a Quote →</a>
        </section>

        <section aria-labelledby="what-is-heading">
          <h2 id="what-is-heading">What Is Dead Stock?</h2>
          <p>
            Dead stock refers to inventory that has never been sold or has
            remained unsold for an extended period. It includes discontinued
            products, items with expired seasonality, obsolete SKUs,
            over-ordered merchandise, and goods that simply failed to sell. For
            businesses, dead stock represents frozen capital — money trapped in
            products that generate zero revenue while accumulating carrying
            costs.
          </p>
        </section>

        <section aria-labelledby="why-sell-heading">
          <h2 id="why-sell-heading">Why Sell Your Dead Stock to Us?</h2>
          <article>
            <h3>Recover Capital Locked in Unsold Inventory</h3>
            <p>
              Every dollar tied up in dead stock is a dollar you can&apos;t
              invest in profitable products. We turn your non-performing
              inventory into cash so your business can move forward.
            </p>
          </article>
          <article>
            <h3>Eliminate Carrying Costs</h3>
            <p>
              Warehousing, insurance, depreciation — dead stock bleeds money
              silently. Selling it stops the hemorrhage and frees up physical
              space for inventory that actually moves.
            </p>
          </article>
          <article>
            <h3>Brand Protection</h3>
            <p>
              We work through a network of secondary market partners who move
              merchandise discreetly. Your dead stock gets liquidated without
              disrupting your primary sales channels.
            </p>
          </article>
          <article>
            <h3>No Minimum. No Hassle.</h3>
            <p>
              Whether it&apos;s a handful of pallets or an entire warehouse of
              discontinued goods, we evaluate every opportunity. Our process is
              built to be easy, simple, and fast.
            </p>
          </article>
        </section>

        <section aria-labelledby="types-heading">
          <h2 id="types-heading">Types of Dead Stock We Purchase</h2>
          <ul>
            <li>Discontinued and end-of-life products</li>
            <li>Obsolete SKUs and superseded models</li>
            <li>Seasonal merchandise past its selling window</li>
            <li>Overstock from cancelled or reduced orders</li>
            <li>Shelf pulls and store returns</li>
            <li>Warehouse closeouts and facility shutdowns</li>
            <li>Amazon FBA slow-movers and restricted ASINs</li>
            <li>Customer returns and open-box merchandise</li>
          </ul>
        </section>

        <section aria-labelledby="cta-heading">
          <h2 id="cta-heading">
            Stop Paying to Store Inventory That Isn&apos;t Selling
          </h2>
          <p>
            Get a no-obligation recovery quote in 48 hours. Email your item
            sheet to{" "}
            <a href="mailto:quotes@thestuffbuyers.com">
              quotes@thestuffbuyers.com
            </a>{" "}
            or fill out our quote form.
          </p>
          <a href="/#intake-form">Get Your Free Quote →</a>
          <p>
            Call us: <a href="tel:+13143585293">(314) 358-5293</a>
          </p>
        </section>

        <nav aria-label="Breadcrumb">
          <ol itemScope itemType="https://schema.org/BreadcrumbList">
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <a itemProp="item" href="/"><span itemProp="name">Home</span></a>
              <meta itemProp="position" content="1" />
            </li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span itemProp="name">Sell Dead Stock</span>
              <meta itemProp="position" content="2" />
            </li>
          </ol>
        </nav>
      </main>
    </>
  );
}
