#!/usr/bin/env npx tsx
/**
 * End-to-end two-pass backsplash test.
 *
 * Runs 3 outputs per backsplash option for visual comparison:
 *   A. Flash backsplash isolation only (pre-pass output)
 *   B. Two-pass: Flash backsplash → feed into 1.5 with remaining kitchen selections
 *   C. Baseline: single-pass 1.5 with ALL selections including backsplash
 *
 * Compare B vs C to see if the two-pass improves backsplash quality
 * without degrading everything else.
 *
 * Usage:
 *   npx tsx scripts/test-two-pass-backsplash.ts
 *   npx tsx scripts/test-two-pass-backsplash.ts --backsplash herringbone-taupe
 *   npx tsx scripts/test-two-pass-backsplash.ts --backsplash picket-taupe-v
 *
 * Requires: OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY,
 *           NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import OpenAI, { toFile } from "openai";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import fs from "fs";

import { buildEditPrompt, type SwatchBufferResolver } from "@/lib/generate";
import { getPhotoScopedIds } from "@/lib/photo-scope";
import { getStepPhotoGenerationPolicy } from "@/lib/db-queries";
import { resolvePhotoGenerationPolicy } from "@/lib/photo-generation-policy";
import type { Option, SubCategory } from "@/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const FLASH_MODEL = "gemini-3.1-flash-image-preview";
const OPENAI_MODEL = "gpt-image-1.5";
const SM_ORG_SLUG = "stonemartin";
const KINKADE_SLUG = "kinkade";
const KITCHEN_PHOTO = "364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp";

const BACKSPLASH_PRESETS: Record<string, { subSlug: string; optSlug: string; label: string }> = {
  "subway-taupe":       { subSlug: "backsplash", optSlug: "bs-baker-4x16-taupe", label: "4x16 Subway Taupe" },
  "herringbone-taupe":  { subSlug: "backsplash", optSlug: "bs-baker-herringbone-taupe", label: "Herringbone Matte Mosaic Taupe" },
  "picket-taupe-v":     { subSlug: "backsplash", optSlug: "baker-blvd-picket-gloss-taupe-vertical", label: "Picket Gloss Taupe Vertical" },
};

// Remaining kitchen selections (everything except backsplash)
const OTHER_KITCHEN_SELECTIONS: Record<string, string> = {
  "kitchen-cabinet-color": "kitchen-cab-color-onyx",
  "kitchen-island-cabinet-color": "island-color-driftwood",
  "counter-top": "ct-quartz-calacatta-duolina",
  "kitchen-cabinet-hardware": "hw-naples-pull-knob-brushed-gold",
  "kitchen-faucet": "faucet-moen-sleek-matte-black",
  "kitchen-sink": "sink-karran-black",
  "interior-wall-paint": "wp-sw-agreeable-gray",
  "primary-flooring": "fl-coretec-virtue-oak",
  "range": "range-slide-in-ss",
};

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

const backsplashKey = getArg("backsplash", "picket-taupe-v");
const label = getArg("label", "");
const preset = BACKSPLASH_PRESETS[backsplashKey];
if (!preset) {
  console.error(`Unknown backsplash: ${backsplashKey}`);
  console.error(`Options: ${Object.keys(BACKSPLASH_PRESETS).join(", ")}`);
  process.exit(1);
}

// Each run gets a timestamped folder so nothing gets overwritten
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const runName = label ? `${backsplashKey}_${label}_${timestamp}` : `${backsplashKey}_${timestamp}`;
const OUTPUT_DIR = path.join(__dirname, "backsplash-test-outputs", "two-pass", runName);
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
function getEnvOrDie(key: string): string {
  const val = process.env[key];
  if (!val) { console.error(`Missing env var: ${key}`); process.exit(1); }
  return val;
}

const supabase = createClient(getEnvOrDie("NEXT_PUBLIC_SUPABASE_URL"), getEnvOrDie("SUPABASE_SERVICE_ROLE_KEY"));
const openai = new OpenAI();
const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!googleApiKey) { console.error("Missing GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY"); process.exit(1); }
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

async function loadOptionLookup(orgId: string) {
  const { data: cats, error } = await supabase
    .from("categories")
    .select(`
      id, slug, name, sort_order,
      subcategories (
        id, slug, name, category_id, is_visual, is_additive, unit_label, max_quantity, sort_order, generation_hint, generation_rules, generation_rules_when_not_selected, is_appliance,
        options ( id, slug, name, price, prompt_descriptor, dimensions, swatch_url, swatch_color, nudge, sort_order, generation_rules, is_default )
      )
    `)
    .eq("org_id", orgId)
    .order("sort_order");
  if (error || !cats) throw new Error(`Failed to load categories: ${error?.message}`);

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
  return optionLookup;
}

// ---------------------------------------------------------------------------
// Generation helpers
// ---------------------------------------------------------------------------
async function generateWithFlash(
  roomBuffer: Buffer,
  roomMimeType: string,
  prompt: string,
  swatches: Array<{ buffer: Buffer; mediaType: string }>,
): Promise<{ imageBuffer: Buffer; durationMs: number }> {
  const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [
    { text: prompt },
    { inlineData: { mimeType: roomMimeType, data: roomBuffer.toString("base64") } },
  ];
  for (const swatch of swatches) {
    parts.push({ inlineData: { mimeType: swatch.mediaType, data: swatch.buffer.toString("base64") } });
  }

  const start = performance.now();
  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "3:2", imageSize: "2K" },
    },
  });
  const durationMs = Math.round(performance.now() - start);

  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) throw new Error("No response from Flash");

  for (const part of candidate.content.parts) {
    if ((part as any).inlineData) {
      return { imageBuffer: Buffer.from((part as any).inlineData.data, "base64"), durationMs };
    }
  }
  throw new Error("No image in Flash response");
}

async function generateWithOpenAI(
  imageBuffer: Buffer,
  imageMime: string,
  imageFilename: string,
  prompt: string,
  swatches: Array<{ buffer: Buffer; mediaType: string; label: string }>,
): Promise<{ imageBuffer: Buffer; durationMs: number }> {
  const supportedSwatches = swatches.filter(s => ["image/jpeg", "image/png", "image/webp"].includes(s.mediaType));

  const inputImages = [
    await toFile(imageBuffer, imageFilename, { type: imageMime }),
    ...await Promise.all(
      supportedSwatches.map((s) => {
        const ext = s.mediaType.split("/")[1] || "png";
        const filename = `${s.label.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
        return toFile(s.buffer, filename, { type: s.mediaType });
      })
    ),
  ];

  const start = performance.now();
  const result = await openai.images.edit({
    model: OPENAI_MODEL,
    image: inputImages,
    prompt,
    quality: "medium",
    size: "1536x1024",
    input_fidelity: "high",
  });
  const durationMs = Math.round(performance.now() - start);

  const generatedData = result.data?.[0];
  if (!generatedData?.b64_json) throw new Error("No image from OpenAI");

  return { imageBuffer: Buffer.from(generatedData.b64_json, "base64"), durationMs };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Two-Pass Backsplash End-to-End Test ===");
  console.log(`Backsplash: ${preset.label} (${backsplashKey})`);
  console.log(`Flash model: ${FLASH_MODEL}`);
  console.log(`OpenAI model: ${OPENAI_MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  const { org, floorplan } = await getOrgAndFloorplan();
  console.log(`Org: ${org.name} | Floorplan: ${floorplan.name}`);

  const photo = await getTargetPhoto(floorplan.id);
  const optionLookup = await loadOptionLookup(org.id);
  console.log(`Photo: ${photo.step.name} — ${photo.imagePath}`);
  console.log(`Option lookup: ${optionLookup.size} entries\n`);

  // Download room photo
  const { data: imageData, error: dlErr } = await supabase.storage.from("rooms").download(photo.imagePath);
  if (dlErr || !imageData) throw new Error(`Failed to download room photo: ${dlErr?.message}`);

  const roomBuffer = Buffer.from(await imageData.arrayBuffer());
  const heroExt = photo.imagePath.split(".").pop()?.toLowerCase() || "webp";
  const roomMimeType = heroExt === "jpg" ? "image/jpeg" : `image/${heroExt}`;
  fs.writeFileSync(path.join(OUTPUT_DIR, "00_input_room.png"), roomBuffer);

  // Scoping
  const sectionSubIds = photo.step.sections.flatMap(s => s.subcategory_ids ?? []);
  const photoScopedIds = getPhotoScopedIds(photo.subcategoryIds, sectionSubIds);
  const scopedSubcategoryIds = photoScopedIds ? [...photoScopedIds] : [];
  const allSpatialHints = photoScopedIds
    ? Object.fromEntries(Object.entries(photo.step.spatialHints || {}).filter(([k]) => photoScopedIds.has(k)))
    : { ...(photo.step.spatialHints || {}) };
  const sceneDescription = photo.photoBaseline?.trim() || photo.step.sceneDescription?.trim() || null;

  // Policy
  const dbPolicy = await getStepPhotoGenerationPolicy(org.id, photo.photoId);

  // Full selections = backsplash + everything else
  const fullSelections: Record<string, string> = {
    [preset.subSlug]: preset.optSlug,
    ...OTHER_KITCHEN_SELECTIONS,
  };

  const resolvedPolicy = resolvePhotoGenerationPolicy({
    orgSlug: SM_ORG_SLUG, floorplanSlug: KINKADE_SLUG,
    stepSlug: photo.step.slug, stepPhotoId: photo.photoId,
    imagePath: photo.imagePath, modelName: OPENAI_MODEL,
    selections: fullSelections,
  }, dbPolicy);

  // =========================================================================
  // TEST A: 1.5 main pass — everything EXCEPT backsplash
  // =========================================================================
  console.log(`${"=".repeat(60)}`);
  console.log(`  A: 1.5 main pass (everything except backsplash)`);
  console.log(`${"=".repeat(60)}`);

  const mainPassSelections = { ...OTHER_KITCHEN_SELECTIONS };
  const { prompt: mainPrompt, swatches: mainSwatches } = await buildEditPrompt(
    mainPassSelections, optionLookup, allSpatialHints, scopedSubcategoryIds,
    sceneDescription, photo.spatialHint, resolveSwatchBuffer, resolvedPolicy.promptOverrides,
  );

  fs.writeFileSync(path.join(OUTPUT_DIR, `${backsplashKey}_A_main_prompt.txt`), mainPrompt);
  console.log(`  Prompt: ${mainPrompt.length} chars, ${mainSwatches.length} swatch(es)`);

  const mainResult = await generateWithOpenAI(
    roomBuffer, roomMimeType, photo.imagePath.split("/").pop() || "room.webp",
    mainPrompt, mainSwatches,
  );
  const mainOutputPath = path.join(OUTPUT_DIR, `${backsplashKey}_A_main_pass.png`);
  fs.writeFileSync(mainOutputPath, mainResult.imageBuffer);
  console.log(`  Done in ${(mainResult.durationMs / 1000).toFixed(1)}s → ${mainOutputPath}`);

  // =========================================================================
  // TEST B: Flash post-pass — backsplash only on top of 1.5 output
  // =========================================================================
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  B: Flash post-pass — backsplash on 1.5 output (${preset.label})`);
  console.log(`${"=".repeat(60)}`);

  const backsplashOnlySelections = { [preset.subSlug]: preset.optSlug };
  const backsplashSubIds = scopedSubcategoryIds.filter(id => id === preset.subSlug);
  const backsplashSpatialHints: Record<string, string> = {};
  if (allSpatialHints[preset.subSlug]) backsplashSpatialHints[preset.subSlug] = allSpatialHints[preset.subSlug];

  const { prompt: postPassPrompt, swatches: postPassSwatches } = await buildEditPrompt(
    backsplashOnlySelections, optionLookup, backsplashSpatialHints, backsplashSubIds,
    sceneDescription, photo.spatialHint, resolveSwatchBuffer, resolvedPolicy.promptOverrides,
  );

  fs.writeFileSync(path.join(OUTPUT_DIR, `${backsplashKey}_B_postpass_prompt.txt`), postPassPrompt);
  console.log(`  Prompt: ${postPassPrompt.length} chars, ${postPassSwatches.length} swatch(es)`);
  console.log(`  Input: 1.5 main pass output (cabinets/counters/floor already applied)`);

  const postPassResult = await generateWithFlash(mainResult.imageBuffer, "image/png", postPassPrompt, postPassSwatches);
  const postPassOutputPath = path.join(OUTPUT_DIR, `${backsplashKey}_B_post_pass.png`);
  fs.writeFileSync(postPassOutputPath, postPassResult.imageBuffer);
  console.log(`  Done in ${(postPassResult.durationMs / 1000).toFixed(1)}s → ${postPassOutputPath}`);

  // =========================================================================
  // TEST C: Baseline single-pass 1.5 (all selections)
  // =========================================================================
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  C: Baseline — single-pass 1.5 (all selections including backsplash)`);
  console.log(`${"=".repeat(60)}`);

  const { prompt: baselinePrompt, swatches: baselineSwatches } = await buildEditPrompt(
    fullSelections, optionLookup, allSpatialHints, scopedSubcategoryIds,
    sceneDescription, photo.spatialHint, resolveSwatchBuffer, resolvedPolicy.promptOverrides,
  );

  fs.writeFileSync(path.join(OUTPUT_DIR, `${backsplashKey}_C_baseline_prompt.txt`), baselinePrompt);
  console.log(`  Prompt: ${baselinePrompt.length} chars, ${baselineSwatches.length} swatch(es)`);

  const baselineResult = await generateWithOpenAI(
    roomBuffer, roomMimeType, photo.imagePath.split("/").pop() || "room.webp",
    baselinePrompt, baselineSwatches,
  );
  const baselineOutputPath = path.join(OUTPUT_DIR, `${backsplashKey}_C_baseline.png`);
  fs.writeFileSync(baselineOutputPath, baselineResult.imageBuffer);
  console.log(`  Done in ${(baselineResult.durationMs / 1000).toFixed(1)}s → ${baselineOutputPath}`);

  // =========================================================================
  // Summary
  // =========================================================================
  const totalTwoPass = mainResult.durationMs + postPassResult.durationMs;

  console.log(`\n${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log(`${"=".repeat(60)}`);
  console.log(`Backsplash: ${preset.label}`);
  console.log();
  console.log(`  A. 1.5 main (no backsplash): ${(mainResult.durationMs / 1000).toFixed(1)}s`);
  console.log(`  B. Two-pass total:           ${(totalTwoPass / 1000).toFixed(1)}s (1.5 ${(mainResult.durationMs / 1000).toFixed(1)}s + Flash ${(postPassResult.durationMs / 1000).toFixed(1)}s)`);
  console.log(`  C. Baseline single-pass:     ${(baselineResult.durationMs / 1000).toFixed(1)}s`);
  console.log(`  Overhead:                    +${((totalTwoPass - baselineResult.durationMs) / 1000).toFixed(1)}s`);
  console.log();
  console.log(`Outputs: ${OUTPUT_DIR}/`);
  console.log(`Compare:`);
  console.log(`  ${backsplashKey}_A_main_pass.png  — 1.5 everything except backsplash`);
  console.log(`  ${backsplashKey}_B_post_pass.png  — Flash backsplash applied on top`);
  console.log(`  ${backsplashKey}_C_baseline.png   — Single-pass baseline (all in one)`);
  console.log();
  console.log("Key question: Does Flash preserve the cabinets/counters/floor from A");
  console.log("while applying the correct backsplash pattern in B?");

  // Save results
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${backsplashKey}_results.json`),
    JSON.stringify({
      backsplash: backsplashKey,
      label: preset.label,
      flashModel: FLASH_MODEL,
      openaiModel: OPENAI_MODEL,
      timestamp: new Date().toISOString(),
      mainPassMs: mainResult.durationMs,
      postPassMs: postPassResult.durationMs,
      baselineMs: baselineResult.durationMs,
      twoPassTotalMs: totalTwoPass,
      overheadMs: totalTwoPass - baselineResult.durationMs,
    }, null, 2),
  );
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
