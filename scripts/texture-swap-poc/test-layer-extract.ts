/**
 * Rashaad's approach: generate full room images per surface change,
 * then use Gemini masks to EXTRACT only the changed surface pixels.
 *
 * 1. Send original photo + swatch → "change only the cabinets to navy"
 *    (no mask input — let AI handle the full scene with consistent lighting)
 * 2. Use Gemini mask to cut out ONLY the cabinet pixels from the result
 * 3. Layer that cutout onto the original photo
 *
 * Each generation produces a coherent full image. Masks are post-processing only.
 *
 * Usage: npx tsx scripts/texture-swap-poc/test-layer-extract.ts
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
    mask: path.join(OUTPUT_DIR, "mask-gemini-perimeter-cabinets.png"),
    prompt: "Edit this kitchen photo. Change ONLY the perimeter wall cabinets (upper and lower along the back wall and side walls) to deep navy blue painted shaker-style cabinets. Keep the island cabinets the same gray color. Keep countertops, backsplash, flooring, walls, and all appliances exactly as they are. Same camera angle, lighting, and layout. Photorealistic.",
  },
  {
    name: "dark-floor",
    mask: path.join(OUTPUT_DIR, "mask-gemini-floor.png"),
    prompt: "Edit this kitchen photo. Change ONLY the flooring to dark espresso stained wide-plank hardwood. The planks should run the same direction as the existing floor (roughly parallel to the island, left to right). Keep cabinets, countertops, backsplash, walls, and all appliances exactly as they are. Same camera angle, lighting, and layout. Photorealistic with natural reflections on the dark wood.",
  },
];

async function generateFullImage(prompt: string): Promise<Buffer> {
  const sourceBuffer = fs.readFileSync(SOURCE);
  const inputImages = [
    await toFile(sourceBuffer, "room.png", { type: "image/png" }),
  ];

  const result = await openai.images.edit({
    model: "gpt-image-1.5",
    image: inputImages,
    prompt,
    quality: "medium",
    size: "1536x1024",
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image generated");
  return Buffer.from(b64, "base64");
}

async function extractAndComposite(
  baseImagePath: string,
  layers: { name: string; generatedBuffer: Buffer; maskPath: string }[],
): Promise<Buffer> {
  const { width, height } = await sharp(baseImagePath).metadata();

  // Start with the original as RGBA
  const baseRgba = await sharp(baseImagePath)
    .resize(width!, height!)
    .ensureAlpha()
    .raw()
    .toBuffer();

  const result = Buffer.from(baseRgba);

  for (const layer of layers) {
    // Resize generated image to match source
    const genRgba = await sharp(layer.generatedBuffer)
      .resize(width!, height!)
      .ensureAlpha()
      .raw()
      .toBuffer();

    // Load mask
    const maskGray = await sharp(layer.maskPath)
      .resize(width!, height!)
      .grayscale()
      .raw()
      .toBuffer();

    // Extract: where mask is white, take pixels from generated image
    let replaced = 0;
    for (let i = 0; i < maskGray.length; i++) {
      if (maskGray[i] > 128) {
        result[i * 4] = genRgba[i * 4];
        result[i * 4 + 1] = genRgba[i * 4 + 1];
        result[i * 4 + 2] = genRgba[i * 4 + 2];
        result[i * 4 + 3] = 255;
        replaced++;
      }
    }
    console.log(`  ${layer.name}: extracted ${((replaced / maskGray.length) * 100).toFixed(1)}% of pixels`);
  }

  return sharp(result, { raw: { width: width!, height: height!, channels: 4 } })
    .png()
    .toBuffer();
}

async function main() {
  const generatedLayers: { name: string; generatedBuffer: Buffer; maskPath: string }[] = [];

  // Step 1: Generate full room images (each one changes only one surface)
  for (const layer of LAYERS) {
    console.log(`\nGenerating: ${layer.name}...`);
    const start = performance.now();

    const buffer = await generateFullImage(layer.prompt);
    const durationMs = Math.round(performance.now() - start);

    // Save the full generation for reference
    const fullPath = path.join(OUTPUT_DIR, `full-gen-${layer.name}.png`);
    fs.writeFileSync(fullPath, buffer);
    console.log(`  Full image: ${(durationMs / 1000).toFixed(1)}s → ${fullPath}`);

    generatedLayers.push({
      name: layer.name,
      generatedBuffer: buffer,
      maskPath: layer.mask,
    });
  }

  // Step 2: Extract surfaces using masks and composite
  console.log("\nCompositing layers...");
  const compositeBuffer = await extractAndComposite(SOURCE, generatedLayers);

  const outputPath = path.join(OUTPUT_DIR, "layer-extract-result.png");
  fs.writeFileSync(outputPath, compositeBuffer);
  console.log(`\nFinal composite: ${outputPath}`);

  open(outputPath);
}

function open(filePath: string) {
  require("child_process").execSync(`open "${filePath}"`);
}

main().catch(console.error);
