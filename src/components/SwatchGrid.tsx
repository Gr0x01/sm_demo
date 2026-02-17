"use client";

import type { SubCategory } from "@/types";
import { formatPrice } from "@/lib/pricing";

// Extract the most useful short label from option names.
// "Baker Blvd 4x16 - White Gloss - 3rd Stagger Lay" → "White Gloss"
// "Granite - Steel Grey" → "Steel Grey"
// "Fairmont" → "Fairmont"
function getShortName(name: string): string {
  const parts = name.split(" - ");
  if (parts.length >= 3) return parts[1]; // color is the middle segment
  if (parts.length === 2) return parts[1]; // color is after the dash
  return name;
}

interface SwatchGridProps {
  subCategory: SubCategory;
  selectedOptionId: string | undefined;
  onSelect: (optionId: string) => void;
}

export function SwatchGrid({ subCategory, selectedOptionId, onSelect }: SwatchGridProps) {
  return (
    <div className="mb-5 last:mb-0">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2.5 px-0.5">
        {subCategory.name}
      </h4>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {subCategory.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className={`group relative flex flex-col items-center overflow-hidden border-2 transition-all duration-150 cursor-pointer ${
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
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
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

                {/* Selected checkmark — always rendered, animated via opacity */}
                <div
                  className={`absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow transition-all duration-150 ${
                    isSelected ? "opacity-100 scale-100" : "opacity-0 scale-75"
                  }`}
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                {/* Nudge badge */}
                {option.nudge && (
                  <div className="absolute top-1 left-1 bg-blue-50/90 border border-blue-200 px-1 py-0.5">
                    <span className="text-[8px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                      Popular
                    </span>
                  </div>
                )}
              </div>

              {/* Label */}
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
  );
}
