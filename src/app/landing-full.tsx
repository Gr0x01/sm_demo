import type { CSSProperties } from "react";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import {
  RevealObserver,
  TrackedLink,
  RoiCalculator,
  HeroProofCard,
  FaqItem,
  PilotForm,
} from "./landing-client";

const HOMEPAGE_NAV_LINKS = [
  { label: "Try It", href: "/try" },
  { label: "How It Works", href: "#how" },
  { label: "Pilot", href: "#pilot" },
  { label: "FAQ", href: "#faq" },
];

const faqs = [
  {
    q: "How long does setup take?",
    a: "First floor plan is live in 48 hours. Additional plans are typically a day or two each. You send us your option sheets and model home photos. We do the rest.",
  },
  {
    q: "What does a pilot look like?",
    a: "We set up one floor plan at no cost. You use it with real buyers. We measure upgrade revenue together over 60 days. If the numbers work, we expand. If they don\u2019t, you walk away with no obligation.",
  },
  {
    q: "What does the buyer experience look like?",
    a: "Buyers open a link, pick finishes from your catalog, and see the room update with their selections. It works on any device, takes a few minutes, and exports a priced selection sheet when they\u2019re done. No app download. No account required.",
  },
  {
    q: "Do we need to change our sales process?",
    a: "No. Finch fits into your existing design appointments. Buyers use the tool themselves. Your team gets a priced selection sheet, same as today.",
  },
  {
    q: "What does this cost?",
    a: "Pricing is scoped to your floor plan count and volume. Your first plan is free so we can prove the value before we talk numbers. Reach out and we\u2019ll walk through it together.",
  },
  {
    q: "How is this different from Envision or other platforms?",
    a: "Envision takes months to implement and requires significant infrastructure. Finch is live in 48 hours, handles all the setup for you, and is built for production builders who want to sell more upgrades without a massive platform commitment.",
  },
  {
    q: "Can this work with our current design center software?",
    a: "Yes. Finch is the visual layer that makes your existing options sell better. It exports a priced selection sheet you can enter into any system you already use.",
  },
  {
    q: "Can we update pricing and options ourselves?",
    a: "Yes. Every builder gets an admin dashboard to update option pricing, add or remove finishes, and manage floor plans\u00a0\u2014\u00a0any time, no ticket required. If you need a bulk update done for you, we\u2019ll handle it.",
  },
];

const revealStyle = (delay: number): CSSProperties => ({
  ["--reveal-delay" as string]: `${delay}ms`,
});

