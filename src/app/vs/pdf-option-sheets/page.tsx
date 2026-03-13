import type { Metadata } from "next";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import {
  RevealObserver,
  TrackedLink,
  RoiCalculator,
} from "@/app/landing-client";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: {
    absolute:
      "Replace PDF Option Sheets — Visual Upgrade Selection for Builders",
  },
  description:
    "A price sheet lists upgrades. Finch shows them. Buyers see their kitchen with selections applied, pick finishes, and export a priced selection sheet. Live in 48 hours.",
  alternates: { canonical: "https://withfin.ch/vs/pdf-option-sheets" },
  openGraph: {
    title:
      "Replace PDF Option Sheets — Visual Upgrade Selection for Builders",
    description:
      "A price sheet lists upgrades. Finch shows them. Buyers see their kitchen with selections applied.",
    url: "https://withfin.ch/vs/pdf-option-sheets",
    siteName: "Finch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Replace PDF Option Sheets — Visual Upgrade Selection for Builders",
    description:
      "A price sheet lists upgrades. Finch shows them. Buyers see their kitchen with selections applied.",
  },
};

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

const pdfLineItems = [
  { label: "BACKSPLASH \u2014 Herringbone Glacier", price: "$425" },
  { label: "COUNTERTOP \u2014 Calacatta Venice", price: "$2,450" },
  { label: "HARDWARE \u2014 Dominique Gold Pulls", price: "$300" },
  { label: "FAUCET \u2014 Colfax Brushed Gold", price: "$375" },
  { label: "ISLAND \u2014 Admiral Blue", price: "$200" },
];

const experienceRows = [
  {
    label: "Buyer sees",
    pdf: "Line items and prices",
    finch: "Their actual kitchen with selections applied",
  },
  {
    label: "Decision confidence",
    pdf: "Guessing from a swatch chip",
    finch: "Seeing everything together in the room",
  },
  {
    label: "Time to decide",
    pdf: "Multiple design center visits",
    finch: "Minutes, on any device",
  },
  {
    label: "What you get back",
    pdf: "Handwritten notes, re-entry needed",
    finch: "Priced selection sheet, ready to process",
  },
  {
    label: "Upgrade revenue impact",
    pdf: "Buyers default to Standard",
    finch: "Buyers upgrade what they can see",
  },
];

