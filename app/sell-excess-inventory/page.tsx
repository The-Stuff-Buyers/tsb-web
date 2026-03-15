import type { Metadata } from "next";
import { WithContext, Service } from "schema-dts";

// =============================================================================
// SEO LANDING PAGE: /sell-excess-inventory
// =============================================================================
// Target keywords:
//   "sell excess inventory" / "excess inventory buyer" / "buy excess inventory"
//   "excess inventory liquidation" / "overstock buyer" / "sell overstock"
// =============================================================================

const SITE_URL = "https://thestuffbuyers.com";
const PAGE_URL = `${SITE_URL}/sell-excess-inventory`;

export const metadata: Metadata = {
  title: "Sell Excess Inventory — Get a Recovery Quote in 48 Hours",
  description:
    "Need to sell excess inventory? The Stuff Buyers purchases overstock, surplus, and excess merchandise nationwide. Get a competitive recovery quote in 48 hours. No contracts. We handle pickup, logistics, and payment.",
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: "Sell Excess Inventory Fast — The Stuff Buyers",
    description:
      "Turn excess inventory into cash. Recovery quotes in 48 hours. No contracts. Nationwide pickup.",
    url: PAGE_URL,
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-sell-excess-inventory.png`,
        width: 1200,
        height: 630,
        alt: "Sell Excess Inventory to The Stuff Buyers",
      },
    ],
  },
};

const serviceJsonLd: WithContext<Service> = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Excess Inventory Purchasing",
  description:
    "We purchase excess inventory, overstock merchandise, and surplus goods from retailers, wholesalers, manufacturers, distributors, and Amazon FBA sellers. Competitive quotes within 48 hours. Nationwide pickup and payment.",
  provider: {
    "@type": "Organization",
    name: "The Stuff Buyers LLC",
    url: SITE_URL,
  },
  areaServed: {
    "@type": "Country",
    name: "United States",
  },
  serviceType: "Excess Inventory Acquisition",
  offers: {
    "@type": "Offer",
    description: "Free, no-obligation recovery quote within 48 hours",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function SellExcessInventoryPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />

      <main>
        {/* Hero */}
        <section aria-labelledby="hero-heading">
          <h1 id="hero-heading">
            Sell Your Excess Inventory — Fast, Simple, Fair
          </h1>
          <p>
            Sitting on overstock, surplus merchandise, or slow-moving inventory
            that&apos;s eating up warehouse space and tying up capital? The Stuff
            Buyers purchases excess inventory from businesses across the United
            States. We return a competitive recovery quote within 48 hours — no
            contracts, no commitments, no hassle.
          </p>
          <a href="/#intake-form">Get a Quote →</a>
        </section>

        {/* Why sell excess inventory */}
        <section aria-labelledby="why-sell-heading">
          <h2 id="why-sell-heading">
            Why Sell Your Excess Inventory to The Stuff Buyers?
          </h2>

          <article>
            <h3>48-Hour Recovery Quotes</h3>
            <p>
              Send us your item sheet — SKU, UPC, quantity, location — and our
              partner network returns a transparent, competitive recovery quote
              within 48 hours. No guesswork. No drawn-out negotiations.
            </p>
          </article>

          <article>
            <h3>No Contracts. No Commitments.</h3>
            <p>
              Every quote is no-obligation. Accept and we handle everything.
              Decline and walk away — zero hard feelings, zero strings attached.
            </p>
          </article>

          <article>
            <h3>We Handle Pickup, Logistics &amp; Payment</h3>
            <p>
              Once you accept an offer, we coordinate pickup from your warehouse,
              distribution center, retail location, or Amazon FBA facility. You
              get paid. We handle the rest.
            </p>
          </article>

          <article>
            <h3>Nationwide Coverage</h3>
            <p>
              From coast to coast, we purchase inventory wherever it sits. One
              pallet or a full warehouse — we evaluate every opportunity.
            </p>
          </article>
        </section>

        {/* What we buy */}
        <section aria-labelledby="what-we-buy-heading">
          <h2 id="what-we-buy-heading">
            What Types of Excess Inventory Do We Buy?
          </h2>
          <p>
            We purchase a wide range of consumer and commercial merchandise
            across all major product categories:
          </p>
          <ul>
            <li>
              <a href="/industries/electronics">
                Electronics &amp; Consumer Technology
              </a>
            </li>
            <li>
              <a href="/industries/toys-games">Toys &amp; Games</a>
            </li>
            <li>
              <a href="/industries/health-beauty">Health &amp; Beauty</a>
            </li>
            <li>
              <a href="/industries/tools-hardware">Tools &amp; Hardware</a>
            </li>
            <li>Housewares &amp; Home Goods</li>
            <li>Sporting Goods &amp; Outdoor Equipment</li>
            <li>Furniture &amp; Home Décor</li>
            <li>Automotive Parts &amp; Accessories</li>
            <li>
              <a href="/industries/food-beverage">Food &amp; Beverage</a>
            </li>
            <li>Industrial &amp; Commercial Equipment</li>
            <li>
              <a href="/industries/general-merchandise">
                General Merchandise &amp; Apparel
              </a>
            </li>
          </ul>
          <p>
            <strong>
              If it has a SKU and you can&apos;t move it — we want to hear about
              it.
            </strong>
          </p>
        </section>

        {/* Who we work with */}
        <section aria-labelledby="who-heading">
          <h2 id="who-heading">Who Sells Excess Inventory to Us?</h2>
          <p>
            We work with businesses of all sizes across the supply chain:
          </p>
          <ul>
            <li>
              <strong>Retailers</strong> clearing seasonal overstock or
              discontinued lines
            </li>
            <li>
              <strong>Wholesalers &amp; Distributors</strong> offloading surplus
              from cancelled orders
            </li>
            <li>
              <strong>Manufacturers</strong> liquidating excess production runs
              or obsolete SKUs
            </li>
            <li>
              <strong>Amazon FBA Sellers</strong> removing slow-moving or
              restricted inventory to avoid mounting storage fees
            </li>
            <li>
              <strong>3PL &amp; Fulfillment Warehouses</strong> clearing
              abandoned or unclaimed freight
            </li>
            <li>
              <strong>Importers</strong> selling off over-ordered container loads
            </li>
          </ul>
        </section>

        {/* How it works */}
        <section aria-labelledby="process-heading">
          <h2 id="process-heading">
            How to Sell Your Excess Inventory — 3 Steps
          </h2>
          <ol>
            <li>
              <h3>Send Us Your Item Sheet</h3>
              <p>
                SKU, UPC, quantity, condition, and warehouse location. That&apos;s
                it. No lengthy forms, no back and forth — just the basics so we
                can get to work. Email directly to{" "}
                <a href="mailto:quotes@thestuffbuyers.com">
                  quotes@thestuffbuyers.com
                </a>{" "}
                or use our{" "}
                <a href="/#intake-form">online quote form</a>.
              </p>
            </li>
            <li>
              <h3>Receive Your Recovery Quote</h3>
              <p>
                Our partner network evaluates your inventory and returns a
                transparent, competitive offer within 48 hours. You&apos;ll know
                exactly where you stand.
              </p>
            </li>
            <li>
              <h3>Get Paid. We Handle the Rest.</h3>
              <p>
                Accept the offer and we coordinate pickup, logistics, and
                payment. Your warehouse is clear. Your capital is free.
              </p>
            </li>
          </ol>
          <a href="/#intake-form">Get Your Free Quote →</a>
        </section>

        {/* CTA */}
        <section aria-labelledby="cta-heading">
          <h2 id="cta-heading">Ready to Sell Your Excess Inventory?</h2>
          <p>
            Stop paying to store merchandise that isn&apos;t moving. Get a
            no-obligation recovery quote from The Stuff Buyers in 48 hours.
          </p>
          <a href="/#intake-form">Get a Quote →</a>
          <p>
            Or email your item sheet to{" "}
            <a href="mailto:quotes@thestuffbuyers.com">
              quotes@thestuffbuyers.com
            </a>
            <br />
            Call us: <a href="tel:+13143585293">(314) 358-5293</a>
          </p>
        </section>

        {/* Breadcrumbs for SEO */}
        <nav aria-label="Breadcrumb">
          <ol itemScope itemType="https://schema.org/BreadcrumbList">
            <li
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              <a itemProp="item" href="/">
                <span itemProp="name">Home</span>
              </a>
              <meta itemProp="position" content="1" />
            </li>
            <li
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              <span itemProp="name">Sell Excess Inventory</span>
              <meta itemProp="position" content="2" />
            </li>
          </ol>
        </nav>
      </main>
    </>
  );
}