function Section({
  children,
  gray,
  id,
}: {
  children: React.ReactNode;
  gray?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={`px-6 py-20 md:py-28 ${gray ? "bg-slate-50" : "bg-white"}`}>
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <RevealObserver />
      <SiteNav links={HOMEPAGE_NAV_LINKS} />

      {/* ─── Hero ─── */}
      <section className="px-6 pt-14 pb-18 md:pt-18 md:pb-16 lg:pt-20 lg:pb-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-10 lg:gap-12 items-center">
            <div data-reveal style={revealStyle(100)}>
              <h1 className="text-[3.2rem] md:text-[3.6rem] lg:text-[4.4rem] leading-[0.95] text-slate-900 tracking-[-0.02em] mb-8">
                They always
                <br />
                pick Standard.
              </h1>

              <p className="text-lg md:text-xl lg:text-2xl leading-tight text-slate-600 max-w-xl mb-10">
                Not because they want the base package. Because they can&apos;t picture what they&apos;re paying for.
              </p>

              <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 mb-4">
                <TrackedLink
                  href="#pilot"
                  event="cta_clicked"
                  properties={{ cta: "Start a Pilot", location: "hero" }}
                  className="w-full sm:w-auto text-center px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
                >
                  Start a Pilot
                </TrackedLink>
                <TrackedLink
                  href="/try"
                  event="cta_clicked"
                  properties={{ cta: "Try It Live", location: "hero" }}
                  className="w-full sm:w-auto text-center px-8 py-3.5 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-900 hover:text-slate-900 transition-colors"
                >
                  Try It Live
                </TrackedLink>
              </div>

            </div>

            <div data-reveal style={revealStyle(180)} className="hidden md:block">
              <HeroProofCard />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Speed Bar ─── */}
      <div className="px-6 py-12 md:py-16 bg-slate-100">
        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl md:text-4xl leading-none tracking-tight text-slate-900 mb-2" style={{ fontVariantNumeric: "tabular-nums" }}>48hrs</p>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">First plan live</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl leading-none tracking-tight text-slate-900 mb-2">Done for you</p>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">We handle setup. You keep selling.</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl leading-none tracking-tight text-slate-900 mb-2">1 plan</p>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Free to prove it works</p>
          </div>
        </div>
      </div>

      {/* ─── Before / After ─── */}
      <Section gray id="compare">
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-12 md:mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">Before and After</p>
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900">
            A price sheet
            <br />
            doesn&apos;t sell. It lists.
          </h2>
        </div>

        {/* Mobile: single combined card */}
        <div data-reveal style={revealStyle(90)} className="md:hidden bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-100 px-6 py-8">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-4 text-center">What buyers see today</p>
            <div className="max-w-[290px] mx-auto space-y-2">
              {[
                { label: "BACKSPLASH \u2014 Herringbone Glacier", price: "$425" },
                { label: "COUNTERTOP \u2014 Calacatta Venice", price: "$2,450" },
                { label: "HARDWARE \u2014 Dominique Gold Pulls", price: "$300" },
                { label: "FAUCET \u2014 Colfax Brushed Gold", price: "$375" },
                { label: "ISLAND \u2014 Admiral Blue", price: "$200" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="text-slate-500">+{item.price}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 mt-3 pt-2 flex justify-between text-[11px] font-mono">
                <span className="text-slate-500 font-semibold">TOTAL UPGRADES</span>
                <span className="text-slate-700 font-semibold">+$3,750</span>
              </div>
            </div>
          </div>
          <div className="relative aspect-[4/3] bg-slate-100">
            <Image src="/home-hero-generated.png" alt="Kitchen upgrade visualization" fill className="object-cover" />
          </div>
          <div className="p-4 text-center">
            <p className="text-sm font-semibold text-slate-900">What buyers see with Finch</p>
          </div>
        </div>

        {/* Desktop: side-by-side cards */}
        <div className="hidden md:grid md:grid-cols-2 gap-8">
          <div
            data-reveal
            style={revealStyle(90)}
            className="bg-white border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-full max-w-[290px] space-y-2">
                  {[
                    { label: "BACKSPLASH \u2014 Herringbone Glacier", price: "$425" },
                    { label: "COUNTERTOP \u2014 Calacatta Venice", price: "$2,450" },
                    { label: "HARDWARE \u2014 Dominique Gold Pulls", price: "$300" },
                    { label: "FAUCET \u2014 Colfax Brushed Gold", price: "$375" },
                    { label: "ISLAND \u2014 Admiral Blue", price: "$200" },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="text-slate-500">+{item.price}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 mt-3 pt-2 flex justify-between text-xs font-mono">
                    <span className="text-slate-500 font-semibold">TOTAL UPGRADES</span>
                    <span className="text-slate-700 font-semibold">+$3,750</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm font-semibold text-slate-500">What buyers see today</p>
            </div>
          </div>

          <div
            data-reveal
            style={revealStyle(150)}
            className="bg-white border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="aspect-[4/3] relative bg-slate-100">
              <Image src="/home-hero-generated.png" alt="Kitchen upgrade visualization" fill className="object-cover" />
            </div>
            <div className="p-4 text-center">
              <p className="text-sm font-semibold text-slate-900">What buyers see with Finch</p>
            </div>
          </div>
        </div>

        <div data-reveal style={revealStyle(210)} className="text-center mt-10">
          <p className="text-sm text-slate-500 mb-4">
            This demo uses a real builder&apos;s catalog and pricing. Yours will show your finishes, your prices, your floor plans.
          </p>
          <TrackedLink
            href="/try"
            event="cta_clicked"
            properties={{ cta: "Try It Live", location: "compare" }}
            className="inline-block px-6 py-3 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
          >
            Try It Live
          </TrackedLink>
        </div>
      </Section>

      {/* ─── ROI Calculator ─── */}
      <Section id="roi">
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">Your Numbers</p>
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900">
            Plug in your numbers.
          </h2>
        </div>

        <RoiCalculator />

        <div
          data-reveal
          style={revealStyle(330)}
          className="text-center max-w-3xl mx-auto"
        >
          <p className="text-2xl md:text-3xl text-slate-800 leading-tight mb-6">
            Buyers upgrade what they can see. The ones who can&apos;t picture it default to&nbsp;Standard.
          </p>
          <p className="text-xs text-slate-500 max-w-2xl mx-auto">
            In our first test, a buyer actively trying to minimize spend still chose 40% more after seeing their selections. Industry data across 225+ builder brands averages 35%. We start at 15% because it&apos;s conservative.
          </p>
        </div>
      </Section>

      {/* ─── How It Works ─── */}
      <Section gray id="how">
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">How It Works</p>
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900">We build it. Your buyers use it. You get the&nbsp;revenue.</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              n: "01",
              title: "Send us your floor plans and\u00a0pricing",
              desc: "Your current option sheets and a few model home photos. Whatever you have works. We handle the\u00a0rest.",
            },
            {
              n: "02",
              title: "We build your upgrade\u00a0experience",
              desc: "Your finishes, your prices, your brand. First plan live in 48\u00a0hours. Update pricing or swap options yourself through the admin dashboard\u00a0\u2014\u00a0or send us the\u00a0changes.",
            },
            {
              n: "03",
              title: "Buyers see their kitchen before they\u00a0commit",
              desc: "They pick options and watch the room change. Not a line item on a sheet. The actual kitchen with their selections\u00a0applied.",
            },
            {
              n: "04",
              title: "You get priced selections\u00a0back",
              desc: "Every session exports a selection sheet with pricing. Ready for your sales team. No\u00a0re-entry.",
            },
          ].map((step, index) => (
            <div key={step.n} data-reveal style={revealStyle(90 + index * 70)}>
              <p className="text-3xl md:text-4xl leading-none tracking-tight text-slate-300 mb-3">{step.n}</p>
              <h3 className="text-lg text-slate-900 leading-tight mb-2">{step.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        <div data-reveal style={revealStyle(370)} className="text-center mt-12">
          <p className="text-sm text-slate-500">
            No software to learn. No data entry. No IT department required. First plan in 48 hours. Full catalog in days, not&nbsp;months.
          </p>
        </div>
      </Section>

      {/* ─── Pilot Program ─── */}
      <Section id="pilot">
        <div
          data-reveal
          style={revealStyle(20)}
          className="max-w-3xl mx-auto text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">Start Here</p>
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-6">
            One floor plan. Zero risk.
            <br />
            Prove the ROI first.
          </h2>
          <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
            We set up your best-selling floor plan at no cost. Your finishes, your pricing, your photos. Buyers use it during real design appointments. We measure upgrade revenue together.
          </p>
        </div>

        <div
          data-reveal
          style={revealStyle(90)}
          className="max-w-3xl mx-auto border border-slate-200 bg-white p-6 md:p-8"
        >
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-8">
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-1">48 hours to live</p>
              <p className="text-sm text-slate-600">Send us your floor plan and options. We handle everything&nbsp;else.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-1">60-day pilot</p>
              <p className="text-sm text-slate-600">Real buyers, real selections, real upgrade revenue&nbsp;data.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-1">Walk away anytime</p>
              <p className="text-sm text-slate-600">If the numbers don&apos;t work, you owe nothing. No contract. No&nbsp;obligation.</p>
            </div>
          </div>

          <PilotForm />
        </div>

        <p
          data-reveal
          style={revealStyle(160)}
          className="text-sm text-slate-500 text-center mt-6"
        >
          After the pilot, we scope pricing to your floor plan count. We&apos;ll walk through it together once you&apos;ve seen the results.
        </p>
      </Section>

      {/* ─── Why This Exists ─── */}
      <Section gray id="why">
        <div
          data-reveal
          style={revealStyle(20)}
          className="max-w-3xl mx-auto text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-6">Why This Exists</p>
          <h2 className="text-4xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-8">
            We spent 40% more &mdash; and felt better about every&nbsp;dollar.
          </h2>
          <div className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5 text-left max-w-2xl mx-auto">
            <p>
              My wife and I just bought a new construction home, partly as an investment, so the goal was to keep costs&nbsp;low. We wanted to upgrade the kitchen, but all we had was a price sheet. Even with samples in hand, you can touch each piece, but you still can&apos;t see what it all looks like&nbsp;together.
            </p>
            <p>
              So I built a tool that showed us. We spent 40% more than planned, felt great about every choice, and never second-guessed a single&nbsp;one.
            </p>
            <p className="text-slate-800 font-medium">
              Your buyers want to upgrade. They just need to see it&nbsp;first.
            </p>
          </div>
          <p className="text-sm text-slate-400 mt-8">&mdash; Rashaad, Finch</p>
        </div>
      </Section>

      {/* ─── FAQ ─── */}
      <Section id="faq">
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-4xl md:text-5xl leading-[1] tracking-[-0.02em] text-slate-900 text-center mb-12"
          >
            Common questions
          </h2>
          <div>
            {faqs.map((faq, index) => (
              <div key={faq.q} data-reveal style={revealStyle(90 + index * 70)}>
                <FaqItem q={faq.q} a={faq.a} />
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── Final CTA ─── */}
      <section id="contact" className="px-6 py-20 md:py-28 bg-white border-t border-slate-100">
        <div
          data-reveal
          style={revealStyle(20)}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-5">
            Your buyers can&apos;t upgrade what they can&apos;t see.
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto text-balance">
            Upload a model home photo. Pick finishes. Watch the room change. This is what your buyers would see.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <TrackedLink
              href="#pilot"
              event="cta_clicked"
              properties={{ cta: "Start a Pilot", location: "contact" }}
              className="inline-block px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              Start a Pilot
            </TrackedLink>
            <TrackedLink
              href="/try"
              event="cta_clicked"
              properties={{ cta: "Try It Live", location: "contact" }}
              className="inline-block px-6 py-3 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-900 hover:text-slate-900 transition-colors"
            >
              Try It Live
            </TrackedLink>
          </div>
          <p className="text-xs text-slate-400 mt-4">Questions? hello@withfin.ch</p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="px-6 py-10 border-t border-slate-100 bg-slate-50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-sm font-semibold text-slate-900 tracking-[0.04em]">Finch</p>
          <div className="flex items-center gap-6">
            <a href="#how" className="text-xs uppercase tracking-[0.16em] text-slate-400 hover:text-slate-700 transition-colors">How It Works</a>
            <a href="#pilot" className="text-xs uppercase tracking-[0.16em] text-slate-400 hover:text-slate-700 transition-colors">Pilot</a>
            <a href="#faq" className="text-xs uppercase tracking-[0.16em] text-slate-400 hover:text-slate-700 transition-colors">FAQ</a>
            <a href="mailto:hello@withfin.ch" className="text-xs uppercase tracking-[0.16em] text-slate-400 hover:text-slate-700 transition-colors">Contact</a>
          </div>
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} Finch. All rights reserved.</p>
        </div>
      </footer>

      {/* ─── JSON-LD Structured Data ─── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Finch",
            description:
              "Upgrade visualization for home builders. Buyers pick finishes and see the room update with their selections.",
            url: "https://withfin.ch",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            provider: {
              "@type": "Organization",
              name: "Finch",
              url: "https://withfin.ch",
            },
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              description: "Free pilot — first floor plan at no cost",
            },
          }),
        }}
      />
    </div>
  );
}
