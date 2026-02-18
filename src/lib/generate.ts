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
      const ext = path.extname(option.swatchUrl).slice(1).toLowerCase();

      try {
        const swatchPath = path.join(process.cwd(), "public", option.swatchUrl);

        if (ext === "svg") {
          // Convert SVG paint swatches to solid-color PNGs for the API
          const svgContent = await readFile(swatchPath, "utf-8");
          const hex = extractHexFromSvg(svgContent);
          if (hex) {
            const buffer = solidColorPng(hex);
            swatches.push({ label: `${label}: ${option.name}`, buffer, mediaType: "image/png" });
            labels.push(`${label}: ${option.name}`);
          }
          continue;
        }

        const buffer = await readFile(swatchPath);
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
