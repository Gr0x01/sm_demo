/**
 * Test masked generation on perimeter cabinets with a dramatic color change.
 *
 * Usage: npx tsx scripts/texture-swap-poc/test-masked-cabinets.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const openai = new OpenAI();
const OUTPUT_DIR = path.join(__dirname, "output");
const SOURCE = path.join(OUTPUT_DIR, "source.png");

const TESTS = [
  {
    name: "navy-cabinets",
    mask: path.join(OUTPUT_DIR, "mask-gemini-perimeter-cabinets.png"),
    prompt: "Edit ONLY the transparent/masked area. Replace the cabinet color with deep navy blue painted shaker-style cabinets. Keep the exact same cabinet door style, hardware, and panel geometry. Keep everything outside the masked area completely unchanged. Photorealistic.",
  },
  {
    name: "dark-floor",
    mask: path.join(OUTPUT_DIR, "mask-gemini-floor.png"),
    prompt: "Edit ONLY the transparent/masked area. Replace the flooring with dark espresso stained wide-plank hardwood flooring with visible wood grain. Keep everything outside the masked area completely unchanged. Photorealistic with accurate reflections.",
  },
];

async function prepareAlphaMask(sourcePath: string, maskPath: string): Promise<Buffer> {
  const source = sharp(sourcePath);
  const { width: srcW, height: srcH } = await source.metadata();

  const maskResized = await sharp(maskPath)
    .resize(srcW!, srcH!)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const sourceBuffer = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = Buffer.from(sourceBuffer.data);

  for (let i = 0; i < maskResized.data.length; i++) {
    const maskValue = maskResized.data[i];
    rgba[i * 4 + 3] = 255 - maskValue;
  }

  return sharp(rgba, {
    raw: { width: srcW!, height: srcH!, channels: 4 }
  }).png().toBuffer();
}

async function main() {
  for (const test of TESTS) {
    console.log(`\n--- ${test.name} ---`);

    if (!fs.existsSync(test.mask)) {
      console.log(`  Mask not found: ${test.mask}`);
      continue;
    }

    console.log("  Preparing mask...");
    const maskedBuffer = await prepareAlphaMask(SOURCE, test.mask);

    const inputImages = [
      await toFile(maskedBuffer, "room.png", { type: "image/png" }),
    ];

    console.log("  Generating...");
    const start = performance.now();

    try {
      const result = await openai.images.edit({
        model: "gpt-image-1.5",
        image: inputImages,
        prompt: test.prompt,
        quality: "medium",
        size: "1536x1024",
      });

      const durationMs = Math.round(performance.now() - start);
      const b64 = result.data?.[0]?.b64_json;
      if (!b64) throw new Error("No image generated");

      const outputPath = path.join(OUTPUT_DIR, `masked-gen-${test.name}.png`);
      fs.writeFileSync(outputPath, Buffer.from(b64, "base64"));
      console.log(`  Done in ${(durationMs / 1000).toFixed(1)}s → ${outputPath}`);
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      console.error(`  Failed (${(durationMs / 1000).toFixed(1)}s):`, err);
    }
  }
}

main().catch(console.error);
