"use client";

import { useEffect, useRef } from "react";

interface SyncModalProps {
  sourceName: string; // e.g. "Kitchen Cabinet Hardware"
  targetName: string; // e.g. "Bathroom Cabinet Hardware"
  optionName: string; // e.g. "Naples Pull Knob Combo - Brushed Gold"
  label: string; // e.g. "cabinet hardware"
  onSync: () => void;
  onDismiss: () => void;
}

export function SyncModal({
  sourceName,
  targetName,
  optionName,
  label,
  onSync,
  onDismiss,
}: SyncModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onDismiss]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={modalRef}
        className="bg-white w-full sm:max-w-md mx-0 sm:mx-4 p-6 shadow-xl border border-gray-200 animate-in slide-in-from-bottom-4 duration-200"
      >
        {/* Sync icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[var(--color-navy)]/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-[var(--color-navy)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-navy)]">
              Match your {label}?
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Keep your selections consistent
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-5">
          You selected <span className="font-semibold text-[var(--color-navy)]">{optionName}</span> for{" "}
          {sourceName.toLowerCase()}. Want to use the same for{" "}
          {targetName.toLowerCase()}?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onSync}
            className="flex-1 py-2.5 px-4 bg-[var(--color-navy)] text-white text-sm font-semibold hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer"
          >
            Yes, match them
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 px-4 border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
