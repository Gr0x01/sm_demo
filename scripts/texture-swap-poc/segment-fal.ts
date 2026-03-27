/**
 * 2.5D Texture Swap PoC — Segmentation via fal.ai SAM2
 *
 * Uses box prompts to segment each kitchen surface.
 * Image is 3000x1995.
 *
 * Usage: npx tsx scripts/texture-swap-poc/segment-fal.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import { fal } from "@fal-ai/client";
import fs from "fs";
import path from "path";

fal.config({ credentials: process.env.FAL_KEY! });

const OUTPUT_DIR = path.join(__dirname, "output");
const SOURCE_IMAGE = path.join(OUTPUT_DIR, "source.png");

// Image dimensions: 3000x1995
// Box prompts for each surface in the kitchen photo.
// These are rough bounding boxes — SAM2 will refine to precise edges.
const SURFACES = [
  {
    id: "perimeter-cabinets",
    // Single box covering all perimeter cabinets, points to include/exclude
    boxes: [
      { x_min: 100, y_min: 200, x_max: 2350, y_max: 1350 },
    ],
    points: [
      { x: 1100, y: 500, label: 1 },   // upper left cab
      { x: 1700, y: 500, label: 1 },   // upper right cab
      { x: 1100, y: 1000, label: 1 },  // lower left cab
      { x: 2000, y: 1000, label: 1 },  // lower right cab
      { x: 350, y: 700, label: 1 },    // left wall cab
      { x: 1500, y: 800, label: 0 },   // NOT: range hood
      { x: 1500, y: 1150, label: 0 },  // NOT: countertop
    ],
  },
  {
    id: "island",
    // Island cabinet base (center foreground)
    boxes: [
      { x_min: 600, y_min: 900, x_max: 2100, y_max: 1550 },
    ],
    points: [
      { x: 1350, y: 1350, label: 1 },  // island front face
      { x: 900, y: 1250, label: 1 },   // island left side
      { x: 1350, y: 1050, label: 0 },  // NOT: countertop (background)
      { x: 1000, y: 1400, label: 0 },  // NOT: bar stool (background)
    ],
  },
  {
    id: "countertop",
    // Single box covering both countertops
    boxes: [
      { x_min: 550, y_min: 850, x_max: 2400, y_max: 1200 },
    ],
    points: [
      { x: 1300, y: 950, label: 1 },   // island countertop
      { x: 1800, y: 1100, label: 1 },  // back counter
      { x: 1300, y: 1300, label: 0 },  // NOT: island cabinet
      { x: 1500, y: 900, label: 0 },   // NOT: backsplash
    ],
  },
  {
    id: "backsplash",
    // Subway tile between upper cabs and counter on back wall
    boxes: [
      { x_min: 1000, y_min: 750, x_max: 2350, y_max: 1050 },
    ],
    points: [
      { x: 1200, y: 900, label: 1 },   // backsplash tile
      { x: 1800, y: 900, label: 1 },   // backsplash right side
      { x: 1500, y: 700, label: 0 },   // NOT: upper cabinet (background)
      { x: 1500, y: 1100, label: 0 },  // NOT: countertop (background)
    ],
  },
  {
    id: "floor",
    // LVP flooring across the bottom portion
    boxes: [
      { x_min: 0, y_min: 1300, x_max: 3000, y_max: 1995 },
    ],
    points: [
      { x: 500, y: 1700, label: 1 },   // floor left
      { x: 1500, y: 1800, label: 1 },  // floor center
      { x: 2500, y: 1600, label: 1 },  // floor right
      { x: 1000, y: 1400, label: 0 },  // NOT: bar stool (background)
    ],
  },
  {
    id: "walls",
    // Single box covering visible walls, points to include/exclude
    boxes: [
      { x_min: 0, y_min: 0, x_max: 3000, y_max: 1300 },
    ],
    points: [
      { x: 100, y: 500, label: 1 },    // left wall
      { x: 2700, y: 500, label: 1 },   // right wall
      { x: 200, y: 200, label: 1 },    // upper left wall
      { x: 1500, y: 500, label: 0 },   // NOT: cabinets
      { x: 1500, y: 100, label: 0 },   // NOT: ceiling
      { x: 350, y: 700, label: 0 },    // NOT: cabinet
    ],
  },
];

async function uploadImage(imagePath: string): Promise<string> {
  const buffer = fs.readFileSync(imagePath);
  const blob = new Blob([buffer], { type: "image/png" });
  return await fal.storage.upload(new File([blob], "kitchen.png", { type: "image/png" }));
}

async function segmentSurface(
  imageUrl: string,
  surface: typeof SURFACES[number],
): Promise<string | null> {
  console.log(`Segmenting: ${surface.id}...`);
  const start = performance.now();

  try {
    // SAM2 can take box_prompts and point prompts together
    const result = await fal.subscribe("fal-ai/sam2/image", {
      input: {
        image_url: imageUrl,
        box_prompts: surface.boxes,
        prompts: surface.points,
        output_format: "png",
      },
    }) as any;

    const durationMs = Math.round(performance.now() - start);
    const imageData = result?.data?.image || result?.image;

    if (!imageData?.url) {
      console.log(`  No mask returned. Response:`, JSON.stringify(result).slice(0, 300));
      return null;
    }

    // Download mask
    const res = await fetch(imageData.url);
    const outputBuffer = Buffer.from(await res.arrayBuffer());
    const outputPath = path.join(OUTPUT_DIR, `mask-${surface.id}.png`);
    fs.writeFileSync(outputPath, outputBuffer);

    console.log(`  Done in ${(durationMs / 1000).toFixed(1)}s → ${outputPath}`);
    return outputPath;
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    console.error(`  Failed (${(durationMs / 1000).toFixed(1)}s):`, String(err).slice(0, 200));
    return null;
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  if (!fs.existsSync(SOURCE_IMAGE)) {
    // Copy from flux test output
    const fallback = path.join(__dirname, "../../.flux-test-output/hero-original.png");
    if (fs.existsSync(fallback)) {
      fs.copyFileSync(fallback, SOURCE_IMAGE);
    } else {
      console.error("No source image found. Run the FLUX test first or place an image at output/source.png");
      process.exit(1);
    }
  }

  console.log("Uploading image to fal.ai...");
  const imageUrl = await uploadImage(SOURCE_IMAGE);
  console.log(`  Uploaded: ${imageUrl.slice(0, 60)}...\n`);

  const masks: { id: string; path: string | null }[] = [];

  for (const surface of SURFACES) {
    const maskPath = await segmentSurface(imageUrl, surface);
    masks.push({ id: surface.id, path: maskPath });
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log("SEGMENTATION COMPLETE");
  console.log("=".repeat(50));
  for (const m of masks) {
    console.log(`  ${m.id.padEnd(22)} ${m.path ? "OK" : "FAILED"}`);
  }
  console.log(`\n  Output: ${OUTPUT_DIR}/`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
