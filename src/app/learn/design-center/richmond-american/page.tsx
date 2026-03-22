import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { RevealObserver, TrackedLink } from "@/app/landing-client";
import { RichmondAmericanPageTracker } from "./richmond-american-client";

export const metadata: Metadata = {
  title: {
    absolute:
      "Richmond American Home Gallery: What to Expect at Your Appointment",
  },
  description:
    "Going to the Richmond American Home Gallery? Here's what the appointment is like, the 13 selection categories, color studios, named brand partners, and how to prepare.",
  alternates: {
    canonical: "https://withfin.ch/learn/design-center/richmond-american",
  },
  openGraph: {
    title:
      "Richmond American Home Gallery: What to Expect at Your Appointment",
    description:
      "Going to the Richmond American Home Gallery? Here's what the appointment is like, the 13 selection categories, color studios, named brand partners, and how to prepare.",
    url: "https://withfin.ch/learn/design-center/richmond-american",
    siteName: "Finch",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Richmond American Home Gallery: What to Expect",
    description:
      "What happens at the Richmond American Home Gallery appointment, color studios, 13 selection categories, and how to prepare.",
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
function BacksplashIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" />
      <line x1="2" y1="9" x2="22" y2="9" />
      <line x1="2" y1="15" x2="22" y2="15" />
      <line x1="8" y1="3" x2="8" y2="9" />
      <line x1="15" y1="3" x2="15" y2="9" />
      <line x1="5" y1="9" x2="5" y2="15" />
      <line x1="12" y1="9" x2="12" y2="15" />
      <line x1="19" y1="9" x2="19" y2="15" />
      <line x1="8" y1="15" x2="8" y2="21" />
      <line x1="15" y1="15" x2="15" y2="21" />
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
function SinkIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v5" />
      <path d="M14 4h-4" />
      <path d="M3 10h18v2c0 3.5-2.5 7-9 7s-9-3.5-9-7v-2z" />
      <path d="M7 19v3" />
      <path d="M17 19v3" />
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
function DoorHardwareIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M2 22h20" />
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
function HomeTechIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="12" />
      <line x1="3" y1="14" x2="21" y2="14" />
      <circle cx="7" cy="10" r="2" />
      <circle cx="13" cy="10" r="2" />
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="12" y1="18" x2="12" y2="21" />
    </svg>
  );
}
function WindowCoveringsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" />
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="12" y1="6" x2="12" y2="21" />
    </svg>
  );
}
function ClosetIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="2" width="18" height="20" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <circle cx="10" cy="12" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="14" cy="12" r="0.5" fill="currentColor" stroke="none" />
      <line x1="3" y1="19" x2="21" y2="19" />
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

/* ─── Data ─── */

