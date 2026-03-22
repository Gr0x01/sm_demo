import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { RevealObserver, TrackedLink } from "@/app/landing-client";
import { PultePageTracker } from "./pulte-client";

export const metadata: Metadata = {
  title: {
    absolute:
      "Pulte Homes Design Center: What to Expect at Your Appointment",
  },
  description:
    "Going to the Pulte Home Expressions Studio? Here's what the appointment is like, what categories you'll choose from, how to prepare, and what to bring.",
  alternates: {
    canonical: "https://withfin.ch/learn/design-center/pulte",
  },
  openGraph: {
    title: "Pulte Homes Design Center: What to Expect at Your Appointment",
    description:
      "Going to the Pulte Home Expressions Studio? Here's what the appointment is like, what categories you'll choose from, how to prepare, and what to bring.",
    url: "https://withfin.ch/learn/design-center/pulte",
    siteName: "Finch",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pulte Homes Design Center: What to Expect",
    description:
      "What happens at the Pulte Homes design center appointment, what categories you'll pick from, and how to prepare.",
  },
};

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

/* ─── Icons (thin line, 28x28, stroke-only) ─── */

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
      <rect x="4" y="3" width="16" height="10" />
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
      <rect x="4" y="2" width="16" height="20" />
      <line x1="4" y1="7" x2="20" y2="7" />
      <circle cx="8" cy="4.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="12" cy="4.5" r="0.75" fill="currentColor" stroke="none" />
      <rect x="7" y="10" width="10" height="9" />
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
function SinkIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16" />
      <path d="M4 12v4a4 4 0 004 4h8a4 4 0 004-4v-4" />
      <path d="M12 4v4" />
      <path d="M10 4h4" />
      <path d="M12 12v2" />
    </svg>
  );
}
function DoorIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M2 22h20" />
    </svg>
  );
}
function StaircaseIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4v-4h4v-4h4v-4h4" />
      <path d="M4 20V4" />
    </svg>
  );
}
function ElectricalIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}
function MirrorIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" />
      <rect x="7" y="5" width="10" height="14" />
      <line x1="12" y1="19" x2="12" y2="21" />
    </svg>
  );
}
function FireplaceIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" />
      <rect x="2" y="2" width="20" height="2" />
      <path d="M8 20v-6a4 4 0 018 0v6" />
      <path d="M12 20v-3c0-1 .5-1.5 1-2s-1-2-1-3" />
    </svg>
  );
}
function BathroomIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16v2a4 4 0 01-4 4H8a4 4 0 01-4-4v-2z" />
      <path d="M4 12V6a2 2 0 012-2h1" />
      <path d="M18 18v2" />
      <path d="M6 18v2" />
    </svg>
  );
}

/* ─── Data ─── */

