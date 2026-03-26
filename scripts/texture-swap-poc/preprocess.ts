/**
 * 2.5D Texture Swap PoC — Step 1: Preprocess a kitchen photo
 *
 * Runs Depth Anything V2 + Grounded SAM on a room photo to extract:
 *   1. Depth map (PNG)
 *   2. Per-surface segmentation masks (PNG per surface)
 *
 * Usage:
 *   npx tsx scripts/texture-swap-poc/preprocess.ts
 *   npx tsx scripts/texture-swap-poc/preprocess.ts --image path/to/photo.png
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import Replicate from "replicate";
import fs from "fs";
import path from "path";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const OUTPUT_DIR = path.join(__dirname, "output");
const DEFAULT_IMAGE = path.join(__dirname, "../../.flux-test-output/hero-original.png");

// Surfaces to segment — matched to the actual generation prompt surfaces.
// Each gets its own Grounded SAM run. Prompts should be specific enough
// to isolate the surface without bleeding into adjacent areas.
// Grounding DINO works best with short noun phrases — not sentences.
const SURFACES = [
  { id: "cabinets", prompt: "kitchen cabinets" },
  { id: "island", prompt: "kitchen island" },
  { id: "countertop", prompt: "countertop" },
  { id: "backsplash", prompt: "backsplash" },
  { id: "floor", prompt: "floor" },
  { id: "walls", prompt: "wall" },
];

async function imageToDataUri(imagePath: string): Promise<string> {
  const buffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function uploadToReplicate(imagePath: string): Promise<string> {
  const buffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;

  // Use Replicate's file upload API
  const res = await fetch("https://api.replicate.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
    },
    body: (() => {
      const form = new FormData();
      form.append("content", new Blob([buffer], { type: mime }), `image.${ext}`);
      return form;
    })(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload failed (${res.status}): ${body}`);
  }

  const data = await res.json() as any;
  return data.urls.get;
}

async function downloadToFile(url: string, outputPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

// ---------------------------------------------------------------------------
// Depth Estimation
// ---------------------------------------------------------------------------

async function runDepthEstimation(imageUrl: string): Promise<string> {
  console.log("Running Depth Anything V2...");
  const start = performance.now();

  const output = await replicate.run("chenxwh/depth-anything-v2:b239ea33cff32bb7abb5db39ffe9a09c14cbc2894331d1ef66fe096eed88ebd4", {
    input: {
      image: imageUrl,
      encoder: "vitl",
    },
  }) as any;

  const durationMs = Math.round(performance.now() - start);

  // Output format: { color_depth: FileOutput, grey_depth: FileOutput }
  // FileOutput has a .url() method or is directly a URL string
  let depthUrl: string;
  if (typeof output === "string") {
    depthUrl = output;
  } else if (output?.grey_depth) {
    // Prefer grey depth (single channel, better for 3D reconstruction)
    const gd = output.grey_depth;
    depthUrl = typeof gd === "string" ? gd : gd?.url?.() || gd?.url || String(gd);
  } else if (output?.color_depth) {
    const cd = output.color_depth;
    depthUrl = typeof cd === "string" ? cd : cd?.url?.() || cd?.url || String(cd);
  } else {
    console.log("Depth output:", JSON.stringify(output).slice(0, 500));
    throw new Error("Unexpected depth estimation output format");
  }

  const outputPath = path.join(OUTPUT_DIR, "depth-map.png");
  await downloadToFile(depthUrl, outputPath);

  // Also save color depth if available
  if (output?.color_depth) {
    const cd = output.color_depth;
    const colorUrl = typeof cd === "string" ? cd : cd?.url?.() || cd?.url || String(cd);
    try {
      await downloadToFile(colorUrl, path.join(OUTPUT_DIR, "depth-map-color.png"));
    } catch {}
  }

  console.log(`  Done in ${(durationMs / 1000).toFixed(1)}s → ${outputPath}`);
  return outputPath;
}

// ---------------------------------------------------------------------------
// Surface Segmentation
// ---------------------------------------------------------------------------

async function runSegmentation(
  imageUrl: string,
  surface: { id: string; prompt: string },
): Promise<string | null> {
  console.log(`Segmenting: "${surface.prompt}"...`);
  const start = performance.now();

  try {
    const output = await replicate.run("schananas/grounded_sam:ee871c19efb1941f55f66a3d7d960428c8a5afcb77449547fe8e5a3ab9ebc21c", {
      input: {
        image: imageUrl,
        mask_prompt: surface.prompt,
        adjustment_factor: 0,
      },
    }) as any;

    const durationMs = Math.round(performance.now() - start);

    // Output can be various formats — look for mask/output image
    let maskUrl: string | null = null;

    if (typeof output === "string") {
      maskUrl = output;
    } else if (Array.isArray(output)) {
      // Some versions return [combined_image, mask, ...]
      // We want the mask (usually index 1 or the last item)
      maskUrl = output.length > 1 ? output[1] : output[0];
    } else if (output?.mask) {
      maskUrl = output.mask;
    } else if (output?.output_image) {
      maskUrl = output.output_image;
    }

    if (!maskUrl) {
      console.log(`  Output format:`, JSON.stringify(output).slice(0, 300));
      console.log(`  Could not extract mask URL — skipping ${surface.id}`);
      return null;
    }

    const outputPath = path.join(OUTPUT_DIR, `mask-${surface.id}.png`);
    await downloadToFile(maskUrl as string, outputPath);

    console.log(`  Done in ${(durationMs / 1000).toFixed(1)}s → ${outputPath}`);
    return outputPath;
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    console.error(`  Failed (${(durationMs / 1000).toFixed(1)}s): ${err}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const imageIdx = args.indexOf("--image");
  const imagePath = imageIdx !== -1 ? args[imageIdx + 1] : DEFAULT_IMAGE;

  if (!fs.existsSync(imagePath)) {
    console.error(`Image not found: ${imagePath}`);
    console.error("Run the FLUX test first to get a kitchen photo, or provide --image path/to/photo.png");
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Copy source image to output for reference
  fs.copyFileSync(imagePath, path.join(OUTPUT_DIR, "source.png"));

  console.log(`\nSource: ${imagePath} (${(fs.statSync(imagePath).size / 1024).toFixed(0)}KB)`);
  console.log("Uploading image to Replicate...");
  const imageUrl = await uploadToReplicate(imagePath);
  console.log(`  Uploaded: ${imageUrl.slice(0, 60)}...\n`);

  // Run depth estimation
  const depthPath = await runDepthEstimation(imageUrl);

  // Run segmentation for each surface
  console.log(`\nSegmenting ${SURFACES.length} surfaces...\n`);
  const masks: { id: string; prompt: string; path: string | null }[] = [];

  for (let i = 0; i < SURFACES.length; i++) {
    if (i > 0) {
      console.log("  (waiting 10s for rate limit...)\n");
      await new Promise((r) => setTimeout(r, 10_000));
    }
    const maskPath = await runSegmentation(imageUrl, SURFACES[i]);
    masks.push({ ...SURFACES[i], path: maskPath });
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("PREPROCESSING COMPLETE");
  console.log("=".repeat(60));
  console.log(`  Depth map: ${depthPath}`);
  console.log(`  Masks:`);
  for (const m of masks) {
    const status = m.path ? "OK" : "FAILED";
    console.log(`    ${m.id.padEnd(20)} ${status.padEnd(8)} "${m.prompt}"`);
  }
  console.log(`\n  Output: ${OUTPUT_DIR}/`);
  console.log(`  Next: open the images to check mask quality`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
