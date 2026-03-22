import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { RevealObserver, TrackedLink } from "@/app/landing-client";
import { LearnPageTracker } from "./learn-client";

export const metadata: Metadata = {
  title: {
    absolute:
      "The Complete Guide to New Construction Upgrades — What to Know Before Your Design Center Appointment",
  },
  description:
    "Cabinets, countertops, flooring, paint, and more. What each upgrade category looks like, which ones are worth the money, and how to prepare for your design center appointment.",
  alternates: {
    canonical: "https://withfin.ch/learn/new-construction-upgrades",
  },
  openGraph: {
    title: "The Complete Guide to New Construction Upgrades",
    description:
      "Cabinets, countertops, flooring, paint, fixtures. Which ones are worth the money and which ones you can skip. Data from SEC filings of 14 public builders.",
    url: "https://withfin.ch/learn/new-construction-upgrades",
    siteName: "Finch",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Complete Guide to New Construction Upgrades",
    description:
      "Which new construction upgrades add real value? What to expect at the design center appointment.",
  },
};

/* ─── Data ─── */

const upgradeCategories = [
  {
    name: "Cabinets",
    description:
      "Kitchen and bathroom cabinets are usually the biggest visual change you can make to a room. Standard cabinets get the job done, but upgraded options (soft-close drawers, dovetail joints, different wood species) make a kitchen look like a completely different house. If you\u2019re going to spend in one place, this is a good one.",
  },
  {
    name: "Countertops",
    description:
      "Granite, quartz, marble, or laminate. Countertops are the second-biggest visual impact after cabinets, and the two need to work together. You\u2019ll pick a surface material and a color or pattern. Take your time here because you\u2019ll look at your countertops every single day.",
  },
  {
    name: "Flooring",
    description:
      "Hardwood, luxury vinyl plank (LVP), tile, and carpet. Most builders split this into \u201Cmain area flooring\u201D for your kitchen, living room, and hallways, and separate carpet selections for bedrooms. You walk on it every day and you\u2019ll notice it every day, and it\u2019s one of the more expensive upgrades to change after you move in.",
  },
  {
    name: "Paint",
    description:
      "Wall colors, accent walls, and trim color. Most builders include a base paint package and charge for upgrades beyond their standard palette. Paint is one of the easiest things to change later, so don\u2019t stress about this one too much. That said, getting it right from the start saves you a weekend with a roller.",
  },
  {
    name: "Backsplash",
    description:
      "Kitchen backsplash (and sometimes bathroom). You\u2019ll choose from tile patterns, subway tile, mosaics, and other options. This is often a smart upgrade because adding a backsplash after closing means working around cabinets and countertops that are already installed. Getting it done during construction is cleaner and cheaper.",
  },
  {
    name: "Hardware & Fixtures",
    description:
      "Cabinet pulls, faucets, showerheads, towel bars. Cheap to upgrade, and you\u2019ll notice it every time you open a cabinet or wash your hands. Swapping builder-grade chrome for brushed nickel or matte black hardware costs a few hundred dollars and makes the whole kitchen look more intentional.",
  },
  {
    name: "Appliances",
    description:
      "Range, refrigerator, dishwasher, microwave. You\u2019ll decide between options like slide-in vs. freestanding ranges, or built-in vs. standard refrigerators. Some builders include base appliances in the price of the home. Others charge for everything. Ask your sales rep what\u2019s included before your appointment.",
  },
  {
    name: "Lighting",
    description:
      "Recessed lighting, pendant fixtures, under-cabinet lighting, and electrical upgrades like additional outlets or pre-wiring for ceiling fans. Electrical work is structural. Adding recessed lights or moving outlets after the drywall is up is a much bigger project than doing it during construction.",
  },
];

/* ─── Helpers ─── */

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

/* ─── Page ─── */

