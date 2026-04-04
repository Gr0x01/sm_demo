#!/usr/bin/env npx tsx
/**
 * Flux 2 Max backsplash prompt tuning.
 *
 * Tests different prompt approaches for backsplash tile rendering
 * to find what Flux 2 Max responds to best.
 *
 * Usage: npx tsx scripts/test-flux2-backsplash.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import fs from "fs";
import sharp from "sharp";

const BFL_API_KEY = process.env.BFL_API_KEY!;
if (!BFL_API_KEY) { console.error("Missing BFL_API_KEY"); process.exit(1); }

const OUTPUT_DIR = path.join(__dirname, "flux2-backsplash-outputs");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Use the /try sample kitchen as the base photo
const SAMPLE_KITCHEN = path.join(__dirname, "..", "public", "sample-kitchen.jpg");

// Test swatches — one subway, one herringbone
const SWATCHES = {
  "graphite-subway": path.join(__dirname, "..", "public", "swatches", "backsplash", "BACKSPLASH---BAKER-BLVD-4X16---CARBON---3RD-STAGGER-LAY.jpg"),
  "herringbone": path.join(__dirname, "..", "public", "swatches", "backsplash", "demo-dark-herringbone.jpg"),
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
// Prompt variants to test
// ---------------------------------------------------------------------------

interface PromptVariant {
  name: string;
  prompt: string;
}

function buildVariants(swatchName: string, dimensions: string): PromptVariant[] {
  return [
    {
      name: "v1-minimal",
      prompt: `Edit this kitchen photo. Change ONLY the backsplash.

1. Backsplash → apply to tile backsplash between upper cabinets and countertop (use swatch #1)

Swatch mapping: after the room photo, the attached swatch is #1.
Match the swatch's color, pattern, and texture EXACTLY on the backsplash.
Do NOT change cabinets, countertops, flooring, appliances, or anything else.
Keep the exact camera angle, perspective, lighting, and room layout.`,
    },
    {
      name: "v2-with-dimensions",
      prompt: `Edit this kitchen photo. Change ONLY the backsplash.

1. Backsplash → apply to tile backsplash between upper cabinets and countertop; dimensions: ${dimensions} (use swatch #1)

Swatch mapping: after the room photo, the attached swatch is #1.
Match the swatch's color, pattern, and texture EXACTLY on the backsplash.
The swatch shows the tile format — reproduce that tile shape and layout on the wall.
Do NOT change cabinets, countertops, flooring, appliances, or anything else.
Keep the exact camera angle, perspective, lighting, and room layout.`,
    },
    {
      name: "v3-with-rules",
      prompt: `Edit this kitchen photo. Change ONLY the backsplash.

1. Backsplash → apply to tile backsplash between upper cabinets and countertop; dimensions: ${dimensions} (use swatch #1)

Swatch mapping: after the room photo, the attached swatch is #1.
Match the swatch's color, pattern, and texture EXACTLY on the backsplash.

RULES:
- The swatch shows the actual tile format. Reproduce that tile shape, size, and layout — not just the color.
- Tiles must fill the backsplash edge to edge with cut/partial tiles at edges, like a real installation.
- BOUNDARY: tile ONLY the narrow strip between upper cabinets and countertop. Do NOT extend onto cabinet faces, range front, or below the countertop.
- Do NOT change cabinets, countertops, flooring, appliances, or anything else.
- Keep the exact camera angle, perspective, lighting, and room layout.`,
    },
    {
      name: "v4-scene-context",
      prompt: `SCENE: Modern kitchen with white shaker cabinets, granite countertops, stainless appliances, center island, pendant lights.
PHOTO_LAYOUT: Island in foreground, upper and lower cabinets along back wall, backsplash visible between upper cabinets and countertop.

Edit this kitchen photo. Change ONLY the backsplash tile.

1. Backsplash → apply to the tile surface between upper cabinets and countertop on the back wall; dimensions: ${dimensions} (use swatch #1)

Swatch mapping: after the room photo, the attached swatch is #1.
Match the swatch's color, pattern, and texture EXACTLY on the backsplash.

RULES:
- The swatch shows the actual tile format. Reproduce that tile shape, size, and layout on the wall.
- Tiles must fill the backsplash edge to edge with cut/partial tiles at edges.
- BOUNDARY: tile ONLY between upper cabinets and countertop. Do NOT extend onto cabinets, appliances, or below countertop.
- Preserve everything else exactly as-is.`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const kitchenBuffer = await fs.promises.readFile(SAMPLE_KITCHEN);
  console.log(`Loaded sample kitchen (${(kitchenBuffer.length / 1024).toFixed(0)}KB)`);

  // Test each swatch with each prompt variant
  for (const [swatchKey, swatchPath] of Object.entries(SWATCHES)) {
    const swatchBuffer = await fs.promises.readFile(swatchPath);
    console.log(`\n=== ${swatchKey} (${(swatchBuffer.length / 1024).toFixed(0)}KB) ===`);

    const dimensions = swatchKey === "graphite-subway"
      ? "4x16 subway tiles, staggered layout"
      : "0.5x2 inch herringbone mosaic pieces, interlocking V-pattern";

    const variants = buildVariants(swatchKey, dimensions);

    for (const variant of variants) {
      const outPath = path.join(OUTPUT_DIR, `${swatchKey}_${variant.name}.jpg`);

      // Skip if already generated
      if (fs.existsSync(outPath)) {
        console.log(`  [skip] ${variant.name} — already exists`);
        continue;
      }

      console.log(`  [run] ${variant.name}...`);
      const start = Date.now();
      try {
        const pollingUrl = await submitBfl(variant.prompt, kitchenBuffer, [swatchBuffer]);
        const resultBuffer = await pollBfl(pollingUrl);
        const jpegBuffer = await sharp(resultBuffer).jpeg({ quality: 90 }).toBuffer();
        await fs.promises.writeFile(outPath, jpegBuffer);
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`  [done] ${variant.name} — ${elapsed}s → ${outPath}`);
      } catch (err) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.error(`  [fail] ${variant.name} — ${elapsed}s — ${err}`);
      }
    }
  }

  console.log(`\nResults in: ${OUTPUT_DIR}`);
  console.log("Compare side by side to find the best prompt approach for Flux 2 backsplash.");
}

main().catch(console.error);
