import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PilotSection } from "@/components/PilotSection";
import { RevealObserver, TrackedLink } from "@/app/landing-client";
import { ResearchPageTracker, AnimatedBarCharts } from "./chart-client";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: {
    absolute:
      "The Hidden Revenue Line — Options & Upgrade Revenue Among Public Homebuilders",
  },
  description:
    "An analysis of SEC filings reveals how much public builders earn from options & upgrades. $104K–$224K per home, 8–27% of ASP, and a margin premium most builders never benchmark.",
  alternates: { canonical: "https://withfin.ch/research/hidden-revenue-line" },
  openGraph: {
    title:
      "The Hidden Revenue Line — Options & Upgrade Revenue Among Public Homebuilders",
    description:
      "SEC filings show Toll Brothers earns $206K per home in upgrades. PulteGroup: $104K. Most builders don't disclose — or benchmark — this revenue line at all.",
    url: "https://withfin.ch/research/hidden-revenue-line",
    siteName: "Finch",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Hidden Revenue Line — Upgrade Revenue Among Public Homebuilders",
    description:
      "SEC filings show $104K–$224K per home in upgrade revenue. An original analysis of 14 public builders.",
  },
};

/* ─── Data ─── */

const disclosedBuilders = [
  {
    builder: "Toll Brothers",
    segment: "Luxury",
    fy: "FY 2024",
    homes: "10,813",
    asp: "$976,900",
    upgradeRev: "$206,000",
    pctAsp: 24.9,
    barWidth: 94,
    source: "[1]",
    sourceLabel: "10-K, Earnings",
  },
  {
    builder: "Toll Brothers",
    segment: "Luxury",
    fy: "FY 2023",
    homes: "9,597",
    asp: "$1,028,000",
    upgradeRev: "$224,000",
    pctAsp: 26.5,
    barWidth: 100,
    source: "[2]",
    sourceLabel: "10-K, Earnings",
  },
  {
    builder: "Toll Brothers",
    segment: "Luxury",
    fy: "FY 2022",
    homes: "10,515",
    asp: "$923,600",
    upgradeRev: "$190,000",
    pctAsp: 25.3,
    barWidth: 95,
    source: "[2]",
    sourceLabel: "10-K, Earnings",
  },
  {
    builder: "Toll Brothers",
    segment: "Luxury",
    fy: "Q4 '24",
    homes: "—",
    asp: "—",
    upgradeRev: "$203,000",
    pctAsp: 24.0,
    barWidth: 91,
    source: "[1]",
    sourceLabel: "Q4 Earnings",
  },
  {
    builder: "PulteGroup",
    segment: "Mixed",
    fy: "Q2 '24",
    homes: "—",
    asp: "$549,000",
    upgradeRev: "$104,000",
    pctAsp: 18.9,
    barWidth: 71,
    source: "[5]",
    sourceLabel: "Q2 Earnings",
  },
];

const nonDisclosingBuilders = [
  {
    builder: "D.R. Horton",
    segment: "Entry-Level",
    revenue: "$34.0B",
    homes: "89,690",
    asp: "$379,000",
    strategy: "Express Homes brand; limited customization",
    disclosure: "Not disclosed",
  },
  {
    builder: "Lennar",
    segment: "Mixed",
    revenue: "—",
    homes: "—",
    asp: "$423,000",
    strategy: '"Everything\'s Included" bundles upgrades into base price',
    disclosure: "Not disclosed",
  },
  {
    builder: "NVR",
    segment: "Move-Up",
    revenue: "$10.3B",
    homes: "22,836",
    asp: "$450,700",
    strategy: "Options affect margins but not separately reported",
    disclosure: "Not disclosed",
  },
  {
    builder: "KB Home",
    segment: "Move-Up",
    revenue: "$6.9B",
    homes: "14,169",
    asp: "$487,000",
    strategy: "Design Studio is core brand identity; built-to-order model",
    disclosure: "Not disclosed",
  },
  {
    builder: "Meritage Homes",
    segment: "Entry-Level",
    revenue: "$6.3B",
    homes: "15,611",
    asp: "$406,200",
    strategy: "Redesigned selection: 20+ hrs to 3 hrs via curated collections",
    disclosure: "Wakefield study",
  },
  {
    builder: "Taylor Morrison",
    segment: "Move-Up",
    revenue: "—",
    homes: "—",
    asp: "—",
    strategy: "Tracks lot premiums and options as part of incentive strategy",
    disclosure: "Partial",
  },
  {
    builder: "Tri Pointe Homes",
    segment: "Move-Up",
    revenue: "—",
    homes: "—",
    asp: "—",
    strategy:
      "Buyers prefer incentive dollars in design studio over rate buydowns",
    disclosure: "Partial",
  },
  {
    builder: "Century Communities",
    segment: "Entry-Level",
    revenue: "—",
    homes: "—",
    asp: "—",
    strategy: "Monetizes through option upsells and service agreements",
    disclosure: "Not disclosed",
  },
  {
    builder: "M/I Homes",
    segment: "Mixed",
    revenue: "—",
    homes: "—",
    asp: "$497,000",
    strategy: "Smart Series (~50% of sales) with limited options",
    disclosure: "Not disclosed",
  },
  {
    builder: "Smith Douglas",
    segment: "Entry-Level",
    revenue: "$976M",
    homes: "—",
    asp: "$340,000",
    strategy: "Value-focused; limited upgrade program",
    disclosure: "Not disclosed",
  },
  {
    builder: "Dream Finders",
    segment: "Mixed",
    revenue: "—",
    homes: "—",
    asp: "—",
    strategy: "Tracks lot option fees in adjusted margin calculations",
    disclosure: "Not disclosed",
  },
  {
    builder: "Beazer Homes",
    segment: "Mixed",
    revenue: "—",
    homes: "—",
    asp: "—",
    strategy: "Asset-light lot option model",
    disclosure: "Not disclosed",
  },
];

