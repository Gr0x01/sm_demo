import type { Metadata } from "next";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import {
  RevealObserver,
  TrackedLink,
  RoiCalculator,
  FaqItem,
} from "@/app/landing-client";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: {
    absolute:
      "Finch vs Zonda Envision — Upgrade Visualization Without the Enterprise Rollout",
  },
  description:
    "Looking for a Zonda Envision alternative? Finch delivers the same upgrade revenue lift in 48 hours. Done for you. No six-figure contract, no IT team, no months of setup.",
  alternates: { canonical: "https://withfin.ch/vs/envision" },
  openGraph: {
    title: "Finch vs Zonda Envision — Same Upgrade Lift, Live in 48 Hours",
    description:
      "Envision takes months and six figures. Finch is done for you, live in 48 hours. Compare the two approaches to upgrade visualization.",
    url: "https://withfin.ch/vs/envision",
    siteName: "Finch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finch vs Zonda Envision — Same Upgrade Lift, Live in 48 Hours",
    description:
      "Envision takes months and six figures. Finch is done for you, live in 48 hours.",
  },
};

const NAV_LINKS = [{ label: "Try It", href: "/try" }];

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
    <section
      id={id}
      className={`px-6 py-20 md:py-28 ${gray ? "bg-slate-50" : "bg-white"}`}
    >
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
}

const comparisonRows = [
  { label: "Time to live", envision: "3-6 months", finch: "48 hours" },
  {
    label: "Setup work (your side)",
    envision: "Dedicated team, IT integration",
    finch: "Send option sheets + photos",
  },
  {
    label: "Who does the work",
    envision: "Your team + vendor",
    finch: "We handle everything",
  },
  {
    label: "New floor plan turnaround",
    envision: "Weeks",
    finch: "1-2 days",
  },
  {
    label: "Buyer sees",
    envision: "Pre-rendered 3D scene",
    finch: "Their actual room with selections applied",
  },
  {
    label: "Upgrade revenue lift",
    envision: "35% (their published data)",
    finch: "40% in first test",
  },
  {
    label: "Ongoing maintenance",
    envision: "Dedicated catalog team",
    finch: "Self-serve admin or we handle it",
  },
  {
    label: "Contract to start",
    envision: "Six-figure annual contract",
    finch: "Send option sheets, live in 48 hours",
  },
  {
    label: "Built for",
    envision: "Top 50 nationals",
    finch: "Every production builder",
  },
];

const pdfLineItems = [
  { label: "BACKSPLASH \u2014 Herringbone Glacier", price: "$425" },
  { label: "COUNTERTOP \u2014 Calacatta Venice", price: "$2,450" },
  { label: "HARDWARE \u2014 Dominique Gold Pulls", price: "$300" },
  { label: "FAUCET \u2014 Colfax Brushed Gold", price: "$375" },
  { label: "ISLAND \u2014 Admiral Blue", price: "$200" },
];

const faqs = [
  {
    q: "Envision shows 3D renderings. Is Finch comparable?",
    a: "Different approach, same goal. Envision uses pre-rendered 3D scenes that take weeks to update. Finch generates a visualization of the buyer\u2019s actual selections applied to your model home photos. Both lift upgrade revenue. Finch updates in minutes when you add options.",
  },
  {
    q: "We already use Envision. Can we switch?",
    a: "Yes. Send us your option sheets and model home photos. We can have your first floor plan live in 48 hours, running alongside Envision while you compare results.",
  },
  {
    q: "How do you match Envision\u2019s 35% upgrade lift?",
    a: "Visual upgrade selection drives higher spend regardless of the rendering method. Envision\u2019s own data validates this across 225+ builder brands. In our first test, a buyer actively trying to minimize spend still chose 40% more. The lift comes from buyers seeing their selections, not from any specific technology.",
  },
  {
    q: "What happens after 60 days?",
    a: "If the numbers work, we scope pricing to your community count. If they don\u2019t, you walk away with no obligation. We share the data either way.",
  },
  {
    q: "Do we need IT involvement?",
    a: "No. Nothing to install, nothing to integrate, no servers to configure. We build it. Your buyers use a link. You get a priced selection sheet back.",
  },
  {
    q: "What does this cost compared to Envision?",
    a: "Envision requires a six-figure annual contract. Finch sets up your first community at no cost. After 60 days, pricing is scoped to your community count. Most builders see ROI in the first month.",
  },
];

