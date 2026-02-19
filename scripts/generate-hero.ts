/**
 * Generate the landing page hero image using real Kinkade options.
 *
 * Usage: npx tsx scripts/generate-hero.ts
 */

import { readFileSync, writeFileSync } from "fs";
import path from "path";

// Load .env.local manually (no dotenv dependency)
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = value;
}

import OpenAI, { toFile } from "openai";

const openai = new OpenAI();
const projectRoot = path.resolve(__dirname, "..");

// Base image
const heroPath = path.join(projectRoot, "public/home-hero-lg.png");
const heroBuffer = readFileSync(heroPath);

// Swatch images (ordered #1..#4)
const swatchFiles = [
  {
    path: "public/swatches/backsplash/BACKSPLASH---BAKER-BLVD-HERRINGBONE-MATTE-MOSAIC---GLACIER.jpg",
    label: "Backsplash: Baker Blvd Herringbone Matte Mosaic - Glacier",
  },
  {
    path: "public/swatches/countertops/COUNTER-TOP---QUARTZ---CALACATTA-VENICE.jpg",
    label: "Counter Top: Quartz - Calacatta Venice",
  },
  {
    path: "public/swatches/cabinets/bathroom-cabinet-hardware---dominique-all-pulls---brushed-gold.png",
    label: "Kitchen Cabinet Hardware: Dominique All Pulls - Brushed Gold",
  },
  {
    path: "public/swatches/cabinets/KITCHEN-CABINET-COLOR---ADMIRAL-BLUE-PAINT.png",
    label: "Kitchen Island Cabinet Color: Admiral Blue",
  },
];

const swatches = swatchFiles.map((s) => {
  const fullPath = path.join(projectRoot, s.path);
  return {
    label: s.label,
    buffer: readFileSync(fullPath),
    ext: path.extname(s.path).slice(1),
  };
});

const prompt = `SCENE: This photo shows a kitchen in a new-construction home. There is a large island in the foreground, wall cabinets and countertops along the back wall, and appliances. The floor is hardwood/LVP.

Edit this room photo. Change ONLY the color/texture of these surfaces — nothing else:

1. Backsplash: Baker Blvd Herringbone Matte Mosaic - Glacier (glacier white/light blue herringbone mosaic tile) → apply to tile backsplash between upper cabinets and countertop on the walls (use swatch #1)
2. Counter Top: Quartz - Calacatta Venice (Calacatta Venice quartz with subtle warm veining on white base) → apply to all countertop surfaces (island and perimeter) (use swatch #2)
3. Kitchen Cabinet Hardware: Dominique All Pulls - Brushed Gold (Dominique brushed gold bar pulls) → apply to cabinet knobs and pulls on all cabinets (use swatch #3)
4. Kitchen Island Cabinet Color: Admiral Blue (Admiral Blue paint) → apply to island base cabinets (large freestanding island in foreground) (use swatch #4)

RULES:
- Swatch mapping: after the base room photo, attached swatches are ordered #1..#4.
- For each item marked "(use swatch #N)", match that swatch's color, pattern, and texture EXACTLY on the specified surface.
- The "→ apply to" text tells you WHERE in the photo to apply each change. Treat each listed target as a separate mask; do NOT bleed one finish into another.
- Do NOT add, remove, or move any object. Keep exact counts of cabinets, drawer fronts, appliance doors, fixtures, and hardware.
- Do NOT invent new cabinet seams/panels, remove panel grooves, or simplify existing door geometry.
- Preserve all structural details: cabinet door panel style (shaker, beadboard, etc.), countertop edges, trim profiles.
- If an edit is difficult, under-edit the finish rather than changing layout, geometry, or object position.
- Keep the exact camera angle, perspective, lighting, and room layout.
- Photorealistic result with accurate shadows and reflections.

CRITICAL FIXED-GEOMETRY RULES:
- Apply island cabinet color ONLY to island base cabinets in the foreground. Do NOT apply it to perimeter/wall cabinets.
- Keep hardware count and placement identical. Do NOT add or remove pulls/knobs.`;

async function main() {
  console.log("Generating landing page hero image...");
  console.log(`Base image: ${heroPath}`);
  console.log(`Swatches: ${swatches.length}`);
  console.log();

  const start = Date.now();

  const inputImages = [
    await toFile(heroBuffer, "kitchen.png", { type: "image/png" }),
    ...(await Promise.all(
      swatches.map((s) =>
        toFile(s.buffer, `${s.label.replace(/[^a-zA-Z0-9]/g, "_")}.${s.ext}`, {
          type: s.ext === "jpg" ? "image/jpeg" : `image/${s.ext}`,
        })
      )
    )),
  ];

  const result = await openai.images.edit({
    model: "gpt-image-1.5",
    image: inputImages,
    prompt,
    quality: "high",
    size: "1536x1024",
    input_fidelity: "high",
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const imageData = result.data?.[0]?.b64_json;

  if (imageData) {
    const outPath = path.join(projectRoot, "public/home-hero-generated.png");
    writeFileSync(outPath, Buffer.from(imageData, "base64"));
    console.log(`Done in ${elapsed}s`);
    console.log(`Saved: ${outPath}`);
  } else {
    console.error(`Generation failed after ${elapsed}s`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
