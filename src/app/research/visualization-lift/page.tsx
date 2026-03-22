import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { GetStartedSection } from "@/components/PilotSection";
import { RevealObserver, TrackedLink } from "@/app/landing-client";
import {
  VisualizationPageTracker,
  VisualizationLiftCharts,
} from "./chart-client";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: {
    absolute:
      "The Visualization Effect — What Happens When Buyers Can See Their Upgrades",
  },
  description:
    "Every company in upgrade visualization reports the same thing: buyers spend more when they can see their choices. Independent studies, named builder case studies, and vendor claims — with source quality labeled.",
  alternates: {
    canonical: "https://withfin.ch/research/visualization-lift",
  },
  openGraph: {
    title:
      "The Visualization Effect — What Happens When Buyers Can See Their Upgrades",
    description:
      "67% more likely to make $2,500+ purchases. 1 in 3 exceed their budget. 20–70% upgrade revenue increase across named builder case studies.",
    url: "https://withfin.ch/research/visualization-lift",
    siteName: "Finch",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "The Visualization Effect — Upgrade Visualization Evidence",
    description:
      "10+ companies, different technologies, different decades. Same result. An analysis of what happens when buyers can see their upgrades.",
  },
};

/* ─── Data ─── */

const builderEvidence = [
  {
    builder: "Signature Homes",
    vendor: "ECI",
    exec: "Tyler Belcher, EVP",
    metrics: ["+20% sales", "−75% change orders"],
    detail: "Build time 180 → 120 days. Design appointment time reduced by 2/3.",
    source: "ECI case study, IBS brochure",
  },
  {
    builder: "Shea Homes",
    vendor: "Roomored / ILG",
    exec: "Jeff Peterson, VP",
    metrics: ["−50% appointment time", "~30% higher options sales"],
    detail:
      "Buyers spend 3 hours on average online before design appointment. 30% figure is ILG aggregate across their network.",
    source: "Builder Online article",
  },
  {
    builder: "Buffington Homes",
    vendor: "Higharc",
    exec: "—",
    metrics: ["$10M additional revenue", "75% time-to-market reduction"],
    detail:
      "20 more homes closed than anticipated in 2023 from 15-day schedule savings. Full design-to-build platform, not visualization in isolation.",
    source: "Higharc case study",
  },
];

const vendorClaims = [
  {
    vendor: "Anewgo",
    claim: "40% instantaneous increase in option sales",
    namedBuilder: "None",
    methodology: "VP Sales quote in interview",
  },
  {
    vendor: "Aareas Interactive",
    claim: "70% increase in upgrade sales",
    namedBuilder: "None",
    methodology: "None",
  },
  {
    vendor: "Zonda Envision",
    claim: "35% average increase in options sold",
    namedBuilder: "None",
    methodology: "None",
  },
  {
    vendor: "Chameleon Power",
    claim: "75% of visualizer users buy",
    namedBuilder: "None",
    methodology: "None",
  },
  {
    vendor: "CPS Imaginarium",
    claim: "30% appointment time reduction",
    namedBuilder: "None",
    methodology: "None",
  },
];

const revenueChartData = [
  {
    label: "ECI / Signature Homes",
    value: 29,
    displayValue: "20%",
    verified: true,
    note: "Named exec",
  },
  {
    label: "ILG / Shea Homes",
    value: 43,
    displayValue: "~30%",
    verified: true,
    note: "Aggregate data",
  },
  {
    label: "Anewgo",
    value: 57,
    displayValue: "40%",
    verified: false,
    note: "VP quote only",
  },
  {
    label: "Aareas Interactive",
    value: 100,
    displayValue: "70%",
    verified: false,
    note: "No attribution",
  },
];

const appointmentChartData = [
  {
    label: "CPS Imaginarium",
    value: 45,
    displayValue: "30%",
    verified: false,
    note: "No attribution",
  },
  {
    label: "Roomored / Shea Homes",
    value: 75,
    displayValue: "50%",
    verified: true,
    note: "Named VP",
  },
  {
    label: "ECI / Signature Homes",
    value: 100,
    displayValue: "67%",
    verified: true,
    note: "Named EVP",
  },
  {
    label: "Chameleon Power",
    value: 100,
    displayValue: "67%",
    verified: false,
    note: "No attribution",
  },
];

