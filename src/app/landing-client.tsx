"use client";

import { useEffect, useState, useCallback, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTrack } from "@/hooks/useTrack";

const revealStyle = (delay: number): CSSProperties => ({
  ["--reveal-delay" as string]: `${delay}ms`,
});

/* ─── Reveal Observer ─── */
export function RevealObserver() {
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

  return null;
}

/* ─── Tracked Link ─── */
export function TrackedLink({
  href,
  className,
  children,
  event,
  properties,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  event: string;
  properties?: Record<string, unknown>;
}) {
  const track = useTrack();

  return (
    <a
      href={href}
      className={className}
      onClick={() => track(event, properties)}
    >
      {children}
    </a>
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
export function RoiCalculator() {
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

/* ─── Hero Proof Card ─── */
export function HeroProofCard() {
  const track = useTrack();

  return (
    <Link
      href="/try"
      onClick={() => track("proof_card_clicked")}
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

/* ─── FAQ Item ─── */
export function FaqItem({ q, a }: { q: string; a: string }) {
  const track = useTrack();
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-200">
      <button
        onClick={() => {
          if (!open) track("faq_opened", { question: q });
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

/* ─── Pilot Contact Form ─── */
export function PilotForm({ onSubmitted }: { onSubmitted?: () => void }) {
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
