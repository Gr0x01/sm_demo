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
    <div className="mb-4 last:mb-0">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-0.5">
        {subCategory.name}
      </h4>
      <div className="space-y-1">
        {subCategory.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md border transition-all cursor-pointer text-left ${
                isSelected
                  ? "border-[var(--color-gold)] bg-amber-50/50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  isSelected
                    ? "border-[var(--color-gold)] bg-[var(--color-gold)]"
                    : "border-gray-300"
                }`}
              >
                {isSelected && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-[var(--color-navy)] flex-1 truncate">{option.name}</span>
              {option.nudge && (
                <span className="flex-shrink-0 text-[9px] font-semibold uppercase text-[var(--color-gold)] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  {option.nudge}
                </span>
              )}
              <span className={`text-xs flex-shrink-0 ${option.price === 0 ? "text-green-600" : "text-gray-500"}`}>
                {formatPrice(option.price)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
