#!/usr/bin/env npx tsx
/**
 * Test FLUX Fill (via fal.ai) for backsplash tile generation.
 * FLUX Fill is mask-based inpainting — perfect for a targeted surface swap.
 *
 * Flow:
 *   1. Use existing backsplash mask (or generate with Gemini)
 *   2. Send room photo + mask + prompt to FLUX Fill
 *   3. Compare tile pattern accuracy vs gpt-image-1.5
 *
 * Usage: npx tsx scripts/test-backsplash-flux.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { fal } from "@fal-ai/client";
import { GoogleGenAI } from "@google/genai";
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
const ai = new GoogleGenAI({ apiKey: getEnvOrDie("GOOGLE_GENERATIVE_AI_API_KEY") });

const OUTPUT_DIR = path.join(__dirname, "backsplash-test-outputs", "flux-fill");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const KITCHEN_PHOTO = "364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp";

// ---------------------------------------------------------------------------
// Mask generation (reuse cached if available)
// ---------------------------------------------------------------------------
async function getBacksplashMask(roomBuffer: Buffer): Promise<Buffer> {
  const cached = path.join(__dirname, "backsplash-test-outputs", "masked-inpaint", "backsplash-mask.png");
  const local = path.join(OUTPUT_DIR, "backsplash-mask.png");

  if (fs.existsSync(local)) {
    console.log("  Using cached mask");
    return fs.readFileSync(local);
  }
  if (fs.existsSync(cached)) {
    console.log("  Using mask from masked-inpaint test");
    fs.copyFileSync(cached, local);
    return fs.readFileSync(local);
  }

  console.log("  Generating backsplash mask with Gemini...");
  const base64Image = roomBuffer.toString("base64");
  const { width, height } = await sharp(roomBuffer).metadata();

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: "image/webp", data: base64Image } },
        { text: `Generate a segmentation mask for the BACKSPLASH ONLY in this kitchen photo. Output a ${width}x${height} image where BACKSPLASH = pure WHITE (#FFFFFF), EVERYTHING else = pure BLACK (#000000). Crisp edges. No appliances, outlets, or non-backsplash surfaces.` },
      ],
    }],
    config: { responseModalities: ["image", "text"] },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      const maskBuffer = Buffer.from(part.inlineData.data, "base64");
      const processed = await sharp(maskBuffer)
        .resize(width!, height!)
        .grayscale()
        .threshold(128)
        .png()
        .toBuffer();
      fs.writeFileSync(local, processed);
      return processed;
    }
  }
  throw new Error("Gemini did not return a mask image");
}

// ---------------------------------------------------------------------------
// Convert buffer to data URL for fal.ai
// ---------------------------------------------------------------------------
function toDataUrl(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== FLUX Fill: Backsplash Picket Test ===\n");

  // Download room photo
  console.log("Downloading room photo...");
  const { data: imageData, error } = await supabase.storage.from("rooms").download(KITCHEN_PHOTO);
  if (error || !imageData) throw new Error(`Failed: ${error?.message}`);
  const roomBuffer = Buffer.from(await imageData.arrayBuffer());

  // Convert to PNG for FLUX
  const roomPng = await sharp(roomBuffer).png().toBuffer();
  fs.writeFileSync(path.join(OUTPUT_DIR, "00_source.png"), roomPng);

  // Get mask
  console.log("\nStep 1: Backsplash mask");
  const maskBuffer = await getBacksplashMask(roomBuffer);
  const { width, height } = await sharp(roomPng).metadata();

  // Resize mask to match room
  const maskResized = await sharp(maskBuffer).resize(width!, height!).png().toBuffer();
  fs.writeFileSync(path.join(OUTPUT_DIR, "01_mask.png"), maskResized);

  // Download swatch for reference in prompt
  const { data: swatchData } = await supabase.storage.from("swatches").download(
    "364538bf-1712-48e7-a905-04ad90983eb2/backsplash/baker-blvd-picket-gloss-taupe-hq.jpg"
  );
  if (!swatchData) throw new Error("Failed to download swatch");
  const swatchBuffer = Buffer.from(await swatchData.arrayBuffer());

  // FLUX Fill — send room + mask + prompt
  const prompt = `Taupe glazed porcelain backsplash tile. Elongated hexagon picket shape — each tile is a horizontal hexagon approximately 2 inches tall and 4 inches wide with pointed ends on left and right. Tiles interlock in staggered horizontal rows. The swatch sheet shows 3 tiles across and 6 rows. Glossy finish, warm taupe color #978E89, thin white grout lines between tiles. Photorealistic, matching the kitchen lighting.`;

  console.log("\nStep 2: FLUX Fill generation");
  console.log(`  Prompt: ${prompt.length} chars`);

  const genStart = performance.now();

  try {
    const result = await fal.subscribe("fal-ai/flux-pro/v1/fill", {
      input: {
        image_url: toDataUrl(roomPng, "image/png"),
        mask_url: toDataUrl(maskResized, "image/png"),
        prompt,
        num_images: 1,
        image_size: { width: width!, height: height! },
        strength: 0.95,
        num_inference_steps: 28,
        guidance_scale: 7,
      },
    });

    const durationMs = Math.round(performance.now() - genStart);
    const images = (result.data as any)?.images;
    if (!images?.[0]?.url) {
      console.log("  Response:", JSON.stringify(result.data, null, 2).slice(0, 500));
      throw new Error("No image in response");
    }

    // Download the result image
    const imageUrl = images[0].url;
    const response = await fetch(imageUrl);
    const resultBuffer = Buffer.from(await response.arrayBuffer());

    const outputPath = path.join(OUTPUT_DIR, "02_flux_fill_result.png");
    fs.writeFileSync(outputPath, resultBuffer);
    console.log(`  Done in ${(durationMs / 1000).toFixed(1)}s → ${outputPath}`);
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - genStart);
    console.error(`  Failed (${(durationMs / 1000).toFixed(1)}s):`, err.message || err);
    if (err.body) console.error("  Body:", JSON.stringify(err.body, null, 2).slice(0, 500));
  }

  // Also try FLUX Fill with the swatch as image input if the model supports it
  console.log("\nStep 3: FLUX Fill with swatch reference");
  const genStart2 = performance.now();

  try {
    const result2 = await fal.subscribe("fal-ai/flux-pro/v1/fill", {
      input: {
        image_url: toDataUrl(roomPng, "image/png"),
        mask_url: toDataUrl(maskResized, "image/png"),
        prompt: `Replace the masked backsplash area with taupe glazed porcelain elongated hexagon picket tiles matching the reference swatch. Each tile is approximately 2x4 inches, horizontally oriented with pointed ends. Staggered interlocking rows. Glossy finish, color #978E89, thin white grout lines. Photorealistic kitchen backsplash.`,
        num_images: 1,
        image_size: { width: width!, height: height! },
        strength: 0.95,
        num_inference_steps: 28,
        guidance_scale: 10,
      },
    });

    const durationMs = Math.round(performance.now() - genStart2);
    const images = (result2.data as any)?.images;
    if (!images?.[0]?.url) throw new Error("No image in response");

    const response = await fetch(images[0].url);
    const resultBuffer = Buffer.from(await response.arrayBuffer());

    const outputPath = path.join(OUTPUT_DIR, "03_flux_fill_high_guidance.png");
    fs.writeFileSync(outputPath, resultBuffer);
    console.log(`  Done in ${(durationMs / 1000).toFixed(1)}s → ${outputPath}`);
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - genStart2);
    console.error(`  Failed (${(durationMs / 1000).toFixed(1)}s):`, err.message || err);
  }

  console.log(`\nOutputs in ${OUTPUT_DIR}/`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
