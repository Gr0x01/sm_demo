"use client";

import { useState } from "react";
import type { Category } from "@/types";
import { SubCategoryGroup } from "./SubCategoryGroup";

interface CategoryAccordionProps {
  category: Category;
  selections: Record<string, string>;
  onSelect: (subCategoryId: string, optionId: string) => void;
  categoryTotal: number;
}

export function CategoryAccordion({
  category,
  selections,
  onSelect,
  categoryTotal,
}: CategoryAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasVisual = category.subCategories.some((s) => s.isVisual);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[var(--color-navy)]">
            {category.name}
          </span>
          {hasVisual && (
            <span className="text-[10px] font-medium text-[var(--color-gold)] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Visual
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {categoryTotal > 0 && (
            <span className="text-xs font-medium text-[var(--color-gold)]">
              +${categoryTotal.toLocaleString()}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="p-4 pt-0 bg-white border-t border-gray-100">
          <div className="pt-3 space-y-5">
            {category.subCategories.map((sub) => (
              <SubCategoryGroup
                key={sub.id}
                subCategory={sub}
                selectedOptionId={selections[sub.id]}
                onSelect={(optionId) => onSelect(sub.id, optionId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
