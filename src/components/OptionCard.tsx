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
      className={`w-full text-left p-3 border-2 transition-all duration-150 cursor-pointer ${
        isSelected
          ? "border-[var(--color-accent)] bg-blue-50/50 shadow-sm"
          : "border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white active:scale-[0.99]"
      }`}
    >
      <div className="flex items-center gap-3">
        {showSwatch && (
          <div className="w-10 h-10 bg-gray-100 border border-gray-200 flex-shrink-0 overflow-hidden">
            {option.swatchUrl ? (
              <img
                src={option.swatchUrl}
                alt={option.name}
                className="w-full h-full object-cover"
              />
            ) : option.swatchColor ? (
              <div className="w-full h-full" style={{ backgroundColor: option.swatchColor }} />
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
              <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)] bg-blue-50 px-1.5 py-0.5 border border-blue-200">
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
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors duration-150 ${
            isSelected
              ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
              : "border-gray-300"
          }`}
        >
          <svg
            className={`w-3 h-3 text-white transition-all duration-150 ${
              isSelected ? "opacity-100 scale-100" : "opacity-0 scale-50"
            }`}
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
        </div>
      </div>
    </button>
  );
}
