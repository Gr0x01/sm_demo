/**
 * Extract individual binary masks from the Gemini color-coded segmentation map.
 * Each color channel → one PNG mask (white = surface, black = not).
 *
 * Usage: npx tsx scripts/texture-swap-poc/extract-masks.ts
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.join(__dirname, "output");
const SEGMAP = path.join(OUTPUT_DIR, "segmap-3-pro.png");

// Must match the colors used in segment-gemini.ts
const SURFACES: { id: string; r: number; g: number; b: number; tolerance: number }[] = [
  { id: "perimeter-cabinets", r: 255, g: 0, b: 0, tolerance: 60 },
  { id: "island-cabinets", r: 0, g: 255, b: 0, tolerance: 60 },
  { id: "countertop", r: 0, g: 0, b: 255, tolerance: 60 },
  { id: "backsplash", r: 255, g: 255, b: 0, tolerance: 60 },
  { id: "floor", r: 255, g: 0, b: 255, tolerance: 60 },
  { id: "walls", r: 0, g: 255, b: 255, tolerance: 60 },
];

async function main() {
  if (!fs.existsSync(SEGMAP)) {
    console.error(`Segmentation map not found: ${SEGMAP}`);
    console.error("Run segment-gemini.ts first.");
    process.exit(1);
  }

  const { data, info } = await sharp(SEGMAP)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  console.log(`Segmap: ${width}x${height}, ${channels} channels\n`);

  for (const surface of SURFACES) {
    // Create binary mask: white where pixel matches target color, black elsewhere
    const mask = Buffer.alloc(width * height);
    let pixelCount = 0;

    for (let i = 0; i < width * height; i++) {
      const offset = i * channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];

      const dr = Math.abs(r - surface.r);
      const dg = Math.abs(g - surface.g);
      const db = Math.abs(b - surface.b);

      if (dr <= surface.tolerance && dg <= surface.tolerance && db <= surface.tolerance) {
        mask[i] = 255;
        pixelCount++;
      }
    }

    const coverage = ((pixelCount / (width * height)) * 100).toFixed(1);
    const outputPath = path.join(OUTPUT_DIR, `mask-gemini-${surface.id}.png`);

    await sharp(mask, { raw: { width, height, channels: 1 } })
      .png()
      .toFile(outputPath);

    console.log(`  ${surface.id.padEnd(22)} ${coverage}% coverage → ${outputPath}`);
  }

  console.log("\nDone. Masks ready for texture swap demo.");
}

main().catch(console.error);
