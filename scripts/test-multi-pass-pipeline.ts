#!/usr/bin/env npx tsx
/**
 * Multi-Pass Pipeline R&D Test
 *
 * Tests the core hypothesis: does splitting generation into purpose-built
 * sequential passes (structural → fixtures → specialty) produce better
 * results than the current single-pass-everything approach?
 *
 * Flow:
 *   1. Generate a single-pass baseline (current pipeline — all swatches) — or load from disk
 *   2. Generate multi-pass:
 *      a. Structural (1.5, cabs + counter + floor + paint — 4-6 swatches)
 *      b. Fixtures (1.5, appliances + hardware + sink — 2-4 swatches) on structural output
 *      c. Specialty (Flash, backsplash — 1 swatch) on fixtures output
 *   3. Save every intermediate + prompts for side-by-side comparison
 *
 * Usage:
 *   npx tsx scripts/test-multi-pass-pipeline.ts
 *   npx tsx scripts/test-multi-pass-pipeline.ts --baseline path/to/existing.png
 *   npx tsx scripts/test-multi-pass-pipeline.ts --stain              # use driftwood stain for perimeter cabinets
 *   npx tsx scripts/test-multi-pass-pipeline.ts --structural-only    # skip fixtures + specialty
 *   npx tsx scripts/test-multi-pass-pipeline.ts --skip-single-pass   # skip the single-pass baseline
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

import { buildEditPrompt, resolveLinkedOptions, type SwatchBufferResolver } from "@/lib/generate";
import { getPhotoScopedIds } from "@/lib/photo-scope";
import { getStepPhotoGenerationPolicy } from "@/lib/db-queries";
import { resolvePhotoGenerationPolicy } from "@/lib/photo-generation-policy";
import { IMAGE_MODEL, ISOLATION_IMAGE_MODEL } from "@/lib/models";
import type { Option, SubCategory } from "@/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const FLASH_MODEL = ISOLATION_IMAGE_MODEL;
const OPENAI_MODEL = IMAGE_MODEL;
const SM_ORG_SLUG = "stonemartin";
const KINKADE_SLUG = "kinkade";
const KITCHEN_PHOTO = "364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp";

// --- Pass group definitions ---
// These define which subcategories go into which pass.
const STRUCTURAL_SUBS = [
  "kitchen-cabinet-color",
  "kitchen-island-cabinet-color",
  "counter-top",
  "primary-flooring",
  "interior-wall-paint",
];

const FIXTURE_SUBS = [
  "range",
  "kitchen-cabinet-hardware",
  "kitchen-faucet",
  "kitchen-sink",
];

const SPECIALTY_SUBS = [
  "backsplash",
];

// Default selections — uses actual SM DB option slugs
const DEFAULT_SELECTIONS: Record<string, string> = {
  "kitchen-cabinet-color": "kitchen-cab-color-onyx",
  "kitchen-island-cabinet-color": "island-color-driftwood",
  "counter-top": "ct-quartz-calacatta-duolina",
  "kitchen-cabinet-hardware": "hw-naples-pull-knob-brushed-gold",
  "kitchen-faucet": "faucet-stellen-black",
  "kitchen-sink": "sink-egranite-anthracite",
  "interior-wall-paint": "wp-sw-agreeable-gray",
  "primary-flooring": "fl-coretec-virtue-oak",
  "backsplash": "bs-baker-4x16-taupe",
  "range": "range-ge-gas-slide-in",
};

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.split("=")[1];
  return undefined;
}

const baselinePath = getArg("baseline");
const useStain = hasFlag("stain");
const structuralOnly = hasFlag("structural-only");
const skipSinglePass = hasFlag("skip-single-pass") || !!baselinePath;

// Stain variant — --stain defaults to driftwood, --stain-color for both, --perimeter/--island for two-tone
const stainColor = getArg("stain-color") || "driftwood";
const perimeterColor = getArg("perimeter") || stainColor;
const islandColor = getArg("island") || stainColor;
const STAIN_OVERRIDES: Record<string, string> = {
  "kitchen-cabinet-color": `kitchen-cab-color-${perimeterColor}`,
  "kitchen-island-cabinet-color": `island-color-${islandColor}`,
};

// Build active selections
const SELECTIONS: Record<string, string> = { ...DEFAULT_SELECTIONS };
if (useStain) {
  Object.assign(SELECTIONS, STAIN_OVERRIDES);
}

// Output dir — readable name so you can tell runs apart in Finder
const twoTone = perimeterColor !== islandColor;
const variant = useStain
  ? (twoTone ? `twotone-${perimeterColor}-${islandColor}` : `stain-${perimeterColor}`)
  : "default";
const flags = [
  structuralOnly ? "struct-only" : "full-chain",
  skipSinglePass ? "no-baseline" : "with-baseline",
].join("-");
const runId = new Date().toISOString().replace(/[:.]/g, "").slice(11, 17); // HHmmss
const OUTPUT_DIR = path.join(__dirname, "multi-pass-test-outputs", `${variant}-${flags}-${runId}`);
fs.mkdirSync(path.join(OUTPUT_DIR, "prompts"), { recursive: true });

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
// Data fetching (same pattern as other test scripts)
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
      id: step.id, name: step.name, slug: step.slug,
      sceneDescription: step.scene_description as string | null,
      spatialHints: step.spatial_hints as Record<string, string> | null,
      sections: ((step.sections ?? []) as Array<{ subcategory_ids?: string[] }>),
    },
  };
}

async function loadOptionLookup(orgId: string) {
  const { data: cats, error } = await supabase
    .from("categories")
    .select(`
      id, slug, name, sort_order,
      subcategories (
        id, slug, name, category_id, is_visual, is_additive, unit_label, max_quantity, sort_order,
        generation_hint, generation_rules, generation_rules_when_not_selected, is_appliance,
        options ( id, slug, name, price, prompt_descriptor, dimensions, swatch_url, swatch_color, nudge, sort_order, generation_rules, is_default, linked_to_subcategory, needs_isolation )
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
          linkedToSubcategory: opt.linked_to_subcategory ?? undefined,
          needsIsolation: opt.needs_isolation || undefined,
        };
        optionLookup.set(`${sub.slug}:${opt.slug}`, { option, subCategory });
      }
    }
  }
  return optionLookup;
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
// Generation helpers
// ---------------------------------------------------------------------------
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
      }),
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

async function generateWithFlash(
  imageBuffer: Buffer,
  prompt: string,
  swatches: Array<{ buffer: Buffer; mediaType: string }>,
): Promise<{ imageBuffer: Buffer; durationMs: number }> {
  const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [
    { text: prompt },
    { inlineData: { mimeType: "image/jpeg", data: imageBuffer.toString("base64") } },
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
      const rawBuffer = Buffer.from((part as any).inlineData.data, "base64");
      // Resize to match OpenAI output dimensions
      const resized = await sharp(rawBuffer)
        .resize(1536, 1024, { fit: "fill" })
        .jpeg({ quality: 90 })
        .toBuffer();
      return { imageBuffer: resized, durationMs };
    }
  }
  throw new Error("No image in Flash response");
}

// ---------------------------------------------------------------------------
// Pass helpers
// ---------------------------------------------------------------------------
function filterSelections(
  allSelections: Record<string, string>,
  subcategoryIds: string[],
): Record<string, string> {
  const subSet = new Set(subcategoryIds);
  const filtered: Record<string, string> = {};
  for (const [subId, optId] of Object.entries(allSelections)) {
    if (subSet.has(subId)) filtered[subId] = optId;
  }
  return filtered;
}

function filterSpatialHints(
  allHints: Record<string, string>,
  subcategoryIds: string[],
): Record<string, string> {
  const subSet = new Set(subcategoryIds);
  const filtered: Record<string, string> = {};
  for (const [subId, hint] of Object.entries(allHints)) {
    if (subSet.has(subId)) filtered[subId] = hint;
  }
  return filtered;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Multi-Pass Pipeline R&D Test ===");
  console.log(`Variant: ${useStain ? "STAIN CABINETS" : "default selections"}`);
  console.log(`Structural only: ${structuralOnly}`);
  console.log(`Skip single pass: ${skipSinglePass}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // Load data
  const { org, floorplan } = await getOrgAndFloorplan();
  console.log(`Org: ${org.name} | Floorplan: ${floorplan.name}`);

  const photo = await getTargetPhoto(floorplan.id);
  const optionLookup = await loadOptionLookup(org.id);
  console.log(`Photo: ${photo.step.name} — ${photo.imagePath}`);
  console.log(`Options loaded: ${optionLookup.size} entries`);

  // Resolve photo scope
  const sectionSubIds = photo.step.sections.flatMap(s => s.subcategory_ids ?? []);
  const photoScopedIds = getPhotoScopedIds(photo.subcategoryIds, sectionSubIds);
  const scopedSubcategoryIds = photoScopedIds ? [...photoScopedIds] : [];
  const allSpatialHints = photoScopedIds
    ? Object.fromEntries(Object.entries(photo.step.spatialHints || {}).filter(([k]) => photoScopedIds.has(k)))
    : { ...(photo.step.spatialHints || {}) };
  const sceneDescription = photo.photoBaseline?.trim() || photo.step.sceneDescription?.trim() || null;

  // Resolve linked options (mutates selections + hints + optionLookup in place)
  const selections = { ...SELECTIONS };
  resolveLinkedOptions(selections, optionLookup, allSpatialHints);

  // Resolve generation policy
  const dbPolicy = await getStepPhotoGenerationPolicy(org.id, photo.photoId);
  const resolvedPolicy = resolvePhotoGenerationPolicy({
    orgSlug: SM_ORG_SLUG, floorplanSlug: KINKADE_SLUG,
    stepSlug: photo.step.slug, stepPhotoId: photo.photoId,
    imagePath: photo.imagePath, modelName: OPENAI_MODEL,
    selections,
  }, dbPolicy);

  // Log selections per pass
  const structuralSels = filterSelections(selections, STRUCTURAL_SUBS);
  const fixtureSels = filterSelections(selections, FIXTURE_SUBS);
  const specialtySels = filterSelections(selections, SPECIALTY_SUBS);

  console.log(`\nStructural (${Object.keys(structuralSels).length} surfaces):`);
  for (const [sub, opt] of Object.entries(structuralSels)) {
    const entry = optionLookup.get(`${sub}:${opt}`);
    console.log(`  ${sub}: ${entry?.option.name ?? opt}`);
  }
  console.log(`Fixtures (${Object.keys(fixtureSels).length} surfaces):`);
  for (const [sub, opt] of Object.entries(fixtureSels)) {
    const entry = optionLookup.get(`${sub}:${opt}`);
    console.log(`  ${sub}: ${entry?.option.name ?? opt}`);
  }
  console.log(`Specialty (${Object.keys(specialtySels).length} surfaces):`);
  for (const [sub, opt] of Object.entries(specialtySels)) {
    const entry = optionLookup.get(`${sub}:${opt}`);
    console.log(`  ${sub}: ${entry?.option.name ?? opt}`);
  }
  console.log();

  // Download room photo
  const { data: imageData, error: dlErr } = await supabase.storage.from("rooms").download(photo.imagePath);
  if (dlErr || !imageData) throw new Error(`Failed to download room photo: ${dlErr?.message}`);
  const roomBuffer = Buffer.from(await imageData.arrayBuffer());
  const roomMime = photo.imagePath.endsWith(".webp") ? "image/webp" : "image/png";
  const roomFilename = photo.imagePath.split("/").pop() || "room.webp";

  // Save original photo for reference
  fs.writeFileSync(path.join(OUTPUT_DIR, "00_original.webp"), roomBuffer);

  const results: Array<{ step: string; durationMs: number; swatchCount: number; promptLength: number }> = [];

  // =========================================================================
  // STEP A: Single-pass baseline (current pipeline)
  // =========================================================================
  let singlePassBuffer: Buffer | null = null;

  if (baselinePath) {
    console.log(`Loading baseline from: ${baselinePath}`);
    singlePassBuffer = fs.readFileSync(baselinePath);
    fs.writeFileSync(path.join(OUTPUT_DIR, "01_single_pass.jpg"), singlePassBuffer);
    console.log("Baseline loaded.\n");
  } else if (!skipSinglePass) {
    console.log("=".repeat(60));
    console.log("  SINGLE PASS: current pipeline (all swatches → 1.5)");
    console.log("=".repeat(60));

    const { prompt, swatches } = await buildEditPrompt(
      selections, optionLookup, allSpatialHints, scopedSubcategoryIds,
      sceneDescription, photo.spatialHint, resolveSwatchBuffer, resolvedPolicy.promptOverrides,
    );

    fs.writeFileSync(path.join(OUTPUT_DIR, "prompts", "01_single_pass.txt"), prompt);
    console.log(`  Prompt: ${prompt.length} chars, ${swatches.length} swatches`);

    const result = await generateWithOpenAI(roomBuffer, roomMime, roomFilename, prompt, swatches);
    singlePassBuffer = result.imageBuffer;

    const jpegBuffer = await sharp(result.imageBuffer).jpeg({ quality: 90 }).toBuffer();
    fs.writeFileSync(path.join(OUTPUT_DIR, "01_single_pass.jpg"), jpegBuffer);
    console.log(`  Done in ${(result.durationMs / 1000).toFixed(1)}s\n`);

    results.push({ step: "single-pass", durationMs: result.durationMs, swatchCount: swatches.length, promptLength: prompt.length });
  }

  // =========================================================================
  // STEP B: Multi-pass — Structural
  // =========================================================================
  console.log("=".repeat(60));
  console.log("  PASS 1: STRUCTURAL (cabinets, counter, floor, paint → 1.5)");
  console.log("=".repeat(60));

  const structuralHints = filterSpatialHints(allSpatialHints, STRUCTURAL_SUBS);
  // Scope to structural subcategories — negative guards fire for fixture/specialty subs NOT selected
  const structuralScopedIds = scopedSubcategoryIds.filter(id => STRUCTURAL_SUBS.includes(id));

  const { prompt: structPrompt, swatches: structSwatches } = await buildEditPrompt(
    structuralSels, optionLookup, structuralHints, structuralScopedIds,
    sceneDescription, photo.spatialHint, resolveSwatchBuffer, resolvedPolicy.promptOverrides,
  );

  fs.writeFileSync(path.join(OUTPUT_DIR, "prompts", "02_structural.txt"), structPrompt);
  console.log(`  Prompt: ${structPrompt.length} chars, ${structSwatches.length} swatches`);

  const structResult = await generateWithOpenAI(roomBuffer, roomMime, roomFilename, structPrompt, structSwatches);
  const structJpeg = await sharp(structResult.imageBuffer).jpeg({ quality: 90 }).toBuffer();
  fs.writeFileSync(path.join(OUTPUT_DIR, "02_structural.jpg"), structJpeg);
  console.log(`  Done in ${(structResult.durationMs / 1000).toFixed(1)}s\n`);

  results.push({ step: "structural", durationMs: structResult.durationMs, swatchCount: structSwatches.length, promptLength: structPrompt.length });

  if (structuralOnly) {
    printSummary(results);
    return;
  }

  // =========================================================================
  // STEP C: Multi-pass — Fixtures (on structural output)
  // =========================================================================
  console.log("=".repeat(60));
  console.log("  PASS 2: FIXTURES (appliances, hardware, sink → 1.5)");
  console.log("=".repeat(60));

  const fixtureHints = filterSpatialHints(allSpatialHints, FIXTURE_SUBS);
  const fixtureScopedIds = scopedSubcategoryIds.filter(id => FIXTURE_SUBS.includes(id));

  const { prompt: fixturePrompt, swatches: fixtureSwatches } = await buildEditPrompt(
    fixtureSels, optionLookup, fixtureHints, fixtureScopedIds,
    sceneDescription, photo.spatialHint, resolveSwatchBuffer, resolvedPolicy.promptOverrides,
  );

  fs.writeFileSync(path.join(OUTPUT_DIR, "prompts", "03_fixtures.txt"), fixturePrompt);
  console.log(`  Prompt: ${fixturePrompt.length} chars, ${fixtureSwatches.length} swatches`);

  // Feed structural output as the input image
  const fixtureResult = await generateWithOpenAI(structJpeg, "image/jpeg", "structural.jpg", fixturePrompt, fixtureSwatches);
  const fixtureJpeg = await sharp(fixtureResult.imageBuffer).jpeg({ quality: 90 }).toBuffer();
  fs.writeFileSync(path.join(OUTPUT_DIR, "03_fixtures.jpg"), fixtureJpeg);
  console.log(`  Done in ${(fixtureResult.durationMs / 1000).toFixed(1)}s\n`);

  results.push({ step: "fixtures", durationMs: fixtureResult.durationMs, swatchCount: fixtureSwatches.length, promptLength: fixturePrompt.length });

  // =========================================================================
  // STEP D: Multi-pass — Specialty (backsplash → Flash on fixtures output)
  // =========================================================================
  console.log("=".repeat(60));
  console.log(`  PASS 3: SPECIALTY (backsplash → ${FLASH_MODEL})`);
  console.log("=".repeat(60));

  const specialtyHints = filterSpatialHints(allSpatialHints, SPECIALTY_SUBS);
  const specialtyScopedIds = scopedSubcategoryIds.filter(id => SPECIALTY_SUBS.includes(id));

  // Build the specialty prompt — use the Flash-style isolation prompt
  // (Gemini needs heavier preservation guardrails than 1.5)
  const specialtyEntries: Array<{
    subId: string; optId: string;
    option: Option; subCategory: SubCategory;
  }> = [];
  for (const [subId, optId] of Object.entries(specialtySels)) {
    const entry = optionLookup.get(`${subId}:${optId}`);
    if (entry) specialtyEntries.push({ subId, optId, option: entry.option, subCategory: entry.subCategory });
  }

  const specialtySwatches: Array<{ buffer: Buffer; mediaType: string }> = [];
  const specialtyLines: string[] = [];
  const specialtyRules: string[] = [];
  let swIdx = 1;

  for (const { option, subCategory, subId } of specialtyEntries) {
    for (const r of subCategory.generationRules ?? []) specialtyRules.push(r);
    for (const r of option.generationRules ?? []) specialtyRules.push(r);

    const hint = specialtyHints[subId];
    const target = hint ? `${subCategory.name} → apply to ${hint}` : subCategory.name;
    const dimSuffix = option.dimensions?.trim() ? `; dimensions: ${option.dimensions.trim()}` : "";

    if (option.swatchUrl) {
      const resolved = await resolveSwatchBuffer(option.swatchUrl);
      if (resolved) {
        specialtySwatches.push(resolved);
        specialtyLines.push(`${swIdx}. ${target}${dimSuffix} (use swatch #${swIdx})`);
        swIdx += 1;
      }
    }
  }

  // Negative guards for specialty scope
  for (const subId of specialtyScopedIds) {
    if (subId in specialtySels) continue;
    for (const [, { subCategory }] of optionLookup) {
      if (subCategory.id === subId && subCategory.generationRulesWhenNotSelected?.length) {
        for (const r of subCategory.generationRulesWhenNotSelected) specialtyRules.push(r);
        break;
      }
    }
  }

  const rulesBlock = specialtyRules.length > 0
    ? `\n\nRULES:\n${specialtyRules.map(r => `- ${r}`).join("\n")}`
    : "";

  const specialtyPrompt = `Edit this room photo. Change ONLY the surface(s) listed below. Every other pixel in the image must remain identical — do not add, remove, or alter any objects, appliances, fixtures, shelves, pantry contents, doorways, alcoves, or other surfaces.

${specialtyLines.join("\n")}

Swatch mapping: after the room photo, attached swatches are ordered #1..#${specialtySwatches.length}.
Match each swatch's color, pattern, and texture EXACTLY on its specified surface.
Do NOT extend tile below the countertop or beyond the backsplash zone.${rulesBlock}`;

  fs.writeFileSync(path.join(OUTPUT_DIR, "prompts", "04_specialty.txt"), specialtyPrompt);
  console.log(`  Prompt: ${specialtyPrompt.length} chars, ${specialtySwatches.length} swatches`);

  const specialtyResult = await generateWithFlash(fixtureJpeg, specialtyPrompt, specialtySwatches);
  fs.writeFileSync(path.join(OUTPUT_DIR, "04_specialty.jpg"), specialtyResult.imageBuffer);
  console.log(`  Done in ${(specialtyResult.durationMs / 1000).toFixed(1)}s\n`);

  results.push({ step: "specialty", durationMs: specialtyResult.durationMs, swatchCount: specialtySwatches.length, promptLength: specialtyPrompt.length });

  // =========================================================================
  // Summary
  // =========================================================================
  printSummary(results);
}

function printSummary(results: Array<{ step: string; durationMs: number; swatchCount: number; promptLength: number }>) {
  console.log("=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  const singlePass = results.find(r => r.step === "single-pass");
  const multiPassSteps = results.filter(r => r.step !== "single-pass");
  const multiPassTotal = multiPassSteps.reduce((sum, r) => sum + r.durationMs, 0);

  console.log();
  for (const r of results) {
    console.log(`  ${r.step.padEnd(15)} ${(r.durationMs / 1000).toFixed(1).padStart(6)}s  ${r.swatchCount} swatches  ${r.promptLength} chars`);
  }

  if (multiPassSteps.length > 0) {
    console.log(`  ${"─".repeat(45)}`);
    console.log(`  ${"multi-pass".padEnd(15)} ${(multiPassTotal / 1000).toFixed(1).padStart(6)}s total`);
  }

  if (singlePass && multiPassSteps.length > 0) {
    const diff = multiPassTotal - singlePass.durationMs;
    const sign = diff > 0 ? "+" : "";
    console.log(`  ${"delta".padEnd(15)} ${sign}${(diff / 1000).toFixed(1).padStart(5)}s vs single-pass`);
  }

  console.log();
  console.log(`Output: ${OUTPUT_DIR}/`);
  console.log();
  console.log("EVALUATION CHECKLIST:");
  console.log("  Compare 01_single_pass.jpg vs 04_specialty.jpg (or last multi-pass output):");
  console.log("  [ ] Cabinet color accuracy (especially stain if --stain)");
  console.log("  [ ] Countertop appearance matches swatch");
  console.log("  [ ] Flooring appearance matches swatch");
  console.log("  [ ] Wall paint correct color");
  console.log("  [ ] Appliances correctly placed (fridge in alcove, range in position)");
  console.log("  [ ] Backsplash tile pattern + color correct");
  console.log("  [ ] No visual drift / quality degradation across passes");
  console.log("  [ ] Room layout / camera angle preserved through all passes");
  console.log("  [ ] No hallucinated objects (pantry food, extra appliances, etc.)");

  if (useStain) {
    console.log();
    console.log("  STAIN-SPECIFIC:");
    console.log("  [ ] Driftwood stain ACTUALLY applied to perimeter cabinets (not under-applied)?");
    console.log("  [ ] Wood grain texture visible on cabinet doors?");
    console.log("  [ ] If yes: Pro post-pass may be UNNECESSARY with fewer swatches");
  }

  // Save results JSON
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "results.json"),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      variant: useStain ? "stain" : "default",
      structuralOnly,
      models: { openai: OPENAI_MODEL, flash: FLASH_MODEL },
      selections: SELECTIONS,
      passGroups: {
        structural: STRUCTURAL_SUBS,
        fixtures: FIXTURE_SUBS,
        specialty: SPECIALTY_SUBS,
      },
      results,
      multiPassTotalMs: results.filter(r => r.step !== "single-pass").reduce((s, r) => s + r.durationMs, 0),
    }, null, 2),
  );
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
