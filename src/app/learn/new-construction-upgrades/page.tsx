import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
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

/* Thin line icons for each upgrade category (24x24, stroke-only) */
function CabinetsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="12" y2="12" />
      <circle cx="9" cy="7.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="9" cy="16.5" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function CountertopsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 10h20v2H2z" />
      <path d="M4 12v8" />
      <path d="M20 12v8" />
      <path d="M4 10V8a2 2 0 012-2h12a2 2 0 012 2v2" />
    </svg>
  );
}
function FlooringIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="2" y1="16" x2="22" y2="16" />
      <line x1="8" y1="4" x2="8" y2="10" />
      <line x1="16" y1="4" x2="16" y2="10" />
      <line x1="12" y1="10" x2="12" y2="16" />
      <line x1="6" y1="16" x2="6" y2="20" />
      <line x1="18" y1="16" x2="18" y2="20" />
    </svg>
  );
}
function PaintIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="10" rx="1" />
      <path d="M12 13v4" />
      <path d="M10 17h4v3H10z" />
    </svg>
  );
}
function BacksplashIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="9" />
      <line x1="15" y1="3" x2="15" y2="9" />
      <line x1="12" y1="9" x2="12" y2="15" />
      <line x1="6" y1="15" x2="6" y2="21" />
      <line x1="15" y1="15" x2="15" y2="21" />
    </svg>
  );
}
function HardwareIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v6" />
      <path d="M8 8h8" />
      <path d="M10 8c0 4-2 6-2 10h8c0-4-2-6-2-10" />
      <ellipse cx="12" cy="20" rx="4" ry="1.5" />
    </svg>
  );
}
function AppliancesIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <line x1="4" y1="7" x2="20" y2="7" />
      <circle cx="8" cy="4.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="12" cy="4.5" r="0.75" fill="currentColor" stroke="none" />
      <rect x="7" y="10" width="10" height="9" rx="0.5" />
    </svg>
  );
}
function LightingIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 2v1" />
      <path d="M12 7a4 4 0 014 4c0 1.5-.8 2.8-2 3.5V18h-4v-3.5A4 4 0 0112 7z" />
      <path d="M4.2 10H3" />
      <path d="M21 10h-1.2" />
      <path d="M6.3 4.7l.9.9" />
      <path d="M16.8 5.6l.9-.9" />
    </svg>
  );
}

