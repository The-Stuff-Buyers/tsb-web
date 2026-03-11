import IntakeForm from "./components/IntakeForm";

const TICKER_ITEMS = [
  "Electronics",
  "Toys & Games",
  "Housewares",
  "Overstock",
  "Liquidation Loads",
  "Store Returns",
  "Bulk Inventory",
  "Closeouts",
  "Collectibles",
  "General Merch",
  "Seasonal Goods",
  "Slow Movers",
];

const WHAT_WE_BUY = [
  {
    emoji: "📱",
    title: "Electronics & Gadgets",
    body: "Consumer electronics, accessories, smart home devices, gaming gear — new, open box, or returned.",
  },
  {
    emoji: "🎯",
    title: "Toys & Collectibles",
    body: "Action figures, games, hobby items, branded toys, seasonal items, and collector's goods in any condition.",
  },
  {
    emoji: "🏠",
    title: "Housewares",
    body: "Kitchen goods, small appliances, home goods, décor — single units to full pallets.",
  },
  {
    emoji: "📦",
    title: "General Merchandise",
    body: "Overstock, liquidation loads, store returns, closeouts — if you're unsure, reach out anyway.",
  },
];

const HOW_IT_WORKS = [
  {
    num: "01",
    title: "You Show Me Yours",
    body: "Hand us your item sheet: SKU, UPC, quantity, location. That's it. No lengthy forms, no back and forth — just the basics so we can get to work.",
  },
  {
    num: "02",
    title: "I'll Show You Mine",
    body: "Our partner network returns a recovery quote — fast, transparent, and competitive. You'll know where you stand within 24–48 hours. No guesswork.",
  },
  {
    num: "03",
    title: "Consign, Cash Out, or Keep",
    body: "Accept the offer and we handle pickup, logistics, and payment. Decline? No hard feelings — you're never locked in to anything.",
  },
];

const WHY_CHOOSE = [
  {
    emoji: "⚡",
    title: "Speed",
    body: "Fast quotes mean faster decisions. Get recovery numbers in days, not weeks. Your cash flow can't wait — and neither can we.",
  },
  {
    emoji: "🔍",
    title: "Transparency",
    body: "No hidden fees. No confusing terms. Straightforward offers you can act on — or walk away from. No pressure, ever.",
  },
  {
    emoji: "✅",
    title: "Simplicity",
    body: "One item sheet. One quote. One decision. We handle pickup, logistics, and payment. You handle nothing else.",
  },
];

