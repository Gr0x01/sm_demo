/**
 * Pre-seed the /try demo cache with 200 selection combos for the sample kitchen.
 * Each cached image enables instant cache hits or ~30s scoped edits instead of 60s cold gens.
 *
 * Uses Flux 2 Max via the shared flux-pipeline.ts and Demo org DB options via Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-cache.ts [--dry-run] [--concurrency 20] [--layer 1]
 *
 * Flags:
 *   --dry-run       Print combos without generating
 *   --concurrency   Max parallel BFL calls (default: 5)
 *   --layer         Only run layer 1 (125) or layer 2 (75)
 *   --start         Start from combo index N (for resuming)
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFile } from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import {
  hashDemoSelections,
  computeDemoLeaveOneOutHashes,
  DEMO_ORG_ID,
  DEMO_GENERATION_CACHE_VERSION,
} from "@/lib/demo-generate";
import { IMAGE_MODEL } from "@/lib/models";
import { fluxGenerate, createSwatchResolver } from "@/lib/flux-pipeline";
import { getOptionLookup } from "@/lib/db-queries";
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
};

/** Spatial hints for the demo kitchen — must match DEFAULT_SPATIAL_HINTS in generate-demo.ts */
const SPATIAL_HINTS: Record<string, string> = {
  backsplash: "backsplash tile surface behind the countertop, bounded by the underside of upper cabinets above and the countertop below",
  "counter-top": "all horizontal countertop surfaces — perimeter and center workspace",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets above and flanking appliances — every perimeter cabinet door and drawer",
  "kitchen-island-cabinet-color": "island base cabinet panel below the countertop overhang in the foreground",
};

// ---------- Option IDs (DB slugs from Demo org) ----------

const CABINETS = [
  "kitchen-cab-color-driftwood",
  "kitchen-cab-color-white",
  "kitchen-cab-color-fog",
  "kitchen-cab-color-onyx",
  "kitchen-cab-color-admiral-blue",
];

const ISLANDS = [
  "island-color-driftwood",
  "island-color-white",
  "island-color-fog",
  "island-color-onyx",
  "island-color-admiral-blue",
];

const COUNTERTOPS = [
  "ct-granite-steel-grey",
  "ct-granite-dallas-white",
  "ct-quartz-lace-white",
  "ct-quartz-calacatta-duolina",
  "ct-quartz-calacatta-venice",
];

const BACKSPLASHES = [
  "bs-baker-4x12-bev-white",
  "bs-baker-4x16-glacier",
  "bs-baker-4x16-carbon",
  "bs-herringbone-white",
  "bs-herringbone-carbon",
];

const DEFAULT_BACKSPLASH = "bs-baker-4x12-bev-white";

// Layer 2: 5 popular cab/island pairs × 5 counters × 3 non-default backsplashes
const LAYER2_CAB_ISLAND_PAIRS: [string, string][] = [
  ["kitchen-cab-color-white", "island-color-white"],
  ["kitchen-cab-color-white", "island-color-admiral-blue"],
  ["kitchen-cab-color-driftwood", "island-color-driftwood"],
  ["kitchen-cab-color-onyx", "island-color-onyx"],
  ["kitchen-cab-color-fog", "island-color-fog"],
];

const LAYER2_BACKSPLASHES = [
  "bs-baker-4x16-carbon",
  "bs-herringbone-white",
  "bs-herringbone-carbon",
];

// ---------- Combo generation ----------

interface SelectionCombo {
  layer: number;
  label: string;
  selections: Record<string, string>;
}

