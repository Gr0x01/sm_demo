import { readFile } from "fs/promises";
import path from "path";
import type { Option, SubCategory } from "@/types";
import type { SwatchImage } from "@/lib/generate";
import { DEMO_SUBCATEGORIES } from "@/lib/demo-options";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";

// Replicated PNG helpers (same as generate.ts — avoids exporting internals)
import { deflateSync } from "zlib";

function solidColorPng(hex: string): Buffer {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const size = 64;
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 3);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 3;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }
  const compressed = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, "ascii");
    const crc = crc32(Buffer.concat([typeB, data]));
    return Buffer.concat([len, typeB, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
}

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

function extractHexFromSvg(svg: string): string | null {
  const match = svg.match(/fill="(#[0-9A-Fa-f]{6})"/);
  return match ? match[1] : null;
}

/** Fallback surface labels when no spatial hints are available */
const DEFAULT_SPATIAL_HINTS: Record<string, string> = {
  backsplash: "tile backsplash between upper cabinets and countertop on the walls",
  "counter-top": "all visible countertop surfaces",
  "kitchen-cabinet-color": "all visible perimeter/wall cabinet faces (NOT the island)",
  "island-cabinet-color": "island base cabinet faces only (NOT the perimeter/wall cabinets)",
};

/** Surface display names for the prompt line items */
const SURFACE_NAMES: Record<string, string> = {
  backsplash: "Backsplash",
  "counter-top": "Countertop",
  "kitchen-cabinet-color": "Cabinet Color",
  "island-cabinet-color": "Island Color",
};

/** Build a lookup map from demo options */
function buildDemoOptionLookup(): Map<string, { option: Option; subCategory: SubCategory }> {
  const map = new Map<string, { option: Option; subCategory: SubCategory }>();
  for (const sub of DEMO_SUBCATEGORIES) {
    for (const opt of sub.options) {
      map.set(`${sub.id}:${opt.id}`, { option: opt, subCategory: sub });
    }
  }
  return map;
}

/**
 * Build the edit prompt and collect swatch images for a demo generation.
 * Uses Gemini-extracted scene description and spatial hints when available.
 */
export async function buildDemoPrompt(
  selections: Record<string, string>,
  sceneAnalysis?: DemoSceneAnalysis,
): Promise<{ prompt: string; swatches: SwatchImage[] }> {
  const optionLookup = buildDemoOptionLookup();
  const listLines: string[] = [];
  const swatches: SwatchImage[] = [];
  let listIndex = 1;
  let swatchIndex = 1;

  // Merge Gemini spatial hints with defaults
  const spatialHints: Record<string, string> = { ...DEFAULT_SPATIAL_HINTS };
  if (sceneAnalysis?.spatialHints) {
    for (const [key, hint] of Object.entries(sceneAnalysis.spatialHints)) {
      if (hint && hint.trim()) spatialHints[key] = hint;
    }
  }

  // If Gemini detected an island and both cabinet + island are selected,
  // ensure the hints clearly separate perimeter from island cabinets
  if (sceneAnalysis?.hasIsland) {
    if (spatialHints["kitchen-cabinet-color"] === DEFAULT_SPATIAL_HINTS["kitchen-cabinet-color"]) {
      spatialHints["kitchen-cabinet-color"] = "perimeter/wall cabinet faces only (NOT the island base cabinets)";
    }
    if (spatialHints["island-cabinet-color"] === DEFAULT_SPATIAL_HINTS["island-cabinet-color"]) {
      spatialHints["island-cabinet-color"] = "island base cabinet faces only (NOT the perimeter/wall cabinets)";
    }
  }

  const sortedSelections = Object.entries(selections).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  for (const [subId, optId] of sortedSelections) {
    const found = optionLookup.get(`${subId}:${optId}`);
    if (!found) continue;

    const { option } = found;
    const surfaceName = SURFACE_NAMES[subId] || subId;
    const hint = spatialHints[subId];
    const descriptor = option.promptDescriptor?.trim();
    const descriptorSuffix = descriptor ? ` (${descriptor})` : "";
    const label = hint
      ? `${surfaceName}: ${option.name}${descriptorSuffix} → apply to ${hint}`
      : `${surfaceName}: ${option.name}${descriptorSuffix}`;

    if (option.swatchUrl) {
      const ext = path.extname(option.swatchUrl).slice(1).toLowerCase();

      try {
        const swatchPath = path.join(process.cwd(), "public", option.swatchUrl);

        if (ext === "svg") {
          const svgContent = await readFile(swatchPath, "utf-8");
          const hex = extractHexFromSvg(svgContent);
          if (hex) {
            swatches.push({ label, buffer: solidColorPng(hex), mediaType: "image/png" });
            listLines.push(`${listIndex}. ${label} (use swatch #${swatchIndex})`);
            swatchIndex += 1;
          } else {
            listLines.push(`${listIndex}. ${label} (no swatch image available; follow text exactly)`);
          }
          listIndex += 1;
          continue;
        }

        const buffer = await readFile(swatchPath);
        const mediaType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        swatches.push({ label, buffer, mediaType });
        listLines.push(`${listIndex}. ${label} (use swatch #${swatchIndex})`);
        swatchIndex += 1;
        listIndex += 1;
      } catch {
        listLines.push(`${listIndex}. ${label} (no swatch image available; follow text exactly)`);
        listIndex += 1;
      }
    } else {
      listLines.push(`${listIndex}. ${label} (no swatch image available; follow text exactly)`);
      listIndex += 1;
    }
  }

  if (listLines.length === 0) {
    return {
      prompt: "This is a photo of a kitchen. Return this image unchanged.",
      swatches: [],
    };
  }

  const sceneContextLines: string[] = [];
  if (sceneAnalysis?.sceneDescription?.trim()) {
    sceneContextLines.push(`SCENE: ${sceneAnalysis.sceneDescription.trim()}`);
  }
  if (sceneAnalysis?.kitchenType) {
    sceneContextLines.push(`KITCHEN_TYPE: ${sceneAnalysis.kitchenType}`);
  }
  if (sceneAnalysis?.cameraAngle) {
    sceneContextLines.push(`CAMERA_ANGLE: ${sceneAnalysis.cameraAngle}`);
  }
  if (sceneAnalysis?.visibleSurfaces) {
    const visibleSurfaces: string[] = [];
    if (sceneAnalysis.visibleSurfaces.backsplash !== false) visibleSurfaces.push("backsplash");
    if (sceneAnalysis.visibleSurfaces.countertop !== false) visibleSurfaces.push("countertop");
    if (sceneAnalysis.visibleSurfaces.cabinets !== false) visibleSurfaces.push("cabinets");
    if (visibleSurfaces.length > 0) {
      sceneContextLines.push(`VISIBLE_SURFACES: ${visibleSurfaces.join(", ")}`);
    }
  }
  const sceneBlock =
    sceneContextLines.length > 0 ? `${sceneContextLines.join("\n")}\n\n` : "";

  const swatchMappingLine =
    swatches.length > 0
      ? `Swatch mapping: after the base kitchen photo, attached swatches are ordered #1..#${swatches.length}.`
      : "No swatch attachments were provided; use text instructions only.";

  const prompt = `${sceneBlock}Edit this kitchen photo. Replace the color/texture of EVERY listed surface with the specified finish — even if the surface appears to already match. Treat each selection as an explicit instruction to repaint/resurface, NOT as a diff from the current state:

${listLines.join("\n")}

RULES:
- IMPORTANT: You do NOT know what the existing finishes are. Apply every listed selection as-is. Even if the cabinets already look white and the selection says "White Paint," you must actively apply the swatch color to those surfaces. Do not skip any selection.
- ${swatchMappingLine}
- For each item marked "(use swatch #N)", match that swatch's color, pattern, and texture EXACTLY on the specified surface.
- For each item marked "(no swatch image available; follow text exactly)", use the text descriptor and keep edits subtle.
- The "→ apply to" text tells you WHERE in the photo to apply each change. Treat each listed target as a separate mask; do NOT bleed one finish into another.
- If a listed surface is not clearly visible in the input photo, do not invent new geometry to reveal it.
- Do NOT add, remove, or move any object. Keep exact counts of cabinets, drawer fronts, appliance doors, fixtures, and hardware.
- Do NOT invent new cabinet seams/panels, remove panel grooves, or simplify existing door geometry.
- Preserve all structural details: cabinet door panel style (shaker, beadboard, etc.), countertop edges, trim profiles.
- If an edit is difficult, under-edit the finish rather than changing layout, geometry, or object position.
- Keep the exact camera angle, perspective, lighting, and room layout.
- Photorealistic result with accurate shadows and reflections.`;

  return { prompt, swatches };
}
