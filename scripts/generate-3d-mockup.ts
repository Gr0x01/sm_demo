#!/usr/bin/env npx tsx
/**
 * Generate a "3D configurator render" mockup for /vs/eci-insearch page.
 * Should look like a typical builder 3D visualization tool output —
 * same kitchen scene as home-hero-generated.png but obviously synthetic.
 *
 * Usage:
 *   npx tsx scripts/generate-3d-mockup.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import fs from "fs";

const MODEL = "gemini-3-pro-image-preview";
const OUTPUT_DIR = path.join(__dirname, "..", "public", "vs");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const googleApiKey =
  process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!googleApiKey) {
  console.error("Missing GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: googleApiKey });

const PROMPT = `A 3D rendered kitchen visualization from a home builder's design center software configurator. This should look like a typical pre-rendered 3D scene — NOT photorealistic. It should be obviously computer-generated with that uncanny-valley CG look common in builder configurator tools.

The kitchen layout should match this description closely:
- L-shaped white shaker cabinets along the back and right walls
- A large center island with navy blue / dark blue cabinet faces
- Light marble or quartz countertops on both the island and perimeter
- Herringbone pattern tile backsplash in light gray/blue
- Gold/brass cabinet hardware and faucet
- Two glass pendant lights hanging over the island
- Stainless steel appliances (fridge on left, range/hood on back wall)
- Medium-tone wood or wood-look flooring
- Light gray walls, white ceiling with recessed lights
- A window on the left wall

Make it look like output from a 3D home configurator tool — slightly flat lighting, overly clean surfaces, perfect geometry, no imperfections. The materials should look slightly plastic or synthetic. The lighting should be even and artificial-looking, like a 3D rendering engine with basic global illumination. Think SketchUp or Revit visualization quality, not Unreal Engine.

No people, no food, no decorative items. Empty countertops. Camera angle from the great room looking at the island and back wall, roughly eye-level.`;

async function generate() {
  console.log("Generating 3D mockup kitchen...");

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: PROMPT }] }],
    config: {
      responseModalities: ["image", "text"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith("image/")) {
      const buf = Buffer.from(part.inlineData.data!, "base64");
      const outPath = path.join(OUTPUT_DIR, "3d-kitchen-render.webp");

      await sharp(buf)
        .resize({ width: 1200, height: 900, fit: "cover" })
        .webp({ quality: 82 })
        .toFile(outPath);

      console.log(`Saved: ${outPath}`);
      const stats = fs.statSync(outPath);
      console.log(`Size: ${(stats.size / 1024).toFixed(0)} KB`);
      return;
    }
  }

  // If we got text back instead
  for (const part of parts) {
    if (part.text) console.log("Model response:", part.text);
  }
  console.error("No image generated");
  process.exit(1);
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
