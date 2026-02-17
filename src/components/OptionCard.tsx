"use client";

import type { Option } from "@/types";
import { formatPrice } from "@/lib/pricing";

interface OptionCardProps {
  option: Option;
  isSelected: boolean;
  onSelect: () => void;
  showSwatch: boolean;
}

export function OptionCard({
  option,
  isSelected,
  onSelect,
  showSwatch,
}: OptionCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? "border-[var(--color-gold)] bg-amber-50/50 shadow-sm"
          : "border-gray-200 hover:border-gray-300 bg-white"
      }`}
    >
      <div className="flex items-center gap-3">
        {showSwatch && (
          <div className="w-10 h-10 rounded-md bg-gray-100 border border-gray-200 flex-shrink-0 overflow-hidden">
            {option.swatchUrl ? (
              <img
                src={option.swatchUrl}
                alt={option.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-navy)] truncate">
              {option.name}
            </span>
            {option.nudge && (
              <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-gold)] bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                {option.nudge}
              </span>
            )}
          </div>
          <span
            className={`text-xs ${
              option.price === 0 ? "text-green-600" : "text-gray-500"
            }`}
          >
            {formatPrice(option.price)}
          </span>
        </div>

        <div
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
            isSelected
              ? "border-[var(--color-gold)] bg-[var(--color-gold)]"
              : "border-gray-300"
          }`}
        >
          {isSelected && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}
