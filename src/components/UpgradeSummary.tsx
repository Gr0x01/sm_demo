"use client";

import { useMemo } from "react";
import { categories } from "@/lib/options-data";
import { calculateTotal, formatPrice } from "@/lib/pricing";
import { steps } from "@/lib/step-config";
import type { SubCategory } from "@/types";

interface UpgradeSummaryProps {
  selections: Record<string, string>;
  quantities: Record<string, number>;
  generatedImageUrl: string | null;
  planName: string;
  community: string;
  onBack: () => void;
}

// Build lookup maps
const subCategoryMap = new Map<string, SubCategory>();
for (const cat of categories) {
  for (const sub of cat.subCategories) {
    subCategoryMap.set(sub.id, sub);
  }
}

interface UpgradeItem {
  name: string;
  optionName: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

interface UpgradeGroup {
  title: string;
  items: UpgradeItem[];
}

export function UpgradeSummary({
  selections,
  quantities,
  generatedImageUrl,
  planName,
  community,
  onBack,
}: UpgradeSummaryProps) {
  const total = useMemo(
    () => calculateTotal(selections, quantities),
    [selections, quantities]
  );

  // Build grouped upgrade list from step config (only paid upgrades)
  const upgradeGroups = useMemo(() => {
    const groups: UpgradeGroup[] = [];

    for (const step of steps) {
      const items: UpgradeItem[] = [];

      for (const section of step.sections) {
        for (const subId of section.subCategoryIds) {
          const sub = subCategoryMap.get(subId);
          if (!sub) continue;
          const selectedId = selections[subId];
          if (!selectedId) continue;
          const option = sub.options.find((o) => o.id === selectedId);
          if (!option || option.price === 0) continue;

          const qty = sub.isAdditive ? (quantities[subId] || 0) : 1;
          if (qty === 0) continue;

          items.push({
            name: sub.name,
            optionName: option.name,
            price: option.price,
            quantity: qty,
            lineTotal: option.price * qty,
          });
        }
      }

      if (items.length > 0) {
        groups.push({ title: step.name, items });
      }
    }

    return groups;
  }, [selections, quantities]);

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 print:border-gray-300">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/logo.svg"
              alt="Stone Martin Builders"
              className="h-6 text-[var(--color-navy)]"
            />
            <div>
              <h1 className="text-lg font-bold text-[var(--color-navy)]">
                Your Selections
              </h1>
              <p className="text-xs text-gray-400">
                {planName} &middot; {community}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 no-print">
            <button
              onClick={onBack}
              className="text-xs font-medium text-gray-500 hover:text-[var(--color-navy)] transition-colors cursor-pointer"
            >
              &larr; Back to Selections
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-[var(--color-navy)] text-white text-xs font-semibold hover:bg-[#243a5e] transition-colors cursor-pointer"
            >
              Download PDF
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Generated Image */}
        {generatedImageUrl && (
          <div className="mb-8">
            <img
              src={generatedImageUrl}
              alt="Your kitchen visualization"
              className="w-full object-cover border border-gray-200"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              AI-generated visualization based on your selections
            </p>
          </div>
        )}

        {/* Upgrade List */}
        {upgradeGroups.length > 0 ? (
          <div className="space-y-6">
            {upgradeGroups.map((group) => (
              <div key={group.title}>
                <h2 className="text-xs font-semibold tracking-widest uppercase text-[var(--color-accent)] mb-3">
                  {group.title}
                </h2>
                <div className="border border-gray-200">
                  {group.items.map((item, i) => (
                    <div
                      key={`${group.title}-${i}`}
                      className={`flex items-center justify-between px-4 py-3 text-sm ${
                        i > 0 ? "border-t border-gray-100" : ""
                      }`}
                    >
                      <div>
                        <span className="font-medium text-[var(--color-navy)]">
                          {item.name}
                        </span>
                        <span className="text-gray-400 ml-2">
                          {item.optionName}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-gray-400 ml-1">
                            &times; {item.quantity}
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-[var(--color-navy)] whitespace-nowrap ml-4">
                        {formatPrice(item.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="flex items-center justify-between px-4 py-4 border-t-2 border-[var(--color-navy)]">
              <span className="text-base font-bold text-[var(--color-navy)]">
                Total Upgrades
              </span>
              <span className="text-base font-bold text-[var(--color-navy)]">
                {formatPrice(total)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">No paid upgrades selected</p>
            <p className="text-sm mt-1">
              All selections are currently the included options.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
