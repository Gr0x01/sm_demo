import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { GetStartedSection } from "@/components/PilotSection";
import { RevealObserver, TrackedLink } from "@/app/landing-client";

export const metadata: Metadata = {
  title: { absolute: "Pricing — Finch" },
  description:
    "$500/mo per floor plan. No setup fees, no usage caps, no per-session charges. Done-for-you upgrade visualization for home builders.",
  alternates: { canonical: "https://withfin.ch/pricing" },
  openGraph: {
    title: "Pricing — Finch",
    description:
      "$500/mo per floor plan. No setup fees. No usage caps. Done-for-you upgrade visualization for home builders.",
    url: "https://withfin.ch/pricing",
    siteName: "Finch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — Finch",
    description:
      "$500/mo per floor plan. No setup fees. No usage caps. Done-for-you upgrade visualization for home builders.",
  },
};

const revealStyle = (delay: number): CSSProperties => ({
  ["--reveal-delay" as string]: `${delay}ms`,
});

const INCLUDED = [
  "Done-for-you setup: option transcription, swatch sourcing, photo pipeline, prompt tuning, QA",
  "10 room photos per floor plan, fully built through our pipeline",
  "Unlimited buyer visualizations, no session limits",
  "Real-time price tracking across all selections",
  "Admin dashboard to update pricing, options, and swatches yourself",
  "Priced selection sheet export for every buyer session",
  "Ongoing support for option updates, price changes, and photo swaps",
];

const ROI_ROWS = [
  { homes: "50", plans: "3", cost: "$18,000", lift: "$50,000", roi: "2.8x" },
  { homes: "100", plans: "5", cost: "$30,000", lift: "$100,000", roi: "3.3x" },
  { homes: "200", plans: "8", cost: "$48,000", lift: "$200,000", roi: "4.2x" },
  { homes: "500", plans: "15", cost: "$90,000", lift: "$500,000", roi: "5.6x" },
];

