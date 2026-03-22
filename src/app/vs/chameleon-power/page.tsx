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
import { ChameleonPowerPageTracker } from "../vs-client";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: {
    absolute:
      "Finch vs Chameleon Power — Swatch Swap vs. Photorealistic Visualization",
  },
  description:
    "Comparing Chameleon Power BuilderVision and Finch for design center visualization? Finch generates photorealistic images from your model home photos. No texture mapping. No scene prep.",
  alternates: { canonical: "https://withfin.ch/vs/chameleon-power" },
  openGraph: {
    title: "Finch vs Chameleon Power — Beyond Swatch Swapping",
    description:
      "Chameleon Power swaps textures on pre-staged scenes. Finch generates photorealistic images from your actual model home photos. See the difference.",
    url: "https://withfin.ch/vs/chameleon-power",
    siteName: "Finch",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finch vs Chameleon Power — Beyond Swatch Swapping",
    description:
      "Chameleon Power swaps textures on template scenes. Finch generates photorealistic images from your model home photos.",
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
  {
    label: "Technology",
    chameleon: "Texture swap on pre-staged scenes",
    finch: "Photorealistic generation from real photos",
  },
  {
    label: "Setup per floorplan",
    chameleon: "Scene photography + manual hotspot mapping",
    finch: "Send photos + option sheet",
  },
  {
    label: "Time to live",
    chameleon: "Weeks (scene prep + product mapping)",
    finch: "Under a week",
  },
  {
    label: "Buyer sees",
    chameleon: "Texture overlay on a template scene",
    finch: "Their actual room with selections applied",
  },
  {
    label: "New option added",
    chameleon: "Map new texture to every scene",
    finch: "Add to option list, live immediately",
  },
  {
    label: "Lighting & shadows",
    chameleon: "Static (from original photo)",
    finch: "Generated with material context",
  },
  {
    label: "Ecosystem",
    chameleon: "Best with Hyphen suite (BuildPro, BRIX, CRM)",
    finch: "Works with any CRM, any ERP, or none",
  },
  {
    label: "Pricing",
    chameleon: "Setup fee + monthly license (undisclosed)",
    finch: "$500/mo per plan",
  },
  {
    label: "Built for",
    chameleon: "Enterprise builders on the Hyphen ecosystem",
    finch: "Any production builder, any tech stack",
  },
];

const faqs = [
  {
    q: "Chameleon Power has been around for 20+ years. Why switch?",
    a: "Chameleon Power built the category of builder visualization tools and they\u2019ve earned the relationships they have. The question isn\u2019t whether they\u2019re established. It\u2019s whether texture swapping on pre-staged scenes is the best a buyer can see in 2026. Finch generates photorealistic images from your model home photos, so the output looks like the actual room, not a template with swatches pasted on.",
  },
  {
    q: "Chameleon offers AR and 3D. Does Finch?",
    a: "No. Finch does one thing: photorealistic upgrade visualization that increases revenue per home. If AR walkthroughs are a priority, Chameleon covers that. But the upgrade revenue lift comes from buyers seeing their selections in context before they commit, and Finch does that with less setup and more realistic output.",
  },
  {
    q: "We use BuildPro. Does Finch integrate with Hyphen?",
    a: "Finch doesn\u2019t require any ERP integration. Buyers pick selections, see them visualized, and export a priced selection sheet. Your team processes it in whatever system you already use. Finch sits alongside BuildPro without replacing anything.",
  },
  {
    q: "Chameleon claims 75% of visualizer users buy. Can Finch match that?",
    a: "That stat comes from Chameleon\u2019s own marketing and we haven\u2019t seen an independent source for it. What we do know from multiple sources across this space: buyers who see their selections visualized spend more on upgrades. The lift comes from showing them what they\u2019re getting, not from the specific rendering method.",
  },
  {
    q: "How does the visual quality compare?",
    a: "Chameleon maps product textures onto fixed scene images. The output looks like swatches applied to a template. Finch generates a new image from your model home photo with the buyer\u2019s actual selections, so materials interact with the room\u2019s lighting, angles, and surfaces the way they would in real life.",
  },
  {
    q: "What about Hyphen HomeSight?",
    a: "HomeSight is Hyphen\u2019s virtual design center product, powered by Chameleon Power\u2019s visualization underneath. If you\u2019re evaluating HomeSight specifically, the visualization comparison is the same. The difference is whether you need the full Hyphen ecosystem (BuildPro, BRIX, CRM) or just the visualization piece.",
  },
  {
    q: "We already use Chameleon. Can we switch?",
    a: "Yes. Send us your option sheets and model home photos. We can have your first floorplan live in under a week, running alongside Chameleon while you compare. No IT migration, no data export needed.",
  },
  {
    q: "Do we need IT involvement?",
    a: "No. Nothing to install, nothing to integrate, no servers to configure. We build it. Your buyers use a link. You get a priced selection sheet back.",
  },
];

