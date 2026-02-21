"use client";

import type { SubCategory } from "@/types";
import { formatPrice } from "@/lib/pricing";

interface CompactOptionListProps {
  subCategory: SubCategory;
  selectedOptionId: string | undefined;
  onSelect: (optionId: string) => void;
}

export function CompactOptionList({ subCategory, selectedOptionId, onSelect }: CompactOptionListProps) {
  return (
    <div className="mb-4 last:mb-0 mt-6 first:mt-0">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-navy)] mb-3 px-0.5">
        {subCategory.name}
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {subCategory.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className={`relative flex flex-col items-center justify-center px-3 py-4 border-2 transition-all duration-150 cursor-pointer text-center min-h-[72px] ${
                isSelected
                  ? "border-[var(--color-accent)] bg-blue-50/60 shadow-sm"
                  : "border-gray-200 hover:border-gray-400 bg-white active:scale-[0.98]"
              }`}
            >
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[var(--color-accent)] flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              <span className="text-xs font-medium text-[var(--color-navy)] leading-tight">{option.name}</span>
              {option.nudge && (
                <span className="mt-1 text-[9px] font-semibold uppercase text-[var(--color-accent)] bg-blue-50 px-1.5 py-0.5 border border-blue-200">
                  {option.nudge}
                </span>
              )}
              <span className={`mt-1 text-xs font-medium ${option.price === 0 ? "text-green-600" : "text-gray-500"}`}>
                {formatPrice(option.price)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
