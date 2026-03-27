#!/usr/bin/env npx tsx
/**
 * Test multiple fal.ai image editing models for backsplash picket tiles.
 * Runs the same mask + swatch + prompt across different models.
 *
 * Usage: npx tsx scripts/test-backsplash-multi-model.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { fal } from "@fal-ai/client";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import fs from "fs";

function getEnvOrDie(key: string): string {
  const val = process.env[key];
  if (!val) { console.error(`Missing env var: ${key}`); process.exit(1); }
  return val;
}

fal.config({ credentials: getEnvOrDie("FAL_KEY") });
const supabase = createClient(getEnvOrDie("NEXT_PUBLIC_SUPABASE_URL"), getEnvOrDie("SUPABASE_SERVICE_ROLE_KEY"));

const OUTPUT_DIR = path.join(__dirname, "backsplash-test-outputs", "multi-model");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const KITCHEN_PHOTO = "364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp";

function toDataUrl(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

const PROMPT = `Replace the backsplash with taupe glazed porcelain elongated hexagon picket tiles. Each tile is a horizontal hexagon — a rectangle with pointed angled ends on left and right, approximately 2 inches tall and 4 inches wide. Tiles interlock in staggered rows with thin white grout lines. Glossy finish, warm taupe color. Photorealistic, matching the kitchen lighting.`;

interface ModelConfig {
  name: string;
  endpoint: string;
  buildInput: (roomUrl: string, maskUrl: string, swatchUrl: string) => Record<string, any>;
  extractUrl: (data: any) => string | null;
}

const MODELS: ModelConfig[] = [
  {
    name: "bria-fibo-edit",
    endpoint: "fal-ai/bria/fibo-edit/edit",
    buildInput: (roomUrl, maskUrl) => ({
      image_url: roomUrl,
      mask_url: maskUrl,
      prompt: PROMPT,
      num_images: 1,
    }),
    extractUrl: (data) => data?.images?.[0]?.url ?? null,
  },
  {
    name: "seedream-v4",
    endpoint: "fal-ai/bytedance/seedream/v4/edit",
    buildInput: (roomUrl, maskUrl) => ({
      image_url: roomUrl,
      mask_url: maskUrl,
      prompt: PROMPT,
      num_images: 1,
    }),
    extractUrl: (data) => data?.images?.[0]?.url ?? null,
  },
  {
    name: "ideogram-v3",
    endpoint: "fal-ai/ideogram/v3/edit",
    buildInput: (roomUrl, maskUrl) => ({
      image_url: roomUrl,
      mask_url: maskUrl,
      prompt: PROMPT,
      num_images: 1,
    }),
    extractUrl: (data) => data?.images?.[0]?.url ?? null,
  },
  {
    name: "reve-edit",
    endpoint: "fal-ai/reve/edit",
    buildInput: (roomUrl, _maskUrl, swatchUrl) => ({
      image_url: roomUrl,
      prompt: `Replace the kitchen backsplash (tile area between upper cabinets and countertop) with taupe glazed porcelain elongated hexagon picket tiles matching the reference swatch. Each tile is a horizontal hexagon with pointed ends, approximately 2x4 inches. Staggered interlocking rows, glossy finish, thin white grout lines. Keep everything else unchanged.`,
      num_images: 1,
    }),
    extractUrl: (data) => data?.images?.[0]?.url ?? null,
  },
];

async function main() {
  console.log("=== Multi-Model Backsplash Test ===\n");

  // Download room photo
  console.log("Downloading assets...");
  const { data: imageData, error } = await supabase.storage.from("rooms").download(KITCHEN_PHOTO);
  if (error || !imageData) throw new Error(`Failed: ${error?.message}`);
  const roomBuffer = await sharp(Buffer.from(await imageData.arrayBuffer())).png().toBuffer();

  // Get mask
  const maskPath = path.join(__dirname, "backsplash-test-outputs", "masked-inpaint", "backsplash-mask.png");
  if (!fs.existsSync(maskPath)) throw new Error("No backsplash mask found — run test-backsplash-masked.ts first");
  const { width, height } = await sharp(roomBuffer).metadata();
  const maskBuffer = await sharp(maskPath).resize(width!, height!).png().toBuffer();

  // Get swatch
  const { data: swatchData } = await supabase.storage.from("swatches").download(
    "364538bf-1712-48e7-a905-04ad90983eb2/backsplash/baker-blvd-picket-gloss-taupe-hq.jpg"
  );
  if (!swatchData) throw new Error("Failed to download swatch");
  const swatchBuffer = Buffer.from(await swatchData.arrayBuffer());

  // Save inputs
  fs.writeFileSync(path.join(OUTPUT_DIR, "00_source.png"), roomBuffer);
  fs.writeFileSync(path.join(OUTPUT_DIR, "00_mask.png"), maskBuffer);

  const roomUrl = toDataUrl(roomBuffer, "image/png");
  const maskUrl = toDataUrl(maskBuffer, "image/png");
  const swatchUrl = toDataUrl(swatchBuffer, "image/jpeg");

  // Run each model
  for (const model of MODELS) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`  ${model.name} (${model.endpoint})`);
    console.log(`${"=".repeat(50)}`);

    const genStart = performance.now();
    try {
      const result = await fal.subscribe(model.endpoint, {
        input: model.buildInput(roomUrl, maskUrl, swatchUrl),
      });

      const durationMs = Math.round(performance.now() - genStart);
      const url = model.extractUrl(result.data);

      if (!url) {
        console.log("  Response:", JSON.stringify(result.data, null, 2).slice(0, 300));
        console.log(`  No image URL found (${(durationMs / 1000).toFixed(1)}s)`);
        continue;
      }

      const response = await fetch(url);
      const resultBuffer = Buffer.from(await response.arrayBuffer());
      const outputPath = path.join(OUTPUT_DIR, `${model.name}.png`);
      fs.writeFileSync(outputPath, resultBuffer);
      console.log(`  Done in ${(durationMs / 1000).toFixed(1)}s → ${outputPath}`);
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - genStart);
      console.error(`  Failed (${(durationMs / 1000).toFixed(1)}s): ${err.message || err}`);
      if (err.body) console.error("  Body:", JSON.stringify(err.body, null, 2).slice(0, 300));
    }
  }

  console.log(`\nOutputs in ${OUTPUT_DIR}/`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
