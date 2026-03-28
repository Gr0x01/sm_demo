#!/usr/bin/env npx tsx
/**
 * Scoped Surface Edit Test
 *
 * Tests whether Flash can change a SINGLE surface in an already-generated
 * kitchen image without destroying the others. This validates the core
 * assumption behind the partial cache architecture.
 *
 * Flow:
 *   1. Generate a baseline image (1.5, all selections) — or load from disk
 *   2. For each surface, run a Flash scoped edit changing only that surface
 *   3. Save all outputs for visual comparison
 *
 * Usage:
 *   npx tsx scripts/test-scoped-surface-edit.ts
 *   npx tsx scripts/test-scoped-surface-edit.ts --baseline path/to/existing.png
 *   npx tsx scripts/test-scoped-surface-edit.ts --surfaces walls,flooring
 *   npx tsx scripts/test-scoped-surface-edit.ts --walls wp-sw-accessible-beige
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

// Baseline selections (same as two-pass test — known good combo)
const BASELINE_SELECTIONS: Record<string, string> = {
  "kitchen-cabinet-color": "kitchen-cab-color-onyx",
  "kitchen-island-cabinet-color": "island-color-driftwood",
  "counter-top": "ct-quartz-calacatta-duolina",
  "kitchen-cabinet-hardware": "hw-naples-pull-knob-brushed-gold",
  "kitchen-faucet": "faucet-moen-sleek-matte-black",
  "kitchen-sink": "sink-karran-black",
  "interior-wall-paint": "wp-sw-agreeable-gray",
  "primary-flooring": "fl-coretec-virtue-oak",
  "backsplash": "bs-baker-4x16-taupe",
  "range": "range-slide-in-ss",
};

// Surfaces to test scoped edits on.
// alternateSlug will be auto-discovered from DB if not set via CLI.
interface SurfaceTest {
  key: string;
  label: string;
  subSlug: string;
  baselineOptSlug: string;
  alternateOptSlug: string | null; // null = auto-pick from DB
  spatialContext: string;
  preserveList: string[];
}

const SURFACE_TESTS: SurfaceTest[] = [
  {
    key: "walls",
    label: "Wall Paint",
    subSlug: "common-wall-paint",
    baselineOptSlug: "wall-in-the-cloud",
    alternateOptSlug: null,
    spatialContext: "Walls visible above the backsplash, around windows, and above upper cabinets",
    preserveList: [
      "Cabinet color and door panel style (both perimeter and island)",
      "Countertop material, color, and edge profile",
      "Backsplash tile pattern, color, and grout",
      "Flooring material, color, and plank direction",
      "All appliances, fixtures, hardware, and lighting",
    ],
  },
  {
    key: "flooring",
    label: "Flooring",
    subSlug: "main-area-flooring-color",
    baselineOptSlug: "floor-color-polaris-sea-glass",
    alternateOptSlug: "floor-color-homestead-wingback-brown",
    spatialContext: "Floor surface covering the entire kitchen floor area, bounded by baseboards and cabinet toe kicks",
    preserveList: [
      "Cabinet color and door panel style (both perimeter and island)",
      "Countertop material, color, and edge profile",
      "Backsplash tile pattern, color, and grout",
      "Wall paint color",
      "All appliances, fixtures, hardware, and lighting",
    ],
  },
  {
    key: "countertop",
    label: "Countertop",
    subSlug: "counter-top",
    baselineOptSlug: "ct-quartz-calacatta-duolina",
    alternateOptSlug: null,
    spatialContext: "Countertop surfaces on top of perimeter base cabinets and the kitchen island",
    preserveList: [
      "Cabinet color and door panel style (both perimeter and island)",
      "Backsplash tile pattern, color, and grout",
      "Flooring material, color, and plank direction",
      "Wall paint color",
      "All appliances, fixtures, hardware, and lighting",
    ],
  },
  {
    key: "cabinets",
    label: "Cabinet Color",
    subSlug: "kitchen-cabinet-color",
    baselineOptSlug: "kitchen-cab-color-onyx",
    alternateOptSlug: null,
    spatialContext: "All perimeter wall cabinet door and drawer fronts (upper and lower). NOT the island — island stays as-is",
    preserveList: [
      "Island cabinet color (keep current color exactly)",
      "Countertop material, color, and edge profile",
      "Backsplash tile pattern, color, and grout",
      "Flooring material, color, and plank direction",
      "Wall paint color",
      "Cabinet door panel style (shaker profile), hardware, and hinges",
      "All appliances, fixtures, and lighting",
    ],
  },
];

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.split("=")[1];
  return undefined;
}

const baselinePath = getArg("baseline");
const surfaceFilter = getArg("surfaces")?.split(",").map(s => s.trim());
const scopedEditModel = getArg("model") === "1.5" ? "1.5" : "flash";

// Apply CLI overrides for alternate options
for (const test of SURFACE_TESTS) {
  const override = getArg(test.key);
  if (override) test.alternateOptSlug = override;
}

// Filter surfaces if specified
const activeSurfaces = surfaceFilter
  ? SURFACE_TESTS.filter(t => surfaceFilter.includes(t.key))
  : SURFACE_TESTS;

if (activeSurfaces.length === 0) {
  console.error(`No matching surfaces. Available: ${SURFACE_TESTS.map(t => t.key).join(", ")}`);
  process.exit(1);
}

// Output dir
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const OUTPUT_DIR = path.join(__dirname, "scoped-edit-test-outputs", timestamp);
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
// Data fetching (same pattern as two-pass test)
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
// Swatch resolution for test options
// ---------------------------------------------------------------------------
async function resolveOptionSwatch(
  option: Option,
): Promise<{ buffer: Buffer; mediaType: string } | null> {
  // Try swatch image first
  if (option.swatchUrl) {
    const resolved = await resolveSwatchBuffer(option.swatchUrl);
    if (resolved) return resolved;
  }
  // Fall back to solid-color swatch from hex
  if (option.swatchColor?.trim()) {
    return createSolidColorSwatch(option.swatchColor.trim());
  }
  return null;
}

async function createSolidColorSwatch(hex: string): Promise<{ buffer: Buffer; mediaType: string }> {
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const buffer = await sharp({
    create: { width: 200, height: 200, channels: 3, background: { r, g, b } },
  }).png().toBuffer();
  return { buffer, mediaType: "image/png" };
}

// ---------------------------------------------------------------------------
// Auto-pick alternate option for a subcategory
// ---------------------------------------------------------------------------
function pickAlternateOption(
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
  subSlug: string,
  baselineOptSlug: string,
): { option: Option; subCategory: SubCategory } | null {
  const candidates: { option: Option; subCategory: SubCategory }[] = [];
  for (const [key, entry] of optionLookup) {
    if (!key.startsWith(`${subSlug}:`)) continue;
    if (entry.option.id === baselineOptSlug) continue;
    // Prefer options with swatch images
    candidates.push(entry);
  }

  // Sort: options with swatch_url first, then by sort order
  candidates.sort((a, b) => {
    const aHasSwatch = a.option.swatchUrl ? 0 : 1;
    const bHasSwatch = b.option.swatchUrl ? 0 : 1;
    if (aHasSwatch !== bHasSwatch) return aHasSwatch - bHasSwatch;
    return 0;
  });

  return candidates[0] ?? null;
}

// ---------------------------------------------------------------------------
// Generation helpers
// ---------------------------------------------------------------------------
async function generateWithFlash(
  imageBuffer: Buffer,
  imageMimeType: string,
  prompt: string,
  swatches: Array<{ buffer: Buffer; mediaType: string }>,
): Promise<{ imageBuffer: Buffer; durationMs: number }> {
  const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [
    { text: prompt },
    { inlineData: { mimeType: imageMimeType, data: imageBuffer.toString("base64") } },
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

// ---------------------------------------------------------------------------
// Scoped edit prompt builder
// ---------------------------------------------------------------------------
function buildScopedEditPrompt(
  surfaceLabel: string,
  spatialContext: string,
  preserveList: string[],
  dimensions: string | undefined,
  sceneDescription: string | null,
  hasSwatch: boolean,
): string {
  const sceneBlock = sceneDescription ? `SCENE: ${sceneDescription}\n\n` : "";

  const dimLine = dimensions ? `\nDimensions/format: ${dimensions}` : "";

  const swatchRef = hasSwatch
    ? "Match the attached swatch image exactly for color, pattern, and texture."
    : "Apply the color described above.";

  return `${sceneBlock}TASK: Edit this kitchen visualization. Change ONLY the ${surfaceLabel}.

WHAT TO CHANGE:
${surfaceLabel} — apply the material/color from the attached swatch.${dimLine}
Location: ${spatialContext}
${swatchRef}

DO NOT MODIFY (these must remain exactly as they currently appear):
${preserveList.map(item => `- ${item}`).join("\n")}
- Room layout, camera angle, and perspective

LIGHTING: Preserve the exact lighting from the input image — shadow depth, shadow direction, contrast, specular highlights, and ambient occlusion. The edited surface must show the same light source direction and shadow intensity as the surrounding surfaces. Do not flatten or soften the lighting.

The first attached image is the kitchen to edit. The second is the swatch for the new ${surfaceLabel.toLowerCase()} material.
Photorealistic result.`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Scoped Surface Edit Test ===");
  console.log(`Surfaces: ${activeSurfaces.map(s => s.key).join(", ")}`);
  console.log(`Scoped edit model: ${scopedEditModel === "1.5" ? OPENAI_MODEL : FLASH_MODEL}`);
  console.log(`Baseline model: ${OPENAI_MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // Load data
  const { org, floorplan } = await getOrgAndFloorplan();
  console.log(`Org: ${org.name} | Floorplan: ${floorplan.name}`);

  const photo = await getTargetPhoto(floorplan.id);
  const optionLookup = await loadOptionLookup(org.id);
  console.log(`Photo: ${photo.step.name} — ${photo.imagePath}`);
  console.log(`Options loaded: ${optionLookup.size} entries\n`);

  // Resolve alternates for each surface test
  for (const test of activeSurfaces) {
    if (!test.alternateOptSlug) {
      const alt = pickAlternateOption(optionLookup, test.subSlug, test.baselineOptSlug);
      if (!alt) {
        console.error(`No alternate option found for ${test.subSlug} (only one option?). Skipping.`);
        continue;
      }
      test.alternateOptSlug = alt.option.id;
    }
    const altEntry = optionLookup.get(`${test.subSlug}:${test.alternateOptSlug}`);
    if (!altEntry) {
      console.error(`Option not found: ${test.subSlug}:${test.alternateOptSlug}. Skipping.`);
      test.alternateOptSlug = null;
      continue;
    }
    console.log(`  ${test.label}: ${test.baselineOptSlug} → ${test.alternateOptSlug} (${altEntry.option.name})`);
  }
  console.log();

  const readySurfaces = activeSurfaces.filter(t => t.alternateOptSlug);
  if (readySurfaces.length === 0) {
    console.error("No surfaces ready to test.");
    process.exit(1);
  }

  // Download room photo
  const { data: imageData, error: dlErr } = await supabase.storage.from("rooms").download(photo.imagePath);
  if (dlErr || !imageData) throw new Error(`Failed to download room photo: ${dlErr?.message}`);
  const roomBuffer = Buffer.from(await imageData.arrayBuffer());

  // =========================================================================
  // STEP 1: Generate or load baseline
  // =========================================================================
  let baselineBuffer: Buffer;

  if (baselinePath) {
    console.log(`Loading baseline from: ${baselinePath}`);
    baselineBuffer = fs.readFileSync(baselinePath);
    fs.writeFileSync(path.join(OUTPUT_DIR, "00_baseline.png"), baselineBuffer);
    console.log("Baseline loaded.\n");
  } else {
    console.log(`${"=".repeat(60)}`);
    console.log("  BASELINE: 1.5 full pipeline (all selections)");
    console.log(`${"=".repeat(60)}`);

    const sectionSubIds = photo.step.sections.flatMap(s => s.subcategory_ids ?? []);
    const photoScopedIds = getPhotoScopedIds(photo.subcategoryIds, sectionSubIds);
    const scopedSubcategoryIds = photoScopedIds ? [...photoScopedIds] : [];
    const allSpatialHints = photoScopedIds
      ? Object.fromEntries(Object.entries(photo.step.spatialHints || {}).filter(([k]) => photoScopedIds.has(k)))
      : { ...(photo.step.spatialHints || {}) };
    const sceneDescription = photo.photoBaseline?.trim() || photo.step.sceneDescription?.trim() || null;

    const dbPolicy = await getStepPhotoGenerationPolicy(org.id, photo.photoId);
    const resolvedPolicy = resolvePhotoGenerationPolicy({
      orgSlug: SM_ORG_SLUG, floorplanSlug: KINKADE_SLUG,
      stepSlug: photo.step.slug, stepPhotoId: photo.photoId,
      imagePath: photo.imagePath, modelName: OPENAI_MODEL,
      selections: BASELINE_SELECTIONS,
    }, dbPolicy);

    const { prompt: baselinePrompt, swatches: baselineSwatches } = await buildEditPrompt(
      BASELINE_SELECTIONS, optionLookup, allSpatialHints, scopedSubcategoryIds,
      sceneDescription, photo.spatialHint, resolveSwatchBuffer, resolvedPolicy.promptOverrides,
    );

    fs.writeFileSync(path.join(OUTPUT_DIR, "prompts", "00_baseline.txt"), baselinePrompt);
    console.log(`  Prompt: ${baselinePrompt.length} chars, ${baselineSwatches.length} swatches`);

    const roomMimeType = photo.imagePath.endsWith(".webp") ? "image/webp" : "image/png";
    const result = await generateWithOpenAI(
      roomBuffer, roomMimeType, photo.imagePath.split("/").pop() || "room.webp",
      baselinePrompt, baselineSwatches,
    );

    baselineBuffer = result.imageBuffer;
    fs.writeFileSync(path.join(OUTPUT_DIR, "00_baseline.png"), baselineBuffer);
    console.log(`  Done in ${(result.durationMs / 1000).toFixed(1)}s\n`);
  }

  // =========================================================================
  // STEP 2: Scoped edit for each surface
  // =========================================================================
  const sceneDescription = photo.photoBaseline?.trim() || photo.step.sceneDescription?.trim() || null;
  const results: Array<{
    surface: string;
    alternateOption: string;
    alternateName: string;
    durationMs: number;
    promptLength: number;
  }> = [];

  for (let i = 0; i < readySurfaces.length; i++) {
    const test = readySurfaces[i];
    const idx = String(i + 1).padStart(2, "0");
    const altEntry = optionLookup.get(`${test.subSlug}:${test.alternateOptSlug}`)!;

    console.log(`${"=".repeat(60)}`);
    const modelLabel = scopedEditModel === "1.5" ? "1.5" : "Flash";
    console.log(`  ${idx}. ${test.label}: scoped ${modelLabel} edit → ${altEntry.option.name}`);
    console.log(`${"=".repeat(60)}`);

    // Resolve swatch for the alternate option
    const swatch = await resolveOptionSwatch(altEntry.option);
    if (!swatch) {
      console.log(`  SKIP: no swatch available for ${altEntry.option.name}\n`);
      continue;
    }

    // Save the swatch for reference
    const swatchExt = swatch.mediaType.split("/")[1] || "png";
    fs.writeFileSync(path.join(OUTPUT_DIR, `${idx}_${test.key}_swatch.${swatchExt}`), swatch.buffer);

    // Build scoped edit prompt
    const prompt = buildScopedEditPrompt(
      test.label,
      test.spatialContext,
      test.preserveList,
      altEntry.option.dimensions ?? undefined,
      sceneDescription,
      true,
    );

    fs.writeFileSync(path.join(OUTPUT_DIR, "prompts", `${idx}_${test.key}.txt`), prompt);
    console.log(`  Prompt: ${prompt.length} chars`);
    console.log(`  Swatch: ${altEntry.option.swatchUrl ? "image" : "solid color"} (${swatch.mediaType})`);

    // Run scoped edit on the baseline image
    const result = scopedEditModel === "1.5"
      ? await generateWithOpenAI(baselineBuffer, "image/png", "baseline.png", prompt, [{ ...swatch, label: test.label }])
      : await generateWithFlash(baselineBuffer, "image/png", prompt, [swatch]);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${idx}_${test.key}_${test.alternateOptSlug}.png`), result.imageBuffer);
    console.log(`  Done in ${(result.durationMs / 1000).toFixed(1)}s\n`);

    results.push({
      surface: test.key,
      alternateOption: test.alternateOptSlug!,
      alternateName: altEntry.option.name,
      durationMs: result.durationMs,
      promptLength: prompt.length,
    });
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log(`${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log(`${"=".repeat(60)}`);
  console.log(`Surfaces tested: ${results.length}`);
  console.log();

  for (const r of results) {
    console.log(`  ${r.surface}: ${r.alternateName} — ${(r.durationMs / 1000).toFixed(1)}s`);
  }

  const avgMs = results.reduce((sum, r) => sum + r.durationMs, 0) / results.length;
  console.log(`\n  Average: ${(avgMs / 1000).toFixed(1)}s per scoped edit`);
  console.log();
  console.log(`Output: ${OUTPUT_DIR}/`);
  console.log();
  console.log("EVALUATION CHECKLIST (visual comparison against 00_baseline.png):");
  console.log("  For each surface edit:");
  console.log("  [ ] Target surface changed to match the swatch?");
  console.log("  [ ] All OTHER surfaces unchanged from baseline?");
  console.log("  [ ] No artifacts at surface boundaries?");
  console.log("  [ ] Room layout, perspective, lighting preserved?");
  console.log("  [ ] Quality comparable to a full pipeline generation?");

  // Save results JSON
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "results.json"),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      flashModel: FLASH_MODEL,
      baselineModel: OPENAI_MODEL,
      baselineSelections: BASELINE_SELECTIONS,
      usedExistingBaseline: !!baselinePath,
      surfaces: results,
      avgDurationMs: Math.round(avgMs),
    }, null, 2),
  );
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
