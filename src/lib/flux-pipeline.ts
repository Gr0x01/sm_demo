import sharp from "sharp";
import { buildEditPrompt, buildScopedEditPrompt } from "@/lib/generate";
import type { SwatchBufferResolver } from "@/lib/generate";
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
    swatchResolver, defaultSurfaceColors,
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

  const genStart = performance.now();

  if (!needsSplit) {
    // --- Single pass ---
    const { prompt, swatches } = await buildEditPrompt(
      selections, optionLookup, spatialHints, cachedResolver, defaultSurfaceColors,
    );

    const result = await generateImage({
      model,
      prompt,
      inputImage: heroBuffer,
      referenceImages: swatches.map(s => s.buffer),
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

  const { prompt: structuralPrompt, swatches: structuralSwatches } = await buildEditPrompt(
    structuralSelections, optionLookup, spatialHints, cachedResolver,
  );
  const { prompt: fixturePrompt, swatches: fixtureSwatches } = await buildEditPrompt(
    fixtureSelections, optionLookup, spatialHints, cachedResolver,
  );

  const pass1Result = await generateImage({
    model,
    prompt: structuralPrompt,
    inputImage: heroBuffer,
    referenceImages: structuralSwatches.map(s => s.buffer),
  });

  const pass2Result = await generateImage({
    model,
    prompt: fixturePrompt,
    inputImage: pass1Result.imageBuffer,
    referenceImages: fixtureSwatches.map(s => s.buffer),
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
}

export interface FluxScopedEditResult {
  imageBuffer: Buffer;
  prompt: string;
  durationMs: number;
  model: string;
}

/**
 * Run a scoped Flux 2 edit on a single surface.
 * Automatically selects Max for range/oven, Klein 9B for everything else.
 * Stateless — caller handles storage downloads/uploads.
 */
export async function fluxScopedEdit(opts: FluxScopedEditOpts): Promise<FluxScopedEditResult> {
  const { baseImageBuffer, changedSubcategoryId, changedOptionId, optionLookup, spatialHints, swatchResolver } = opts;

  const { prompt, swatches } = await buildScopedEditPrompt(
    changedSubcategoryId,
    changedOptionId,
    optionLookup,
    spatialHints,
    swatchResolver,
  );

  // Model selection: option-level override → range/oven gets Max → global default (Pro)
  const changed = optionLookup.get(`${changedSubcategoryId}:${changedOptionId}`);
  const isRangeOven = changedSubcategoryId.includes("range") || changedSubcategoryId.includes("oven");
  const model = changed?.option.scopedEditModel
    ?? (isRangeOven ? IMAGE_MODEL : SCOPED_EDIT_MODEL);

  const genStart = performance.now();
  const result = await generateImage({
    model: model as BflModel,
    prompt,
    inputImage: baseImageBuffer,
    referenceImages: swatches.map(s => s.buffer),
  });

  return {
    imageBuffer: result.imageBuffer,
    prompt,
    durationMs: Math.round(performance.now() - genStart),
    model,
  };
}