export default function VsChameleonPowerPage() {
  return (
    <div className="min-h-screen bg-white">
      <RevealObserver />
      <ChameleonPowerPageTracker />
      <SiteNav />

      {/* --- Hero --- */}
      <section className="px-6 pt-14 pb-16 md:pt-18 md:pb-20 lg:pt-20 lg:pb-24 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p
            data-reveal
            style={revealStyle(60)}
            className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-6"
          >
            Finch vs Chameleon Power{" "}
            <span className="font-normal">&middot; Updated March 2026</span>
          </p>
          <h1
            data-reveal
            style={revealStyle(100)}
            className="text-[2.8rem] md:text-[3.6rem] lg:text-[4.4rem] leading-[0.95] text-slate-900 tracking-[-0.02em] mb-8"
          >
            Your buyers deserve more
            <br />
            than a swatch&nbsp;swap.
          </h1>
          <p
            data-reveal
            style={revealStyle(160)}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10"
          >
            Chameleon Power maps textures onto template scenes. Finch generates
            photorealistic images from your actual model home photos. Same
            category, better&nbsp;output.
          </p>
          <div
            data-reveal
            style={revealStyle(220)}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <TrackedLink
              href="#get-started"
              event="cta_clicked"
              properties={{
                cta: "Get Started",
                location: "vs-chameleon-power-hero",
              }}
              className="w-full sm:w-auto text-center px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              Get Started
            </TrackedLink>
            <TrackedLink
              href="/try"
              event="cta_clicked"
              properties={{
                cta: "Try It Live",
                location: "vs-chameleon-power-hero",
              }}
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
            Texture swap vs.&nbsp;photorealistic generation
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
                Chameleon Power
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
                <p className="text-sm text-slate-500">{row.chameleon}</p>
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
            Chameleon swaps a texture.
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
              What a swatch visualizer shows
            </p>
          </div>
          <div className="aspect-[4/3] relative bg-slate-100">
            <Image
              src="/vs/3d-kitchen-render.webp"
              alt="Typical swatch-based texture swap visualization of a kitchen"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[4/3] bg-slate-100">
            <Image
              src="/home-hero-generated.png"
              alt="Kitchen with buyer selections applied via Finch"
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
                alt="Typical swatch-based texture swap visualization of a kitchen"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="p-4 text-center">
              <p className="text-sm font-semibold text-slate-900">
                What a swatch visualizer shows
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
                alt="Kitchen with buyer selections applied via Finch"
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
            Chameleon Power maps product textures onto hotspots in a
            pre-photographed scene. The output is the same room image with
            different swatches overlaid. Finch generates a new image from your
            model home photo with the buyer&apos;s selections, so materials
            respond to the room&apos;s actual lighting and&nbsp;geometry.
          </p>
        </div>

        {/* Mid-page CTA */}
        <div data-reveal style={revealStyle(260)} className="mt-12 text-center">
          <TrackedLink
            href="/try"
            event="cta_clicked"
            properties={{
              cta: "See What It Looks Like",
              location: "vs-chameleon-power-mid",
            }}
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
            Scene prep and setup fees
            <br />
            before a single buyer sees&nbsp;it.
            <br />
            <span className="text-slate-500">Or $500/mo and&nbsp;done.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { stat: "Days", label: "First community live" },
            { stat: "$500", label: "Per plan, per month" },
            { stat: "Zero", label: "Scene prep required" },
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
            Chameleon Power&apos;s BuilderVision requires scene photography,
            manual hotspot mapping, and product texture preparation for every
            floorplan. The Hyphen ecosystem adds BuildPro, BRIX, and CRM on
            top. Finch works with whatever you already use and
            doesn&apos;t ask you to&nbsp;change.
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
            Buyers upgrade what they can see. A swatch board
            doesn&apos;t show them&nbsp;enough.
          </p>
        </div>

        {/* Mid-page Calendly CTA */}
        <div data-reveal style={revealStyle(390)} className="text-center mt-12">
          <CalendlyPopupButton
            location="vs-chameleon-power-roi"
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
            No scene mapping. No texture prep.
            <br />
            Here&apos;s&nbsp;how.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              n: "01",
              title:
                "Send us your option sheets and model home\u00a0photos",
              desc: "Whatever you have works. PDFs, spreadsheets, photos from your phone. We handle the formatting.",
            },
            {
              n: "02",
              title:
                "We build your branded upgrade\u00a0experience",
              desc: "Your finishes, your pricing, your photos. No scene mapping, no hotspot tagging, no texture prep on your end.",
            },
            {
              n: "03",
              title:
                "Buyers pick finishes and see the room\u00a0change",
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
            Chameleon Power requires scene photography, hotspot mapping, and
            product texture preparation per floorplan. Finch takes a phone call
            and a few&nbsp;days.
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
            Built for builders who want photorealistic
            results without the&nbsp;platform
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5 text-left max-w-2xl mx-auto"
          >
            <p>
              Chameleon Power helped define builder visualization. They serve
              some of the largest builders in North America through the Hyphen
              ecosystem, and their swatch-based approach was state of the art
              when it launched. That foundation has earned them real
              relationships.
            </p>
            <p>
              But swatch swapping on template scenes is a generation behind
              what buyers now expect. Finch starts from your actual model home
              photos and generates photorealistic images that show how
              materials look together in the real room, with real lighting and
              real geometry. No pre-staged scenes, no hotspot mapping, no
              texture libraries to maintain.
            </p>
            <p className="text-slate-800 font-medium">
              You send us your option sheets. We send you a working experience
              in days. Your buyers see their kitchen before they
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
            The data is clear: visualization sells&nbsp;upgrades
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5 max-w-2xl mx-auto"
          >
            <p>
              Chameleon Power claims 75% of visualizer users buy and a 34%
              conversion rate increase. Other vendors in this space report
              20-70% upgrade revenue lifts. None of these numbers come from
              independent studies, but the pattern is consistent across every
              company that measures it: buyers who see their selections spend
              more.
            </p>
            <p className="text-slate-800 font-medium">
              The lift comes from showing buyers what they&apos;re getting. Not
              from texture swapping specifically, not from a particular vendor,
              and not from an enterprise&nbsp;ecosystem.
            </p>
          </div>

          <div data-reveal style={revealStyle(160)} className="mt-8">
            <TrackedLink
              href="/research/visualization-lift"
              event="cta_clicked"
              properties={{
                cta: "Read the Research",
                location: "vs-chameleon-power-validation",
              }}
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
            Common questions from builders
            evaluating&nbsp;Chameleon&nbsp;Power
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
                properties={{
                  cta: "Visualization Lift",
                  location: "vs-chameleon-power-crosslinks",
                }}
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
                properties={{
                  cta: "Hidden Revenue Line",
                  location: "vs-chameleon-power-crosslinks",
                }}
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
        headline={
          <>
            Same upgrade lift.
            <br />
            Better visual&nbsp;quality.
          </>
        }
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
              "Finch vs Chameleon Power — Swatch Swap vs. Photorealistic Visualization",
            description:
              "Comparing Chameleon Power BuilderVision and Finch for design center visualization. Photorealistic generation vs. texture swapping.",
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
              "@id": "https://withfin.ch/vs/chameleon-power",
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
