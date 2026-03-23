import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { GetStartedSection } from "@/components/PilotSection";
import { RevealObserver, TrackedLink } from "@/app/landing-client";

export const metadata: Metadata = {
  title: { absolute: "Enterprise Pricing — Finch" },
  description:
    "There is no enterprise tier. Finch is $500/mo per floor plan for everyone. No setup fees, no usage caps, no six-figure contracts.",
  alternates: { canonical: "https://withfin.ch/pricing/enterprise" },
  openGraph: {
    title: "Enterprise Pricing — Finch",
    description:
      "There is no enterprise tier. Finch is $500/mo per floor plan for everyone.",
    url: "https://withfin.ch/pricing/enterprise",
    siteName: "Finch",
    type: "website",
  },
};

const revealStyle = (delay: number): CSSProperties => ({
  ["--reveal-delay" as string]: `${delay}ms`,
});

const COMPETITORS = [
  { name: "Traditional 3D platforms", price: "$50K\u2013$200K+/yr", setup: "8\u201312 weeks per community" },
  { name: "Finch", price: "$500/mo per plan", setup: "Under a week" },
];

export default function EnterprisePricingPage() {
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
            Enterprise Pricing
          </p>
          <h1
            data-reveal
            style={revealStyle(60)}
            className="text-4xl md:text-6xl leading-[0.95] tracking-[-0.02em] text-slate-900 mb-6"
          >
            Still $500 per
            <br />
            floor plan.
          </h1>
          <p
            data-reveal
            style={revealStyle(100)}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto"
          >
            There&apos;s no enterprise tier. No &ldquo;call us for pricing.&rdquo;
            Whether you build 50 homes a year or 500, it&apos;s the same
            product at the same price. The only thing that scales is how many
            floor plans you&nbsp;need.
          </p>
        </div>
      </section>

      {/* ─── Comparison ─── */}
      <section className="px-6 py-20 md:py-28 bg-white">
        <div className="max-w-2xl mx-auto">
          <div data-reveal style={revealStyle(140)}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-[0.12em] text-slate-400 font-semibold">
                    &nbsp;
                  </th>
                  <th className="text-left py-3 pr-4 text-xs uppercase tracking-[0.12em] text-slate-400 font-semibold">
                    Annual cost
                  </th>
                  <th className="text-left py-3 text-xs uppercase tracking-[0.12em] text-slate-400 font-semibold">
                    Setup time
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((row) => (
                  <tr
                    key={row.name}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-4 pr-4 text-slate-900 font-medium">
                      {row.name}
                    </td>
                    <td className="py-4 pr-4 text-slate-700">{row.price}</td>
                    <td className="py-4 text-slate-700">{row.setup}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            data-reveal
            style={revealStyle(180)}
            className="mt-12 space-y-5 text-base text-slate-600 leading-relaxed"
          >
            <p>
              Most upgrade visualization platforms charge enterprise rates
              because their setup requires it: 3D modeling per community, weeks
              of rendering, dedicated onboarding teams. That cost gets passed to
              you.
            </p>
            <p>
              Our setup is different. We work from your existing model home
              photos and option sheets. No 3D scenes to build. No months of
              lead time. The same product that works for a 50-home builder works
              at 500 homes. So the price stays the&nbsp;same.
            </p>
          </div>

          <div
            data-reveal
            style={revealStyle(220)}
            className="mt-10 text-center"
          >
            <TrackedLink
              href="/pricing"
              event="cta_clicked"
              properties={{ cta: "See full pricing", location: "enterprise" }}
              className="inline-block px-6 py-3 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-900 hover:text-slate-900 transition-colors"
            >
              See Full Pricing
            </TrackedLink>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <GetStartedSection />

      <SiteFooter />
    </div>
  );
}
