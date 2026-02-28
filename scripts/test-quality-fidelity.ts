#!/usr/bin/env npx tsx
/**
 * A/B test gpt-image-1.5 quality + input_fidelity combos.
 *
 * Generates the SAME photo with the SAME selections at 4 combos:
 *   1. high / high   (current production settings)
 *   2. medium / high  (cheaper output, same input detail)
 *   3. high / low     (same output quality, less input detail)
 *   4. medium / low   (both reduced)
 *
 * Uses the real production prompt pipeline — same scoping, policies,
 * swatch resolver as /api/generate/photo.
 *
 * Usage:
 *   npx tsx scripts/test-quality-fidelity.ts
 *   npx tsx scripts/test-quality-fidelity.ts --photo greatroom
 *   npx tsx scripts/test-quality-fidelity.ts --photo kitchen --selections full
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
import { getStepPhotoGenerationPolicy } from "@/lib/db-queries";
import { resolvePhotoGenerationPolicy } from "@/lib/photo-generation-policy";
import { resolveScopedFlooringSelections } from "@/lib/flooring-selection";
import { getPhotoScopedIds, normalizePrimaryAccentAsWallPaint } from "@/lib/photo-scope";
import type { Option, SubCategory } from "@/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SM_ORG_SLUG = "stonemartin";
const KINKADE_SLUG = "kinkade";

const PHOTO_TARGETS: Record<string, string> = {
  kitchen: "364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp",
  greatroom: "364538bf-1712-48e7-a905-04ad90983eb2/rooms/50d25549-eba5-424d-8d40-9fe70ff45b1d/greatroom-wide.webp",
};

const SELECTION_PRESETS: Record<string, Record<string, Record<string, string>>> = {
  kitchen: {
    light: {
      "counter-top": "ct-quartz-calacatta-duolina",
      "kitchen-cabinet-color": "kitchen-cab-color-onyx",
    },
    full: {
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
  greatroom: {
    light: {
      "common-wall-paint": "paint-sherwin-williams-accessible-beige",
      "main-area-flooring-color": "floor-color-mariner-harbor",
    },
    full: {
      "common-wall-paint": "paint-sherwin-williams-accessible-beige",
      "main-area-flooring-color": "floor-color-mariner-harbor",
      "main-area-flooring-type": "floor-type-luxury-vinyl-plank",
      "kitchen-cabinet-color": "kitchen-cab-color-onyx",
      "fireplace-mantel-accent": "fireplace-marble-white",
      "trim-color": "trim-super-white",
    },
  },
};

const COMBOS: Array<{
  label: string;
  quality: "low" | "medium" | "high";
  inputFidelity: "low" | "high";
}> = [
  { label: "high_high", quality: "high", inputFidelity: "high" },
  { label: "medium_high", quality: "medium", inputFidelity: "high" },
  { label: "high_low", quality: "high", inputFidelity: "low" },
  { label: "medium_low", quality: "medium", inputFidelity: "low" },
];

// Per-image cost at 1536x1024 (from OpenAI docs)
const COST_MAP: Record<string, number> = {
  high_high: 0.200,
  medium_high: 0.050,
  high_low: 0.200,   // input_fidelity affects input tokens, not output price
  medium_low: 0.050,
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

const photoKey = getArg("photo", "kitchen");
const selectionsKey = getArg("selections", "full");

const TARGET_PHOTO_PATH = PHOTO_TARGETS[photoKey];
if (!TARGET_PHOTO_PATH) {
  console.error(`Unknown photo: ${photoKey}. Options: ${Object.keys(PHOTO_TARGETS).join(", ")}`);
  process.exit(1);
}
const selections = SELECTION_PRESETS[photoKey]?.[selectionsKey];
if (!selections) {
  console.error(`Unknown selections preset: ${selectionsKey} for ${photoKey}. Options: ${Object.keys(SELECTION_PRESETS[photoKey] || {}).join(", ")}`);
  process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, "quality-fidelity-test-outputs", `${photoKey}_${selectionsKey}`);
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
// Data fetching (same pattern as nano-banana test)
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
    .eq("image_path", TARGET_PHOTO_PATH)
    .eq("steps.floorplan_id", floorplanId)
    .single();

  if (error || !photo) throw new Error(`Photo not found: ${TARGET_PHOTO_PATH}\n${error?.message}`);
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
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Quality / Fidelity A/B Test ===");
  console.log(`Photo: ${photoKey} (${TARGET_PHOTO_PATH})`);
  console.log(`Selections: ${selectionsKey} (${Object.keys(selections).length} items)`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // --- Load data ---
  const { org, floorplan } = await getOrgAndFloorplan();
  console.log(`Org: ${org.name} | Floorplan: ${floorplan.name}`);

  const photo = await getTargetPhoto(floorplan.id);
  console.log(`Photo: ${photo.step.name} — ${photo.imagePath}`);

  // Download room photo
  const { data: imageData, error: dlErr } = await supabase.storage.from("rooms").download(photo.imagePath);
  if (dlErr || !imageData) throw new Error(`Failed to download room photo: ${dlErr?.message}`);
  const roomBuffer = Buffer.from(await imageData.arrayBuffer());
  const heroExt = photo.imagePath.split(".").pop()?.toLowerCase() || "webp";
  const heroMime = heroExt === "jpg" ? "image/jpeg" : `image/${heroExt}`;
  const heroFilename = photo.imagePath.split("/").pop() || "room.webp";
  fs.writeFileSync(path.join(OUTPUT_DIR, "00_input_room.png"), roomBuffer);

  // Build option lookup
  console.log("Loading option lookup...");
  const { data: cats, error: catsErr } = await supabase
    .from("categories")
    .select(`
      id, slug, name, sort_order,
      subcategories (
        id, slug, name, category_id, is_visual, is_additive, unit_label, max_quantity, sort_order, generation_hint, generation_rules, generation_rules_when_not_selected, is_appliance,
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
        generationRulesWhenNotSelected: sub.generation_rules_when_not_selected ?? undefined,
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
  console.log(`Option lookup: ${optionLookup.size} entries`);

  // Scoping
  const sectionSubIds = photo.step.sections.flatMap(s => s.subcategory_ids ?? []);
  const photoScopedIds = getPhotoScopedIds(photo.subcategoryIds, sectionSubIds);

  let scopedSelections = { ...selections };
  if (photoScopedIds) {
    scopedSelections = Object.fromEntries(
      Object.entries(scopedSelections).filter(([key]) => photoScopedIds.has(key)),
    );
  }
  const flooringContextText = [photo.photoBaseline ?? "", photo.spatialHint ?? "", photo.step.sceneDescription ?? ""].join("\n");
  scopedSelections = resolveScopedFlooringSelections(scopedSelections, flooringContextText);
  scopedSelections = normalizePrimaryAccentAsWallPaint(scopedSelections, photo.remapAccentAsWallPaint ?? false);

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
    selections: scopedSelections,
  }, dbPolicy);

  console.log(`Scoped selections: ${Object.keys(scopedSelections).length}`);
  console.log(`Policy: ${resolvedPolicy.policyKey}${resolvedPolicy.secondPass ? " (has second pass)" : ""}`);

  // Build prompt + swatches (same for all combos)
  const scopedSubcategoryIds = photoScopedIds ? [...photoScopedIds] : [];
  const { prompt, swatches } = await buildEditPrompt(
    scopedSelections, optionLookup, spatialHints, scopedSubcategoryIds,
    sceneDescription, photo.spatialHint, resolveSwatchBuffer,
    resolvedPolicy.promptOverrides,
  );

  const supportedSwatches = swatches.filter(s => ["image/jpeg", "image/png", "image/webp"].includes(s.mediaType));
  console.log(`Prompt: ${prompt.length} chars | Swatches: ${supportedSwatches.length}`);
  fs.writeFileSync(path.join(OUTPUT_DIR, "prompt.txt"), prompt);

  // Build input images once (reused across combos)
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
  console.log(`Input images: ${inputImages.length} (1 room + ${supportedSwatches.length} swatches)`);

  // --- Run each combo ---
  interface Result {
    label: string;
    quality: string;
    inputFidelity: string;
    durationMs: number;
    costUsd: number;
    outputPath: string;
  }
  const results: Result[] = [];

  for (const combo of COMBOS) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  quality: ${combo.quality} | input_fidelity: ${combo.inputFidelity}`);
    console.log(`${"=".repeat(60)}`);

    const genStart = performance.now();
    try {
      const result = await openai.images.edit({
        model: "gpt-image-1.5",
        image: inputImages,
        prompt,
        quality: combo.quality,
        size: "1536x1024",
        input_fidelity: combo.inputFidelity,
      });

      const durationMs = Math.round(performance.now() - genStart);
      const imageData = result.data?.[0];
      if (!imageData?.b64_json) throw new Error("No image generated");

      const outputPath = path.join(OUTPUT_DIR, `${combo.label}.png`);
      fs.writeFileSync(outputPath, Buffer.from(imageData.b64_json, "base64"));

      const costUsd = COST_MAP[combo.label] ?? 0.20;
      results.push({ label: combo.label, quality: combo.quality, inputFidelity: combo.inputFidelity, durationMs, costUsd, outputPath });

      console.log(`  Done in ${(durationMs / 1000).toFixed(1)}s | Cost: ~$${costUsd.toFixed(3)} | Output: ${combo.label}.png`);
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - genStart);
      console.error(`  FAILED after ${(durationMs / 1000).toFixed(1)}s: ${err.message}`);
      results.push({ label: combo.label, quality: combo.quality, inputFidelity: combo.inputFidelity, durationMs, costUsd: 0, outputPath: "FAILED" });
    }
  }

  // --- Summary ---
  console.log(`\n${"=".repeat(70)}`);
  console.log(`RESULTS — ${photoKey} / ${selectionsKey} (${Object.keys(scopedSelections).length} selections, ${supportedSwatches.length} swatches)`);
  console.log(`${"=".repeat(70)}`);

  const header = "Combo            | Quality | Fidelity | Time     | Cost    | vs Prod";
  console.log(header);
  console.log("-".repeat(header.length));

  const prodResult = results.find(r => r.label === "high_high");
  const prodTime = prodResult?.durationMs ?? 0;

  for (const r of results) {
    const time = r.durationMs > 0 ? `${(r.durationMs / 1000).toFixed(1)}s` : "FAIL";
    const cost = r.costUsd > 0 ? `$${r.costUsd.toFixed(3)}` : "N/A";
    const speedup = prodTime > 0 && r.durationMs > 0
      ? `${(prodTime / r.durationMs).toFixed(1)}x`
      : "—";
    console.log(
      `${r.label.padEnd(17)}| ${r.quality.padEnd(8)}| ${r.inputFidelity.padEnd(9)}| ${time.padEnd(9)}| ${cost.padEnd(8)}| ${speedup}`
    );
  }

  // Save results
  const resultsPath = path.join(OUTPUT_DIR, "results.json");
  fs.writeFileSync(resultsPath, JSON.stringify({
    photo: photoKey, selections: selectionsKey, timestamp: new Date().toISOString(),
    scopedSelectionCount: Object.keys(scopedSelections).length,
    swatchCount: supportedSwatches.length,
    policy: resolvedPolicy.policyKey,
    hasSecondPass: !!resolvedPolicy.secondPass,
    results,
  }, null, 2));

  console.log(`\nResults: ${resultsPath}`);
  console.log(`Images: ${OUTPUT_DIR}/`);
  console.log("\nOpen all 4 PNGs side by side to compare visual quality.");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
