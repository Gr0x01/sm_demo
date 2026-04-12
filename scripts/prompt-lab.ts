/**
 * Prompt Lab — side-by-side full-gen prompt tuning for BFL Flux 2.
 *
 * Hold swatches/photo constant, vary the PromptProse object, compare results.
 *
 * Usage:
 *   npx tsx scripts/prompt-lab.ts init <session> --photo <stepPhotoId> [--selections '{"sub":"opt"}']
 *   npx tsx scripts/prompt-lab.ts run <session> [--concurrency 2] [--variant <id>] [--only-pending]
 *   npx tsx scripts/prompt-lab.ts review <session>
 *   npx tsx scripts/prompt-lab.ts show <session>           # print assembled prompts without generating
 *
 * Session data lives in tmp/prompt-lab/<session>/
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { getStepPhotoAiConfig } from "@/lib/db-queries";
import { createSwatchResolver, preWarmSwatchCache } from "@/lib/flux-pipeline";
import { buildProsePrompt, buildProseScopedEdit } from "@/lib/generate";
import { generateImage } from "@/lib/bfl";
import { IMAGE_MODEL, SCOPED_EDIT_MODEL } from "@/lib/models";
import type { BflModel } from "@/lib/bfl";
import type { PromptProse } from "@/lib/step-config";
import type { Option, SubCategory } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Direct option lookup — bypasses Next.js unstable_cache (not available in scripts)
// ---------------------------------------------------------------------------

async function getOptionLookupDirect(
  supabase: SupabaseClient,
  orgId: string,
): Promise<Map<string, { option: Option; subCategory: SubCategory }>> {
  const { data: cats, error } = await supabase
    .from("categories")
    .select(`
      id, slug, name, sort_order,
      subcategories (
        id, slug, name, category_id, is_visual, is_additive, unit_label, max_quantity, sort_order, generation_hint, generation_rules, generation_rules_when_not_selected, is_appliance,
        options ( id, slug, name, price, prompt_descriptor, dimensions, swatch_url, swatch_color, nudge, sort_order, generation_rules, is_default, is_painted, scoped_edit_model, linked_to_subcategory )
      )
    `)
    .eq("org_id", orgId)
    .order("sort_order");

  if (error || !cats) throw new Error(`Failed to load categories: ${error?.message}`);

  const map = new Map<string, { option: Option; subCategory: SubCategory }>();

  for (const cat of cats) {
    for (const sub of (cat.subcategories ?? []) as any[]) {
      const subCategory: SubCategory = {
        id: sub.slug,
        name: sub.name,
        categoryId: cat.slug as string,
        isVisual: sub.is_visual,
        isAdditive: sub.is_additive || undefined,
        unitLabel: sub.unit_label ?? undefined,
        maxQuantity: sub.max_quantity ?? undefined,
        generationHint: sub.generation_hint ?? undefined,
        generationRules: sub.generation_rules ?? undefined,
        generationRulesWhenNotSelected: sub.generation_rules_when_not_selected ?? undefined,
        isAppliance: sub.is_appliance || undefined,
        options: [],
      };

      for (const opt of (sub.options ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order)) {
        const option: Option = {
          id: opt.slug,
          name: opt.name,
          price: opt.price,
          promptDescriptor: opt.prompt_descriptor ?? undefined,
          dimensions: opt.dimensions ?? undefined,
          swatchUrl: opt.swatch_url ?? undefined,
          swatchColor: opt.swatch_color ?? undefined,
          nudge: opt.nudge ?? undefined,
          generationRules: opt.generation_rules ?? undefined,
          isDefault: opt.is_default || undefined,
          isPainted: opt.is_painted || undefined,
          scopedEditModel: opt.scoped_edit_model ?? undefined,
          linkedToSubcategory: opt.linked_to_subcategory ?? undefined,
        };
        subCategory.options.push(option);
        map.set(`${sub.slug}:${opt.slug}`, { option, subCategory });
      }
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

interface VariantResult {
  runIndex: number;
  imagePath: string;
  prompt: string;
  durationMs: number;
  timestamp: string;
  model?: string;
}

interface ScopedEditConfig {
  subcategoryId: string;
  optionId: string;
}

interface RefineConfig {
  /** The correction prompt sent to BFL for the second pass. */
  prompt: string;
  /** Subcategory slug whose selected swatch is sent as input_image_2 to the refine. */
  swatchSubId?: string;
}

interface Variant {
  id: string;
  label: string;
  prose: PromptProse;
  runs: number;
  results: VariantResult[];
  notes?: string;
  verdict?: "approved" | "rejected" | "maybe";
  /** Override BFL model for the main pass. Default: flux-2-max (full gen), flux-2-flex (scoped). */
  model?: string;
  /** When set, runs a scoped edit instead of full gen. */
  scoped?: ScopedEditConfig;
  /** When set, runs a second Max pass on the output (oven correction, etc.). */
  refine?: RefineConfig;
}

