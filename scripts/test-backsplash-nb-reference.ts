#!/usr/bin/env npx tsx
/**
 * Test Nano Banana with swatch + installed reference photo for picket tiles.
 * Sends 3 images: room photo, HQ swatch, reference photo of installed tile.
 * Uses the 1x3 dimensions that visually looked best in prior tests.
 *
 * Usage: npx tsx scripts/test-backsplash-nb-reference.ts
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

async function downloadBuffer(bucket: string, path: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`Failed to download ${bucket}/${path}: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

async function main() {
  console.log("=== Nano Banana + Reference Photo Test ===");
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

  // Save reference for visual comparison
  fs.writeFileSync(path.join(OUTPUT_DIR, "picket_reference_photo.jpg"), refBuffer);
  fs.writeFileSync(path.join(OUTPUT_DIR, "picket_swatch_hq.jpg"), swatchBuffer);

  const prompt = `OUTPUT FORMAT: Return a single, seamless photograph — NOT a collage, NOT a split-screen, NOT a before-and-after comparison, NOT multiple panels. No borders, no dividers, no side-by-side layout. One unified landscape-orientation image preserving the original photo's full field of view, camera angle, and spatial composition.

SCENE: This photo shows a kitchen in a new-construction home. There is a large island in the foreground, wall cabinets and countertops along the back wall, and appliances. The floor is hardwood/LVP.
PHOTO_LAYOUT: Large island dominates the foreground with sink + faucet on the island; keep sink cutout and faucet direction fixed. Perimeter cabinets, backsplash, and range are on the back wall; refrigerator stays in its alcove. Dishwasher remains next to the sink; do not alter cabinet panel geometry.

Edit this room photo. Apply every listed selection to its specified surface — treat each as an explicit instruction to repaint or resurface, not as a diff from the current state:

1. Backsplash → apply to tile backsplash between upper cabinets and countertop on the walls; dimensions: 1x3 inch elongated hexagon picket tiles, pointed ends left and right, horizontal layout (use swatch image #1 for color/finish; reference photo #2 shows these tiles installed on a real backsplash — reproduce that tile shape and layout)

APPLY:
- Image mapping: after the base room photo, image #1 is the tile swatch (color/finish authority), image #2 is a reference photo showing the tile installed on a real backsplash (pattern/layout/shape authority).
- TILE SHAPE: Each tile is an elongated hexagon — a wide, short shape with pointed/angled ends on the left and right sides. NOT a rectangle, NOT a standard hexagon. The reference photo (#2) shows the exact shape.
- TILE SCALE: These are small tiles. On a typical 18-inch backsplash you should see many rows of these tiles, not just a few large ones. Use the reference photo (#2) for realistic scale.
- Match the COLOR from the swatch (#1) — taupe/warm grey, glossy finish.
- Match the SHAPE and LAYOUT from the reference photo (#2).
- Replace the ENTIRE backsplash tile surface with this tile pattern.

PRESERVE:
- Keep the exact camera angle, perspective, lighting, and room layout.
- Do NOT add, remove, or move any object.
- Keep exact counts of cabinets, drawer fronts, fixtures, and hardware.
- If an edit is difficult, under-edit the finish rather than changing layout or object position.
- Photorealistic result with accurate shadows and reflections.

SURFACE & PLACEMENT RULES:
- Replace the ENTIRE backsplash tile surface — match BOTH the tile pattern/size AND the color/finish from the swatch image.
- The swatch shows the actual tile format. Reproduce that tile shape and layout, not just the color.
- Do NOT preserve the existing tile pattern from the original photo. The swatch and reference are authoritative.`;

  fs.writeFileSync(path.join(OUTPUT_DIR, "picket_reference_prompt.txt"), prompt);
  console.log(`\nPrompt: ${prompt.length} chars`);

  // Build multimodal parts: room, swatch, reference, prompt
  const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [
    { inlineData: { mimeType: "image/webp", data: roomBuffer.toString("base64") } },
    { inlineData: { mimeType: "image/jpeg", data: swatchBuffer.toString("base64") } },
    { inlineData: { mimeType: "image/jpeg", data: refBuffer.toString("base64") } },
    { text: prompt },
  ];

  console.log(`Sending 3 images (room + swatch + reference) to ${MODEL}...`);

  const start = performance.now();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: "3:2",
        imageSize: "1K",
      },
    },
  });
  const durationMs = Math.round(performance.now() - start);

  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) throw new Error("No response parts from Gemini");

  for (const part of candidate.content.parts) {
    if ((part as any).inlineData) {
      const data = (part as any).inlineData.data;
      const outputPath = path.join(OUTPUT_DIR, "picket-taupe-v_WITH-REFERENCE.png");
      fs.writeFileSync(outputPath, Buffer.from(data, "base64"));
      console.log(`\nDone in ${(durationMs / 1000).toFixed(1)}s → ${outputPath}`);
      return;
    }
  }

  throw new Error("No image in Gemini response");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