export default function VsEnvisionPage() {
  return (
    <div className="min-h-screen bg-white">
      <RevealObserver />
      <SiteNav links={NAV_LINKS} cta={{ label: "Get Started", href: "/#get-started" }} />

      {/* --- Hero --- */}
      <section className="px-6 pt-14 pb-16 md:pt-18 md:pb-20 lg:pt-20 lg:pb-24 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p
            data-reveal
            style={revealStyle(60)}
            className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-6"
          >
            Finch vs Zonda Envision
          </p>
          <h1
            data-reveal
            style={revealStyle(100)}
            className="text-[2.8rem] md:text-[3.6rem] lg:text-[4.4rem] leading-[0.95] text-slate-900 tracking-[-0.02em] mb-8"
          >
            Envision results.
            <br />
            Without the Envision&nbsp;rollout.
          </h1>
          <p
            data-reveal
            style={revealStyle(160)}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10"
          >
            Zonda Envision takes months to implement and a team to run. Finch is
            done for you. Send us your option sheets and model home photos. Your
            buyers see their kitchen in 48&nbsp;hours.
          </p>
          <div
            data-reveal
            style={revealStyle(220)}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <TrackedLink
              href="/#get-started"
              event="cta_clicked"
              properties={{ cta: "Get Started", location: "vs-envision-hero" }}
              className="w-full sm:w-auto text-center px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              Get Started
            </TrackedLink>
            <TrackedLink
              href="/try"
              event="cta_clicked"
              properties={{ cta: "Try It Live", location: "vs-envision-hero" }}
              className="w-full sm:w-auto text-center px-8 py-3.5 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-900 hover:text-slate-900 transition-colors"
            >
              Try It Live
            </TrackedLink>
          </div>
        </div>
      </section>

      {/* --- Comparison Table --- */}
      <Section gray>
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900">
            Six months vs. 48&nbsp;hours
          </h2>
        </div>

        <div
          data-reveal
          style={revealStyle(90)}
          className="max-w-4xl mx-auto overflow-hidden border border-slate-200 bg-white"
        >
          {/* Header row */}
          <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-slate-200">
            <div className="p-4 md:p-5" />
            <div className="p-4 md:p-5 border-l border-slate-200">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400 font-semibold">
                Envision
              </p>
            </div>
            <div className="p-4 md:p-5 border-l border-slate-200 bg-slate-50">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-900 font-semibold">
                Finch
              </p>
            </div>
          </div>

          {/* Data rows */}
          {comparisonRows.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-[1fr_1fr_1fr] ${i < comparisonRows.length - 1 ? "border-b border-slate-200" : ""}`}
            >
              <div className="p-4 md:p-5">
                <p className="text-sm font-semibold text-slate-900">
                  {row.label}
                </p>
              </div>
              <div className="p-4 md:p-5 border-l border-slate-200">
                <p className="text-sm text-slate-500">{row.envision}</p>
              </div>
              <div className="p-4 md:p-5 border-l border-slate-200 bg-slate-50">
                <p className="text-sm text-slate-900 font-medium">
                  {row.finch}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* --- What Buyers See --- */}
      <Section>
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-12 md:mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">
            The Buyer Experience
          </p>
          <h2 className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900">
            Envision renders a 3D scene.
            <br />
            Finch shows them their&nbsp;room.
          </h2>
        </div>

        {/* Mobile: stacked */}
        <div
          data-reveal
          style={revealStyle(90)}
          className="md:hidden bg-white border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="p-4 text-center">
            <p className="text-sm font-semibold text-slate-900">
              What most design center tools show
            </p>
          </div>
          <div className="bg-slate-100 px-6 py-8">
            <div className="max-w-[290px] mx-auto space-y-2">
              {pdfLineItems.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between text-[11px] font-mono"
                >
                  <span className="text-slate-400">{item.label}</span>
                  <span className="text-slate-500">+{item.price}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 mt-3 pt-2 flex justify-between text-[11px] font-mono">
                <span className="text-slate-500 font-semibold">
                  TOTAL UPGRADES
                </span>
                <span className="text-slate-700 font-semibold">+$3,750</span>
              </div>
            </div>
          </div>
          <div className="relative aspect-[4/3] bg-slate-100">
            <Image
              src="/home-hero-generated.png"
              alt="Kitchen with buyer selections applied"
              fill
              className="object-cover"
            />
          </div>
          <div className="p-4 text-center">
            <p className="text-sm font-semibold text-slate-900">
              What buyers see with Finch
            </p>
          </div>
        </div>

        {/* Desktop: side-by-side */}
        <div className="hidden md:grid md:grid-cols-2 gap-8">
          <div
            data-reveal
            style={revealStyle(90)}
            className="bg-white border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-full max-w-[290px] space-y-2">
                  {pdfLineItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-xs font-mono"
                    >
                      <span className="text-slate-400">{item.label}</span>
                      <span className="text-slate-500">+{item.price}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 mt-3 pt-2 flex justify-between text-xs font-mono">
                    <span className="text-slate-500 font-semibold">
                      TOTAL UPGRADES
                    </span>
                    <span className="text-slate-700 font-semibold">
                      +$3,750
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm font-semibold text-slate-900">
                What most design center tools show
              </p>
            </div>
          </div>

          <div
            data-reveal
            style={revealStyle(150)}
            className="bg-white border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="aspect-[4/3] relative bg-slate-100">
              <Image
                src="/home-hero-generated.png"
                alt="Kitchen with buyer selections applied"
                fill
                className="object-cover"
              />
            </div>
            <div className="p-4 text-center">
              <p className="text-sm font-semibold text-slate-900">
                What buyers see with Finch
              </p>
            </div>
          </div>
        </div>

        <div
          data-reveal
          style={revealStyle(210)}
          className="text-center mt-10"
        >
          <p className="text-sm text-slate-500 max-w-2xl mx-auto">
            Envision pre-renders a fixed set of 3D scenes. Add a new countertop
            option? Wait weeks for a new render. Finch generates a visualization
            of each buyer&apos;s actual selections applied to your model home
            photos. New option? Live in minutes.
          </p>
        </div>
      </Section>

      {/* --- The Real Cost --- */}
      <Section gray>
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">
            The Real Cost
          </p>
          <h2 className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900">
            Envision charges six figures before your first buyer sees&nbsp;it.
            <br />
            <span className="text-slate-500">Finch starts at&nbsp;zero.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { stat: "48 hrs", label: "First community live" },
            { stat: "Done for you", label: "We handle setup" },
            { stat: "$0", label: "Builder effort" },
          ].map((card, i) => (
            <div
              key={card.label}
              data-reveal
              style={revealStyle(90 + i * 70)}
              className="border border-slate-200 bg-white p-8 text-center"
            >
              <p
                className="text-4xl md:text-5xl leading-none tracking-tight text-slate-900 mb-3"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {card.stat}
              </p>
              <p className="text-sm text-slate-500 uppercase tracking-wider">
                {card.label}
              </p>
            </div>
          ))}
        </div>

        <div
          data-reveal
          style={revealStyle(300)}
          className="text-center mt-10 max-w-2xl mx-auto"
        >
          <p className="text-base text-slate-600">
            One community. Your finishes, your pricing, your photos. If upgrade
            revenue doesn&apos;t move in 60 days, walk&nbsp;away.
          </p>
        </div>
      </Section>

      {/* --- ROI Calculator --- */}
      <Section id="roi">
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">
            Your Numbers
          </p>
          <h2 className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900">
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
            Buyers upgrade what they can see. The ones reading a price sheet
            default to&nbsp;Standard.
          </p>
          <p className="text-xs text-slate-500 max-w-2xl mx-auto">
            In our first test, a buyer actively trying to minimize spend still
            chose 40% more after seeing their selections. Envision&apos;s own
            data across 225+ builder brands averages 35%. We start at 15%
            because it&apos;s conservative.
          </p>
        </div>
      </Section>

      {/* --- How It Works --- */}
      <Section gray>
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">
            How It Works
          </p>
          <h2 className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900">
            Live in 48 hours. Here&apos;s&nbsp;how.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              n: "01",
              title: "Send us your option sheets and model home\u00a0photos",
              desc: "Whatever you have works. PDFs, spreadsheets, photos from your phone. We handle the formatting.",
            },
            {
              n: "02",
              title: "We build your branded upgrade\u00a0experience",
              desc: "Your finishes, your pricing, your photos. No IT, no integration, no data entry on your end.",
            },
            {
              n: "03",
              title: "Buyers pick finishes and see the room\u00a0change",
              desc: "They export a priced selection sheet when they\u2019re done. Ready for your sales team. No re-entry.",
            },
          ].map((step, index) => (
            <div key={step.n} data-reveal style={revealStyle(90 + index * 70)}>
              <p className="text-3xl md:text-4xl leading-none tracking-tight text-slate-300 mb-3">
                {step.n}
              </p>
              <h3 className="text-lg text-slate-900 leading-tight mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        <div
          data-reveal
          style={revealStyle(300)}
          className="text-center mt-12"
        >
          <p className="text-sm text-slate-500">
            No software to learn. No data entry. No IT department required.
            Envision takes a dedicated team and months of integration. Finch
            takes a phone call and 48&nbsp;hours.
          </p>
        </div>
      </Section>

      {/* --- Who This Is For --- */}
      <Section>
        <div className="max-w-3xl mx-auto text-center">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-8"
          >
            Built for the builders Envision&nbsp;wasn&apos;t
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5 text-left max-w-2xl mx-auto"
          >
            <p>
              If you&apos;ve looked at Zonda Envision, you already know the
              math: six-figure contract, months of implementation, a team to
              manage it. For builders closing 500+ homes a year, that might
              pencil&nbsp;out.
            </p>
            <p>
              For everyone else, it doesn&apos;t. Finch delivers the same
              upgrade lift with none of the overhead. Regional builders closing
              50 to 500 homes a year get the same result without a platform
              commitment.
            </p>
            <p className="text-slate-800 font-medium">
              You send us your option sheets. We send you a working experience
              in 48&nbsp;hours. Your buyers see their kitchen before they
              commit. That&apos;s&nbsp;it.
            </p>
          </div>
        </div>
      </Section>

      {/* --- Category Validation --- */}
      <Section gray>
        <div className="max-w-3xl mx-auto text-center">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-8"
          >
            Visualization works. The question is&nbsp;how fast you can get
            it&nbsp;running.
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5 max-w-2xl mx-auto"
          >
            <p>
              Envision&apos;s own data across 225+ builder brands shows a 35%
              increase in upgrade spend when buyers can see their
              selections.
            </p>
            <p>
              In our first test, a buyer who was actively trying to minimize
              spend still chose 40% more after seeing their kitchen with
              selections applied.
            </p>
            <p className="text-slate-800 font-medium">
              The lift comes from showing buyers what they&apos;re getting. Not
              from any specific rendering method. Not from a six-figure
              platform.
            </p>
          </div>
        </div>
      </Section>

      {/* --- FAQ --- */}
      <Section id="faq">
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[1] tracking-[-0.02em] text-slate-900 text-center mb-12"
          >
            Common questions from builders evaluating&nbsp;Envision
          </h2>
          <div>
            {faqs.map((faq, index) => (
              <div
                key={faq.q}
                data-reveal
                style={revealStyle(90 + index * 70)}
              >
                <FaqItem q={faq.q} a={faq.a} />
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* --- Final CTA --- */}
      <section className="px-6 py-20 md:py-28 bg-white border-t border-slate-100">
        <div
          data-reveal
          style={revealStyle(20)}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-5">
            Same upgrade results.
            <br />
            No six-figure contract.
            <br />
            No six-month&nbsp;wait.
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto text-balance">
            One community. Live in 48 hours. We handle everything.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <TrackedLink
              href="/#get-started"
              event="cta_clicked"
              properties={{
                cta: "Get Started",
                location: "vs-envision-footer",
              }}
              className="inline-block px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              Get Started
            </TrackedLink>
            <TrackedLink
              href="/try"
              event="cta_clicked"
              properties={{
                cta: "Try It Live",
                location: "vs-envision-footer",
              }}
              className="inline-block px-6 py-3 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-900 hover:text-slate-900 transition-colors"
            >
              Try It Live
            </TrackedLink>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Questions? hello@withfin.ch
          </p>
        </div>
      </section>

      <SiteFooter />

      {/* --- JSON-LD Structured Data --- */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.a,
              },
            })),
          }),
        }}
      />
    </div>
  );
}
