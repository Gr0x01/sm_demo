#!/usr/bin/env npx tsx
/**
 * Test Nano Banana (Gemini 3 Pro Image) for backsplash-only isolation passes.
 *
 * Runs 3 backsplash tiles through the full production prompt pipeline
 * (spatial hints, generation rules, dimensions) via Gemini instead of OpenAI:
 *   1. Subway 4x16 Taupe — control (known-good pattern)
 *   2. Herringbone Mosaic Taupe — mid-difficulty
 *   3. Picket Gloss Taupe Vertical — the hard one (elongated hexagon)
 *
 * All are backsplash-only isolation passes (1 swatch, no other selections).
 * This tests whether Nano Banana handles nonstandard tile geometry better
 * than gpt-image-1.5 for a targeted backsplash pass.
 *
 * Usage:
 *   npx tsx scripts/test-backsplash-nano-banana.ts
 *   npx tsx scripts/test-backsplash-nano-banana.ts --backsplash picket-taupe-v
 *   npx tsx scripts/test-backsplash-nano-banana.ts --all
 *   npx tsx scripts/test-backsplash-nano-banana.ts --size 2K
 *
 * Requires: GOOGLE_GENERATIVE_AI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import fs from "fs";

import { buildEditPrompt, type SwatchBufferResolver } from "@/lib/generate";
import { getPhotoScopedIds, normalizePrimaryAccentAsWallPaint } from "@/lib/photo-scope";
import { getStepPhotoGenerationPolicy } from "@/lib/db-queries";
import { resolvePhotoGenerationPolicy } from "@/lib/photo-generation-policy";
import type { Option, SubCategory } from "@/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MODEL = "gemini-3-pro-image-preview";
const SM_ORG_SLUG = "stonemartin";
const KINKADE_SLUG = "kinkade";
const KITCHEN_PHOTO = "364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp";

const BACKSPLASH_PRESETS: Record<string, { subSlug: string; optSlug: string; label: string }> = {
  "subway-taupe":       { subSlug: "backsplash", optSlug: "bs-baker-4x16-taupe", label: "4x16 Subway Taupe" },
  "herringbone-taupe":  { subSlug: "backsplash", optSlug: "bs-baker-herringbone-taupe", label: "Herringbone Matte Mosaic Taupe" },
  "picket-taupe-v":     { subSlug: "backsplash", optSlug: "baker-blvd-picket-gloss-taupe-vertical", label: "Picket Gloss Taupe Vertical" },
  "picket-warm-grey-v": { subSlug: "backsplash", optSlug: "baker-blvd-picket-gloss-warm-grey-vertical", label: "Picket Gloss Warm Grey Vertical" },
  "herringbone-carbon": { subSlug: "backsplash", optSlug: "bs-baker-herringbone-carbon", label: "Herringbone Matte Mosaic Carbon" },
  "vesper-eminent":     { subSlug: "backsplash", optSlug: "bs-vesper-eminent", label: "Vesper 6x6 Eminent" },
};

// Default test set: one from each difficulty tier
const DEFAULT_TESTS = ["subway-taupe", "herringbone-taupe", "picket-taupe-v"];

// Gemini needs explicit output constraints (no collage/split-screen)
const GEMINI_OUTPUT_PREAMBLE = `OUTPUT FORMAT: Return a single, seamless photograph — NOT a collage, NOT a split-screen, NOT a before-and-after comparison, NOT multiple panels. No borders, no dividers, no side-by-side layout. One unified landscape-orientation image preserving the original photo's full field of view, camera angle, and spatial composition.

`;

// ---------------------------------------------------------------------------
// Parse args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.split("=")[1];
  return fallback;
}

const runAll = args.includes("--all");
const singleKey = !runAll ? getArg("backsplash", "") : "";
const imageSize = getArg("size", "1K") as "1K" | "2K";

const testKeys = runAll
  ? Object.keys(BACKSPLASH_PRESETS)
  : singleKey
    ? [singleKey]
    : DEFAULT_TESTS;

// Validate
for (const key of testKeys) {
  if (!BACKSPLASH_PRESETS[key]) {
    console.error(`Unknown backsplash: ${key}`);
    console.error(`Options: ${Object.keys(BACKSPLASH_PRESETS).join(", ")}`);
    process.exit(1);
  }
}

const OUTPUT_DIR = path.join(__dirname, "backsplash-test-outputs", "nano-banana");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
function getEnvOrDie(key: string): string {
  const val = process.env[key];
  if (!val) { console.error(`Missing env var: ${key}`); process.exit(1); }
  return val;
}

const supabase = createClient(
  getEnvOrDie("NEXT_PUBLIC_SUPABASE_URL"),
  getEnvOrDie("SUPABASE_SERVICE_ROLE_KEY"),
);

const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!googleApiKey) { console.error("Missing env var: GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY"); process.exit(1); }
const ai = new GoogleGenAI({ apiKey: googleApiKey });

// ---------------------------------------------------------------------------
// Data fetching (same as isolation script)
// ---------------------------------------------------------------------------
async function getOrgAndFloorplan() {
  const { data: org } = await supabase
    .from("organizations").select("id, name").eq("slug", SM_ORG_SLUG).single();
  if (!org) throw new Error(`Org not found: ${SM_ORG_SLUG}`);
  const { data: fp } = await supabase
    .from("floorplans").select("id, name").eq("org_id", org.id).eq("slug", KINKADE_SLUG).single();
  if (!fp) throw new Error(`Floorplan not found: ${KINKADE_SLUG}`);
  return { org, floorplan: fp };
}

async function getTargetPhoto(floorplanId: string) {
  const { data: photo, error } = await supabase
    .from("step_photos")
    .select(`
      id, image_path, spatial_hint, photo_baseline, subcategory_ids, is_hero, remap_accent_as_wall_paint,
      steps!inner(id, name, slug, scene_description, spatial_hints, sections, floorplan_id)
    `)
    .eq("image_path", KITCHEN_PHOTO)
    .eq("steps.floorplan_id", floorplanId)
    .single();

  if (error || !photo) throw new Error(`Photo not found: ${KITCHEN_PHOTO}\n${error?.message}`);
  const step = (photo as any).steps;

  return {
    photoId: photo.id,
    imagePath: photo.image_path,
    spatialHint: photo.spatial_hint as string | null,
    photoBaseline: photo.photo_baseline as string | null,
    subcategoryIds: photo.subcategory_ids as string[] | null,
    remapAccentAsWallPaint: Boolean(photo.remap_accent_as_wall_paint),
    step: {
      id: step.id,
      name: step.name,
      slug: step.slug,
      sceneDescription: step.scene_description as string | null,
      spatialHints: step.spatial_hints as Record<string, string> | null,
      sections: ((step.sections ?? []) as Array<{ subcategory_ids?: string[] }>),
    },
  };
}

const resolveSwatchBuffer: SwatchBufferResolver = async (swatchUrl: string) => {
  let storagePath = swatchUrl;
  if (swatchUrl.startsWith("http")) {
    const match = swatchUrl.match(/\/object\/public\/swatches\/(.+)$/);
    if (match) storagePath = match[1];
    else return null;
  }
  if (storagePath.startsWith("/swatches/")) storagePath = storagePath.slice("/swatches/".length);

  const { data, error } = await supabase.storage.from("swatches").download(storagePath);
  if (error || !data) return null;

  const rawBuffer = Buffer.from(await data.arrayBuffer());
  const ext = storagePath.split(".").pop()?.toLowerCase() || "png";

  if (ext === "svg" || ext === "svgz") {
    const pngBuffer = await sharp(rawBuffer).png().toBuffer();
    return { buffer: pngBuffer, mediaType: "image/png" };
  }

  const mediaType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
  return { buffer: rawBuffer, mediaType };
};

// ---------------------------------------------------------------------------
// Gemini generation
// ---------------------------------------------------------------------------
async function generateWithGemini(
  roomBuffer: Buffer,
  roomMimeType: string,
  swatches: Array<{ buffer: Buffer; mediaType: string }>,
  prompt: string,
): Promise<{ imageBuffer: Buffer; durationMs: number }> {
  const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];

  // Room photo first
  parts.push({ inlineData: { mimeType: roomMimeType, data: roomBuffer.toString("base64") } });

  // Swatch images (matches prompt swatch #N references)
  for (const swatch of swatches) {
    parts.push({ inlineData: { mimeType: swatch.mediaType, data: swatch.buffer.toString("base64") } });
  }

  // Text prompt last
  parts.push({ text: prompt });

  const start = performance.now();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: "3:2",
        imageSize,
      },
    },
  });
  const durationMs = Math.round(performance.now() - start);

  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) throw new Error("No response parts from Gemini");

  for (const part of candidate.content.parts) {
    if ((part as any).inlineData) {
      const data = (part as any).inlineData.data;
      return { imageBuffer: Buffer.from(data, "base64"), durationMs };
    }
  }

  throw new Error("No image in Gemini response");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Nano Banana Backsplash Isolation Test ===");
  console.log(`Model: ${MODEL}`);
  console.log(`Image size: ${imageSize}`);
  console.log(`Tests: ${testKeys.join(", ")}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  const { org, floorplan } = await getOrgAndFloorplan();
  console.log(`Org: ${org.name} | Floorplan: ${floorplan.name}`);

  const photo = await getTargetPhoto(floorplan.id);
  console.log(`Photo: ${photo.step.name} — ${photo.imagePath}`);

  // Download room photo
  const { data: imageData, error: dlErr } = await supabase.storage.from("rooms").download(photo.imagePath);
  if (dlErr || !imageData) throw new Error(`Failed to download room photo: ${dlErr?.message}`);

  const roomBuffer = Buffer.from(await imageData.arrayBuffer());
  const heroExt = photo.imagePath.split(".").pop()?.toLowerCase() || "webp";
  const roomMimeType = heroExt === "jpg" ? "image/jpeg" : `image/${heroExt}`;
  fs.writeFileSync(path.join(OUTPUT_DIR, "00_input_room.png"), roomBuffer);

  // Build option lookup (includes dimensions + generation_rules_when_not_selected)
  console.log("Loading option lookup...");
  const { data: cats, error: catsErr } = await supabase
    .from("categories")
    .select(`
      id, slug, name, sort_order,
      subcategories (
        id, slug, name, category_id, is_visual, is_additive, unit_label, max_quantity, sort_order, generation_hint, generation_rules, generation_rules_when_not_selected, is_appliance,
        options ( id, slug, name, price, prompt_descriptor, dimensions, swatch_url, swatch_color, nudge, sort_order, generation_rules, is_default )
      )
    `)
    .eq("org_id", org.id)
    .order("sort_order");
  if (catsErr || !cats) throw new Error(`Failed to load categories: ${catsErr?.message}`);

  const optionLookup = new Map<string, { option: Option; subCategory: SubCategory }>();
  for (const cat of cats) {
    for (const sub of ((cat.subcategories ?? []) as any[]).sort((a: any, b: any) => a.sort_order - b.sort_order)) {
      const subCategory: SubCategory = {
        id: sub.slug, name: sub.name, categoryId: cat.slug,
        isVisual: sub.is_visual, isAdditive: sub.is_additive || undefined,
        unitLabel: sub.unit_label ?? undefined, maxQuantity: sub.max_quantity ?? undefined,
        generationHint: sub.generation_hint ?? undefined, generationRules: sub.generation_rules ?? undefined,
        generationRulesWhenNotSelected: sub.generation_rules_when_not_selected ?? undefined,
        isAppliance: sub.is_appliance || undefined,
      };
      for (const opt of ((sub.options ?? []) as any[]).sort((a: any, b: any) => a.sort_order - b.sort_order)) {
        const option: Option = {
          id: opt.slug, name: opt.name, price: opt.price,
          promptDescriptor: opt.prompt_descriptor ?? undefined,
          dimensions: opt.dimensions ?? undefined,
          swatchUrl: opt.swatch_url ?? undefined, swatchColor: opt.swatch_color ?? undefined,
          nudge: opt.nudge ?? undefined, generationRules: opt.generation_rules ?? undefined,
          isDefault: opt.is_default || undefined,
        };
        optionLookup.set(`${sub.slug}:${opt.slug}`, { option, subCategory });
      }
    }
  }
  console.log(`Option lookup: ${optionLookup.size} entries`);

  // Scoping
  const sectionSubIds = photo.step.sections.flatMap(s => s.subcategory_ids ?? []);
  const photoScopedIds = getPhotoScopedIds(photo.subcategoryIds, sectionSubIds);
  const scopedSubcategoryIds = photoScopedIds ? [...photoScopedIds] : [];

  const spatialHints = photoScopedIds
    ? Object.fromEntries(Object.entries(photo.step.spatialHints || {}).filter(([k]) => photoScopedIds.has(k)))
    : { ...(photo.step.spatialHints || {}) };

  const sceneDescription = photo.photoBaseline?.trim() || photo.step.sceneDescription?.trim() || null;

  // Policy
  const dbPolicy = await getStepPhotoGenerationPolicy(org.id, photo.photoId);

  // Run each test
  interface Result {
    key: string;
    label: string;
    durationMs: number;
    promptLength: number;
    swatchCount: number;
    outputPath: string;
    success: boolean;
    error?: string;
  }
  const results: Result[] = [];

  for (const key of testKeys) {
    const preset = BACKSPLASH_PRESETS[key];

    // Verify option exists
    const bsKey = `${preset.subSlug}:${preset.optSlug}`;
    if (!optionLookup.has(bsKey)) {
      console.error(`\nOption not found: ${bsKey}`);
      results.push({ key, label: preset.label, durationMs: 0, promptLength: 0, swatchCount: 0, outputPath: "MISSING", success: false, error: "Option not in DB" });
      continue;
    }

    const entry = optionLookup.get(bsKey)!;
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  ${preset.label} (${key})`);
    console.log(`  Dimensions: ${entry.option.dimensions || "none"}`);
    console.log(`  Swatch: ${entry.option.swatchUrl || "none"}`);
    console.log(`  Subcategory rules: ${entry.subCategory.generationRules || "none"}`);
    console.log(`  Option rules: ${entry.option.generationRules || "none"}`);
    console.log(`${"=".repeat(60)}`);

    const isolatedSelections = { [preset.subSlug]: preset.optSlug };

    const resolvedPolicy = resolvePhotoGenerationPolicy({
      orgSlug: SM_ORG_SLUG, floorplanSlug: KINKADE_SLUG,
      stepSlug: photo.step.slug, stepPhotoId: photo.photoId,
      imagePath: photo.imagePath, modelName: MODEL,
      selections: isolatedSelections,
    }, dbPolicy);

    const { prompt, swatches } = await buildEditPrompt(
      isolatedSelections, optionLookup, spatialHints, scopedSubcategoryIds,
      sceneDescription, photo.spatialHint, resolveSwatchBuffer,
      resolvedPolicy.promptOverrides,
    );

    const geminiPrompt = GEMINI_OUTPUT_PREAMBLE + prompt;

    // Save prompt for review
    fs.writeFileSync(path.join(OUTPUT_DIR, `${key}_prompt.txt`), geminiPrompt);
    console.log(`  Prompt: ${geminiPrompt.length} chars, ${swatches.length} swatch(es)`);

    // Save swatch for reference
    for (let i = 0; i < swatches.length; i++) {
      const ext = swatches[i].mediaType.split("/")[1] || "png";
      fs.writeFileSync(path.join(OUTPUT_DIR, `${key}_swatch_${i + 1}.${ext}`), swatches[i].buffer);
    }

    try {
      console.log(`  Generating via ${MODEL}...`);
      const { imageBuffer, durationMs } = await generateWithGemini(roomBuffer, roomMimeType, swatches, geminiPrompt);

      const outputPath = path.join(OUTPUT_DIR, `${key}_output.png`);
      fs.writeFileSync(outputPath, imageBuffer);
      console.log(`  Done in ${(durationMs / 1000).toFixed(1)}s → ${outputPath}`);

      results.push({ key, label: preset.label, durationMs, promptLength: geminiPrompt.length, swatchCount: swatches.length, outputPath, success: true });
    } catch (err: any) {
      console.error(`  FAILED: ${err.message}`);
      results.push({ key, label: preset.label, durationMs: 0, promptLength: geminiPrompt.length, swatchCount: swatches.length, outputPath: "FAILED", success: false, error: err.message });
    }
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log(`${"=".repeat(60)}`);
  console.log(`Model: ${MODEL} | Size: ${imageSize} | Pipeline: production buildEditPrompt()`);
  console.log();

  for (const r of results) {
    const time = r.success ? `${(r.durationMs / 1000).toFixed(1)}s` : "FAIL";
    const status = r.success ? "OK" : `ERR: ${r.error}`;
    console.log(`  ${r.label.padEnd(35)} ${time.padEnd(8)} ${status}`);
  }

  console.log(`\nOutputs: ${OUTPUT_DIR}/`);
  console.log("Compare *_output.png files — especially picket-taupe-v vs subway-taupe.");
  console.log("If picket pattern is correct, Nano Banana handles nonstandard geometry.");

  // Save results JSON
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "results.json"),
    JSON.stringify({ model: MODEL, imageSize, timestamp: new Date().toISOString(), results }, null, 2),
  );
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