const upgradeCategories = [
  {
    name: "Cabinets",
    icon: <CabinetsIcon />,
    description:
      "Kitchen and bathroom cabinets are usually the biggest visual change you can make to a room. Standard cabinets get the job done, but upgraded options (soft-close drawers, dovetail joints, different wood species) make a kitchen look like a completely different house. If you\u2019re going to spend in one place, this is a good one.",
  },
  {
    name: "Countertops",
    icon: <CountertopsIcon />,
    description:
      "Granite, quartz, marble, or laminate. Countertops are the second-biggest visual impact after cabinets, and the two need to work together. You\u2019ll pick a surface material and a color or pattern. Take your time here because you\u2019ll look at your countertops every single day.",
  },
  {
    name: "Flooring",
    icon: <FlooringIcon />,
    description:
      "Hardwood, luxury vinyl plank (LVP), tile, and carpet. Most builders split this into \u201Cmain area flooring\u201D for your kitchen, living room, and hallways, and separate carpet selections for bedrooms. You walk on it every day and you\u2019ll notice it every day, and it\u2019s one of the more expensive upgrades to change after you move in.",
  },
  {
    name: "Paint",
    icon: <PaintIcon />,
    description:
      "Wall colors, accent walls, and trim color. Most builders include a base paint package and charge for upgrades beyond their standard palette. Paint is one of the easiest things to change later, so don\u2019t stress about this one too much. That said, getting it right from the start saves you a weekend with a roller.",
  },
  {
    name: "Backsplash",
    icon: <BacksplashIcon />,
    description:
      "Kitchen backsplash (and sometimes bathroom). You\u2019ll choose from tile patterns, subway tile, mosaics, and other options. This is often a smart upgrade because adding a backsplash after closing means working around cabinets and countertops that are already installed. Getting it done during construction is cleaner and cheaper.",
  },
  {
    name: "Hardware & Fixtures",
    icon: <HardwareIcon />,
    description:
      "Cabinet pulls, faucets, showerheads, towel bars. Cheap to upgrade, and you\u2019ll notice it every time you open a cabinet or wash your hands. Swapping builder-grade chrome for brushed nickel or matte black hardware costs a few hundred dollars and makes the whole kitchen look more intentional.",
  },
  {
    name: "Appliances",
    icon: <AppliancesIcon />,
    description:
      "Range, refrigerator, dishwasher, microwave. You\u2019ll decide between options like slide-in vs. freestanding ranges, or built-in vs. standard refrigerators. Some builders include base appliances in the price of the home. Others charge for everything. Ask your sales rep what\u2019s included before your appointment.",
  },
  {
    name: "Lighting",
    icon: <LightingIcon />,
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
          className="text-lg md:text-xl text-slate-600 text-center max-w-3xl mx-auto mb-10"
        >
          Most builders organize their upgrades into eight or more categories.
          You&apos;ll make selections in each one during your design center
          appointment.
        </p>

        {/* Room photo — sets the stage before the category grid */}
        <div
          data-reveal
          style={revealStyle(80)}
          className="relative mb-14 -mx-6 md:mx-0 aspect-[21/9] overflow-hidden border-t border-b md:border border-slate-200"
        >
          <Image
            src="/learn/kitchen-greatroom.webp"
            alt="Open-concept kitchen and living room with upgraded cabinets, countertops, flooring, and lighting"
            fill
            className="object-cover"
            sizes="(max-width: 1152px) 100vw, 1152px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
            <p className="text-white text-sm md:text-base font-medium mb-1">
              Kitchen and living room
            </p>
            <p className="text-white/70 text-xs md:text-sm max-w-lg">
              Cabinets, countertops, flooring, backsplash, hardware, and
              lighting — six categories working together in one room.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-x-12 gap-y-10 max-w-4xl mx-auto">
          {upgradeCategories.map((cat, i) => (
            <div key={cat.name} data-reveal style={revealStyle(120 + i * 50)}>
              <div className="text-slate-400 mb-3">{cat.icon}</div>
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

        </div>

        {/* Bathroom photo — illustrates interconnected cosmetic choices */}
        <div
          data-reveal
          style={revealStyle(130)}
          className="grid md:grid-cols-[3fr_2fr] gap-6 md:gap-10 items-stretch mt-10"
        >
          <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden border border-slate-200">
            <Image
              src="/learn/bathroom-vanity.webp"
              alt="Primary bathroom vanity with upgraded countertop, faucets, and tile"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 60vw"
            />
          </div>
          <div className="border-l-2 border-slate-300 bg-white p-6 md:p-8 flex flex-col justify-center">
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
            <p className="text-xs text-slate-400 mt-4">
              Vanity, countertop, faucet, hardware — four cosmetic decisions
              in one bathroom. Changing any of them after closing means
              ripping out what&apos;s already installed.
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

          {/* "Preview your selections" tip — photo card */}
          <div
            data-reveal
            style={revealStyle(370)}
            className="mt-10 border border-slate-200 bg-white overflow-hidden"
          >
            <div className="relative aspect-[3/2] overflow-hidden">
              <Image
                src="/learn/kitchen-detail.webp"
                alt="Kitchen close-up showing cabinet door, countertop edge, and backsplash tile"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
              />
            </div>
            <div className="p-6 md:p-8">
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                Preview your selections before you go
              </h3>
              <p className="text-base text-slate-600 leading-relaxed">
                Where cabinet meets countertop meets backsplash — this is the
                junction you&apos;re trying to picture from a 4-inch sample.
                Some builders offer visualization tools that let you preview
                selections in your actual rooms before your appointment. Ask
                yours. Walking in with a starting point saves a lot of time.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── 7. Closing CTA ─── */}
      <section className="bg-slate-800">
        <div
          data-reveal
          style={revealStyle(20)}
          className="max-w-6xl mx-auto grid md:grid-cols-2"
        >
          {/* Photo */}
          <div className="relative aspect-[3/2] md:aspect-auto overflow-hidden">
            <Image
              src="/learn/living-room-wide.webp"
              alt="Living room with upgraded hardwood flooring, stone fireplace, and recessed lighting"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          {/* CTA content */}
          <div className="px-8 py-14 md:px-12 md:py-20 flex flex-col justify-center">
            <h2 className="text-3xl md:text-4xl leading-[0.98] tracking-[-0.02em] text-white mb-6">
              What If You Could See Your
              <br />
              Upgrades Before You&nbsp;Buy?
            </h2>
            <p className="text-base md:text-lg text-white/70 leading-relaxed mb-8">
              Pick finishes, see them in a real room together, and walk into
              your design center appointment with a starting&nbsp;point.
            </p>
            <div>
              <TrackedLink
                href="/try"
                event="cta_clicked"
                properties={{
                  cta: "Try It Yourself",
                  location: "learn-upgrades-closing",
                }}
                className="inline-block px-8 py-3.5 bg-white text-slate-900 text-sm font-semibold uppercase tracking-wider hover:bg-slate-100 transition-colors"
              >
                Try It Yourself
              </TrackedLink>
            </div>
            <p className="text-sm text-white/40 mt-8">
              Are you a builder?{" "}
              <TrackedLink
                href="/#get-started"
                event="cta_clicked"
                properties={{
                  cta: "See how Finch works",
                  location: "learn-upgrades-closing-builder",
                }}
                className="text-white/60 border-b border-white/30 hover:border-white/60 transition-colors pb-px"
              >
                See how Finch works with your catalog
              </TrackedLink>
            </p>
          </div>
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
