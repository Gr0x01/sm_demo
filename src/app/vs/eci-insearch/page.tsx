import type { Metadata } from "next";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { GetStartedSection } from "@/components/PilotSection";
import {
  RevealObserver,
  TrackedLink,
  RoiCalculator,
  CalendlyPopupButton,
  FaqItem,
} from "@/app/landing-client";
import { EciInsearchPageTracker } from "../vs-client";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: {
    absolute:
      "Finch vs ECI Insearch — Upgrade Visualization Without the ERP Commitment",
  },
  description:
    "Comparing ECI Insearch and Finch for design center visualization? Finch works with any CRM, any ERP, and goes live in days. No 3D modeling. No ecosystem lock-in.",
  alternates: { canonical: "https://withfin.ch/vs/eci-insearch" },
  openGraph: {
    title: "Finch vs ECI Insearch — Same Category, Different Commitment",
    description:
      "Insearch requires 3D modeling per floorplan and the ECI ecosystem. Finch uses your model home photos, works with any stack, and goes live in days.",
    url: "https://withfin.ch/vs/eci-insearch",
    siteName: "Finch",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finch vs ECI Insearch — Same Category, Different Commitment",
    description:
      "Insearch requires 3D modeling and the ECI ecosystem. Finch uses your photos and goes live in days.",
  },
};

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
  { label: "Time to live", insearch: "8-12 weeks (3D modeling per floorplan)", finch: "Under a week" },
  {
    label: "Setup work (your side)",
    insearch: "Floor plans, specs, and coordination with 3D team",
    finch: "Send option sheets + photos",
  },
  {
    label: "Who does the work",
    insearch: "ECI team builds 3D models of each room",
    finch: "We handle everything",
  },
  {
    label: "New floor plan turnaround",
    insearch: "Weeks (new 3D model required)",
    finch: "1-2 days",
  },
  {
    label: "Buyer sees",
    insearch: "Pre-rendered 3D scene + 360 tour",
    finch: "Their actual room with selections applied",
  },
  {
    label: "CRM/ERP required",
    insearch: "Best with MarkSystems + Lasso (ECI suite)",
    finch: "Works with any CRM, any ERP, or none",
  },
  {
    label: "Ongoing maintenance",
    insearch: "New renders for new options",
    finch: "Self-serve admin or we handle it",
  },
  {
    label: "Pricing",
    insearch: "Enterprise contract (suite-based)",
    finch: "$500/mo per plan",
  },
  {
    label: "Built for",
    insearch: "Builders on the ECI ecosystem",
    finch: "Any production builder, any tech stack",
  },
];


const faqs = [
  {
    q: "Insearch uses 3D renderings. How does Finch compare visually?",
    a: "Insearch pre-renders 3D scenes and 360 tours for each floorplan. Finch generates a visualization of the buyer\u2019s actual selections applied to your model home photos. Both show buyers what they\u2019re getting. Finch skips the 3D modeling step entirely, so new options and floorplans go live in days instead of weeks.",
  },
  {
    q: "We use MarkSystems. Does Finch integrate with it?",
    a: "Finch doesn\u2019t require ERP integration. Your buyers pick selections, see them visualized, and export a priced selection sheet your team can process in any system. If you want to keep MarkSystems for everything else, Finch sits alongside it without replacing anything.",
  },
  {
    q: "Insearch includes an online sales center and lot management. Does Finch do that?",
    a: "No. Finch does one thing: upgrade visualization that increases revenue per home. If you need a full online sales center, CRM, and lot management, ECI\u2019s suite covers that. But if upgrade revenue is the problem you\u2019re solving, you don\u2019t need the full suite to get there.",
  },
  {
    q: "Signature Homes reported +20% sales with Insearch. Can Finch match that?",
    a: "Signature Homes\u2019 results validate what every visualization vendor in this space reports: buyers who see their selections spend more. Their case study also showed 10-15% profit increases and a 75% reduction in change orders. We expect comparable lift because the mechanism is the same. The difference is how fast you get there and what it costs.",
  },
  {
    q: "How does pricing compare?",
    a: "Insearch is part of ECI\u2019s enterprise suite, typically sold alongside MarkSystems, Lasso CRM, and LotVue. Pricing scales with the suite. Finch is $500/mo per plan. No suite, no bundle, no long-term commitment required.",
  },
  {
    q: "We already use Insearch. Can we switch?",
    a: "Yes. Send us your option sheets and model home photos. We can have your first floorplan live in under a week, running alongside Insearch while you compare. No IT migration, no data export needed.",
  },
  {
    q: "What happens when we add a new floorplan?",
    a: "With Insearch, each new floorplan needs a 3D model built from scratch. With Finch, send us photos of the model home and your option sheet. Live in 1-2 days.",
  },
  {
    q: "Do we need IT involvement?",
    a: "No. Nothing to install, nothing to integrate, no servers to configure. We build it. Your buyers use a link. You get a priced selection sheet back.",
  },
];