export default function VsPdfPage() {
  return (
    <div className="min-h-screen bg-white">
      <RevealObserver />
      <SiteNav
        links={NAV_LINKS}
        cta={{ label: "Start a Pilot", href: "/#pilot" }}
      />

      {/* ─── Hero ─── */}
      <section className="px-6 pt-14 pb-16 md:pt-18 md:pb-20 lg:pt-20 lg:pb-24 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p
            data-reveal
            style={revealStyle(60)}
            className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-6"
          >
            Finch vs PDF Option Sheets
          </p>
          <h1
            data-reveal
            style={revealStyle(100)}
            className="text-[2.8rem] md:text-[3.6rem] lg:text-[4.4rem] leading-[0.95] text-slate-900 tracking-[-0.02em] mb-8"
          >
            A price sheet doesn&apos;t
            <br />
            sell upgrades. It lists&nbsp;them.
          </h1>
          <p
            data-reveal
            style={revealStyle(160)}
            className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10"
          >
            Your buyers aren&apos;t choosing Standard because they want it.
            They&apos;re choosing it because they can&apos;t picture the
            alternative. A PDF won&apos;t fix&nbsp;that.
          </p>
          <div
            data-reveal
            style={revealStyle(220)}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <TrackedLink
              href="/#pilot"
              event="cta_clicked"
              properties={{
                cta: "Start a Pilot",
                location: "vs-pdf-hero",
              }}
              className="w-full sm:w-auto text-center px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              Start a Pilot
            </TrackedLink>
            <TrackedLink
              href="/try"
              event="cta_clicked"
              properties={{
                cta: "Try It Live",
                location: "vs-pdf-hero",
              }}
              className="w-full sm:w-auto text-center px-8 py-3.5 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-900 hover:text-slate-900 transition-colors"
            >
              Try It Live
            </TrackedLink>
          </div>
        </div>
      </section>

      {/* ─── Before / After ─── */}
      <Section gray>
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-12 md:mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">
            Before and After
          </p>
          <h2 className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900">
            From line items to the actual&nbsp;room
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
              What buyers see today
            </p>
          </div>
          <div className="bg-slate-100 px-6 py-8">
            <div className="max-w-[290px] mx-auto space-y-2">
              {pdfLineItems.map((item, i) => (
                <div key={i} className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="text-slate-500">+{item.price}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 mt-3 pt-2 flex justify-between text-[11px] font-mono">
                <span className="text-slate-500 font-semibold">TOTAL UPGRADES</span>
                <span className="text-slate-700 font-semibold">+$3,750</span>
              </div>
            </div>
          </div>
          <div className="relative aspect-[4/3] bg-slate-100">
            <Image
              src="/home-hero-generated.png"
              alt="Kitchen upgrade visualization"
              fill
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
            <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-full max-w-[290px] space-y-2">
                  {pdfLineItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-xs font-mono"
                    >
                      <span className="text-slate-400">{item.label}</span>
                      <span className="text-slate-500">+{item.price}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 mt-3 pt-2 flex justify-between text-xs font-mono">
                    <span className="text-slate-500 font-semibold">
                      TOTAL UPGRADES
                    </span>
                    <span className="text-slate-700 font-semibold">
                      +$3,750
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm font-semibold text-slate-900">
                What buyers see today
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
                alt="Kitchen upgrade visualization"
                fill
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
      </Section>

      {/* ─── Revenue Gap ─── */}
      <Section id="roi">
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">
            The Revenue Gap
          </p>
          <h2 className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900">
            Every &ldquo;Standard&rdquo; selection is money left on the&nbsp;table
          </h2>
        </div>

        <RoiCalculator />

        <div
          data-reveal
          style={revealStyle(330)}
          className="text-center max-w-3xl mx-auto"
        >
          <p className="text-2xl md:text-3xl text-slate-800 leading-tight mb-6">
            Buyers upgrade what they can see. The ones reading a price sheet
            default to&nbsp;Standard.
          </p>
          <p className="text-xs text-slate-500 max-w-2xl mx-auto">
            In our first test, a buyer actively trying to minimize spend still
            chose 40% more after seeing their selections. Industry data across
            225+ builder brands averages 35%. We start at 15% because
            it&apos;s conservative.
          </p>
        </div>
      </Section>

      {/* ─── What Changes ─── */}
      <Section gray>
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900">
            What changes for your&nbsp;buyers
          </h2>
        </div>

        <div
          data-reveal
          style={revealStyle(90)}
          className="max-w-4xl mx-auto overflow-hidden border border-slate-200 bg-white"
        >
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-slate-200">
            <div className="p-4 md:p-5" />
            <div className="p-4 md:p-5 border-l border-slate-200">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400 font-semibold">
                PDF Sheets
              </p>
            </div>
            <div className="p-4 md:p-5 border-l border-slate-200 bg-slate-50">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-900 font-semibold">
                Finch
              </p>
            </div>
          </div>

          {/* Rows */}
          {experienceRows.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-[1fr_1fr_1fr] ${i < experienceRows.length - 1 ? "border-b border-slate-200" : ""}`}
            >
              <div className="p-4 md:p-5">
                <p className="text-sm font-semibold text-slate-900">
                  {row.label}
                </p>
              </div>
              <div className="p-4 md:p-5 border-l border-slate-200">
                <p className="text-sm text-slate-500">{row.pdf}</p>
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

      {/* ─── No Software to Learn ─── */}
      <Section>
        <div className="max-w-3xl mx-auto text-center">
          <h2
            data-reveal
            style={revealStyle(20)}
            className="text-3xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-8"
          >
            No software to learn.
            <br />
            No data entry. No&nbsp;IT.
          </h2>
          <div
            data-reveal
            style={revealStyle(90)}
            className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5 text-left max-w-2xl mx-auto"
          >
            <p>
              You don&apos;t need a new platform. You don&apos;t need to train
              your team on another tool. You don&apos;t need to hire someone to
              manage&nbsp;it.
            </p>
            <p>
              Send us your option sheets and model home photos. We build your
              upgrade experience. Your buyers use it on their own. You get a
              priced selection sheet back, same as&nbsp;today.
            </p>
            <p className="text-slate-800 font-medium">
              First floor plan in 48 hours. Full catalog in days,
              not&nbsp;months.
            </p>
          </div>
        </div>
      </Section>

      {/* ─── Final CTA ─── */}
      <section className="px-6 py-20 md:py-28 bg-white border-t border-slate-100">
        <div
          data-reveal
          style={revealStyle(20)}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-5">
            Your buyers can&apos;t upgrade what they can&apos;t&nbsp;see.
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto text-balance">
            One floor plan. Free to set up. Live in 48 hours. Prove the ROI
            before you commit to anything.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <TrackedLink
              href="/#pilot"
              event="cta_clicked"
              properties={{
                cta: "Start a Pilot",
                location: "vs-pdf-footer",
              }}
              className="inline-block px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              Start a Pilot
            </TrackedLink>
            <TrackedLink
              href="/try"
              event="cta_clicked"
              properties={{
                cta: "Try It Live",
                location: "vs-pdf-footer",
              }}
              className="inline-block px-6 py-3 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-900 hover:text-slate-900 transition-colors"
            >
              Try It Live
            </TrackedLink>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Questions? hello@withfin.ch
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