const selectionCategories = [
  {
    name: "Cabinetry",
    icon: <CabinetsIcon />,
    description:
      "Kitchen and bathroom cabinets in a range of door styles, paint colors, and stain finishes. Pulte typically offers soft-close hinges and interior accessories like pull-out trays and lazy Susans as upgrades. Cabinets set the tone for the whole kitchen, so this is worth taking your time on.",
  },
  {
    name: "Countertops",
    icon: <CountertopsIcon />,
    description:
      "Granite, quartz, and other surface materials for kitchen and bathroom counters. You'll pick a material, a color or pattern, and an edge profile. Countertops and cabinets need to work together, so you'll usually choose these side by side at the studio.",
  },
  {
    name: "Kitchen Backsplash",
    icon: <BacksplashIcon />,
    description:
      "Tile, stone, and mosaic options for the area between your countertops and upper cabinets. Adding a backsplash during construction is cleaner and cheaper than retrofitting one after your cabinets and countertops are already installed.",
  },
  {
    name: "Flooring",
    icon: <FlooringIcon />,
    description:
      "Tile, hardwood, luxury vinyl plank, and carpet. You'll make separate selections for different areas of the house. Flooring is one of the more expensive categories and one of the most disruptive to change after you move in.",
  },
  {
    name: "Interior Paint",
    icon: <PaintIcon />,
    description:
      "Pulte usually offers a neutral base package that's included, plus two-tone color options as an upgrade. Paint is one of the easiest things to change later, so don't stress too much here. But getting it right from the start saves you a weekend with a roller.",
  },
  {
    name: "Sinks",
    icon: <SinkIcon />,
    description:
      "Undermount styles in different finishes, depths, and shapes for kitchen and bathrooms. This one is easy to overlook, but you'll use your kitchen sink more than almost any other surface in the house.",
  },
  {
    name: "Plumbing Fixtures",
    icon: <HardwareIcon />,
    description:
      "Faucets, showerheads, towel bars, and coordinating hardware in finishes like brushed nickel, matte black, or polished chrome. Pulte also offers a tankless water heater upgrade in some markets.",
  },
  {
    name: "Bathroom Tile & Surrounds",
    icon: <BathroomIcon />,
    description:
      "Tile combinations for shower surrounds, bathroom floors, and tub decks. These selections work together with your cabinet and countertop choices to set the look for each bathroom.",
  },
  {
    name: "Light Fixtures",
    icon: <LightingIcon />,
    description:
      "Fixture packages in different styles and finishes, recessed can lights, pendants, and ceiling fans. You'll also choose from options for under-cabinet lighting in the kitchen. Electrical work is structural, so adding can lights or fan boxes later means opening up the ceiling.",
  },
  {
    name: "Door Hardware",
    icon: <DoorIcon />,
    description:
      "Handles and locksets for interior and exterior doors in transitional and contemporary styles. A small upgrade that changes the feel of every room you walk into.",
  },
  {
    name: "Doors & Woodwork",
    icon: <StaircaseIcon />,
    description:
      "Interior door styles, exterior door upgrades, staircase details (newel posts, balusters, stain colors), and trim work like baseboards and crown molding.",
  },
  {
    name: "Framed Mirrors",
    icon: <MirrorIcon />,
    description:
      "Framed mirror upgrades for select bathrooms, replacing the standard unframed builder mirror. A small change that makes a bathroom look more finished.",
  },
  {
    name: "Fireplace",
    icon: <FireplaceIcon />,
    description:
      "Fireplace surrounds, mantles, and design styles. In many Pulte communities, the fireplace selection is made at contract rather than at the design studio. Check with your sales counselor.",
  },
  {
    name: "Electrical",
    icon: <ElectricalIcon />,
    description:
      "Additional outlets, specialty outlets, and exterior lighting. Some communities also have a separate low-voltage appointment for entertainment wiring, security systems, and cameras.",
  },
  {
    name: "Appliances",
    icon: <AppliancesIcon />,
    description:
      "Range, refrigerator, dishwasher, and microwave options. What's included in the base price varies by community, so ask your sales counselor before your appointment.",
  },
];

const prepTips = [
  {
    title: "Walk the models first",
    body: "Visit the model homes in your community before your studio appointment. Take note of finishes you like and don't like. The models are designed to show upgraded options, so they're a good reference point for what's available.",
  },
  {
    title: "Set a budget range for upgrades",
    body: "Not a vague \"we'll see how it goes\" but an actual number. A common starting point is around 10% of your base price, but this varies a lot depending on the community and what's already included. Having a ceiling in mind makes it easier to make tradeoffs during the appointment.",
  },
  {
    title: "Know what's hard to change later",
    body: "Electrical work, plumbing rough-ins, flooring, and cabinets are all expensive or disruptive to change after you move in. Paint, hardware, and light fixtures are easy to swap anytime. Prioritize the structural and hard-to-redo categories first.",
  },
  {
    title: "Bring inspiration photos",
    body: "Screenshots from Pinterest, Houzz, or Instagram give your design consultant a starting point for your taste. You don't need a mood board. A few photos of kitchens or bathrooms you like is plenty.",
  },
  {
    title: "Leave the kids at home",
    body: "Pulte's Home Expressions Studios have heavy samples on shelves and large display boards. Most studios ask that only the buyers attend. It's not a great environment for kids, and you'll want to focus.",
  },
  {
    title: "Take photos of everything you pick",
    body: "Front and back of samples, the label with the name and level, the manufacturer info. You'll look at dozens of options across 15+ categories, and they blur together fast. Photos are your insurance.",
  },
  {
    title: "Selections are final",
    body: "After your final design studio appointment, your selections are locked in. Some changes may be possible early in construction, but don't count on it. Take your time during the appointment and make sure you're comfortable with every choice.",
  },
];

/* ─── Page ─── */

