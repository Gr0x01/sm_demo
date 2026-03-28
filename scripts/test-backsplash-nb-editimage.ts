#!/usr/bin/env npx tsx
/**
 * Test Nano Banana using the PROPER editImage() API instead of generateContent().
 *
 * The editImage API lets us tell the model the ROLE of each image:
 *   - RawReferenceImage: the base kitchen photo to edit
 *   - StyleReferenceImage: the swatch (appearance authority)
 *   - SubjectReferenceImage: the installed reference photo (shape/layout authority)
 *
 * This should produce dramatically better results than generateContent()
 * where images are just generic multimodal blobs with no role distinction.
 *
 * Usage: npx tsx scripts/test-backsplash-nb-editimage.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import {
  GoogleGenAI,
  RawReferenceImage,
  StyleReferenceImage,
  SubjectReferenceImage,
} from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function getEnvOrDie(key: string): string {
  const val = process.env[key];
  if (!val) { console.error(`Missing env var: ${key}`); process.exit(1); }
  return val;
}

const MODEL = "gemini-3-pro-image-preview";
const supabase = createClient(getEnvOrDie("NEXT_PUBLIC_SUPABASE_URL"), getEnvOrDie("SUPABASE_SERVICE_ROLE_KEY"));
const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!googleApiKey) { console.error("Missing GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY"); process.exit(1); }
const ai = new GoogleGenAI({ apiKey: googleApiKey });

const OUTPUT_DIR = path.join(__dirname, "backsplash-test-outputs", "nano-banana");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const KITCHEN_PHOTO = "364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp";
const SWATCH_PATH = "364538bf-1712-48e7-a905-04ad90983eb2/backsplash/baker-blvd-picket-gloss-taupe-hq.jpg";
const REFERENCE_PATH = "364538bf-1712-48e7-a905-04ad90983eb2/backsplash/baker-blvd-picket-gloss-taupe-reference.jpg";

async function downloadBuffer(bucket: string, filePath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(bucket).download(filePath);
  if (error || !data) throw new Error(`Failed to download ${bucket}/${filePath}: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

async function main() {
  console.log("=== Nano Banana editImage() API Test ===");
  console.log(`Model: ${MODEL}\n`);

  // Download all 3 images
  console.log("Downloading assets...");
  const [roomBuffer, swatchBuffer, refBuffer] = await Promise.all([
    downloadBuffer("rooms", KITCHEN_PHOTO),
    downloadBuffer("swatches", SWATCH_PATH),
    downloadBuffer("swatches", REFERENCE_PATH),
  ]);
  console.log(`  Room: ${roomBuffer.length} bytes`);
  console.log(`  Swatch: ${swatchBuffer.length} bytes`);
  console.log(`  Reference: ${refBuffer.length} bytes`);

  const prompt = `Edit this kitchen photo. Replace ONLY the backsplash (tile area between upper cabinets and countertop) with elongated hexagon picket tiles matching the style reference for color/finish and the subject reference for tile shape and layout. Keep everything else in the photo unchanged — same cabinets, countertops, appliances, flooring, lighting, camera angle.`;

  console.log(`\nPrompt: ${prompt.length} chars`);
  fs.writeFileSync(path.join(OUTPUT_DIR, "editimage_prompt.txt"), prompt);

  // --- Test 1: RawReferenceImage (base) + StyleReferenceImage (swatch) ---
  console.log(`\n${"=".repeat(50)}`);
  console.log("  Test D: editImage — Raw (room) + Style (swatch)");
  console.log(`${"=".repeat(50)}`);

  try {
    const start1 = performance.now();
    const response1 = await ai.models.editImage({
      model: MODEL,
      prompt,
      referenceImages: [
        new RawReferenceImage({
          referenceImage: { imageBytes: roomBuffer.toString("base64"), mimeType: "image/webp" },
          referenceId: 0,
        }),
        new StyleReferenceImage({
          referenceImage: { imageBytes: swatchBuffer.toString("base64"), mimeType: "image/jpeg" },
          referenceId: 1,
          config: { styleDescription: "Taupe glossy elongated hexagon picket tile swatch — match this color and finish" },
        }),
      ],
      config: { numberOfImages: 1 },
    });
    const dur1 = Math.round(performance.now() - start1);

    const img1 = response1?.generatedImages?.[0]?.image?.imageBytes;
    if (!img1) throw new Error("No image in response");

    const out1 = path.join(OUTPUT_DIR, "picket-taupe-v_D_EDITIMAGE-STYLE.png");
    fs.writeFileSync(out1, Buffer.from(img1, "base64"));
    console.log(`  Done in ${(dur1 / 1000).toFixed(1)}s → ${out1}`);
  } catch (err: any) {
    console.error(`  FAILED: ${err.message}`);
    if (err.response) console.error("  Response:", JSON.stringify(err.response, null, 2).slice(0, 500));
  }

  // --- Test 2: Raw (room) + Style (swatch) + Subject (reference) ---
  console.log(`\n${"=".repeat(50)}`);
  console.log("  Test E: editImage — Raw + Style + Subject (reference)");
  console.log(`${"=".repeat(50)}`);

  try {
    const start2 = performance.now();
    const response2 = await ai.models.editImage({
      model: MODEL,
      prompt,
      referenceImages: [
        new RawReferenceImage({
          referenceImage: { imageBytes: roomBuffer.toString("base64"), mimeType: "image/webp" },
          referenceId: 0,
        }),
        new StyleReferenceImage({
          referenceImage: { imageBytes: swatchBuffer.toString("base64"), mimeType: "image/jpeg" },
          referenceId: 1,
          config: { styleDescription: "Taupe glossy elongated hexagon picket tile swatch — match this color and finish" },
        }),
        new SubjectReferenceImage({
          referenceImage: { imageBytes: refBuffer.toString("base64"), mimeType: "image/jpeg" },
          referenceId: 2,
          config: { subjectDescription: "Installed elongated hexagon picket tile backsplash — reproduce this exact tile shape, scale, and layout pattern" },
        }),
      ],
      config: { numberOfImages: 1 },
    });
    const dur2 = Math.round(performance.now() - start2);

    const img2 = response2?.generatedImages?.[0]?.image?.imageBytes;
    if (!img2) throw new Error("No image in response");

    const out2 = path.join(OUTPUT_DIR, "picket-taupe-v_E_EDITIMAGE-STYLE-SUBJECT.png");
    fs.writeFileSync(out2, Buffer.from(img2, "base64"));
    console.log(`  Done in ${(dur2 / 1000).toFixed(1)}s → ${out2}`);
  } catch (err: any) {
    console.error(`  FAILED: ${err.message}`);
    if (err.response) console.error("  Response:", JSON.stringify(err.response, null, 2).slice(0, 500));
  }

  console.log(`\nOutputs: ${OUTPUT_DIR}/`);
  console.log("Compare D (style only) and E (style + subject) against A/B/C.");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
