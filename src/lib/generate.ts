import { createHash } from "crypto";
import { categories } from "./options-data";
import type { Option, SubCategory } from "@/types";

function findOption(
  subCategoryId: string,
  optionId: string
): { option: Option; subCategory: SubCategory } | null {
  for (const category of categories) {
    for (const sub of category.subCategories) {
      if (sub.id === subCategoryId) {
        const option = sub.options.find((o) => o.id === optionId);
        if (option) return { option, subCategory: sub };
      }
    }
  }
  return null;
}

export function buildPrompt(
  visualSelections: Record<string, string>
): string {
  const descriptors: string[] = [];

  for (const [subId, optId] of Object.entries(visualSelections)) {
    const found = findOption(subId, optId);
    if (found?.option.promptDescriptor) {
      const desc = found.option.swatchColor
        ? `${found.option.promptDescriptor} (exact color: ${found.option.swatchColor})`
        : found.option.promptDescriptor;
      descriptors.push(desc);
    }
  }

  if (descriptors.length === 0) {
    return `A photorealistic interior photograph of a modern new-construction kitchen, shot from the living room looking toward the kitchen. The kitchen has an L-shaped layout with a center island. Granite countertops, standard cabinets, stainless steel appliances. Professional interior design photography, eye-level camera angle. Natural lighting from windows. High-end new construction. Clean, staged, ready for showing.`;
  }

  return `A photorealistic interior photograph of a modern new-construction kitchen, shot from the living room looking toward the kitchen. The kitchen has an L-shaped layout with a center island, featuring:
${descriptors.map((d) => `- ${d}`).join("\n")}

Professional interior design photography, eye-level camera angle. Natural lighting from windows. High-end new construction residential kitchen. Clean, staged, ready for showing. No people. Warm and inviting atmosphere.`;
}

export function hashSelections(selections: Record<string, string>): string {
  const sorted = Object.keys(selections)
    .sort()
    .map((k) => `${k}:${selections[k]}`)
    .join("|");
  return createHash("sha256").update(sorted).digest("hex").slice(0, 16);
}