export default function NewConstructionUpgradesPage() {
  return (
    <div className="min-h-screen bg-white">
      <RevealObserver />
      <LearnPageTracker />
      <SiteNav />

      {/* ─── 1. Hero ─── */}
      <section className="px-6 pt-14 pb-16 md:pt-18 md:pb-20 lg:pt-20 lg:pb-24 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p
            data-reveal
            style={revealStyle(60)}
            className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-6"
          >
            Buyer&apos;s Guide
          </p>
          <h1
            data-reveal
            style={revealStyle(100)}
            className="text-[2.8rem] md:text-[3.6rem] lg:text-[4.4rem] leading-[0.95] text-slate-900 tracking-[-0.02em] mb-8"
          >
            The Complete Guide to
            <br />
            New Construction&nbsp;Upgrades
          </h1>
          <p
            data-reveal
            style={revealStyle(160)}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-6"
          >
            You just signed a contract on a new home. Now comes the fun part:
            choosing the finishes that make it yours. This is what we wish
            someone had told us before our first design
            center&nbsp;appointment.
          </p>
          <p
            data-reveal
            style={revealStyle(200)}
            className="text-xs uppercase tracking-[0.16em] text-slate-400"
          >
            March 2026 &middot; Finch
          </p>
        </div>
      </section>

      {/* ─── 2. Stat Bar ─── */}
      <Section gray>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { stat: "$104K\u2013$236K", label: "Upgrade revenue per home" },
            { stat: "8\u201325%", label: "Share of total home price" },
            {
              stat: "8+",
              label: "Upgrade categories at most builders",
            },
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
      </Section>

      {/* ─── 3. Upgrade Categories ─── */}
      <Section>
        <h2
          data-reveal
          style={revealStyle(20)}
          className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-6"
        >
          New Home Upgrade&nbsp;Categories
        </h2>
        <p
          data-reveal
          style={revealStyle(60)}
          className="text-lg md:text-xl text-slate-600 text-center max-w-3xl mx-auto mb-14"
        >
          Most builders organize their upgrades into eight or more categories.
          You&apos;ll make selections in each one during your design center
          appointment.
        </p>
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-10 max-w-4xl mx-auto">
          {upgradeCategories.map((cat, i) => (
            <div key={cat.name} data-reveal style={revealStyle(90 + i * 50)}>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {cat.name}
              </h3>
              <p className="text-base text-slate-600 leading-relaxed">
                {cat.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ─── 4. Structural vs. Cosmetic ─── */}
      <Section gray>
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            The One Rule That
            <br />
            Saves You&nbsp;Money
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              Every upgrade falls into one of two buckets: structural or
              cosmetic. The difference matters more than most people
              realize when they&apos;re deciding where to&nbsp;spend.
            </p>
            <p>
              <strong className="text-slate-900">Structural upgrades</strong>{" "}
              happen while the house is being built. Electrical work (extra
              outlets, pre-wiring for ceiling fans, recessed lighting), plumbing
              (rough-in for a future bathroom, tankless water heater), and
              framing changes (vaulted ceilings, additional windows). Once the
              walls are closed up, these become major renovation projects. If you
              think you might want them, now is the&nbsp;time.
            </p>
            <p>
              <strong className="text-slate-900">Cosmetic upgrades</strong> are
              the finishes: paint, countertops, flooring, cabinets, hardware. You
              can technically change these after you move in. But doing it later
              typically costs 2-3x more because you&apos;re paying retail
              pricing, labor, and demolition of whatever&apos;s already&nbsp;there.
            </p>
          </div>

          {/* Callout */}
          <div
            data-reveal
            style={revealStyle(160)}
            className="border-l-2 border-slate-300 bg-white p-6 md:p-8 mt-10"
          >
            <p className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">
              The practical approach
            </p>
            <p className="text-base text-slate-600 leading-relaxed">
              Start with structural upgrades you can&apos;t redo. Then prioritize
              cosmetic upgrades that would be expensive or disruptive to change
              later (flooring, countertops, cabinets). Save the things that are
              easy and cheap to swap anytime (paint, hardware, light fixtures)
              for&nbsp;last.
            </p>
          </div>
        </div>
      </Section>

      {/* ─── 5. Which Upgrades Add Value ─── */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            What Builders Know About
            <br />
            Upgrade&nbsp;Revenue
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              Public home builders report their upgrade numbers in SEC filings,
              and the numbers are worth knowing. Toll Brothers earns about
              $203,000 per home in options and upgrades, which is 20.8% of their
              average selling price. PulteGroup earns around $104,000 per home
              (15.1% of ASP). Across 14 public builders, upgrades represent
              somewhere between 8% and 25% of the total home&nbsp;price.
            </p>
            <p>
              The categories that consistently drive the most upgrade revenue are
              kitchen (cabinets and countertops), flooring, and bathroom
              fixtures. That tracks with what most buyers experience at the
              design center: those are the selections where the price difference
              between standard and upgraded is the&nbsp;largest.
            </p>
            <p>
              The upgrades that cost the most are usually the ones that add the
              most value to the home, because they&apos;re the ones future
              buyers notice too. A nice kitchen sells a house. Fresh paint
              is&nbsp;expected.
            </p>
          </div>

          <div
            data-reveal
            style={revealStyle(160)}
            className="mt-8 text-center"
          >
            <TrackedLink
              href="/research/hidden-revenue-line"
              event="cta_clicked"
              properties={{
                cta: "Read the full analysis",
                location: "learn-upgrades-value",
              }}
              className="inline-block text-sm font-semibold text-slate-900 border-b border-slate-300 hover:border-slate-900 transition-colors pb-0.5"
            >
              Read our full SEC filing analysis &rarr;
            </TrackedLink>
          </div>
        </div>
      </Section>

      {/* ─── 6. Design Center Appointment ─── */}
      <Section gray>
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            What to Know Before Your
            <br />
            Design Center&nbsp;Appointment
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              The design center is where you choose all the finishes for your
              new home. Most people walk in not knowing what to&nbsp;expect.
            </p>
          </div>

          <div className="mt-10 space-y-8">
            {[
              {
                title: "Plan for 2\u20134 hours",
                body: "Some builders schedule multiple visits. You\u2019re making decisions across eight or more categories, so it takes a while. Don\u2019t rush it, and don\u2019t schedule anything immediately after.",
              },
              {
                title: "You\u2019ll work with a design consultant",
                body: "They walk you through each category, show you samples, and explain the options. They do this every day and they\u2019re a great resource. Ask questions.",
              },
              {
                title: "Everything starts at \u201Cincluded\u201D",
                body: "Most builders have a base level for each category that\u2019s included in the price of your home. Upgrades are priced as the difference between the base option and what you choose. A $4,000 countertop upgrade means the upgraded countertop costs $4,000 more than what\u2019s already included.",
              },
              {
                title: "The running total adds up fast",
                body: "You\u2019ll see your upgrade total grow as you make selections. Expect to be surprised by how quickly it climbs. Going in with a budget range for upgrades (not just \u201Cwe\u2019ll see how it goes\u201D) helps you make tradeoffs without feeling overwhelmed.",
              },
              {
                title: "Take photos of everything",
                body: "You\u2019ll look at dozens of samples across multiple categories. It\u2019s hard to remember exactly which granite slab or cabinet door style you liked when you\u2019re comparing eight options. Take a photo of every sample you\u2019re considering.",
              },
              {
                title:
                  "Preview your selections before you go",
                body: "Some builders use tools like Finch to let you pick finishes and see them in your actual rooms before your appointment. You can try it right now to see how it works. Walking in with a starting point saves a lot of time.",
              },
            ].map((tip, i) => (
              <div key={tip.title} data-reveal style={revealStyle(120 + i * 50)}>
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  {tip.title}
                </h3>
                <p className="text-base text-slate-600 leading-relaxed">
                  {tip.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── 7. Demo CTA ─── */}
      <Section>
        <div
          data-reveal
          style={revealStyle(20)}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-6">
            See What Your Selections
            <br />
            Actually Look&nbsp;Like
          </h2>
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            The hardest part about choosing upgrades from samples is picturing
            how everything works together. Does that quartz countertop look right
            with white shaker cabinets and dark hardwood floors? It&apos;s tough
            to tell from a 4-inch sample and a cabinet door on a&nbsp;wall.
          </p>
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            Finch lets you pick your selections and see them in a real room,
            together, before you commit. No guessing. No hoping it all
            works&nbsp;out.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <TrackedLink
              href="/try"
              event="cta_clicked"
              properties={{
                cta: "Try It Live",
                location: "learn-upgrades-demo",
              }}
              className="w-full sm:w-auto text-center px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              Try It Live
            </TrackedLink>
            <TrackedLink
              href="/demo"
              event="cta_clicked"
              properties={{
                cta: "See the Full Demo",
                location: "learn-upgrades-demo",
              }}
              className="w-full sm:w-auto text-center px-8 py-3.5 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-900 hover:text-slate-900 transition-colors"
            >
              See the Full Demo
            </TrackedLink>
          </div>
        </div>
      </Section>

      {/* ─── 8. Final CTA ─── */}
      <section className="px-6 py-20 md:py-28 bg-white border-t border-slate-100">
        <div
          data-reveal
          style={revealStyle(20)}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-5">
            What If You Could See Your
            <br />
            Upgrades Before You&nbsp;Buy?
          </h2>
          <p className="text-lg text-slate-600 mb-4 max-w-2xl mx-auto text-balance">
            Finch lets you pick finishes and see exactly what your kitchen,
            bathroom, or living room will look like before your design center
            appointment. If your builder doesn&apos;t offer it yet, tell them
            you want&nbsp;it.
          </p>
          <p className="text-sm text-slate-500 mb-10 max-w-2xl mx-auto">
            Are you a builder? See how Finch works with your floor plans and
            your options&nbsp;catalog.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <TrackedLink
              href="/try"
              event="cta_clicked"
              properties={{
                cta: "Try It Live",
                location: "learn-upgrades-footer",
              }}
              className="inline-block px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              Try It Live
            </TrackedLink>
            <TrackedLink
              href="/#get-started"
              event="cta_clicked"
              properties={{
                cta: "Get Started",
                location: "learn-upgrades-footer",
              }}
              className="inline-block px-8 py-3.5 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-900 hover:text-slate-900 transition-colors"
            >
              Get Started
            </TrackedLink>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Questions? hello@withfin.ch
          </p>
        </div>
      </section>

      <SiteFooter />

      {/* ─── JSON-LD ─── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline:
              "The Complete Guide to New Construction Upgrades",
            description:
              "Cabinets, countertops, flooring, paint, and more. What each upgrade category looks like, which ones are worth the money, and how to prepare for your design center appointment.",
            datePublished: "2026-03-22",
            dateModified: "2026-03-22",
            author: {
              "@type": "Organization",
              name: "Finch",
              url: "https://withfin.ch",
            },
            publisher: {
              "@type": "Organization",
              name: "Finch",
              url: "https://withfin.ch",
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id":
                "https://withfin.ch/learn/new-construction-upgrades",
            },
          }),
        }}
      />
    </div>
  );
}
