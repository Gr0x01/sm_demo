/**
 * Use Gemini Flash to generate a color-coded segmentation map.
 * The model understands room layout — just ask it to paint each surface a flat color.
 *
 * Usage: npx tsx scripts/texture-swap-poc/segment-gemini.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });

const OUTPUT_DIR = path.join(__dirname, "output");
const SOURCE_IMAGE = path.join(OUTPUT_DIR, "source.png");

const COLOR_MAP = {
  "perimeter cabinets (upper and lower along walls)": "#FF0000",
  "island cabinet base and sides": "#00FF00",
  "all countertop surfaces (island and perimeter)": "#0000FF",
  "backsplash tile between upper cabinets and countertop": "#FFFF00",
  "floor (all visible flooring)": "#FF00FF",
  "walls (painted surfaces, not ceiling)": "#00FFFF",
};

async function main() {
  if (!fs.existsSync(SOURCE_IMAGE)) {
    const fallback = path.join(__dirname, "../../.flux-test-output/hero-original.png");
    if (fs.existsSync(fallback)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      fs.copyFileSync(fallback, SOURCE_IMAGE);
    } else {
      console.error("No source image found.");
      process.exit(1);
    }
  }

  const imageBuffer = fs.readFileSync(SOURCE_IMAGE);
  const base64Image = imageBuffer.toString("base64");

  const colorInstructions = Object.entries(COLOR_MAP)
    .map(([surface, color]) => `- ${surface}: solid ${color}`)
    .join("\n");

  const prompt = `You are a room segmentation tool. Edit this kitchen photo by replacing each surface with a SOLID FLAT COLOR. No gradients, no textures, no shading — just pure flat color fills with clean edges.

Color each surface exactly as specified:
${colorInstructions}

RULES:
- Fill each surface with the EXACT hex color specified — pure solid, no variation
- Edges between surfaces must be crisp and precise
- Appliances (fridge, oven, microwave, range hood, dishwasher) should be painted BLACK (#000000)
- Bar stools and furniture should be painted BLACK (#000000)
- Ceiling should be painted BLACK (#000000)
- Door/window frames should be painted BLACK (#000000)
- Everything not listed above should be BLACK (#000000)
- The result should look like a flat color-coded map, NOT a photograph`;

  const MODELS = [
    "gemini-3-pro-image-preview",
    "gemini-3.1-flash-image-preview",
    "gemini-3.1-pro-preview",
  ];

  for (const modelName of MODELS) {
    const shortName = modelName.replace("gemini-", "").replace("-preview", "").replace("-image", "");
    console.log(`\n--- ${modelName} ---`);
    const start = performance.now();

    try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Image,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseModalities: ["image", "text"],
      },
    });

    const durationMs = Math.round(performance.now() - start);
    console.log(`  Response in ${(durationMs / 1000).toFixed(1)}s`);

    const parts = response.candidates?.[0]?.content?.parts || [];
    let saved = false;

    for (const part of parts) {
      if (part.inlineData?.data) {
        const outputPath = path.join(OUTPUT_DIR, `segmap-${shortName}.png`);
        const buffer = Buffer.from(part.inlineData.data, "base64");
        fs.writeFileSync(outputPath, buffer);
        console.log(`  Saved: ${outputPath}`);
        saved = true;
      }
      if (part.text) {
        console.log(`  Text: ${part.text.slice(0, 150)}`);
      }
    }

    if (!saved) {
      console.log("  No image returned — model may not support image output");
    }

    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      console.error(`  Failed (${(durationMs / 1000).toFixed(1)}s):`, String(err).slice(0, 200));
    }
  }

  console.log(`\nColor key:`);
  for (const [surface, color] of Object.entries(COLOR_MAP)) {
    console.log(`  ${color}  ${surface}`);
  }
  console.log(`  #000000  everything else`);
}

main().catch(console.error);
