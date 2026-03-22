import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { RevealObserver, TrackedLink } from "@/app/landing-client";
import { RyanPageTracker } from "./ryan-client";

export const metadata: Metadata = {
  title: {
    absolute:
      "Ryan Homes Design Center: What to Expect at Your Appointment",
  },
  description:
    "Going to a Ryan Homes design center? Here's what the appointments are like, how interior packages work, what categories you'll choose from, and how to prepare.",
  alternates: {
    canonical: "https://withfin.ch/learn/design-center/ryan",
  },
  openGraph: {
    title: "Ryan Homes Design Center: What to Expect at Your Appointment",
    description:
      "Going to a Ryan Homes design center? Here's what the appointments are like, how interior packages work, what categories you'll choose from, and how to prepare.",
    url: "https://withfin.ch/learn/design-center/ryan",
    siteName: "Finch",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ryan Homes Design Center: What to Expect",
    description:
      "What happens at the Ryan Homes design center, how interior packages work, and how to prepare for your appointments.",
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

function PackageIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}
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
function DoorIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M2 22h20" />
    </svg>
  );
}
function ExteriorIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V10l9-7 9 7v11" />
      <path d="M3 21h18" />
      <rect x="9" y="13" width="6" height="8" />
      <line x1="12" y1="13" x2="12" y2="21" />
    </svg>
  );
}
function BacksplashIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="2" y1="16" x2="22" y2="16" />
      <line x1="7" y1="4" x2="7" y2="10" />
      <line x1="12" y1="4" x2="12" y2="10" />
      <line x1="17" y1="4" x2="17" y2="10" />
      <line x1="9.5" y1="10" x2="9.5" y2="16" />
      <line x1="14.5" y1="10" x2="14.5" y2="16" />
      <line x1="7" y1="16" x2="7" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
      <line x1="17" y1="16" x2="17" y2="20" />
    </svg>
  );
}
function StructuralIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20" />
      <path d="M5 20V8l7-5 7 5v12" />
      <path d="M9 20v-6h6v6" />
      <line x1="9" y1="10" x2="15" y2="10" />
    </svg>
  );
}

/* ─── Data ─── */

const selectionCategories = [
  {
    name: "Interior Package",
    icon: <PackageIcon />,
    description:
      "This is the biggest single decision you\u2019ll make. Ryan Homes bundles cabinets, countertops, flooring, and carpet into coordinated interior packages with names like Morrison, Murray, Decatur, Newton, and Maxwell. You pick a package as your starting point, and everything in it is designed to work together. You can upgrade individual items beyond the package, but the package sets the baseline look and feel of your home.",
  },
  {
    name: "Cabinetry",
    icon: <CabinetsIcon />,
    description:
      "Timberlake Cabinetry across several collections: Tahoe (traditional), Scottsdale (ornate), Sonoma (shaker), and Kinsdale (transitional). Your interior package sets the cabinet tier, but you can upgrade from there. With 9-foot ceilings, 42-inch kitchen cabinets are included. The jump between cabinet collections changes the entire personality of the kitchen.",
  },
  {
    name: "Countertops",
    icon: <CountertopsIcon />,
    description:
      "Formica laminate is included in the base price. Upgrades go to Formica 180fx (a convincing laminate that mimics stone), granite options like Uba Tuba, Luna Pearl, and Caramel Fantasy, or quartz in white and Carrara Gray engineered stone. The difference between laminate and stone is one of the most visible upgrades in the house.",
  },
  {
    name: "Flooring",
    icon: <FlooringIcon />,
    description:
      "Shaw carpet comes in three tiers: Fastball II (base), Grand Cayman (mid), and Enticement (premium). Armstrong vinyl covers wet areas. Upgrades include luxury vinyl plank, engineered hardwood, and tile. Carpet padding is also tiered at 4, 6, and 8 lb. The base carpet is universally considered thin, so if you\u2019re upgrading anything in this category, start with the padding.",
  },
  {
    name: "Interior Paint",
    icon: <PaintIcon />,
    description:
      "Sherwin-Williams throughout. The default is City Loft (SW7631) on walls with Bright White trim. Two-tone upgrades are available if you want different colors in different rooms. Paint is one of the easiest things to change after you move in, so this is a safe place to save money if your budget is tight.",
  },
  {
    name: "Plumbing Fixtures",
    icon: <HardwareIcon />,
    description:
      "Chrome finish is standard on all faucets and fixtures. The whole-house brushed nickel upgrade runs about $995 and covers every faucet, showerhead, and coordinating piece. Kohler is one of the referenced partner brands. Matching your fixture finish across the whole house makes a subtle but real difference.",
  },
  {
    name: "Lighting",
    icon: <LightingIcon />,
    description:
      "Eight LED recessed lights are included, and you get to choose where they go. Upgrades include pendant fixtures, under-cabinet lighting, and ceiling fans. Ceiling fan rough-ins run about $325 each. Get the rough-ins now even if you don\u2019t install the fans right away, because you can\u2019t easily add them to first-floor ceilings after the house is built.",
  },
  {
    name: "Appliances",
    icon: <AppliancesIcon />,
    description:
      "GE appliances are included: range, microwave, and dishwasher. The GE Profile tier is available as an upgrade with better features and finishes. Everything is ENERGY STAR rated as part of Ryan\u2019s BuiltSmart energy efficiency program.",
  },
  {
    name: "Exterior Package",
    icon: <ExteriorIcon />,
    description:
      "Like the interior, the exterior is bundled: siding color, accent siding, shutters, and front door color come together as a coordinated package. You\u2019ll also choose your elevation and facade. Vinyl siding is standard with upgrades available.",
  },
  {
    name: "Backsplash",
    icon: <BacksplashIcon />,
    description:
      "Emser tile with a limited selection from Ryan. This is one category where many buyers skip the builder option and hire a tile installer after closing. The selection tends to be narrow and the pricing tends to be high compared to what you can get on your own. Worth considering if you have specific taste.",
  },
  {
    name: "Doors, Trim & Hardware",
    icon: <DoorIcon />,
    description:
      "Chrome hardware is standard with a brushed nickel upgrade available. Crown molding is offered as an add-on. You\u2019ll also choose baseboard and casing profiles. Small details, but they touch every room in the house.",
  },
  {
    name: "Structural Options",
    icon: <StructuralIcon />,
    description:
      "Morning rooms ($12\u201313K), finished basements ($13K+), garage extensions (~$3K), room conversions, and extra windows ($595 each). These have a hard deadline of about 10 days after contract signing. If you\u2019re even considering a structural change, decide fast. This deadline is real and they don\u2019t extend it.",
  },
];

