import IntakeForm from "./components/IntakeForm";

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
      {/* Skip to content */}
      <a
        href="#intake-form"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-brand-gold focus:text-brand-bg focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold"
      >
        Skip to form
      </a>

      {/* ── Hero ── */}
      <section className="px-6 md:px-12 lg:px-24 pt-16 md:pt-20 pb-12 md:pb-16">
        <div className="max-w-5xl">
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

    </div>
  );
}
