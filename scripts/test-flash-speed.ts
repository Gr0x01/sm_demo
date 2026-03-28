#!/usr/bin/env npx tsx
/**
 * Quick speed test: Flash backsplash isolation pass.
 * Runs picket-taupe-v 3 times to get consistent timing.
 */
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const MODEL = "gemini-3.1-flash-image-preview";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ai = new GoogleGenAI({ apiKey: (process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)! });

const KITCHEN_PHOTO = "364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp";
const SWATCH_PATH = "364538bf-1712-48e7-a905-04ad90983eb2/backsplash/baker-blvd-picket-gloss-taupe-hq.jpg";

async function dl(bucket: string, p: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(bucket).download(p);
  if (error || !data) throw new Error(`Download failed: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

async function main() {
  console.log(`=== Flash Speed Test (${MODEL}) ===\n`);

  const [roomBuffer, swatchBuffer] = await Promise.all([
    dl("rooms", KITCHEN_PHOTO),
    dl("swatches", SWATCH_PATH),
  ]);
  console.log(`Room: ${roomBuffer.length}b | Swatch: ${swatchBuffer.length}b\n`);

  const prompt = `Edit the first image, which is a kitchen photo. Replace ONLY the backsplash (tile surface between upper cabinets and countertop) with the tile shown in the second image.

The second image is a swatch of elongated hexagon picket tiles — match its exact color, finish, and tile shape. The tiles are approximately 1x3 inches each, with pointed ends on left and right sides, interlocking in staggered horizontal rows.

Keep EVERYTHING else exactly the same — cabinets, countertops, island, appliances, flooring, lighting, camera angle.`;

  const parts = [
    { text: prompt },
    { inlineData: { mimeType: "image/webp", data: roomBuffer.toString("base64") } },
    { inlineData: { mimeType: "image/jpeg", data: swatchBuffer.toString("base64") } },
  ];

  const times: number[] = [];
  const RUNS = 3;

  for (let i = 1; i <= RUNS; i++) {
    console.log(`Run ${i}/${RUNS}...`);
    const start = performance.now();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: "3:2", imageSize: "1K" },
      },
    });
    const ms = Math.round(performance.now() - start);
    times.push(ms);

    const candidate = response.candidates?.[0];
    let hasImage = false;
    for (const part of candidate?.content?.parts || []) {
      if ((part as any).inlineData) hasImage = true;
    }
    console.log(`  ${(ms / 1000).toFixed(1)}s — ${hasImage ? "got image" : "NO IMAGE"}`);
  }

  console.log(`\n--- Results ---`);
  console.log(`Times: ${times.map(t => `${(t/1000).toFixed(1)}s`).join(", ")}`);
  console.log(`Avg: ${(times.reduce((a,b) => a+b, 0) / times.length / 1000).toFixed(1)}s`);
  console.log(`Min: ${(Math.min(...times) / 1000).toFixed(1)}s`);
  console.log(`Max: ${(Math.max(...times) / 1000).toFixed(1)}s`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