const selectionCategories = [
  {
    name: "Cabinets",
    icon: <CabinetsIcon />,
    description:
      "Kitchen and bathroom cabinet style, finish, and hardware. Richmond American lets you choose from door profiles, stain or paint colors, and functional upgrades like soft-close drawers and rollout organizers. Cabinets set the visual tone for every room they touch, and the range of options at the Home Gallery is wide enough that it\u2019s worth going in with at least a general direction in mind.",
  },
  {
    name: "Countertops",
    icon: <CountertopsIcon />,
    description:
      "Quartz, granite, and natural stone options for kitchens and bathrooms. You\u2019ll choose a material, a color or pattern, and an edge profile. The Home Gallery displays full slabs so you can see the veining and color variation at actual scale, not just a 4-inch chip.",
  },
  {
    name: "Backsplash",
    icon: <BacksplashIcon />,
    description:
      "Tile patterns and materials for kitchen and bathroom walls. Richmond American carries Daltile and Emser Tile, with options ranging from classic subway tile to herringbone, picket, chevron, and brick layouts. This is one of the categories where the color studios help most, because the backsplash has to coordinate with both your countertop and cabinets.",
  },
  {
    name: "Flooring",
    icon: <FlooringIcon />,
    description:
      "Hardwood, tile, and luxury vinyl plank options from Mohawk and other vendors. You\u2019ll choose material, color, and plank width or tile size for different zones of the house. Flooring is one of the most expensive categories and one of the most disruptive to change after move-in, so this is a good place to invest.",
  },
  {
    name: "Paint",
    icon: <PaintIcon />,
    description:
      "Interior wall and trim colors from Sherwin-Williams. Richmond American\u2019s color studios include pre-coordinated paint palettes that are designed to work with the other finishes in each scheme. If you\u2019re not confident choosing paint colors, the studios take the guesswork out of it.",
  },
  {
    name: "Sinks & Faucets",
    icon: <SinkIcon />,
    description:
      "Delta faucets and sink options for kitchens and bathrooms. You\u2019ll pick a faucet style, a finish (brushed nickel, matte black, chrome, and others), and a sink type. Farmhouse-style sinks are available as an upgrade. Matching your faucet finish across rooms gives the house a more cohesive feel.",
  },
  {
    name: "Lighting",
    icon: <LightingIcon />,
    description:
      "Fixtures from Progress Lighting and Kichler, including overhead lights, pendants, recessed cans, under-cabinet lighting, and ceiling fans. Electrical work is structural, so adding recessed lighting or fan-rated boxes later means opening the ceiling. This is a \"do it now\" category.",
  },
  {
    name: "Door Hardware",
    icon: <DoorHardwareIcon />,
    description:
      "Interior and exterior door hardware from Kwikset. You\u2019ll choose handle style, finish, and lock type. It\u2019s a small detail that touches every room in the house. Matching your hardware finish to your faucets and lighting gives the home a consistent look without much extra cost.",
  },
  {
    name: "Appliances",
    icon: <AppliancesIcon />,
    description:
      "GE appliances, including ranges, refrigerators, dishwashers, microwaves, and double ovens. Richmond American carries multiple GE tiers, so you can stay with the included package or upgrade to higher-end models and finishes. Ask your consultant which GE package is included in your community\u2019s base price.",
  },
  {
    name: "Home Technology",
    icon: <HomeTechIcon />,
    description:
      "Whole-house audio, security systems, and structured wiring prewires. If you want built-in speakers, a security panel, or prewired Ethernet and coax, this is the time. Running wire through finished walls later is expensive and invasive. Think about what you\u2019ll actually use in the first year.",
  },
  {
    name: "Window Coverings",
    icon: <WindowCoveringsIcon />,
    description:
      "Blinds, shades, and other window treatments available through the Home Gallery. Ordering through the builder means they\u2019re installed before you move in. You can always change window coverings later, but having them from day one means privacy on move-in day.",
  },
  {
    name: "Closet Systems",
    icon: <ClosetIcon />,
    description:
      "Organizational systems for closets, including shelving, drawers, and hanging configurations. This is one of the more practical upgrade categories. A well-organized primary closet makes a real daily difference, and it\u2019s cheaper to install during construction than to retrofit.",
  },
  {
    name: "Electrical & Solar",
    icon: <ElectricalIcon />,
    description:
      "Outlet placement, USB outlets, dedicated circuits, and prewires. In select markets, solar panel options are also available during your appointment. Electrical is entirely behind the walls, so anything you want that\u2019s not in the standard plan needs to be decided now.",
  },
];

const prepTips = [
  {
    title: "Visit a model home first",
    body: "Richmond American\u2019s model homes show the included finishes in context. Seeing the base countertop, base cabinets, and base flooring installed in an actual room gives you a reference point for what you\u2019re starting with and what an upgrade actually changes.",
  },
  {
    title: "Browse the Home Gallery before your appointment",
    body: "The Home Gallery is open to the public: Monday through Friday, 9 AM to 6 PM, and Saturdays, 9 AM to 5 PM. You don\u2019t need to be under contract to walk through. Going in early lets you see the samples, start narrowing your taste, and arrive at your formal appointment with a head start.",
  },
  {
    title: "Know your structural options",
    body: "Structural options like room configurations, extra windows, and ceiling heights are selected at the Sales Center before your Home Gallery visit. Your design consultant will already know what structural choices you made. If you\u2019re still deciding on structural options, lock those in first because some finishes depend on them.",
  },
  {
    title: "Set a budget range",
    body: "Richmond American curates finishes at a variety of price points, but it\u2019s still easy to let upgrades stack up. Decide on a total upgrade budget before you walk in. It\u2019s easier to allocate that number across categories than to add everything up at the end and try to cut back.",
  },
  {
    title: "Use the color studios",
    body: "The Home Gallery has four color studios with professionally coordinated palettes. Each studio groups finishes that work together, so if you start with a countertop you like, the studio shows you cabinets, flooring, and paint that complement it. Don\u2019t fight the coordination. That\u2019s the whole point of the studios, and it\u2019s one of Richmond American\u2019s strongest features.",
  },
  {
    title: "Ask about regional options",
    body: "Some categories vary by market. In certain regions, your Home Gallery appointment includes electrical options like outlet placement and prewires, plus solar choices. Ask your sales counselor ahead of time what\u2019s available at your location so you\u2019re not caught off guard.",
  },
  {
    title: "Bring inspiration photos",
    body: "Screenshots from Pinterest, Instagram, or anywhere else. Your design consultant has a flat-screen monitor in your private consultation room to pull up reference images and compare. A few photos of kitchens or bathrooms you like gives them a starting point for your taste without you having to describe it in words.",
  },
];

