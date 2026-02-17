"use client";

import type { SubCategory } from "@/types";
import { SwatchGrid } from "./SwatchGrid";
import { CompactOptionList } from "./CompactOptionList";
import { QuantityStepper } from "./QuantityStepper";

interface RoomSectionProps {
  subCategories: SubCategory[];
  selections: Record<string, string>;
  quantities: Record<string, number>;
  onSelect: (subCategoryId: string, optionId: string) => void;
  onSetQuantity: (subCategoryId: string, quantity: number, addOptionId: string, noUpgradeOptionId: string) => void;
}

export function RoomSection({ subCategories, selections, quantities, onSelect, onSetQuantity }: RoomSectionProps) {
  if (subCategories.length === 0) return null;

  return (
    <div className="space-y-5 mt-5">
      {subCategories.map((sub) => {
        if (sub.isAdditive) {
          return (
            <QuantityStepper
              key={sub.id}
              subCategory={sub}
              quantity={quantities[sub.id] || 0}
              onSetQuantity={onSetQuantity}
            />
          );
        }

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