const FAQS = [
  {
    q: "Why no setup fee?",
    a: "Our setup process is largely automated. The hard cost per floor plan is low enough that charging upfront just slows things down. We\u2019d rather get you live and let the monthly revenue speak for itself.",
  },
  {
    q: "What\u2019s the minimum commitment?",
    a: "3 floor plans ($1,500/mo). Builders with a single plan don\u2019t get enough coverage to see real impact. Three plans means your best-selling communities are covered and buyers are seeing their upgrades consistently.",
  },
  {
    q: "What happens after the first community?",
    a: "If the upgrade numbers look right, you expand to 3+ plans on a 12-month agreement. If they don\u2019t, you walk away. We don\u2019t lock anyone in before the product has proven itself with their buyers.",
  },
  {
    q: "Can we add floor plans later?",
    a: "Yes. Add plans anytime at $500/mo each. Additional floor plans are typically live within a day or two once we have your option sheets and photos.",
  },
  {
    q: "What\u2019s included in ongoing support?",
    a: "Option and pricing updates, swatch changes, occasional photo swaps. If your supplier changes a countertop line or you adjust pricing for a new quarter, we handle it. You can also make changes yourself through the admin dashboard.",
  },
  {
    q: "How does this compare to Envision or ECI?",
    a: "Those platforms run $50K\u2013$200K+ per year with 8\u201312 weeks of 3D scene setup per community. Finch is $500/mo per plan, live in days, and we handle all the setup. Different approach, different price point, same goal: more upgrade revenue per home.",
  },
];

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

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border-b border-slate-200">
      <summary className="flex items-center justify-between py-5 cursor-pointer list-none">
        <span className="text-base text-slate-900 font-medium pr-4">{q}</span>
        <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl leading-none shrink-0">
          +
        </span>
      </summary>
      <p className="text-sm text-slate-600 leading-relaxed pb-5 pr-8">{a}</p>
    </details>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <RevealObserver />
      <SiteNav />

      {/* ─── Hero ─── */}
      <section className="px-6 pt-14 pb-4 md:pt-18 md:pb-8 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <p
            data-reveal
            style={revealStyle(20)}
            className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4"
          >
            Pricing
          </p>
          <h1
            data-reveal
            style={revealStyle(60)}
            className="text-4xl md:text-6xl leading-[0.95] tracking-[-0.02em] text-slate-900 mb-6"
          >
            $500 per floor plan.
            <br />
            Everything included.
          </h1>
          <p
            data-reveal
            style={revealStyle(100)}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto"
          >
            No setup fees. No usage caps. No per-session charges. We handle the
            build, you get the revenue.
          </p>
        </div>
      </section>

      {/* ─── Pricing Card ─── */}
      <Section>
        <div
          data-reveal
          style={revealStyle(140)}
          className="max-w-2xl mx-auto border border-slate-200 bg-white shadow-sm"
        >
          <div className="p-8 md:p-10 text-center border-b border-slate-100">
            <p className="text-5xl md:text-6xl leading-none tracking-tight text-slate-900 mb-2">
              $500
              <span className="text-2xl md:text-3xl text-slate-400">
                /mo
              </span>
            </p>
            <p className="text-sm text-slate-500">per floor plan</p>
            <p className="text-xs text-slate-400 mt-2">
              Minimum 3 floor plans ($1,500/mo)
            </p>
          </div>
          <div className="p-8 md:p-10">
            <ul className="space-y-4">
              {INCLUDED.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-slate-700">
                  <span className="text-slate-400 shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="square"
                        strokeLinejoin="miter"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-400 mt-6">
              Flat rate. No surprises. Generation costs, hosting, and
              infrastructure are on us.
            </p>
          </div>
        </div>
      </Section>

      {/* ─── First Community ─── */}
      <Section gray>
        <div className="max-w-3xl mx-auto text-center">
          <p
            data-reveal
            style={revealStyle(20)}
            className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4"
          >
            How It Works
          </p>
          <h2
            data-reveal
            style={revealStyle(60)}
            className="text-4xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-6"
          >
            Your first community is on&nbsp;us.
          </h2>
          <p
            data-reveal
            style={revealStyle(100)}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-4"
          >
            We set up one floor plan at no cost. Your buyers use it during real
            design appointments. We measure upgrade revenue together. If the
            numbers work, you expand to more communities at $500/mo per plan. If
            they don&apos;t, you walk away. No contract, no obligation, nothing
            to unwind.
          </p>
          <p
            data-reveal
            style={revealStyle(140)}
            className="text-sm text-slate-500"
          >
            Setup takes less than a week. You send your option sheets and model
            home photos. We do the rest.
          </p>
        </div>
      </Section>

      {/* ─── ROI ─── */}
      <Section id="roi">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p
              data-reveal
              style={revealStyle(20)}
              className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4"
            >
              The Math
            </p>
            <h2
              data-reveal
              style={revealStyle(60)}
              className="text-4xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-4"
            >
              The numbers at a conservative 10% upgrade&nbsp;lift.
            </h2>
            <p
              data-reveal
              style={revealStyle(100)}
              className="text-base text-slate-600 max-w-2xl mx-auto"
            >
              Average upgrades are $10K per home. A 10% lift is $1,000 more per
              closing. Here&apos;s what that looks like against what you&apos;d
              pay for Finch.
            </p>
          </div>

          <div data-reveal style={revealStyle(140)} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-[0.12em] text-slate-400 font-semibold">
                    Homes/yr
                  </th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-[0.12em] text-slate-400 font-semibold">
                    Plans
                  </th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-[0.12em] text-slate-400 font-semibold">
                    Annual cost
                  </th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-[0.12em] text-slate-400 font-semibold">
                    Revenue lift
                  </th>
                  <th className="text-right py-3 text-xs uppercase tracking-[0.12em] text-slate-400 font-semibold">
                    Return
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROI_ROWS.map((row) => (
                  <tr
                    key={row.homes}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-3 pr-4 text-slate-700">{row.homes}</td>
                    <td className="py-3 pr-4 text-slate-700">{row.plans}</td>
                    <td className="py-3 pr-4 text-slate-700">{row.cost}</td>
                    <td className="py-3 pr-4 text-slate-700">{row.lift}</td>
                    <td className="py-3 text-right font-semibold text-slate-900">
                      {row.roi}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p
            data-reveal
            style={revealStyle(180)}
            className="text-sm text-slate-500 mt-6 text-center"
          >
            The breakeven is roughly 55 homes per year on 3 plans. Most builders
            we talk to are well past that.{" "}
            <TrackedLink
              href="/research/hidden-revenue-line"
              event="cta_clicked"
              properties={{
                cta: "See the research",
                location: "pricing_roi",
              }}
              className="underline hover:text-slate-700 transition-colors"
            >
              See how public builders compare.
            </TrackedLink>
          </p>
        </div>
      </Section>

      {/* ─── FAQ ─── */}
      <Section gray id="faq">
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-4xl md:text-5xl leading-[1] tracking-[-0.02em] text-slate-900 text-center mb-12"
          >
            Common questions
          </h2>
          <div>
            {FAQS.map((faq, index) => (
              <div key={faq.q} data-reveal style={revealStyle(90 + index * 70)}>
                <FaqItem q={faq.q} a={faq.a} />
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── CTA ─── */}
      <GetStartedSection />

      <SiteFooter />

      {/* ─── JSON-LD ─── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Finch Upgrade Visualization",
            description:
              "Done-for-you upgrade visualization for production home builders. $500/mo per floor plan, live in days.",
            url: "https://withfin.ch/pricing",
            brand: {
              "@type": "Organization",
              name: "Finch",
              url: "https://withfin.ch",
            },
            offers: {
              "@type": "Offer",
              price: "500",
              priceCurrency: "USD",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: "500",
                priceCurrency: "USD",
                billingDuration: "P1M",
                unitText: "floor plan",
              },
              description:
                "Per floor plan, per month. Minimum 3 floor plans. Includes done-for-you setup, 10 room photos, unlimited buyer sessions, admin dashboard, and ongoing support.",
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
            mainEntity: FAQS.map((faq) => ({
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
