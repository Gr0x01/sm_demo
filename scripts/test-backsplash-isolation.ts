#!/usr/bin/env npx tsx
/**
 * Test backsplash generation in isolation vs full selection set.
 *
 * Generates the same kitchen photo twice:
 *   1. ISOLATED: only backsplash selection (1 swatch)
 *   2. FULL: all kitchen selections (~12 swatches)
 *
 * If isolated looks correct and full doesn't, the issue is prompt overload.
 *
 * Usage:
 *   npx tsx scripts/test-backsplash-isolation.ts
 *   npx tsx scripts/test-backsplash-isolation.ts --backsplash herringbone-taupe
 *   npx tsx scripts/test-backsplash-isolation.ts --backsplash picket-taupe-v
 *
 * Requires: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import OpenAI, { toFile } from "openai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import fs from "fs";

import { buildEditPrompt, type SwatchBufferResolver } from "@/lib/generate";
import { getPhotoScopedIds, normalizePrimaryAccentAsWallPaint } from "@/lib/photo-scope";
import { resolveScopedFlooringSelections } from "@/lib/flooring-selection";
import { getStepPhotoGenerationPolicy } from "@/lib/db-queries";
import { resolvePhotoGenerationPolicy } from "@/lib/photo-generation-policy";
import type { Option, SubCategory } from "@/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SM_ORG_SLUG = "stonemartin";
const KINKADE_SLUG = "kinkade";
const KITCHEN_PHOTO = "364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp";

// Backsplash presets — slug-based keys matching option slugs in DB
const BACKSPLASH_PRESETS: Record<string, { subSlug: string; optSlug: string; label: string }> = {
  "herringbone-taupe":  { subSlug: "backsplash", optSlug: "bs-baker-herringbone-taupe", label: "Herringbone Matte Mosaic Taupe" },
  "herringbone-carbon": { subSlug: "backsplash", optSlug: "bs-baker-herringbone-carbon", label: "Herringbone Matte Mosaic Carbon" },
  "herringbone-white":  { subSlug: "backsplash", optSlug: "bs-baker-herringbone-white", label: "Herringbone Matte Mosaic White" },
  "picket-taupe-v":     { subSlug: "backsplash", optSlug: "baker-blvd-picket-gloss-taupe-vertical", label: "Picket Gloss Taupe Vertical" },
  "picket-warm-grey-v": { subSlug: "backsplash", optSlug: "baker-blvd-picket-gloss-warm-grey-vertical", label: "Picket Gloss Warm Grey Vertical" },
  "picket-taupe-h":     { subSlug: "backsplash", optSlug: "baker-blvd-picket-gloss-taupe-horizontal", label: "Picket Gloss Taupe Horizontal" },
  "subway-taupe":       { subSlug: "backsplash", optSlug: "bs-baker-4x16-taupe", label: "4x16 Subway Taupe" },
  "subway-carbon":      { subSlug: "backsplash", optSlug: "bs-baker-4x16-carbon", label: "4x16 Subway Carbon" },
  "vesper-eminent":     { subSlug: "backsplash", optSlug: "bs-vesper-eminent", label: "Vesper 6x6 Eminent" },
};

// Full kitchen selections for comparison pass
const FULL_KITCHEN_SELECTIONS: Record<string, string> = {
  "kitchen-cabinet-color": "kitchen-cab-color-onyx",
  "kitchen-island-cabinet-color": "island-color-driftwood",
  "counter-top": "ct-quartz-calacatta-duolina",
  "kitchen-cabinet-hardware": "hw-naples-pull-knob-brushed-gold",
  "main-area-flooring-color": "floor-color-mariner-harbor",
  "range": "range-ge-gas-slide-in",
  "dishwasher": "dishwasher-ge-stainless-interior",
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

const backsplashKey = getArg("backsplash", "herringbone-taupe");
const preset = BACKSPLASH_PRESETS[backsplashKey];
if (!preset) {
  console.error(`Unknown backsplash: ${backsplashKey}`);
  console.error(`Options: ${Object.keys(BACKSPLASH_PRESETS).join(", ")}`);
  process.exit(1);
}

const skipFull = args.includes("--isolated-only");

const OUTPUT_DIR = path.join(__dirname, "backsplash-test-outputs", backsplashKey);
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
const openai = new OpenAI();

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

// ---------------------------------------------------------------------------
// Generation helper
// ---------------------------------------------------------------------------
async function generate(
  label: string,
  prompt: string,
  roomBuffer: Buffer,
  heroFilename: string,
  heroMime: string,
  swatches: Array<{ label: string; buffer: Buffer; mediaType: string }>,
): Promise<{ durationMs: number; outputPath: string }> {
  const supportedSwatches = swatches.filter(s =>
    ["image/jpeg", "image/png", "image/webp"].includes(s.mediaType)
  );

  const inputImages = [
    await toFile(roomBuffer, heroFilename, { type: heroMime }),
    ...await Promise.all(
      supportedSwatches.map(s => {
        const ext = s.mediaType.split("/")[1] || "png";
        const filename = `${s.label.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
        return toFile(s.buffer, filename, { type: s.mediaType });
      })
    ),
  ];

  console.log(`  Images: ${inputImages.length} (1 room + ${supportedSwatches.length} swatches)`);

  const genStart = performance.now();
  const result = await openai.images.edit({
    model: "gpt-image-1.5",
    image: inputImages,
    prompt,
    quality: "medium",
    size: "1536x1024",
    input_fidelity: "high",
  });

  const durationMs = Math.round(performance.now() - genStart);
  const imageData = result.data?.[0];
  if (!imageData?.b64_json) throw new Error("No image generated");

  const outputPath = path.join(OUTPUT_DIR, `${label}.png`);
  fs.writeFileSync(outputPath, Buffer.from(imageData.b64_json, "base64"));

  return { durationMs, outputPath };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Backsplash Isolation Test ===");
  console.log(`Backsplash: ${preset.label} (${backsplashKey})`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  const { org, floorplan } = await getOrgAndFloorplan();
  console.log(`Org: ${org.name} | Floorplan: ${floorplan.name}`);

  const photo = await getTargetPhoto(floorplan.id);
  console.log(`Photo: ${photo.step.name} — ${photo.imagePath}`);

  // Download room photo
  const { data: imageData, error: dlErr } = await supabase.storage.from("rooms").download(photo.imagePath);
  if (dlErr || !imageData) throw new Error(`Failed to download room photo: ${dlErr?.message}`);

  const rawRoomBuffer = Buffer.from(await imageData.arrayBuffer());
  const heroExt = photo.imagePath.split(".").pop()?.toLowerCase() || "webp";
  const needsConversion = !["png", "jpg", "jpeg", "webp", "gif"].includes(heroExt);
  const roomBuffer = needsConversion ? await sharp(rawRoomBuffer).png().toBuffer() : rawRoomBuffer;
  const heroMime = needsConversion ? "image/png" : (heroExt === "jpg" ? "image/jpeg" : `image/${heroExt}`);
  const heroFilename = needsConversion
    ? (photo.imagePath.split("/").pop()?.replace(/\.[^.]+$/, ".png") || "room.png")
    : (photo.imagePath.split("/").pop() || "room.webp");

  fs.writeFileSync(path.join(OUTPUT_DIR, "00_input_room.png"), roomBuffer);

  // Build option lookup (need dimensions column too)
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

  // Verify the backsplash option exists
  const bsKey = `${preset.subSlug}:${preset.optSlug}`;
  if (!optionLookup.has(bsKey)) {
    console.error(`Backsplash option not found: ${bsKey}`);
    console.error("Available backsplash options:");
    for (const [key] of optionLookup) {
      if (key.startsWith("backsplash:")) console.error(`  ${key}`);
    }
    process.exit(1);
  }

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
  const resolvedPolicy = resolvePhotoGenerationPolicy({
    orgSlug: SM_ORG_SLUG, floorplanSlug: KINKADE_SLUG,
    stepSlug: photo.step.slug, stepPhotoId: photo.photoId,
    imagePath: photo.imagePath, modelName: "gpt-image-1.5",
    selections: { [preset.subSlug]: preset.optSlug },
  }, dbPolicy);

  // ===== PASS 1: ISOLATED (backsplash only) =====
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ISOLATED — backsplash only: ${preset.label}`);
  console.log(`${"=".repeat(60)}`);

  const isolatedSelections = { [preset.subSlug]: preset.optSlug };
  const { prompt: isolatedPrompt, swatches: isolatedSwatches } = await buildEditPrompt(
    isolatedSelections, optionLookup, spatialHints, scopedSubcategoryIds,
    sceneDescription, photo.spatialHint, resolveSwatchBuffer,
    resolvedPolicy.promptOverrides,
  );

  fs.writeFileSync(path.join(OUTPUT_DIR, "prompt_isolated.txt"), isolatedPrompt);
  console.log(`  Prompt: ${isolatedPrompt.length} chars`);

  const isolated = await generate("01_isolated", isolatedPrompt, roomBuffer, heroFilename, heroMime, isolatedSwatches);
  console.log(`  Done in ${(isolated.durationMs / 1000).toFixed(1)}s → ${isolated.outputPath}`);

  // ===== PASS 2: FULL (all kitchen selections + backsplash) =====
  if (!skipFull) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  FULL — all selections + ${preset.label}`);
    console.log(`${"=".repeat(60)}`);

    let fullSelections = { ...FULL_KITCHEN_SELECTIONS, [preset.subSlug]: preset.optSlug };
    if (photoScopedIds) {
      fullSelections = Object.fromEntries(
        Object.entries(fullSelections).filter(([key]) => photoScopedIds.has(key)),
      );
    }
    const flooringCtx = [photo.photoBaseline ?? "", photo.spatialHint ?? "", photo.step.sceneDescription ?? ""].join("\n");
    fullSelections = resolveScopedFlooringSelections(fullSelections, flooringCtx);
    fullSelections = normalizePrimaryAccentAsWallPaint(fullSelections, photo.remapAccentAsWallPaint ?? false);

    const fullPolicy = resolvePhotoGenerationPolicy({
      orgSlug: SM_ORG_SLUG, floorplanSlug: KINKADE_SLUG,
      stepSlug: photo.step.slug, stepPhotoId: photo.photoId,
      imagePath: photo.imagePath, modelName: "gpt-image-1.5",
      selections: fullSelections,
    }, dbPolicy);

    const { prompt: fullPrompt, swatches: fullSwatches } = await buildEditPrompt(
      fullSelections, optionLookup, spatialHints, scopedSubcategoryIds,
      sceneDescription, photo.spatialHint, resolveSwatchBuffer,
      fullPolicy.promptOverrides,
    );

    fs.writeFileSync(path.join(OUTPUT_DIR, "prompt_full.txt"), fullPrompt);
    console.log(`  Prompt: ${fullPrompt.length} chars | Selections: ${Object.keys(fullSelections).length}`);

    const full = await generate("02_full", fullPrompt, roomBuffer, heroFilename, heroMime, fullSwatches);
    console.log(`  Done in ${(full.durationMs / 1000).toFixed(1)}s → ${full.outputPath}`);

    // Summary
    console.log(`\n${"=".repeat(60)}`);
    console.log("SUMMARY");
    console.log(`${"=".repeat(60)}`);
    console.log(`Isolated (1 swatch):  ${(isolated.durationMs / 1000).toFixed(1)}s`);
    console.log(`Full (${fullSwatches.length} swatches): ${(full.durationMs / 1000).toFixed(1)}s`);
  }

  console.log(`\nOutputs: ${OUTPUT_DIR}/`);
  console.log("Compare 01_isolated.png vs 02_full.png to see if isolation fixes the pattern.");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
