#!/usr/bin/env npx tsx
/**
 * Flash Scoped Edit Test — Multi-Pass Backsplash Preservation
 *
 * Tests whether Flash (Gemini) can do scoped single-surface edits on a
 * multi-pass output WITHOUT destroying the specialty backsplash pattern.
 *
 * The problem: 1.5 scoped edits destroy herringbone/picket backsplash patterns
 * that were applied by the Flash specialty pass. If Flash can do the scoped edit
 * instead, we don't need a cleanup pass.
 *
 * Flow:
 *   1. Load a multi-pass baseline with herringbone backsplash (--baseline or generate)
 *   2. For each surface, run a Flash scoped edit using production buildScopedEditPrompt
 *   3. Optionally run 1.5 on the same surface for comparison (--compare)
 *   4. Save all outputs for visual comparison
 *
 * Usage:
 *   npx tsx scripts/test-flash-scoped-edit.ts --baseline path/to/multipass-output.jpg
 *   npx tsx scripts/test-flash-scoped-edit.ts --baseline path/to/multipass-output.jpg --compare
 *   npx tsx scripts/test-flash-scoped-edit.ts --baseline path/to/multipass-output.jpg --surfaces oven,countertop
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

import { buildScopedEditPrompt, type SwatchBufferResolver } from "@/lib/generate";
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

// Selections matching the baseline image (e6da9614339b84c3) — herringbone backsplash, freestanding range
const BASELINE_SELECTIONS: Record<string, string> = {
  "kitchen-cabinet-color": "kitchen-cab-color-buttercream",
  "kitchen-island-cabinet-color": "island-color-blue-smoke",
  "counter-top": "ct-quartz-pure-white",
  "countertop-edge": "edge-no-upgrade",
  "kitchen-cabinet-hardware": "hw-naples-pull-knob-brushed-gold",
  "kitchen-faucet": "faucet-pfirst-ss",
  "kitchen-sink": "sink-high-divide-60-40",
  "common-wall-paint": "wall-delicate-white",
  "main-area-flooring-color": "floor-color-polaris-toasted-taupe",
  "backsplash": "bs-baker-herringbone-white",
  "range": "range-ge-included-freestanding",
  "lighting": "lighting-satin-nickel-wh",
  "refrigerator": "refrigerator-ge-french-door",
};

// Scoped edit tests: change one surface at a time, verify backsplash survives
interface ScopedTest {
  key: string;
  label: string;
  changedSubcategoryId: string;
  changedOptionId: string; // the NEW option to apply
}

const SCOPED_TESTS: ScopedTest[] = [
  {
    key: "oven",
    label: "Add slide-in oven (the failing case)",
    changedSubcategoryId: "range",
    changedOptionId: "range-ge-gas-slide-in",
  },
  {
    key: "countertop",
    label: "Change countertop",
    changedSubcategoryId: "counter-top",
    changedOptionId: "ct-quartz-calacatta-duolina",
  },
  {
    key: "hardware",
    label: "Change cabinet hardware",
    changedSubcategoryId: "kitchen-cabinet-hardware",
    changedOptionId: "hw-naples-pull-knob-matte-black",
  },
  {
    key: "cabinets",
    label: "Change perimeter cabinet color",
    changedSubcategoryId: "kitchen-cabinet-color",
    changedOptionId: "kitchen-cab-color-onyx",
  },
  {
    key: "paint",
    label: "Change wall paint",
    changedSubcategoryId: "common-wall-paint",
    changedOptionId: "wall-in-the-cloud",
  },
  {
    key: "flooring",
    label: "Change flooring",
    changedSubcategoryId: "main-area-flooring-color",
    changedOptionId: "floor-color-homestead-wingback-brown",
  },
];


// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith("--")) return args[idx + 1];
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.split("=")[1];
  return undefined;
}

const hasFlag = (name: string) => args.includes(`--${name}`);

const baselinePath = getArg("baseline");
const surfaceFilter = getArg("surfaces")?.split(",").map(s => s.trim());
const compareWith15 = hasFlag("compare");

const activeSurfaces = surfaceFilter
  ? SCOPED_TESTS.filter(t => surfaceFilter.includes(t.key))
  : SCOPED_TESTS;

if (activeSurfaces.length === 0) {
  console.error(`No matching surfaces. Available: ${SCOPED_TESTS.map(t => t.key).join(", ")}`);
  process.exit(1);
}

// Output dir
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUTPUT_DIR = path.join(__dirname, "flash-scoped-edit-outputs", timestamp);
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
        options ( id, slug, name, price, prompt_descriptor, dimensions, swatch_url, swatch_color, nudge, sort_order, generation_rules, is_default, needs_isolation, linked_to_subcategory )
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
          isDefault: opt.is_default || undefined, needsIsolation: opt.needs_isolation || undefined,
          linkedToSubcategory: opt.linked_to_subcategory ?? undefined,
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
    return { buffer: await sharp(rawBuffer).png().toBuffer(), mediaType: "image/png" };
  }
  return { buffer: rawBuffer, mediaType: ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}` };
};

// ---------------------------------------------------------------------------
// Generation helpers
// ---------------------------------------------------------------------------
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
      const resized = await sharp(rawBuffer).resize(1536, 1024, { fit: "fill" }).jpeg({ quality: 90 }).toBuffer();
      return { imageBuffer: resized, durationMs };
    }
  }
  throw new Error("No image in Flash response");
}

async function generateWithOpenAI(
  imageBuffer: Buffer,
  prompt: string,
  swatches: Array<{ buffer: Buffer; mediaType: string; label: string }>,
): Promise<{ imageBuffer: Buffer; durationMs: number }> {
  const supportedSwatches = swatches.filter(s => ["image/jpeg", "image/png", "image/webp"].includes(s.mediaType));
  const inputImages = [
    await toFile(imageBuffer, "base.jpg", { type: "image/jpeg" }),
    ...await Promise.all(
      supportedSwatches.map(s => {
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
  const data = result.data?.[0];
  if (!data?.b64_json) throw new Error("No image from OpenAI");
  return { imageBuffer: Buffer.from(data.b64_json, "base64"), durationMs };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Flash Scoped Edit Test — Multi-Pass Backsplash Preservation ===");
  console.log(`Surfaces: ${activeSurfaces.map(s => s.key).join(", ")}`);
  console.log(`Compare with 1.5: ${compareWith15 ? "YES" : "no (use --compare)"}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // Load data
  const { org, floorplan } = await getOrgAndFloorplan();
  console.log(`Org: ${org.name} | Floorplan: ${floorplan.name}`);

  const photo = await getTargetPhoto(floorplan.id);
  const optionLookup = await loadOptionLookup(org.id);
  console.log(`Photo: ${photo.step.name} — ${photo.imagePath}`);
  console.log(`Options loaded: ${optionLookup.size} entries\n`);

  // Resolve photo scoping
  const sectionSubIds = photo.step.sections.flatMap(s => s.subcategory_ids ?? []);
  const photoScopedIds = getPhotoScopedIds(photo.subcategoryIds, sectionSubIds);
  const scopedSubcategoryIds = photoScopedIds ? [...photoScopedIds] : [];
  const allSpatialHints = photoScopedIds
    ? Object.fromEntries(Object.entries(photo.step.spatialHints || {}).filter(([k]) => photoScopedIds.has(k)))
    : { ...(photo.step.spatialHints || {}) };
  const sceneDescription = photo.photoBaseline?.trim() || photo.step.sceneDescription?.trim() || null;

  // Get policy for prompt overrides
  const dbPolicy = await getStepPhotoGenerationPolicy(org.id, photo.photoId);
  const resolvedPolicy = resolvePhotoGenerationPolicy({
    orgSlug: SM_ORG_SLUG, floorplanSlug: KINKADE_SLUG,
    stepSlug: photo.step.slug, stepPhotoId: photo.photoId,
    imagePath: photo.imagePath, modelName: OPENAI_MODEL,
    selections: BASELINE_SELECTIONS,
  }, dbPolicy);

  // =========================================================================
  // STEP 1: Load baseline
  // =========================================================================
  let baselineBuffer: Buffer;

  if (baselinePath) {
    console.log(`Loading baseline from: ${baselinePath}`);
    baselineBuffer = fs.readFileSync(baselinePath);
    // Convert to JPEG for consistent input
    baselineBuffer = await sharp(baselineBuffer).jpeg({ quality: 95 }).toBuffer();
    fs.writeFileSync(path.join(OUTPUT_DIR, "00_baseline.jpg"), baselineBuffer);
    console.log("Baseline loaded.\n");
  } else {
    console.error("ERROR: --baseline is required. Provide a multi-pass output with herringbone backsplash.");
    console.error("Generate one via the SM demo, or use a cached image from Supabase storage.");
    process.exit(1);
  }

  // =========================================================================
  // STEP 2: Run scoped edits
  // =========================================================================
  const results: Array<{
    surface: string;
    label: string;
    flashDurationMs: number;
    openaiDurationMs?: number;
  }> = [];

  for (let i = 0; i < activeSurfaces.length; i++) {
    const test = activeSurfaces[i];
    const idx = String(i + 1).padStart(2, "0");

    console.log(`${"=".repeat(60)}`);
    console.log(`  ${idx}. ${test.label}`);
    console.log(`  ${test.changedSubcategoryId} → ${test.changedOptionId}`);
    console.log(`${"=".repeat(60)}`);

    // Selections context for the prompt — always the baseline (freestanding range)
    const selectionsForPrompt = BASELINE_SELECTIONS;

    // Build prompt using production buildScopedEditPrompt
    const { prompt, swatches } = await buildScopedEditPrompt(
      test.changedSubcategoryId,
      test.changedOptionId,
      selectionsForPrompt,
      optionLookup,
      allSpatialHints,
      scopedSubcategoryIds,
      sceneDescription,
      photo.spatialHint,
      resolveSwatchBuffer,
      resolvedPolicy.promptOverrides,
    );

    fs.writeFileSync(path.join(OUTPUT_DIR, "prompts", `${idx}_${test.key}_flash.txt`), prompt);
    console.log(`  Prompt: ${prompt.length} chars, ${swatches.length} swatches`);

    // --- Flash scoped edit ---
    console.log(`  Running Flash scoped edit...`);
    const flashSwatches = swatches.map(s => ({ buffer: s.buffer, mediaType: s.mediaType }));
    const flashResult = await generateWithFlash(baselineBuffer, prompt, flashSwatches);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${idx}_${test.key}_flash.jpg`), flashResult.imageBuffer);
    console.log(`  Flash: ${(flashResult.durationMs / 1000).toFixed(1)}s`);

    let openaiDurationMs: number | undefined;

    // --- 1.5 comparison (optional) ---
    if (compareWith15) {
      console.log(`  Running 1.5 scoped edit for comparison...`);
      const openaiResult = await generateWithOpenAI(baselineBuffer, prompt, swatches);
      fs.writeFileSync(path.join(OUTPUT_DIR, `${idx}_${test.key}_openai.jpg`), openaiResult.imageBuffer);
      openaiDurationMs = openaiResult.durationMs;
      console.log(`  1.5: ${(openaiResult.durationMs / 1000).toFixed(1)}s`);
    }

    console.log();
    results.push({
      surface: test.key,
      label: test.label,
      flashDurationMs: flashResult.durationMs,
      openaiDurationMs,
    });
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log(`${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log(`${"=".repeat(60)}`);
  console.log(`Surfaces tested: ${results.length}\n`);

  for (const r of results) {
    const flashTime = `Flash: ${(r.flashDurationMs / 1000).toFixed(1)}s`;
    const openaiTime = r.openaiDurationMs ? ` | 1.5: ${(r.openaiDurationMs / 1000).toFixed(1)}s` : "";
    console.log(`  ${r.surface}: ${flashTime}${openaiTime}`);
  }

  const avgFlash = results.reduce((sum, r) => sum + r.flashDurationMs, 0) / results.length;
  console.log(`\n  Average Flash: ${(avgFlash / 1000).toFixed(1)}s`);
  if (compareWith15) {
    const avgOpenai = results.reduce((sum, r) => sum + (r.openaiDurationMs ?? 0), 0) / results.length;
    console.log(`  Average 1.5:   ${(avgOpenai / 1000).toFixed(1)}s`);
  }

  console.log(`\nOutput: ${OUTPUT_DIR}/`);
  console.log();
  console.log("EVALUATION CHECKLIST (compare each output against 00_baseline.jpg):");
  console.log("  For each surface edit:");
  console.log("  [ ] Target surface changed correctly?");
  console.log("  [ ] HERRINGBONE BACKSPLASH preserved? (this is the main test)");
  console.log("  [ ] All other surfaces unchanged?");
  console.log("  [ ] No tile in closet/pantry/non-backsplash areas?");
  console.log("  [ ] Room layout, perspective, lighting preserved?");

  // Save results JSON
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "results.json"),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      flashModel: FLASH_MODEL,
      openaiModel: OPENAI_MODEL,
      compareWith15,
      baselineSelections: BASELINE_SELECTIONS,
      baselinePath,
      surfaces: results,
      avgFlashDurationMs: Math.round(avgFlash),
    }, null, 2),
  );
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
