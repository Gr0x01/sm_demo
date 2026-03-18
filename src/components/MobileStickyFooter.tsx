"use client";

import { useState, useEffect } from "react";

interface MobileStickyFooterProps {
  /** Image URL for the expandable preview drawer */
  previewImageUrl: string | null;
  /** Alt text for preview image */
  previewLabel?: string;
  /** Content to show inside the expanded preview drawer, below the image (e.g., "Upload new photo" link) */
  previewExtra?: React.ReactNode;
  /** Middle row content between preview drawer and action buttons (e.g., GenerationCounter) */
  statusContent?: React.ReactNode;
  /** Primary action button config (right side) */
  primaryAction: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  /** Secondary action button config (left side). If omitted, defaults to Preview toggle */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Error message to display below the action buttons */
  error?: string | null;
}

export function MobileStickyFooter({
  previewImageUrl,
  previewLabel = "Preview",
  previewExtra,
  statusContent,
  primaryAction,
  secondaryAction,
  error,
}: MobileStickyFooterProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  // Close preview when image changes
  useEffect(() => {
    setPreviewOpen(false);
  }, [previewImageUrl]);

  return (
    <>
      {/* Backdrop */}
      {previewOpen && previewImageUrl && (
        <button
          type="button"
          aria-label="Close preview"
          onClick={() => setPreviewOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/20"
        />
      )}

      <div className="lg:hidden fixed bottom-0 inset-x-0 z-[60] bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-6px_24px_rgba(15,23,42,0.08)]">
        {/* Expandable preview drawer */}
        {previewImageUrl && (
          <div
            className={`overflow-hidden border-b border-slate-200/90 transition-[max-height,opacity] duration-300 ${
              previewOpen ? "max-h-[48vh] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="px-3 pt-3 pb-2">
              <img
                src={previewImageUrl}
                alt={previewLabel}
                className="w-full aspect-[16/10] object-cover border border-slate-200"
              />
              {previewExtra && <div className="pt-2 text-right">{previewExtra}</div>}
            </div>
          </div>
        )}

        {/* Status row */}
        {statusContent && (
          <div className="px-3 pt-2 flex justify-center">
            {statusContent}
          </div>
        )}

        {/* Action buttons */}
        <div className="px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] grid grid-cols-2 gap-2">
          {secondaryAction ? (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="h-11 inline-flex items-center justify-center gap-2 border border-slate-300 bg-white text-slate-700 text-xs font-semibold uppercase tracking-wider hover:bg-slate-50 transition-colors"
            >
              {secondaryAction.label}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPreviewOpen((prev) => !prev)}
              className="h-11 inline-flex items-center justify-center gap-2 border border-slate-300 bg-white text-slate-700 text-xs font-semibold uppercase tracking-wider hover:bg-slate-50 transition-colors"
              aria-expanded={previewOpen}
              aria-label={previewOpen ? "Hide preview" : "Show preview"}
            >
              {previewImageUrl && (
                <div className="w-6 h-6 overflow-hidden bg-slate-200 shrink-0">
                  <img src={previewImageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              Preview
              <svg
                className={`w-3.5 h-3.5 text-slate-500 transition-transform ${previewOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}

          <button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className="h-11 bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {primaryAction.label}
          </button>
        </div>

        {/* Error row */}
        {error && (
          <div className="px-3 pb-2">
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
