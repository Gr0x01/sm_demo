import type { Category, SubCategory } from "@/types";
import type { StepConfig } from "./step-config";

export interface UpgradeItem {
  name: string;
  optionName: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface UpgradeGroup {
  title: string;
  items: UpgradeItem[];
}

/** Build upgrade groups from step config — only paid upgrades, grouped by step. */
export function buildUpgradeGroups(
  selections: Record<string, string>,
  quantities: Record<string, number>,
  steps: StepConfig[],
  categories: Category[],
): UpgradeGroup[] {
  const subCategoryMap = new Map<string, SubCategory>();
  for (const cat of categories) {
    for (const sub of cat.subCategories) {
      subCategoryMap.set(sub.id, sub);
    }
  }

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
}
