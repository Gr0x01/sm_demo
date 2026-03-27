/**
 * Generate one mask per surface via individual Gemini passes.
 * Each pass focuses on ONLY one surface → cleaner boundaries.
 *
 * Usage: npx tsx scripts/texture-swap-poc/segment-per-surface.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });

const OUTPUT_DIR = path.join(__dirname, "output");
const SOURCE = path.join(OUTPUT_DIR, "source.png");
const MODEL = "gemini-3-pro-image-preview";

// Each prompt asks for a segmentation mask — the target surface is pure #FF0000 red,
// EVERYTHING else is pure #000000 black. Using red instead of white because the model
// tends to interpret "white" as "brighten" rather than "solid fill."
// We convert red → white in post-processing.
const MASK_COLOR = "bright red (#FF0000)";

const SURFACES = [
  {
    id: "perimeter-cabinets",
    prompt: `You are a segmentation tool. Create a binary mask image. Paint the perimeter kitchen cabinets (all upper wall cabinets and lower base cabinets along the back wall and side walls, NOT the island) with solid flat ${MASK_COLOR}. Paint absolutely everything else solid black (#000000) — island, countertops, backsplash, floor, walls, ceiling, appliances, stools, fixtures, doors. The result must look like a flat graphic with only two colors: red and black. No photography, no realism, no gradients, no lighting, no texture. Just a red silhouette of the perimeter cabinets on a black background.`,
  },
  {
    id: "island-cabinets",
    prompt: `You are a segmentation tool. Create a binary mask image. Paint ONLY the kitchen island cabinet body (base, sides, and front face, NOT the countertop on top) with solid flat ${MASK_COLOR}. Paint absolutely everything else solid black (#000000). The result must look like a flat graphic with only two colors: red and black. No photography, no realism, no gradients, no lighting, no texture. Just a red silhouette of the island cabinet on a black background.`,
  },
  {
    id: "countertop",
    prompt: `You are a segmentation tool. Create a binary mask image. Paint ONLY the countertop surfaces (island countertop slab AND perimeter countertop along the back wall) with solid flat ${MASK_COLOR}. Paint absolutely everything else solid black (#000000). The result must look like a flat graphic with only two colors: red and black. No photography, no realism, no gradients, no lighting, no texture. Just red silhouettes of countertop surfaces on a black background.`,
  },
  {
    id: "backsplash",
    prompt: `You are a segmentation tool. Create a binary mask image. Paint ONLY the backsplash area (the wall between upper cabinets and countertop on the back wall) with solid flat ${MASK_COLOR}. Paint absolutely everything else solid black (#000000). The result must look like a flat graphic with only two colors: red and black. No photography, no realism, no gradients, no lighting, no texture. Just a red silhouette of the backsplash on a black background.`,
  },
  {
    id: "floor",
    prompt: `You are a segmentation tool. Create a binary mask image. Paint ONLY the visible floor area with solid flat ${MASK_COLOR}. Paint absolutely everything else solid black (#000000) — cabinets, island, countertops, walls, ceiling, bar stools, appliances. Include floor visible between and behind bar stool legs. The result must look like a flat graphic with only two colors: red and black. No photography, no realism, no gradients, no lighting, no texture. Just a red silhouette of the floor on a black background.`,
  },
  {
    id: "walls",
    prompt: `You are a segmentation tool. Create a binary mask image. Paint ONLY the painted wall surfaces (NOT ceiling, NOT cabinets, NOT doors, NOT windows) with solid flat ${MASK_COLOR}. Paint absolutely everything else solid black (#000000). The result must look like a flat graphic with only two colors: red and black. No photography, no realism, no gradients, no lighting, no texture. Just red silhouettes of wall surfaces on a black background.`,
  },
];

async function main() {
  const imageBuffer = fs.readFileSync(SOURCE);
  const base64Image = imageBuffer.toString("base64");

  for (const surface of SURFACES) {
    console.log(`Generating mask: ${surface.id}...`);
    const start = performance.now();

    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "image/png", data: base64Image } },
              { text: surface.prompt },
            ],
          },
        ],
        config: {
          responseModalities: ["image", "text"],
        },
      });

      const durationMs = Math.round(performance.now() - start);
      const parts = response.candidates?.[0]?.content?.parts || [];
      let saved = false;

      for (const part of parts) {
        if (part.inlineData?.data) {
          const rawBuffer = Buffer.from(part.inlineData.data, "base64");

          // Extract red channel as the mask (red = surface, black = not)
          // Threshold: if red channel > 100 and dominant → white, else black
          const { data, info } = await sharp(rawBuffer).raw().toBuffer({ resolveWithObject: true });
          const { width, height, channels } = info;
          const mask = Buffer.alloc(width * height);

          for (let i = 0; i < width * height; i++) {
            const r = data[i * channels];
            const g = data[i * channels + 1];
            const b = data[i * channels + 2];
            // Red-dominant pixel = surface
            mask[i] = (r > 100 && r > g * 1.5 && r > b * 1.5) ? 255 : 0;
          }

          const maskPng = await sharp(mask, { raw: { width, height, channels: 1 } }).png().toBuffer();
          const outputPath = path.join(OUTPUT_DIR, `mask-solo-${surface.id}.png`);
          fs.writeFileSync(outputPath, maskPng);

          // Also save raw output for debugging
          fs.writeFileSync(path.join(OUTPUT_DIR, `mask-solo-${surface.id}-raw.png`), rawBuffer);

          console.log(`  ${(durationMs / 1000).toFixed(1)}s → ${outputPath}`);
          saved = true;
        }
      }

      if (!saved) {
        console.log(`  ${(durationMs / 1000).toFixed(1)}s — no image returned`);
      }
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      console.error(`  ${(durationMs / 1000).toFixed(1)}s — error: ${String(err).slice(0, 150)}`);
    }
  }

  console.log("\nDone. Individual masks in output/mask-solo-*.png");
}

main().catch(console.error);
