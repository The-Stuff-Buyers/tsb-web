import type { Metadata } from "next";
import { WithContext, Service } from "schema-dts";

// =============================================================================
// SEO LANDING PAGE: /inventory-liquidation-services
// =============================================================================
// Target keywords:
//   "inventory liquidation services" / "inventory liquidation company"
//   "liquidate inventory" / "inventory liquidation buyer"
//   "closeout buyer" / "surplus inventory buyer"
// =============================================================================

const SITE_URL = "https://thestuffbuyers.com";
const PAGE_URL = `${SITE_URL}/inventory-liquidation-services`;

export const metadata: Metadata = {
  title: "Inventory Liquidation Services — Closeout & Surplus Buyers",
  description:
    "Professional inventory liquidation services from The Stuff Buyers. We purchase closeouts, surplus, overstock, and liquidation merchandise. Nationwide coverage. Recovery quotes in 48 hours.",
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: "Inventory Liquidation Services — The Stuff Buyers",
    description:
      "Professional inventory liquidation. We buy closeouts, surplus, overstock. 48-hour quotes. No contracts. Nationwide.",
    url: PAGE_URL,
    type: "website",
  },
};

const serviceJsonLd: WithContext<Service> = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Inventory Liquidation Brokerage",
  description:
    "Professional wholesale inventory liquidation services. We broker the sale of closeout merchandise, surplus inventory, and overstock goods through our nationwide partner network.",
  provider: {
    "@type": "Organization",
    name: "The Stuff Buyers LLC",
    url: SITE_URL,
  },
  areaServed: { "@type": "Country", name: "United States" },
  serviceType: "Inventory Liquidation Brokerage",
};

export default function InventoryLiquidationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />

      <main>
        <section aria-labelledby="hero-heading">
          <h1 id="hero-heading">
            Inventory Liquidation Services — Fast, Discreet, Fair
          </h1>
          <p>
            The Stuff Buyers is a wholesale inventory acquisition and
            liquidation brokerage. We connect businesses holding excess,
            closeout, and surplus merchandise with our established network of
            buyers — turning your non-performing inventory into cash without
            disrupting your primary sales channels.
          </p>
          <a href="/#intake-form">Get a Quote →</a>
        </section>

        <section aria-labelledby="how-heading">
          <h2 id="how-heading">How Our Inventory Liquidation Process Works</h2>
          <p>
            Our brokerage model is different from traditional liquidators. We
            don&apos;t operate warehouses or auction lots. Instead, we leverage a
            deep partner network to find the best recovery value for your
            specific inventory — fast.
          </p>
          <ol>
            <li>
              <h3>Submit Your Item Sheet</h3>
              <p>
                Provide SKU, UPC, quantity, product condition, and warehouse
                location via our <a href="/#intake-form">quote form</a> or
                directly to{" "}
                <a href="mailto:quotes@thestuffbuyers.com">
                  quotes@thestuffbuyers.com
                </a>
                .
              </p>
            </li>
            <li>
              <h3>Partner Network Evaluation</h3>
              <p>
                We route your inventory details through our network of
                specialized buyers — including auction platforms like BidFTA,
                wholesale resellers, and secondary market distributors — to
                source the most competitive recovery offer.
              </p>
            </li>
            <li>
              <h3>Accept &amp; We Execute</h3>
              <p>
                You approve the offer. We coordinate all pickup, logistics, and
                payment. Your warehouse is clear and your capital is free —
                typically within days of acceptance.
              </p>
            </li>
          </ol>
        </section>

        <section aria-labelledby="scenarios-heading">
          <h2 id="scenarios-heading">
            Common Inventory Liquidation Scenarios We Handle
          </h2>
          <ul>
            <li>
              <strong>Retailer overstock clearance</strong> — seasonal
              merchandise, planogram resets, discontinued lines
            </li>
            <li>
              <strong>Warehouse shutdowns &amp; facility closures</strong> —
              full warehouse buyouts on tight timelines
            </li>
            <li>
              <strong>Manufacturer surplus</strong> — excess production runs,
              superseded models, raw materials
            </li>
            <li>
              <strong>Distributor cancelled orders</strong> — merchandise from
              failed or reduced purchase orders
            </li>
            <li>
              <strong>Amazon FBA liquidation</strong> — removing slow-moving,
              restricted, or stranded inventory from fulfillment centers
            </li>
            <li>
              <strong>3PL &amp; freight abandoned goods</strong> — unclaimed or
              repossessed merchandise in fulfillment warehouses
            </li>
            <li>
              <strong>Bankruptcy &amp; receivership assets</strong> — rapid
              liquidation of inventory assets under legal proceedings
            </li>
          </ul>
        </section>

        <section aria-labelledby="why-heading">
          <h2 id="why-heading">
            Why Choose The Stuff Buyers for Inventory Liquidation?
          </h2>
          <article>
            <h3>Brokerage Model = Better Recovery</h3>
            <p>
              Because we route your inventory to specialized buyers rather than
              operating a one-size-fits-all auction, you get better recovery
              values on your merchandise.
            </p>
          </article>
          <article>
            <h3>Brand Protection Built In</h3>
            <p>
              We understand that how your inventory is liquidated matters. Our
              partner network moves merchandise through secondary channels that
              don&apos;t compete with your primary distribution.
            </p>
          </article>
          <article>
            <h3>Easy. Simple. Fast.</h3>
            <p>
              That&apos;s our operating philosophy. No contracts. No long-term
              commitments. No bureaucratic processes. Send us your item sheet
              and we get to work.
            </p>
          </article>
        </section>

        <section aria-labelledby="cta-heading">
          <h2 id="cta-heading">Get Your Inventory Liquidation Quote</h2>
          <p>
            Ready to convert non-performing inventory into capital? Get a
            no-obligation recovery quote in 48 hours.
          </p>
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
              <span itemProp="name">Inventory Liquidation Services</span>
              <meta itemProp="position" content="2" />
            </li>
          </ol>
        </nav>
      </main>
    </>
  );
}
