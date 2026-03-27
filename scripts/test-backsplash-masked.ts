#!/usr/bin/env npx tsx
/**
 * Test 1: Masked inpainting for backsplash.
 * Uses Gemini to generate a backsplash mask for the SM Kinkade kitchen,
 * then sends the masked image + HQ swatch + reference to OpenAI.
 *
 * Usage: npx tsx scripts/test-backsplash-masked.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import OpenAI, { toFile } from "openai";
import { GoogleGenAI } from "@google/genai";
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
const ai = new GoogleGenAI({ apiKey: getEnvOrDie("GOOGLE_GENERATIVE_AI_API_KEY") });

const OUTPUT_DIR = path.join(__dirname, "backsplash-test-outputs", "masked-inpaint");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const KITCHEN_PHOTO = "364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp";

// ---------------------------------------------------------------------------
// Step 1: Generate backsplash mask using Gemini
// ---------------------------------------------------------------------------
async function generateBacksplashMask(roomBuffer: Buffer): Promise<Buffer> {
  const cachedMask = path.join(OUTPUT_DIR, "backsplash-mask.png");
  if (fs.existsSync(cachedMask)) {
    console.log("  Using cached backsplash mask");
    return fs.readFileSync(cachedMask);
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
        { text: `Generate a segmentation mask for the BACKSPLASH ONLY in this kitchen photo.

Output a ${width}x${height} image where:
- BACKSPLASH area (tile surface between upper cabinets and countertop on the walls) = pure WHITE (#FFFFFF)
- EVERYTHING else (cabinets, countertop, appliances, floor, island, ceiling, walls) = pure BLACK (#000000)

RULES:
- Only the backsplash tile surface should be white
- Include ALL visible backsplash — behind the range, between cabinets, in the alcove
- Crisp edges along cabinet/countertop boundaries
- Do NOT include the range, microwave, outlets, or any appliances
- Do NOT include countertop or cabinet surfaces
- Pure black and white only — no grey, no gradients` },
      ],
    }],
    config: {
      responseModalities: ["image", "text"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      const maskBuffer = Buffer.from(part.inlineData.data, "base64");
      // Ensure it's resized to match source and is pure B&W
      const processed = await sharp(maskBuffer)
        .resize(width!, height!)
        .grayscale()
        .threshold(128)
        .png()
        .toBuffer();
      fs.writeFileSync(cachedMask, processed);
      console.log(`  Mask saved: ${cachedMask}`);
      return processed;
    }
  }
  throw new Error("Gemini did not return a mask image");
}

// ---------------------------------------------------------------------------
// Step 2: Create alpha-masked image for OpenAI inpainting
// ---------------------------------------------------------------------------
async function prepareAlphaMask(roomBuffer: Buffer, maskBuffer: Buffer): Promise<Buffer> {
  const { width, height } = await sharp(roomBuffer).metadata();

  const maskResized = await sharp(maskBuffer)
    .resize(width!, height!)
    .grayscale()
    .raw()
    .toBuffer();

  const sourceRgba = await sharp(roomBuffer)
    .resize(width!, height!)
    .ensureAlpha()
    .raw()
    .toBuffer();

  const rgba = Buffer.from(sourceRgba);

  // White mask = backsplash = transparent (editable)
  // Black mask = everything else = opaque (keep)
  for (let i = 0; i < maskResized.length; i++) {
    rgba[i * 4 + 3] = 255 - maskResized[i];
  }

  return sharp(rgba, {
    raw: { width: width!, height: height!, channels: 4 }
  }).png().toBuffer();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Masked Inpainting: Backsplash ===\n");

  // Download room photo
  console.log("Downloading room photo...");
  const { data: imageData, error } = await supabase.storage.from("rooms").download(KITCHEN_PHOTO);
  if (error || !imageData) throw new Error(`Failed: ${error?.message}`);
  const roomBuffer = Buffer.from(await imageData.arrayBuffer());
  fs.writeFileSync(path.join(OUTPUT_DIR, "00_source.png"), roomBuffer);

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

  // Step 1: Generate mask
  console.log("\nStep 1: Backsplash mask");
  const maskBuffer = await generateBacksplashMask(roomBuffer);

  // Step 2: Create alpha-masked image
  console.log("\nStep 2: Preparing masked image for inpainting");
  const maskedImage = await prepareAlphaMask(roomBuffer, maskBuffer);
  fs.writeFileSync(path.join(OUTPUT_DIR, "01_masked_image.png"), maskedImage);

  // Step 3: Send to OpenAI with mask + swatch + reference
  console.log("\nStep 3: Generating with mask + swatch + reference");
  const inputImages = [
    await toFile(maskedImage, "room-masked.png", { type: "image/png" }),
    await toFile(swatchBuffer, "swatch.jpg", { type: "image/jpeg" }),
    await toFile(refBuffer, "reference.jpg", { type: "image/jpeg" }),
  ];

  const prompt = `Edit ONLY the transparent/masked area of this image. This is the backsplash area in a kitchen.

Replace the backsplash with 2x4 inch elongated hexagon picket tiles matching the swatch image (#1) for color and finish. The reference photo (#2) shows these tiles installed on a real backsplash — reproduce that exact tile shape and layout.

APPLY:
- Image #1 is the tile swatch — match its color and glossy finish exactly (taupe, anchor #978E89)
- Image #2 is a reference showing the installed tile pattern — match the elongated hexagon picket shape and horizontal layout
- Fill the entire masked backsplash area with this tile pattern

PRESERVE:
- Keep everything outside the masked area COMPLETELY unchanged
- Photorealistic result with accurate shadows, reflections, and lighting on the new tiles
- Tiles should look naturally installed with consistent grout lines`;

  fs.writeFileSync(path.join(OUTPUT_DIR, "prompt_masked.txt"), prompt);

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

  const outputPath = path.join(OUTPUT_DIR, "02_masked_result.png");
  fs.writeFileSync(outputPath, Buffer.from(img.b64_json, "base64"));
  console.log(`  Done in ${(durationMs / 1000).toFixed(1)}s → ${outputPath}`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
