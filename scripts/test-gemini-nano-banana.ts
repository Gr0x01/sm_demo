#!/usr/bin/env npx tsx
/**
 * Test Nano Banana Pro (Gemini 3 Pro Image) using the REAL production prompt
 * pipeline — not a fork.
 *
 * This script:
 * 1. Pulls real room photo + swatch images from Supabase Storage
 * 2. Uses the ACTUAL buildEditPrompt() from src/lib/generate.ts
 * 3. Applies production scoping: photo scope, flooring resolver, wall paint normalization
 * 4. Fetches and applies per-photo generation policies from DB
 * 5. Sends room photo + N swatch images as multimodal input to Gemini
 * 6. Tracks per-generation cost for comparison against gpt-image-1.5
 *
 * Usage:
 *   npx tsx scripts/test-gemini-nano-banana.ts
 *   npx tsx scripts/test-gemini-nano-banana.ts --model gemini-2.5-flash-image
 *
 * Requires env vars:
 *   GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import fs from "fs";

// Production imports — same code the real route uses.
// Note: getOptionLookup is wrapped in unstable_cache (Next.js runtime only),
// so we build the lookup directly from Supabase below.
import { buildEditPrompt, type SwatchBufferResolver } from "@/lib/generate";
import { getStepPhotoGenerationPolicy } from "@/lib/db-queries";
import { resolvePhotoGenerationPolicy } from "@/lib/photo-generation-policy";
import { resolveScopedFlooringSelections } from "@/lib/flooring-selection";
import { getPhotoScopedIds, normalizePrimaryAccentAsWallPaint } from "@/lib/photo-scope";
import type { Option, SubCategory } from "@/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DEFAULT_MODEL = "gemini-3-pro-image-preview";
const SM_ORG_SLUG = "stonemartin";
const KINKADE_SLUG = "kinkade";
// Target step photo — deterministic, no LIKE guessing
const TARGET_PHOTO_PATH = "364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp";

const args = process.argv.slice(2);
const modelArg = args.find((a) => a.startsWith("--model="))?.split("=")[1]
  ?? (args.indexOf("--model") !== -1 ? args[args.indexOf("--model") + 1] : null);
const MODEL = modelArg || DEFAULT_MODEL;

const OUTPUT_DIR = path.join(__dirname, "nano-banana-test-outputs");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Cost tracking
// ---------------------------------------------------------------------------
// Gemini 3 Pro Image: $0.134/image at 2K, input tokens ~$0.01
// gpt-image-1.5:      $0.20/image (high quality, 1536x1024)
const COST_PER_IMAGE: Record<string, number> = {
  "gemini-3-pro-image-preview": 0.134,
  "gemini-2.5-flash-image": 0.05,
  "gpt-image-1.5": 0.20,
};
const ESTIMATED_INPUT_TOKEN_COST = 0.01;

interface TestResult {
  name: string;
  model: string;
  swatchCount: number;
  durationMs: number;
  estimatedCostUsd: number;
  gptImageCostUsd: number;
  savings: string;
  outputPath: string;
  promptPath: string;
}

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
// Data fetching
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
      steps!inner(id, name, slug, scene_description, spatial_hints, floorplan_id)
    `)
    .eq("image_path", TARGET_PHOTO_PATH)
    .eq("steps.floorplan_id", floorplanId)
    .single();

  if (error || !photo) throw new Error(`Photo not found: ${TARGET_PHOTO_PATH}`);
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
    },
  };
}

// ---------------------------------------------------------------------------
// Swatch resolver — same pattern as /api/generate/photo/route.ts
// ---------------------------------------------------------------------------
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
// Gemini prompt hardening
// ---------------------------------------------------------------------------
// Gemini needs explicit output format constraints that gpt-image-1.5 doesn't
// need (OpenAI's `size` param handles geometry). These wrap the production
// prompt without modifying it.
const GEMINI_OUTPUT_PREAMBLE = `OUTPUT FORMAT: Return a single, seamless photograph — NOT a collage, NOT a split-screen, NOT a before-and-after comparison, NOT multiple panels. No borders, no dividers, no side-by-side layout. One unified landscape-orientation image preserving the original photo's full field of view, camera angle, and spatial composition.

`;

function wrapPromptForGemini(productionPrompt: string): string {
  return GEMINI_OUTPUT_PREAMBLE + productionPrompt;
}

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

  // Room photo first (base image to edit)
  parts.push({ inlineData: { mimeType: roomMimeType, data: roomBuffer.toString("base64") } });

  // Swatch images in deterministic order (matches prompt swatch #N references)
  for (const swatch of swatches) {
    parts.push({ inlineData: { mimeType: swatch.mediaType, data: swatch.buffer.toString("base64") } });
  }

  // Text prompt last
  parts.push({ text: prompt });

  console.log(`  Sending ${1 + swatches.length} images + prompt to ${MODEL}...`);

  const start = performance.now();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: "3:2",
        imageSize: "1K",
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
// Test definitions — real SM Kinkade option slugs (verified against DB)
// ---------------------------------------------------------------------------
// Kitchen-close photo scope: counter-top, countertop-edge, backsplash,
// kitchen-cabinet-color, kitchen-island-cabinet-color, kitchen-cabinet-hardware,
// kitchen-sink, kitchen-faucet, dishwasher, range, refrigerator,
// under-cabinet-lighting, trash-can-cabinet, light-rail, glass-cabinet-door
const TEST_CASES = [
  {
    name: "01_counter_only",
    description: "Single swatch — countertop change only",
    selections: { "counter-top": "ct-quartz-calacatta-duolina" },
  },
  {
    name: "02_cabinets_counter",
    description: "Two swatches — cabinets + countertop",
    selections: {
      "kitchen-cabinet-color": "kitchen-cab-color-onyx",
      "counter-top": "ct-quartz-lace-white",
    },
  },
  {
    name: "03_cabinets_counter_backsplash",
    description: "Three swatches — cabinets + countertop + backsplash",
    selections: {
      "kitchen-cabinet-color": "kitchen-cab-color-driftwood",
      "counter-top": "ct-quartz-calacatta-duolina",
      "backsplash": "bs-baker-herringbone-glacier",
    },
  },
  {
    name: "04_medium_kitchen",
    description: "Five swatches — cabinets + island + counter + backsplash + hardware",
    selections: {
      "kitchen-cabinet-color": "kitchen-cab-color-onyx",
      "kitchen-island-cabinet-color": "island-color-driftwood",
      "counter-top": "ct-quartz-calacatta-duolina",
      "backsplash": "bs-vesper-callisto",
      "kitchen-cabinet-hardware": "hw-naples-pull-knob-brushed-gold",
    },
  },
  {
    name: "05_full_kitchen",
    description: "Full kitchen — 8 swatches including appliances (the real pipeline test)",
    selections: {
      "kitchen-cabinet-color": "kitchen-cab-color-onyx",
      "kitchen-island-cabinet-color": "island-color-driftwood",
      "counter-top": "ct-quartz-calacatta-duolina",
      "backsplash": "bs-baker-herringbone-glacier",
      "kitchen-cabinet-hardware": "hw-naples-pull-knob-brushed-gold",
      "main-area-flooring-color": "floor-color-mariner-harbor",
      "range": "range-ge-gas-slide-in",
      "dishwasher": "dishwasher-ge-stainless-interior",
    },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Nano Banana Pro Test (v3 — fixed imageConfig + prompt hardening) ===");
  console.log(`Model: ${MODEL}`);
  console.log(`Output dir: ${OUTPUT_DIR}\n`);

  // --- Load org, floorplan, photo ---
  console.log("--- Loading SM Kinkade data ---");
  const { org, floorplan } = await getOrgAndFloorplan();
  console.log(`  Org: ${org.name} (${org.id})`);
  console.log(`  Floorplan: ${floorplan.name} (${floorplan.id})`);

  const photo = await getTargetPhoto(floorplan.id);
  console.log(`  Photo: ${photo.imagePath} (${photo.photoId})`);
  console.log(`  Scope: ${photo.subcategoryIds?.join(", ") || "none (full step)"}`);
  console.log(`  Scene: ${photo.step.sceneDescription?.slice(0, 80) || "none"}...`);
  console.log(`  Baseline: ${photo.photoBaseline?.slice(0, 80) || "none"}...`);
  console.log(`  Spatial hint: ${photo.spatialHint?.slice(0, 80) || "none"}...`);

  // --- Download room photo ---
  console.log("\n--- Downloading room photo ---");
  const { data: imageData, error: dlErr } = await supabase.storage.from("rooms").download(photo.imagePath);
  if (dlErr || !imageData) throw new Error(`Failed to download room photo: ${dlErr?.message}`);
  const roomBuffer = Buffer.from(await imageData.arrayBuffer());
  const heroExt = photo.imagePath.split(".").pop()?.toLowerCase() || "webp";
  const roomMimeType = heroExt === "jpg" ? "image/jpeg" : `image/${heroExt}`;
  console.log(`  Size: ${roomBuffer.length} bytes, type: ${roomMimeType}`);
  fs.writeFileSync(path.join(OUTPUT_DIR, "00_input_room.png"), roomBuffer);

  // --- Build option lookup directly (bypasses unstable_cache which needs Next.js runtime) ---
  // Same query + mapping as _getCategoriesWithOptions in db-queries.ts
  console.log("\n--- Loading option lookup ---");
  const { data: cats, error: catsErr } = await supabase
    .from("categories")
    .select(`
      id, slug, name, sort_order,
      subcategories (
        id, slug, name, category_id, is_visual, is_additive, unit_label, max_quantity, sort_order, generation_hint, generation_rules, is_appliance,
        options ( id, slug, name, price, prompt_descriptor, swatch_url, swatch_color, nudge, sort_order, generation_rules, is_default )
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
        isAppliance: sub.is_appliance || undefined,
      };
      for (const opt of ((sub.options ?? []) as any[]).sort((a: any, b: any) => a.sort_order - b.sort_order)) {
        const option: Option = {
          id: opt.slug, name: opt.name, price: opt.price,
          promptDescriptor: opt.prompt_descriptor ?? undefined,
          swatchUrl: opt.swatch_url ?? undefined, swatchColor: opt.swatch_color ?? undefined,
          nudge: opt.nudge ?? undefined, generationRules: opt.generation_rules ?? undefined,
          isDefault: opt.is_default || undefined,
        };
        optionLookup.set(`${sub.slug}:${opt.slug}`, { option, subCategory });
      }
    }
  }
  console.log(`  ${optionLookup.size} entries`);

  // --- Load generation policy for this photo ---
  const dbPolicy = await getStepPhotoGenerationPolicy(org.id, photo.photoId);
  console.log(`  Generation policy: ${dbPolicy ? "DB policy found" : "none (code fallback)"}`);

  // --- Compute scoping (same as route) ---
  const sectionSubIds = (photo.step.sections || []).flatMap((s: { subcategory_ids?: string[] }) => s.subcategory_ids ?? []);
  const alsoInclude = photo.step.alsoIncludeIds || [];
  const photoScopedIds = getPhotoScopedIds(
    photo.subcategoryIds,
    [...sectionSubIds, ...alsoInclude],
  );

  function buildSceneDescription(): string | null {
    if (photo.photoBaseline?.trim()) return photo.photoBaseline.trim();
    if (photo.step.sceneDescription?.trim()) return photo.step.sceneDescription.trim();
    return null;
  }

  function filterSpatialHints(hints: Record<string, string>): Record<string, string> {
    if (!photoScopedIds) return { ...hints };
    return Object.fromEntries(Object.entries(hints).filter(([k]) => photoScopedIds.has(k)));
  }

  const sceneDescription = buildSceneDescription();
  const spatialHints = filterSpatialHints(photo.step.spatialHints || {});

  // --- Run tests ---
  const results: TestResult[] = [];

  for (const tc of TEST_CASES) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`TEST: ${tc.name} — ${tc.description}`);
    console.log(`${"=".repeat(60)}`);

    // --- Apply production selection scoping (same as route) ---
    let scopedSelections = { ...tc.selections } as Record<string, string>;
    if (photoScopedIds) {
      scopedSelections = Object.fromEntries(
        Object.entries(scopedSelections).filter(([key]) => photoScopedIds.has(key)),
      );
    }

    const flooringContextText = [
      photo.photoBaseline ?? "",
      photo.spatialHint ?? "",
      photo.step.sceneDescription ?? "",
    ].join("\n");
    scopedSelections = resolveScopedFlooringSelections(scopedSelections, flooringContextText);
    scopedSelections = normalizePrimaryAccentAsWallPaint(scopedSelections, photo.remapAccentAsWallPaint ?? false);

    console.log(`  Scoped selections: ${Object.keys(scopedSelections).length} items`);
    for (const [sub, opt] of Object.entries(scopedSelections)) {
      const found = optionLookup.get(`${sub}:${opt}`);
      const isAppliance = found?.subCategory.isAppliance;
      console.log(`    ${found?.subCategory.name || sub}: ${isAppliance ? found?.option.name : "(swatch authority)"} ${found?.option.swatchUrl ? "[swatch]" : "[no swatch]"}`);
    }

    // --- Resolve generation policy (same as route) ---
    const resolvedPolicy = resolvePhotoGenerationPolicy({
      orgSlug: SM_ORG_SLUG,
      floorplanSlug: KINKADE_SLUG,
      stepSlug: photo.step.slug,
      stepPhotoId: photo.photoId,
      imagePath: photo.imagePath,
      modelName: MODEL,
      selections: scopedSelections,
    }, dbPolicy);
    console.log(`  Policy: ${resolvedPolicy.policyKey}${resolvedPolicy.secondPass ? " (has second pass)" : ""}`);

    // --- Build prompt using REAL production buildEditPrompt() ---
    const scopedSubcategoryIds = photoScopedIds ? [...photoScopedIds] : [];
    const { prompt, swatches } = await buildEditPrompt(
      scopedSelections,
      optionLookup,
      spatialHints,
      scopedSubcategoryIds,
      sceneDescription,
      photo.spatialHint,
      resolveSwatchBuffer,
      resolvedPolicy.promptOverrides,
    );

    console.log(`  Prompt length: ${prompt.length} chars`);
    console.log(`  Swatch images: ${swatches.length}`);

    // Save prompt + swatches for review
    const promptPath = path.join(OUTPUT_DIR, `${tc.name}_prompt.txt`);
    fs.writeFileSync(promptPath, prompt);
    for (let i = 0; i < swatches.length; i++) {
      const ext = swatches[i].mediaType.split("/")[1] || "png";
      fs.writeFileSync(path.join(OUTPUT_DIR, `${tc.name}_swatch_${i + 1}.${ext}`), swatches[i].buffer);
    }

    // --- Generate via Gemini ---
    const geminiPrompt = wrapPromptForGemini(prompt);
    try {
      const { imageBuffer, durationMs } = await generateWithGemini(roomBuffer, roomMimeType, swatches, geminiPrompt);

      const outputPath = path.join(OUTPUT_DIR, `${tc.name}_output.png`);
      fs.writeFileSync(outputPath, imageBuffer);

      const perImageCost = COST_PER_IMAGE[MODEL] ?? 0.134;
      const estimatedCost = perImageCost + ESTIMATED_INPUT_TOKEN_COST;
      const gptCost = COST_PER_IMAGE["gpt-image-1.5"];
      const savingsPercent = ((gptCost - estimatedCost) / gptCost * 100).toFixed(1);

      results.push({
        name: tc.name, model: MODEL, swatchCount: swatches.length, durationMs,
        estimatedCostUsd: estimatedCost, gptImageCostUsd: gptCost,
        savings: `${savingsPercent}%`, outputPath, promptPath,
      });

      console.log(`  Generated in ${(durationMs / 1000).toFixed(1)}s`);
      console.log(`  Output: ${outputPath}`);
      console.log(`  Cost: $${estimatedCost.toFixed(3)} (vs gpt-image-1.5 $${gptCost.toFixed(2)}, savings: ${savingsPercent}%)`);
    } catch (err: any) {
      console.error(`  FAILED: ${err.message}`);
      results.push({
        name: tc.name, model: MODEL, swatchCount: swatches.length, durationMs: 0,
        estimatedCostUsd: 0, gptImageCostUsd: COST_PER_IMAGE["gpt-image-1.5"],
        savings: "N/A", outputPath: "FAILED", promptPath,
      });
    }
  }

  // --- Summary ---
  console.log(`\n${"=".repeat(80)}`);
  console.log("SUMMARY");
  console.log(`${"=".repeat(80)}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Pipeline: production buildEditPrompt() + scoping + policy resolution`);
  console.log(`Tests: ${results.length}\n`);

  const header = "Test                          | Swatches | Time    | Cost    | vs 1.5  | Savings";
  const divider = "-".repeat(header.length);
  console.log(header);
  console.log(divider);

  let totalCost = 0;
  let totalGptCost = 0;
  for (const r of results) {
    const time = r.durationMs > 0 ? `${(r.durationMs / 1000).toFixed(1)}s` : "FAIL";
    const cost = r.estimatedCostUsd > 0 ? `$${r.estimatedCostUsd.toFixed(3)}` : "N/A";
    const gpt = `$${r.gptImageCostUsd.toFixed(2)}`;
    console.log(`${r.name.padEnd(30)}| ${String(r.swatchCount).padEnd(9)}| ${time.padEnd(8)}| ${cost.padEnd(8)}| ${gpt.padEnd(8)}| ${r.savings}`);
    totalCost += r.estimatedCostUsd;
    totalGptCost += r.gptImageCostUsd;
  }
  console.log(divider);
  const totalSavings = totalGptCost > 0 ? ((totalGptCost - totalCost) / totalGptCost * 100).toFixed(1) : "N/A";
  console.log(`${"Total".padEnd(30)}| ${"".padEnd(9)}| ${"".padEnd(8)}| $${totalCost.toFixed(3).padEnd(7)}| $${totalGptCost.toFixed(2).padEnd(7)}| ${totalSavings}%`);

  const resultsPath = path.join(OUTPUT_DIR, "results.json");
  fs.writeFileSync(resultsPath, JSON.stringify({ model: MODEL, timestamp: new Date().toISOString(), pipeline: "production", results }, null, 2));
  console.log(`\nResults saved to: ${resultsPath}`);
  console.log(`All outputs in: ${OUTPUT_DIR}`);
}

main().catch((err) => { console.error("Fatal error:", err); process.exit(1); });
