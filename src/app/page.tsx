"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";

const faqs = [
  {
    q: "How long does setup take?",
    a: "Most builders are live in 2-3 weeks. We handle configuration. You send floor plans, options, and pricing.",
  },
  {
    q: "Do we need to change our sales process?",
    a: "No. Finch fits into your existing design appointment flow. Buyers use a visual tool, and your team gets a clean priced export.",
  },
  {
    q: "What does this cost?",
    a: "Pricing depends on community count and option catalog size. We scope it with you on a short walkthrough.",
  },
  {
    q: "Can this work with our current design center software?",
    a: "Yes. Finch is the visual layer for option selling. It can sit alongside your existing operational systems.",
  },
];

const revealStyle = (delay: number): CSSProperties => ({
  ["--reveal-delay" as string]: `${delay}ms`,
});

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-200">
      <button
        onClick={() => setOpen(!open)}
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
  prefix = "",
  suffix = "",
  min = 0,
  max = 99999,
  id,
  nextId,
}: {
  value: number;
  onChange: (n: number) => void;
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
  const [homes, setHomes] = useState(200);
  const [spend, setSpend] = useState(10000);
  const LIFT = 0.10;

  const additionalRevenue = Math.round(homes * spend * LIFT);

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
      <div className="grid md:grid-cols-3 gap-8 md:gap-12 text-center items-end">
        <div data-reveal style={revealStyle(140)}>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-2">
            Avg. upgrade spend
          </p>
          <EditableNumber
            value={spend}
            onChange={setSpend}
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
            min={10}
            max={10000}
            id="roi-homes"
          />
          <p className="text-sm text-slate-500 mt-2">homes per year</p>
        </div>

        <div data-reveal style={revealStyle(260)}>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-2">
            At a 10% lift
          </p>
          <p
            className="text-5xl md:text-6xl leading-none tracking-tight text-slate-900"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatDollars(additionalRevenue)}
          </p>
          <p className="text-sm text-slate-500 mt-2">
            additional annual revenue
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
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
      <section className="relative overflow-hidden px-6 pt-14 pb-20 md:pt-20 md:pb-24 bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-36 right-0 h-[420px] w-[420px] rounded-full bg-sky-100/40 blur-3xl" />
          <div className="absolute top-24 -left-20 h-[300px] w-[300px] rounded-full bg-slate-100 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <p
            data-reveal
            style={revealStyle(20)}
            className="text-xs font-semibold text-slate-500 uppercase tracking-[0.24em] mb-10"
          >
            Finch for Production Builders
          </p>

          <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-12 items-end">
            <div data-reveal style={revealStyle(100)}>
              <h1 className="text-[2.6rem] md:text-[4.4rem] leading-[0.95] text-slate-900 tracking-[-0.02em] mb-8">
                Buyers pick
                <br />
                Standard when
                <br />
                they cannot see
                <br />
                the upgrade.
              </h1>

              <p className="text-lg md:text-2xl leading-tight text-slate-600 max-w-2xl mb-10">
                Visual context changes option decisions. Same communities, same plans, stronger upgrade mix.
              </p>

              <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 mb-6">
                <Link
                  href="/stone-martin/kinkade"
                  className="w-full sm:w-auto text-center px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
                >
                  See the Demo
                </Link>
                <a
                  href="#contact"
                  className="w-full sm:w-auto text-center px-8 py-3.5 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-400 hover:bg-slate-50 transition-colors"
                >
                  Book a Walkthrough
                </a>
              </div>
              <p className="text-sm text-slate-500">Built for builders closing 100+ homes per year.</p>
            </div>

            <div
              data-reveal
              style={revealStyle(180)}
              className="border border-slate-200 p-6 md:p-8 bg-white shadow-sm"
            >
              <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">
                First 30 Days
              </p>
              <p className="text-3xl md:text-4xl leading-[1] tracking-tight text-slate-900 mb-8">
                Launch the visual selling layer without changing your process.
              </p>
              <div className="space-y-4 text-sm text-slate-600">
                <p>01. Share floor plans, options, and pricing.</p>
                <p>02. We configure your branded experience.</p>
                <p>03. Buyers select visually, not from a spreadsheet.</p>
                <p>04. Your team receives priced exports.</p>
              </div>
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
            Same upgrades.
            <br />
            Different decisions.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          <div
            data-reveal
            style={revealStyle(90)}
            className="bg-white border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-full max-w-[290px] space-y-2">
                  {[
                    "CABINETS — Oxford.............$0",
                    "COLOR — White Paint...........$0",
                    "COUNTERTOP — Dallas White..$0",
                    "BACKSPLASH — Warm Grey....$0",
                    "FLOORING — Westbourne.......$0",
                    "APPLIANCE — Side by Side....$0",
                  ].map((line, i) => (
                    <p key={i} className="text-[11px] md:text-xs font-mono text-slate-400 text-left">
                      {line}
                    </p>
                  ))}
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
              <Image src="/rooms/kitchen-close.webp" alt="AI-generated kitchen visualization" fill className="object-cover" />
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
            href="/stone-martin/kinkade"
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
            Industry data shows visualization drives 35% higher upgrade spend (Zonda/Envision).
            We model at 10% because we&apos;d rather under-promise. Our first pilot showed 16%.
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
              title: "Send floor plans and pricing",
              desc: "Your current options list is enough to start.",
            },
            {
              n: "02",
              title: "Get a branded buyer flow",
              desc: "Aligned to your communities and finish packages.",
            },
            {
              n: "03",
              title: "Buyers choose visually",
              desc: "Decisions happen in context, not line items.",
            },
            {
              n: "04",
              title: "Receive priced exports",
              desc: "Clear handoff for sales and operations teams.",
            },
          ].map((step, index) => (
            <div key={step.n} data-reveal style={revealStyle(90 + index * 70)}>
              <p className="text-3xl md:text-4xl leading-none tracking-tight text-slate-300 mb-3">{step.n}</p>
              <h3 className="text-lg text-slate-900 leading-tight mb-2">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="positioning">
        <div
          data-reveal
          style={revealStyle(20)}
          className="max-w-4xl mx-auto text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-6">Directly Stated</p>
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-8">
            No logo wall yet.
            <br />
            No inflated case study deck.
          </h2>
          <p className="text-xl md:text-2xl text-slate-700 leading-tight mb-6">
            If you want polished vendor theater, this is not that. If you want a practical rollout that helps buyers choose better upgrades, this is built for that.
          </p>
          <p className="text-base text-slate-500 max-w-3xl mx-auto">
            We start with your floor plans, your option list, and your current pricing. You evaluate the output in your own market conditions.
          </p>
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
                <FaqItem q={faq.q} a={faq.a} />
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
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-5">
            Bring your floor plans.
            <br />
            We will map the first version.
          </h2>
          <p className="text-lg text-slate-600 mb-10">15 minutes. No commitment. Directly scoped to your communities.</p>
          <a
            href="mailto:hello@finchweb.io"
            className="inline-block px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
          >
            Book a 15-Minute Walkthrough
          </a>
          <p className="text-xs text-slate-400 mt-4">Or email us directly: hello@finchweb.io</p>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-slate-100 bg-slate-50">
        <div
          data-reveal
          style={revealStyle(20)}
          className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <p className="text-sm font-semibold text-slate-500 tracking-[0.16em] uppercase">Finch</p>
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} Finch. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
