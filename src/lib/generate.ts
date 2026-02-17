import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { categories } from "./options-data";
import type { Option, SubCategory } from "@/types";

export interface SwatchImage {
  label: string;
  buffer: Buffer;
  mediaType: string;
}

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

/**
 * Build the edit prompt text and collect swatch images for all visual selections.
 * Returns { prompt, swatches } — the route assembles these into the multimodal message.
 */
export async function buildEditPrompt(
  visualSelections: Record<string, string>
): Promise<{ prompt: string; swatches: SwatchImage[] }> {
  const descriptors: string[] = [];
  const swatches: SwatchImage[] = [];

  for (const [subId, optId] of Object.entries(visualSelections)) {
    const found = findOption(subId, optId);
    if (!found?.option.promptDescriptor) continue;

    const { option, subCategory } = found;
    const label = subCategory.name;
    const desc = option.swatchColor
      ? `${option.promptDescriptor} (exact color: ${option.swatchColor})`
      : option.promptDescriptor;
    descriptors.push(`${label}: ${desc}`);

    // Load swatch image if available
    if (option.swatchUrl) {
      try {
        const swatchPath = path.join(process.cwd(), "public", option.swatchUrl);
        const buffer = await readFile(swatchPath);
        const ext = path.extname(option.swatchUrl).slice(1).toLowerCase();
        const mediaType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        swatches.push({ label, buffer, mediaType });
      } catch {
        // Swatch file missing — skip, text descriptor still sent
      }
    }
  }

  if (descriptors.length === 0) {
    return {
      prompt: "This is a photo of a room in a new-construction home. Return this image unchanged.",
      swatches: [],
    };
  }

  const prompt = `This is a photo of a room in a new-construction home. The swatch/sample images that follow show the exact materials the buyer selected. Edit the room photo to apply these upgrades, keeping the same camera angle, room layout, and lighting:

${descriptors.map((d, i) => `${i + 1}. ${d}`).join("\n")}

Keep the exact same perspective, room shape, and composition. Only change the materials, colors, and fixtures listed above. Match the colors and textures from the swatch images precisely. The result should look like a real interior design photo — photorealistic, well-lit, no people.`;

  return { prompt, swatches };
}

export function hashSelections(selections: Record<string, string>): string {
  const sorted = Object.keys(selections)
    .sort()
    .map((k) => `${k}:${selections[k]}`)
    .join("|");
  return createHash("sha256").update(sorted).digest("hex").slice(0, 16);
}
