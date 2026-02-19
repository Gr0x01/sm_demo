"use client";

import { useState, useCallback } from "react";
import type { SubCategory, Option } from "@/types";
import { formatPrice } from "@/lib/pricing";
import { ImageLightbox } from "./ImageLightbox";

// Extract the most useful short label from option names.
function getShortName(name: string): string {
  const parts = name.split(" - ");
  if (parts.length >= 3) {
    const last = parts[parts.length - 1];
    return last.toLowerCase().includes("lay") ? parts[1] : last;
  }
  if (parts.length === 2) return parts[1];
  return name;
}

interface SwatchGridProps {
  subCategory: SubCategory;
  selectedOptionId: string | undefined;
  disabled?: boolean;
  disabledReason?: string;
  disableZoom?: boolean;
  /** Override the default grid column classes */
  gridClassName?: string;
  onSelect: (optionId: string) => void;
}

export function SwatchGrid({ subCategory, selectedOptionId, disabled = false, disabledReason, disableZoom = false, gridClassName, onSelect }: SwatchGridProps) {
  const [zoomedOption, setZoomedOption] = useState<Option | null>(null);

  const openZoom = useCallback((e: React.MouseEvent, option: Option) => {
    e.stopPropagation();
    setZoomedOption(option);
  }, []);

  return (
    <>
      <div className="mb-5 last:mb-0">
        <h4 className={`text-sm font-semibold mb-2.5 px-0.5 ${disabled ? "text-gray-400" : "text-gray-600"}`}>
          {subCategory.name}
        </h4>
        {disabled && disabledReason && (
          <p className="text-xs text-amber-700 mb-2 px-0.5">{disabledReason}</p>
        )}
        <div className={gridClassName || "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2"}>
          {subCategory.options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            const hasVisual = !!(option.swatchUrl || option.swatchColor);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                disabled={disabled}
                className={`group relative flex flex-col items-center overflow-hidden border-2 transition-all duration-150 ${
                  disabled
                    ? "cursor-not-allowed opacity-50 border-gray-200 bg-gray-50"
                    : "cursor-pointer"
                } ${
                  isSelected
                    ? "border-[var(--color-accent)] shadow-md bg-blue-50/50"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white active:scale-[0.97]"
                }`}
              >
                {/* Swatch image or color block */}
                <div className="w-full aspect-square bg-gray-100 overflow-hidden relative">
                  {option.swatchUrl ? (
                    <img
                      src={option.swatchUrl}
                      alt={option.name}
                      className={`w-full h-full object-cover transition-transform duration-200 ${disabled ? "" : "group-hover:scale-105"}`}
                    />
                  ) : option.swatchColor ? (
                    <div className="w-full h-full" style={{ backgroundColor: option.swatchColor }} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <span className="text-[10px] text-gray-400 text-center px-1 leading-tight">
                        {getShortName(option.name)}
                      </span>
                    </div>
                  )}

                  {/* Selected checkmark */}
                  <div
                    className={`absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow transition-all duration-150 ${
                      isSelected ? "opacity-100 scale-100" : "opacity-0 scale-75"
                    }`}
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  {/* Zoom button — bottom-right, visible on hover */}
                  {hasVisual && !disableZoom && (
                    <div
                      role="button"
                      tabIndex={-1}
                      onClick={(e) => openZoom(e, option)}
                      className={`absolute bottom-1 right-1 w-6 h-6 bg-black/50 flex items-center justify-center transition-opacity duration-150 ${
                        disabled
                          ? "opacity-0 pointer-events-none"
                          : "opacity-0 group-hover:opacity-100 cursor-pointer hover:bg-black/70 active:scale-90"
                      }`}
                      aria-label={`Zoom ${option.name}`}
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15zM10.5 7.5v6m3-3h-6" />
                      </svg>
                    </div>
                  )}

                  {/* Nudge badge */}
                  {option.nudge && (
                    <div className="absolute top-1 left-1 bg-blue-50/90 border border-blue-200 px-1 py-0.5">
                      <span className="text-[8px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                        Popular
                      </span>
                    </div>
                  )}
                </div>

                {/* Label — name + price beneath every swatch */}
                <div className="w-full px-1.5 py-1.5 text-center">
                  <p className="text-[11px] font-medium text-[var(--color-navy)] leading-tight truncate">
                    {getShortName(option.name)}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${option.price === 0 ? "text-green-600" : "text-gray-500"}`}>
                    {formatPrice(option.price)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Swatch zoom lightbox */}
      {zoomedOption && (
        <ImageLightbox
          src={zoomedOption.swatchUrl || undefined}
          color={zoomedOption.swatchColor || undefined}
          alt={zoomedOption.name}
          onClose={() => setZoomedOption(null)}
        />
      )}
    </>
  );
}
