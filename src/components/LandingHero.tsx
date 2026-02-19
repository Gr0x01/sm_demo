"use client";

import { useState } from "react";
import type { ContractPhase } from "@/lib/contract-phase";

interface LandingHeroProps {
  onStart: (phase: ContractPhase) => void;
  orgName: string;
  planName?: string;
  community?: string;
}

export function LandingHero({
  onStart,
  orgName,
  planName = "",
  community = "",
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <div className="max-w-2xl text-center">
        <div className="mb-8">
          <h2 className="text-sm font-semibold tracking-widest uppercase text-[var(--color-accent)] mb-4">
            {orgName}
          </h2>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight text-[var(--color-navy)] mb-4">
            See Your Kitchen <span className="text-[var(--color-accent)]">Before You Choose</span>
          </h1>
          <p className="text-lg text-gray-500">
            {planName} Plan &mdash; {community}
          </p>
        </div>

        {/* Pre/Post contract toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className={`text-sm font-medium transition-colors ${phase === "pre-contract" ? "text-[var(--color-navy)]" : "text-gray-400"}`}>
            Pre-Contract
          </span>
          <button
            onClick={() => setPhase(phase === "pre-contract" ? "post-contract" : "pre-contract")}
            className="relative w-11 h-6 bg-gray-300 cursor-pointer transition-colors"
            style={{ backgroundColor: phase === "post-contract" ? "var(--color-navy)" : undefined }}
            aria-label="Toggle contract phase"
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white shadow transition-transform"
              style={{ transform: phase === "post-contract" ? "translateX(20px)" : "translateX(0)" }}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${phase === "post-contract" ? "text-[var(--color-navy)]" : "text-gray-400"}`}>
            Post-Contract
          </span>
        </div>

        <div>
          <button
            onClick={() => onStart(phase)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--color-navy)] text-white text-lg font-semibold hover:bg-[var(--color-navy-hover)] transition-all duration-150 shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer"
          >
            Start the Demo
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

        <p className="mt-6 text-sm text-gray-400">
          Real pricing &bull; AI-powered kitchen visualization
        </p>
      </div>
    </div>
  );
}
