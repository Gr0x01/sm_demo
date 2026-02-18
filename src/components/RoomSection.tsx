"use client";

import type { SubCategory } from "@/types";
import { SwatchGrid } from "./SwatchGrid";
import { CompactOptionList } from "./CompactOptionList";
import { QuantityStepper } from "./QuantityStepper";
import { Lock } from "lucide-react";

interface RoomSectionProps {
  subCategories: SubCategory[];
  selections: Record<string, string>;
  quantities: Record<string, number>;
  onSelect: (subCategoryId: string, optionId: string) => void;
  onSetQuantity: (subCategoryId: string, quantity: number, addOptionId: string, noUpgradeOptionId: string) => void;
  lockedSubCategoryIds?: Set<string>;
}

function LockedSubCategory({ sub, selections }: { sub: SubCategory; selections: Record<string, string> }) {
  const selectedId = selections[sub.id];
  const selectedOption = sub.options.find((o) => o.id === selectedId);
  const displayName = selectedOption?.name ?? "Base";

  return (
    <div className="relative opacity-50 pointer-events-none select-none">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="text-sm font-medium text-gray-500">{sub.name}</span>
      </div>
      <div className="bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-500">
        {displayName}
      </div>
    </div>
  );
}

export function RoomSection({ subCategories, selections, quantities, onSelect, onSetQuantity, lockedSubCategoryIds }: RoomSectionProps) {
  if (subCategories.length === 0) return null;

  return (
    <div className="space-y-5 mt-5">
      {subCategories.map((sub) => {
        if (lockedSubCategoryIds?.has(sub.id)) {
          return <LockedSubCategory key={sub.id} sub={sub} selections={selections} />;
        }

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