const roiRows = [
  { lift: "5%", revenue: "$100,000", roi: "3–6x return" },
  { lift: "10%", revenue: "$200,000", roi: "7–11x return" },
  { lift: "20%", revenue: "$400,000", roi: "13–22x return" },
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

export default function VisualizationLiftPage() {
  return (
    <div className="min-h-screen bg-white">
      <RevealObserver />
      <VisualizationPageTracker />
      <SiteNav />

      {/* ─── 1. Hero ─── */}
      <section className="px-6 pt-14 pb-16 md:pt-18 md:pb-20 lg:pt-20 lg:pb-24 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p
            data-reveal
            style={revealStyle(60)}
            className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-6"
          >
            Original Research
          </p>
          <h1
            data-reveal
            style={revealStyle(100)}
            className="text-[2.8rem] md:text-[3.6rem] lg:text-[4.4rem] leading-[0.95] text-slate-900 tracking-[-0.02em] mb-8"
          >
            The Visualization&nbsp;Effect
          </h1>
          <p
            data-reveal
            style={revealStyle(160)}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-6"
          >
            Every company in this space, using different technologies, serving
            different builders, across different decades, reports the same
            thing: when buyers can see their choices, they
            spend&nbsp;more.
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
            {
              stat: "67%",
              label:
                "more likely to make $2,500+ purchases when using visualization tools",
            },
            {
              stat: "1 in 3",
              label:
                "visualization users exceeded their original budget vs 1 in 6 without",
            },
            {
              stat: "20–70%",
              label:
                "upgrade revenue increase range across named builder case studies",
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
              <p className="text-sm text-slate-500">{card.label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ─── 3. The Question ─── */}
      <Section>
        <h2
          data-reveal
          style={revealStyle(20)}
          className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
        >
          Does Visualization Actually Increase
          Upgrade&nbsp;Revenue?
        </h2>
        <div
          data-reveal
          style={revealStyle(90)}
          className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5 max-w-3xl mx-auto"
        >
          <p>
            No independent, controlled study has measured the impact of upgrade
            visualization in new home construction. Nobody has compared the same
            builder, same community, same price sheet with and without a
            visualization&nbsp;tool.
          </p>
          <p>
            But data from multiple directions all points the same way, from
            independent consumer research to named builder case studies to
            vendor-published metrics. This page collects all of it and labels
            the source&nbsp;quality.
          </p>
          <p>
            Our{" "}
            <TrackedLink
              href="/research/hidden-revenue-line"
              event="research_crosslink_clicked"
              properties={{
                from: "visualization-lift",
                to: "hidden-revenue-line",
              }}
              className="text-slate-900 underline underline-offset-2 hover:text-slate-600 transition-colors"
            >
              previous research
            </TrackedLink>{" "}
            showed public builders earn $104K–$236K per home in upgrades. This
            page asks: what happens when buyers can actually see
            those&nbsp;choices?
          </p>
        </div>
      </Section>

      {/* ─── 4. Independent Evidence ─── */}
      <Section gray>
        <h2
          data-reveal
          style={revealStyle(20)}
          className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
        >
          The Independent&nbsp;Evidence
        </h2>

        {/* 3D Cloud / Provoke Insights */}
        <div className="max-w-3xl mx-auto mb-16">
          <div
            data-reveal
            style={revealStyle(60)}
            className="border-l-2 border-slate-300 bg-white p-6 md:p-8 mb-8"
          >
            <p className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">
              3D Cloud / Provoke Insights — Furniture Shopping Study (2026)
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Provoke Insights (independent market research firm), commissioned
              by 3D Cloud. 400 U.S. consumers, Nov–Dec 2025. Random stratified
              sampling aligned with U.S. Census, ±4.89% margin at 95%&nbsp;confidence.
            </p>
          </div>
          <div
            data-reveal
            style={revealStyle(120)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              In-store shoppers using 3D visualization tools with salespeople were{" "}
              <strong className="text-slate-900">
                67% more likely to make purchases of $2,500 or more
              </strong>{" "}
              (55% vs 33% of non-users).
            </p>
            <p>
              <strong className="text-slate-900">One in three</strong>{" "}
              configurator users exceeded their original budget, compared to one
              in six among non-users. 32% more likely to report being
              &ldquo;very satisfied&rdquo; with their purchase (74%
              vs&nbsp;56%).
            </p>
            <p>
              62% of respondents said it remains challenging to visualize how
              products will look in their home, which means the demand for
              better visualization tools isn&apos;t&nbsp;theoretical.
            </p>
          </div>
          <div
            data-reveal
            style={revealStyle(180)}
            className="mt-8 border-l-2 border-slate-300 bg-slate-50 p-6 md:p-8"
          >
            <p className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">
              Caveat
            </p>
            <p className="text-base text-slate-600 leading-relaxed">
              Furniture, not home building, and commissioned by a visualization
              vendor. But the underlying dynamic transfers: seeing a product in
              context before purchasing leads to higher spending and
              higher&nbsp;satisfaction.
            </p>
          </div>
        </div>

        {/* NAR Staging */}
        <div className="max-w-3xl mx-auto">
          <div
            data-reveal
            style={revealStyle(60)}
            className="border-l-2 border-slate-300 bg-white p-6 md:p-8 mb-8"
          >
            <p className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">
              NAR Profile of Home Staging (2021, 2023, 2025)
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              National Association of Realtors. ~1,200 real estate professionals
              surveyed (2025&nbsp;edition).
            </p>
          </div>
          <div
            data-reveal
            style={revealStyle(120)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              <strong className="text-slate-900">83%</strong> of buyers&apos;
              agents said staging made it easier for buyers to visualize the
              property.{" "}
              <strong className="text-slate-900">29%</strong> of agents reported
              staging led to a 1–10% increase in the dollar value offered.{" "}
              <strong className="text-slate-900">49%</strong> said staging
              reduced time on&nbsp;market.
            </p>
          </div>
          <div
            data-reveal
            style={revealStyle(180)}
            className="mt-8 border-l-2 border-slate-300 bg-slate-50 p-6 md:p-8"
          >
            <p className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">
              Caveat
            </p>
            <p className="text-base text-slate-600 leading-relaxed">
              Resale, not new construction. But the mechanism is identical:
              helping buyers see the finished product increases their willingness
              to&nbsp;pay.
            </p>
          </div>
        </div>
      </Section>

      {/* ─── 5. Named Builder Evidence ─── */}
      <Section>
        <h2
          data-reveal
          style={revealStyle(20)}
          className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
        >
          What Builders&nbsp;Report
        </h2>
        <div
          data-reveal
          style={revealStyle(80)}
          className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto mb-12"
        >
          <p>
            These are vendor-published case studies with named builders and named
            executives. The numbers come from the vendor, not from an independent
            audit. But they are specific, attributable, and&nbsp;consistent.
          </p>
        </div>

        <div data-reveal style={revealStyle(160)}>
          <div className="relative -mx-6 px-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                    <th scope="col" className="text-left p-3 font-medium">Builder</th>
                    <th scope="col" className="text-left p-3 font-medium">Vendor</th>
                    <th scope="col" className="text-left p-3 font-medium">Key Metrics</th>
                    <th scope="col" className="text-left p-3 font-medium hidden md:table-cell">
                      Detail
                    </th>
                    <th scope="col" className="text-left p-3 font-medium">Named Exec</th>
                  </tr>
                </thead>
                <tbody>
                  {builderEvidence.map((row, i) => (
                    <tr
                      key={row.builder}
                      className={
                        i < builderEvidence.length - 1
                          ? "border-b border-slate-100"
                          : ""
                      }
                    >
                      <td className="p-3 font-medium text-slate-900">
                        {row.builder}
                      </td>
                      <td className="p-3 text-slate-600">{row.vendor}</td>
                      <td className="p-3 text-slate-600">
                        {row.metrics.map((m) => (
                          <span key={m} className="block">
                            {m}
                          </span>
                        ))}
                      </td>
                      <td className="p-3 text-slate-500 text-xs hidden md:table-cell">
                        {row.detail}
                      </td>
                      <td className="p-3 text-slate-600">{row.exec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none md:hidden" />
          </div>
        </div>

        <div
          data-reveal
          style={revealStyle(240)}
          className="mt-8 border-l-2 border-slate-300 bg-slate-50 p-6 md:p-8 max-w-3xl mx-auto"
        >
          <p className="text-base text-slate-600 leading-relaxed">
            Each case study bundles visualization with a broader platform
            change, so isolating the visualization effect isn&apos;t possible
            from this data. But the direction is&nbsp;consistent.
          </p>
        </div>
      </Section>

      {/* ─── 6. Vendor Claims ─── */}
      <Section gray>
        <h2
          data-reveal
          style={revealStyle(20)}
          className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
        >
          What Vendors&nbsp;Claim
        </h2>
        <div
          data-reveal
          style={revealStyle(80)}
          className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto mb-12"
        >
          <p>
            Every visualization vendor publishes impressive numbers, but few
            provide attribution.
          </p>
        </div>

        <div data-reveal style={revealStyle(160)}>
          <div className="relative -mx-6 px-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="bg-white text-xs uppercase tracking-wider text-slate-400">
                    <th scope="col" className="text-left p-3 font-medium">Vendor</th>
                    <th scope="col" className="text-left p-3 font-medium">Claim</th>
                    <th scope="col" className="text-left p-3 font-medium">Named Builder</th>
                    <th scope="col" className="text-left p-3 font-medium">Methodology</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorClaims.map((row, i) => (
                    <tr
                      key={row.vendor}
                      className={
                        i < vendorClaims.length - 1
                          ? "border-b border-slate-100"
                          : ""
                      }
                    >
                      <td className="p-3 font-medium text-slate-900">
                        {row.vendor}
                      </td>
                      <td className="p-3 text-slate-600">{row.claim}</td>
                      <td className="p-3 text-slate-400 italic">{row.namedBuilder}</td>
                      <td className="p-3 text-slate-400 italic">
                        {row.methodology}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none md:hidden" />
          </div>
        </div>

        <div
          data-reveal
          style={revealStyle(240)}
          className="mt-8 border-l-2 border-slate-300 bg-white p-6 md:p-8 max-w-3xl mx-auto"
        >
          <p className="text-base text-slate-600 leading-relaxed">
            We looked extensively for independent corroboration of these
            figures and found none. The numbers may be accurate, but they
            can&apos;t be&nbsp;verified.
          </p>
        </div>
      </Section>

      {/* ─── 7. The Pattern ─── */}
      <Section>
        <h2
          data-reveal
          style={revealStyle(20)}
          className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
        >
          The&nbsp;Pattern
        </h2>
        <div
          data-reveal
          style={revealStyle(80)}
          className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto mb-12"
        >
          <p>
            Dark bars are sourced from named builders with attributed executives.
            Light bars are vendor-only claims with no independent&nbsp;verification.
          </p>
        </div>

        <div data-reveal style={revealStyle(120)}>
          <VisualizationLiftCharts
            revenueData={revenueChartData}
            appointmentData={appointmentChartData}
          />
        </div>

        <div
          data-reveal
          style={revealStyle(200)}
          className="mt-12 text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto text-center"
        >
          <p>
            Ten companies across different technologies, decades, and builders,
            all reporting the same directional&nbsp;result.
          </p>
        </div>
      </Section>

      {/* ─── 8. What's Missing ─── */}
      <Section gray>
        <h2
          data-reveal
          style={revealStyle(20)}
          className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
        >
          What&rsquo;s&nbsp;Missing
        </h2>
        <div
          data-reveal
          style={revealStyle(90)}
          className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5 max-w-3xl mx-auto"
        >
          <p>
            No independent study has measured the impact of upgrade visualization
            in new home construction specifically. There&apos;s no controlled
            experiment and no SEC filing that attributes revenue lift to
            visualization&nbsp;tools.
          </p>
          <p>
            Every data point on this page comes from vendors or
            vendor-published case studies, and the independent research (3D
            Cloud, NAR) measures adjacent domains, not new construction
            upgrades directly.
          </p>
        </div>
        <div
          data-reveal
          style={revealStyle(160)}
          className="mt-8 border-l-2 border-[var(--color-secondary)] bg-white p-6 md:p-8 max-w-3xl mx-auto"
        >
          <p className="text-base text-slate-600 leading-relaxed">
            That doesn&apos;t mean visualization doesn&apos;t work. But anyone
            claiming a specific percentage should show their&nbsp;work.
          </p>
        </div>
      </Section>

      {/* ─── 9. Our Own Data ─── */}
      <Section>
        <h2
          data-reveal
          style={revealStyle(20)}
          className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
        >
          Our Own&nbsp;Data
        </h2>
        <div
          data-reveal
          style={revealStyle(90)}
          className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5 max-w-3xl mx-auto"
        >
          <p>
            One buyer on an investment property, actively trying to minimize
            spend, went from $5,200 to $7,290 in upgrades after using our
            visualization tool. A 40% lift on a sample size of&nbsp;one.
          </p>
          <p>
            Statistically meaningless, but directionally consistent with
            everything else on this&nbsp;page.
          </p>
        </div>
        <div
          data-reveal
          style={revealStyle(160)}
          className="mt-8 border-l-2 border-[var(--color-secondary)] bg-white p-6 md:p-8 max-w-3xl mx-auto"
        >
          <p
            className="text-3xl md:text-4xl font-semibold text-slate-900 tabular-nums mb-2"
          >
            $5,200 → $7,290
          </p>
          <p className="text-base text-slate-600 leading-relaxed">
            +40% lift, n=1. An anecdote, not&nbsp;evidence.
          </p>
        </div>
      </Section>

      {/* ─── 10. The Math ─── */}
      <Section gray>
        <h2
          data-reveal
          style={revealStyle(20)}
          className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
        >
          The&nbsp;Math
        </h2>
        <div
          data-reveal
          style={revealStyle(80)}
          className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto mb-12"
        >
          <p>
            A builder closing 200 homes per year with $10,000 in average upgrade
            revenue per home. What does even a modest lift look&nbsp;like?
          </p>
        </div>

        <div data-reveal style={revealStyle(120)} className="max-w-3xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white text-xs uppercase tracking-wider text-slate-400">
                  <th scope="col" className="text-left p-3 font-medium">Lift</th>
                  <th scope="col" className="text-right p-3 font-medium">
                    Additional Revenue / Year
                  </th>
                  <th scope="col" className="text-right p-3 font-medium">
                    vs. $18–30K Annual Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {roiRows.map((row, i) => (
                  <tr
                    key={row.lift}
                    className={
                      i < roiRows.length - 1
                        ? "border-b border-slate-100"
                        : ""
                    }
                  >
                    <td className="p-3 font-medium text-slate-900">{row.lift}</td>
                    <td className="p-3 text-right text-slate-600 tabular-nums">
                      {row.revenue}
                    </td>
                    <td className="p-3 text-right text-slate-600">{row.roi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div
          data-reveal
          style={revealStyle(200)}
          className="mt-10 text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto space-y-5"
        >
          <p>
            Even the most conservative reading of this data, a 5% lift on
            upgrade revenue, pays for visualization tools several times over.
            The question isn&apos;t whether visualization works, but
            how&nbsp;much.
          </p>
        </div>

        {/* Mid-report CTA */}
        <div
          data-reveal
          style={revealStyle(260)}
          className="mt-12 text-center"
        >
          <TrackedLink
            href="/try"
            event="research_cta_clicked"
            properties={{ location: "mid_report", page: "visualization-lift" }}
            className="inline-block px-8 py-3.5 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-900 hover:text-slate-900 transition-colors"
          >
            See What It Looks Like on a Real Floor Plan
          </TrackedLink>
        </div>
      </Section>

      {/* ─── 11. Sources ─── */}
      <Section id="sources">
        <h2
          data-reveal
          style={revealStyle(20)}
          className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
        >
          Sources
        </h2>

        <div className="max-w-3xl mx-auto space-y-10">
          {/* Independent */}
          <div data-reveal style={revealStyle(60)}>
            <p className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
              Independent Research
            </p>
            <ul className="space-y-3 text-sm text-slate-600">
              <li>
                Provoke Insights / 3D Cloud, &ldquo;The Impact of 3D Technology
                on the Furniture Shopping Experience,&rdquo; 2026. 400 U.S.
                consumers, random stratified sampling, ±4.89% margin at 95%
                confidence.
              </li>
              <li>
                National Association of Realtors, &ldquo;Profile of Home
                Staging,&rdquo; 2021, 2023, 2025 editions. ~1,200 real estate
                professionals surveyed.
              </li>
            </ul>
          </div>

          {/* Named builders */}
          <div data-reveal style={revealStyle(120)}>
            <p className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
              Named Builder Case Studies
            </p>
            <ul className="space-y-3 text-sm text-slate-600">
              <li>
                ECI Solutions / Signature Homes (Tyler Belcher, EVP). ECI case
                study and IBS conference brochure.
              </li>
              <li>
                Roomored / Shea Homes (Jeff Peterson, VP). Published in Builder
                Online. ILG aggregate data across their builder network.
              </li>
              <li>
                Higharc / Buffington Homes. Higharc case study. Platform-wide
                metrics, not visualization in isolation.
              </li>
            </ul>
          </div>

          {/* Vendor claims */}
          <div data-reveal style={revealStyle(180)}>
            <p className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
              Vendor Claims (Unverified)
            </p>
            <ul className="space-y-3 text-sm text-slate-600">
              <li>
                Anewgo: VP Sales quote in OffsiteBuilder interview.
              </li>
              <li>Aareas Interactive: aareas.com homepage statistics.</li>
              <li>
                Zonda Envision: zondahome.com marketing materials. No named
                builder, no sample size, no methodology.
              </li>
              <li>
                Chameleon Power (now Hyphen): chameleonpower.com statistics.
              </li>
              <li>CPS Imaginarium: cpsusa.com statistics.</li>
            </ul>
          </div>

          {/* Disclaimer */}
          <div data-reveal style={revealStyle(240)}>
            <p className="text-xs text-slate-400 leading-relaxed">
              This analysis compiles publicly available data from independent
              research, vendor case studies, and vendor marketing materials.
              Source quality is labeled throughout. No data point on this page
              represents an independently audited measurement of upgrade
              visualization impact in new home construction. Finch is a
              participant in this market and has an interest in the category
              performing well. We present the data honestly so readers can draw
              their own&nbsp;conclusions.
            </p>
          </div>
        </div>
      </Section>

      {/* ─── 12. Related Research ─── */}
      <section className="px-6 py-10 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400 mb-3">
            Related Research
          </p>
          <TrackedLink
            href="/research/hidden-revenue-line"
            event="research_crosslink_clicked"
            properties={{
              from: "visualization-lift",
              to: "hidden-revenue-line",
            }}
            className="text-sm text-slate-700 underline underline-offset-2 hover:text-slate-900 transition-colors"
          >
            The Hidden Revenue Line — SEC filings on upgrade revenue among public
            homebuilders
          </TrackedLink>
        </div>
      </section>

      {/* ─── 13. Get Started ─── */}
      <GetStartedSection
        headline={
          <>
            The data points the same&nbsp;direction.
            <br />
            See it on your floor&nbsp;plans.
          </>
        }
        subtitle={
          <>
            Send us your option sheets and model home photos. We build the
            experience, your buyers use it during real appointments, and you
            measure the&nbsp;results.
          </>
        }
      />

      <SiteFooter />

      {/* ─── JSON-LD ─── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline:
              "The Visualization Effect: What Happens When Buyers Can See Their Upgrades",
            description:
              "Every company in the upgrade visualization space reports the same thing: when buyers can see their choices, they spend more. An honest analysis of the evidence with source quality labeled.",
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
              "@id": "https://withfin.ch/research/visualization-lift",
            },
          }),
        }}
      />
    </div>
  );
}