const prepTips = [
  {
    title: "Build your Envision wishlist before the appointment",
    body: "After you sign your contract, you\u2019ll get access to the Envision portal where you can browse every available finish with photos and pricing. Spend real time here. Walking into the design center with a built-out wishlist means you\u2019re reviewing and refining instead of discovering and deciding under pressure.",
  },
  {
    title: "Decide structural options first",
    body: "Morning room, finished basement, garage extension, room conversions. These have a hard deadline of about 10 days after contract signing. That\u2019s before your design center appointment even happens. Don\u2019t let these sneak up on you.",
  },
  {
    title: "Know that 90% of the model home is upgrades",
    body: "The model home you fell in love with almost certainly has $30K+ in upgrades that aren\u2019t in your base price. Ask your sales rep for the model\u2019s full option list so you know exactly what was added and what it cost. This sets realistic expectations before you walk into the design center.",
  },
  {
    title: "Budget for at least $15K\u2013$25K in upgrades",
    body: "Ryan\u2019s base finishes are designed to hit an affordable price point, and the gap between what\u2019s included and what most people want is meaningful. Formica to granite, base carpet to LVP, standard cabinets to a nicer collection. Those upgrades add up. Having a number in mind keeps you from the sticker shock that catches a lot of first-time buyers off guard.",
  },
  {
    title: "Get the rough-ins even if you skip the fixtures",
    body: "Ceiling fan rough-ins ($325 each) and recessed lighting placements are things you can\u2019t easily add after the house is built, especially on first-floor ceilings. The rough-in is cheap compared to cutting into a finished ceiling later. Same logic applies to any electrical work.",
  },
  {
    title: "Consider skipping backsplash and Guardian wiring",
    body: "Two categories where buyers consistently say you can do better after closing. Ryan\u2019s backsplash selection is limited and the pricing is steep compared to hiring a tile installer yourself. The Guardian/HS Technology premium packages for audio and networking are similarly overpriced. A contractor can do the same work for less once you have the keys.",
  },
  {
    title: "Get the garage extension if it\u2019s offered",
    body: "At around $3K, this is one of the most common buyer regrets when skipped. You can\u2019t add garage depth after the house is built. Compared to other structural options, it\u2019s relatively cheap for something you\u2019ll notice every time you park.",
  },
  {
    title: "Bring inspiration photos",
    body: "Screenshots from Pinterest, Houzz, or Instagram give your Design Specialist a sense of your taste. You don\u2019t need a full mood board. A few photos of kitchens or bathrooms you like will help steer the conversation.",
  },
  {
    title: "Pay attention at the pre-drywall meeting",
    body: "This happens during construction, not at the design center, but it\u2019s where you confirm outlet and switch placement. Walk every room and think about where your furniture will go, where you\u2019ll charge your phone, where you\u2019ll want a light switch. Changes after drywall are expensive.",
  },
];

