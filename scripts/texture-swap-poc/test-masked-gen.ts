/**
 * Test per-surface masked generation.
 * Send original photo + mask + single swatch to gpt-image-1.5,
 * ask it to change ONLY the masked surface.
 *
 * Usage: npx tsx scripts/texture-swap-poc/test-masked-gen.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const openai = new OpenAI();
const OUTPUT_DIR = path.join(__dirname, "output");

// Test: change the floor using the Gemini mask
const SOURCE = path.join(OUTPUT_DIR, "source.png");
const FLOOR_MASK = path.join(OUTPUT_DIR, "mask-gemini-floor.png");

// We'll use a dark walnut color as the target
// In production this would be an actual swatch image
const TARGET_DESCRIPTION = "dark walnut hardwood flooring with visible wood grain";

async function prepareAlphaMask(sourcePath: string, maskPath: string): Promise<Buffer> {
  // OpenAI images.edit accepts a mask where transparent areas = where to edit.
  // Our mask is white = surface, black = not surface.
  // We need: transparent where white (edit the floor), opaque where black (keep everything else).

  const source = sharp(sourcePath);
  const { width: srcW, height: srcH } = await source.metadata();

  // Resize mask to match source dimensions
  const maskResized = await sharp(maskPath)
    .resize(srcW!, srcH!)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Create RGBA buffer from source with alpha channel from inverted mask
  const sourceBuffer = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = Buffer.from(sourceBuffer.data);

  // Set alpha: where mask is white (surface) → transparent (edit here)
  // Where mask is black (not surface) → opaque (keep this)
  for (let i = 0; i < maskResized.data.length; i++) {
    const maskValue = maskResized.data[i];
    // Invert: white mask (255) → alpha 0 (transparent/editable)
    rgba[i * 4 + 3] = 255 - maskValue;
  }

  return sharp(rgba, {
    raw: { width: srcW!, height: srcH!, channels: 4 }
  }).png().toBuffer();
}

async function main() {
  if (!fs.existsSync(SOURCE) || !fs.existsSync(FLOOR_MASK)) {
    console.error("Missing source.png or mask-gemini-floor.png in output/");
    process.exit(1);
  }

  console.log("Preparing masked image...");
  const maskedBuffer = await prepareAlphaMask(SOURCE, FLOOR_MASK);
  fs.writeFileSync(path.join(OUTPUT_DIR, "debug-masked-floor.png"), maskedBuffer);
  console.log("  Saved debug mask to output/debug-masked-floor.png");

  // Also load a swatch if available
  const swatchPath = path.join(__dirname, "../../.flux-test-output/swatch-5-Main_Area_Flooring_Color.jpeg");
  const hasSwatch = fs.existsSync(swatchPath);

  const inputImages = [
    await toFile(maskedBuffer, "room-with-mask.png", { type: "image/png" }),
  ];

  if (hasSwatch) {
    const swatchBuffer = fs.readFileSync(swatchPath);
    inputImages.push(await toFile(swatchBuffer, "swatch-flooring.jpeg", { type: "image/jpeg" }));
    console.log("  Including flooring swatch image");
  }

  const prompt = hasSwatch
    ? `Edit ONLY the transparent/masked area of this image. Replace the flooring in the masked area with the material shown in the swatch image. Match the swatch's color, wood grain pattern, and texture exactly. Keep everything outside the masked area completely unchanged. Photorealistic result with accurate shadows and reflections on the new flooring.`
    : `Edit ONLY the transparent/masked area of this image. Replace the flooring with ${TARGET_DESCRIPTION}. Keep everything outside the masked area completely unchanged. Photorealistic result.`;

  console.log(`\nSending to gpt-image-1.5 (${inputImages.length} images)...`);
  const start = performance.now();

  try {
    const result = await openai.images.edit({
      model: "gpt-image-1.5",
      image: inputImages,
      prompt,
      quality: "medium",
      size: "1536x1024",
    });

    const durationMs = Math.round(performance.now() - start);
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image generated");

    const outputPath = path.join(OUTPUT_DIR, "masked-gen-floor.png");
    fs.writeFileSync(outputPath, Buffer.from(b64, "base64"));

    console.log(`  Done in ${(durationMs / 1000).toFixed(1)}s → ${outputPath}`);
    console.log(`  Open: ${outputPath}`);
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    console.error(`  Failed (${(durationMs / 1000).toFixed(1)}s):`, err);
  }
}

main().catch(console.error);
