"use client";

import { useEffect, useState, useCallback, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import { useTrack } from "@/hooks/useTrack";

const HOMEPAGE_NAV_LINKS = [
  { label: "Try It", href: "/try" },
  { label: "How It Works", href: "#how" },
  { label: "Pilot", href: "#pilot" },
  { label: "FAQ", href: "#faq" },
];

const faqs = [
  {
    q: "How long does setup take?",
    a: "First floor plan is live in 48 hours. Additional plans are typically a day or two each. You send us your option sheets and model home photos. We do the rest.",
  },
  {
    q: "What does a pilot look like?",
    a: "We set up one floor plan at no cost. You use it with real buyers. We measure upgrade revenue together over 60 days. If the numbers work, we expand. If they don\u2019t, you walk away with no obligation.",
  },
  {
    q: "What does the buyer experience look like?",
    a: "Buyers open a link, pick finishes from your catalog, and see the room update with their selections. It works on any device, takes a few minutes, and exports a priced selection sheet when they\u2019re done. No app download. No account required.",
  },
  {
    q: "Do we need to change our sales process?",
    a: "No. Finch fits into your existing design appointments. Buyers use the tool themselves. Your team gets a priced selection sheet, same as today.",
  },
  {
    q: "What does this cost?",
    a: "Pricing is scoped to your floor plan count and volume. Your first plan is free so we can prove the value before we talk numbers. Reach out and we\u2019ll walk through it together.",
  },
  {
    q: "How is this different from Envision or other platforms?",
    a: "Envision takes months to implement and requires significant infrastructure. Finch is live in 48 hours, handles all the setup for you, and is built for production builders who want to sell more upgrades without a massive platform commitment.",
  },
  {
    q: "Can this work with our current design center software?",
    a: "Yes. Finch is the visual layer that makes your existing options sell better. It exports a priced selection sheet you can enter into any system you already use.",
  },
  {
    q: "Can we update pricing and options ourselves?",
    a: "Yes. Every builder gets an admin dashboard to update option pricing, add or remove finishes, and manage floor plans\u00a0\u2014\u00a0any time, no ticket required. If you need a bulk update done for you, we\u2019ll handle it for a flat fee.",
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
          {open ? "\u2212" : "+"}
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
  const [homes, setHomes] = useState(100);
  const [spend, setSpend] = useState(10000);
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
      href="/try"
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

/* ─── Pilot Contact Form ─── */
function PilotForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const track = useTrack();
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: (fd.get("name") as string).trim(),
      company: (fd.get("company") as string).trim(),
      email: (fd.get("email") as string).trim(),
      phone: (fd.get("phone") as string)?.trim() || undefined,
    };

    try {
      const res = await fetch("/api/pilot-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Request failed");

      track("pilot_form_submitted", { company: payload.company });
      setStatus("success");
      onSubmitted?.();
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again or email hello@withfin.ch.");
    }
  }, [track, onSubmitted]);

  if (status === "success") {
    return (
      <div className="text-center py-6">
        <p className="text-lg font-semibold text-slate-900 mb-2">We&apos;ll be in touch within 24 hours.</p>
        <Link
          href="/try"
          className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700 transition-colors"
        >
          Try It Live while you wait
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <input
          name="name"
          type="text"
          required
          placeholder="Your name"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
        />
        <input
          name="company"
          type="text"
          required
          placeholder="Company"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
        />
        <input
          name="phone"
          type="tel"
          placeholder="Phone (optional)"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
        />
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end items-center gap-4">
        <Link
          href="/try"
          className="w-full sm:w-auto text-center px-8 py-3.5 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-900 hover:text-slate-900 transition-colors"
        >
          Try It Live
        </Link>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full sm:w-auto text-center px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "submitting" ? "Sending..." : "Start a Pilot"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}
    </form>
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

      {/* ─── Hero ─── */}
      <section className="px-6 pt-14 pb-18 md:pt-18 md:pb-16 lg:pt-20 lg:pb-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-10 lg:gap-12 items-center">
            <div data-reveal style={revealStyle(100)}>
              <h1 className="text-[3.2rem] md:text-[3.6rem] lg:text-[4.4rem] leading-[0.95] text-slate-900 tracking-[-0.02em] mb-8">
                They always
                <br />
                pick Standard.
              </h1>

              <p className="text-lg md:text-xl lg:text-2xl leading-tight text-slate-600 max-w-xl mb-10">
                Not because they want the base package. Because they can&apos;t picture what they&apos;re paying for.
              </p>

              <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 mb-4">
                <Link
                  href="/try"
                  onClick={() => track("cta_clicked", { cta: "Try It Live", location: "hero" })}
                  className="w-full sm:w-auto text-center px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
                >
                  Try It Live
                </Link>
                <a
                  href="#pilot"
                  onClick={() => track("cta_clicked", { cta: "Start a Pilot", location: "hero" })}
                  className="w-full sm:w-auto text-center px-8 py-3.5 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-900 hover:text-slate-900 transition-colors"
                >
                  Start a Pilot
                </a>
              </div>

              <p className="text-xs text-slate-400">
                Currently in pilot with a production home builder in the Southeast.
              </p>

            </div>

            <div data-reveal style={revealStyle(180)} className="hidden md:block">
              <HeroProofCard onClicked={() => track("proof_card_clicked")} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Speed Bar ─── */}
      <div className="px-6 py-12 md:py-16 bg-slate-100">
        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl md:text-4xl leading-none tracking-tight text-slate-900 mb-2" style={{ fontVariantNumeric: "tabular-nums" }}>48hrs</p>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">First plan live</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl leading-none tracking-tight text-slate-900 mb-2">Done for you</p>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">We build it. You sell from it.</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl leading-none tracking-tight text-slate-900 mb-2">1 plan</p>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Free to prove it works</p>
          </div>
        </div>
      </div>

      {/* ─── Before / After ─── */}
      <Section gray id="compare">
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-12 md:mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">Before and After</p>
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
                { label: "BACKSPLASH \u2014 Herringbone Glacier", price: "$425" },
                { label: "COUNTERTOP \u2014 Calacatta Venice", price: "$2,450" },
                { label: "HARDWARE \u2014 Dominique Gold Pulls", price: "$300" },
                { label: "FAUCET \u2014 Colfax Brushed Gold", price: "$375" },
                { label: "ISLAND \u2014 Admiral Blue", price: "$200" },
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
                    { label: "BACKSPLASH \u2014 Herringbone Glacier", price: "$425" },
                    { label: "COUNTERTOP \u2014 Calacatta Venice", price: "$2,450" },
                    { label: "HARDWARE \u2014 Dominique Gold Pulls", price: "$300" },
                    { label: "FAUCET \u2014 Colfax Brushed Gold", price: "$375" },
                    { label: "ISLAND \u2014 Admiral Blue", price: "$200" },
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
            This demo uses a real builder&apos;s catalog and pricing. Yours will show your finishes, your prices, your floor plans.
          </p>
          <Link
            href="/try"
            onClick={() => track("cta_clicked", { cta: "Try It Live", location: "compare" })}
            className="inline-block px-6 py-3 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
          >
            Try It Live
          </Link>
        </div>
      </Section>

      {/* ─── ROI Calculator ─── */}
      <Section id="roi">
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">Your Numbers</p>
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900">
            Plug in your numbers.
          </h2>
        </div>

        <RoiCalculator />

        <div
          data-reveal
          style={revealStyle(330)}
          className="text-center max-w-3xl mx-auto"
        >
          <p className="text-2xl md:text-3xl text-slate-800 leading-tight mb-6">
            Buyers upgrade what they can see. The ones who can&apos;t picture it default to&nbsp;Standard.
          </p>
          <p className="text-xs text-slate-400 max-w-2xl mx-auto">
            Zonda reports 35% average lift with visualization across 225+ builder brands. In our first test, a buyer trying to hold the line on budget still chose 40% more after seeing their selections. We default to 15%.
          </p>
        </div>
      </Section>

      {/* ─── How It Works ─── */}
      <Section gray id="how">
        <div
          data-reveal
          style={revealStyle(20)}
          className="text-center mb-14"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">How It Works</p>
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900">We build it. Your buyers use it. You get the&nbsp;revenue.</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              n: "01",
              title: "Send us your floor plans and\u00a0pricing",
              desc: "Your current option sheets and a few model home photos. Whatever you have works. We handle the\u00a0rest.",
            },
            {
              n: "02",
              title: "We build your upgrade\u00a0experience",
              desc: "Your finishes, your prices, your brand. First plan live in 48\u00a0hours. Update pricing or swap options yourself through the admin dashboard\u00a0\u2014\u00a0or send us the\u00a0changes.",
            },
            {
              n: "03",
              title: "Buyers see their kitchen before they\u00a0commit",
              desc: "They pick options and watch the room change. Not a line item on a sheet. The actual kitchen with their selections\u00a0applied.",
            },
            {
              n: "04",
              title: "You get priced selections\u00a0back",
              desc: "Every session exports a selection sheet with pricing. Ready for your sales team. No\u00a0re-entry.",
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
          <p className="text-sm text-slate-500">
            No software to learn. No data entry. No IT department required. First plan in 48 hours. Full catalog in days, not&nbsp;months.
          </p>
        </div>
      </Section>

      {/* ─── Pilot Program ─── */}
      <Section id="pilot">
        <div
          data-reveal
          style={revealStyle(20)}
          className="max-w-3xl mx-auto text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-4">Start Here</p>
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-6">
            One floor plan. Zero risk.
            <br />
            Prove the ROI first.
          </h2>
          <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
            We set up your best-selling floor plan at no cost. Your finishes, your pricing, your photos. Buyers use it during real design appointments. We measure upgrade revenue together.
          </p>
        </div>

        <div
          data-reveal
          style={revealStyle(90)}
          className="max-w-3xl mx-auto border border-slate-200 bg-white p-6 md:p-8"
        >
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-8">
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-1">48 hours to live</p>
              <p className="text-sm text-slate-500">Send us your floor plan and options. We handle everything&nbsp;else.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-1">60-day pilot</p>
              <p className="text-sm text-slate-500">Real buyers, real selections, real upgrade revenue&nbsp;data.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-1">Walk away anytime</p>
              <p className="text-sm text-slate-500">If the numbers don&apos;t work, you owe nothing. No contract. No&nbsp;obligation.</p>
            </div>
          </div>

          <PilotForm />
        </div>

        <p
          data-reveal
          style={revealStyle(160)}
          className="text-sm text-slate-400 text-center mt-6"
        >
          After the pilot, pricing is per floor plan per month. We scope it to your volume.
        </p>
      </Section>

      {/* ─── Why This Exists ─── */}
      <Section gray id="why">
        <div
          data-reveal
          style={revealStyle(20)}
          className="max-w-3xl mx-auto text-center"
        >
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-6">Why This Exists</p>
          <h2 className="text-4xl md:text-5xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-8">
            We spent 40% more &mdash; and felt better about every&nbsp;dollar.
          </h2>
          <div className="text-lg md:text-xl text-slate-600 leading-relaxed space-y-5 text-left max-w-2xl mx-auto">
            <p>
              My wife and I just bought a new construction home, partly as an investment, so the goal was to keep costs&nbsp;low. We wanted to upgrade the kitchen, but all we had was a price sheet. Even with samples in hand, you can touch each piece, but you still can&apos;t see what it all looks like&nbsp;together.
            </p>
            <p>
              So I built a tool that showed us. We spent 40% more than planned, felt great about every choice, and never second-guessed a single&nbsp;one.
            </p>
            <p className="text-slate-800 font-medium">
              Your buyers want to upgrade. They just need to see it&nbsp;first.
            </p>
          </div>
          <p className="text-sm text-slate-400 mt-8">&mdash; Rashaad, Finch</p>
        </div>
      </Section>

      {/* ─── FAQ ─── */}
      <Section id="faq">
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

      {/* ─── Final CTA ─── */}
      <section id="contact" className="px-6 py-20 md:py-28 bg-white border-t border-slate-100">
        <div
          data-reveal
          style={revealStyle(20)}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-slate-900 mb-5">
            Your buyers can&apos;t upgrade what they can&apos;t see.
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto text-balance">
            Upload a model home photo. Pick finishes. Watch the room change. This is what your buyers would see.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/try"
              onClick={() => track("cta_clicked", { cta: "Try It Live", location: "contact" })}
              className="inline-block px-8 py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              Try It Live
            </Link>
            <a
              href="#pilot"
              onClick={() => track("cta_clicked", { cta: "Start a Pilot", location: "contact" })}
              className="inline-block px-6 py-3 border border-slate-300 text-slate-700 text-sm font-semibold uppercase tracking-wider hover:border-slate-900 hover:text-slate-900 transition-colors"
            >
              Start a Pilot
            </a>
          </div>
          <p className="text-xs text-slate-400 mt-4">Questions? hello@withfin.ch</p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="px-6 py-10 border-t border-slate-100 bg-slate-50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-sm font-semibold text-slate-900 tracking-[0.04em]">Finch</p>
          <div className="flex items-center gap-6">
            <a href="#how" className="text-xs uppercase tracking-[0.16em] text-slate-400 hover:text-slate-700 transition-colors">How It Works</a>
            <a href="#pilot" className="text-xs uppercase tracking-[0.16em] text-slate-400 hover:text-slate-700 transition-colors">Pilot</a>
            <a href="#faq" className="text-xs uppercase tracking-[0.16em] text-slate-400 hover:text-slate-700 transition-colors">FAQ</a>
            <a href="mailto:hello@withfin.ch" className="text-xs uppercase tracking-[0.16em] text-slate-400 hover:text-slate-700 transition-colors">Contact</a>
          </div>
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} Finch. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