const scenarioRows = [
  {
    scenario: "Conservative (10% weighted avg.)",
    totalRevenue: "~$120B",
    impliedOptions: "$12.0B",
  },
  {
    scenario: "Mid-range (15% weighted avg.)",
    totalRevenue: "~$120B",
    impliedOptions: "$18.0B",
  },
  {
    scenario: "High (20% weighted avg.)",
    totalRevenue: "~$120B",
    impliedOptions: "$24.0B",
  },
];

const disclosedChartData = [
  {
    label: "Toll Brothers (FY24)",
    value: 100,
    displayValue: "$206K",
    segment: "Luxury",
    note: "24.9% of ASP",
  },
  {
    label: "PulteGroup (Q2 '24)",
    value: 50,
    displayValue: "$104K",
    segment: "Mixed",
    note: "18.9% of ASP",
  },
  {
    label: "Robino-Corrozi (~300/yr)",
    value: 30,
    displayValue: "15–25%",
    segment: "Mixed",
    note: "Regional builder",
  },
];

const benchmarkChartData = [
  {
    label: "Luxury / Semi-Custom",
    value: 100,
    displayValue: "24–27%",
    segment: "Luxury",
    note: "Incl. structural + lot",
  },
  {
    label: "Move-Up",
    value: 70,
    displayValue: "12–20%",
    segment: "Move-Up",
    note: "Design center driven",
  },
  {
    label: "Entry-Level / Production",
    value: 45,
    displayValue: "8–15%",
    segment: "Entry-Level",
    note: "Limited selections",
  },
  {
    label: "Weighted Average",
    value: 55,
    displayValue: "10–15%",
    segment: "Mixed",
    note: "Design center only",
  },
];

/* ─── Helpers ─── */

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Try It", href: "/try" },
];

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

function SegmentTag({ segment }: { segment: string }) {
  const base =
    "inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium";
  const styles: Record<string, string> = {
    Luxury: `${base} bg-slate-900 text-white`,
    "Move-Up": `${base} bg-slate-200 text-slate-800`,
    "Entry-Level": `${base} border border-slate-300 text-slate-600 bg-white`,
    Mixed: `${base} bg-slate-100 text-slate-700`,
  };
  return <span className={styles[segment] ?? `${base} bg-slate-100 text-slate-700`}>{segment}</span>;
}

/* ─── Page ─── */

