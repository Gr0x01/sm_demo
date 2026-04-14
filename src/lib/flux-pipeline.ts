import sharp from "sharp";
import { buildEditPrompt, buildScopedEditPrompt, buildProsePrompt, buildProseScopedEdit } from "@/lib/generate";
import type { SwatchBufferResolver } from "@/lib/generate";
import type { PromptProse } from "@/lib/step-config";
import { IMAGE_MODEL, SCOPED_EDIT_MODEL } from "@/lib/models";
import { generateImage } from "@/lib/bfl";
import type { BflModel } from "@/lib/bfl";
import type { Option, SubCategory } from "@/types";
import { getServiceClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max reference swatch images BFL Max accepts (input_image_2..8) */
const MAX_SWATCHES = 7;

/** Max swatch dimension — BFL only needs color/pattern info, 512px JPEG is plenty. */
const SWATCH_MAX_DIM = 512;

/** Subcategory slug patterns that classify as fixture (vs structural) surfaces. */
const FIXTURE_PATTERNS = ["hardware", "faucet", "sink", "lighting", "fan", "refrigerator", "range", "dishwasher"];

// ---------------------------------------------------------------------------
// Swatch utilities
// ---------------------------------------------------------------------------

/**
 * Build a swatch resolver that downloads from Supabase Storage.
 */
export function createSwatchResolver(supabase: ReturnType<typeof getServiceClient>): SwatchBufferResolver {
  return async (swatchUrl: string) => {
    let storagePath = swatchUrl;
    if (swatchUrl.startsWith("http")) {
      const match = swatchUrl.match(/\/object\/public\/swatches\/(.+)$/);
      if (match) storagePath = match[1];
      else return null;
    }
    if (storagePath.startsWith("/swatches/")) storagePath = storagePath.slice("/swatches/".length);

    const { data: swatchData, error: swatchErr } = await supabase.storage
      .from("swatches")
      .download(storagePath);

    if (swatchErr || !swatchData) return null;

    const rawBuffer = Buffer.from(await swatchData.arrayBuffer());
    const ext = storagePath.split(".").pop()?.toLowerCase() || "png";

    if (ext === "svg" || ext === "svgz") {
      const pngBuffer = await sharp(rawBuffer).png().toBuffer();
      return { buffer: pngBuffer, mediaType: "image/png" };
    }

    const mediaType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    return { buffer: rawBuffer, mediaType };
  };
}

/**
 * Pre-download all swatch images in parallel, downscale oversized ones,
 * and return a cached resolver. The returned resolver serves from memory.
 */
export async function preWarmSwatchCache(
  selections: Record<string, string>,
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
  resolver: SwatchBufferResolver,
): Promise<SwatchBufferResolver> {
  const urls = new Set<string>();
  for (const [subId, optId] of Object.entries(selections)) {
    const entry = optionLookup.get(`${subId}:${optId}`);
    if (entry?.option.swatchUrl) urls.add(entry.option.swatchUrl);
  }

  const urlList = [...urls];
  const results = await Promise.all(
    urlList.map(async url => {
      const resolved = await resolver(url).catch(() => null);
      if (!resolved) return null;
      const meta = await sharp(resolved.buffer).metadata();
      if ((meta.width && meta.width > SWATCH_MAX_DIM) || (meta.height && meta.height > SWATCH_MAX_DIM)) {
        const resized = await sharp(resolved.buffer)
          .resize(SWATCH_MAX_DIM, SWATCH_MAX_DIM, { fit: "inside" })
          .jpeg({ quality: 85 })
          .toBuffer();
        return { buffer: resized, mediaType: "image/jpeg" };
      }
      return resolved;
    }),
  );

  const cache = new Map<string, { buffer: Buffer; mediaType: string } | null>();
  for (let i = 0; i < urlList.length; i++) {
    cache.set(urlList[i], results[i]);
  }

  return async (url: string) => cache.get(url) ?? null;
}

// ---------------------------------------------------------------------------
// Full generation
// ---------------------------------------------------------------------------

export interface FluxGenerateOpts {
  heroBuffer: Buffer;
  selections: Record<string, string>;
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>;
  spatialHints: Record<string, string>;
  swatchResolver: SwatchBufferResolver;
  defaultSurfaceColors?: Record<string, string>;
  model?: string;
  /** When present and complete (subject + actions for every selected sub), routes through the prose builder. */
  promptProse?: PromptProse | null;
  /** Override BFL poll timeout per pass (default 90s). */
  maxWaitMs?: number;
  /** Flex-only: refinement steps 1-50 (default 50). Ignored on Max/Pro. */
  steps?: number;
  /** Flex-only: prompt adherence 1.5-10 (default 4.5). Higher = stricter. Ignored on Max/Pro. */
  guidance?: number;
}

/**
 * Analyze a PromptProse object against the current selections.
 *
 * Returns:
 *   - `present: false` when the photo has no prose at all (legacy builder path)
 *   - `present: true, missing: []` when prose fully covers selections (prose path)
 *   - `present: true, missing: [subIds]` when prose is structurally valid but
 *     missing `actions[subId]` for one or more selected subs — this is the
 *     smoking-gun signal for an authoring gap. Callers should log a warning
 *     and fall back to the legacy builder to avoid runtime failure.
 */
export function analyzeProseCoverage(
  prose: PromptProse | null | undefined,
  selections: Record<string, string>,
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
): { present: boolean; missing: string[] } {
  if (!prose || !prose.actions) {
    return { present: false, missing: [] };
  }
  const missing: string[] = [];
  for (const [subId, optId] of Object.entries(selections)) {
    const entry = optionLookup.get(`${subId}:${optId}`);
    if (!entry) continue;
    const { option } = entry;
    if (optId.endsWith("-none") || optId.endsWith("-no-upgrade")) continue;
    if (!option.swatchUrl && !option.swatchColor && !option.promptDescriptor) continue;
    if (!prose.actions[subId]) missing.push(subId);
  }
  return { present: true, missing };
}

export interface FluxGenerateResult {
  imageBuffer: Buffer;
  prompt: string;
  durationMs: number;
  passes: number;
}

/**
 * Run a full Flux 2 generation (single or two-pass split).
 * Stateless — caller handles storage downloads/uploads.
 */
export async function fluxGenerate(opts: FluxGenerateOpts): Promise<FluxGenerateResult> {
  const {
    heroBuffer, selections, optionLookup, spatialHints,
    swatchResolver, defaultSurfaceColors, promptProse,
  } = opts;
  const model = (opts.model ?? IMAGE_MODEL) as BflModel;

  // Pre-warm swatch cache (parallel download + downscale)
  const cachedResolver = await preWarmSwatchCache(selections, optionLookup, swatchResolver);

  // Count swatches to decide single vs two-pass
  const isFixture = (subId: string) => FIXTURE_PATTERNS.some(p => subId.includes(p));
  let structuralSwatchCount = 0;
  let fixtureSwatchCount = 0;
  for (const [subId, optId] of Object.entries(selections)) {
    const entry = optionLookup.get(`${subId}:${optId}`);
    if (!entry?.option.swatchUrl) continue;
    if (isFixture(subId)) fixtureSwatchCount++;
    else structuralSwatchCount++;
  }

  const needsSplit = (structuralSwatchCount + fixtureSwatchCount) > MAX_SWATCHES
    && fixtureSwatchCount > 0
    && structuralSwatchCount > 0;

  // Prose-path eligibility: needs the full selections (not per-pass subsets).
  // Log a warning when prose is present but incomplete — that's the smoking-
  // gun signal for an authoring gap vs a photo that's plain legacy-only.
  const proseCoverage = analyzeProseCoverage(promptProse, selections, optionLookup);
  const completeProse: PromptProse | null =
    promptProse && proseCoverage.present && proseCoverage.missing.length === 0 ? promptProse : null;
  if (proseCoverage.present && proseCoverage.missing.length > 0) {
    console.warn(
      `[flux-pipeline] prose incomplete, falling back to legacy builder. Missing actions for: ${proseCoverage.missing.join(", ")}`,
    );
  }
  console.log(`[flux-pipeline] builder=${completeProse ? "prose" : "legacy"}`);

  const genStart = performance.now();

  if (!needsSplit) {
    // --- Single pass ---
    const { prompt, swatches } = completeProse
      ? await buildProsePrompt(completeProse, selections, optionLookup, cachedResolver)
      : await buildEditPrompt(selections, optionLookup, spatialHints, cachedResolver, defaultSurfaceColors);

    // DIAGNOSTIC: log swatch-to-BFL-index binding so we can confirm the prompt's
    // "image N" references resolve to the intended swatches at the API boundary.
    console.log(`[flux-pipeline] swatch order (becomes input_image_2..N): ${JSON.stringify(swatches.map((s, i) => ({ idx: i + 2, subId: s.subcategoryId, label: s.label })))}`);

    const result = await generateImage({
      model,
      prompt,
      inputImage: heroBuffer,
      referenceImages: swatches.map(s => s.buffer),
      maxWaitMs: opts.maxWaitMs,
      steps: opts.steps,
      guidance: opts.guidance,
    });

    return {
      imageBuffer: result.imageBuffer,
      prompt,
      durationMs: Math.round(performance.now() - genStart),
      passes: 1,
    };
  }

  // --- Two-pass split: structural then fixtures ---
  const structuralSelections: Record<string, string> = {};
  const fixtureSelections: Record<string, string> = {};
  for (const [subId, optId] of Object.entries(selections)) {
    if (isFixture(subId)) fixtureSelections[subId] = optId;
    else structuralSelections[subId] = optId;
  }

  // Two-pass split: pass 1 (structural) emits preservation lines for in-scope-
  // unselected subs as usual. Pass 2 (fixtures) MUST suppress preservation —
  // from fixtureSelections' perspective every structural sub is "unselected,"
  // which would otherwise ask Flux to "preserve" surfaces pass 1 just rewrote.
  const { prompt: structuralPrompt, swatches: structuralSwatches } = completeProse
    ? await buildProsePrompt(completeProse, structuralSelections, optionLookup, cachedResolver, { emitPreserve: true })
    : await buildEditPrompt(structuralSelections, optionLookup, spatialHints, cachedResolver);
  const { prompt: fixturePrompt, swatches: fixtureSwatches } = completeProse
    ? await buildProsePrompt(completeProse, fixtureSelections, optionLookup, cachedResolver, { emitPreserve: false })
    : await buildEditPrompt(fixtureSelections, optionLookup, spatialHints, cachedResolver);

  const pass1Result = await generateImage({
    model,
    prompt: structuralPrompt,
    inputImage: heroBuffer,
    referenceImages: structuralSwatches.map(s => s.buffer),
    maxWaitMs: opts.maxWaitMs,
    steps: opts.steps,
    guidance: opts.guidance,
  });

  const pass2Result = await generateImage({
    model,
    prompt: fixturePrompt,
    inputImage: pass1Result.imageBuffer,
    referenceImages: fixtureSwatches.map(s => s.buffer),
    maxWaitMs: opts.maxWaitMs,
    steps: opts.steps,
    guidance: opts.guidance,
  });

  return {
    imageBuffer: pass2Result.imageBuffer,
    prompt: `${structuralPrompt}\n\nPASS_2 (fixtures):\n${fixturePrompt}`,
    durationMs: Math.round(performance.now() - genStart),
    passes: 2,
  };
}

// ---------------------------------------------------------------------------
// Scoped edit (single surface change)
// ---------------------------------------------------------------------------

export interface FluxScopedEditOpts {
  baseImageBuffer: Buffer;
  changedSubcategoryId: string;
  changedOptionId: string;
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>;
  spatialHints: Record<string, string>;
  swatchResolver: SwatchBufferResolver;
  /** When present with a matching actions[subId] entry, routes through the prose builder. */
  promptProse?: PromptProse | null;
  /** Force a specific BFL model, bypassing the per-option/default selection chain. */
  model?: string;
  /** Override BFL poll timeout (default 90s). */
  maxWaitMs?: number;
}

export interface FluxScopedEditResult {
  imageBuffer: Buffer;
  prompt: string;
  durationMs: number;
  model: string;
}

/**
 * Run a scoped Flux 2 edit on a single surface.
 * Always uses Flex (watchlist row 12-m, locked 2026-04-13) — per-option model
 * overrides and the range/oven Max exception were retired 2026-04-14.
 * Stateless — caller handles storage downloads/uploads.
 */
export async function fluxScopedEdit(opts: FluxScopedEditOpts): Promise<FluxScopedEditResult> {
  const { baseImageBuffer, changedSubcategoryId, changedOptionId, optionLookup, spatialHints, swatchResolver, promptProse } = opts;

  // Scoped edits reuse the full-gen actions map — no separate scopedEdits field.
  const useProse = !!promptProse?.actions?.[changedSubcategoryId];
  console.log(`[flux-pipeline] builder=${useProse ? "prose" : "legacy"} (scoped)`);

  const { prompt, swatches } = useProse
    ? await buildProseScopedEdit(
        promptProse,
        changedSubcategoryId,
        changedOptionId,
        optionLookup,
        swatchResolver,
      )
    : await buildScopedEditPrompt(
        changedSubcategoryId,
        changedOptionId,
        optionLookup,
        spatialHints,
        swatchResolver,
      );

  // Model selection: explicit opts.model wins, otherwise the global Flex default.
  // Per-option `scopedEditModel` overrides and the range/oven Max exception were
  // retired 2026-04-14 — watchlist row 12-m locks "all scoped edits → Flex".
  const model = opts.model ?? SCOPED_EDIT_MODEL;

  const genStart = performance.now();
  const isFlex = model === "flux-2-flex";
  const result = await generateImage({
    model: model as BflModel,
    prompt,
    inputImage: baseImageBuffer,
    referenceImages: swatches.map(s => s.buffer),
    maxWaitMs: opts.maxWaitMs,
    ...(isFlex && { steps: 50, guidance: 7 }),
  });

  return {
    imageBuffer: result.imageBuffer,
    prompt,
    durationMs: Math.round(performance.now() - genStart),
    model,
  };
}