function generateCombos(): SelectionCombo[] {
  const combos: SelectionCombo[] = [];

  // Layer 1: all cab × all island × all counter × default backsplash (4×5×5 = 100)
  for (const cab of CABINETS) {
    for (const island of ISLANDS) {
      for (const counter of COUNTERTOPS) {
        const cabName = cab.replace("kitchen-cab-color-", "");
        const islandName = island.replace("island-color-", "");
        const counterName = counter.replace(/^ct-(granite-|quartz-)/, "");
        combos.push({
          layer: 1,
          label: `L1 ${cabName}/${islandName}/${counterName}/default-bs`,
          selections: {
            "kitchen-cabinet-color": cab,
            "kitchen-island-cabinet-color": island,
            "counter-top": counter,
            backsplash: DEFAULT_BACKSPLASH,
          },
        });
      }
    }
  }

  // Layer 2: popular pairs × all counters × non-default backsplashes (5×5×3 = 75)
  for (const [cab, island] of LAYER2_CAB_ISLAND_PAIRS) {
    for (const counter of COUNTERTOPS) {
      for (const bs of LAYER2_BACKSPLASHES) {
        const cabName = cab.replace("kitchen-cab-color-", "");
        const islandName = island.replace("island-color-", "");
        const counterName = counter.replace(/^ct-(granite-|quartz-)/, "");
        const bsName = bs.replace("bs-baker-", "").replace("bs-", "");
        combos.push({
          layer: 2,
          label: `L2 ${cabName}/${islandName}/${counterName}/${bsName}`,
          selections: {
            "kitchen-cabinet-color": cab,
            "kitchen-island-cabinet-color": island,
            "counter-top": counter,
            backsplash: bs,
          },
        });
      }
    }
  }

  return combos;
}

// ---------- Main ----------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const concurrencyIdx = args.indexOf("--concurrency");
  const concurrency = concurrencyIdx !== -1 ? parseInt(args[concurrencyIdx + 1], 10) : 5;
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
  console.log(`Cache version: ${DEMO_GENERATION_CACHE_VERSION}`);
  console.log(`Model: ${IMAGE_MODEL} (Flux 2)`);

  if (dryRun) {
    for (const [i, combo] of combos.entries()) {
      const { combinedHash } = hashDemoSelections(photoHash, combo.selections, SAMPLE_SCENE_ANALYSIS);
      console.log(`[${i}] ${combo.label} → ${combinedHash}`);
    }
    console.log(`\nDry run complete. ${combos.length} combos would be generated.`);
    return;
  }

  // Validate env
  if (!process.env.BFL_API_KEY) throw new Error("Missing BFL_API_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error("Missing Supabase env vars");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const optionLookup = await getOptionLookup(DEMO_ORG_ID);
  const swatchResolver = createSwatchResolver({
    storage: supabase.storage,
  } as ReturnType<typeof import("@/lib/supabase").getServiceClient>);

  // Upload sample photo to demo-uploads (once)
  const { error: uploadErr } = await supabase.storage
    .from("demo-uploads")
    .upload(`${photoHash}.jpg`, photoBytes, { contentType: "image/jpeg", upsert: true });
  if (uploadErr) console.warn(`Photo upload warning: ${uploadErr.message}`);
  else console.log(`Photo uploaded to demo-uploads/${photoHash}.jpg`);

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

    // Generate via Flux 2 shared pipeline
    const genStart = performance.now();
    try {
      const result = await fluxGenerate({
        heroBuffer: photoBytes,
        selections: effectiveSelections,
        optionLookup,
        spatialHints: SPATIAL_HINTS,
        swatchResolver,
        defaultSurfaceColors: SAMPLE_SCENE_ANALYSIS.defaultSurfaceColors,
      });

      const durationMs = Math.round(performance.now() - genStart);

      // Upload to storage
      const { error: storageErr } = await supabase.storage
        .from("demo-generated")
        .upload(outputPath, result.imageBuffer, { contentType: "image/jpeg", upsert: true });
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
          prompt: result.prompt,
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
        `[${index}] OK ${combo.label} (${durationMs}ms, ${result.passes} pass) — ${completed}/${combos.length} done, ${skipped} skipped, ${Math.round(rate)}/min`,
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
  const estCost = (completed * 0.09).toFixed(2);
  console.log(`\nDone in ${totalTime}s — ${completed} generated (~$${estCost}), ${skipped} skipped, ${failed} failed`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
