#!/usr/bin/env npx tsx
/**
 * Flux 2 Max full-kitchen prompt tuning for /try demo.
 * Tests multi-swatch spatial precision with the sample kitchen.
 *
 * Usage: npx tsx scripts/test-flux2-demo-kitchen.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import fs from "fs";
import sharp from "sharp";

const BFL_API_KEY = process.env.BFL_API_KEY!;
if (!BFL_API_KEY) { console.error("Missing BFL_API_KEY"); process.exit(1); }

const OUTPUT_DIR = path.join(__dirname, "flux2-demo-kitchen-outputs");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const SAMPLE_KITCHEN = path.join(__dirname, "..", "public", "sample-kitchen.jpg");

// Swatches matching the failing combo: Slate Hex + Iron Granite + Pearl + Deep Current
const SWATCHES = {
  backsplash: path.join(__dirname, "..", "public", "swatches", "backsplash", "demo-carbon-hex.jpg"),
  countertop: path.join(__dirname, "..", "public", "swatches", "countertops", "COUNTER-TOP---GRANITE---STEEL-GREY.jpg"),
  cabinets: path.join(__dirname, "..", "public", "swatches", "cabinets", "KITCHEN-CABINET-COLOR---WHITE-PAINT-1.png"),
  island: path.join(__dirname, "..", "public", "swatches", "cabinets", "KITCHEN-CABINET-COLOR---ADMIRAL-BLUE-PAINT.png"),
};

// ---------------------------------------------------------------------------
// BFL helpers
// ---------------------------------------------------------------------------

async function submitBfl(prompt: string, inputImage: Buffer, referenceImages: Buffer[]): Promise<string> {
  const body: Record<string, unknown> = {
    prompt,
    input_image: inputImage.toString("base64"),
    width: 1536,
    height: 1024,
    output_format: "jpeg",
  };
  for (let i = 0; i < referenceImages.length; i++) {
    body[`input_image_${i + 2}`] = referenceImages[i].toString("base64");
  }
  const res = await fetch("https://api.bfl.ai/v1/flux-2-max", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-key": BFL_API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Submit failed: ${res.status} ${await res.text()}`);
  const data = await res.json() as { id: string; polling_url: string };
  return data.polling_url;
}

async function pollBfl(pollingUrl: string): Promise<Buffer> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const res = await fetch(pollingUrl, { headers: { "x-key": BFL_API_KEY } });
    if (res.status === 404) { await sleep(1500); continue; }
    if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
    const data = await res.json() as { status: string; result?: { sample?: string } };
    if (data.status === "Ready" && data.result?.sample) {
      const imgRes = await fetch(data.result.sample);
      return Buffer.from(await imgRes.arrayBuffer());
    }
    if (data.status === "Error") throw new Error(`BFL error: ${JSON.stringify(data)}`);
    await sleep(1500);
  }
  throw new Error("Timeout");
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// Photo description (from actually looking at sample-kitchen.jpg)
// ---------------------------------------------------------------------------

const SCENE = `SCENE: New-construction kitchen. White shaker cabinets (upper and lower) along the back wall. Gas cooktop with stainless steel hood centered on back wall. Double wall oven to the right of the hood. Stainless steel fridge on far right. Three woven rattan pendant lights hang over the island. Natural light from windows on the left wall. Hardwood flooring throughout.

PHOTO_LAYOUT: The center island runs horizontally in the foreground — it has a flat smooth front panel (no cabinet doors on the front face), granite countertop on top with an overhang, and a sink. The back wall has a narrow backsplash strip of plain painted wall between the countertop and the bottom of the upper cabinets. Above the cooktop, the backsplash extends taller between the flanking upper cabinets up to the hood. Perimeter countertops run along the back wall and wrap slightly left.`;

// ---------------------------------------------------------------------------
// Prompt variants
// ---------------------------------------------------------------------------

interface Variant {
  name: string;
  prompt: string;
  swatchOrder: ("backsplash" | "countertop" | "cabinets" | "island")[];
}

const variants: Variant[] = [
  {
    name: "v1-explicit-surfaces",
    swatchOrder: ["backsplash", "countertop", "cabinets", "island"],
    prompt: `${SCENE}

Edit this kitchen photo to match the selected finishes.

1. Backsplash → apply to the wall strip between upper cabinets and countertop along the back wall, including the taller section behind the range hood; dimensions: 1-inch hexagon mosaic tiles, honeycomb layout (use swatch #1)
2. Countertop → apply to the HORIZONTAL stone slabs on top of the island and on top of the perimeter cabinets. Countertop is the flat horizontal surface only — not vertical faces. (use swatch #2)
3. Cabinet Color → apply to all perimeter/wall shaker cabinet doors and drawer fronts (upper and lower). Preserve the shaker panel profile. (use swatch #3)
4. Island Color → apply to the flat vertical front panel of the island base (the smooth rectangular surface below the countertop overhang). This is a paint finish — apply as a smooth solid color with no texture or pattern. (use swatch #4)

RULES:
- Swatch mapping: after the room photo, attached swatches are ordered #1..#4.
- Match each swatch's color, pattern, and texture EXACTLY on its specified surface.
- The "→ apply to" text tells you WHERE in the photo to apply each change. Each surface is a separate zone — do NOT bleed one finish into another.
- Countertop (#2) is ONLY the horizontal slab. Do not apply granite texture to vertical surfaces, the island front, or the backsplash.
- Island (#4) is ONLY the vertical front face of the island base. Do not apply island color to the countertop on top or to perimeter cabinets.
- Keep the exact camera angle, perspective, lighting, and room layout.
- Photorealistic result with accurate shadows and reflections.`,
  },
  {
    name: "v2-stronger-boundaries",
    swatchOrder: ["cabinets", "island", "countertop", "backsplash"],
    prompt: `${SCENE}

Edit this kitchen photo to match the selected finishes. Each numbered item targets a SPECIFIC surface — do not let any finish bleed onto adjacent surfaces.

1. Perimeter Cabinet Color → the white shaker doors and drawer fronts on upper and lower wall cabinets. Apply swatch color while preserving shaker panel detail. (use swatch #1)
2. Island Base Color → the flat, smooth vertical front panel of the island (below the countertop overhang). Apply as a smooth painted finish — no texture, no pattern, no door panels. (use swatch #2)
3. Countertop Material → the horizontal stone slabs ONLY: the flat top surface of the island and the flat top surface along the back wall cabinets. This is a horizontal surface — do NOT apply this stone/granite to any vertical surface (not the island front, not the backsplash wall, not cabinet faces). (use swatch #3)
4. Backsplash Tile → the narrow wall strip between the bottom of upper cabinets and the top of the countertop, plus the taller wall section behind the range hood between flanking cabinets; dimensions: 1-inch hexagon mosaic tiles, honeycomb layout (use swatch #4)

RULES:
- Swatch mapping: after the room photo, attached swatches are ordered #1..#4.
- Match each swatch's color, pattern, and texture EXACTLY on its specified surface.
- CRITICAL: Each surface is a separate zone with hard edges. Granite stays on the horizontal countertop. Paint stays on the island front. Tile stays on the backsplash wall. Cabinet color stays on shaker doors.
- Keep the exact camera angle, perspective, lighting, and room layout.
- Photorealistic result with accurate shadows and reflections.`,
  },
  {
    name: "v3-minimal-with-scene",
    swatchOrder: ["backsplash", "countertop", "cabinets", "island"],
    prompt: `${SCENE}

Edit this kitchen photo. Apply each swatch to its specified surface only.

1. Backsplash → wall between upper cabinets and countertop; dimensions: 1-inch hexagon mosaic tiles (use swatch #1)
2. Countertop → horizontal stone slab on top of island and perimeter cabinets only (use swatch #2)
3. Cabinet Color → perimeter shaker cabinet doors and drawer fronts, not the island (use swatch #3)
4. Island Color → flat front panel of island base only, painted finish (use swatch #4)

Swatch mapping: after the room photo, swatches are #1..#4.
Do NOT bleed any finish onto adjacent surfaces. Keep camera angle and layout.`,
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const kitchenBuffer = await fs.promises.readFile(SAMPLE_KITCHEN);
  console.log(`Loaded sample kitchen (${(kitchenBuffer.length / 1024).toFixed(0)}KB)\n`);

  // Load all swatches
  const swatchBuffers: Record<string, Buffer> = {};
  for (const [key, swatchPath] of Object.entries(SWATCHES)) {
    swatchBuffers[key] = await fs.promises.readFile(swatchPath);
    console.log(`  ${key}: ${(swatchBuffers[key].length / 1024).toFixed(0)}KB`);
  }
  console.log();

  for (const variant of variants) {
    const outPath = path.join(OUTPUT_DIR, `${variant.name}.jpg`);
    if (fs.existsSync(outPath)) {
      console.log(`[skip] ${variant.name} — already exists`);
      continue;
    }

    const refs = variant.swatchOrder.map(k => swatchBuffers[k]);
    console.log(`[run] ${variant.name} (swatches: ${variant.swatchOrder.join(", ")})...`);

    const start = Date.now();
    try {
      const pollingUrl = await submitBfl(variant.prompt, kitchenBuffer, refs);
      const resultBuffer = await pollBfl(pollingUrl);
      const jpegBuffer = await sharp(resultBuffer).jpeg({ quality: 90 }).toBuffer();
      await fs.promises.writeFile(outPath, jpegBuffer);
      console.log(`[done] ${variant.name} — ${((Date.now() - start) / 1000).toFixed(1)}s`);
    } catch (err) {
      console.error(`[fail] ${variant.name} — ${((Date.now() - start) / 1000).toFixed(1)}s — ${err}`);
    }
  }

  console.log(`\nResults in: ${OUTPUT_DIR}`);
}

main().catch(console.error);
