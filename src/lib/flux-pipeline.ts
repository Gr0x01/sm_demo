import sharp from "sharp";
import { buildEditPrompt, buildScopedEditPrompt, buildProsePrompt, buildProseScopedEdit } from "@/lib/generate";
import type { SwatchBufferResolver } from "@/lib/generate";
import { hasHardwareRoutingTrigger, isFixtureSubcategory, type PromptProse } from "@/lib/step-config";
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

// Re-export for back-compat with any internal callers that used the local constant.
export { FIXTURE_PATTERNS, isFixtureSubcategory } from "@/lib/step-config";

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
  /**
   * BFL model(s) actually used for each pass, in order. Length always equals
   * `passes`. Callers use this for accurate cost estimation, DB `model`
   * column writes, and PostHog telemetry — because `fluxGenerate` may route
   * hardware-selecting runs to Max at runtime, the caller's stale
   * `IMAGE_MODEL` constant does NOT reflect what actually ran. Use
   * `modelsUsed.at(-1)` for a single-value "terminal model" label, or pass
   * the full array to `estimateBflCost` for an accurate total.
   */
  modelsUsed: string[];
  /**
   * Pass 1 intermediate buffer when the run did a 2-pass split. Used by the
   * lab to save the structural pass output as a reusable artifact so future
   * variants can run pass-2-only experiments on top of a cached pass 1 (no
   * cost to re-render the structural pass for every variant). Undefined for
   * single-pass runs.
   */
  pass1ImageBuffer?: Buffer;
}

/**
 * Decide which BFL model to use for a full generation run, given the current
 * selections. Extracted as a pure function so routing logic has a
 * unit-testable seam AND so the caller can read per-pass decisions
 * (pass 1 / pass 2 / single-pass) without the function needing to know
 * which path it will take.
 *
 * Routing rules:
 *   1. Explicit `opts.model` override always wins (lab/test escape hatch).
 *   2. If any selected option has a subId matching `MAX_ROUTING_PATTERNS`
 *      AND the option carries an actual swatch URL (so the Max routing
 *      won't fire for `-none` / `-no-upgrade` defaults with no swatch),
 *      then:
 *        - Single-pass → whole pass on Max.
 *        - 2-pass split → pass 1 on Flex (structural surfaces never need
 *          Max; hardware subs are always fixtures per FIXTURE_PATTERNS so
 *          they always live in pass 2 by construction), pass 2 on Max.
 *   3. Otherwise → default model (Flex) throughout.
 *
 * Returns per-pass decisions as a flat record; the caller selects which
 * field to use based on whether it's running single-pass or 2-pass.
 */
export function selectFullGenModel(opts: {
  selections: Record<string, string>;
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>;
  explicitModel?: string;
}): {
  singlePassModel: BflModel;
  pass1Model: BflModel;
  pass2Model: BflModel;
  /** True when hardware routing is active (i.e. Max was chosen because a hardware sub is present). False for explicit overrides or no-hardware runs. */
  routedForHardware: boolean;
} {
  const { selections, optionLookup, explicitModel } = opts;

  if (explicitModel) {
    const m = explicitModel as BflModel;
    return { singlePassModel: m, pass1Model: m, pass2Model: m, routedForHardware: false };
  }

  // Routing decision delegates to the shared oracle in step-config.ts so the
  // cache key (deriveGenerationContext) and the pipeline layer stay provably
  // in sync. See `hasHardwareRoutingTrigger` for the rule.
  const hasHardwareWithSwatch = hasHardwareRoutingTrigger(selections, optionLookup);

  const defaultModel = IMAGE_MODEL as BflModel;
  if (!hasHardwareWithSwatch) {
    return {
      singlePassModel: defaultModel,
      pass1Model: defaultModel,
      pass2Model: defaultModel,
      routedForHardware: false,
    };
  }

  return {
    singlePassModel: "flux-2-max",
    pass1Model: defaultModel,
    pass2Model: "flux-2-max",
    routedForHardware: true,
  };
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
  const explicitModel = opts.model as BflModel | undefined;

  // Pre-warm swatch cache (parallel download + downscale)
  const cachedResolver = await preWarmSwatchCache(selections, optionLookup, swatchResolver);

  // Count swatches to decide single vs two-pass
  const isFixture = isFixtureSubcategory;
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

  // Hardware routing via `selectFullGenModel`. See that function for the
  // full rule set. The lab/test escape hatch is `opts.model`; everything
  // else flows through selection-based routing.
  const {
    singlePassModel, pass1Model, pass2Model, routedForHardware,
  } = selectFullGenModel({ selections, optionLookup, explicitModel });
  if (routedForHardware) {
    console.log(
      `[flux-pipeline] hardware routing → ${needsSplit ? `pass1=${pass1Model}, pass2=${pass2Model}` : `single-pass=${singlePassModel}`}`,
    );
  }

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
      model: singlePassModel,
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
      modelsUsed: [singlePassModel],
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
    model: pass1Model,
    prompt: structuralPrompt,
    inputImage: heroBuffer,
    referenceImages: structuralSwatches.map(s => s.buffer),
    maxWaitMs: opts.maxWaitMs,
    // steps/guidance are Flex-only params; generateImage silently skips them
    // for other models, so we pass them through unconditionally.
    steps: opts.steps,
    guidance: opts.guidance,
  });

  const pass2Result = await generateImage({
    model: pass2Model,
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
    modelsUsed: [pass1Model, pass2Model],
    pass1ImageBuffer: pass1Result.imageBuffer,
  };
}

// ---------------------------------------------------------------------------
// Scoped edit (single surface change)
// ---------------------------------------------------------------------------

/**
 * Resolve which BFL model a scoped edit should run on.
 *
 * Chain: explicit opts.model wins, then per-option override from the
 * `scoped_edit_model` column, then the global Flex default. The Demo org
 * has historically used per-option overrides (Klein 9B for hex mosaic
 * backsplash, Max for marble shower tile) and the capability is preserved
 * even though the default for new options is Flex (watchlist row 12-m).
 *
 * The pre-2026-04-14 hardcoded range/oven Max exception was removed in
 * favor of the data-driven override — admins set Max via the column on
 * any range/oven option that needs it.
 *
 * Exported separately so it can be unit-tested without mocking the full
 * fluxScopedEdit pipeline (BFL, swatch resolver, prose builder).
 */
export function selectScopedEditModel(
  optsModel: string | undefined,
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
  changedSubcategoryId: string,
  changedOptionId: string,
): string {
  const changed = optionLookup.get(`${changedSubcategoryId}:${changedOptionId}`);
  return optsModel ?? changed?.option.scopedEditModel ?? SCOPED_EDIT_MODEL;
}

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

  const model = selectScopedEditModel(
    opts.model,
    optionLookup,
    changedSubcategoryId,
    changedOptionId,
  );

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
