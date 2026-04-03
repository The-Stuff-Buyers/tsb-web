import type { Metadata } from "next";
import { FAQPage, WithContext, ProfessionalService } from "schema-dts";
import IntakeForm from "./components/IntakeForm";

const SITE_URL = "https://thestuffbuyers.com";

export const metadata: Metadata = {
  title:
    "The Stuff Buyers — We Buy Excess Inventory, Dead Stock & Closeouts | 48-Hour Quotes",
  description:
    "Sell your excess inventory, dead stock, overstock, and closeout merchandise to The Stuff Buyers. Recovery quotes in 48 hours. No contracts. Nationwide pickup and payment. Electronics, toys, housewares, tools, and more.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title:
      "The Stuff Buyers — We Buy Excess Inventory, Dead Stock & Closeouts",
    description:
      "Sell your excess inventory fast. Recovery quotes in 48 hours. No contracts, no hassle. We buy electronics, toys, housewares, tools, health & beauty, and more.",
    url: SITE_URL,
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "The Stuff Buyers — We Buy Stuff. The stuff you can't sell.",
      },
    ],
  },
};

const serviceJsonLd: WithContext<ProfessionalService> = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "The Stuff Buyers",
  description:
    "Wholesale inventory acquisition and liquidation brokerage. We buy excess inventory, dead stock, overstock, and closeout merchandise from businesses nationwide.",
  url: SITE_URL,
  telephone: "+1-314-358-5293",
  email: "quotes@thestuffbuyers.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "448 Cobblestone Way",
    addressLocality: "Mt Juliet",
    addressRegion: "TN",
    postalCode: "37122",
    addressCountry: "US",
  },
  areaServed: {
    "@type": "Country",
    name: "United States",
  },
  priceRange: "$$",
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "08:00",
    closes: "18:00",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Inventory Categories We Purchase",
    itemListElement: [
      { "@type": "OfferCatalog", name: "Electronics", description: "Consumer electronics, computers, peripherals, AV equipment" },
      { "@type": "OfferCatalog", name: "Toys & Games", description: "Toys, games, puzzles, outdoor play equipment" },
      { "@type": "OfferCatalog", name: "Health & Beauty", description: "Health products, beauty products, personal care, supplements" },
      { "@type": "OfferCatalog", name: "Tools & Hardware", description: "Power tools, hand tools, hardware, industrial equipment" },
      { "@type": "OfferCatalog", name: "Housewares & Home", description: "Kitchen products, home décor, furniture, bedding" },
      { "@type": "OfferCatalog", name: "General Merchandise", description: "Sporting goods, automotive, food & beverage, apparel" },
    ],
  },
};

const faqJsonLd: WithContext<FAQPage> = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What kind of inventory does The Stuff Buyers purchase?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We buy excess inventory, dead stock, overstock, closeouts, surplus merchandise, customer returns, and discontinued products across all major consumer categories — including electronics, toys & games, health & beauty, tools & hardware, housewares, sporting goods, automotive, food & beverage, furniture, industrial goods, and general merchandise. If it has a SKU and you can't move it, we want to hear about it.",
      },
    },
    {
      "@type": "Question",
      name: "How fast can I get a quote for my excess inventory?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We return recovery quotes within 48 hours of receiving your item sheet. For standard submissions with SKU, UPC, quantity, and location data, we can often respond even faster. There are no contracts and no commitments required to receive a quote.",
      },
    },
    {
      "@type": "Question",
      name: "How does the inventory liquidation process work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our process is three steps: (1) You send us your item sheet with SKU, UPC, quantity, and location. (2) Our partner network returns a transparent, competitive recovery quote within 48 hours. (3) Accept the offer and we handle pickup, logistics, and payment. Decline? No hard feelings — you're never locked in.",
      },
    },
    {
      "@type": "Question",
      name: "Does The Stuff Buyers operate nationwide?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. We purchase excess inventory from businesses across the entire United States. We coordinate all pickup logistics and can handle inventory at any location — warehouses, distribution centers, retail locations, or Amazon FBA facilities.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a minimum quantity or value to sell inventory?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We evaluate every submission on a case-by-case basis. While we specialize in bulk and pallet-quantity purchases, we consider all sizes. Submit your item sheet and we'll let you know what we can do.",
      },
    },
    {
      "@type": "Question",
      name: "Can you buy my Amazon FBA inventory?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. If you have slow-moving, restricted, or excess Amazon FBA inventory, we can purchase it directly. We coordinate removal from Amazon fulfillment centers and handle all logistics so you can free up capital and avoid mounting storage fees.",
      },
    },
    {
      "@type": "Question",
      name: "How do I get started selling my excess inventory?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Visit thestuffbuyers.com and fill out our quote form with your inventory details, or email your item sheet directly to quotes@thestuffbuyers.com. Include SKU/UPC, quantity, product condition, and warehouse location for the fastest response.",
      },
    },
  ],
};

