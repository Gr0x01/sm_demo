#!/usr/bin/env npx tsx
/**
 * Nano Banana v2 — corrected API usage based on docs research.
 *
 * Fixes from v1:
 *   1. responseModalities: ["TEXT", "IMAGE"] (not just IMAGE)
 *   2. Explicit ordinal image references in prompt ("first image", "second image")
 *   3. Tests both gemini-3-pro-image-preview and gemini-3.1-flash-image-preview
 *
 * Runs 4 tests:
 *   A2: swatch only (no dims, no ref) — corrected API
 *   B2: swatch + 1x3 dimensions — corrected API
 *   C2: swatch + reference photo + 1x3 dimensions — corrected API
 *   D2: same as C2 but on gemini-3.1-flash-image-preview (Nano Banana 2)
 *
 * Usage: npx tsx scripts/test-backsplash-nb-v2.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function getEnvOrDie(key: string): string {
  const val = process.env[key];
  if (!val) { console.error(`Missing env var: ${key}`); process.exit(1); }
  return val;
}

const supabase = createClient(getEnvOrDie("NEXT_PUBLIC_SUPABASE_URL"), getEnvOrDie("SUPABASE_SERVICE_ROLE_KEY"));
const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!googleApiKey) { console.error("Missing GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY"); process.exit(1); }
const ai = new GoogleGenAI({ apiKey: googleApiKey });

const OUTPUT_DIR = path.join(__dirname, "backsplash-test-outputs", "nano-banana-v2");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const KITCHEN_PHOTO = "364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp";
const SWATCH_PATH = "364538bf-1712-48e7-a905-04ad90983eb2/backsplash/baker-blvd-picket-gloss-taupe-hq.jpg";
const REFERENCE_PATH = "364538bf-1712-48e7-a905-04ad90983eb2/backsplash/baker-blvd-picket-gloss-taupe-reference.jpg";

async function downloadBuffer(bucket: string, filePath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(bucket).download(filePath);
  if (error || !data) throw new Error(`Failed to download ${bucket}/${filePath}: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

function inlineImage(buffer: Buffer, mimeType: string) {
  return { inlineData: { mimeType, data: buffer.toString("base64") } };
}

interface TestConfig {
  name: string;
  label: string;
  model: string;
  prompt: string;
  images: Array<{ buffer: Buffer; mimeType: string }>;
}

async function runTest(tc: TestConfig): Promise<void> {
  console.log(`\n${"=".repeat(55)}`);
  console.log(`  ${tc.name}: ${tc.label}`);
  console.log(`  Model: ${tc.model}`);
  console.log(`${"=".repeat(55)}`);

  // Build parts: text prompt first, then images in order referenced by prompt
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: tc.prompt },
    ...tc.images.map(img => inlineImage(img.buffer, img.mimeType)),
  ];

  fs.writeFileSync(path.join(OUTPUT_DIR, `${tc.name}_prompt.txt`), tc.prompt);
  console.log(`  Prompt: ${tc.prompt.length} chars, ${tc.images.length} image(s)`);

  try {
    const start = performance.now();
    const response = await ai.models.generateContent({
      model: tc.model,
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "3:2",
          imageSize: "1K",
        },
      },
    });
    const durationMs = Math.round(performance.now() - start);

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) throw new Error("No response parts");

    // Extract text and image from response
    let textResponse = "";
    let imageBuffer: Buffer | null = null;

    for (const part of candidate.content.parts) {
      if ((part as any).text) textResponse += (part as any).text;
      if ((part as any).inlineData) {
        imageBuffer = Buffer.from((part as any).inlineData.data, "base64");
      }
    }

    if (textResponse) {
      console.log(`  Model said: ${textResponse.slice(0, 200)}`);
      fs.writeFileSync(path.join(OUTPUT_DIR, `${tc.name}_model_text.txt`), textResponse);
    }

    if (!imageBuffer) throw new Error("No image in response");

    const outputPath = path.join(OUTPUT_DIR, `${tc.name}_output.png`);
    fs.writeFileSync(outputPath, imageBuffer);
    console.log(`  Done in ${(durationMs / 1000).toFixed(1)}s → ${outputPath}`);
  } catch (err: any) {
    console.error(`  FAILED: ${err.message}`);
  }
}

async function main() {
  console.log("=== Nano Banana v2 — Corrected API Usage ===\n");

  console.log("Downloading assets...");
  const [roomBuffer, swatchBuffer, refBuffer] = await Promise.all([
    downloadBuffer("rooms", KITCHEN_PHOTO),
    downloadBuffer("swatches", SWATCH_PATH),
    downloadBuffer("swatches", REFERENCE_PATH),
  ]);
  console.log(`  Room: ${roomBuffer.length}b | Swatch: ${swatchBuffer.length}b | Reference: ${refBuffer.length}b`);

  // Save inputs for reference
  fs.writeFileSync(path.join(OUTPUT_DIR, "00_input_room.png"), roomBuffer);
  fs.writeFileSync(path.join(OUTPUT_DIR, "00_swatch.jpg"), swatchBuffer);
  fs.writeFileSync(path.join(OUTPUT_DIR, "00_reference.jpg"), refBuffer);

  const PROMPT_BASE = `Edit the first image, which is a kitchen photo in a new-construction home. Replace ONLY the backsplash (the tile surface between the upper cabinets and the countertop along the back wall) with the tile shown in the second image (a tile swatch).

The second image is a swatch of elongated hexagon picket tiles — match its exact color, finish, and tile shape on the backsplash.

Keep EVERYTHING else in the photo exactly the same — cabinets, countertops, island, appliances, flooring, lighting, camera angle, room layout. Do not add, remove, or move any objects.`;

  const DIMS_ADDITION = `

The tiles are approximately 1x3 inches each, with pointed ends on the left and right sides. They interlock in staggered horizontal rows. On a real 18-inch backsplash you would see many rows of these small tiles.`;

  const REF_PROMPT = `Edit the first image, which is a kitchen photo in a new-construction home. Replace ONLY the backsplash (the tile surface between the upper cabinets and the countertop along the back wall).

The second image is a tile swatch — match its exact color and glossy finish.
The third image shows these same tiles installed on a real kitchen backsplash — match that exact tile shape, size, and layout pattern.

The tiles are approximately 1x3 inches each — elongated hexagons with pointed ends on the left and right sides, interlocking in staggered horizontal rows.

Keep EVERYTHING else in the photo exactly the same — cabinets, countertops, island, appliances, flooring, lighting, camera angle, room layout. Do not add, remove, or move any objects.`;

  const MODEL_V1 = "gemini-3-pro-image-preview";
  const MODEL_V2 = "gemini-3.1-flash-image-preview";

  const tests: TestConfig[] = [
    {
      name: "A2_swatch-only",
      label: "Swatch only, no dims, no ref",
      model: MODEL_V1,
      prompt: PROMPT_BASE,
      images: [
        { buffer: roomBuffer, mimeType: "image/webp" },
        { buffer: swatchBuffer, mimeType: "image/jpeg" },
      ],
    },
    {
      name: "B2_swatch-dims",
      label: "Swatch + 1x3 horizontal dimensions",
      model: MODEL_V1,
      prompt: PROMPT_BASE + DIMS_ADDITION,
      images: [
        { buffer: roomBuffer, mimeType: "image/webp" },
        { buffer: swatchBuffer, mimeType: "image/jpeg" },
      ],
    },
    {
      name: "C2_swatch-dims-ref",
      label: "Swatch + dims + reference photo",
      model: MODEL_V1,
      prompt: REF_PROMPT,
      images: [
        { buffer: roomBuffer, mimeType: "image/webp" },
        { buffer: swatchBuffer, mimeType: "image/jpeg" },
        { buffer: refBuffer, mimeType: "image/jpeg" },
      ],
    },
    {
      name: "D2_flash-swatch-dims-ref",
      label: "Swatch + dims + ref on Nano Banana 2 (3.1 Flash)",
      model: MODEL_V2,
      prompt: REF_PROMPT,
      images: [
        { buffer: roomBuffer, mimeType: "image/webp" },
        { buffer: swatchBuffer, mimeType: "image/jpeg" },
        { buffer: refBuffer, mimeType: "image/jpeg" },
      ],
    },
  ];

  for (const tc of tests) {
    await runTest(tc);
  }

  console.log(`\n${"=".repeat(55)}`);
  console.log("ALL DONE");
  console.log(`${"=".repeat(55)}`);
  console.log(`Outputs: ${OUTPUT_DIR}/`);
  console.log("Compare A2 vs B2 vs C2 to see if corrected API + ordinal refs help.");
  console.log("Compare C2 vs D2 to see if Nano Banana 2 (Flash) does better.");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
