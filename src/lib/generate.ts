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
  const labels: string[] = [];
  const swatches: SwatchImage[] = [];

  for (const [subId, optId] of Object.entries(visualSelections)) {
    const found = findOption(subId, optId);
    if (!found) continue;

    const { option, subCategory } = found;
    const label = subCategory.name;

    // Load swatch image — this is the primary source of truth for the AI
    if (option.swatchUrl) {
      try {
        const swatchPath = path.join(process.cwd(), "public", option.swatchUrl);
        const buffer = await readFile(swatchPath);
        const ext = path.extname(option.swatchUrl).slice(1).toLowerCase();
        const mediaType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        swatches.push({ label: `${label}: ${option.name}`, buffer, mediaType });
        labels.push(`${label}: ${option.name}`);
      } catch {
        // Swatch file missing — skip this selection
      }
    }
  }

  if (swatches.length === 0) {
    return {
      prompt: "This is a photo of a room in a new-construction home. Return this image unchanged.",
      swatches: [],
    };
  }

  const prompt = `This is a photo of a room in a new-construction home. The swatch/sample images above show the exact materials and colors the buyer selected. Edit the room photo to apply these upgrades:

${labels.map((l, i) => `${i + 1}. ${l}`).join("\n")}

IMPORTANT: Match the colors and textures from the swatch images EXACTLY. Do not interpret the names — use the visual appearance of each swatch as the ground truth. Keep the exact same perspective, room shape, and composition. The result should look like a real interior design photo — photorealistic, well-lit, no people.`;

  return { prompt, swatches };
}

export function hashSelections(selections: Record<string, string>): string {
  const sorted = Object.keys(selections)
    .sort()
    .map((k) => `${k}:${selections[k]}`)
    .join("|");
  return createHash("sha256").update(sorted).digest("hex").slice(0, 16);
}