interface SessionConfig {
  created: string;
  photo: {
    stepPhotoId: string;
    localPath: string;
    label: string;
    imagePath: string; // Supabase storage path
  };
  orgId: string;
  floorplanId: string;
  stepSlug: string;
  spatialHints: Record<string, string>;
  selections: Record<string, string>;
  scopedSubcategoryIds: string[];
  variants: Variant[];
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.join(process.cwd(), "tmp", "prompt-lab");

function sessionDir(session: string): string {
  return path.join(ROOT, session);
}

function configPath(session: string): string {
  return path.join(sessionDir(session), "config.json");
}

function resultsDir(session: string): string {
  return path.join(sessionDir(session), "results");
}

function reviewPath(session: string): string {
  return path.join(sessionDir(session), "review.html");
}

function loadConfig(session: string): SessionConfig {
  const p = configPath(session);
  if (!fs.existsSync(p)) {
    throw new Error(`Session "${session}" not found at ${p}`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function saveConfig(session: string, config: SessionConfig): void {
  fs.writeFileSync(configPath(session), JSON.stringify(config, null, 2));
}

// ---------------------------------------------------------------------------
// Supabase client (service role for direct DB + storage access)
// ---------------------------------------------------------------------------

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// INIT
// ---------------------------------------------------------------------------

async function init(session: string, stepPhotoId: string, selectionsOverride?: Record<string, string>) {
  const dir = sessionDir(session);
  if (fs.existsSync(configPath(session))) {
    throw new Error(`Session "${session}" already exists. Delete ${dir} to start fresh.`);
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, "results"), { recursive: true });

  console.log(`Fetching AI config for step_photo ${stepPhotoId}...`);
  const aiConfig = await getStepPhotoAiConfig(stepPhotoId);
  if (!aiConfig) throw new Error(`step_photo ${stepPhotoId} not found`);

  const { orgId, floorplanId, stepSlug, spatialHints, photo } = aiConfig;
  console.log(`  org=${orgId} floorplan=${floorplanId} step=${stepSlug} photo="${photo.label}"`);

  // Download the source photo
  const supabase = getSupabase();
  console.log(`Downloading photo from storage: ${photo.imagePath}...`);
  const { data: photoData, error: photoErr } = await supabase.storage
    .from("rooms")
    .download(photo.imagePath);
  if (photoErr || !photoData) throw new Error(`Failed to download photo: ${photoErr?.message}`);

  const photoBuffer = Buffer.from(await photoData.arrayBuffer());
  const localPhotoPath = path.join(dir, "source.jpg");
  fs.writeFileSync(localPhotoPath, photoBuffer);
  console.log(`  Saved source photo (${(photoBuffer.length / 1024).toFixed(0)}KB)`);

  // Build default selections from is_default options for scoped subcategories
  const optionLookup = await getOptionLookupDirect(supabase, orgId);
  const scopedIds = photo.subcategoryIds ?? [];

  let selections: Record<string, string>;
  if (selectionsOverride) {
    selections = selectionsOverride;
    console.log(`  Using provided selections (${Object.keys(selections).length} entries)`);
  } else {
    selections = {};
    // Build a sub → default option map from the option lookup
    const subDefaults = new Map<string, string>();
    for (const [key, entry] of optionLookup.entries()) {
      const [subId] = key.split(":");
      if (entry.option.isDefault && scopedIds.includes(subId)) {
        subDefaults.set(subId, entry.option.id);
      }
    }
    // Fall back to first option with a swatch if no default marked
    for (const subId of scopedIds) {
      if (subDefaults.has(subId)) {
        selections[subId] = subDefaults.get(subId)!;
      } else {
        for (const [key, entry] of optionLookup.entries()) {
          const [s] = key.split(":");
          if (s === subId && entry.option.swatchUrl) {
            selections[subId] = entry.option.id;
            break;
          }
        }
      }
    }
    console.log(`  Default selections: ${JSON.stringify(selections, null, 2)}`);
  }

  // Extract current prose (the baseline variant)
  const prose = photo.promptProse;
  const variants: Variant[] = [];
  if (prose) {
    variants.push({
      id: "baseline",
      label: "Baseline (current DB prose)",
      prose,
      runs: 1,
      results: [],
    });
    console.log(`  Added baseline variant from DB prose (v${prose.version})`);
  } else {
    console.log(`  No prompt_prose on this photo — add variants manually to config.json`);
  }

  const config: SessionConfig = {
    created: new Date().toISOString(),
    photo: {
      stepPhotoId,
      localPath: "source.jpg",
      label: photo.label ?? "Untitled",
      imagePath: photo.imagePath,
    },
    orgId,
    floorplanId,
    stepSlug,
    spatialHints,
    selections,
    scopedSubcategoryIds: scopedIds,
    variants,
  };

  saveConfig(session, config);
  console.log(`\nSession "${session}" initialized at ${dir}`);
  console.log(`Next: add variants, then run.`);
  console.log(`  npx tsx scripts/prompt-lab.ts add ${session} --from baseline --id v2 --label "shorter actions"`);
  console.log(`  npx tsx scripts/prompt-lab.ts run ${session}`);
}

// ---------------------------------------------------------------------------
// LS — list all sessions
// ---------------------------------------------------------------------------

function ls() {
  if (!fs.existsSync(ROOT)) {
    console.log("No sessions yet.");
    return;
  }

  const dirs = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(ROOT, d.name, "config.json")));

  if (dirs.length === 0) {
    console.log("No sessions yet.");
    return;
  }

  console.log(`${dirs.length} session(s) in tmp/prompt-lab/\n`);

  for (const dir of dirs) {
    const config: SessionConfig = JSON.parse(
      fs.readFileSync(path.join(ROOT, dir.name, "config.json"), "utf8"),
    );
    const totalRuns = config.variants.reduce((s, v) => s + v.results.length, 0);
    const approved = config.variants.filter(v => v.verdict === "approved").length;
    const created = config.created.split("T")[0];

    const approvedTag = approved > 0 ? ` [${approved} approved]` : "";
    console.log(`  ${dir.name.padEnd(28)} ${config.photo.label.padEnd(16)} ${config.variants.length}v ${totalRuns}r  ${created}${approvedTag}`);
  }
}

// ---------------------------------------------------------------------------
// STATUS — show variant detail for a session
// ---------------------------------------------------------------------------

function status(session: string) {
  const config = loadConfig(session);

  console.log(`Session: ${session}`);
  console.log(`Photo:   ${config.photo.label} (${config.stepSlug})`);
  console.log(`Created: ${config.created.split("T")[0]}`);
  console.log(`Subs:    ${config.scopedSubcategoryIds.join(", ")}`);
  console.log(`\nSelections:`);
  for (const [sub, opt] of Object.entries(config.selections)) {
    console.log(`  ${sub}: ${opt}`);
  }

  console.log(`\nVariants (${config.variants.length}):\n`);

  for (const v of config.variants) {
    const runs = v.results.length;
    const pending = v.runs - runs;
    const verdict = v.verdict ? ` [${v.verdict.toUpperCase()}]` : "";
    const notes = v.notes ? `  "${v.notes.slice(0, 60)}${v.notes.length > 60 ? "..." : ""}"` : "";
    const mode = v.scoped ? `scoped: ${v.scoped.subcategoryId} → ${v.scoped.optionId}` : "full gen";
    const model = v.model ?? (v.scoped ? SCOPED_EDIT_MODEL : IMAGE_MODEL);
    const refineTag = v.refine ? ` + refine` : "";

    console.log(`  ${v.id.padEnd(20)} ${v.label}`);
    console.log(`  ${"".padEnd(20)} ${mode}  |  ${model}${refineTag}  |  ${runs}/${v.runs} runs${pending > 0 ? ` (${pending} pending)` : ""}${verdict}${notes}`);

    // Show action clauses (the main thing being tuned)
    if (v.prose.actions) {
      for (const [subId, clause] of Object.entries(v.prose.actions)) {
        console.log(`  ${"".padEnd(20)}   ${subId}: ${clause}`);
      }
    }
    console.log();
  }
}

// ---------------------------------------------------------------------------
// ADD — fork a variant from an existing one
// ---------------------------------------------------------------------------

function add(
  session: string,
  fromId: string,
  newId: string,
  label: string,
  opts: { model?: string; scoped?: ScopedEditConfig; refine?: RefineConfig } = {},
) {
  const config = loadConfig(session);

  if (config.variants.some(v => v.id === newId)) {
    throw new Error(`Variant "${newId}" already exists. Pick a different id.`);
  }

  const source = config.variants.find(v => v.id === fromId);
  if (!source) {
    const available = config.variants.map(v => v.id).join(", ");
    throw new Error(`Variant "${fromId}" not found. Available: ${available}`);
  }

  const newVariant: Variant = {
    id: newId,
    label,
    prose: JSON.parse(JSON.stringify(source.prose)), // deep copy
    runs: 1,
    results: [],
    // Inherit model/scoped/refine from source, allow CLI override
    ...(opts.model ? { model: opts.model } : source.model ? { model: source.model } : {}),
    ...(opts.scoped ? { scoped: opts.scoped } : source.scoped ? { scoped: { ...source.scoped } } : {}),
    ...(opts.refine ? { refine: opts.refine } : source.refine ? { refine: { ...source.refine } } : {}),
  };

  config.variants.push(newVariant);
  saveConfig(session, config);

  const mode = newVariant.scoped ? `scoped: ${newVariant.scoped.subcategoryId}` : "full gen";
  const model = newVariant.model ?? (newVariant.scoped ? SCOPED_EDIT_MODEL : IMAGE_MODEL);
  console.log(`Added variant "${newId}" (forked from "${fromId}") — ${mode}, ${model}`);
  console.log(`Edit the prose in config.json, then run:`);
  console.log(`  npx tsx scripts/prompt-lab.ts show ${session}`);
  console.log(`  npx tsx scripts/prompt-lab.ts run ${session} --variant ${newId}`);
}

// ---------------------------------------------------------------------------
// APPLY — write approved variant's prose to the DB
// ---------------------------------------------------------------------------

async function apply(session: string, variantId?: string) {
  const config = loadConfig(session);

  // Find the variant to apply
  let variant: Variant | undefined;
  if (variantId) {
    variant = config.variants.find(v => v.id === variantId);
    if (!variant) throw new Error(`Variant "${variantId}" not found.`);
  } else {
    // Auto-pick the approved variant
    const approved = config.variants.filter(v => v.verdict === "approved");
    if (approved.length === 0) {
      throw new Error("No approved variant. Either pass --variant <id> or approve one in the review page, then export + import verdicts.");
    }
    if (approved.length > 1) {
      throw new Error(`Multiple approved variants: ${approved.map(v => v.id).join(", ")}. Pass --variant <id> to pick one.`);
    }
    variant = approved[0];
  }

  console.log(`Applying variant "${variant.id}" → step_photo ${config.photo.stepPhotoId}`);
  console.log(`\nProse to write:`);
  console.log(JSON.stringify(variant.prose, null, 2));

  const supabase = getSupabase();
  const { error } = await supabase
    .from("step_photos")
    .update({ prompt_prose: variant.prose })
    .eq("id", config.photo.stepPhotoId);

  if (error) throw new Error(`DB update failed: ${error.message}`);

  // Mark as applied in config
  variant.verdict = "approved";
  (config as any).appliedVariant = variant.id;
  (config as any).appliedAt = new Date().toISOString();
  saveConfig(session, config);

  console.log(`\nDone. prompt_prose updated in DB.`);
  console.log(`Note: Next.js unstable_cache (24h TTL) may serve stale data until restart/redeploy.`);
}

// ---------------------------------------------------------------------------
// IMPORT-VERDICTS — read exported decisions JSON back into config
// ---------------------------------------------------------------------------

function importVerdicts(session: string, jsonPath: string) {
  const config = loadConfig(session);
  const decisions = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  let updated = 0;
  for (const [variantId, data] of Object.entries(decisions) as [string, any][]) {
    const variant = config.variants.find(v => v.id === variantId);
    if (!variant) continue;
    if (data.verdict) { variant.verdict = data.verdict; updated++; }
    if (data.notes) { variant.notes = data.notes; updated++; }
  }

  saveConfig(session, config);
  console.log(`Imported verdicts for ${updated} variant(s) into ${session}`);
}

// ---------------------------------------------------------------------------
// SHOW — print assembled prompts without generating
// ---------------------------------------------------------------------------

async function show(session: string) {
  const config = loadConfig(session);
  const supabase = getSupabase();
  const optionLookup = await getOptionLookupDirect(supabase, config.orgId);
  const swatchResolver = createSwatchResolver(supabase as ReturnType<typeof import("@/lib/supabase").getServiceClient>);

  for (const variant of config.variants) {
    const mode = variant.scoped ? `scoped: ${variant.scoped.subcategoryId}` : "full gen";
    const model = variant.model ?? (variant.scoped ? SCOPED_EDIT_MODEL : IMAGE_MODEL);

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Variant: ${variant.id} — ${variant.label}`);
    console.log(`Mode: ${mode}  |  Model: ${model}`);
    console.log("=".repeat(60));

    try {
      if (variant.scoped) {
        const { prompt, swatches } = await buildProseScopedEdit(
          variant.prose,
          variant.scoped.subcategoryId,
          variant.scoped.optionId,
          optionLookup,
          swatchResolver,
        );
        console.log(`\nPrompt (${prompt.split(/\s+/).length} words):`);
        console.log(prompt);
        console.log(`\nSwatch: image 2 = ${swatches[0]?.subcategoryId} (${swatches[0]?.label})`);
      } else {
        const { prompt, swatches } = await buildProsePrompt(
          variant.prose,
          config.selections,
          optionLookup,
          swatchResolver,
        );
        console.log(`\nPrompt (${prompt.split(/\s+/).length} words):`);
        console.log(prompt);
        console.log(`\nSwatches: ${swatches.map((s, i) => `image ${i + 2} = ${s.subcategoryId} (${s.label})`).join(", ")}`);
      }
    } catch (err) {
      console.error(`  ERROR: ${err instanceof Error ? err.message : err}`);
    }
  }
}

// ---------------------------------------------------------------------------
// RUN
// ---------------------------------------------------------------------------

async function run(session: string, concurrency: number, variantFilter?: string, onlyPending?: boolean) {
  const config = loadConfig(session);
  const dir = sessionDir(session);

  // Load photo buffer
  const heroBuffer = fs.readFileSync(path.join(dir, config.photo.localPath));
  console.log(`Loaded source photo (${(heroBuffer.length / 1024).toFixed(0)}KB)`);

  // Load option lookup + pre-warm swatch cache (one download, reused across all jobs)
  const supabase = getSupabase();
  const optionLookup = await getOptionLookupDirect(supabase, config.orgId);
  const rawResolver = createSwatchResolver(supabase as ReturnType<typeof import("@/lib/supabase").getServiceClient>);
  console.log("Pre-warming swatch cache...");
  const cachedResolver = await preWarmSwatchCache(config.selections, optionLookup, rawResolver);
  console.log("Swatches cached.");

  // Build run queue
  interface RunJob {
    variant: Variant;
    runIndex: number;
  }

  const queue: RunJob[] = [];
  for (const variant of config.variants) {
    if (variantFilter && variant.id !== variantFilter) continue;

    const completedRuns = new Set(variant.results.map(r => r.runIndex));
    for (let i = 0; i < variant.runs; i++) {
      if (onlyPending && completedRuns.has(i)) continue;
      queue.push({ variant, runIndex: i });
    }
  }

  if (queue.length === 0) {
    console.log("Nothing to run. Add variants or increase `runs` count in config.json.");
    return;
  }

  console.log(`Running ${queue.length} generation(s) with concurrency ${concurrency}...\n`);

  let completed = 0;
  const total = queue.length;

  async function processJob(job: RunJob): Promise<void> {
    const { variant, runIndex } = job;
    const tag = `${variant.id}#${runIndex}`;
    console.log(`[${tag}] Starting... (${variant.label})`);

    try {
      const genStart = performance.now();
      let prompt: string;
      let swatchBuffers: Buffer[];
      let modelUsed: string;

      if (variant.scoped) {
        // --- Scoped edit (single surface) ---
        const { subcategoryId, optionId } = variant.scoped;
        const { prompt: p, swatches } = await buildProseScopedEdit(
          variant.prose,
          subcategoryId,
          optionId,
          optionLookup,
          cachedResolver,
        );
        prompt = p;
        swatchBuffers = swatches.map(s => s.buffer);
        modelUsed = (variant.model ?? SCOPED_EDIT_MODEL) as string;
        console.log(`[${tag}] Scoped edit: ${subcategoryId} → ${modelUsed} (${prompt.split(/\s+/).length} words)`);
      } else {
        // --- Full generation ---
        const { prompt: p, swatches } = await buildProsePrompt(
          variant.prose,
          config.selections,
          optionLookup,
          cachedResolver,
        );
        prompt = p;
        swatchBuffers = swatches.map(s => s.buffer);
        modelUsed = (variant.model ?? IMAGE_MODEL) as string;
        console.log(`[${tag}] Full gen: ${modelUsed} (${prompt.split(/\s+/).length} words, ${swatchBuffers.length} swatches)`);
      }

      const isFlex = modelUsed === "flux-2-flex";
      const result = await generateImage({
        model: modelUsed as BflModel,
        prompt,
        inputImage: heroBuffer,
        referenceImages: swatchBuffers,
        maxWaitMs: 180_000,
        ...(isFlex && { steps: 50, guidance: 7 }),
      });

      let finalBuffer = result.imageBuffer;
      let refineDurationMs = 0;

      // --- Refine pass (conditional) ---
      if (variant.refine && !variant.scoped) {
        console.log(`[${tag}] Running refine pass...`);
        const refineStart = performance.now();

        // Optionally resolve swatch for the refine pass
        const refineRefs: Buffer[] = [];
        if (variant.refine.swatchSubId) {
          const selectedOptId = config.selections[variant.refine.swatchSubId];
          if (selectedOptId) {
            const found = optionLookup.get(`${variant.refine.swatchSubId}:${selectedOptId}`);
            if (found?.option.swatchUrl) {
              const resolved = await cachedResolver(found.option.swatchUrl);
              if (resolved) refineRefs.push(resolved.buffer);
            }
          }
        }

        try {
          const refineResult = await generateImage({
            model: IMAGE_MODEL as BflModel, // Refine always uses Max
            prompt: variant.refine.prompt,
            inputImage: result.imageBuffer,
            referenceImages: refineRefs.length > 0 ? refineRefs : undefined,
            maxWaitMs: 180_000,
          });
          finalBuffer = refineResult.imageBuffer;
          refineDurationMs = Math.round(performance.now() - refineStart);
          console.log(`[${tag}] Refine done in ${(refineDurationMs / 1000).toFixed(1)}s`);
        } catch (err) {
          console.error(`[${tag}] Refine FAILED (keeping main pass): ${err instanceof Error ? err.message : err}`);
        }
      }

      const durationMs = Math.round(performance.now() - genStart);

      // Save image
      const imageName = `${variant.id}-${runIndex}.jpg`;
      const outPath = path.join(resultsDir(session), imageName);
      fs.writeFileSync(outPath, finalBuffer);

      // Also save the pre-refine image when refine was used (for comparison)
      if (variant.refine && refineDurationMs > 0) {
        const preRefineName = `${variant.id}-${runIndex}-pre-refine.jpg`;
        fs.writeFileSync(path.join(resultsDir(session), preRefineName), result.imageBuffer);
      }

      // Record result
      variant.results.push({
        runIndex,
        imagePath: `results/${imageName}`,
        prompt: variant.refine ? `${prompt}\n\n--- REFINE ---\n${variant.refine.prompt}` : prompt,
        durationMs,
        model: modelUsed,
        timestamp: new Date().toISOString(),
      });

      completed++;
      console.log(`[${tag}] Done in ${(durationMs / 1000).toFixed(1)}s [${completed}/${total}]`);
    } catch (err) {
      console.error(`[${tag}] FAILED: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Run with concurrency limit
  const active: Promise<void>[] = [];
  const pending = [...queue];

  while (pending.length > 0 || active.length > 0) {
    while (active.length < concurrency && pending.length > 0) {
      const job = pending.shift()!;
      const p = processJob(job).then(() => {
        active.splice(active.indexOf(p), 1);
      });
      active.push(p);
    }
    if (active.length > 0) {
      await Promise.race(active);
    }
  }

  // Save updated config with results
  saveConfig(session, config);
  console.log(`\nDone. Results saved. Run review:`);
  console.log(`  npx tsx scripts/prompt-lab.ts review ${session}`);
}

// ---------------------------------------------------------------------------
// REVIEW — generate HTML comparison page
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildReviewHtml(session: string, config: SessionConfig): string {
  const variantsWithResults = config.variants.filter(v => v.results.length > 0);
  if (variantsWithResults.length === 0) {
    return "<html><body><h1>No results yet. Run some variants first.</h1></body></html>";
  }

  // Find the first result's prompt to show what selections were used
  const samplePrompt = variantsWithResults[0]?.results[0]?.prompt ?? "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Prompt Lab — ${escapeHtml(session)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 24px; }
  h1 { font-size: 20px; margin-bottom: 4px; color: #fff; }
  .meta { font-size: 13px; color: #888; margin-bottom: 24px; }
  .meta span { color: #aaa; }

  .grid { display: flex; gap: 24px; overflow-x: auto; padding-bottom: 24px; }

  .source-col { flex: 0 0 320px; }
  .source-col img { width: 100%; display: block; }
  .source-col .label { font-size: 13px; color: #888; margin-top: 8px; }

  .variant-col { flex: 0 0 400px; border: 1px solid #333; background: #111; }
  .variant-col.approved { border-color: #2a6; }
  .variant-col.rejected { border-color: #a33; }
  .variant-col.maybe { border-color: #a83; }

  .variant-header { padding: 12px 16px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }
  .variant-header h2 { font-size: 15px; font-weight: 600; }
  .variant-header .id { font-size: 12px; color: #666; font-family: monospace; }

  .verdict-bar { display: flex; gap: 8px; padding: 8px 16px; border-bottom: 1px solid #222; }
  .verdict-bar button { padding: 4px 12px; border: 1px solid #444; background: #1a1a1a; color: #ccc; cursor: pointer; font-size: 12px; }
  .verdict-bar button:hover { background: #222; }
  .verdict-bar button.active-approved { background: #1a4a2a; border-color: #2a6; color: #6f6; }
  .verdict-bar button.active-rejected { background: #4a1a1a; border-color: #a33; color: #f66; }
  .verdict-bar button.active-maybe { background: #4a3a1a; border-color: #a83; color: #fa6; }

  .run-grid { padding: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
  .run-card { flex: 1 1 100%; }
  .run-card img { width: 100%; display: block; cursor: pointer; }
  .run-card img:hover { opacity: 0.9; }
  .run-card .run-meta { font-size: 11px; color: #666; padding: 4px 0; }

  .prompt-block { padding: 12px 16px; border-top: 1px solid #222; }
  .prompt-block summary { font-size: 13px; color: #888; cursor: pointer; }
  .prompt-block pre { font-size: 12px; color: #bbb; white-space: pre-wrap; word-break: break-word; margin-top: 8px; line-height: 1.5; background: #0a0a0a; padding: 12px; }

  .notes-block { padding: 8px 16px 16px; }
  .notes-block textarea { width: 100%; height: 60px; background: #0a0a0a; border: 1px solid #333; color: #ccc; padding: 8px; font-size: 12px; resize: vertical; font-family: inherit; }

  .actions-bar { position: sticky; top: 0; background: #0a0a0a; padding: 12px 0; border-bottom: 1px solid #222; z-index: 10; display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
  .actions-bar button { padding: 6px 16px; background: #1a1a1a; border: 1px solid #444; color: #ccc; cursor: pointer; font-size: 13px; }
  .actions-bar button:hover { background: #222; }
  .actions-bar .status { font-size: 12px; color: #666; }

  .selections-block { margin-bottom: 16px; }
  .selections-block summary { font-size: 13px; color: #888; cursor: pointer; }
  .selections-block pre { font-size: 11px; color: #777; margin-top: 4px; }

  /* Lightbox */
  .lightbox { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 100; align-items: center; justify-content: center; cursor: zoom-out; }
  .lightbox.visible { display: flex; }
  .lightbox img { max-width: 95vw; max-height: 95vh; object-fit: contain; }
</style>
</head>
<body>

<h1>Prompt Lab — ${escapeHtml(session)}</h1>
<div class="meta">
  Photo: <span>${escapeHtml(config.photo.label)}</span> &middot;
  Step: <span>${escapeHtml(config.stepSlug)}</span> &middot;
  Variants: <span>${variantsWithResults.length}</span> &middot;
  Total runs: <span>${variantsWithResults.reduce((s, v) => s + v.results.length, 0)}</span>
</div>

<details class="selections-block">
  <summary>Selections (${Object.keys(config.selections).length} surfaces)</summary>
  <pre>${escapeHtml(JSON.stringify(config.selections, null, 2))}</pre>
</details>

<div class="actions-bar">
  <button onclick="exportDecisions()">Export Decisions</button>
  <span class="status" id="export-status"></span>
</div>

<div class="grid">
  <div class="source-col">
    <img src="source.jpg" alt="Source photo" onclick="openLightbox(this.src)">
    <div class="label">Source: ${escapeHtml(config.photo.label)}</div>
  </div>

  ${variantsWithResults.map(v => `
  <div class="variant-col" id="variant-${escapeHtml(v.id)}" data-variant-id="${escapeHtml(v.id)}">
    <div class="variant-header">
      <h2>${escapeHtml(v.label)}</h2>
      <span class="id">${escapeHtml(v.id)} &middot; ${v.scoped ? `scoped: ${escapeHtml(v.scoped.subcategoryId)}` : "full"} &middot; ${escapeHtml(v.model ?? (v.scoped ? SCOPED_EDIT_MODEL : IMAGE_MODEL))}</span>
    </div>
    <div class="verdict-bar">
      <button onclick="setVerdict('${escapeHtml(v.id)}', 'approved')" data-verdict="approved">Approve</button>
      <button onclick="setVerdict('${escapeHtml(v.id)}', 'rejected')" data-verdict="rejected">Reject</button>
      <button onclick="setVerdict('${escapeHtml(v.id)}', 'maybe')" data-verdict="maybe">Maybe</button>
    </div>
    <div class="run-grid">
      ${v.results
        .sort((a, b) => a.runIndex - b.runIndex)
        .map(r => `
        <div class="run-card">
          <img src="${escapeHtml(r.imagePath)}" alt="Run ${r.runIndex}" onclick="openLightbox(this.src)">
          <div class="run-meta">Run ${r.runIndex + 1} &middot; ${r.model ?? "max"} &middot; ${(r.durationMs / 1000).toFixed(1)}s &middot; ${r.timestamp.split("T")[0]}</div>
        </div>
      `).join("")}
    </div>
    <details class="prompt-block" open>
      <summary>Prompt</summary>
      <pre>${escapeHtml(v.results[0]?.prompt ?? "(no prompt)")}</pre>
    </details>
    <div class="notes-block">
      <textarea placeholder="Notes..." data-notes-for="${escapeHtml(v.id)}">${escapeHtml(v.notes ?? "")}</textarea>
    </div>
  </div>
  `).join("")}
</div>

<div class="lightbox" id="lightbox" onclick="closeLightbox()">
  <img id="lightbox-img" src="" alt="">
</div>

<script>
  // State
  const verdicts = JSON.parse(localStorage.getItem('prompt-lab-${session}') || '{}');

  // Restore state on load
  document.addEventListener('DOMContentLoaded', () => {
    for (const [variantId, data] of Object.entries(verdicts)) {
      if (data.verdict) applyVerdict(variantId, data.verdict);
      if (data.notes) {
        const ta = document.querySelector(\`textarea[data-notes-for="\${variantId}"]\`);
        if (ta) ta.value = data.notes;
      }
    }
  });

  // Save notes on change
  document.querySelectorAll('textarea').forEach(ta => {
    ta.addEventListener('input', () => {
      const id = ta.dataset.notesFor;
      if (!verdicts[id]) verdicts[id] = {};
      verdicts[id].notes = ta.value;
      localStorage.setItem('prompt-lab-${session}', JSON.stringify(verdicts));
    });
  });

  function setVerdict(variantId, verdict) {
    if (!verdicts[variantId]) verdicts[variantId] = {};
    // Toggle off if same verdict clicked again
    if (verdicts[variantId].verdict === verdict) {
      verdicts[variantId].verdict = null;
      applyVerdict(variantId, null);
    } else {
      verdicts[variantId].verdict = verdict;
      applyVerdict(variantId, verdict);
    }
    localStorage.setItem('prompt-lab-${session}', JSON.stringify(verdicts));
  }

  function applyVerdict(variantId, verdict) {
    const col = document.getElementById('variant-' + variantId);
    if (!col) return;
    col.classList.remove('approved', 'rejected', 'maybe');
    if (verdict) col.classList.add(verdict);

    col.querySelectorAll('.verdict-bar button').forEach(btn => {
      btn.className = '';
      if (verdict && btn.dataset.verdict === verdict) {
        btn.className = 'active-' + verdict;
      }
    });
  }

  function exportDecisions() {
    // Collect notes from textareas
    document.querySelectorAll('textarea').forEach(ta => {
      const id = ta.dataset.notesFor;
      if (!verdicts[id]) verdicts[id] = {};
      verdicts[id].notes = ta.value;
    });

    const blob = new Blob([JSON.stringify(verdicts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompt-lab-${session}-decisions.json';
    a.click();
    URL.revokeObjectURL(url);
    document.getElementById('export-status').textContent = 'Exported!';
    setTimeout(() => { document.getElementById('export-status').textContent = ''; }, 2000);
  }

  function openLightbox(src) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox').classList.add('visible');
  }

  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('visible');
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
</script>

</body>
</html>`;
}

function review(session: string) {
  const config = loadConfig(session);
  const html = buildReviewHtml(session, config);
  const outPath = reviewPath(session);
  fs.writeFileSync(outPath, html);
  console.log(`Review page written to ${outPath}`);

  // Try to open in browser
  const { execSync } = require("child_process");
  try {
    execSync(`open "${outPath}"`, { stdio: "ignore" });
  } catch {
    console.log(`Open it manually: ${outPath}`);
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help") {
    console.log(`
Prompt Lab — side-by-side full-gen prompt tuning for BFL Flux 2

Commands:
  ls                          List all sessions
  init <session> --photo <id> Create session from a DB step photo
  status <session>            Show variants, runs, verdicts, action clauses
  add <session> --from <id> --id <new> --label "..." [--model flux-2-pro] [--scoped sub:opt]
        [--refine "prompt"] [--refine-swatch subId]
                              Fork a variant. --model overrides BFL model, --scoped = single-surface edit,
                              --refine = second Max pass (oven correction etc.), --refine-swatch = ref image for refine
  show <session>              Print assembled prompts (no BFL call)
  run <session> [--concurrency N] [--variant <id>] [--only-pending]
                              Generate images for variants
  review <session>            Build HTML comparison page and open it
  apply <session> [--variant <id>]
                              Write approved variant's prose to DB
  import-verdicts <session> --file <path.json>
                              Import exported decisions back into config

Session data: tmp/prompt-lab/<session>/
    `.trim());
    return;
  }

  // ls is the only command that doesn't need a session name
  if (command === "ls") {
    ls();
    return;
  }

  const session = args[1];
  if (!session) {
    console.error("Missing session name");
    process.exit(1);
  }

  switch (command) {
    case "init": {
      const photoIdx = args.indexOf("--photo");
      if (photoIdx === -1 || !args[photoIdx + 1]) {
        console.error("--photo <stepPhotoId> is required");
        process.exit(1);
      }
      const stepPhotoId = args[photoIdx + 1];

      let selections: Record<string, string> | undefined;
      const selIdx = args.indexOf("--selections");
      if (selIdx !== -1 && args[selIdx + 1]) {
        selections = JSON.parse(args[selIdx + 1]);
      }

      await init(session, stepPhotoId, selections);
      break;
    }

    case "status": {
      status(session);
      break;
    }

    case "add": {
      const fromIdx = args.indexOf("--from");
      const idIdx = args.indexOf("--id");
      const labelIdx = args.indexOf("--label");
      const modelIdx = args.indexOf("--model");
      const scopedIdx = args.indexOf("--scoped");

      if (fromIdx === -1 || !args[fromIdx + 1]) {
        console.error("--from <variant-id> is required");
        process.exit(1);
      }
      if (idIdx === -1 || !args[idIdx + 1]) {
        console.error("--id <new-variant-id> is required");
        process.exit(1);
      }

      const fromId = args[fromIdx + 1];
      const newId = args[idIdx + 1];
      const label = labelIdx !== -1 && args[labelIdx + 1] ? args[labelIdx + 1] : newId;
      const model = modelIdx !== -1 ? args[modelIdx + 1] : undefined;

      // --scoped backsplash:bs-baker-herringbone-glacier
      let scoped: ScopedEditConfig | undefined;
      if (scopedIdx !== -1 && args[scopedIdx + 1]) {
        const [subcategoryId, optionId] = args[scopedIdx + 1].split(":");
        if (!subcategoryId || !optionId) {
          console.error("--scoped format: subcategoryId:optionId");
          process.exit(1);
        }
        scoped = { subcategoryId, optionId };
      }

      // --refine "prompt text" [--refine-swatch subcategoryId]
      const refineIdx = args.indexOf("--refine");
      let refine: RefineConfig | undefined;
      if (refineIdx !== -1 && args[refineIdx + 1]) {
        const refineSwatchIdx = args.indexOf("--refine-swatch");
        refine = {
          prompt: args[refineIdx + 1],
          swatchSubId: refineSwatchIdx !== -1 ? args[refineSwatchIdx + 1] : undefined,
        };
      }

      add(session, fromId, newId, label, { model, scoped, refine });
      break;
    }

    case "show": {
      await show(session);
      break;
    }

    case "run": {
      const concIdx = args.indexOf("--concurrency");
      const concurrency = concIdx !== -1 ? parseInt(args[concIdx + 1], 10) : 2;

      const varIdx = args.indexOf("--variant");
      const variantFilter = varIdx !== -1 ? args[varIdx + 1] : undefined;

      const onlyPending = args.includes("--only-pending");

      await run(session, concurrency, variantFilter, onlyPending);
      break;
    }

    case "review": {
      review(session);
      break;
    }

    case "apply": {
      const varIdx = args.indexOf("--variant");
      const variantId = varIdx !== -1 ? args[varIdx + 1] : undefined;
      await apply(session, variantId);
      break;
    }

    case "import-verdicts": {
      const fileIdx = args.indexOf("--file");
      if (fileIdx === -1 || !args[fileIdx + 1]) {
        console.error("--file <path.json> is required");
        process.exit(1);
      }
      importVerdicts(session, args[fileIdx + 1]);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
