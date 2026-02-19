"use client";

import type { SubCategory } from "@/types";
import { formatPrice } from "@/lib/pricing";

interface QuantityStepperProps {
  subCategory: SubCategory;
  quantity: number;
  onSetQuantity: (subCategoryId: string, quantity: number, addOptionId: string, noUpgradeOptionId: string) => void;
}

export function QuantityStepper({ subCategory, quantity, onSetQuantity }: QuantityStepperProps) {
  // Additive subcategories have 2 options: "No Upgrade" ($0) and the add option ($X each)
  const noUpgradeOption = subCategory.options.find((o) => o.price === 0);
  const addOption = subCategory.options.find((o) => o.price > 0);

  if (!noUpgradeOption || !addOption) return null;

  const max = subCategory.maxQuantity ?? 10;
  const unitPrice = addOption.price;
  const totalPrice = unitPrice * quantity;
  const unitLabel = subCategory.unitLabel || "";

  const step = max > 20 ? 10 : 1;

  const setQty = (newQty: number) => {
    const clamped = Math.max(0, Math.min(max, newQty));
    onSetQuantity(subCategory.id, clamped, addOption.id, noUpgradeOption.id);
  };

  return (
    <div className="mb-4 last:mb-0">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-0.5">
        {subCategory.name}
      </h4>
      <div
        className={`flex items-center justify-between gap-3 px-3 py-2.5 border transition-all duration-150 ${
          quantity > 0
            ? "border-[var(--color-accent)] bg-blue-50/50"
            : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex-1 min-w-0">
          <span className="text-sm text-[var(--color-navy)]">{addOption.name}</span>
          <span className="text-xs text-gray-400 ml-2">
            {formatPrice(unitPrice)}{unitLabel ? ` / ${unitLabel}` : " each"}
          </span>
        </div>

        <div className="flex items-center gap-0 flex-shrink-0">
          <button
            onClick={() => setQty(quantity - step)}
            disabled={quantity === 0}
            className="w-8 h-8 flex items-center justify-center border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-lg font-medium"
          >
            &minus;
          </button>
          {max > 20 ? (
            <input
              type="number"
              value={quantity || ""}
              onChange={(e) => setQty(parseInt(e.target.value) || 0)}
              min={0}
              max={max}
              className="w-16 h-8 text-center border-t border-b border-gray-300 bg-white text-sm font-semibold text-[var(--color-navy)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
            />
          ) : (
            <div className="w-10 h-8 flex items-center justify-center border-t border-b border-gray-300 bg-white text-sm font-semibold text-[var(--color-navy)]">
              {quantity}
            </div>
          )}
          <button
            onClick={() => setQty(quantity + step)}
            disabled={quantity >= max}
            className="w-8 h-8 flex items-center justify-center border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-lg font-medium"
          >
            +
          </button>
        </div>

        <span className={`text-xs flex-shrink-0 w-16 text-right font-medium ${
          totalPrice > 0 ? "text-[var(--color-accent)]" : "text-green-600"
        }`}>
          {totalPrice === 0 ? "Included" : `+$${totalPrice.toLocaleString()}`}
        </span>
      </div>
    </div>
  );
}
