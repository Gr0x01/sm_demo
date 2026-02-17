"use client";

import type { SubCategory } from "@/types";
import { OptionCard } from "./OptionCard";

interface SubCategoryGroupProps {
  subCategory: SubCategory;
  selectedOptionId: string | undefined;
  onSelect: (optionId: string) => void;
}

export function SubCategoryGroup({
  subCategory,
  selectedOptionId,
  onSelect,
}: SubCategoryGroupProps) {
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
        {subCategory.name}
        {subCategory.isVisual && (
          <span className="ml-1.5 text-[var(--color-gold)]" title="Affects kitchen visualization">
            &#9679;
          </span>
        )}
      </h4>
      <div className="space-y-1.5">
        {subCategory.options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            isSelected={selectedOptionId === option.id}
            onSelect={() => onSelect(option.id)}
            showSwatch={subCategory.isVisual}
          />
        ))}
      </div>
    </div>
  );
}
