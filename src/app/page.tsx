"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import { useTrack } from "@/hooks/useTrack";

const HOMEPAGE_NAV_LINKS = [
  { label: "Try It", href: "/try" },
  { label: "How It Works", href: "#compare" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const faqs = [
  {
    q: "How long does setup take?",
    a: "Most builders are live in 2-3 weeks. We handle configuration. You send floor plans, options, and pricing.",
  },
  {
    q: "What does a pilot look like?",
    a: "We set up your 3 best-selling floor plans at no cost. You use Finch for 90 days with real buyers. We measure upgrade revenue together. If the numbers work, we expand to your full catalog at standard pricing. If they don't, you walk away with zero obligation.",
  },
  {
    q: "Do we need to change our sales process?",
    a: "No. Finch fits into your existing design appointment flow. Buyers use a visual tool, and your team gets a clean priced export.",
  },
  {
    q: "What's the difference between Essentials and Concierge?",
    a: "Essentials: you upload photos and manage your catalog. Concierge: we handle everything — option transcription, thousands of pre-generated images, and if your existing photos need improvement, we coordinate professional photography. We'll assess what you have during onboarding.",
  },
  {
    q: "Can this work with our current design center software?",
    a: "Yes. Finch is the visual layer for option selling. It can sit alongside your existing operational systems.",
  },
];

const revealStyle = (delay: number): CSSProperties => ({
  ["--reveal-delay" as string]: `${delay}ms`,
});

function FaqItem({ q, a, onOpen }: { q: string; a: string; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-200">
      <button
        onClick={() => {
          if (!open && onOpen) onOpen();
          setOpen(!open);
        }}
        className="w-full flex items-center justify-between py-5 text-left cursor-pointer"
      >
        <span className="text-base font-semibold text-slate-900">{q}</span>
        <span className="ml-4 text-slate-400 text-xl leading-none select-none">
          {open ? "−" : "+"}
        </span>
      </button>
      <div className="accordion-content" data-open={open ? "true" : "false"}>
        <div>
          <p className="pb-5 text-slate-600 text-[15px] leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  );
}

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
    <section id={id} className={`px-6 py-20 md:py-28 ${gray ? "bg-slate-50" : "bg-white"}`}>
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
}

/* ─── Editable number field ─── */
function EditableNumber({
  value,
  onChange,
  onCommit,
  prefix = "",
  suffix = "",
  min = 0,
  max = 99999,
  id,
  nextId,
}: {
  value: number;
  onChange: (n: number) => void;
  onCommit?: (n: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  id?: string;
  nextId?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  function commit() {
    setEditing(false);
    const parsed = parseInt(draft.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
      onCommit?.(parsed);
    } else {
      setDraft(String(value));
    }
  }

  function focusNext() {
    if (!nextId) return;
    requestAnimationFrame(() => {
      const next = document.getElementById(nextId);
      if (next) next.click();
    });
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            focusNext();
          }
          if (e.key === "Tab") {
            e.preventDefault();
            commit();
            focusNext();
          }
          if (e.key === "Escape") {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        className="w-full text-center text-5xl md:text-6xl leading-none tracking-tight text-slate-900 bg-transparent border-b-2 border-slate-900 outline-none"
        style={{ fontVariantNumeric: "tabular-nums" }}
      />
    );
  }

  return (
    <button
      id={id}
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className="group cursor-pointer inline-flex items-baseline justify-center"
      title="Click to edit"
    >
      <span
        className="text-5xl md:text-6xl leading-none tracking-tight text-slate-900 border-b-2 border-dashed border-slate-300 group-hover:border-slate-900 transition-colors"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {prefix}{value.toLocaleString()}{suffix}
      </span>
    </button>
  );
}

/* ─── ROI Calculator ─── */
function RoiCalculator() {
  const track = useTrack();
  const [homes, setHomes] = useState(200);
  const [spend, setSpend] = useState(12000);
  const [liftPct, setLiftPct] = useState(15);

  const additionalRevenue = Math.round(homes * spend * (liftPct / 100));

  function formatDollars(n: number) {
    if (n >= 1_000_000) {
      const m = n / 1_000_000;
      return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
    }
    if (n >= 1000) {
      return `$${Math.round(n / 1000).toLocaleString()}K`;
    }
    return `$${n.toLocaleString()}`;
  }

  return (
    <div data-reveal style={revealStyle(90)} className="mb-12">
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 text-center items-end">
        <div data-reveal style={revealStyle(140)}>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-2">
            Avg. upgrade spend
          </p>
          <EditableNumber
            value={spend}
            onChange={setSpend}
            onCommit={(v) => track("roi_calculator_changed", { field: "spend", value: v })}
            prefix="$"
            min={1000}
            max={100000}
            id="roi-spend"
            nextId="roi-homes"
          />
          <p className="text-sm text-slate-500 mt-2">per home</p>
        </div>

        <div data-reveal style={revealStyle(200)}>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-2">
            Annual closings
          </p>
          <EditableNumber
            value={homes}
            onChange={setHomes}
            onCommit={(v) => track("roi_calculator_changed", { field: "homes", value: v })}
            min={10}
            max={10000}
            id="roi-homes"
            nextId="roi-lift"
          />
          <p className="text-sm text-slate-500 mt-2">homes per year</p>
        </div>

        <div data-reveal style={revealStyle(230)}>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-2">
            Upgrade lift
          </p>
          <EditableNumber
            value={liftPct}
            onChange={setLiftPct}
            onCommit={(v) => track("roi_calculator_changed", { field: "lift", value: v })}
            suffix="%"
            min={1}
            max={35}
            id="roi-lift"
          />
          <p className="text-sm text-slate-500 mt-2">per buyer</p>
        </div>

        <div data-reveal style={revealStyle(260)}>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-2">
            Additional revenue
          </p>
          <p
            className="text-5xl md:text-6xl leading-none tracking-tight text-slate-900"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatDollars(additionalRevenue)}
          </p>
          <p className="text-sm text-slate-500 mt-2">
            per year
          </p>
        </div>
      </div>
    </div>
  );
}


function HeroProofCard({ onClicked }: { onClicked?: () => void }) {
  return (
    <Link
      href="/stonemartin/kinkade"
      onClick={onClicked}
      className="block w-full border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
        <Image
          src="/home-hero-lg.png"
          alt="Kitchen with upgraded selections applied"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 border border-slate-200 text-[11px] uppercase tracking-[0.16em] text-slate-700">
          Builder options applied
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-900/70 to-transparent">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-100">Image updated from selection</p>
        </div>
      </div>

      <div className="p-3 md:p-4 border-t border-slate-200 bg-white">
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 mb-2">
          Example Kitchen Selections
        </p>
        <div className="space-y-1.5">
          <p className="text-xs text-slate-700">Counter Top: Quartz - White Carrara (+$2,150)</p>
          <p className="text-xs text-slate-700">Island Color: Naval Blue Paint (+$350)</p>
          <p className="text-xs text-slate-700">Flooring: Hickory Hardwood - Natural (+$1,800)</p>
        </div>
      </div>
    </Link>
  );
}

export default function LandingPage() {
  const track = useTrack();

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]")
    );

    if (elements.length === 0) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
      elements.forEach((el) => el.classList.add("in-view"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <SiteNav links={HOMEPAGE_NAV_LINKS} />

      <section className="relative overflow-hidden px-6 pt-14 pb-18 md:pt-18 md:pb-16 lg:pt-20 lg:pb-24 bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-36 right-0 h-[420px] w-[420px] rounded-full bg-sky-100/40 blur-3xl" />
          <div className="absolute top-24 -left-20 h-[300px] w-[300px] rounded-full bg-slate-100 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-10 lg:gap-12 items-center">
            <div data-reveal style={revealStyle(100)}>
              <h1 className="text-[3.2rem] md:text-[3.6rem] lg:text-[4.4rem] leading-[0.95] text-slate-900 tracking-[-0.02em] mb-8">
                They always
                <br />
                pick Standard.
              </h1>

              <p className="text-lg md:text-xl lg:text-2xl leading-tight text-slate-600 max-w-xl mb-10">
                Not because they don&apos;t want the upgrade. Because they can&apos;t picture what they&apos;re paying for.
              </p>

              <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 mb-6">
                <Link
                  href="/try"
                  onClick={() => track("cta_clicked", { cta: "Try It Live", location: "hero" })}
                  className="w-full sm:w-auto text-center px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
                >
                  Try It Live
                </Link>
              </div>

            </div>

            <div data-reveal style={revealStyle(180)} className="hidden md:block">
              <HeroProofCard onClicked={() => track("proof_card_clicked")} />
            </div>
          </div>
        </div>
      </section>

      <Section gray id="compare">
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-12 md:mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">The Core Contrast</p>
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900">
            A price sheet
            <br />
            doesn&apos;t sell. It lists.
          </h2>
        </div>

        {/* Mobile: single combined card */}
        <div data-reveal style={revealStyle(90)} className="md:hidden bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-100 px-6 py-8">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-4 text-center">What buyers see today</p>
            <div className="max-w-[290px] mx-auto space-y-2">
              {[
                { label: "BACKSPLASH — Herringbone Glacier", price: "$425" },
                { label: "COUNTERTOP — Calacatta Venice", price: "$2,450" },
                { label: "HARDWARE — Dominique Gold Pulls", price: "$300" },
                { label: "FAUCET — Colfax Brushed Gold", price: "$375" },
                { label: "ISLAND — Admiral Blue", price: "$200" },
              ].map((item, i) => (
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
            <Image src="/home-hero-generated.png" alt="Kitchen upgrade visualization" fill className="object-cover" />
          </div>
          <div className="p-4 text-center">
            <p className="text-sm font-semibold text-slate-900">What buyers see with Finch</p>
          </div>
        </div>

        {/* Desktop: side-by-side cards */}
        <div className="hidden md:grid md:grid-cols-2 gap-8">
          <div
            data-reveal
            style={revealStyle(90)}
            className="bg-white border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-full max-w-[290px] space-y-2">
                  {[
                    { label: "BACKSPLASH — Herringbone Glacier", price: "$425" },
                    { label: "COUNTERTOP — Calacatta Venice", price: "$2,450" },
                    { label: "HARDWARE — Dominique Gold Pulls", price: "$300" },
                    { label: "FAUCET — Colfax Brushed Gold", price: "$375" },
                    { label: "ISLAND — Admiral Blue", price: "$200" },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="text-slate-500">+{item.price}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 mt-3 pt-2 flex justify-between text-xs font-mono">
                    <span className="text-slate-500 font-semibold">TOTAL UPGRADES</span>
                    <span className="text-slate-700 font-semibold">+$3,750</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm font-semibold text-slate-500">What buyers see today</p>
            </div>
          </div>

          <div
            data-reveal
            style={revealStyle(150)}
            className="bg-white border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="aspect-[4/3] relative bg-slate-100">
              <Image src="/home-hero-generated.png" alt="Kitchen upgrade visualization" fill className="object-cover" />
            </div>
            <div className="p-4 text-center">
              <p className="text-sm font-semibold text-slate-900">What buyers see with Finch</p>
            </div>
          </div>
        </div>

        <div data-reveal style={revealStyle(210)} className="text-center mt-10">
          <p className="text-sm text-slate-500 mb-4">
            This demo is configured to mirror real builder choices. Your version uses your plans, finishes, and pricing.
          </p>
          <Link
            href="/try"
            onClick={() => track("cta_clicked", { cta: "Try It Yourself", location: "compare" })}
            className="inline-block px-6 py-3 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
          >
            Try It Yourself
          </Link>
        </div>
      </Section>

      <Section id="roi">
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">Revenue Lens</p>
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900">
            Model the upside
            <br />
            with conservative assumptions.
          </h2>
        </div>

        <RoiCalculator />

        <div
          data-reveal
          style={revealStyle(330)}
          className="text-center max-w-3xl mx-auto"
        >
          <p className="text-2xl md:text-3xl text-slate-800 leading-tight mb-3">
            Finch pays for itself in the first month. The rest is margin.
          </p>
          <p className="text-base md:text-lg text-slate-600 mb-6">
            Use your own close count and option mix to pressure-test this model.
          </p>
          <p className="text-xs text-slate-400 max-w-2xl mx-auto">
            Industry benchmark: 35% lift (Zonda/Envision). Our first real-world result: 40%, from a buyer actively trying to minimize spend. We model at 15%.
          </p>
        </div>
      </Section>

      <Section gray id="how">
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">Operating Model</p>
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900">Four steps. No platform migration.</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              n: "01",
              title: "Upload your floor plans and\u00a0pricing",
              desc: "Your current options list and a few room photos. No special formatting — what you already have is\u00a0enough.",
            },
            {
              n: "02",
              title: "Customize your buyer\u00a0experience",
              desc: "Map your finishes, pricing, and brand to an interactive picker. Aligned to your communities and floor\u00a0plans.",
            },
            {
              n: "03",
              title: "Buyers pick upgrades\u00a0visually",
              desc: "They see their kitchen with the options they\u2019re considering — not a line item on a price\u00a0sheet.",
            },
            {
              n: "04",
              title: "Get priced selections\u00a0back",
              desc: "Every session exports a priced selection sheet. Ready for your sales team, no re-entry\u00a0needed.",
            },
          ].map((step, index) => (
            <div key={step.n} data-reveal style={revealStyle(90 + index * 70)}>
              <p className="text-3xl md:text-4xl leading-none tracking-tight text-slate-300 mb-3">{step.n}</p>
              <h3 className="text-lg text-slate-900 leading-tight mb-2">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        <div data-reveal style={revealStyle(370)} className="text-center mt-12">
          <p className="text-sm text-slate-500 mb-2">
            No software to learn. No data entry. No IT.
          </p>
          <p className="text-sm text-slate-400">
            Want us to handle setup? We can load your catalog, source swatches, and pre-generate images so buyers see results instantly.
          </p>
        </div>
      </Section>

      <Section id="pricing">
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">Pricing</p>
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900">
            One floor plan. One price.
            <br />
            No per-buyer fees.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto mb-12">
          <div
            data-reveal
            style={revealStyle(90)}
            className="border border-slate-200 bg-white p-8 flex flex-col"
          >
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-3">Essentials</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-5xl md:text-6xl leading-none tracking-tight text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>$149</span>
              <span className="text-base text-slate-400">/floor plan/mo</span>
            </div>
            <p className="text-sm text-slate-500 mb-6">You upload photos. You manage your catalog.</p>

            <ul className="space-y-3 mb-8 flex-1">
              {[
                "Upload your own room photos",
                "On-demand visualizations",
                "500 generations/floor plan/mo",
                "Admin dashboard for option and pricing updates",
                "Email support",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="text-slate-400 mt-0.5 shrink-0">&mdash;</span>
                  {item}
                </li>
              ))}
            </ul>

            <a
              href="mailto:hello@finchweb.io?subject=Finch Essentials"
              onClick={() => track("pricing_cta_clicked", { plan: "essentials" })}
              className="block text-center px-6 py-3 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-400 hover:bg-slate-50 transition-colors"
            >
              Get Started
            </a>
            <p className="text-xs text-slate-400 text-center mt-2">1 floor plan. Live in under a week.</p>
          </div>

          <div
            data-reveal
            style={revealStyle(160)}
            className="border-2 border-slate-900 bg-white p-8 flex flex-col relative"
          >
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-3">Concierge</p>
            <p className="text-2xl md:text-3xl leading-tight tracking-tight text-slate-900 mb-1">Done for you.</p>
            <p className="text-sm text-slate-500 mb-6">We handle everything. Buyers see results instantly.</p>

            <ul className="space-y-3 mb-8 flex-1">
              {[
                "Professional photography coordinated by us*",
                "Full option and pricing transcription",
                "3,000+ pre-generated images per floor plan",
                "Instant results for buyers — no wait time",
                "Priority support",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="text-slate-400 mt-0.5 shrink-0">&mdash;</span>
                  {item}
                </li>
              ))}
            </ul>

            <a
              href="mailto:hello@finchweb.io?subject=Finch Concierge"
              onClick={() => track("pricing_cta_clicked", { plan: "concierge" })}
              className="block text-center px-6 py-3 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              Talk to Us
            </a>
            <p className="text-xs text-slate-400 text-center mt-2">We scope it to your floor plans. 15 minutes.</p>
          </div>
        </div>

        <div
          data-reveal
          style={revealStyle(230)}
          className="max-w-4xl mx-auto border border-slate-200 bg-slate-50 p-6 md:p-8"
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-2">Founding Partners</p>
              <h3 className="text-xl md:text-2xl leading-tight tracking-[-0.01em] text-slate-900 mb-2">
                3 Concierge floor plans. Setup waived. 3 months free.
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                We configure your 3 best-selling plans on Concierge at no cost. You use it for 90 days with real buyers. If upgrade revenue goes up, we expand to your full catalog. If it doesn&apos;t, you walk away.
              </p>
            </div>
            <div className="shrink-0">
              <a
                href="mailto:hello@finchweb.io?subject=Founding Partner Interest"
                onClick={() => track("pricing_cta_clicked", { plan: "founding" })}
                className="inline-block px-6 py-3 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                Claim Your Spot
              </a>
            </div>
          </div>
        </div>

        <div data-reveal style={revealStyle(290)} className="text-center mt-8">
          <p className="text-xs text-slate-400">
            All plans include unlimited buyers. No per-session or per-user fees.
          </p>
        </div>
      </Section>

      <Section gray id="why">
        <div
          data-reveal
          style={revealStyle(20)}
          className="max-w-3xl mx-auto text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-6">Why This Exists</p>
          <h2 className="text-4xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-8">
            I was the buyer with the price sheet.
          </h2>
          <div className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5 text-left max-w-2xl mx-auto">
            <p>
              Last year my wife and I bought a new construction home. The builder handed us a printed sheet of paper and asked us to choose $20,000 in upgrades from it. Cabinets, countertops, flooring, fixtures. No images. No context. Just line items and prices.
            </p>
            <p>
              So I built the first version of Finch for our own selections.
            </p>
            <p>
              We used it. We spent 40% more than we planned. And we were happier about every choice we made.
            </p>
            <p className="text-slate-800 font-medium">
              When buyers can see what they are getting, they choose more and feel better about it. The builder gets more revenue per home. The buyer gets a kitchen they actually picked, not one they defaulted into.
            </p>
          </div>
          <p className="text-sm text-slate-400 mt-8">— Rashaad B., Finch founder. Homebuyer, then builder.</p>
        </div>
      </Section>

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
            {faqs.map((faq, index) => (
              <div key={faq.q} data-reveal style={revealStyle(90 + index * 70)}>
                <FaqItem q={faq.q} a={faq.a} onOpen={() => track("faq_opened", { question: faq.q })} />
              </div>
            ))}
          </div>
        </div>
      </Section>

      <section id="contact" className="px-6 py-20 md:py-28 bg-white border-t border-slate-100">
        <div
          data-reveal
          style={revealStyle(20)}
          className="max-w-3xl mx-auto text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-6">Next Step</p>
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-5 text-balance">
            See what your buyers would see.
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto text-balance">
            Upload a kitchen photo, pick finishes, and watch the room change. Takes 60 seconds.
          </p>
          <Link
            href="/try"
            onClick={() => track("cta_clicked", { cta: "Try the Demo", location: "contact" })}
            className="inline-block px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
          >
            Try the Demo
          </Link>
          <p className="text-xs text-slate-400 mt-4">Questions? hello@finchweb.io</p>
        </div>
      </section>

      <footer className="px-6 py-10 border-t border-slate-100 bg-slate-50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-sm font-semibold text-slate-900 tracking-[0.04em]">Finch</p>
          <div className="flex items-center gap-6">
            <a href="#compare" className="text-xs uppercase tracking-[0.16em] text-slate-400 hover:text-slate-700 transition-colors">How It Works</a>
            <a href="#pricing" className="text-xs uppercase tracking-[0.16em] text-slate-400 hover:text-slate-700 transition-colors">Pricing</a>
            <a href="#faq" className="text-xs uppercase tracking-[0.16em] text-slate-400 hover:text-slate-700 transition-colors">FAQ</a>
            <a href="mailto:hello@finchweb.io" className="text-xs uppercase tracking-[0.16em] text-slate-400 hover:text-slate-700 transition-colors">Contact</a>
          </div>
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} Finch. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