function TickerRow({ direction }: { direction: "left" | "right" }) {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  const animClass =
    direction === "left" ? "animate-scroll-left" : "animate-scroll-right";

  return (
    <div className="ticker-wrapper py-3">
      <div className={`flex whitespace-nowrap ${animClass}`} style={{ width: "max-content" }}>
        {items.map((item, i) => (
          <span key={i} className="flex items-center">
            <span className="text-brand-gray text-sm font-medium px-4">{item}</span>
            <span className="text-brand-gold text-xs">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="bg-brand-bg min-h-screen">
      {/* ── Hero ── */}
      <section className="px-6 md:px-12 lg:px-24 pt-20 pb-16">
        <div className="max-w-5xl">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-semibold text-brand-gold leading-none tracking-tight mb-4">
            WEBUYSTUFF.
          </h1>
          <p className="text-brand-gray text-lg md:text-xl mb-6">
            (The stuff you can&apos;t sell.)
          </p>
          <p className="text-brand-gray text-base md:text-lg max-w-2xl leading-relaxed mb-10">
            Got excess inventory sitting in a warehouse or storage unit? We buy
            electronics, toys, housewares, general merchandise — anything with
            value, in any quantity. Fast quotes. Clean exits. No drama.
          </p>
          <a
            href="#wbs-contact"
            className="inline-block bg-brand-gold text-brand-bg font-semibold px-8 py-4 rounded-lg text-base hover:bg-brand-gold/90 transition-colors mb-10"
          >
            Get a Quote →
          </a>
          <div className="flex flex-wrap gap-4">
            {["Fast Quotes", "Any Category", "Zero Hassle"].map((badge) => (
              <span
                key={badge}
                className="text-brand-gray text-sm border border-brand-card px-4 py-2 rounded-full"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ticker ── */}
      <section className="border-t border-b border-brand-card py-2 overflow-hidden">
        <TickerRow direction="left" />
        <TickerRow direction="right" />
      </section>

      {/* ── What We Do ── */}
      <section className="px-6 md:px-12 lg:px-24 py-20">
        <div className="max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-semibold text-brand-gold mb-4">
            Inventory Recovery. Made Simple.
          </h2>
          <p className="text-brand-gray text-base md:text-lg max-w-2xl leading-relaxed mb-12">
            Whether it&apos;s a pallet in a storage unit or a warehouse full of
            returns, we connect sellers with a nationwide partner network ready
            to make an offer. No auction. No middleman runaround. Just fast
            quotes and clean exits.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stat: "Fast", label: "Quotes in Days" },
              { stat: "Fair", label: "Transparent Offers" },
              { stat: "Zero", label: "Headaches" },
            ].map(({ stat, label }) => (
              <div
                key={stat}
                className="bg-brand-card rounded-2xl p-8"
              >
                <p className="text-brand-gold text-4xl font-semibold mb-2">{stat}</p>
                <p className="text-brand-white text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What We Buy ── */}
      <section className="px-6 md:px-12 lg:px-24 py-20 border-t border-brand-card">
        <div className="max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-semibold text-brand-gold mb-10">
            If It Has Value, We Want to Hear About It.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHAT_WE_BUY.map(({ emoji, title, body }) => (
              <div key={title} className="bg-brand-card rounded-2xl p-6">
                <span className="text-3xl block mb-4">{emoji}</span>
                <h3 className="text-brand-white font-semibold text-base mb-3">{title}</h3>
                <p className="text-brand-gray text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="px-6 md:px-12 lg:px-24 py-20 border-t border-brand-card">
        <div className="max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-semibold text-brand-gold mb-12">
            Three Steps. That&apos;s It.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {HOW_IT_WORKS.map(({ num, title, body }) => (
              <div key={num}>
                <p className="text-brand-gray text-sm font-medium tabular-nums mb-3">{num}</p>
                <div className="h-px bg-brand-gold mb-4" />
                <h3 className="text-brand-white font-semibold text-lg mb-3">{title}</h3>
                <p className="text-brand-gray text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <p className="text-brand-gray text-sm mt-12">
            Simple process. Real results. Zero headaches.
          </p>
        </div>
      </section>

      {/* ── Why Choose Us ── */}
      <section className="px-6 md:px-12 lg:px-24 py-20 border-t border-brand-card">
        <div className="max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-semibold text-brand-gold mb-10">
            Built for Sellers Who Need a Real Answer.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {WHY_CHOOSE.map(({ emoji, title, body }) => (
              <div key={title} className="bg-brand-card rounded-2xl p-8">
                <span className="text-3xl block mb-4">{emoji}</span>
                <h3 className="text-brand-white font-semibold text-lg mb-3">{title}</h3>
                <p className="text-brand-gray text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Partner Network ── */}
      <section className="px-6 md:px-12 lg:px-24 py-20 border-t border-brand-card">
        <div className="max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-semibold text-brand-gold mb-6">
            Powered by a Nationwide Buyer Network.
          </h2>
          <ul className="space-y-3 mb-10">
            {[
              "Fast quote turnaround — typically 24–48 hours",
              "Nationwide pickup capability, any volume",
              "Volume-based fees — the bigger the deal, the better it gets",
              "Transparent pricing aligned with real recovery value",
              "Incentivized to get you the best possible number",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-brand-gold mt-1 text-xs">◆</span>
                <span className="text-brand-gray text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          <div className="bg-brand-card rounded-2xl p-8 mb-6">
            <h3 className="text-brand-white font-semibold text-base mb-3">Trade Shows</h3>
            <p className="text-brand-gray text-sm leading-relaxed">
              We show up at select retail and wholesale trade shows each month.
              Black and yellow branding that stops traffic. Brutally simple
              messaging. Bring your SKUs — leave with a quote.
            </p>
          </div>
          <div className="bg-brand-card rounded-2xl p-8">
            <h3 className="text-brand-white font-semibold text-base mb-3">How We Make Money</h3>
            <p className="text-brand-gray text-sm leading-relaxed">
              We earn a brokerage fee on accepted offers, scaled to volume and
              terms. Transparent pricing. No surprises. We only win when you do.
            </p>
          </div>
        </div>
      </section>

      {/* ── Intake Form ── */}
      <section id="wbs-contact" className="px-6 md:px-12 lg:px-24 py-20 border-t border-brand-card">
        <div className="max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-semibold text-brand-gold mb-3">
            Get a Quote.
          </h2>
          <p className="text-brand-gray text-base mb-10">
            Tell us about your inventory. We&apos;ll take it from there.
          </p>
          <IntakeForm />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-brand-card px-6 py-10 text-center">
        <p className="text-brand-gray text-sm mb-1">
          © 2026 The Stuff Buyers LLC. All rights reserved.
        </p>
        <p className="text-brand-gray text-sm">
          thestuffbuyers.com | quotes@thestuffbuyers.com
        </p>
      </footer>
    </main>
  );
}