const HOW_IT_WORKS = [
  {
    num: "01",
    title: "You Show Me Yours.",
    body: "Hand us your item sheet: SKU, UPC, quantity, location. That's it. No lengthy forms, no back and forth — just the basics so we can get to work.",
  },
  {
    num: "02",
    title: "I'll Show You Mine.",
    body: "Our partner network returns a recovery quote — fast, transparent, and competitive. You'll know where you stand within 48 hours. No guesswork.",
  },
  {
    num: "03",
    title: "Make a Decision.",
    body: "Accept the offer and we handle pickup, logistics, and payment. Decline? No hard feelings — you're never locked in.",
  },
];

export default function Home() {
  return (
    <div className="bg-brand-bg min-h-screen">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Skip to content */}
      <a
        href="#intake-form"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-brand-gold focus:text-brand-bg focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold"
      >
        Skip to form
      </a>

      {/* ── Hero ── */}
      <section
        className="px-6 md:px-12 lg:px-24 pt-16 md:pt-20 pb-12 md:pb-16 relative"
        style={{
          backgroundImage: 'url(/trade-show-booth.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Dark overlay so text stays readable */}
        <div className="absolute inset-0 bg-brand-bg/85" />
        <div className="max-w-5xl relative z-10">
          <h1
            className="font-black text-brand-gold leading-[0.85] tracking-[-0.04em]
                       text-[3.5rem] md:text-[5rem] lg:text-[8rem]"
          >
            WE<br />BUY<br />STUFF.
          </h1>
          <p className="text-brand-gray text-lg md:text-xl mt-4">
            (The stuff you can&apos;t sell.)
          </p>
          <p className="text-brand-gray text-base md:text-lg max-w-xl leading-relaxed mt-6">
            Excess inventory. Dead stock. The stuff collecting dust. Send us your item sheet and
            we&apos;ll return a recovery quote in 48 hours. No contracts. No commitments. No hassle.
          </p>
          <a
            href="#intake-form"
            className="inline-block bg-brand-gold text-brand-bg font-semibold px-8 py-4 rounded-lg mt-8 hover:bg-brand-gold/90 transition-colors"
          >
            Get a Quote →
          </a>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section
        data-fade
        className="px-6 md:px-12 lg:px-24 py-12 md:py-16 border-t border-brand-card"
      >
        <div className="max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-gold mb-12">
            Three Steps. That&apos;s It.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {HOW_IT_WORKS.map(({ num, title, body }) => (
              <div key={num}>
                <p className="text-brand-gold text-4xl md:text-5xl font-bold tabular-nums">{num}</p>
                <div className="border-t border-brand-gold w-full mt-2 mb-4" />
                <h3 className="text-brand-white font-semibold text-xl md:text-2xl mb-3">{title}</h3>
                <p className="text-brand-gray text-sm md:text-base leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What We Buy ── */}
      <section
        data-fade
        className="px-6 md:px-12 lg:px-24 py-10 md:py-14 border-t border-brand-card"
      >
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-gold mb-6">
            What We Buy.
          </h2>
          <p className="text-brand-white font-medium text-base md:text-lg leading-loose">
            Electronics. Toys &amp; Games. Housewares. Sporting Goods.
            Tools &amp; Hardware. Health &amp; Beauty. Furniture &amp; Home.
            Automotive. Industrial. Food &amp; Beverage. General Merchandise.
          </p>
          <p className="text-brand-gray text-base italic mt-4">
            If it has a SKU and you can&apos;t move it — we want to hear about it.
          </p>
        </div>
      </section>

      {/* ── Intake Form ── */}
      <section
        id="intake-form"
        data-fade
        className="px-6 md:px-12 lg:px-24 py-12 md:py-16 border-t border-brand-card"
      >
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-gold mb-2">
            Get a Quote.
          </h2>
          <p className="text-brand-gray text-base mb-8">
            Tell us about your inventory. We&apos;ll take it from there.
          </p>
          <IntakeForm />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section
        id="faq"
        data-fade
        aria-labelledby="faq-heading"
        className="px-6 md:px-12 lg:px-24 py-12 md:py-16 border-t border-brand-card"
      >
        <div className="max-w-3xl">
          <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold text-brand-gold mb-8">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {[
              {
                q: "What kind of inventory does The Stuff Buyers purchase?",
                a: "We buy excess inventory, dead stock, overstock, closeouts, surplus merchandise, customer returns, and discontinued products across all major consumer categories — including electronics, toys & games, health & beauty, tools & hardware, housewares, sporting goods, automotive, food & beverage, furniture, industrial goods, and general merchandise. If it has a SKU and you can't move it, we want to hear about it.",
              },
              {
                q: "How fast can I get a quote for my excess inventory?",
                a: "We return recovery quotes within 48 hours of receiving your item sheet. For standard submissions with SKU, UPC, quantity, and location data, we can often respond even faster. There are no contracts and no commitments required to receive a quote.",
              },
              {
                q: "How does the inventory liquidation process work?",
                a: "Our process is three steps: (1) You send us your item sheet with SKU, UPC, quantity, and location. (2) Our partner network returns a transparent, competitive recovery quote within 48 hours. (3) Accept the offer and we handle pickup, logistics, and payment. Decline? No hard feelings — you're never locked in.",
              },
              {
                q: "Does The Stuff Buyers operate nationwide?",
                a: "Yes. We purchase excess inventory from businesses across the entire United States. We coordinate all pickup logistics and can handle inventory at any location — warehouses, distribution centers, retail locations, or Amazon FBA facilities.",
              },
              {
                q: "Is there a minimum quantity or value to sell inventory?",
                a: "We evaluate every submission on a case-by-case basis. While we specialize in bulk and pallet-quantity purchases, we consider all sizes. Submit your item sheet and we'll let you know what we can do.",
              },
              {
                q: "Can you buy my Amazon FBA inventory?",
                a: "Yes. If you have slow-moving, restricted, or excess Amazon FBA inventory, we can purchase it directly. We coordinate removal from Amazon fulfillment centers and handle all logistics so you can free up capital and avoid mounting storage fees.",
              },
              {
                q: "How do I get started selling my excess inventory?",
                a: "Fill out our quote form above with your inventory details, or email your item sheet directly to quotes@thestuffbuyers.com. Include SKU/UPC, quantity, product condition, and warehouse location for the fastest response.",
              },
            ].map(({ q, a }) => (
              <details key={q} className="border border-brand-card rounded-lg p-4 group">
                <summary className="cursor-pointer font-semibold text-brand-white text-base md:text-lg list-none">
                  {q}
                </summary>
                <p className="text-brand-gray text-sm md:text-base mt-3 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services Hub (internal links for SEO) ── */}
      <section
        id="services"
        data-fade
        aria-labelledby="services-heading"
        className="px-6 md:px-12 lg:px-24 py-10 md:py-14 border-t border-brand-card"
      >
        <div className="max-w-3xl">
          <h2 id="services-heading" className="text-2xl md:text-3xl font-bold text-brand-gold mb-6">
            Our Inventory Buying Services
          </h2>
          <nav aria-label="Services">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm md:text-base">
              {[
                { href: "/sell-excess-inventory", label: "Sell Excess Inventory" },
                { href: "/sell-dead-stock", label: "Sell Dead Stock" },
                { href: "/inventory-liquidation-services", label: "Inventory Liquidation Services" },
                { href: "/industries", label: "Industries We Serve" },
                { href: "/blog", label: "Liquidation Insights Blog" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="block border border-brand-card rounded-lg px-4 py-3 text-brand-white hover:border-brand-gold hover:text-brand-gold transition-colors"
                  >
                    {label} →
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

    </div>
  );
}