export default function PulteDesignCenterPage() {
  return (
    <div className="min-h-screen bg-white">
      <RevealObserver />
      <PultePageTracker />
      <SiteNav />

      {/* ─── 1. Hero ─── */}
      <section className="px-6 pt-14 pb-16 md:pt-18 md:pb-20 lg:pt-20 lg:pb-24 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p
            data-reveal
            style={revealStyle(60)}
            className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-6"
          >
            Design Center Guide
          </p>
          <h1
            data-reveal
            style={revealStyle(100)}
            className="text-[2.8rem] md:text-[3.6rem] lg:text-[4.4rem] leading-[0.95] text-slate-900 tracking-[-0.02em] mb-8"
          >
            The Pulte Homes Design Center:
            <br />
            What to&nbsp;Expect
          </h1>
          <p
            data-reveal
            style={revealStyle(160)}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-6"
          >
            You signed the contract. Now comes the fun part: choosing every
            finish at the Pulte Homes design center. Pulte calls it the
            Home Expressions Studio, and you&apos;ll spend a few hours there
            making decisions you&apos;ll live with for years.
            Here&apos;s what to&nbsp;expect.
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

      {/* ─── 2. What the Appointment Is Like ─── */}
      <Section gray id="appointment">
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            What the Appointment
            <br />
            Is&nbsp;Like
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              <strong className="font-semibold text-slate-900">One studio, three brands.</strong>{" "}
              PulteGroup operates design studios across the country for Pulte
              Homes, Del Webb, and Centex buyers. Some markets call it the
              Home Expressions Studio. Others just call it the design
              center. Either way, it&apos;s the same idea: a showroom full of
              actual samples where you choose every finish for your new home.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Plan for 2 to 4 hours.</strong>{" "}
              Your appointment is typically scheduled a few weeks after you sign
              your purchase agreement.
              Don&apos;t schedule anything right after. Feeling rushed in the
              last hour leads to decisions you&apos;ll second-guess later.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">You&apos;ll have a design consultant.</strong>{" "}
              They walk you through
              every category, show you physical samples, and help you see how
              your selections work together. They do this every day and they
              know the product line well. Ask them questions, especially about
              which upgrades they see buyers regret skipping.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Everything starts at &quot;included.&quot;</strong>{" "}
              Each category has a
              base option that&apos;s already in the price of your home.
              Upgrades are priced as the difference, so a $3,500 countertop
              upgrade means the one you picked costs $3,500 more than what
              was already included. You&apos;ll see a running total that grows
              as you make selections, and it adds up faster than most people
              expect.
            </p>
          </div>
        </div>
      </Section>

      {/* ─── 3. Selection Categories ─── */}
      <Section id="categories">
        <h2
          data-reveal
          style={revealStyle(20)}
          className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-6"
        >
          What You&apos;ll Choose&nbsp;From
        </h2>
        <p
          data-reveal
          style={revealStyle(60)}
          className="text-lg md:text-xl text-slate-600 text-center max-w-3xl mx-auto mb-10"
        >
          Pulte organizes selections into about 15 categories. The exact list
          varies by community, but here&apos;s what most buyers walk through
          at the studio.
        </p>

        {/* Room photo */}
        <div
          data-reveal
          style={revealStyle(80)}
          className="relative mb-14 -mx-6 md:mx-0 aspect-[21/9] overflow-hidden border-t border-b md:border border-slate-200"
        >
          <Image
            src="/learn/kitchen-greatroom.webp"
            alt="Open-concept kitchen and living room showing cabinetry, countertops, flooring, backsplash, and lighting selections"
            fill
            className="object-cover"
            sizes="(max-width: 1152px) 100vw, 1152px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
            <p className="text-white text-sm md:text-base font-medium mb-1">
              Kitchen and living area
            </p>
            <p className="text-white/70 text-xs md:text-sm max-w-lg">
              Cabinetry, countertops, backsplash, flooring, hardware, lighting,
              and appliances all come together in one room.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10 max-w-5xl mx-auto">
          {selectionCategories.map((cat, i) => (
            <div key={cat.name} data-reveal style={revealStyle(120 + i * 40)}>
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

      {/* ─── 4. How to Prepare ─── */}
      <Section gray id="prepare">
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            How to Prepare for
            <br />
            Your&nbsp;Appointment
          </h2>
          <p
            data-reveal
            style={revealStyle(60)}
            className="text-lg md:text-xl text-slate-600 text-center max-w-2xl mx-auto mb-10"
          >
            A little prep goes a long way. People who walk in with a plan
            spend less time agonizing and more time getting excited about
            their home.
          </p>

          <div className="space-y-8">
            {prepTips.map((tip, i) => (
              <div key={tip.title} data-reveal style={revealStyle(100 + i * 50)}>
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

      {/* ─── 5. Structural vs. Cosmetic ─── */}
      <Section id="priorities">
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            Where to Spend and
            <br />
            Where to&nbsp;Save
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              Not all upgrades are created equal. Some are expensive to
              change after you move in. Others you can swap in a weekend.
              Knowing the difference will save you money.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Do it now:</strong>{" "}
              Electrical work (can lights, fan boxes, extra outlets), plumbing
              rough-ins, flooring, cabinets, and countertops. These are either
              structural (behind walls) or disruptive to replace once
              you&apos;re living there. If you&apos;re going to upgrade
              anything, start with these.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Can wait:</strong>{" "}
              Paint, bathroom mirrors, door hardware, and basic light
              fixtures. These are all relatively easy and inexpensive to change
              later. If you need to trim your upgrade budget, these are the
              categories to pull back on.
            </p>
            <p>
              The kitchen drives most of the upgrade spend for a reason:
              cabinets, countertops, backsplash, and appliances all live in one
              room, and they all need to work together. Most buyers allocate
              about half their upgrade budget to the kitchen and split the
              rest between bathrooms and everything else. For a deeper look
              at each category and what&apos;s worth the money, see our{" "}
              <TrackedLink
                href="/learn/new-construction-upgrades"
                event="cta_clicked"
                properties={{
                  cta: "complete upgrade guide",
                  location: "design-center-pulte-crosslink",
                }}
                className="text-slate-900 font-medium border-b border-slate-300 hover:border-slate-900 transition-colors pb-px"
              >
                complete guide to new construction upgrades
              </TrackedLink>
              .
            </p>
          </div>
        </div>

        {/* Detail photo */}
        <div
          data-reveal
          style={revealStyle(130)}
          className="grid md:grid-cols-[3fr_2fr] gap-6 md:gap-10 items-stretch mt-10"
        >
          <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden border border-slate-200">
            <Image
              src="/learn/kitchen-detail.webp"
              alt="Close-up of kitchen cabinet door meeting countertop edge and backsplash tile"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 60vw"
            />
          </div>
          <div className="border-l-2 border-slate-300 bg-slate-50 p-6 md:p-8 flex flex-col justify-center">
            <p className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">
              The junction that matters
            </p>
            <p className="text-base text-slate-600 leading-relaxed">
              Where cabinet meets countertop meets backsplash. This is
              the combination you&apos;re trying to picture from three
              separate 4-inch samples on a shelf. Getting these right together
              is more important than getting any one of them right
              individually. That&apos;s exactly what Finch does: you pick
              finishes and it generates a photo of the room with those
              selections applied. You can{" "}
              <TrackedLink
                href="/try"
                event="cta_clicked"
                properties={{
                  cta: "try a demo with sample finishes",
                  location: "design-center-pulte-inline",
                }}
                className="text-slate-900 font-medium border-b border-slate-300 hover:border-slate-900 transition-colors pb-px"
              >
                try a demo with sample finishes
              </TrackedLink>{" "}
              to see how it works.
            </p>
          </div>
        </div>
      </Section>

      {/* ─── 6. Demo CTA ─── */}
      <section className="bg-[var(--color-dark)]">
        <div
          data-reveal
          style={revealStyle(20)}
          className="max-w-6xl mx-auto grid md:grid-cols-2"
        >
          {/* Photo */}
          <div className="relative aspect-[3/2] md:aspect-auto overflow-hidden">
            <Image
              src="/learn/living-room-wide.webp"
              alt="Living room with upgraded hardwood flooring and recessed lighting"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          {/* CTA content */}
          <div className="px-8 py-14 md:px-12 md:py-20 flex flex-col justify-center">
            <h2 className="text-3xl md:text-4xl leading-[0.98] tracking-[-0.02em] text-white mb-6">
              See What Your Upgrades
              <br />
              Could Look&nbsp;Like
            </h2>
            <p className="text-base md:text-lg text-white/70 leading-relaxed mb-4">
              The hardest part of the design center is picturing how
              everything looks together. You&apos;re choosing from small
              samples and trying to imagine them in a full room.
            </p>
            <p className="text-base md:text-lg text-white/70 leading-relaxed mb-8">
              Finch solves that. You pick finishes from real swatches and it
              generates a photo of the room with your selections applied. The
              demo below uses sample finishes, not Pulte&apos;s actual
              catalog, but it shows you what the experience looks like.
              Imagine doing this with your real floorplan and the actual
              options from the&nbsp;studio.
            </p>
            <div>
              <TrackedLink
                href="/try"
                event="cta_clicked"
                properties={{
                  cta: "Try It Yourself",
                  location: "design-center-pulte-closing",
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
                  location: "design-center-pulte-closing-builder",
                }}
                className="text-white/60 border-b border-white/30 hover:border-white/60 transition-colors pb-px"
              >
                See how Finch works with your catalog
              </TrackedLink>
            </p>
          </div>
        </div>
      </section>

      {/* ─── 7. Closing Note ─── */}
      <Section>
        <div className="max-w-3xl mx-auto text-center">
          <p
            data-reveal
            style={revealStyle(60)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed"
          >
            The design center is the best part of building a new home. You
            get to choose everything, and when it&apos;s done right,
            you walk into a house that feels like yours from day one.
            The trick is going in prepared, knowing where to invest, and
            being able to picture how it all comes together. That last part
            is what Finch was built for. You can{" "}
            <TrackedLink
              href="/try"
              event="cta_clicked"
              properties={{
                cta: "try the demo",
                location: "design-center-pulte-closing-note",
              }}
              className="text-slate-900 font-medium border-b border-slate-300 hover:border-slate-900 transition-colors pb-px"
            >
              try the demo
            </TrackedLink>{" "}
            to see what it&apos;s like, and if you want the real thing with
            your builder&apos;s catalog, it&apos;s worth mentioning to your
            sales&nbsp;rep.
          </p>
          <div
            data-reveal
            style={revealStyle(120)}
            className="mt-8"
          >
            <TrackedLink
              href="/learn"
              event="cta_clicked"
              properties={{
                cta: "Browse all guides",
                location: "design-center-pulte-footer",
              }}
              className="inline-block text-sm font-semibold text-slate-900 border-b border-slate-300 hover:border-slate-900 transition-colors pb-0.5"
            >
              Browse all buyer&apos;s guides &rarr;
            </TrackedLink>
          </div>
        </div>
      </Section>

      <SiteFooter />

      {/* ─── JSON-LD ─── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline:
              "Pulte Homes Design Center: What to Expect at Your Appointment",
            description:
              "Going to the Pulte Home Expressions Studio? Here's what the appointment is like, what categories you'll choose from, how to prepare, and what to bring.",
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
              "@id": "https://withfin.ch/learn/design-center/pulte",
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "How long is the Pulte design center appointment?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Plan for 2 to 4 hours, depending on your floor plan and how many options your community offers. Don't schedule anything right after. Feeling rushed in the last hour leads to decisions you'll second-guess later.",
                },
              },
              {
                "@type": "Question",
                name: "What categories do you choose at the Pulte design center?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Pulte organizes selections into about 15 categories: cabinetry, countertops, kitchen backsplash, flooring, interior paint, sinks, plumbing fixtures, bathroom tile and surrounds, light fixtures, door hardware, doors and woodwork, framed mirrors, fireplace, electrical, and appliances. The exact list varies by community.",
                },
              },
              {
                "@type": "Question",
                name: "What should I bring to my Pulte design appointment?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Bring inspiration photos (screenshots from Pinterest, Houzz, or Instagram), a budget range for upgrades, and your phone to photograph every sample you pick. Visit the model homes in your community beforehand to see upgraded finishes in person.",
                },
              },
              {
                "@type": "Question",
                name: "What upgrades are hardest to change after move-in?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Electrical work (can lights, fan boxes, extra outlets), plumbing rough-ins, flooring, cabinets, and countertops are all expensive or disruptive to change after you move in. Paint, bathroom mirrors, door hardware, and basic light fixtures are relatively easy and inexpensive to change later.",
                },
              },
              {
                "@type": "Question",
                name: "What is the Pulte Home Expressions Studio?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "The Home Expressions Studio is Pulte's name for their design center, a showroom where you choose every finish for your new home. PulteGroup operates studios for Pulte Homes, Del Webb, and Centex buyers. You'll work with a design consultant who walks you through each category and shows you physical samples.",
                },
              },
            ],
          }),
        }}
      />
    </div>
  );
}