export default function HiddenRevenueLinePage() {
  return (
    <div className="min-h-screen bg-white">
      <RevealObserver />
      <ResearchPageTracker />
      <SiteNav
        links={NAV_LINKS}
        cta={{ label: "Start your pilot", href: "#pilot" }}
      />

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
            The Hidden Revenue&nbsp;Line
          </h1>
          <p
            data-reveal
            style={revealStyle(160)}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-6"
          >
            An analysis of SEC filings, earnings calls, and investor disclosures
            reveals how much public builders actually earn from lot premiums,
            design studio selections, and structural options&nbsp;&mdash; and
            what it means for the rest of the&nbsp;industry.
          </p>
          <p
            data-reveal
            style={revealStyle(200)}
            className="text-xs uppercase tracking-[0.16em] text-slate-400"
          >
            March 2026 &middot; Finch &middot; SEC EDGAR
          </p>
        </div>
      </section>

      {/* ─── 2. Stat Bar ─── */}
      <Section gray>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              stat: "$104K\u2013$224K",
              label:
                "Options & upgrade revenue per home among builders who disclose",
            },
            {
              stat: "8\u201327%",
              label:
                "of ASP attributable to options & upgrades depending on segment and process",
            },
            {
              stat: "3\u20135 pts",
              label: "Gross margin premium on build-to-order vs. spec homes",
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

      {/* ─── 3. The Upgrade Revenue Gap ─── */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            The Upgrade Revenue Gap Nobody Talks&nbsp;About
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              Public homebuilders file 10-K annual reports with the SEC. Some of
              the largest break out &ldquo;lot premiums, options, and
              upgrades&rdquo; as a measurable component of revenue. Most
              don&rsquo;t. The data is scattered across filings, earnings call
              transcripts, and investor presentations. Nobody has put it all in
              one&nbsp;place.
            </p>
            <p>
              We went through SEC filings and earnings disclosures from 14
              publicly traded homebuilders, supplemented by industry surveys and
              regional builder data, to pull out what we could about upgrade and
              options revenue. The picture: a revenue line that runs from
              8&ndash;15% of ASP for entry-level production builders to
              24&ndash;27% for luxury and semi-custom, generates higher margins
              than the base house, and gets almost no attention in industry&nbsp;benchmarking.
            </p>
            <p>
              This matters for every builder, public or private, 50 homes a year
              or 5,000. The gap between builders who optimize this line and those
              who don&rsquo;t is likely measured in hundreds of basis points
              of&nbsp;margin.
            </p>
          </div>
        </div>
      </Section>

      {/* ─── 4. What the Filings Show ─── */}
      <Section gray id="filings">
        <div className="max-w-3xl mx-auto mb-10">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            What the Filings&nbsp;Show
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              Of the 14 public builders we reviewed, only two disclose upgrade
              and options revenue at a level useful for benchmarking: Toll
              Brothers and PulteGroup. A third, Tri Pointe Homes, has publicly
              confirmed that buyers prefer incentive dollars directed to design
              studio selections over mortgage rate buydowns. The rest roll
              upgrade revenue into total home sales with no
              separate&nbsp;breakout.
            </p>
            <p>
              The industry&rsquo;s most margin-rich revenue stream is invisible
              in public financial&nbsp;reporting.
            </p>
          </div>
        </div>

        {/* Disclosed builders table */}
        <div data-reveal style={revealStyle(160)}>
          <div className="relative">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                    <th className="text-left p-3 font-medium">Builder</th>
                    <th className="text-left p-3 font-medium">Segment</th>
                    <th className="text-left p-3 font-medium">FY</th>
                    <th className="text-right p-3 font-medium">Homes</th>
                    <th className="text-right p-3 font-medium">ASP</th>
                    <th className="text-right p-3 font-medium">
                      Upgrades/Home
                    </th>
                    <th className="p-3 font-medium text-left">% of ASP</th>
                  </tr>
                </thead>
                <tbody>
                  {disclosedBuilders.map((row, i) => (
                    <tr
                      key={`${row.builder}-${row.fy}`}
                      className={
                        i < disclosedBuilders.length - 1
                          ? "border-b border-slate-100"
                          : ""
                      }
                    >
                      <td className="p-3 font-medium text-slate-900">
                        {row.builder}
                      </td>
                      <td className="p-3">
                        <SegmentTag segment={row.segment} />
                      </td>
                      <td className="p-3 text-slate-600">{row.fy}</td>
                      <td className="p-3 text-right text-slate-600 tabular-nums">
                        {row.homes}
                      </td>
                      <td className="p-3 text-right text-slate-600 tabular-nums">
                        {row.asp}
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-900 tabular-nums">
                        {row.upgradeRev}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="bg-slate-900 h-4"
                            style={{ width: `${row.barWidth}%`, maxWidth: 120 }}
                          />
                          <span className="text-slate-700 tabular-nums font-medium whitespace-nowrap">
                            {row.pctAsp}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none md:hidden" />
          </div>
        </div>

        {/* Post-table note */}
        <div
          data-reveal
          style={revealStyle(220)}
          className="max-w-3xl mx-auto mt-8"
        >
          <p className="text-base text-slate-600 leading-relaxed">
            Look at the percentages: Toll Brothers at ~$977K ASP consistently
            captures 24&ndash;27% of ASP in options. PulteGroup, a diversified
            builder at ~$549K ASP, captures ~19%. The absolute dollars differ,
            but the pattern is clear&nbsp;&mdash; upgrade revenue is a
            structural share of every home&nbsp;sold.
          </p>
        </div>

        {/* Callout */}
        <div
          data-reveal
          style={revealStyle(280)}
          className="max-w-3xl mx-auto mt-8 border-l-2 border-[var(--color-secondary)] bg-white p-6 md:p-8"
        >
          <p className="text-3xl md:text-4xl font-semibold text-slate-900 tabular-nums mb-2">
            $2.2 billion
          </p>
          <p className="text-base text-slate-600 leading-relaxed">
            Toll Brothers&rsquo; implied upgrade and options revenue in FY2024
            alone ($206K &times; 10,813 homes). Yearley has called the design
            studios &ldquo;highly accretive,&rdquo; noting they generate over
            $1 billion in annual sales. A standalone business inside
            a&nbsp;homebuilder.
          </p>
        </div>
      </Section>

      {/* ─── 5. Spec vs. Build-to-Order Gap ─── */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            The Spec vs. Build&#8209;to&#8209;Order&nbsp;Gap
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              The most revealing number in Toll Brothers&rsquo; disclosures
              isn&rsquo;t the $206K headline. It&rsquo;s what happens when you
              split spec vs. build-to-order.
            </p>
            <p>
              Between FY2023 and FY2024, Toll&rsquo;s spec mix rose from 27% to
              49% of deliveries. Per-home options dipped from $224K to $206K
              over the same period&nbsp;&mdash; a modest $18K decline despite
              nearly doubling the share of spec homes. Spec buyers spend less
              in the Design Studio than BTO buyers who select from scratch.
              That the per-home figure held up this well is the&nbsp;story.
            </p>
            <p>
              Toll Brothers has disclosed that BTO homes with full Design
              Studio engagement hold adjusted gross margins above 30%. The
              company&rsquo;s blended margin runs several hundred basis points
              lower, with spec homes dragging the average down. Most of that
              gap traces back to lower Design Studio revenue on
              spec&nbsp;homes.
            </p>
          </div>

          {/* Callout */}
          <div
            data-reveal
            style={revealStyle(160)}
            className="mt-8 border-l-2 border-[var(--color-secondary)] bg-slate-50 p-6 md:p-8"
          >
            <p className="text-3xl md:text-4xl font-semibold text-slate-900 tabular-nums mb-2">
              200&ndash;250 basis points
            </p>
            <p className="text-base text-slate-600 leading-relaxed">
              The gap between Toll Brothers&rsquo; blended gross margin
              (~28%) and their BTO margins (above 30%). BTO homes with full
              Design Studio engagement consistently outperform spec.
              Process determines&nbsp;revenue.
            </p>
          </div>

          <div
            data-reveal
            style={revealStyle(220)}
            className="mt-8 text-lg md:text-xl text-slate-600 leading-relaxed"
          >
            <p>
              Same builder. Same communities. Same base prices. Wildly different
              upgrade revenue depending on whether the buyer walks through a
              design studio or walks into a finished home. Upgrade revenue
              isn&rsquo;t about buyer wealth or home price. It&rsquo;s about how
              the builder runs the selection&nbsp;process.
            </p>
          </div>
        </div>
      </Section>

      {/* ─── 6. Upgrade Revenue by Segment (Charts) ─── */}
      <Section gray id="segments">
        <h2
          data-reveal
          style={revealStyle(20)}
          className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
        >
          Upgrade Revenue by Builder and&nbsp;Segment
        </h2>

        <div data-reveal style={revealStyle(90)}>
          <AnimatedBarCharts
            disclosedData={disclosedChartData}
            benchmarkData={benchmarkChartData}
          />
        </div>

        <div
          data-reveal
          style={revealStyle(160)}
          className="max-w-3xl mx-auto mt-8"
        >
          <p className="text-sm text-slate-500 leading-relaxed">
            Note: Toll Brothers&rsquo; 24&ndash;27% figure includes structural
            options and lot premiums alongside design studio selections. Pure
            design center spend (countertops, flooring, fixtures, smart home) is
            likely a lower share of ASP, though no builder breaks that out
            separately. The distinction matters: upgrade revenue is the sum of
            lot premiums, structural options, and design center selections, and
            each carries a different margin&nbsp;profile.
          </p>
        </div>
      </Section>

      {/* ─── 7. Remaining Builders ─── */}
      <Section>
        <div className="max-w-3xl mx-auto mb-10">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            What the Remaining Builders Reveal&nbsp;&mdash; and&nbsp;Conceal
          </h2>
          <p
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed"
          >
            The other 12 public builders we reviewed don&rsquo;t disclose
            upgrade revenue separately. But their filings, earnings calls, and
            investor presentations drop enough clues to fill in
            some&nbsp;blanks.
          </p>
        </div>

        <div data-reveal style={revealStyle(160)}>
          <div className="relative">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                    <th className="text-left p-3 font-medium">Builder</th>
                    <th className="text-left p-3 font-medium">Segment</th>
                    <th className="text-right p-3 font-medium">Revenue</th>
                    <th className="text-right p-3 font-medium">Homes</th>
                    <th className="text-right p-3 font-medium">ASP</th>
                    <th className="text-left p-3 font-medium">
                      Upgrade Strategy
                    </th>
                    <th className="text-left p-3 font-medium">Disclosure</th>
                  </tr>
                </thead>
                <tbody>
                  {nonDisclosingBuilders.map((row, i) => (
                    <tr
                      key={row.builder}
                      className={
                        i < nonDisclosingBuilders.length - 1
                          ? "border-b border-slate-100"
                          : ""
                      }
                    >
                      <td className="p-3 font-medium text-slate-900 whitespace-nowrap">
                        {row.builder}
                      </td>
                      <td className="p-3">
                        <SegmentTag segment={row.segment} />
                      </td>
                      <td className="p-3 text-right text-slate-600 tabular-nums">
                        {row.revenue}
                      </td>
                      <td className="p-3 text-right text-slate-600 tabular-nums">
                        {row.homes}
                      </td>
                      <td className="p-3 text-right text-slate-600 tabular-nums">
                        {row.asp}
                      </td>
                      <td className="p-3 text-slate-600 max-w-[200px]">
                        {row.strategy}
                      </td>
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {row.disclosure}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none md:hidden" />
          </div>
        </div>
      </Section>

      {/* ─── 8. What This Data Implies ─── */}
      <Section gray>
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            What This Data&nbsp;Implies
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              For move-up and semi-custom builders (the segment where most
              private builders compete), the range runs from roughly 12% to 20%
              of ASP. On a $400K average selling price, that&rsquo;s the
              difference between $48,000 and $80,000 in upgrade revenue
              per&nbsp;closing.
            </p>
            <p>
              Across 200 homes a year, that&rsquo;s a $6.4 million spread in
              revenue. At margins 3&ndash;5 points above the base house, the
              gross profit gap is roughly $2.5&ndash;3.5M.
            </p>
          </div>

          {/* Callout */}
          <div
            data-reveal
            style={revealStyle(160)}
            className="mt-8 border-l-2 border-[var(--color-secondary)] bg-white p-6 md:p-8"
          >
            <p className="text-3xl md:text-4xl font-semibold text-slate-900 tabular-nums mb-2">
              $6.4M annual revenue gap
            </p>
            <p className="text-base text-slate-600 leading-relaxed">
              The difference between a 200-home move-up builder capturing 12%
              vs. 20% of ASP in upgrade revenue, at a $400K average selling
              price. At option-level margins (3&ndash;5 points above base
              house), that&rsquo;s roughly $2.5&ndash;3.5M in additional
              gross&nbsp;profit.
            </p>
          </div>

          {/* Mid-report CTA */}
          <div
            data-reveal
            style={revealStyle(220)}
            className="mt-10 text-center"
          >
            <p className="text-base text-slate-500 mb-4">
              See what these numbers look like for your floor&nbsp;plans.
            </p>
            <TrackedLink
              href="/try"
              event="research_cta_clicked"
              properties={{ location: "mid_report" }}
              className="inline-block px-8 py-3.5 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-900 hover:text-slate-900 transition-colors"
            >
              Try It Live
            </TrackedLink>
          </div>
        </div>
      </Section>

      {/* ─── 9. The Margin Story ─── */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            The Margin&nbsp;Story
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              Earnings calls and industry research point the same direction:
              options and upgrades carry higher gross margins than the base
              house. KB Home&rsquo;s earnings data shows build-to-order homes
              running 3&ndash;5 percentage points above spec on gross margin.
              Toll Brothers&rsquo; BTO margins above 30% vs. a ~28% blended
              average tell a similar&nbsp;story.
            </p>
            <p>
              The reason is straightforward. Design studio selections and
              structural options are priced at retail, with limited competitive
              pressure. The buyer has already committed to the builder and the
              community. Material and labor costs for upgrades are well-known.
              And many of the highest-margin upgrades (lot premiums, elevation
              changes, extended patios) involve minimal
              incremental&nbsp;cost.
            </p>
            <p>
              Option margins also appear more resilient to incentive pressure
              than the base house price. When builders offer concessions, base
              prices compress. Design studio selections, priced at retail in a
              captive context, hold their&nbsp;margins.
            </p>
          </div>
        </div>
      </Section>

      {/* ─── 10. Buyer Psychology ─── */}
      <Section gray>
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            Buyer Psychology: Overspending, Stress, and&nbsp;Cancellations
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              The financial data is one piece. Buyer behavior is&nbsp;another.
            </p>
            <p>
              In 2020, Meritage Homes commissioned a study through Wakefield
              Research on the new home upgrade experience. The numbers: 45% of
              buyers exceeded their upgrade budget, overspending by an average
              of $21,000. One in four found the process stressful. And 37% said
              their finished homes didn&rsquo;t turn out as
              they&nbsp;expected.
            </p>
            <p>
              Meritage responded by redesigning the process from scratch. They
              cut design center time from 20+ hours per buyer to about 3 hours
              using curated collections. The idea: a faster, less stressful
              process could maintain upgrade revenue while cutting friction and
              buyer&nbsp;regret.
            </p>
          </div>

          {/* Callout */}
          <div
            data-reveal
            style={revealStyle(160)}
            className="mt-8 border-l-2 border-[var(--color-secondary)] bg-white p-6 md:p-8"
          >
            <p className="text-3xl md:text-4xl font-semibold text-slate-900 tabular-nums mb-2">
              45%
            </p>
            <p className="text-base text-slate-600 leading-relaxed">
              of buyers exceeded their upgrade budget by $21K+ on average.
              Meritage Homes / Wakefield Research, 2020. On an ASP of ~$400K,
              buyers planned to spend one amount on upgrades and spent
              considerably more. The experience itself drives revenue beyond
              what buyers initially&nbsp;intend.
            </p>
          </div>

          <div
            data-reveal
            style={revealStyle(220)}
            className="mt-8 text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              Then there&rsquo;s retention. Toll Brothers has historically
              averaged a cancellation rate in the low single digits&nbsp;&mdash;
              roughly 2&ndash;3%, well below the industry average. Yearley
              attributes part of that to the attachment buyers build through the
              design studio process. Once you&rsquo;ve spent hours picking
              finishes and making a home yours, you&rsquo;re less inclined to
              walk&nbsp;away.
            </p>
            <p>
              Both Toll and Tri Pointe have said on earnings calls that buyers
              prefer incentive dollars directed toward design studio upgrades
              over mortgage rate reductions. The upgrade experience becomes its
              own form of switching&nbsp;cost.
            </p>
            <p>
              Cancellations are among the most expensive events in homebuilding:
              remarketing costs, price reductions, carrying costs, lost momentum
              in the community. If a well-run upgrade process reduces
              cancellations even modestly, the avoided cost goes straight
              to&nbsp;margin.
            </p>
          </div>
        </div>
      </Section>

      {/* ─── 11. Why This Data Doesn't Exist ─── */}
      <Section>
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            Why This Data Doesn&rsquo;t Exist&nbsp;Elsewhere
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              Three reasons this data doesn&rsquo;t&nbsp;exist:
            </p>
            <p>
              <strong className="text-slate-900">
                SEC disclosure standards don&rsquo;t require it.
              </strong>{" "}
              Revenue from options and upgrades is not a separately reportable
              segment under GAAP. Builders include it in &ldquo;homebuilding
              revenue&rdquo; and have no obligation to break it out. Only those
              with a strategic reason to highlight the metric&nbsp;&mdash; Toll
              Brothers using it to demonstrate ASP resilience, PulteGroup to
              explain margin performance&nbsp;&mdash; choose to&nbsp;disclose.
            </p>
            <p>
              <strong className="text-slate-900">
                Competitive sensitivity.
              </strong>{" "}
              Option pricing, attach rates, and design studio profitability are
              among the most competitively sensitive metrics in the industry.
              Builders who have built effective upgrade programs have little
              incentive to quantify them&nbsp;publicly.
            </p>
            <p>
              <strong className="text-slate-900">No standard taxonomy.</strong>{" "}
              &ldquo;Lot premiums&rdquo; may include community premiums,
              homesite premiums, or view premiums. &ldquo;Structural
              options&rdquo; may include elevation changes, room additions, or
              garage expansions. &ldquo;Design selections&rdquo; may include
              everything from countertops to smart home packages. There is no
              industry-standard definition, making comparison difficult even
              where data&nbsp;exists.
            </p>
          </div>

          {/* Lennar warning callout */}
          <div
            data-reveal
            style={revealStyle(160)}
            className="mt-8 border-l-2 border-slate-300 bg-slate-50 p-6 md:p-8"
          >
            <p className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">
              A note on Lennar&rsquo;s &ldquo;Everything&rsquo;s Included&rdquo;&nbsp;model
            </p>
            <p className="text-base text-slate-600 leading-relaxed">
              Lennar bundles many upgrades into the base price as a standard
              feature package, making direct comparison impossible. Their model
              effectively embeds upgrade revenue into ASP rather than reporting
              it separately. It&rsquo;s a different strategy
              entirely&nbsp;&mdash; prioritizing operational efficiency over
              per-home customization&nbsp;revenue.
            </p>
          </div>
        </div>
      </Section>

      {/* ─── 12. What This Means for Private Builders ─── */}
      <Section gray>
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            What This Means for Private&nbsp;Builders
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              Private builders don&rsquo;t file with the SEC. Most of the
              tens of thousands of active homebuilders in the U.S. also don&rsquo;t
              benchmark upgrade revenue against peers, because no peer dataset
              has&nbsp;existed.
            </p>
            <p>
              A few things stand out when you combine the public data with
              what limited regional builder data&nbsp;exists:
            </p>
            <p>
              <strong className="text-slate-900">
                The range within each segment is wider than most builders
                realize.
              </strong>{" "}
              Entry-level builders may assume 8&ndash;10% is normal, but
              Robino-Corrozi, a ~300-home regional builder,
              reported that lower-end buyers spent 15&ndash;25% of selling price
              on upgrades, and that adding a formal design center increased
              option revenue by roughly 10% over the model home-only approach.
              The gap between &ldquo;typical&rdquo; and &ldquo;optimized&rdquo;
              exists at every price&nbsp;point.
            </p>
            <p>
              <strong className="text-slate-900">
                Process matters more than price point.
              </strong>{" "}
              The Toll Brothers spec vs. BTO data is the clearest proof: the same
              builder, in the same communities, at the same base prices,
              generates an estimated $80&ndash;100K more in upgrade revenue per
              home when buyers go through the design studio process rather than
              buying spec. A private builder doing 100 homes at $400K ASP who
              moves from 10% to 16% in upgrade capture adds $2.4M in annual
              revenue at above-average&nbsp;margins.
            </p>
            <p>
              <strong className="text-slate-900">
                The most-cited industry benchmark is nearly two decades old.
              </strong>{" "}
              The ProBuilder buyer survey from 2007, which established the
              commonly referenced 10&ndash;20% range for design center spend,
              is still the most-cited source in the industry. Nothing
              comprehensive has been published since. Buyer expectations,
              design studio operations, and the universe of available upgrades
              look nothing like they did in 2007. This analysis is a step
              toward a current&nbsp;benchmark.
            </p>
            <p>
              <strong className="text-slate-900">
                Upgrade investment correlates with retention.
              </strong>{" "}
              Toll Brothers&rsquo; historically low cancellation rate
              (averaging roughly 2&ndash;3%) is partially attributed to
              the emotional attachment created by the design studio process. For
              a builder doing 200 homes a year, cutting cancellation rates from
              15% to 10% avoids 10 lost sales, their associated remarketing
              costs, and the community momentum disruption that&nbsp;follows.
            </p>
            <p>
              <strong className="text-slate-900">
                The trend favors builders who invest in the upgrade experience.
              </strong>{" "}
              Tri Pointe Homes confirming that buyers prefer design studio
              incentive dollars over rate buydowns, Ashton Woods describing
              design studios as strategic margin drivers, and Meritage Homes
              rebuilding their selection process from the ground up all signal
              that the best builders treat this as a primary revenue
              lever, not a back-office&nbsp;function.
            </p>
          </div>
        </div>
      </Section>

      {/* ─── 13. Implied Upgrade Revenue ─── */}
      <Section>
        <div className="max-w-3xl mx-auto mb-10">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            Implied Upgrade Revenue Across the Public Builder&nbsp;Universe
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5"
          >
            <p>
              Using the segment-specific ranges established above and the
              disclosed data points as anchors, we can estimate the total upgrade
              revenue pool across public&nbsp;builders:
            </p>
          </div>
        </div>

        <div data-reveal style={revealStyle(160)}>
          <div className="relative max-w-3xl mx-auto">
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                    <th className="text-left p-3 font-medium">Scenario</th>
                    <th className="text-right p-3 font-medium">
                      Total Revenue (Top 10)
                    </th>
                    <th className="text-right p-3 font-medium">
                      Implied Options Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioRows.map((row, i) => (
                    <tr
                      key={row.scenario}
                      className={
                        i < scenarioRows.length - 1
                          ? "border-b border-slate-100"
                          : ""
                      }
                    >
                      <td className="p-3 text-slate-700">{row.scenario}</td>
                      <td className="p-3 text-right text-slate-600 tabular-nums">
                        {row.totalRevenue}
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-900 tabular-nums">
                        {row.impliedOptions}
                      </td>
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
          style={revealStyle(220)}
          className="max-w-3xl mx-auto mt-8 text-lg md:text-xl text-slate-600 leading-relaxed"
        >
          <p>
            Even at the conservative estimate, options and upgrades represent a
            $12+ billion revenue category among the top 10 public builders
            alone. Add in the tens of thousands of private builders and the total
            market is far larger. And unlike base home pricing, which is boxed
            in by appraisals, comparables, and competitive pressure, upgrade
            revenue responds directly to how well the builder presents the
            selection&nbsp;experience.
          </p>
        </div>
      </Section>

      {/* ─── 14. Methodology ─── */}
      <Section gray id="methodology">
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            Methodology
          </h2>
          <ol
            data-reveal
            style={revealStyle(90)}
            className="text-base text-slate-600 leading-relaxed space-y-4 list-decimal list-inside"
          >
            <li>
              <strong className="text-slate-700">Filing review.</strong> We
              reviewed 10-K annual reports for 14 publicly traded homebuilders
              filed with the SEC via EDGAR, covering fiscal years 2022&ndash;2025.
            </li>
            <li>
              <strong className="text-slate-700">
                Earnings call extraction.
              </strong>{" "}
              Where 10-Ks did not contain upgrade-specific disclosures, we
              reviewed quarterly earnings call transcripts through Q2 FY2025 for
              references to lot premiums, options, upgrades, design studio
              revenue, or related metrics.
            </li>
            <li>
              <strong className="text-slate-700">
                Investor presentation review.
              </strong>{" "}
              We cross-referenced earnings data with investor presentations and
              analyst day materials where available.
            </li>
            <li>
              <strong className="text-slate-700">
                Industry surveys and trade data.
              </strong>{" "}
              We referenced NAHB&rsquo;s Cost of Doing Business Study, the
              ProBuilder buyer survey (2007), the Meritage Homes / Wakefield
              Research study (2020), regional builder case studies
              (Robino-Corrozi), and trade publication analyses from ProBuilder,
              Builder, and Professional Builder.
            </li>
            <li>
              <strong className="text-slate-700">
                Segment classification.
              </strong>{" "}
              Builders were classified by primary market segment (luxury,
              move-up, entry-level, mixed) based on ASP and self-reported
              positioning. Benchmark ranges by segment were synthesized from all
              available data points.
            </li>
          </ol>
          <p
            data-reveal
            style={revealStyle(160)}
            className="mt-6 text-sm text-slate-500 leading-relaxed"
          >
            <strong>Limitations:</strong> This analysis relies on publicly
            available disclosures, which vary significantly by builder. Segment
            benchmark ranges (8&ndash;15%, 12&ndash;20%, 24&ndash;27%) are
            synthesized from limited data points and should be treated as
            directional. Toll Brothers&rsquo; disclosed figure includes
            structural options and lot premiums alongside design studio
            selections; pure design center spend is lower. Lennar&rsquo;s
            &ldquo;Everything&rsquo;s Included&rdquo; model is structurally
            non-comparable. No comprehensive industry survey on upgrade spending
            has been published since ProBuilder&rsquo;s 2007 study.
          </p>
        </div>
      </Section>

      {/* ─── 15. Sources ─── */}
      <Section id="sources">
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 text-center mb-10"
          >
            Sources
          </h2>

          <div
            data-reveal
            style={revealStyle(90)}
            className="space-y-8 text-sm text-slate-600 leading-relaxed"
          >
            {/* SEC Filings */}
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">
                SEC Filings &amp; Earnings Calls
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  <strong>Toll Brothers FY2024 10-K &amp; Earnings.</strong>{" "}
                  10,813 homes, ~$977K ASP, $206K in design studio upgrades,
                  structural options, and lot premiums per home.{" "}
                  <a
                    href="https://investors.tollbrothers.com/news-and-events/press-releases/2024/12-09-2024-213038989"
                    className="underline underline-offset-2 hover:text-slate-900"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Earnings Release
                  </a>
                  ;{" "}
                  <a
                    href="https://investors.tollbrothers.com/~/media/Files/T/TollBrothers-IR/documents/annual-reports/2024-tol-annual-final.pdf"
                    className="underline underline-offset-2 hover:text-slate-900"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Annual Report (PDF)
                  </a>
                  .
                </li>
                <li>
                  <strong>Toll Brothers FY2023 10-K &amp; Earnings.</strong>{" "}
                  ~9,597 homes, ~$1,028K ASP, $224K in options per home.{" "}
                  <a
                    href="https://investors.tollbrothers.com/news-and-events/press-releases/2023/12-05-2023-150146386"
                    className="underline underline-offset-2 hover:text-slate-900"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Earnings Release
                  </a>
                  .
                </li>
                <li>
                  <strong>Toll Brothers Q1 FY2025 Earnings.</strong> Design
                  studio upgrades, structural options, and lot premiums averaged
                  $200K, or ~25% of base sales price.
                </li>
                <li>
                  <strong>Toll Brothers Spec vs. BTO Data.</strong> Spec mix
                  rose 27% to 49% FY2023&ndash;FY2024. BTO adjusted gross
                  margins above 30% vs. ~28% blended. Historically low
                  cancellation rate (~2&ndash;3%) attributed to design studio attachment.
                </li>
                <li>
                  <strong>PulteGroup Q2 2024 Earnings.</strong> Options and lot
                  premiums of $104K per home, $549K ASP (~19% of ASP).{" "}
                  <a
                    href="https://seekingalpha.com/article/4705844-pultegroup-inc-phm-q2-2024-earnings-call-transcript"
                    className="underline underline-offset-2 hover:text-slate-900"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Q2 Transcript
                  </a>
                  .
                </li>
                <li>
                  <strong>Tri Pointe Homes Q3 2025 Earnings.</strong> Buyers
                  prefer incentive dollars in design studio over rate buydowns.
                </li>
                <li>
                  <strong>D.R. Horton FY2024.</strong> $34.0B revenue, 89,690
                  closings, ~$379K ASP.{" "}
                  <a
                    href="https://investor.drhorton.com/~/media/Files/D/D-R-Horton-IR/press-release/q4-and-fy24-earnings-release.pdf"
                    className="underline underline-offset-2 hover:text-slate-900"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Earnings Release (PDF)
                  </a>
                  .
                </li>
                <li>
                  <strong>NVR FY2024.</strong> $10.29B revenue, 22,836 homes,
                  ~$450.7K ASP. Zero upgrade disclosure.
                </li>
                <li>
                  <strong>KB Home FY2024.</strong> $6.93B revenue, 14,169 homes,
                  ~$487K ASP.
                </li>
                <li>
                  <strong>Meritage Homes FY2024.</strong> $6.3B revenue, 15,611
                  homes, ~$406K ASP.
                </li>
              </ol>
            </div>

            {/* Industry */}
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">
                Industry Surveys &amp; Trade Publications
              </p>
              <ol className="list-decimal list-inside space-y-2" start={11}>
                <li>
                  <strong>
                    ProBuilder, &ldquo;Design Centers Capture
                    Customers&rdquo; (2007).
                  </strong>{" "}
                  Buyers spend 10&ndash;20% of selling price on options.
                  Robino-Corrozi: 15&ndash;25% for lower-end buyers; design
                  center added ~10% more option revenue.{" "}
                  <a
                    href="https://www.probuilder.com/homebuilders-design-centers-capture-customers"
                    className="underline underline-offset-2 hover:text-slate-900"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ProBuilder
                  </a>
                  .
                </li>
                <li>
                  <strong>
                    ProBuilder, &ldquo;Margin vs. Markup&rdquo;.
                  </strong>{" "}
                  Margin vs. markup analysis using $20K options on $200K home
                  (10%) as baseline example.{" "}
                  <a
                    href="https://www.probuilder.com/home/article/55229316/margin-vs-markup-the-true-impact-of-pricing-decisions-on-home-builder-profits"
                    className="underline underline-offset-2 hover:text-slate-900"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ProBuilder
                  </a>
                  .
                </li>
                <li>
                  <strong>
                    Builder Magazine, &ldquo;Meritage Homes Takes a New Design
                    Center Tack.&rdquo;
                  </strong>{" "}
                  45% of buyers exceeded budget by $21K+. Meritage launched
                  &ldquo;Design Collections&rdquo; to cut process from 20+ hours
                  to ~3 hours.
                </li>
                <li>
                  <strong>
                    Builder Magazine, &ldquo;Upgrades: The Art and
                    Science.&rdquo;
                  </strong>{" "}
                  Ashton Woods design studios described as strategic margin
                  drivers on $400K&ndash;$500K ASP homes.
                </li>
              </ol>
            </div>

            {/* Derived */}
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">
                Derived Estimates
              </p>
              <ol className="list-decimal list-inside space-y-2" start={15}>
                <li>
                  <strong>
                    Toll Brothers spec vs. BTO gap ($80&ndash;100K).
                  </strong>{" "}
                  Derived from per-home options decline as spec mix increased.
                  Not a figure disclosed by the company.
                </li>
                <li>
                  <strong>
                    Segment benchmark ranges (8&ndash;15%, 12&ndash;20%,
                    24&ndash;27%).
                  </strong>{" "}
                  Synthesized from Toll Brothers, PulteGroup, Robino-Corrozi,
                  and ProBuilder&rsquo;s 10&ndash;20% general range.
                </li>
                <li>
                  <strong>
                    $2.2B implied Toll Brothers upgrade revenue.
                  </strong>{" "}
                  Calculated: $206K &times; 10,813 homes.
                </li>
                <li>
                  <strong>$6.4M revenue gap for 200-home builder.</strong>{" "}
                  Calculated: ($80K &ndash; $48K) &times; 200 homes at $400K
                  ASP.
                </li>
              </ol>
            </div>

            {/* Not found */}
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">
                Data Not Found
              </p>
              <p>
                NVR/Ryan Homes, Dream Finders Homes, Century Communities, Smith
                Douglas, M/I Homes, Taylor Morrison, and Beazer Homes do not
                disclose upgrade revenue metrics in accessible public filings.
                NAHB and John Burns Real Estate Consulting likely hold
                proprietary data not publicly available. The most recent
                comprehensive industry survey on design center upgrade spending
                (ProBuilder, 2007) is nearly two decades&nbsp;old.
              </p>
            </div>
          </div>

          <p className="mt-10 text-[11px] text-slate-400 leading-relaxed">
            Data sourced from SEC EDGAR filings, public earnings call
            transcripts, and investor presentations. All figures represent
            publicly available information as of March 2026. This analysis is
            for informational purposes and does not constitute financial advice.
            Builder-specific figures are based on management disclosures and may
            not reflect audited breakdowns.
          </p>
        </div>
      </Section>

      {/* ─── 16. Pilot Section ─── */}
      <PilotSection
        headline={
          <>
            The data is clear.
            <br />
            Process drives upgrade&nbsp;revenue.
          </>
        }
        subtitle="See what your buyers choose when they can see their selections applied to your model home photos. One floor plan. Free to set up. Live in 48 hours."
      />

      <SiteFooter />

      {/* ─── 18. JSON-LD ─── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline:
              "The Hidden Revenue Line: Options & Upgrade Revenue Among Public Homebuilders",
            description:
              "An analysis of SEC filings reveals how much public builders earn from options & upgrades — $104K–$224K per home, 8–27% of ASP, and a margin premium most builders never benchmark.",
            datePublished: "2026-03-13",
            dateModified: "2026-03-13",
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
              "@id": "https://withfin.ch/research/hidden-revenue-line",
            },
          }),
        }}
      />

    </div>
  );
}
