/**
 * Layered generation v2:
 * 1. Generate a full room image per surface change (no mask input)
 * 2. Use Gemini masks with feathered edges to extract surface pixels
 * 3. Composite onto original
 *
 * Usage: npx tsx scripts/texture-swap-poc/test-layered-v2.ts
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

const LAYERS = [
  {
    name: "navy-cabinets",
    mask: path.join(OUTPUT_DIR, "mask-solo-perimeter-cabinets.png"),
    prompt: "Edit this kitchen photo. Change ONLY the perimeter wall cabinets (upper and lower along the back wall and side walls) to deep navy blue painted shaker-style cabinets. Keep the island the same gray. Keep everything else exactly as-is. Same camera angle, lighting, layout. Photorealistic.",
  },
  {
    name: "dark-floor",
    mask: path.join(OUTPUT_DIR, "mask-solo-floor.png"),
    prompt: "Edit this kitchen photo. Change ONLY the flooring to dark espresso wide-plank hardwood with visible grain. Planks run left to right parallel to the island. Keep everything else exactly as-is. Same camera angle, lighting, layout. Photorealistic.",
  },
  {
    name: "green-island",
    mask: path.join(OUTPUT_DIR, "mask-solo-island-cabinets.png"),
    prompt: "Edit this kitchen photo. Change ONLY the island cabinet base and sides to a dark forest green painted finish. Keep perimeter cabinets the same gray. Keep everything else exactly as-is. Same camera angle, lighting, layout. Photorealistic.",
  },
];

async function generateFullImage(prompt: string): Promise<Buffer> {
  const sourceBuffer = fs.readFileSync(SOURCE);
  const input = [await toFile(sourceBuffer, "room.png", { type: "image/png" })];
  const result = await openai.images.edit({
    model: "gpt-image-1.5",
    image: input,
    prompt,
    quality: "medium",
    size: "1536x1024",
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image generated");
  return Buffer.from(b64, "base64");
}

async function composite(
  basePath: string,
  layers: { name: string; buffer: Buffer; maskPath: string }[],
  featherRadius: number = 3,
): Promise<Buffer> {
  const { width, height } = await sharp(basePath).metadata();
  const w = width!, h = height!;

  const baseRgba = await sharp(basePath).resize(w, h).ensureAlpha().raw().toBuffer();
  const result = Buffer.from(baseRgba);

  for (const layer of layers) {
    const genRgba = await sharp(layer.buffer).resize(w, h).ensureAlpha().raw().toBuffer();

    // Load mask and apply gaussian blur for feathered edges
    const maskFeathered = await sharp(layer.maskPath)
      .resize(w, h)
      .grayscale()
      .blur(featherRadius > 0 ? featherRadius : 0.3)
      .raw()
      .toBuffer();

    for (let i = 0; i < maskFeathered.length; i++) {
      const alpha = maskFeathered[i] / 255; // 0-1 blend factor
      if (alpha < 0.01) continue;

      result[i * 4]     = Math.round(result[i * 4]     * (1 - alpha) + genRgba[i * 4]     * alpha);
      result[i * 4 + 1] = Math.round(result[i * 4 + 1] * (1 - alpha) + genRgba[i * 4 + 1] * alpha);
      result[i * 4 + 2] = Math.round(result[i * 4 + 2] * (1 - alpha) + genRgba[i * 4 + 2] * alpha);
      result[i * 4 + 3] = 255;
    }

    console.log(`  Applied: ${layer.name}`);
  }

  return sharp(result, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

async function main() {
  const generated: { name: string; buffer: Buffer; maskPath: string }[] = [];

  for (const layer of LAYERS) {
    console.log(`Generating: ${layer.name}...`);
    const start = performance.now();
    const buffer = await generateFullImage(layer.prompt);
    const ms = Math.round(performance.now() - start);

    fs.writeFileSync(path.join(OUTPUT_DIR, `layered-full-${layer.name}.png`), buffer);
    console.log(`  ${(ms / 1000).toFixed(1)}s`);

    generated.push({ name: layer.name, buffer, maskPath: layer.mask });
  }

  console.log("\nCompositing with feathered masks...");
  const result = await composite(SOURCE, generated, 5);

  const out = path.join(OUTPUT_DIR, "layered-v2-result.png");
  fs.writeFileSync(out, result);
  console.log(`Done → ${out}`);

  require("child_process").execSync(`open "${out}"`);
}

main().catch(console.error);
