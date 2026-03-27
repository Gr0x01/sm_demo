#!/usr/bin/env npx tsx
/**
 * Test: Generate a flat tile texture at close range, then composite onto backsplash.
 *
 * Step 1: Ask gpt-image-1.5 to generate a flat, head-on tile texture
 *         (just tiles filling the frame — no room, no perspective)
 * Step 2: Tile/warp that texture onto the backsplash mask area
 * Step 3: Send the composite to gpt-image-1.5 for lighting/blending
 *
 * Usage: npx tsx scripts/test-backsplash-tile-patch.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import OpenAI, { toFile } from "openai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import fs from "fs";

function getEnvOrDie(key: string): string {
  const val = process.env[key];
  if (!val) { console.error(`Missing env var: ${key}`); process.exit(1); }
  return val;
}

const supabase = createClient(getEnvOrDie("NEXT_PUBLIC_SUPABASE_URL"), getEnvOrDie("SUPABASE_SERVICE_ROLE_KEY"));
const openai = new OpenAI();

const OUTPUT_DIR = path.join(__dirname, "backsplash-test-outputs", "tile-patch");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const KITCHEN_PHOTO = "364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp";

async function main() {
  console.log("=== Tile Patch + Composite Test ===\n");

  // Download assets
  console.log("Downloading assets...");
  const { data: imageData, error } = await supabase.storage.from("rooms").download(KITCHEN_PHOTO);
  if (error || !imageData) throw new Error(`Failed: ${error?.message}`);
  const roomBuffer = Buffer.from(await imageData.arrayBuffer());
  const { width: roomW, height: roomH } = await sharp(roomBuffer).metadata();
  fs.writeFileSync(path.join(OUTPUT_DIR, "00_source.png"), roomBuffer);

  // Get swatch
  const { data: swatchData } = await supabase.storage.from("swatches").download(
    "364538bf-1712-48e7-a905-04ad90983eb2/backsplash/baker-blvd-picket-gloss-taupe-hq.jpg"
  );
  if (!swatchData) throw new Error("Failed to download swatch");
  const swatchBuffer = Buffer.from(await swatchData.arrayBuffer());

  // Get reference
  const { data: refData } = await supabase.storage.from("swatches").download(
    "364538bf-1712-48e7-a905-04ad90983eb2/backsplash/baker-blvd-picket-gloss-taupe-reference.jpg"
  );
  if (!refData) throw new Error("Failed to download reference");
  const refBuffer = Buffer.from(await refData.arrayBuffer());

  // Get mask
  const maskPath = path.join(__dirname, "backsplash-test-outputs", "masked-inpaint", "backsplash-mask.png");
  if (!fs.existsSync(maskPath)) throw new Error("No backsplash mask — run test-backsplash-masked.ts first");
  const maskBuffer = await sharp(maskPath).resize(roomW!, roomH!).png().toBuffer();

  // ===== STEP 1: Generate flat tile texture =====
  console.log("\nStep 1: Generating flat tile texture...");

  const tilePrompt = `Generate a perfectly flat, head-on photograph of a backsplash tile surface. The tiles are taupe glazed porcelain elongated hexagon picket tiles — each tile is a horizontal hexagon shape (flat top and bottom, pointed left and right ends), approximately 2 inches tall and 4 inches wide. Tiles are arranged in staggered horizontal rows where the pointed ends interlock. Thin white grout lines between all tiles. Fill the ENTIRE frame edge to edge with this tile pattern — no walls, no countertop, no cabinets, just tiles. Shot perfectly straight-on with even lighting, no shadows, no perspective distortion. The image should be seamlessly tileable.`;

  const inputImages = [
    await toFile(swatchBuffer, "swatch.jpg", { type: "image/jpeg" }),
    await toFile(refBuffer, "reference.jpg", { type: "image/jpeg" }),
  ];

  const genStart1 = performance.now();
  const tileResult = await openai.images.edit({
    model: "gpt-image-1.5",
    image: inputImages,
    prompt: `Image #1 is a tile swatch showing the color and finish. Image #2 is a reference showing these tiles installed. ${tilePrompt}`,
    quality: "medium",
    size: "1536x1024",
    input_fidelity: "high",
  });

  const dur1 = Math.round(performance.now() - genStart1);
  const tileImg = tileResult.data?.[0];
  if (!tileImg?.b64_json) throw new Error("No tile texture generated");

  const tileBuffer = Buffer.from(tileImg.b64_json, "base64");
  fs.writeFileSync(path.join(OUTPUT_DIR, "01_tile_texture.png"), tileBuffer);
  console.log(`  Done in ${(dur1 / 1000).toFixed(1)}s → 01_tile_texture.png`);

  // ===== STEP 2: Composite tile texture onto backsplash =====
  console.log("\nStep 2: Compositing onto backsplash...");

  const tileResized = await sharp(tileBuffer).resize(roomW!, roomH!, { fit: "cover" }).png().toBuffer();

  const roomRgba = await sharp(roomBuffer).resize(roomW!, roomH!).ensureAlpha().raw().toBuffer();
  const tileRgba = await sharp(tileResized).ensureAlpha().raw().toBuffer();
  const maskGray = await sharp(maskBuffer).grayscale().raw().toBuffer();

  const compositePixels = Buffer.from(roomRgba);
  for (let i = 0; i < maskGray.length; i++) {
    if (maskGray[i] > 128) {
      compositePixels[i * 4] = tileRgba[i * 4];
      compositePixels[i * 4 + 1] = tileRgba[i * 4 + 1];
      compositePixels[i * 4 + 2] = tileRgba[i * 4 + 2];
    }
  }

  const compositeBuffer = await sharp(compositePixels, {
    raw: { width: roomW!, height: roomH!, channels: 4 }
  }).png().toBuffer();
  fs.writeFileSync(path.join(OUTPUT_DIR, "02_raw_composite.png"), compositeBuffer);
  console.log("  Saved → 02_raw_composite.png");

  // ===== STEP 3: AI lighting/blending pass =====
  console.log("\nStep 3: AI lighting/blending pass...");

  const blendPrompt = `This kitchen photo has a new backsplash tile texture composited in. The tile pattern and color are correct but the backsplash area looks flat and pasted.

Refine ONLY the backsplash area:
- Add realistic lighting, shadows, and reflections matching the rest of the kitchen
- Add subtle perspective so tiles recede naturally with the wall
- Blend edges cleanly where backsplash meets cabinets and countertop
- Add depth to grout lines

CRITICAL: Keep the exact tile pattern, shape, and color unchanged. Do NOT replace the tiles with a different pattern. Keep everything outside the backsplash completely unchanged.`;

  const genStart3 = performance.now();
  const blendResult = await openai.images.edit({
    model: "gpt-image-1.5",
    image: [await toFile(compositeBuffer, "composite.png", { type: "image/png" })],
    prompt: blendPrompt,
    quality: "medium",
    size: "1536x1024",
    input_fidelity: "high",
  });

  const dur3 = Math.round(performance.now() - genStart3);
  const blendImg = blendResult.data?.[0];
  if (!blendImg?.b64_json) throw new Error("No blended image generated");

  fs.writeFileSync(path.join(OUTPUT_DIR, "03_blended.png"), Buffer.from(blendImg.b64_json, "base64"));
  console.log(`  Done in ${(dur3 / 1000).toFixed(1)}s → 03_blended.png`);

  console.log(`\nOutputs in ${OUTPUT_DIR}/`);
  console.log("  01_tile_texture.png — AI-generated flat tile texture");
  console.log("  02_raw_composite.png — texture pasted onto backsplash");
  console.log("  03_blended.png — AI-refined with lighting");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
