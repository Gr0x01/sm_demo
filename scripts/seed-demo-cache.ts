/**
 * Pre-seed the /try demo cache with 200 selection combos for the sample kitchen.
 * Each cached image enables instant cache hits or ~30s scoped edits instead of 60s cold gens.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-cache.ts [--dry-run] [--concurrency 20] [--layer 1]
 *
 * Flags:
 *   --dry-run       Print combos without generating
 *   --concurrency   Max parallel OpenAI calls (default: 20)
 *   --layer         Only run layer 1 (125) or layer 2 (75)
 *   --start         Start from combo index N (for resuming)
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFile } from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import sharp from "sharp";
import OpenAI, { toFile } from "openai";
import { createClient } from "@supabase/supabase-js";
import { buildEditPrompt } from "@/lib/generate";
import type { SwatchBufferResolver } from "@/lib/generate";
import { DEMO_SUBCATEGORIES } from "@/lib/demo-options";
import {
  hashDemoSelections,
  computeDemoLeaveOneOutHashes,
  DEMO_ORG_ID,
  DEMO_GENERATION_CACHE_VERSION,
} from "@/lib/demo-generate";
import { IMAGE_MODEL } from "@/lib/models";
import type { Option, SubCategory } from "@/types";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";

// ---------- Config ----------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PHOTO_PATH = path.join(process.cwd(), "public", "sample-kitchen.jpg");
const SEED_SESSION_ID = "seed-demo-cache";

const SAMPLE_SCENE_ANALYSIS: DemoSceneAnalysis = {
  sceneDescription:
    "Modern model home kitchen with white shaker cabinets, light granite countertops, stainless steel appliances, hardwood flooring, and a large center island with pendant lights. Natural light from windows on the left.",
  hasIsland: true,
  kitchenType: "l-shape",
  cameraAngle: "straight-on",
  visibleSurfaces: { cabinets: true, countertop: true, backsplash: true, island: true },
  spatialHints: {
    layout:
      "Island runs horizontally in the foreground. Upper and lower cabinets span the back wall with a range hood centered. Countertops wrap from left wall along the back. Hardwood flooring throughout.",
  },
};

const DEFAULT_SPATIAL_HINTS: Record<string, string> = {
  backsplash: "tile backsplash between upper cabinets and countertop on the walls",
  "counter-top": "all visible countertop surfaces",
  "kitchen-cabinet-color": "perimeter/wall cabinet faces only (NOT the island base cabinets)",
  "island-cabinet-color": "island base cabinet faces only (NOT the perimeter/wall cabinets)",
};

// ---------- Option IDs ----------

const CABINETS = [
  "kitchen-cab-color-timber",
  "kitchen-cab-color-pearl",
  "kitchen-cab-color-mist",
  "kitchen-cab-color-depths",
  "kitchen-cab-color-ink",
];

const ISLANDS = [
  "island-cab-color-timber",
  "island-cab-color-pearl",
  "island-cab-color-mist",
  "island-cab-color-depths",
  "island-cab-color-ink",
];

const COUNTERTOPS = [
  "ct-dark-granite",
  "ct-cream-granite",
  "ct-speckled-granite",
  "ct-white-quartz",
  "ct-marble-quartz",
];

const BACKSPLASHES = [
  "bs-white-gloss-subway",  // default
  "bs-charcoal-subway",
  "bs-taupe-subway",
  "bs-dark-herringbone",
  "bs-carbon-hex",
];

const DEFAULT_BACKSPLASH = "bs-white-gloss-subway";

// Layer 2: 5 popular cab/island pairs × 5 counters × 3 non-default backsplashes
const LAYER2_CAB_ISLAND_PAIRS: [string, string][] = [
  ["kitchen-cab-color-pearl", "island-cab-color-pearl"],
  ["kitchen-cab-color-pearl", "island-cab-color-depths"],
  ["kitchen-cab-color-timber", "island-cab-color-timber"],
  ["kitchen-cab-color-ink", "island-cab-color-ink"],
  ["kitchen-cab-color-mist", "island-cab-color-mist"],
];

const LAYER2_BACKSPLASHES = [
  "bs-charcoal-subway",
  "bs-dark-herringbone",
  "bs-carbon-hex",
];

// ---------- Combo generation ----------

interface SelectionCombo {
  layer: number;
  label: string;
  selections: Record<string, string>;
}

function generateCombos(): SelectionCombo[] {
  const combos: SelectionCombo[] = [];

  // Layer 1: all cab × all island × all counter × default backsplash
  for (const cab of CABINETS) {
    for (const island of ISLANDS) {
      for (const counter of COUNTERTOPS) {
        const cabName = cab.replace("kitchen-cab-color-", "");
        const islandName = island.replace("island-cab-color-", "");
        const counterName = counter.replace("ct-", "");
        combos.push({
          layer: 1,
          label: `L1 ${cabName}/${islandName}/${counterName}/default-bs`,
          selections: {
            "kitchen-cabinet-color": cab,
            "island-cabinet-color": island,
            "counter-top": counter,
            backsplash: DEFAULT_BACKSPLASH,
          },
        });
      }
    }
  }

  // Layer 2: popular pairs × all counters × non-default backsplashes
  for (const [cab, island] of LAYER2_CAB_ISLAND_PAIRS) {
    for (const counter of COUNTERTOPS) {
      for (const bs of LAYER2_BACKSPLASHES) {
        const cabName = cab.replace("kitchen-cab-color-", "");
        const islandName = island.replace("island-cab-color-", "");
        const counterName = counter.replace("ct-", "");
        const bsName = bs.replace("bs-", "");
        combos.push({
          layer: 2,
          label: `L2 ${cabName}/${islandName}/${counterName}/${bsName}`,
          selections: {
            "kitchen-cabinet-color": cab,
            "island-cabinet-color": island,
            "counter-top": counter,
            backsplash: bs,
          },
        });
      }
    }
  }

  return combos;
}

// ---------- Helpers ----------

function buildOptionLookup(): Map<string, { option: Option; subCategory: SubCategory }> {
  const map = new Map<string, { option: Option; subCategory: SubCategory }>();
  for (const sub of DEMO_SUBCATEGORIES) {
    for (const opt of sub.options) {
      map.set(`${sub.id}:${opt.id}`, { option: opt, subCategory: sub });
    }
  }
  return map;
}

const resolveLocalSwatch: SwatchBufferResolver = async (swatchUrl: string) => {
  const swatchPath = path.join(process.cwd(), "public", swatchUrl);
  const ext = path.extname(swatchUrl).slice(1).toLowerCase();
  try {
    const rawBuffer = await readFile(swatchPath);
    if (ext === "svg" || ext === "svgz") {
      const pngBuffer = await sharp(rawBuffer).png().toBuffer();
      return { buffer: pngBuffer, mediaType: "image/png" };
    }
    const mediaType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    return { buffer: rawBuffer, mediaType };
  } catch {
    return null;
  }
};

function buildSceneDescription(): string {
  const lines: string[] = [];
  if (SAMPLE_SCENE_ANALYSIS.sceneDescription) lines.push(SAMPLE_SCENE_ANALYSIS.sceneDescription);
  if (SAMPLE_SCENE_ANALYSIS.kitchenType) lines.push(`Kitchen type: ${SAMPLE_SCENE_ANALYSIS.kitchenType}`);
  if (SAMPLE_SCENE_ANALYSIS.cameraAngle) lines.push(`Camera angle: ${SAMPLE_SCENE_ANALYSIS.cameraAngle}`);
  const vs = SAMPLE_SCENE_ANALYSIS.visibleSurfaces;
  if (vs) {
    const visible: string[] = [];
    if (vs.backsplash !== false) visible.push("backsplash");
    if (vs.countertop !== false) visible.push("countertop");
    if (vs.cabinets !== false) visible.push("cabinets");
    if (vs.island) visible.push("island");
    if (visible.length > 0) lines.push(`Visible surfaces: ${visible.join(", ")}`);
  }
  return lines.join(". ");
}

// ---------- Main ----------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const concurrencyIdx = args.indexOf("--concurrency");
  const concurrency = concurrencyIdx !== -1 ? parseInt(args[concurrencyIdx + 1], 10) : 20;
  const layerIdx = args.indexOf("--layer");
  const layerFilter = layerIdx !== -1 ? parseInt(args[layerIdx + 1], 10) : null;
  const startIdx = args.indexOf("--start");
  const startFrom = startIdx !== -1 ? parseInt(args[startIdx + 1], 10) : 0;

  // Compute deterministic photo hash from raw file bytes
  const photoBytes = await readFile(PHOTO_PATH);
  const photoHash = createHash("sha256").update(photoBytes).digest("hex").slice(0, 16);

  let combos = generateCombos();
  if (layerFilter) combos = combos.filter((c) => c.layer === layerFilter);
  if (startFrom > 0) combos = combos.slice(startFrom);

  console.log(`Photo hash: ${photoHash}`);
  console.log(`Total combos: ${combos.length} (concurrency: ${concurrency})`);
  console.log(`Layer 1: ${combos.filter((c) => c.layer === 1).length}, Layer 2: ${combos.filter((c) => c.layer === 2).length}`);

  if (dryRun) {
    for (const [i, combo] of combos.entries()) {
      const { combinedHash } = hashDemoSelections(photoHash, combo.selections, SAMPLE_SCENE_ANALYSIS);
      console.log(`[${i}] ${combo.label} → ${combinedHash}`);
    }
    console.log(`\nDry run complete. ${combos.length} combos would be generated.`);
    return;
  }

  // Validate env
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Missing Supabase env vars");

  const openai = new OpenAI();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const optionLookup = buildOptionLookup();
  const scopedSubcategoryIds = DEMO_SUBCATEGORIES.map((s) => s.id);
  const sceneDescription = buildSceneDescription();

  // Upload sample photo to demo-uploads (once)
  const { error: uploadErr } = await supabase.storage
    .from("demo-uploads")
    .upload(`${photoHash}.jpg`, photoBytes, { contentType: "image/jpeg", upsert: true });
  if (uploadErr) console.warn(`Photo upload warning: ${uploadErr.message}`);
  else console.log(`Photo uploaded to demo-uploads/${photoHash}.jpg`);

  // Pre-warm swatch cache: build prompt for first combo to trigger all swatch reads
  console.log("Pre-warming swatch cache...");
  await buildEditPrompt(
    combos[0].selections,
    optionLookup,
    DEFAULT_SPATIAL_HINTS,
    scopedSubcategoryIds,
    sceneDescription,
    null,
    resolveLocalSwatch,
  );

  // Stats
  let completed = 0;
  let skipped = 0;
  let failed = 0;
  const startTime = Date.now();

  async function processCombo(combo: SelectionCombo, index: number): Promise<void> {
    const { combinedHash, effectiveSelections } = hashDemoSelections(
      photoHash,
      combo.selections,
      SAMPLE_SCENE_ANALYSIS,
    );
    const leaveOneOutHashes = computeDemoLeaveOneOutHashes(photoHash, effectiveSelections);
    const outputPath = `demo-${combinedHash}.jpg`;

    // Check if already cached
    const { data: existing } = await supabase
      .from("generated_images")
      .select("image_path")
      .eq("selections_hash", combinedHash)
      .neq("image_path", "__pending__")
      .single();

    if (existing?.image_path) {
      skipped++;
      console.log(`[${index}] SKIP (cached) ${combo.label}`);
      return;
    }

    // Build prompt
    const { prompt, swatches } = await buildEditPrompt(
      effectiveSelections,
      optionLookup,
      DEFAULT_SPATIAL_HINTS,
      scopedSubcategoryIds,
      sceneDescription,
      null,
      resolveLocalSwatch,
    );

    const supportedSwatches = swatches.filter((s) =>
      ["image/jpeg", "image/png", "image/webp"].includes(s.mediaType),
    );

    // Assemble images: photo + swatches
    const inputImages = [
      await toFile(photoBytes, "kitchen.jpg", { type: "image/jpeg" }),
      ...(await Promise.all(
        supportedSwatches.map((s) => {
          const ext = s.mediaType.split("/")[1] || "png";
          const filename = `${s.label.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
          return toFile(s.buffer, filename, { type: s.mediaType });
        }),
      )),
    ];

    // Call OpenAI
    const genStart = performance.now();
    try {
      const result = await openai.images.edit({
        model: IMAGE_MODEL,
        image: inputImages,
        prompt,
        quality: "medium",
        size: "1536x1024",
        input_fidelity: "high",
      });

      const imageData = result.data?.[0];
      if (!imageData?.b64_json) throw new Error("No image generated");

      const durationMs = Math.round(performance.now() - genStart);

      // Convert to JPEG and upload
      const jpegBuffer = await sharp(Buffer.from(imageData.b64_json, "base64"))
        .jpeg({ quality: 90 })
        .toBuffer();

      const { error: storageErr } = await supabase.storage
        .from("demo-generated")
        .upload(outputPath, jpegBuffer, { contentType: "image/jpeg", upsert: true });
      if (storageErr) throw new Error(`Storage upload failed: ${storageErr.message}`);

      // Persist to DB with leave-one-out hashes
      const { error: dbErr } = await supabase.from("generated_images").upsert(
        {
          selections_hash: combinedHash,
          selections_json: {
            _source: "demo",
            _cacheVersion: DEMO_GENERATION_CACHE_VERSION,
            _session_id: SEED_SESSION_ID,
            _photo_hash: photoHash,
            ...effectiveSelections,
          },
          image_path: outputPath,
          prompt,
          step_id: null,
          model: IMAGE_MODEL,
          org_id: DEMO_ORG_ID,
          scoped_edit_depth: 0,
          leave_one_out_hashes: leaveOneOutHashes,
        },
        { onConflict: "selections_hash" },
      );
      if (dbErr) console.error(`[${index}] DB error: ${dbErr.message}`);

      completed++;
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = completed / (elapsed / 60);
      console.log(
        `[${index}] OK ${combo.label} (${durationMs}ms) — ${completed}/${combos.length} done, ${skipped} skipped, ${Math.round(rate)}/min`,
      );
    } catch (err: unknown) {
      failed++;
      const durationMs = Math.round(performance.now() - genStart);
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${index}] FAIL ${combo.label} (${durationMs}ms): ${msg}`);
    }
  }

  // Process with concurrency limit
  const queue = combos.map((combo, i) => ({ combo, index: i + startFrom }));
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      await processCombo(item.combo, item.index);
    }
  });

  await Promise.all(workers);

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`\nDone in ${totalTime}s — ${completed} generated, ${skipped} skipped, ${failed} failed`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
