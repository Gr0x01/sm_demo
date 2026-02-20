"use client";

import { useState } from "react";
import { X, Mail, Check, Loader2 } from "lucide-react";

type ModalState = "prompt" | "saving" | "saved" | "resume-prompt" | "resume-loading" | "resume-not-found";

interface SaveSelectionsModalProps {
  sessionId: string;
  orgId: string;
  floorplanId: string;
  onClose: () => void;
  onSaved: (email: string, resumeToken: string) => void;
  onResumed: (session: { id: string; buyerEmail: string | null; selections: Record<string, string>; quantities: Record<string, number> }) => void;
}

export function SaveSelectionsModal({
  sessionId,
  orgId,
  floorplanId,
  onClose,
  onSaved,
  onResumed,
}: SaveSelectionsModalProps) {
  const [state, setState] = useState<ModalState>("prompt");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setState("saving");
    setError("");

    try {
      const res = await fetch(`/api/buyer-sessions/${sessionId}/save-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, floorplan_id: floorplanId, buyerEmail: trimmed }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const { resumeToken } = await res.json();
      setState("saved");
      onSaved(trimmed.toLowerCase(), resumeToken);
    } catch {
      setState("prompt");
      setError("Something went wrong. Please try again.");
    }
  };

  const handleResume = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setState("resume-loading");
    setError("");

    try {
      const res = await fetch("/api/buyer-sessions/resume-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, floorplan_id: floorplanId, buyerEmail: trimmed }),
      });

      if (res.status === 404) {
        setState("resume-not-found");
        return;
      }
      if (res.status === 429) {
        setState("resume-prompt");
        setError("Too many attempts. Please wait a moment.");
        return;
      }
      if (!res.ok) throw new Error("Failed to resume");

      const session = await res.json();
      onResumed({ id: session.id, buyerEmail: session.buyerEmail, selections: session.selections, quantities: session.quantities });
    } catch {
      setState("resume-prompt");
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {state === "saved" ? "Selections Saved" : state.startsWith("resume") ? "Resume Selections" : "Save Your Selections"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {/* Save email prompt */}
          {(state === "prompt" || state === "saving") && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Enter your email to save your selections. We&apos;ll send you a link to pick up where you left off.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@email.com"
                  className="flex-1 px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  disabled={state === "saving"}
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  disabled={state === "saving"}
                  className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {state === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </button>
              </div>
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
              <button
                onClick={() => { setState("resume-prompt"); setEmail(""); setError(""); }}
                className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline cursor-pointer"
              >
                Already saved? Enter your email to resume.
              </button>
            </>
          )}

          {/* Saved confirmation */}
          {state === "saved" && (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">
                We&apos;ve sent a resume link to <strong>{email.trim().toLowerCase()}</strong>.
                Check your inbox to pick up where you left off.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-[var(--color-navy)] text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                Continue Browsing
              </button>
            </div>
          )}

          {/* Resume by email prompt */}
          {(state === "resume-prompt" || state === "resume-loading") && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Enter the email you used to save your selections.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@email.com"
                  className="flex-1 px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-500"
                  onKeyDown={(e) => e.key === "Enter" && handleResume()}
                  disabled={state === "resume-loading"}
                  autoFocus
                />
                <button
                  onClick={handleResume}
                  disabled={state === "resume-loading"}
                  className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {state === "resume-loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                </button>
              </div>
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
              <button
                onClick={() => { setState("prompt"); setEmail(""); setError(""); }}
                className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline cursor-pointer"
              >
                Save new selections instead
              </button>
            </>
          )}

          {/* Resume not found */}
          {state === "resume-not-found" && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-4">
                No saved selections found for <strong>{email.trim().toLowerCase()}</strong> on this floorplan.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { setState("resume-prompt"); setError(""); }}
                  className="px-4 py-2 border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  onClick={() => { setState("prompt"); setEmail(""); setError(""); }}
                  className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Save Current Selections
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
