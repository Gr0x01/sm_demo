import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { RevealObserver, TrackedLink } from "@/app/landing-client";
import { ArborPageTracker } from "./arbor-client";

export const metadata: Metadata = {
  title: {
    absolute:
      "Arbor Homes Design Center: What to Expect at Your Appointment",
  },
  description:
    "Going to the Arbor Homes Design Center? Here's what the appointment is like, what categories you'll choose from, how to prepare, and what to bring.",
  alternates: {
    canonical: "https://withfin.ch/learn/design-center/arbor",
  },
  openGraph: {
    title: "Arbor Homes Design Center: What to Expect at Your Appointment",
    description:
      "Going to the Arbor Homes Design Center? Here's what the appointment is like, what categories you'll choose from, how to prepare, and what to bring.",
    url: "https://withfin.ch/learn/design-center/arbor",
    siteName: "Finch",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Arbor Homes Design Center: What to Expect",
    description:
      "What happens at the Arbor Homes design center appointment, what categories you'll pick from, and how to prepare.",
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

/* ─── Data ─── */

const selectionCategories = [
  {
    name: "Cabinetry",
    icon: <CabinetsIcon />,
    description:
      "Kitchen and bathroom cabinets starting with Merillat oak as the included option. Upgrades open up different door styles, painted finishes, and stain colors. On an Arbor home, cabinets are one of the biggest visual upgrades you can make because the jump from the standard oak to a painted or stained style changes the entire feel of the kitchen.",
  },
  {
    name: "Countertops",
    icon: <CountertopsIcon />,
    description:
      "Laminate countertops are included in the base price, with upgrades to granite and quartz available. You\u2019ll pick a material, a color or pattern, and an edge profile. The difference between laminate and stone is one of the most noticeable upgrades in the house, so this is worth spending time on.",
  },
  {
    name: "Flooring",
    icon: <FlooringIcon />,
    description:
      "Shaw carpet and Armstrong vinyl are the included options, with upgrades to hardwood, luxury vinyl plank, and tile available for different areas of the house. Flooring is one of the more expensive categories and one of the most disruptive to change after you move in, so get it right now if you can.",
  },
  {
    name: "Interior Paint",
    icon: <PaintIcon />,
    description:
      "A standard neutral color is included. Two-tone color options, where you choose different colors for walls and trim or for different rooms, are available as an upgrade. Paint is one of the easiest things to change later, so don\u2019t stress too much here.",
  },
  {
    name: "Plumbing Fixtures",
    icon: <HardwareIcon />,
    description:
      "Moen fixtures are included, with upgrades available in different finishes like brushed nickel, matte black, or oil-rubbed bronze. This covers faucets, showerheads, and coordinating bathroom hardware. Matching your fixture finish across kitchens and bathrooms gives the house a more pulled-together look.",
  },
  {
    name: "Lighting",
    icon: <LightingIcon />,
    description:
      "A designer lighting package is included. Upgrades add options like recessed can lights, pendant fixtures, under-cabinet lighting, and ceiling fans. Electrical work is structural, so adding can lights or fan boxes later means opening up the ceiling.",
  },
  {
    name: "Appliances",
    icon: <AppliancesIcon />,
    description:
      "GE appliances are included in the base package. Upgrade packages are available with different brands, finishes, and feature sets. What\u2019s included varies by community, so ask your sales counselor before your appointment so you know your starting point.",
  },
  {
    name: "Exterior Finishes",
    icon: <ExteriorIcon />,
    description:
      "Vinyl siding with a choice of colors is the standard. Upgrades to HardiePlank fiber cement siding are available and add a different look and feel to the exterior. You\u2019ll also choose exterior trim colors and any accent details.",
  },
  {
    name: "Doors & Trim",
    icon: <DoorIcon />,
    description:
      "Six-panel interior doors are included, with upgrades to different panel styles and finishes. This category also covers trim profiles like baseboards and casing. A small change that quietly affects every room in the house.",
  },
];

const prepTips = [
  {
    title: "Browse on a Saturday first",
    body: "Arbor\u2019s Design Center is open Saturdays from 9 AM to 1 PM for walk-in browsing, no appointment needed. Take advantage of this. Seeing the samples in person before your formal weekday appointment gives you a head start and means fewer surprises when the clock is running.",
  },
  {
    title: "Set a budget range for upgrades",
    body: "Not a vague \u201Cwe\u2019ll see how it goes\u201D but an actual number. With Arbor\u2019s price range, upgrades can add up fast because the base finishes are designed to hit that affordable price point. Knowing your ceiling before you walk in makes it easier to decide where to spend and where to hold back.",
  },
  {
    title: "Know what\u2019s hard to change later",
    body: "Electrical work, plumbing rough-ins, flooring, and cabinets are all expensive or disruptive to change after you move in. Paint, hardware, and light fixtures are easy to swap anytime. If your budget is tight, prioritize the things you can\u2019t easily redo.",
  },
  {
    title: "Bring inspiration photos",
    body: "Screenshots from Pinterest, Houzz, or Instagram give your design consultant a starting point for your taste. You don\u2019t need a mood board. A few photos of kitchens or bathrooms you like is plenty.",
  },
  {
    title: "It\u2019s contract holders only",
    body: "Arbor\u2019s policy is firm on this: only the people on the contract are allowed at the Design Center appointment. No kids, no parents, no friends. If you need another opinion, talk through your options with them before you go and share photos after. The HomeBuildingJourney.com portal also makes it easy to review everything you picked.",
  },
  {
    title: "Take photos of everything you pick",
    body: "Front and back of samples, the label with the name and level, the manufacturer info. You\u2019ll look at dozens of options across all categories, and they blur together fast. Photos are your insurance.",
  },
  {
    title: "Selections are final",
    body: "After your Design Center appointment, your selections are locked in. Some changes may be possible early in construction, but don\u2019t count on it. Take your time during the appointment and make sure you\u2019re comfortable with every choice before you sign off.",
  },
];

/* ─── Page ─── */

export default function ArborDesignCenterPage() {
  return (
    <div className="min-h-screen bg-white">
      <RevealObserver />
      <ArborPageTracker />
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
            The Arbor Homes Design Center:
            <br />
            What to&nbsp;Expect
          </h1>
          <p
            data-reveal
            style={revealStyle(160)}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-6"
          >
            You signed the contract. Now comes the fun part: choosing every
            finish at the Arbor Homes Design Center. It&apos;s a 3,200 square
            foot showroom in Indianapolis where you&apos;ll pick cabinets,
            countertops, flooring, and everything else that makes the house
            feel like yours. Here&apos;s what to&nbsp;expect.
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
              <strong className="font-semibold text-slate-900">One showroom, two brands.</strong>{" "}
              Arbor Homes runs a single Design Center in Indianapolis that
              serves both Arbor and its sister brand, Silverthorne Homes.
              It&apos;s a showroom with physical samples of every finish
              available for your floor plan. If you want to get a feel for the
              space before your appointment, Saturdays from 9 AM to 1 PM are
              open for browsing without a scheduled time.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Plan for 2 to 3 hours.</strong>{" "}
              Your formal appointment is on a weekday, typically scheduled a few
              weeks after you sign your purchase agreement.
              Don&apos;t schedule anything right after. The last thing
              you want is to feel rushed when you&apos;re picking the countertop
              you&apos;ll look at every morning.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Contract holders only.</strong>{" "}
              Arbor has a strict policy that only
              the people on the contract are allowed at the appointment. No children, no
              family members, no friends. It&apos;s a focused environment with
              heavy samples and display boards, and they want you making
              decisions without distractions.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Everything starts at &quot;included.&quot;</strong>{" "}
              You&apos;ll work with a design consultant who walks you through
              every category and shows you physical samples.
              Each category has a base finish already
              in the price of your home. Upgrades are priced as the difference
              above that base option, and you&apos;ll see the total grow as you
              go through each category. After your appointment, you can review
              everything you picked on the HomeBuildingJourney.com portal.
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
          Arbor organizes selections into about 9 main categories. The exact
          options vary by community and floor plan, but here&apos;s what most
          buyers walk through at the Design Center.
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
              Cabinetry, countertops, flooring, lighting, and appliances all
              come together in one room.
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
              Not all upgrades are created equal, and on an Arbor home this
              matters more than most. Because the base package is designed to
              hit an affordable price point, the gap between what&apos;s
              included and what&apos;s upgraded is more noticeable than it might
              be at a higher-priced builder. Laminate to quartz countertops, oak
              cabinets to a painted style, vinyl to luxury vinyl plank. Each of
              those jumps makes a real visual difference.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Do it now:</strong>{" "}
              Flooring, cabinets, countertops, and any electrical work like can
              lights or extra outlets. These are either structural (behind
              walls) or disruptive to replace once you&apos;re living there. If
              you&apos;re going to upgrade anything, start with these.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Can wait:</strong>{" "}
              Paint, door hardware, and basic light fixtures. These are all
              relatively easy and inexpensive to change later. If you need to
              trim your upgrade budget, these are the categories to pull back
              on.
            </p>
            <p>
              The kitchen drives most of the upgrade spend for a reason:
              cabinets, countertops, and appliances all live in one room, and
              they all need to work together. Most buyers put about half their
              upgrade budget toward the kitchen and split the rest between
              bathrooms and everything else. For a deeper look at each category
              and what&apos;s worth the money, see our{" "}
              <TrackedLink
                href="/learn/new-construction-upgrades"
                event="cta_clicked"
                properties={{
                  cta: "complete upgrade guide",
                  location: "design-center-arbor-crosslink",
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
              separate samples on a shelf. Getting these right together
              is more important than getting any one of them right
              individually. That&apos;s exactly what Finch does: you pick
              finishes and it generates a photo of the room with those
              selections applied. You can{" "}
              <TrackedLink
                href="/try"
                event="cta_clicked"
                properties={{
                  cta: "try a demo with sample finishes",
                  location: "design-center-arbor-inline",
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
              The hardest part of the Design Center is picturing how
              everything looks together. You&apos;re choosing from small
              samples and trying to imagine them in a full room.
            </p>
            <p className="text-base md:text-lg text-white/70 leading-relaxed mb-8">
              Finch solves that. You pick finishes from real swatches and it
              generates a photo of the room with your selections applied. The
              demo below uses sample finishes, not Arbor&apos;s actual
              catalog, but it shows you what the experience looks like.
              Imagine doing this with your real floorplan and the actual
              options from the Design&nbsp;Center.
            </p>
            <div>
              <TrackedLink
                href="/try"
                event="cta_clicked"
                properties={{
                  cta: "Try It Yourself",
                  location: "design-center-arbor-closing",
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
                  location: "design-center-arbor-closing-builder",
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
            The Design Center is the best part of building a new home. You
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
                location: "design-center-arbor-closing-note",
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
                location: "design-center-arbor-footer",
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
              "Arbor Homes Design Center: What to Expect at Your Appointment",
            description:
              "Going to the Arbor Homes Design Center? Here's what the appointment is like, what categories you'll choose from, how to prepare, and what to bring.",
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
              "@id": "https://withfin.ch/learn/design-center/arbor",
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
                name: "How long is the Arbor Homes design center appointment?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Plan for 2 to 3 hours, depending on your floor plan and how many options your community offers. Appointments are scheduled on weekdays. Don't schedule anything right after so you have time to make decisions without feeling rushed.",
                },
              },
              {
                "@type": "Question",
                name: "Can I bring family or friends to the Arbor Homes design center?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "No. Arbor has a strict policy that only contract holders are allowed at the Design Center appointment. No children, family members, or friends. You can share your selections afterward through the HomeBuildingJourney.com portal.",
                },
              },
              {
                "@type": "Question",
                name: "What is included in the base price at Arbor Homes?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Standard included features are Merillat oak cabinets, laminate countertops, Shaw carpet, Armstrong vinyl flooring, GE appliances, and Moen plumbing fixtures. Everything above these base options is priced as an upgrade, and you'll see the cost difference during your appointment.",
                },
              },
              {
                "@type": "Question",
                name: "Can I visit the Arbor Homes design center before my appointment?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Yes. The Design Center in Indianapolis is open Saturdays from 9 AM to 1 PM for browsing without an appointment. It's a good way to see the samples and start thinking about your selections before your formal weekday appointment.",
                },
              },
              {
                "@type": "Question",
                name: "What categories do you choose at the Arbor Homes design center?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Arbor organizes selections into about 9 main categories: cabinetry, countertops, flooring, interior paint, plumbing fixtures, lighting, appliances, exterior finishes, and doors and trim. The exact options vary by community and floor plan.",
                },
              },
            ],
          }),
        }}
      />
    </div>
  );
}
