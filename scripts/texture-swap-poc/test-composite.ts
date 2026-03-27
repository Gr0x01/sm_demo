/**
 * Test compositing multiple per-surface masked generations together.
 * Takes the navy cabinets + dark floor results, layers them onto the original.
 *
 * For each generated image, we extract ONLY the masked surface pixels
 * and overlay them on the original photo.
 *
 * Usage: npx tsx scripts/texture-swap-poc/test-composite.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import sharp from "sharp";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.join(__dirname, "output");
const SOURCE = path.join(OUTPUT_DIR, "source.png");

// Each layer: a generated image + its mask
const LAYERS = [
  {
    name: "navy perimeter cabinets",
    generated: path.join(OUTPUT_DIR, "masked-gen-navy-cabinets.png"),
    mask: path.join(OUTPUT_DIR, "mask-gemini-perimeter-cabinets.png"),
  },
  {
    name: "dark espresso floor",
    generated: path.join(OUTPUT_DIR, "masked-gen-dark-floor.png"),
    mask: path.join(OUTPUT_DIR, "mask-gemini-floor.png"),
  },
];

async function main() {
  const { width, height } = await sharp(SOURCE).metadata();
  console.log(`Source: ${width}x${height}`);

  // Start with the original photo as base
  let composite = sharp(SOURCE).resize(width!, height!);
  const compositeBuffer = await composite.ensureAlpha().raw().toBuffer();
  const result = Buffer.from(compositeBuffer);

  for (const layer of LAYERS) {
    if (!fs.existsSync(layer.generated) || !fs.existsSync(layer.mask)) {
      console.log(`  Skipping ${layer.name} — missing files`);
      continue;
    }

    console.log(`  Applying: ${layer.name}`);

    // Load the generated image, resize to match source
    const genBuffer = await sharp(layer.generated)
      .resize(width!, height!)
      .ensureAlpha()
      .raw()
      .toBuffer();

    // Load the mask, resize to match source
    const maskBuffer = await sharp(layer.mask)
      .resize(width!, height!)
      .grayscale()
      .raw()
      .toBuffer();

    // For each pixel: if mask is white, take from generated image; else keep original
    for (let i = 0; i < maskBuffer.length; i++) {
      const maskValue = maskBuffer[i];
      if (maskValue > 128) {
        // Copy RGBA from generated layer
        result[i * 4] = genBuffer[i * 4];
        result[i * 4 + 1] = genBuffer[i * 4 + 1];
        result[i * 4 + 2] = genBuffer[i * 4 + 2];
        result[i * 4 + 3] = 255;
      }
    }
  }

  const outputPath = path.join(OUTPUT_DIR, "composite-result.png");
  await sharp(result, { raw: { width: width!, height: height!, channels: 4 } })
    .png()
    .toFile(outputPath);

  console.log(`\n  Composite saved: ${outputPath}`);
}

main().catch(console.error);
