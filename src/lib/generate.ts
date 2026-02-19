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

/** Scene descriptions keyed by hero image filename — tells the model what rooms/areas are in the photo. */
const SCENE_DESCRIPTIONS: Record<string, string> = {
  "greatroom-wide.webp": "This photo shows an open-concept great room and kitchen in a new-construction home. The kitchen is in the background with an island, and the great room is in the foreground with hardwood/LVP flooring throughout.",
  "kitchen-close.webp": "This photo shows a kitchen in a new-construction home. There is a large island in the foreground, wall cabinets and countertops along the back wall, and appliances. The floor is hardwood/LVP.",
  "primary-bath-vanity.webp": "This photo shows a primary bathroom in a new-construction home. There is a double vanity with mirrors on the left, tile flooring in the bathroom, and a walk-in shower with tile walls on the right.",
  "primary-bedroom.webp": "This photo shows a primary bedroom in a new-construction home. It has CARPET flooring (replace the wood floor in the photo with carpet), a tray ceiling with crown molding, a ceiling fan, white painted walls, white trim and baseboard, and a doorway on the left showing a peek into the en-suite bathroom.",
};

/** Spatial hints telling the model WHERE in the photo each subcategory appears. */
const SPATIAL_HINTS: Record<string, string> = {
  // Kitchen
  "kitchen-cabinet-color": "wall cabinets (upper cabinets mounted on walls)",
  "kitchen-island-cabinet-color": "island base cabinets (large freestanding island in foreground)",
  "kitchen-cabinet-hardware": "cabinet knobs and pulls on all cabinets",
  "counter-top": "all countertop surfaces (island and perimeter)",
  "countertop-edge": "edge profile of all countertops",
  "backsplash": "tile backsplash between upper cabinets and countertop on the walls",
  "kitchen-sink": "undermount sink basin in the island countertop — preserve the exact sink position and orientation from the original photo",
  "kitchen-faucet": "faucet on the island countertop — the faucet spout arches AWAY from the camera toward the back wall/range side. Keep this exact orientation, do NOT flip it.",
  "dishwasher": "dishwasher panel (left side of island or near sink)",
  "refrigerator": "refrigerator in its built-in alcove",
  "range": "range/stovetop in its cutout along the wall",
  // Great room / whole-house
  "cabinet-style-whole-house": "cabinet door style on ALL cabinets (shaker, flat, raised panel, etc.)",
  "main-area-flooring-color": "LVP/hardwood plank flooring in non-bathroom areas (closets, bedrooms, hallways) — NOT on bathroom floors which have tile",
  "common-wall-paint": "all wall surfaces",
  "ceiling-paint": "ceiling",
  "trim-paint": "trim and molding along walls",
  "door-casing-color": "door frames and casings",
  "baseboard": "baseboard molding along the floor line",
  "wainscoting": "wainscoting panels on lower walls",
  "interior-door-style": "interior doors (panel style)",
  "lighting": "light fixtures (chandelier, pendants)",
  "great-room-fan": "ceiling fan in the great room",
  // Primary bath
  "primary-bath-vanity": "bathroom vanity cabinet (below the mirrors)",
  "primary-bath-cabinet-color": "vanity cabinet color",
  "bathroom-cabinet-hardware": "vanity cabinet hardware (pulls and knobs)",
  "primary-bath-mirrors": "mirrors above the vanity",
  "floor-tile-color": "large format tile on the bathroom floor AND shower walls ONLY (same tile covers both surfaces) — do NOT tile the closet or bedroom, those have LVP/hardwood flooring",
  "primary-shower": "small mosaic tile on the SHOWER FLOOR ONLY (the small square or penny tiles on the ground inside the shower enclosure)",
  "primary-shower-entry": "shower entry/door (glass panel separating shower from bathroom)",
  "bath-faucets": "faucets on the vanity",
  "bath-hardware": "towel rings, toilet paper holders, and bath accessories on walls",
  // Secondary spaces
  "secondary-bath-cabinet-color": "vanity cabinet color",
  "secondary-bath-mirrors": "mirror above vanity",
  "secondary-shower": "shower tile",
  "primary-closet-shelving": "closet shelving system",
  "crown-options": "crown molding where walls meet ceiling",
  "bedroom-fan": "ceiling fan in the bedroom",
  "carpet-color": "carpet flooring covering the entire bedroom floor",
  "door-hardware": "door knobs/levers on interior doors",
  "under-cabinet-lighting": "LED strip lighting underneath upper cabinets, illuminating the countertop",
};

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
 * Build the edit prompt text and collect swatch images for ALL visual selections.
 * Every selection with a swatchUrl sends its image to the AI.
 * Returns { prompt, swatches } — the route assembles these into the multimodal message.
 */
export async function buildEditPrompt(
  visualSelections: Record<string, string>,
  heroImage?: string,
): Promise<{ prompt: string; swatches: SwatchImage[] }> {
  const swatchLabels: string[] = [];
  const textOnlyLabels: string[] = [];
  const swatches: SwatchImage[] = [];

  for (const [subId, optId] of Object.entries(visualSelections)) {
    const found = findOption(subId, optId);
    if (!found) continue;

    const { option, subCategory } = found;
    const hint = SPATIAL_HINTS[subId];
    const label = hint
      ? `${subCategory.name}: ${option.name} → apply to ${hint}`
      : `${subCategory.name}: ${option.name}`;

    if (option.swatchUrl) {
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
      // No swatch image available — describe by name
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

  const heroFilename = heroImage ? path.basename(heroImage) : "";
  const sceneDesc = SCENE_DESCRIPTIONS[heroFilename] || "";
  const sceneBlock = sceneDesc ? `SCENE: ${sceneDesc}\n\n` : "";

  const prompt = `${sceneBlock}Edit this room photo. Change ONLY the color/texture of these surfaces — nothing else:

${upgradeList}

RULES:
- Each numbered item has a swatch image. Match that swatch's color, pattern, and texture EXACTLY on the specified surface.
- The "→ apply to" text tells you WHERE in the photo to apply each swatch. ONLY apply materials to the specified areas.
- Different rooms have different flooring. Tile stays in bathrooms. LVP/hardwood stays in closets, bedrooms, and hallways. Do NOT extend one flooring material into another room.
- Do NOT add, remove, or move any object. Same number of cabinets, drawers, doors, appliances, fixtures.
- Preserve all structural details: cabinet door panel style (shaker, beadboard, etc.), countertop edges, trim profiles.
- Keep the exact camera angle, perspective, lighting, and room layout.
- Photorealistic result with accurate shadows and reflections.`;

  return { prompt, swatches };
}

export function hashSelections(selections: Record<string, string>): string {
  const sorted = Object.keys(selections)
    .sort()
    .map((k) => `${k}:${selections[k]}`)
    .join("|");
  return createHash("sha256").update(sorted).digest("hex").slice(0, 16);
}