/* ─── Page ─── */

export default function RyanDesignCenterPage() {
  return (
    <div className="min-h-screen bg-white">
      <RevealObserver />
      <RyanPageTracker />
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
            The Ryan Homes Design Center:
            <br />
            What to&nbsp;Expect
          </h1>
          <p
            data-reveal
            style={revealStyle(160)}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-6"
          >
            Ryan Homes is one of the largest builders in the country,
            operating in 16 states and DC across 36 metro areas. Your
            design center appointment happens at a regional showroom
            where you&apos;ll work with a Design Specialist to finalize
            every finish in your home. Here&apos;s what to&nbsp;expect.
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
            What the Appointments
            <br />
            Are&nbsp;Like
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              <strong className="font-semibold text-slate-900">It starts before you walk in.</strong>{" "}
              After signing your contract, you get access to the Envision
              portal, Ryan&apos;s online design center tool. Envision lets
              you browse every available finish with photos, see transparent
              pricing for each option, and build a wishlist. The idea is that
              you do your exploring and narrowing online, then use the
              in-person appointment to finalize with physical samples.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Plan for multiple visits.</strong>{" "}
              Most buyers have 2 to 4 appointments at the regional design
              center, each running 2 to 4 hours. You&apos;ll work with a
              Design Specialist who walks you through physical samples and
              reviews the wishlist you built in Envision. Don&apos;t try
              to rush it into one visit. There are a lot of decisions, and
              the quality of those decisions goes up when you give yourself
              room to think between appointments.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Interior packages are the starting point.</strong>{" "}
              Unlike builders where you pick every finish individually, Ryan
              Homes uses coordinated interior packages. Each package bundles
              cabinets, countertops, flooring, and carpet into a named palette
              (Morrison, Murray, Decatur, Newton, Maxwell, Barrington III, among
              others). You choose a package first, and that sets the baseline
              look of your home. From there, you can upgrade individual items
              beyond the package if you want to mix and match.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Wiring gets its own meeting.</strong>{" "}
              Within the first week after signing, you&apos;ll have a separate
              appointment with Guardian/HS Technology for low-voltage wiring:
              audio, networking, cable, and security. Some markets also have a
              separate Rite Rug appointment for flooring. These happen on
              their own timeline, so keep an eye on your schedule.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">The timeline is tight.</strong>{" "}
              Structural changes (morning room, finished basement, garage
              extension) have a hard deadline of about 10 days after you sign.
              Design and finish selections need to be finalized within about
              30 days. A pre-construction meeting happens 2 to 3 weeks before
              groundbreaking where you do a final walkthrough of everything.
              These deadlines are real, and they move fast.
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
          Ryan organizes selections into about 12 categories. The exact
          options vary by community and region, but here&apos;s what most
          buyers walk through at the design center.
        </p>

        {/* Room photo */}
        <div
          data-reveal
          style={revealStyle(80)}
          className="relative mb-14 -mx-6 md:mx-0 aspect-[21/9] overflow-hidden border-t border-b md:border border-slate-200"
        >
          <Image
            src="/learn/kitchen-greatroom.webp"
            alt="Open-concept kitchen and living room showing cabinetry, countertops, flooring, and lighting selections"
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
              Your interior package sets the foundation. Cabinets, countertops,
              flooring, and carpet all start from one coordinated palette.
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
            Your&nbsp;Appointments
          </h2>
          <p
            data-reveal
            style={revealStyle(60)}
            className="text-lg md:text-xl text-slate-600 text-center max-w-2xl mx-auto mb-10"
          >
            Ryan moves fast after contract signing. Having a plan before
            your first design center visit makes the difference between
            feeling in control and feeling behind.
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
              Ryan&apos;s base finishes are designed to hit an affordable price
              point, which means the gap between what&apos;s included and
              what most people want is wider than you might expect. Formica
              to quartz countertops, base carpet to luxury vinyl plank,
              standard cabinets to a nicer Timberlake collection. Each of
              those jumps is a noticeable visual and tactile difference. The
              interior package system helps because it coordinates the
              upgrade for you, but you still need to decide how far up the
              ladder you want to go.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Do it now:</strong>{" "}
              Structural options (hard 10-day deadline), flooring, cabinets,
              countertops, and any electrical work like recessed lighting
              placement or ceiling fan rough-ins. These are either behind
              walls, under floors, or structurally locked in once
              construction starts. If you&apos;re going to upgrade anything,
              start here.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Can wait:</strong>{" "}
              Paint, door hardware, backsplash, basic light fixtures, and
              the Guardian premium wiring packages. Paint is cheap to
              change. Backsplash selection and pricing are both better from
              an independent installer. Guardian&apos;s networking and audio
              packages are consistently flagged by buyers as overpriced
              compared to hiring a contractor after closing.
            </p>
            <p>
              The kitchen drives most of the upgrade spend because cabinets,
              countertops, and appliances all live in one room and they all
              need to work together. Your interior package handles the
              coordination, but if you&apos;re upgrading beyond the package,
              keep the combinations in mind. For a deeper look at each
              category and what&apos;s worth the money, see our{" "}
              <TrackedLink
                href="/learn/new-construction-upgrades"
                event="cta_clicked"
                properties={{
                  cta: "complete upgrade guide",
                  location: "design-center-ryan-crosslink",
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
              Where cabinet meets countertop meets backsplash. Your interior
              package coordinates some of this, but if you&apos;re upgrading
              individual pieces beyond the package, you need to see how they
              look together. That&apos;s exactly what Finch does: you pick
              finishes from real swatches and it generates a photo of the
              room with those selections applied. You can{" "}
              <TrackedLink
                href="/try"
                event="cta_clicked"
                properties={{
                  cta: "try a demo with sample finishes",
                  location: "design-center-ryan-inline",
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
              Envision shows you photos of individual finishes. But it
              can&apos;t show you what your kitchen looks like with those
              cabinets, that countertop, and that flooring all in the same
              room. That&apos;s the hard part.
            </p>
            <p className="text-base md:text-lg text-white/70 leading-relaxed mb-8">
              Finch solves that. You pick finishes from real swatches and it
              generates a photo of the room with your selections applied. The
              demo below uses sample finishes, not Ryan&apos;s actual
              catalog, but it shows you what the experience looks like.
              Imagine doing this with your real floor plan and the actual
              options from the design&nbsp;center.
            </p>
            <div>
              <TrackedLink
                href="/try"
                event="cta_clicked"
                properties={{
                  cta: "Try It Yourself",
                  location: "design-center-ryan-closing",
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
                  location: "design-center-ryan-closing-builder",
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
            Ryan&apos;s design center process moves faster than most builders
            because of the tight deadlines and the Envision pre-work. The
            interior package system takes some of the guesswork out of
            coordinating finishes, which is genuinely helpful. Where it gets
            tricky is when you want to upgrade beyond the package and need to
            see how individual pieces work together. That&apos;s what Finch
            was built for. You can{" "}
            <TrackedLink
              href="/try"
              event="cta_clicked"
              properties={{
                cta: "try the demo",
                location: "design-center-ryan-closing-note",
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
                location: "design-center-ryan-footer",
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
              "Ryan Homes Design Center: What to Expect at Your Appointment",
            description:
              "Going to a Ryan Homes design center? Here's what the appointments are like, how interior packages work, what categories you'll choose from, and how to prepare.",
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
              "@id": "https://withfin.ch/learn/design-center/ryan",
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
                name: "How long is the Ryan Homes design center appointment?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Plan for 2 to 4 hours per visit, and expect 2 to 4 visits total. Build your Envision wishlist before the appointment so you're reviewing and refining rather than discovering and deciding under pressure.",
                },
              },
              {
                "@type": "Question",
                name: "What is included in a Ryan Homes base package?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Standard includes Formica laminate countertops, Timberlake base cabinets, Shaw Fastball II carpet with 4 lb padding, Armstrong vinyl in wet areas, GE appliances (range, microwave, dishwasher), 8 LED recessed lights, Sherwin-Williams City Loft paint, and chrome fixtures. About 90% of what you see in model homes is upgrades.",
                },
              },
              {
                "@type": "Question",
                name: "What is the Envision portal for Ryan Homes?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Envision is Ryan Homes' online design center platform. After signing your contract, you get a personalized link to browse all available finishes with photos, see pricing for every option, and build a wishlist before your in-person appointment.",
                },
              },
              {
                "@type": "Question",
                name: "What are Ryan Homes interior packages?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Ryan Homes uses coordinated interior packages that bundle cabinets, countertops, flooring, and carpet into named palettes like Morrison, Murray, Decatur, Newton, and Maxwell. You choose a package as your starting point and can upgrade individual items from there.",
                },
              },
              {
                "@type": "Question",
                name: "When are selections final at Ryan Homes?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Structural changes like room additions, elevation changes, and garage extensions have a hard deadline about 10 days after contract signing. Design and finish selections are due about 30 days after contract. After those deadlines, changes are extremely difficult or impossible.",
                },
              },
            ],
          }),
        }}
      />
    </div>
  );
}
