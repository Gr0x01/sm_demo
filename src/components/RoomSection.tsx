"use client";

import type { SubCategory } from "@/types";
import { SwatchGrid } from "./SwatchGrid";
import { CompactOptionList } from "./CompactOptionList";

interface RoomSectionProps {
  subCategories: SubCategory[];
  selections: Record<string, string>;
  onSelect: (subCategoryId: string, optionId: string) => void;
}

export function RoomSection({ subCategories, selections, onSelect }: RoomSectionProps) {
  if (subCategories.length === 0) return null;

  return (
    <div className="space-y-5 mt-5">
      {subCategories.map((sub) => {
        // Use swatch grid for visual subcategories with 3+ options (color/material pickers)
        // Use compact list for non-visual or binary choices
        const useSwatchGrid = sub.isVisual && sub.options.length >= 3;

        return useSwatchGrid ? (
          <SwatchGrid
            key={sub.id}
            subCategory={sub}
            selectedOptionId={selections[sub.id]}
            onSelect={(optionId) => onSelect(sub.id, optionId)}
          />
        ) : (
          <CompactOptionList
            key={sub.id}
            subCategory={sub}
            selectedOptionId={selections[sub.id]}
            onSelect={(optionId) => onSelect(sub.id, optionId)}
          />
        );
      })}
    </div>
  );
}
