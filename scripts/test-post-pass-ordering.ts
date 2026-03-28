#!/usr/bin/env npx tsx
/**
 * Post-pass ordering test: backsplash + slide-in range.
 *
 * Tests 3 orderings to find the best post-pass sequence:
 *   A: 1.5 main → Flash backsplash → 1.5 oven
 *   B: 1.5 main → 1.5 oven → Flash backsplash
 *   C: 1.5 main → Flash combined (backsplash + oven in one pass)
 *
 * All use the same main pass output as input (generated once, reused).
 * Selections include slide-in range + picket backsplash to exercise both.
 *
 * Usage:
 *   npx tsx scripts/test-post-pass-ordering.ts
 *   npx tsx scripts/test-post-pass-ordering.ts --label v2
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

// Selections that trigger BOTH backsplash post-pass AND slide-in range second pass
const ALL_SELECTIONS: Record<string, string> = {
  "backsplash": "baker-blvd-picket-gloss-taupe-vertical",
  "kitchen-cabinet-color": "kitchen-cab-color-onyx",
  "kitchen-island-cabinet-color": "island-color-driftwood",
  "counter-top": "ct-quartz-calacatta-duolina",
  "kitchen-cabinet-hardware": "hw-naples-pull-knob-brushed-gold",
  "kitchen-faucet": "faucet-moen-sleek-matte-black",
  "kitchen-sink": "sink-karran-black",
  "interior-wall-paint": "wp-sw-agreeable-gray",
  "primary-flooring": "fl-coretec-virtue-oak",
  "range": "range-ge-gas-slide-in",  // triggers second pass
};

const OVEN_SECOND_PASS_PROMPT = "Second pass: correct ONLY the cooking range geometry on the back wall. The selected range is slide-in: NO raised backguard panel, backsplash tile must be visible directly behind the cooktop, and there must be exactly one oven door below the cooktop. Keep all surrounding cabinetry, countertop seams, island, sink, faucet, floor, walls, and lighting unchanged.";

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

const label = getArg("label", "");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const runName = label ? `ordering_${label}_${timestamp}` : `ordering_${timestamp}`;
const OUTPUT_DIR = path.join(__dirname, "backsplash-test-outputs", "post-pass-ordering", runName);
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
// Data fetching (same helpers as two-pass script)
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
    photoId: photo.id, imagePath: photo.image_path,
    spatialHint: photo.spatial_hint as string | null,
    photoBaseline: photo.photo_baseline as string | null,
    subcategoryIds: photo.subcategory_ids as string[] | null,
    step: {
      id: step.id, name: step.name, slug: step.slug,
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
    return { buffer: await sharp(rawBuffer).png().toBuffer(), mediaType: "image/png" };
  }
  return { buffer: rawBuffer, mediaType: ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}` };
};

async function loadOptionLookup(orgId: string) {
  const { data: cats, error } = await supabase
    .from("categories")
    .select(`id, slug, name, sort_order, subcategories (
      id, slug, name, category_id, is_visual, is_additive, unit_label, max_quantity, sort_order, generation_hint, generation_rules, generation_rules_when_not_selected, is_appliance,
      options ( id, slug, name, price, prompt_descriptor, dimensions, swatch_url, swatch_color, nudge, sort_order, generation_rules, is_default )
    )`)
    .eq("org_id", orgId).order("sort_order");
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
        optionLookup.set(`${sub.slug}:${opt.slug}`, {
          option: {
            id: opt.slug, name: opt.name, price: opt.price,
            promptDescriptor: opt.prompt_descriptor ?? undefined, dimensions: opt.dimensions ?? undefined,
            swatchUrl: opt.swatch_url ?? undefined, swatchColor: opt.swatch_color ?? undefined,
            nudge: opt.nudge ?? undefined, generationRules: opt.generation_rules ?? undefined,
            isDefault: opt.is_default || undefined,
          },
          subCategory,
        });
      }
    }
  }
  return optionLookup;
}

// ---------------------------------------------------------------------------
// Generation helpers
// ---------------------------------------------------------------------------
async function generateWithFlash(
  roomBuffer: Buffer, roomMimeType: string,
  prompt: string, swatches: Array<{ buffer: Buffer; mediaType: string }>,
): Promise<{ imageBuffer: Buffer; durationMs: number }> {
  const parts: Array<any> = [
    { text: prompt },
    { inlineData: { mimeType: roomMimeType, data: roomBuffer.toString("base64") } },
  ];
  for (const s of swatches) {
    parts.push({ inlineData: { mimeType: s.mediaType, data: s.buffer.toString("base64") } });
  }
  const start = performance.now();
  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: "user", parts }],
    config: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: "3:2", imageSize: "2K" } },
  });
  const durationMs = Math.round(performance.now() - start);
  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) throw new Error("No response from Flash");
  for (const part of candidate.content.parts) {
    if ((part as any).inlineData) return { imageBuffer: Buffer.from((part as any).inlineData.data, "base64"), durationMs };
  }
  throw new Error("No image in Flash response");
}

async function generateWithOpenAI(
  imageBuffer: Buffer, imageMime: string, imageFilename: string,
  prompt: string, swatches: Array<{ buffer: Buffer; mediaType: string; label: string }>,
  inputFidelity: "low" | "high" = "high",
): Promise<{ imageBuffer: Buffer; durationMs: number }> {
  const supported = swatches.filter(s => ["image/jpeg", "image/png", "image/webp"].includes(s.mediaType));
  const inputImages = [
    await toFile(imageBuffer, imageFilename, { type: imageMime }),
    ...await Promise.all(supported.map((s) => {
      const ext = s.mediaType.split("/")[1] || "png";
      return toFile(s.buffer, `${s.label.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`, { type: s.mediaType });
    })),
  ];
  const start = performance.now();
  const result = await openai.images.edit({
    model: OPENAI_MODEL, image: inputImages, prompt,
    quality: "medium", size: "1536x1024", input_fidelity: inputFidelity,
  });
  const durationMs = Math.round(performance.now() - start);
  const gen = result.data?.[0];
  if (!gen?.b64_json) throw new Error("No image from OpenAI");
  return { imageBuffer: Buffer.from(gen.b64_json, "base64"), durationMs };
}

async function runOvenPass(inputBuffer: Buffer): Promise<{ imageBuffer: Buffer; durationMs: number }> {
  return generateWithOpenAI(inputBuffer, "image/png", "prev-pass.png", OVEN_SECOND_PASS_PROMPT, [], "low");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Post-Pass Ordering Test ===");
  console.log(`Flash: ${FLASH_MODEL} | OpenAI: ${OPENAI_MODEL}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  const { org, floorplan } = await getOrgAndFloorplan();
  const photo = await getTargetPhoto(floorplan.id);
  const optionLookup = await loadOptionLookup(org.id);
  console.log(`${org.name} | ${floorplan.name} | ${optionLookup.size} options\n`);

  // Download room photo
  const { data: imageData, error: dlErr } = await supabase.storage.from("rooms").download(photo.imagePath);
  if (dlErr || !imageData) throw new Error(`Download failed: ${dlErr?.message}`);
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
  const dbPolicy = await getStepPhotoGenerationPolicy(org.id, photo.photoId);
  const resolvedPolicy = resolvePhotoGenerationPolicy({
    orgSlug: SM_ORG_SLUG, floorplanSlug: KINKADE_SLUG,
    stepSlug: photo.step.slug, stepPhotoId: photo.photoId,
    imagePath: photo.imagePath, modelName: OPENAI_MODEL,
    selections: ALL_SELECTIONS,
  }, dbPolicy);

  // =========================================================================
  // SHARED: 1.5 main pass (everything except backsplash) — run once, reuse
  // =========================================================================
  console.log(`${"=".repeat(60)}`);
  console.log("  SHARED: 1.5 main pass (everything except backsplash)");
  console.log(`${"=".repeat(60)}`);

  const mainSelections = { ...ALL_SELECTIONS };
  delete mainSelections["backsplash"];

  const { prompt: mainPrompt, swatches: mainSwatches } = await buildEditPrompt(
    mainSelections, optionLookup, allSpatialHints, scopedSubcategoryIds,
    sceneDescription, photo.spatialHint, resolveSwatchBuffer, resolvedPolicy.promptOverrides,
  );
  fs.writeFileSync(path.join(OUTPUT_DIR, "main_prompt.txt"), mainPrompt);
  console.log(`  Prompt: ${mainPrompt.length} chars, ${mainSwatches.length} swatch(es)`);

  const mainResult = await generateWithOpenAI(
    roomBuffer, roomMimeType, photo.imagePath.split("/").pop() || "room.webp",
    mainPrompt, mainSwatches,
  );
  fs.writeFileSync(path.join(OUTPUT_DIR, "00_main_pass.png"), mainResult.imageBuffer);
  console.log(`  Done in ${(mainResult.durationMs / 1000).toFixed(1)}s\n`);

  // Build backsplash prompt (shared across A, B, C)
  const bsSelections = { backsplash: ALL_SELECTIONS["backsplash"] };
  const bsSubIds = scopedSubcategoryIds.filter(id => id === "backsplash");
  const bsSpatialHints: Record<string, string> = {};
  if (allSpatialHints["backsplash"]) bsSpatialHints["backsplash"] = allSpatialHints["backsplash"];

  const { prompt: bsPrompt, swatches: bsSwatches } = await buildEditPrompt(
    bsSelections, optionLookup, bsSpatialHints, bsSubIds,
    sceneDescription, photo.spatialHint, resolveSwatchBuffer, resolvedPolicy.promptOverrides,
  );
  fs.writeFileSync(path.join(OUTPUT_DIR, "backsplash_prompt.txt"), bsPrompt);

  // =========================================================================
  // A: main → Flash backsplash → 1.5 oven
  // =========================================================================
  console.log(`${"=".repeat(60)}`);
  console.log("  A: main → Flash backsplash → 1.5 oven");
  console.log(`${"=".repeat(60)}`);

  const a1 = await generateWithFlash(mainResult.imageBuffer, "image/png", bsPrompt, bsSwatches);
  fs.writeFileSync(path.join(OUTPUT_DIR, "A1_flash_backsplash.png"), a1.imageBuffer);
  console.log(`  Flash backsplash: ${(a1.durationMs / 1000).toFixed(1)}s`);

  const a2 = await runOvenPass(a1.imageBuffer);
  fs.writeFileSync(path.join(OUTPUT_DIR, "A2_oven_final.png"), a2.imageBuffer);
  console.log(`  1.5 oven: ${(a2.durationMs / 1000).toFixed(1)}s`);
  console.log(`  Total: ${((a1.durationMs + a2.durationMs) / 1000).toFixed(1)}s\n`);

  // =========================================================================
  // B: main → 1.5 oven → Flash backsplash
  // =========================================================================
  console.log(`${"=".repeat(60)}`);
  console.log("  B: main → 1.5 oven → Flash backsplash");
  console.log(`${"=".repeat(60)}`);

  const b1 = await runOvenPass(mainResult.imageBuffer);
  fs.writeFileSync(path.join(OUTPUT_DIR, "B1_oven.png"), b1.imageBuffer);
  console.log(`  1.5 oven: ${(b1.durationMs / 1000).toFixed(1)}s`);

  const b2 = await generateWithFlash(b1.imageBuffer, "image/png", bsPrompt, bsSwatches);
  fs.writeFileSync(path.join(OUTPUT_DIR, "B2_flash_backsplash_final.png"), b2.imageBuffer);
  console.log(`  Flash backsplash: ${(b2.durationMs / 1000).toFixed(1)}s`);
  console.log(`  Total: ${((b1.durationMs + b2.durationMs) / 1000).toFixed(1)}s\n`);

  // =========================================================================
  // C: main → Flash combined (backsplash + oven in one pass)
  // =========================================================================
  console.log(`${"=".repeat(60)}`);
  console.log("  C: main → Flash combined (backsplash + oven)");
  console.log(`${"=".repeat(60)}`);

  const combinedPrompt = bsPrompt + `\n\nADDITIONAL FIX — Cooking Range:\n${OVEN_SECOND_PASS_PROMPT}`;
  fs.writeFileSync(path.join(OUTPUT_DIR, "C_combined_prompt.txt"), combinedPrompt);

  const c1 = await generateWithFlash(mainResult.imageBuffer, "image/png", combinedPrompt, bsSwatches);
  fs.writeFileSync(path.join(OUTPUT_DIR, "C_combined_final.png"), c1.imageBuffer);
  console.log(`  Flash combined: ${(c1.durationMs / 1000).toFixed(1)}s`);
  console.log(`  Total: ${(c1.durationMs / 1000).toFixed(1)}s\n`);

  // =========================================================================
  // Summary
  // =========================================================================
  const aTotal = mainResult.durationMs + a1.durationMs + a2.durationMs;
  const bTotal = mainResult.durationMs + b1.durationMs + b2.durationMs;
  const cTotal = mainResult.durationMs + c1.durationMs;

  console.log(`${"=".repeat(60)}`);
  console.log("SUMMARY (post-pass time only, shared main excluded)");
  console.log(`${"=".repeat(60)}`);
  console.log(`  Main pass:                    ${(mainResult.durationMs / 1000).toFixed(1)}s`);
  console.log();
  console.log(`  A: Flash BS → 1.5 oven:       +${((a1.durationMs + a2.durationMs) / 1000).toFixed(1)}s (${(aTotal / 1000).toFixed(1)}s total)`);
  console.log(`  B: 1.5 oven → Flash BS:       +${((b1.durationMs + b2.durationMs) / 1000).toFixed(1)}s (${(bTotal / 1000).toFixed(1)}s total)`);
  console.log(`  C: Flash combined:             +${(c1.durationMs / 1000).toFixed(1)}s (${(cTotal / 1000).toFixed(1)}s total)`);
  console.log();
  console.log("Outputs:");
  console.log("  A2_oven_final.png              — backsplash first, oven last");
  console.log("  B2_flash_backsplash_final.png  — oven first, backsplash last");
  console.log("  C_combined_final.png           — both in one Flash pass");
  console.log();
  console.log("Compare: backsplash pattern quality, oven geometry, room preservation.");

  fs.writeFileSync(path.join(OUTPUT_DIR, "results.json"), JSON.stringify({
    timestamp: new Date().toISOString(),
    flashModel: FLASH_MODEL, openaiModel: OPENAI_MODEL,
    mainPassMs: mainResult.durationMs,
    A: { flashBsMs: a1.durationMs, ovenMs: a2.durationMs, totalMs: aTotal },
    B: { ovenMs: b1.durationMs, flashBsMs: b2.durationMs, totalMs: bTotal },
    C: { combinedMs: c1.durationMs, totalMs: cTotal },
  }, null, 2));
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
