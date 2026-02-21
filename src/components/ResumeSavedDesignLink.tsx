"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isSubdomainClient } from "@/lib/subdomain";

type ResumeState = "idle" | "loading" | "not-found" | "error";

interface ResumeSavedDesignLinkProps {
  orgSlug: string;
  className?: string;
  color?: string;
}

export function ResumeSavedDesignLink({
  orgSlug,
  className = "",
  color,
}: ResumeSavedDesignLinkProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<ResumeState>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setState("error");
      setError("Please enter a valid email address.");
      return;
    }

    setState("loading");
    setError("");

    try {
      const res = await fetch("/api/buyer-sessions/resume-by-email-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug, buyerEmail: trimmed }),
      });

      if (res.status === 404) {
        setState("not-found");
        return;
      }
      if (res.status === 429) {
        setState("error");
        setError("Too many attempts. Please wait a moment.");
        return;
      }
      if (!res.ok) throw new Error("Failed to resume");

      const data = await res.json();
      setIsOpen(false);
      const path = isSubdomainClient()
        ? `/${data.floorplanSlug}?resume=${data.resumeToken}&page=picker`
        : `/${data.orgSlug}/${data.floorplanSlug}?resume=${data.resumeToken}&page=picker`;
      router.push(path);
    } catch {
      setState("error");
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        className={`${className} cursor-pointer`}
        style={color ? { color } : undefined}
        onClick={() => {
          setIsOpen(true);
          setState("idle");
          setError("");
        }}
      >
        Resume Design
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 animate-fade-in"
            onClick={() => setIsOpen(false)}
            aria-label="Close resume modal"
          />
          <div className="relative w-full max-w-md border border-slate-200 bg-white p-6 shadow-2xl animate-fade-slide-in">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">
              Resume Design
            </p>
            <h3 className="text-2xl font-semibold text-slate-900 mb-2">
              Pick up where you left off
            </h3>
            <p className="text-sm text-slate-600 mb-5">
              Enter your saved email and we&apos;ll open your most recent floorplan.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state === "not-found" || state === "error") {
                    setState("idle");
                    setError("");
                  }
                }}
                placeholder="you@example.com"
                className="w-full border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-700 transition-colors"
                disabled={state === "loading"}
              />
              <button
                type="submit"
                disabled={state === "loading"}
                className="w-full bg-slate-900 text-white py-2.5 text-sm font-medium hover:bg-slate-800 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
              >
                {state === "loading" ? "Loading..." : "Resume"}
              </button>
            </form>
            {state === "not-found" && (
              <p className="mt-3 text-sm text-amber-600 animate-fade-in">
                No saved design found for that email.
              </p>
            )}
            {error && (
              <p className="mt-3 text-sm text-red-600 animate-fade-in">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
