"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import type { ContractPhase } from "@/lib/contract-phase";

type ResumeState = "idle" | "loading" | "not-found" | "error";

interface LandingHeroProps {
  onStart: (phase: ContractPhase) => void;
  orgName: string;
  orgSlug?: string;
  planName?: string;
  community?: string;
  floorplanSlug?: string;
  orgId?: string;
  floorplanId?: string;
  isSubdomain?: boolean;
  onResumed?: (session: {
    id: string;
    buyerEmail?: string | null;
    selections: Record<string, string>;
    quantities: Record<string, number>;
  }) => void;
}

export function LandingHero({
  onStart,
  orgName,
  orgSlug,
  planName = "",
  community = "",
  floorplanSlug,
  orgId,
  floorplanId,
  isSubdomain = false,
  onResumed,
}: LandingHeroProps) {
  const [phase, setPhaseRaw] = useState<ContractPhase>(() => {
    if (typeof window === "undefined") return "pre-contract";
    const saved = localStorage.getItem("contractPhase");
    return saved === "post-contract" ? "post-contract" : "pre-contract";
  });
  const setPhase = (p: ContractPhase) => {
    setPhaseRaw(p);
    localStorage.setItem("contractPhase", p);
  };

  // Resume state
  const [resumeEmail, setResumeEmail] = useState("");
  const [resumeState, setResumeState] = useState<ResumeState>("idle");
  const [resumeError, setResumeError] = useState("");
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(Boolean(floorplanSlug));

  // Auto-focus resume input when ?action=resume
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "resume") {
      resumeInputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    setShowPreview(Boolean(floorplanSlug));
  }, [floorplanSlug]);

  const canResume = Boolean(orgId && floorplanId && onResumed);
  const floorplanPreviewSrc = floorplanSlug ? `/floorplans/${floorplanSlug}.webp` : null;

  const handleResume = async () => {
    if (!canResume || !orgId || !floorplanId || !onResumed) return;
    const trimmed = resumeEmail.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setResumeError("Please enter a valid email address");
      return;
    }

    setResumeState("loading");
    setResumeError("");

    try {
      const res = await fetch("/api/buyer-sessions/resume-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, floorplan_id: floorplanId, buyerEmail: trimmed }),
      });

      if (res.status === 404) {
        setResumeState("not-found");
        return;
      }
      if (res.status === 429) {
        setResumeState("error");
        setResumeError("Too many attempts. Please wait a moment.");
        return;
      }
      if (!res.ok) throw new Error("Failed to resume");

      const session = await res.json();
      setResumeState("idle");
      onResumed({
        id: session.id,
        buyerEmail: session.buyerEmail,
        selections: session.selections,
        quantities: session.quantities,
      });
    } catch {
      setResumeState("error");
      setResumeError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 md:py-14">
      <div className={canResume ? "max-w-6xl mx-auto border border-slate-200 bg-white" : "max-w-3xl mx-auto border border-slate-200 bg-white"}>
        {orgSlug && (
          <div className="px-6 py-4 sm:px-8 md:px-10 border-b border-slate-200">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Link href={isSubdomain ? "/" : `/${orgSlug}`} className="hover:text-[var(--color-navy)] transition-colors">
                {orgName}
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700">{planName || "Plan"}</span>
            </div>
          </div>
        )}
        <div className={canResume ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]" : ""}>
          <div className="p-6 sm:p-8 md:p-10">
            <h2 className={`text-sm font-semibold tracking-widest uppercase text-[var(--color-accent)] mb-4 ${canResume ? "" : "text-center"}`}>
              {orgName}
            </h2>
            <h1 className={`text-4xl md:text-5xl font-bold leading-tight text-[var(--color-navy)] mb-4 ${canResume ? "" : "text-center"}`}>
              {planName || "Home Design"}
            </h1>
            <p className={`text-lg text-slate-500 ${canResume ? "" : "text-center"}`}>
              {planName} Plan &mdash; {community}
            </p>

            {showPreview && floorplanPreviewSrc && (
              <div className={`mt-7 border border-slate-200 ${canResume ? "w-full" : "max-w-lg mx-auto"}`}>
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={floorplanPreviewSrc}
                    alt={`${planName} exterior preview`}
                    fill
                    sizes="(max-width: 768px) 100vw, 60vw"
                    className="object-cover"
                    onError={() => setShowPreview(false)}
                  />
                </div>
              </div>
            )}

            <div className={`mt-6 flex w-full ${canResume ? "" : "max-w-lg mx-auto"} flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium transition-colors ${phase === "pre-contract" ? "text-[var(--color-navy)]" : "text-slate-400"}`}>
                  Pre-Contract
                </span>
                <button
                  onClick={() => setPhase(phase === "pre-contract" ? "post-contract" : "pre-contract")}
                  className="relative w-11 h-6 bg-slate-300 cursor-pointer transition-colors"
                  style={{ backgroundColor: phase === "post-contract" ? "var(--color-navy)" : undefined }}
                  aria-label="Toggle contract phase"
                  type="button"
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white shadow transition-transform"
                    style={{ transform: phase === "post-contract" ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
                <span className={`text-sm font-medium transition-colors ${phase === "post-contract" ? "text-[var(--color-navy)]" : "text-slate-400"}`}>
                  Post-Contract
                </span>
              </div>

              <button
                onClick={() => onStart(phase)}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-8 py-4 bg-[var(--color-navy)] text-white text-lg font-semibold hover:bg-[var(--color-navy-hover)] transition-all duration-150 shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer"
              >
                Get Started
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          {canResume && (
            <aside className="border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50 p-6 sm:p-8 lg:p-10 flex flex-col">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)] mb-2">
                  Returning Buyer
                </p>
                <h3 className="text-2xl font-semibold text-[var(--color-navy)] mb-2">
                  Resume Your Design
                </h3>
                <p className="text-sm text-slate-600 mb-5">
                  Enter your saved email to continue where you left off.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleResume();
                  }}
                  className="space-y-3"
                >
                  <input
                    ref={resumeInputRef}
                    type="email"
                    placeholder="you@example.com"
                    value={resumeEmail}
                    onChange={(e) => {
                      setResumeEmail(e.target.value);
                      if (resumeState === "not-found" || resumeState === "error") {
                        setResumeState("idle");
                        setResumeError("");
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-navy)] transition-colors"
                    disabled={resumeState === "loading"}
                  />
                  <button
                    type="submit"
                    disabled={resumeState === "loading"}
                    className="w-full px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-medium hover:bg-[var(--color-navy-hover)] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {resumeState === "loading" ? "Loading..." : "Resume"}
                  </button>
                </form>

                {resumeState === "not-found" && (
                  <p className="mt-3 text-sm text-amber-600">
                    No saved design found for that email.
                  </p>
                )}
                {resumeError && (
                  <p className="mt-3 text-sm text-red-600">
                    {resumeError}
                  </p>
                )}
              </div>

              <div className="mt-8 lg:mt-auto pt-6 border-t border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-2">
                  New Here?
                </p>
                <p className="text-sm text-slate-600">
                  Use Get Started on the left to begin a new design. You can save anytime.
                </p>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