export default function VsEciInsearchPage() {
  return (
    <div className="min-h-screen bg-white">
      <RevealObserver />
      <EciInsearchPageTracker />
      <SiteNav />

      {/* --- Hero --- */}
      <section className="px-6 pt-14 pb-16 md:pt-18 md:pb-20 lg:pt-20 lg:pb-24 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p
            data-reveal
            style={revealStyle(60)}
            className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-6"
          >
            Finch vs ECI Insearch <span className="font-normal">&middot; Updated March 2026</span>
          </p>
          <h1
            data-reveal
            style={revealStyle(100)}
            className="text-[2.8rem] md:text-[3.6rem] lg:text-[4.4rem] leading-[0.95] text-slate-900 tracking-[-0.02em] mb-8"
          >
            Visualization results.
            <br />
            Without the ecosystem&nbsp;commitment.
          </h1>
          <p
            data-reveal
            style={revealStyle(160)}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10"
          >
            ECI Insearch ties upgrade visualization to MarkSystems, Lasso, and
            weeks of 3D modeling. Finch works with your existing stack and goes
            live in days. Send us your option sheets and model home photos.
            That&apos;s&nbsp;it.
          </p>
          <div
            data-reveal
            style={revealStyle(220)}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <TrackedLink
              href="#get-started"
              event="cta_clicked"
              properties={{ cta: "Get Started", location: "vs-eci-insearch-hero" }}
              className="w-full sm:w-auto text-center px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              Get Started
            </TrackedLink>
            <TrackedLink
              href="/try"
              event="cta_clicked"
              properties={{ cta: "Try It Live", location: "vs-eci-insearch-hero" }}
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
            Full suite vs. one&nbsp;tool that&nbsp;works
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
                ECI Insearch
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
                <p className="text-sm text-slate-500">{row.insearch}</p>
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
            Insearch renders a 3D model.
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
              What a 3D configurator shows
            </p>
          </div>
          <div className="aspect-[4/3] relative bg-slate-100">
            <Image
              src="/vs/3d-kitchen-render.webp"
              alt="Typical 3D configurator rendering of a kitchen"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[4/3] bg-slate-100">
            <Image
              src="/home-hero-generated.png"
              alt="Kitchen with buyer selections applied"
              fill
              sizes="100vw"
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
            <div className="aspect-[4/3] relative bg-slate-100">
              <Image
                src="/vs/3d-kitchen-render.webp"
                alt="Typical 3D configurator rendering of a kitchen"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="p-4 text-center">
              <p className="text-sm font-semibold text-slate-900">
                What a 3D configurator shows
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
                sizes="(max-width: 768px) 100vw, 50vw"
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
            Insearch builds a 3D model of each floorplan, then renders scenes
            for each option combination. Add a new countertop? The 3D team
            updates the model. Finch generates a visualization of each
            buyer&apos;s actual selections applied to your model home photos.
            New option? Live in minutes.
          </p>
        </div>

        {/* Mid-page CTA */}
        <div data-reveal style={revealStyle(260)} className="mt-12 text-center">
          <TrackedLink
            href="/try"
            event="cta_clicked"
            properties={{ cta: "See What It Looks Like", location: "vs-eci-insearch-mid" }}
            className="inline-block px-8 py-3.5 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-900 hover:text-slate-900 transition-colors"
          >
            Try It on Your Kitchen
          </TrackedLink>
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
            An enterprise suite before a single buyer sees&nbsp;it.
            <br />
            <span className="text-slate-500">Or $500/mo and&nbsp;done.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { stat: "Days", label: "First community live" },
            { stat: "$500", label: "Per plan, per month" },
            { stat: "Zero", label: "3D modeling required" },
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
            Insearch is built to work inside the ECI ecosystem: MarkSystems for
            ERP, Lasso for CRM, LotVue for lots. If you already run that stack,
            the integration is a selling point. If you don&apos;t, it&apos;s a
            barrier. Finch works with whatever you&apos;re already using and
            doesn&apos;t ask you to change.
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
          <p className="text-2xl md:text-3xl text-slate-800 leading-tight">
            Buyers upgrade what they can see. The ones reading a price sheet
            default to&nbsp;Standard.
          </p>
        </div>

        {/* Mid-page Calendly CTA */}
        <div data-reveal style={revealStyle(390)} className="text-center mt-12">
          <CalendlyPopupButton
            location="vs-eci-insearch-roi"
            className="inline-block px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Book a 15-Minute Walkthrough
          </CalendlyPopupButton>
          <p className="text-xs text-slate-400 mt-3">
            We&apos;ll plug in your actual numbers together.
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
            No 3D modeling. No ecosystem. Here&apos;s&nbsp;how.
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
              desc: "Your finishes, your pricing, your photos. No 3D modeling, no IT integration, no data entry on your end.",
            },
            {
              n: "03",
              title: "Buyers pick finishes and see the room\u00a0change",
              desc: "They export a priced selection sheet when they\u2019re done. Ready for your sales team in any CRM or ERP.",
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
            Insearch requires 3D modeling per floorplan, integration with the
            ECI ecosystem, and 8-12 weeks before buyers see anything. Finch
            takes a phone call and a few&nbsp;days.
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
            Built for builders who want results without the&nbsp;suite
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5 text-left max-w-2xl mx-auto"
          >
            <p>
              ECI Insearch is a strong product inside a specific ecosystem. If
              you already run MarkSystems, Lasso, and LotVue, adding Insearch
              to the stack makes sense. The integration is tight and the 3D
              visualizations are polished.
            </p>
            <p>
              But most builders don&apos;t run the ECI suite. And for them,
              buying Insearch means buying into an ecosystem they didn&apos;t
              plan for, at a price point that assumes enterprise scale. Finch
              gives you the upgrade visualization without the rest of the
              commitment. One tool, one job, any tech stack.
            </p>
            <p className="text-slate-800 font-medium">
              You send us your option sheets. We send you a working experience
              in days. Your buyers see their kitchen before they commit.
              That&apos;s&nbsp;it.
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
            The data is clear: visualization sells&nbsp;upgrades
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5 max-w-2xl mx-auto"
          >
            <p>
              ECI&apos;s own case study with Signature Homes reported +20%
              sales, 10-15% higher profits, and a 75% reduction in change
              orders. Other vendors in this space report 20-70% upgrade revenue
              lifts. The pattern is consistent across every company that
              measures it: buyers who see their selections spend more.
            </p>
            <p className="text-slate-800 font-medium">
              The lift comes from showing buyers what they&apos;re getting. Not
              from 3D rendering specifically, not from a particular vendor, and
              not from an enterprise&nbsp;suite.
            </p>
          </div>

          <div data-reveal style={revealStyle(160)} className="mt-8">
            <TrackedLink
              href="/research/visualization-lift"
              event="cta_clicked"
              properties={{ cta: "Read the Research", location: "vs-eci-insearch-validation" }}
              className="text-sm text-slate-700 underline underline-offset-2 hover:text-slate-900 transition-colors"
            >
              Read the full research: The Visualization Effect
            </TrackedLink>
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
            Common questions from builders evaluating&nbsp;Insearch
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

          {/* Related Research */}
          <div
            data-reveal
            style={revealStyle(90 + faqs.length * 70)}
            className="mt-14"
          >
            <p className="text-xs uppercase tracking-[0.16em] font-semibold text-slate-400 mb-5">
              Related Research
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <TrackedLink
                href="/research/visualization-lift"
                event="cta_clicked"
                properties={{ cta: "Visualization Lift", location: "vs-eci-insearch-crosslinks" }}
                className="group block border border-slate-200 p-5 hover:border-slate-400 transition-colors"
              >
                <p className="text-sm font-medium text-slate-900 group-hover:text-slate-700 mb-1">
                  The Visualization Effect
                </p>
                <p className="text-xs text-slate-500">
                  What happens when buyers can see their upgrades
                </p>
              </TrackedLink>
              <TrackedLink
                href="/research/hidden-revenue-line"
                event="cta_clicked"
                properties={{ cta: "Hidden Revenue Line", location: "vs-eci-insearch-crosslinks" }}
                className="group block border border-slate-200 p-5 hover:border-slate-400 transition-colors"
              >
                <p className="text-sm font-medium text-slate-900 group-hover:text-slate-700 mb-1">
                  The Hidden Revenue Line
                </p>
                <p className="text-xs text-slate-500">
                  SEC filings on upgrade revenue among public homebuilders
                </p>
              </TrackedLink>
            </div>
          </div>
        </div>
      </Section>

      {/* --- Get Started --- */}
      <GetStartedSection
        headline={<>Same upgrade lift.<br />No ecosystem&nbsp;required.</>}
        subtitle="One community. Live in days. Works with your existing stack."
      />

      <SiteFooter />

      {/* --- JSON-LD Structured Data --- */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline:
              "Finch vs ECI Insearch — Upgrade Visualization Without the ERP Commitment",
            description:
              "Comparing ECI Insearch and Finch for design center visualization? Finch works with any CRM, any ERP, and goes live in days.",
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
              "@id": "https://withfin.ch/vs/eci-insearch",
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
