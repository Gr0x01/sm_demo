#!/usr/bin/env npx tsx
/**
 * Quick test: send the kitchen photo + HQ swatch + reference photo to OpenAI.
 * Tests whether a reference image of the installed tile helps the AI reproduce the shape.
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import OpenAI, { toFile } from "openai";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function getEnvOrDie(key: string): string {
  const val = process.env[key];
  if (!val) { console.error(`Missing env var: ${key}`); process.exit(1); }
  return val;
}

const supabase = createClient(getEnvOrDie("NEXT_PUBLIC_SUPABASE_URL"), getEnvOrDie("SUPABASE_SERVICE_ROLE_KEY"));
const openai = new OpenAI();

const OUTPUT_DIR = path.join(__dirname, "backsplash-test-outputs", "picket-taupe-v");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const KITCHEN_PHOTO = "364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp";

async function main() {
  // Download room photo
  const { data: imageData, error } = await supabase.storage.from("rooms").download(KITCHEN_PHOTO);
  if (error || !imageData) throw new Error(`Failed: ${error?.message}`);
  const roomBuffer = Buffer.from(await imageData.arrayBuffer());

  // Download HQ swatch
  const { data: swatchData } = await supabase.storage.from("swatches").download(
    "364538bf-1712-48e7-a905-04ad90983eb2/backsplash/baker-blvd-picket-gloss-taupe-hq.jpg"
  );
  if (!swatchData) throw new Error("Failed to download swatch");
  const swatchBuffer = Buffer.from(await swatchData.arrayBuffer());

  // Download reference
  const { data: refData } = await supabase.storage.from("swatches").download(
    "364538bf-1712-48e7-a905-04ad90983eb2/backsplash/baker-blvd-picket-gloss-taupe-reference.jpg"
  );
  if (!refData) throw new Error("Failed to download reference");
  const refBuffer = Buffer.from(await refData.arrayBuffer());

  const prompt = `SCENE: This photo shows a kitchen in a new-construction home. There is a large island in the foreground, wall cabinets and countertops along the back wall, and appliances. The floor is hardwood/LVP.
PHOTO_LAYOUT: Large island dominates the foreground with sink + faucet on the island; keep sink cutout and faucet direction fixed. Perimeter cabinets, backsplash, and range are on the back wall; refrigerator stays in its alcove. Dishwasher remains next to the sink; do not alter cabinet panel geometry.

Edit this room photo. Apply every listed selection to its specified surface — treat each as an explicit instruction to repaint or resurface, not as a diff from the current state:

1. Backsplash → apply to tile backsplash between upper cabinets and countertop on the walls; dimensions: 2x4 inch tiles with pointed hexagonal ends, horizontal layout (use swatch #1 for color/finish; reference photo #2 shows the installed tile pattern; swatch-derived color anchor #978E89)

APPLY:
- Swatch mapping: after the base room photo, image #1 is the tile swatch (color/finish authority), image #2 is a reference photo showing the tile installed on a real backsplash (pattern/layout authority).
- TILE SCALE: The swatch image (#1) shows an 11x12 inch sheet containing approximately 18 individual tiles — 3 tiles across and 6 rows down. Each individual tile is roughly 2 inches tall and 4 inches wide. On a real backsplash you would see many of these small tiles, not a few large ones.
- TILE GEOMETRY: Each tile is a horizontally-oriented hexagon — a wide rectangle with pointed/angled ends on the left and right sides. Tiles interlock in staggered rows: the pointed end of one tile fits into the gap between two tiles in the adjacent row. Grout lines follow the angled edges.
- Match the COLOR from the swatch — taupe/warm grey, anchor #978E89.
- Match the SHAPE from the reference photo (#2) — reproduce that exact tile shape and scale on the backsplash.
- The "→ apply to" text tells you WHERE to apply the change.

PRESERVE:
- Keep the exact camera angle, perspective, lighting, and room layout.
- Do NOT add, remove, or move any object.
- Keep exact counts of cabinets, drawer fronts, fixtures, and hardware.
- If an edit is difficult, under-edit the finish rather than changing layout or object position.
- Photorealistic result with accurate shadows and reflections.

SURFACE & PLACEMENT RULES:
- Replace the ENTIRE backsplash tile surface — match BOTH the tile pattern/size AND the color/finish.
- Do NOT preserve the existing tile pattern from the original photo.`;

  const inputImages = [
    await toFile(roomBuffer, "kitchen.webp", { type: "image/webp" }),
    await toFile(swatchBuffer, "swatch.jpg", { type: "image/jpeg" }),
    await toFile(refBuffer, "reference.jpg", { type: "image/jpeg" }),
  ];

  console.log("Sending 3 images: room + swatch + reference");
  console.log("Prompt length:", prompt.length);

  const genStart = performance.now();
  const result = await openai.images.edit({
    model: "gpt-image-1.5",
    image: inputImages,
    prompt,
    quality: "medium",
    size: "1536x1024",
    input_fidelity: "high",
  });

  const durationMs = Math.round(performance.now() - genStart);
  const img = result.data?.[0];
  if (!img?.b64_json) throw new Error("No image generated");

  const outputPath = path.join(OUTPUT_DIR, "11_scale_geometry_reference_combined.png");
  fs.writeFileSync(outputPath, Buffer.from(img.b64_json, "base64"));
  fs.writeFileSync(path.join(OUTPUT_DIR, "prompt_reference.txt"), prompt);

  console.log(`Done in ${(durationMs / 1000).toFixed(1)}s → ${outputPath}`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
