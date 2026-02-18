import { createHash } from "crypto";
import { deflateSync } from "zlib";
import { readFile } from "fs/promises";
import path from "path";
import { categories } from "./options-data";
import type { Option, SubCategory } from "@/types";

/** Create a minimal 64x64 solid-color PNG from a hex string like "#D1CCC2". */
function solidColorPng(hex: string): Buffer {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const size = 64;

  // Build raw image data: each row starts with filter byte 0, then RGB triplets
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 3);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 3;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }

  const compressed = deflateSync(raw);

  // Assemble PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, "ascii");
    const crc = crc32(Buffer.concat([typeB, data]));
    return Buffer.concat([len, typeB, data, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);  // width
  ihdr.writeUInt32BE(size, 4);  // height
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** CRC-32 for PNG chunks. */
function crc32(buf: Buffer): Buffer {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  crc ^= 0xffffffff;
  const out = Buffer.alloc(4);
  out.writeUInt32BE(crc >>> 0);
  return out;
}

/** Extract the fill hex color from a simple SVG paint swatch. */
function extractHexFromSvg(svg: string): string | null {
  const match = svg.match(/fill="(#[0-9A-Fa-f]{6})"/);
  return match ? match[1] : null;
}

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
 * Build the edit prompt text and collect swatch images for high-impact visual selections.
 * High-impact selections get swatch images sent to the AI; others are described in text only.
 * Returns { prompt, swatches } — the route assembles these into the multimodal message.
 */
export async function buildEditPrompt(
  visualSelections: Record<string, string>,
  highImpactIds?: string[]
): Promise<{ prompt: string; swatches: SwatchImage[] }> {
  const swatchLabels: string[] = [];
  const textOnlyLabels: string[] = [];
  const swatches: SwatchImage[] = [];
  const highImpactSet = highImpactIds ? new Set(highImpactIds) : null;

  for (const [subId, optId] of Object.entries(visualSelections)) {
    const found = findOption(subId, optId);
    if (!found) continue;

    const { option, subCategory } = found;
    const label = `${subCategory.name}: ${option.name}`;
    const isHighImpact = !highImpactSet || highImpactSet.has(subId);

    if (isHighImpact && option.swatchUrl) {
      // High-impact: load swatch image for the AI
      const ext = path.extname(option.swatchUrl).slice(1).toLowerCase();

      try {
        const swatchPath = path.join(process.cwd(), "public", option.swatchUrl);

        if (ext === "svg") {
          const svgContent = await readFile(swatchPath, "utf-8");
          const hex = extractHexFromSvg(svgContent);
          if (hex) {
            const buffer = solidColorPng(hex);
            swatches.push({ label, buffer, mediaType: "image/png" });
            swatchLabels.push(label);
          }
          continue;
        }

        const buffer = await readFile(swatchPath);
        const mediaType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        swatches.push({ label, buffer, mediaType });
        swatchLabels.push(label);
      } catch {
        // Swatch file missing — fall back to text-only
        textOnlyLabels.push(label);
      }
    } else {
      // Text-only: describe by name, no image sent
      textOnlyLabels.push(label);
    }
  }

  const allLabels = [...swatchLabels, ...textOnlyLabels];

  if (allLabels.length === 0) {
    return {
      prompt: "This is a photo of a room in a new-construction home. Return this image unchanged.",
      swatches: [],
    };
  }

  let upgradeList = swatchLabels.map((l, i) => `${i + 1}. ${l} (see swatch image)`).join("\n");
  if (textOnlyLabels.length > 0) {
    const offset = swatchLabels.length;
    upgradeList += "\n" + textOnlyLabels.map((l, i) => `${offset + i + 1}. ${l}`).join("\n");
  }

  const prompt = `This is a photo of a room in a new-construction home. The swatch/sample images above show the exact materials and colors for the key upgrades. Edit the room photo to apply these upgrades:

${upgradeList}

CRITICAL RULES:
- This is an IMAGE EDITING task. You MUST modify the provided room photo — do NOT generate a new image from scratch.
- Keep the EXACT same camera angle, perspective, room layout, architectural features, and composition as the input photo.
- For items with swatch images, match the colors and textures EXACTLY. Use the visual appearance of each swatch as the ground truth.
- For items without swatch images, use your best interpretation of the name.
- The result should look like a real interior design photo — photorealistic, well-lit, no people.
- Do NOT change the room shape, ceiling, windows, or camera position.`;

  return { prompt, swatches };
}

export function hashSelections(selections: Record<string, string>): string {
  const sorted = Object.keys(selections)
    .sort()
    .map((k) => `${k}:${selections[k]}`)
    .join("|");
  return createHash("sha256").update(sorted).digest("hex").slice(0, 16);
}
