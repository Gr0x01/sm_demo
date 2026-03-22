import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { RevealObserver } from "@/app/landing-client";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Research — Finch",
  description:
    "Original research on home builder upgrade revenue, visualization impact, and design center economics. SEC filings, independent studies, and named builder case studies.",
  alternates: { canonical: "https://withfin.ch/research" },
  openGraph: {
    title: "Research — Finch",
    description:
      "Original research on home builder upgrade revenue and visualization impact.",
    url: "https://withfin.ch/research",
    siteName: "Finch",
    type: "website",
  },
};

const revealStyle = (delay: number): CSSProperties => ({
  ["--reveal-delay" as string]: `${delay}ms`,
});

const articles = [
  {
    href: "/research/visualization-lift",
    title: "The Visualization Effect",
    description:
      "What happens when buyers can see their upgrades? Independent studies, named builder case studies, and vendor claims, with source quality labeled.",
    date: "March 2026",
    tag: "Visualization",
  },
  {
    href: "/research/hidden-revenue-line",
    title: "The Hidden Revenue Line",
    description:
      "SEC filings show public builders earn $104K–$236K per home in upgrade revenue. An analysis of 14 public homebuilders.",
    date: "March 2026",
    tag: "SEC Filings",
  },
];

export default function ResearchIndexPage() {
  return (
    <div className="min-h-screen bg-white">
      <RevealObserver />
      <SiteNav />

      {/* Hero */}
      <section className="px-6 pt-14 pb-16 md:pt-18 md:pb-20 lg:pt-20 lg:pb-24 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p
            data-reveal
            style={revealStyle(60)}
            className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-6"
          >
            Research
          </p>
          <h1
            data-reveal
            style={revealStyle(100)}
            className="text-[2.8rem] md:text-[3.6rem] lg:text-[4.4rem] leading-[0.95] text-slate-900 tracking-[-0.02em] mb-8"
          >
            What we&rsquo;ve&nbsp;found
          </h1>
          <p
            data-reveal
            style={revealStyle(160)}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto"
          >
            Original research on upgrade revenue, visualization impact, and
            design center economics. Everything is sourced, and source quality
            is&nbsp;labeled.
          </p>
        </div>
      </section>

      {/* Articles */}
      <section className="px-6 py-20 md:py-28 bg-slate-50">
        <div className="max-w-3xl mx-auto space-y-6">
          {articles.map((article, i) => (
            <Link
              key={article.href}
              href={article.href}
              data-reveal
              style={revealStyle(60 + i * 80)}
              className="block border border-slate-200 bg-white p-8 md:p-10 hover:border-slate-400 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 bg-slate-100 text-slate-600">
                  {article.tag}
                </span>
                <span className="text-xs text-slate-400">
                  {article.date}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl leading-tight tracking-[-0.01em] text-slate-900 mb-3 group-hover:text-slate-700 transition-colors">
                {article.title}
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                {article.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
