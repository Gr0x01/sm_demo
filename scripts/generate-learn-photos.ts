#!/usr/bin/env npx tsx
/**
 * Generate marketing photos for /learn/new-construction-upgrades page.
 * Uses Gemini image generation (text-to-image, no editing).
 *
 * Usage:
 *   npx tsx scripts/generate-learn-photos.ts
 *   npx tsx scripts/generate-learn-photos.ts --photo 1   # generate only photo 1
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "fs";

const MODEL = "gemini-3-pro-image-preview";
const OUTPUT_DIR = path.join(__dirname, "..", "public", "learn");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const googleApiKey =
  process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!googleApiKey) {
  console.error("Missing GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: googleApiKey });

// ---------------------------------------------------------------------------
// Photo definitions
// ---------------------------------------------------------------------------
interface PhotoDef {
  id: number;
  filename: string;
  aspectRatio: string;
  prompt: string;
}

const ALL_PHOTOS: PhotoDef[] = [
  {
    id: 1,
    filename: "kitchen-greatroom.webp",
    aspectRatio: "16:9",
    prompt: `Professional real estate photography of an open-concept kitchen and living room in a new construction home. The kitchen has an island with a quartz countertop with subtle veining, white shaker cabinets, subway tile backsplash, brushed nickel hardware, pendant lights over the island, and engineered hardwood flooring in a warm medium-brown tone. The living room is visible in the background, slightly out of focus. Natural daylight streaming through windows, late morning warm light but not orange. The space is empty of people, food, and staging props — no fruit bowls, no wine glasses. Walls are white or very light warm gray. Modern 2020s new construction style, mid-to-upper upgrade package. Shot at standing eye-level from the edge of the great room looking toward the kitchen. No dramatic wide-angle distortion. No visible brand names on appliances. Photorealistic, not a 3D render.`,
  },
  {
    id: 2,
    filename: "bathroom-vanity.webp",
    aspectRatio: "16:9",
    prompt: `Professional real estate photography of a primary bathroom vanity zone in a new construction home. Double vanity with undermount rectangular sinks, quartz countertop, modern faucets in brushed nickel finish. Large frameless mirror. Clean, intentional large-format floor tile in a neutral warm tone. Wall paint is a light warm gray. Vanity sconces providing even, slightly cool bathroom lighting plus ambient daylight from a frosted window. No towels, toiletries, candles, or bath products visible. No toilet in frame. No shower or tub visible. No vessel sinks or waterfall faucets. No trendy penny tile or herringbone marble. No colored grout. 2020s new construction, upgraded finishes — not base-spec but not luxury. Straight-on or slightly angled view of the vanity, close enough to see material quality of the countertop and faucet finish. Floor tile visible in lower portion. Photorealistic, not a 3D render.`,
  },
  {
    id: 3,
    filename: "kitchen-detail.webp",
    aspectRatio: "3:4",
    prompt: `Professional editorial close-up photograph of a kitchen detail in a new construction home, showing the junction where cabinets, countertop, and backsplash meet. White shaker cabinet doors with visible panel detail and brushed nickel pull hardware. Quartz countertop with subtle veining, the surface texture and depth of the stone clearly visible. Subway tile or simple geometric tile backsplash. Warm intimate lighting, possibly from under-cabinet lights casting a glow on the countertop surface. Camera at counter height or slightly above, angled to show the backsplash-to-countertop-to-cabinet junction. Shallow depth of field with sharp focus on the countertop edge where it meets the backsplash. No full room visible. No appliances as hero element. No cutting boards, utensils, or food. Not an extreme macro shot. Not overhead or bird's eye angle. Warm lighting but not dark — materials must be clearly visible. 2020s new construction, upgraded finishes. Photorealistic, not a 3D render.`,
  },
  {
    id: 4,
    filename: "living-room-wide.webp",
    aspectRatio: "16:9",
    prompt: `Professional real estate photography of a modern living room in a new construction home. Wide shot showing the full room with upgraded finishes: engineered hardwood flooring in a warm medium-brown tone, white or very light warm gray walls, a stone or tile fireplace surround, recessed lighting in the ceiling, and large windows with natural daylight streaming in. The room should feel spacious, open, and inviting. No furniture, no staging props, no people, no decorations on walls. Just the empty room showing the quality of the finishes — the flooring grain, the wall paint finish, the fireplace stone texture, the window trim. 2020s new construction, mid-to-upper upgrade package. Camera at standing eye-level, capturing the full width of the room. Warm natural light, late morning. Not dark, not orange. Photorealistic, not a 3D render. No dramatic wide-angle distortion.`,
  },
];

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------
async function generatePhoto(photo: PhotoDef): Promise<void> {
  const outputPath = path.join(OUTPUT_DIR, photo.filename);
  console.log(`\n[${ photo.id}/3] Generating ${photo.filename} (${photo.aspectRatio})...`);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: photo.prompt }] }],
    config: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  });

  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) {
    throw new Error(`No response for photo ${photo.id}`);
  }

  for (const part of candidate.content.parts) {
    if ((part as any).inlineData) {
      const data = (part as any).inlineData.data;
      const rawBuffer = Buffer.from(data, "base64");

      // Convert to WebP for consistency
      const webpBuffer = await sharp(rawBuffer)
        .webp({ quality: 85 })
        .toBuffer();

      fs.writeFileSync(outputPath, webpBuffer);
      const metadata = await sharp(webpBuffer).metadata();
      console.log(
        `  Saved: ${outputPath} (${metadata.width}x${metadata.height}, ${(webpBuffer.length / 1024).toFixed(0)}KB)`
      );
      return;
    }
  }

  throw new Error(`No image data in response for photo ${photo.id}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Generate Learn Page Photos ===");
  console.log(`Model: ${MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  const args = process.argv.slice(2);
  const photoArg = args
    .find((a) => a.startsWith("--photo"))
    ?.split("=")[1] ??
    (args.indexOf("--photo") !== -1
      ? args[args.indexOf("--photo") + 1]
      : null);

  const photosToGenerate = photoArg
    ? ALL_PHOTOS.filter((p) => p.id === parseInt(photoArg))
    : ALL_PHOTOS;

  if (photosToGenerate.length === 0) {
    console.error(`No photo found with id ${photoArg}`);
    process.exit(1);
  }

  for (const photo of photosToGenerate) {
    try {
      await generatePhoto(photo);
    } catch (err: any) {
      console.error(`  FAILED: ${err.message}`);
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
