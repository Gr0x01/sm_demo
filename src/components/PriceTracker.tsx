"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ImageIcon } from "lucide-react";

interface PriceTrackerProps {
  total: number;
  stepName?: string;
  stepProgressLabel?: string;
  showGenerateButton?: boolean;
  error?: string | null;
  previewImageUrl?: string | null;
  previewTitle?: string;
  previewSummary?: string[];
  showNavigation?: boolean;
  onBack?: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  backDisabled?: boolean;
  onSave?: () => void;
}

export function PriceTracker({
  total,
  stepName,
  stepProgressLabel,
  showGenerateButton = false,
  error,
  previewImageUrl = null,
  previewTitle,
  previewSummary = [],
  showNavigation = false,
  onBack,
  onPrimaryAction,
  primaryActionLabel = "Continue",
  backDisabled = false,
  onSave,
}: PriceTrackerProps) {
  const [pulse, setPulse] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const prevTotal = useRef(total);

  useEffect(() => {
    if (total !== prevTotal.current) {
      prevTotal.current = total;
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 400);
      return () => clearTimeout(timer);
    }
  }, [total]);

  useEffect(() => {
    setIsExpanded(false);
  }, [stepName]);

  const canExpand = showGenerateButton && !!previewImageUrl;

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 z-19"
          onClick={() => setIsExpanded(false)}
        />
      )}
    <div className="fixed bottom-0 left-0 w-full z-20 bg-white/95 backdrop-blur-sm border-t border-gray-200">
      {canExpand && (
        <div
          className={`overflow-hidden border-b border-gray-200/80 transition-[max-height,opacity] duration-300 ${
            isExpanded ? "max-h-[75vh] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="max-w-4xl mx-auto px-4 pt-3 pb-3">
            <div>
              {previewImageUrl && (
                <div className="overflow-hidden bg-gray-50">
                  <img
                    src={previewImageUrl}
                    alt={previewTitle ? `${previewTitle} preview` : "Generated preview"}
                    className="w-full aspect-[16/10] object-cover"
                  />
                </div>
              )}

              <div className="mt-3">
                <p className="text-sm font-semibold text-[var(--color-navy)] truncate min-w-0">
                  {previewTitle ?? "Current room"}
                </p>
              </div>

              {previewSummary.length > 0 && (
                <div className="mt-2 space-y-1">
                  {previewSummary.slice(0, 3).map((line) => (
                    <p key={line} className="text-xs text-gray-600 truncate">
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2.5">
        {showGenerateButton ? (
          <>
            {canExpand && (
              <button
                onClick={() => setIsExpanded((prev) => !prev)}
                className="inline-flex items-center gap-2 border border-gray-200 bg-gray-50 pl-1.5 pr-2 py-1.5 cursor-pointer max-w-[44vw]"
                aria-label={isExpanded ? "Collapse preview" : "Expand preview"}
              >
                <div className="w-10 h-10 overflow-hidden bg-gray-200 shrink-0">
                  {previewImageUrl ? (
                    <img src={previewImageUrl} alt="Preview thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-semibold text-[var(--color-navy)] truncate">Preview</p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {previewTitle ?? "Current room"}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                )}
              </button>
            )}

            <span
              className={`text-lg font-bold text-[var(--color-navy)] ml-auto ${pulse ? "animate-price-pulse" : ""}`}
            >
              {total === 0 ? "Base Package" : <>+${total.toLocaleString()}</>}
            </span>
          </>
        ) : (
          <>
            <span className="text-sm text-gray-500">Total Upgrades</span>
            <span
              className={`text-lg font-bold text-[var(--color-navy)] ml-auto ${pulse ? "animate-price-pulse" : ""}`}
            >
              {total === 0 ? "Base Package" : <>+${total.toLocaleString()}</>}
            </span>
          </>
        )}
      </div>
      {error && showGenerateButton && (
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <div className="bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        </div>
      )}

      {showNavigation && onPrimaryAction && (
        <div className="border-t border-gray-200/80">
          <div className="max-w-4xl mx-auto px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {stepProgressLabel && (
              <p className="mb-2 text-xs font-medium text-gray-500">{stepProgressLabel}</p>
            )}
            {onSave && (
              <div className="mb-2 flex justify-end">
                <button
                  onClick={onSave}
                  className="px-3 py-1.5 text-sm font-semibold border border-gray-300 text-gray-700 hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onBack}
                disabled={backDisabled}
                className={`py-2.5 text-sm font-semibold border transition-colors ${
                  backDisabled
                    ? "border-gray-200 text-gray-300 cursor-not-allowed"
                    : "border-gray-300 text-gray-700 hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] cursor-pointer"
                }`}
              >
                Back
              </button>
              <button
                onClick={onPrimaryAction}
                className="py-2.5 text-sm font-semibold bg-[var(--color-navy)] text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                {primaryActionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