/* ─── Page ─── */

export default function RichmondAmericanDesignCenterPage() {
  return (
    <div className="min-h-screen bg-white">
      <RevealObserver />
      <RichmondAmericanPageTracker />
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
            The Richmond American
            <br />
            Home Gallery: What to&nbsp;Expect
          </h1>
          <p
            data-reveal
            style={revealStyle(160)}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-6"
          >
            Richmond American Homes calls their design center the Home
            Gallery. It&apos;s a boutique-style showroom with color studios,
            full-scale kitchen vignettes, and a complimentary design
            consultant who already knows your floor plan. Here&apos;s what
            the appointment looks like and how to walk in&nbsp;prepared.
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
              <strong className="font-semibold text-slate-900">They call it the Home Gallery.</strong>{" "}
              Not a warehouse full of samples. Richmond American&apos;s Home
              Gallery locations are boutique-style showrooms with curated
              displays and full-sized kitchen vignettes built around popular
              floor plans. The Las Vegas gallery alone is over 4,000 square
              feet with three complete kitchen setups so you can see
              finishes at actual scale.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Your consultant already knows your plan.</strong>{" "}
              Before you arrive, your design consultant will have been
              briefed on your floor plan and the structural options you
              selected at the Sales Center. You don&apos;t have to
              re-explain what you bought. They walk you through each
              category with your specific home in mind.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Plan for a few hours.</strong>{" "}
              Your consultant will give you a more specific time estimate
              based on your floor plan and how many options your community
              offers. Complimentary drinks and snacks are provided. Each
              consultation room has a flat-screen monitor for reviewing
              additional finishes and reference images.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">The color studios do the coordinating.</strong>{" "}
              The Home Gallery has four color studios, each with a
              professionally coordinated palette of finishes. Cabinets,
              countertops, flooring, paint, and hardware are pre-matched
              within each studio. If you like one element in a studio, the
              rest of the scheme is designed to complement it. This is one
              of Richmond American&apos;s standout features and it takes the
              guesswork out of making everything look right together.
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
          Richmond American organizes selections into about 13 categories.
          The exact options vary by market and floor plan, but here&apos;s
          what most buyers walk through at the Home Gallery.
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
              Cabinets, countertops, backsplash, flooring, lighting, and
              appliances all come together in one room.
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
              Richmond American curates finishes at a variety of price
              points, and the named brand partners (GE, Delta, Sherwin-Williams,
              Mohawk, Kwikset) mean you&apos;re choosing from known quantities
              rather than mystery vendors. That helps with the spend/save
              calculation because you can research the brands ahead of time
              and know what you&apos;re getting.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Do it now:</strong>{" "}
              Flooring, cabinets, countertops, and anything electrical (can
              lights, prewires, outlet placement, home technology). These
              are either structural or disruptive to replace once
              you&apos;re living there. If you&apos;re going to upgrade
              anything, start with these.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Can wait:</strong>{" "}
              Paint, door hardware, window coverings, and basic light
              fixtures. These are all relatively easy and inexpensive to
              change later. If you need to trim your upgrade budget, these
              are the categories to pull back on.
            </p>
            <p>
              The kitchen drives most of the upgrade spend for a reason:
              cabinets, countertops, backsplash, and appliances all live in
              one room, and they all need to work together. The color
              studios help here because you can see those combinations
              pre-coordinated instead of guessing. For a deeper look at each
              category and what&apos;s worth the money, see our{" "}
              <TrackedLink
                href="/learn/new-construction-upgrades"
                event="cta_clicked"
                properties={{
                  cta: "complete upgrade guide",
                  location: "design-center-richmond-american-crosslink",
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
              Where cabinet meets countertop meets backsplash. This is the
              combination you&apos;re trying to picture from three separate
              samples on a shelf. The color studios help, but even there
              you&apos;re looking at small chips and swatches side by side.
              That&apos;s exactly what Finch does: you pick finishes and it
              generates a photo of the room with those selections applied.
              You can{" "}
              <TrackedLink
                href="/try"
                event="cta_clicked"
                properties={{
                  cta: "try a demo with sample finishes",
                  location: "design-center-richmond-american-inline",
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
              The Home Gallery&apos;s color studios are a great start, but
              you&apos;re still looking at small samples and trying to
              imagine them in a full room together.
            </p>
            <p className="text-base md:text-lg text-white/70 leading-relaxed mb-8">
              Finch solves that. You pick finishes from real swatches and it
              generates a photo of the room with your selections applied. The
              demo below uses sample finishes, not Richmond American&apos;s
              actual catalog, but it shows you what the experience looks like.
              Imagine doing this with your real floorplan and the actual
              options from the Home&nbsp;Gallery.
            </p>
            <div>
              <TrackedLink
                href="/try"
                event="cta_clicked"
                properties={{
                  cta: "Try It Yourself",
                  location: "design-center-richmond-american-closing",
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
                  location: "design-center-richmond-american-closing-builder",
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
            The Home Gallery is the best part of building a Richmond American
            home. You get a professional design consultant, pre-coordinated
            color studios, and named brands you can research before you walk
            in. The trick is going in prepared, knowing where to invest, and
            being able to picture how it all comes together. That last part
            is what Finch was built for. You can{" "}
            <TrackedLink
              href="/try"
              event="cta_clicked"
              properties={{
                cta: "try the demo",
                location: "design-center-richmond-american-closing-note",
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
                location: "design-center-richmond-american-footer",
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
              "Richmond American Home Gallery: What to Expect at Your Appointment",
            description:
              "Going to the Richmond American Home Gallery? Here's what the appointment is like, the 13 selection categories, color studios, named brand partners, and how to prepare.",
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
                "https://withfin.ch/learn/design-center/richmond-american",
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
                name: "How long is the Richmond American Home Gallery appointment?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Plan for at least a few hours. Your design consultant will give you a more specific estimate based on your floor plan and how many options your community offers. Each consultation happens in a private room with complimentary drinks and snacks.",
                },
              },
              {
                "@type": "Question",
                name: "What do you choose at the Richmond American Home Gallery?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "About 13 categories: cabinets, countertops, backsplash, flooring, paint, sinks and faucets, lighting, door hardware, appliances, home technology, window coverings, closet systems, and electrical. In some markets, solar options are also available. Brand partners include GE, Delta, Sherwin-Williams, Mohawk, Kwikset, Progress Lighting, Kichler, Daltile, and Emser Tile.",
                },
              },
              {
                "@type": "Question",
                name: "Is the Richmond American Home Gallery open to the public?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. You can visit the Home Gallery to browse samples and see the color studios even before you're under contract. Hours are Monday through Friday 9 AM to 6 PM and Saturday 9 AM to 5 PM. Your formal design consultation is scheduled after you sign your purchase agreement.",
                },
              },
              {
                "@type": "Question",
                name: "What brands does Richmond American use?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Richmond American partners with named national brands: GE for appliances, Delta for faucets, Sherwin-Williams for paint, Mohawk for flooring, Kwikset for door hardware, Progress Lighting and Kichler for light fixtures, and Daltile and Emser Tile for backsplash and tile work.",
                },
              },
              {
                "@type": "Question",
                name: "What are the color studios at the Richmond American Home Gallery?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "The Home Gallery has four color studios, each with a professionally coordinated palette of finishes. Cabinets, countertops, flooring, paint, and hardware are pre-matched within each studio so your selections complement each other. It's designed to take the guesswork out of coordinating finishes across categories.",
                },
              },
            ],
          }),
        }}
      />
    </div>
  );
}
