import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { RevealObserver } from "@/app/landing-client";
import { LearnIndexTracker } from "./learn-index-client";
import Link from "next/link";

export const metadata: Metadata = {
  title: "New Home Design Center Guides | Finch",
  description:
    "Guides for new home buyers preparing for their design center appointment. Upgrade categories, what to expect, how to prepare, and how to visualize your selections.",
  alternates: { canonical: "https://withfin.ch/learn" },
  openGraph: {
    title: "New Home Design Center Guides | Finch",
    description:
      "Guides for new home buyers preparing for their design center appointment.",
    url: "https://withfin.ch/learn",
    siteName: "Finch",
    type: "website",
  },
};

const revealStyle = (delay: number): CSSProperties => ({
  ["--reveal-delay" as string]: `${delay}ms`,
});

const guides = [
  {
    href: "/learn/new-construction-upgrades",
    title: "The Complete Guide to New Construction Upgrades",
    description:
      "Cabinets, countertops, flooring, paint, and more. What each upgrade category looks like, which ones are worth the money, and how to prepare for your design center appointment.",
    tag: "Upgrade Guide",
    date: "March 2026",
  },
];

const designCenterGuides = [
  {
    href: "/learn/design-center/pulte",
    title: "The Pulte Homes Design Center",
    description:
      "What to expect at the Pulte Home Expressions Studio. 15 selection categories, how to prepare, and what to bring to your appointment.",
    tag: "Pulte Homes",
    date: "March 2026",
  },
  {
    href: "/learn/design-center/arbor",
    title: "The Arbor Homes Design Center",
    description:
      "What to expect at Arbor\u2019s Indianapolis Design Center. 9 selection categories, Saturday browsing hours, and how to prepare.",
    tag: "Arbor Homes",
    date: "March 2026",
  },
  {
    href: "/learn/design-center/ryan",
    title: "The Ryan Homes Design Center",
    description:
      "What to expect at a Ryan Homes regional design center. Interior packages, 12 selection categories, the Envision portal, and how to prepare.",
    tag: "Ryan Homes",
    date: "March 2026",
  },
  {
    href: "/learn/design-center/richmond-american",
    title: "The Richmond American Home Gallery",
    description:
      "What to expect at the Richmond American Home Gallery. 13 selection categories, color studios, named brand partners, and how to prepare.",
    tag: "Richmond American",
    date: "March 2026",
  },
];

export default function LearnIndexPage() {
  return (
    <div className="min-h-screen bg-white">
      <RevealObserver />
      <LearnIndexTracker />
      <SiteNav />

      {/* Hero */}
      <section className="px-6 pt-14 pb-16 md:pt-18 md:pb-20 lg:pt-20 lg:pb-24 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p
            data-reveal
            style={revealStyle(60)}
            className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-6"
          >
            Buyer&apos;s Guides
          </p>
          <h1
            data-reveal
            style={revealStyle(100)}
            className="text-[2.8rem] md:text-[3.6rem] lg:text-[4.4rem] leading-[0.95] text-slate-900 tracking-[-0.02em] mb-8"
          >
            Preparing for Your
            <br />
            Design Center&nbsp;Appointment
          </h1>
          <p
            data-reveal
            style={revealStyle(160)}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto"
          >
            Everything you need to know before choosing the finishes in your new
            home. Upgrade categories, what to expect, and how to walk in with
            a&nbsp;plan.
          </p>
        </div>
      </section>

      {/* Upgrade Guide */}
      <section className="px-6 py-20 md:py-28 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          {guides.map((guide, i) => (
            <Link
              key={guide.href}
              href={guide.href}
              data-reveal
              style={revealStyle(60 + i * 80)}
              className="block border border-slate-200 bg-white p-8 md:p-10 hover:border-slate-400 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 bg-slate-100 text-slate-600">
                  {guide.tag}
                </span>
                <span className="text-xs text-slate-400">{guide.date}</span>
              </div>
              <h2 className="text-2xl md:text-3xl leading-tight tracking-[-0.01em] text-slate-900 mb-3 group-hover:text-slate-700 transition-colors">
                {guide.title}
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                {guide.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Design Center Guides */}
      <section className="px-6 py-20 md:py-28 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-2xl md:text-3xl leading-tight tracking-[-0.01em] text-slate-900 mb-8"
          >
            Design Center Guides by&nbsp;Builder
          </h2>
          <div className="space-y-6">
            {designCenterGuides.map((guide, i) => (
              <Link
                key={guide.href}
                href={guide.href}
                data-reveal
                style={revealStyle(60 + i * 80)}
                className="block border border-slate-200 bg-white p-8 md:p-10 hover:border-slate-400 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 bg-slate-100 text-slate-600">
                    {guide.tag}
                  </span>
                  <span className="text-xs text-slate-400">{guide.date}</span>
                </div>
                <h2 className="text-2xl md:text-3xl leading-tight tracking-[-0.01em] text-slate-900 mb-3 group-hover:text-slate-700 transition-colors">
                  {guide.title}
                </h2>
                <p className="text-base text-slate-600 leading-relaxed">
                  {guide.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* ─── JSON-LD ─── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "New Home Design Center Guides",
            description:
              "Guides for new home buyers preparing for their design center appointment.",
            url: "https://withfin.ch/learn",
            mainEntity: [
              ...guides.map((g) => ({
                "@type": "Article",
                name: g.title,
                url: `https://withfin.ch${g.href}`,
              })),
              ...designCenterGuides.map((g) => ({
                "@type": "Article",
                name: g.title,
                url: `https://withfin.ch${g.href}`,
              })),
            ],
          }),
        }}
      />
    </div>
  );
}
