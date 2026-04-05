import sharp from "sharp";
import { inngest } from "@/inngest/client";
import { buildBflEditPrompt, buildBflScopedEditPrompt, identifyChangedSubcategory, resolveLinkedOptions } from "@/lib/generate";
import type { SwatchBufferResolver } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getOptionLookup, findSingleSurfaceDiffMatch } from "@/lib/db-queries";
import { captureAiEvent, captureAiError, estimateBflCost } from "@/lib/posthog-server";
import { IMAGE_MODEL, SCOPED_EDIT_MODEL } from "@/lib/models";
import { generateImage } from "@/lib/bfl";
import type { BflModel } from "@/lib/bfl";
import type { Option, SubCategory } from "@/types";

/** Max reference swatch images BFL Max accepts (input_image_2..8) */
const MAX_SWATCHES = 7;

/**
 * Build a swatch resolver that downloads from Supabase Storage.
 */
function createSwatchResolver(supabase: ReturnType<typeof getServiceClient>): SwatchBufferResolver {
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

/** Max swatch dimension for BFL reference images. Full-res PNGs can be 6MB+ —
 *  BFL only needs color/pattern info, so 512px JPEG is plenty. */
const SWATCH_MAX_DIM = 512;

/**
 * Pre-download all swatch images in parallel, downscale oversized ones,
 * and return a cached resolver. The returned resolver serves from memory.
 */
async function preWarmSwatchCache(
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
      // Downscale large swatches to keep BFL payload small
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

/**
 * Upload a buffer to generated-images storage and return the path.
 */
async function uploadIntermediate(
  supabase: ReturnType<typeof getServiceClient>,
  buffer: Buffer,
  path: string,
  contentType = "image/jpeg",
): Promise<void> {
  const { error } = await supabase.storage
    .from("generated-images")
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

/**
 * Download an image from generated-images storage.
 */
async function downloadIntermediate(
  supabase: ReturnType<typeof getServiceClient>,
  path: string,
): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from("generated-images")
    .download(path);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export const generatePhoto = inngest.createFunction(
  {
    id: "generate-photo",
    retries: 2,
    concurrency: { limit: 5 },
  },
  { event: "photo/generate.requested" },
  async ({ event, step }) => {
    const {
      selectionsHash,
      selectionsFingerprint,
      orgId,
      orgSlug,
      floorplanSlug,
      stepPhotoId,
      stepId,
      sessionId,
      scopedSelections,
      scopedSubcategoryIds,
      modelName,
      resolvedPolicy,
      sceneDescription,
      spatialHints,
      photoSpatialHint,
      selectionsJsonForClaim,
      leaveOneOutHashes,
      heroImagePath,
      source,
    } = event.data;

    console.log(`[generate/photo] Source: ${source}`);
    const MAX_SCOPED_EDIT_DEPTH = 3;
    const outputPath = `${orgId}/${selectionsHash}.jpg`;
    const mainPassPath = `${orgId}/${selectionsHash}_main.jpg`;
    const pass1Path = `${orgId}/${selectionsHash}_pass1.jpg`;
    const scopedEditPath = `${orgId}/${selectionsHash}_scoped.jpg`;
    const refinePath = `${orgId}/${selectionsHash}_refine.jpg`;

    // --- Step 1: Diff cache check + structural pass (or single pass) ---
    const generateResult = await step.run("generate", async () => {
      const t0 = performance.now();
      const lap = (label: string) => console.log(`[generate/photo][timing] ${label}: ${Math.round(performance.now() - t0)}ms`);

      const diffMatch = await findSingleSurfaceDiffMatch(stepPhotoId, leaveOneOutHashes, MAX_SCOPED_EDIT_DEPTH);
      lap("diff-check");
      if (diffMatch) {
        const changedSub = identifyChangedSubcategory(diffMatch.selectionsJson, scopedSelections);
        const isApplianceAddRemove = changedSub && (
          changedSub.oldOptionId.endsWith("-none") || changedSub.newOptionId.endsWith("-none")
        );
        if (isApplianceAddRemove) {
          console.log(`[generate/photo] Skipping scoped edit for ${stepPhotoId}: appliance add/remove (${changedSub!.subcategoryId} ${changedSub!.oldOptionId} → ${changedSub!.newOptionId})`);
        }
        if (changedSub && !isApplianceAddRemove) {
          return {
            type: "scoped-edit-needed" as const,
            imagePath: diffMatch.imagePath,
            depth: diffMatch.depth,
            changedSubcategoryId: changedSub.subcategoryId,
            changedNewOptionId: changedSub.newOptionId,
          };
        }
      }

      // No scoped edit — full generation
      const supabase = getServiceClient();
      const baseResolver = createSwatchResolver(supabase);

      // Parallel — hero download runs alongside optionLookup → swatch pre-warm chain
      const optionLookupP = getOptionLookup(orgId).then(ol => {
        // Strip exclusion rules for merged linked subcategories.
        for (const subId of scopedSubcategoryIds) {
          if (subId in scopedSelections) continue;
          for (const [key, entry] of ol) {
            if (!key.startsWith(`${subId}:`)) continue;
            const linkedSub = entry.option.linkedToSubcategory;
            if (!linkedSub || linkedSub in scopedSelections === false) continue;
            const sourceKey = `${linkedSub}:${scopedSelections[linkedSub]}`;
            const sourceEntry = ol.get(sourceKey);
            if (sourceEntry?.subCategory.generationRules?.length) {
              sourceEntry.subCategory = {
                ...sourceEntry.subCategory,
                generationRules: sourceEntry.subCategory.generationRules.filter(
                  r => !r.toLowerCase().includes("do not apply it to"),
                ),
              };
            }
            break;
          }
        }
        return ol;
      });
      const [heroResult, optionLookup, cachedResolver] = await Promise.all([
        supabase.storage.from("rooms").download(heroImagePath),
        optionLookupP,
        optionLookupP.then(ol => preWarmSwatchCache(scopedSelections, ol, baseResolver)),
      ]);
      lap("parallel-setup");

      const { data: imageData, error: downloadErr } = heroResult;
      if (downloadErr || !imageData) {
        throw new Error(`Failed to load base photo: ${downloadErr?.message}`);
      }

      const rawImageBuffer = Buffer.from(await imageData.arrayBuffer());
      const heroExt = heroImagePath.split(".").pop()?.toLowerCase() || "webp";
      const needsConversion = !["png", "jpg", "jpeg", "webp", "gif"].includes(heroExt);
      const imageBuffer = needsConversion
        ? await sharp(rawImageBuffer).png().toBuffer()
        : rawImageBuffer;

      // --- Determine if we need a two-pass split ---
      // Count swatches cheaply by checking which selections have swatch URLs.
      // This avoids building prompts (expensive: downloads + sharp hex extraction)
      // until we know the path.
      const FIXTURE_PATTERNS = ["hardware", "faucet", "sink", "lighting", "fan", "refrigerator", "range", "dishwasher"];
      const isFixture = (subId: string) => FIXTURE_PATTERNS.some(p => subId.includes(p));

      let structuralSwatchCount = 0;
      let fixtureSwatchCount = 0;
      for (const [subId, optId] of Object.entries(scopedSelections)) {
        const entry = optionLookup.get(`${subId}:${optId}`);
        if (!entry?.option.swatchUrl) continue;
        if (isFixture(subId)) fixtureSwatchCount++;
        else structuralSwatchCount++;
      }
      const totalSwatchEstimate = structuralSwatchCount + fixtureSwatchCount;

      // Split into structural + fixture passes when total exceeds 7 AND both
      // groups have swatches. If all swatches are structural (no fixtures),
      // we can't split meaningfully — send all in one pass and let BFL truncate
      // the reference images (prompt text + hex anchors cover the overflow).
      const needsSplit = totalSwatchEstimate > MAX_SWATCHES
        && fixtureSwatchCount > 0
        && structuralSwatchCount > 0;

      console.log(`[generate/photo] ~${totalSwatchEstimate} swatches for photo ${stepPhotoId} (${structuralSwatchCount} structural, ${fixtureSwatchCount} fixture)${needsSplit ? " — splitting" : ""}`);
      lap("pre-prompt");

      const genStart = performance.now();
      try {
        if (!needsSplit) {
          // --- Single pass: all swatches fit (or can't split meaningfully) ---
          const { prompt, swatches } = await buildBflEditPrompt(
            scopedSelections,
            optionLookup,
            spatialHints,
            scopedSubcategoryIds,
            sceneDescription,
            photoSpatialHint,
            cachedResolver,
            resolvedPolicy.promptOverrides,
          );

          const result = await generateImage({
            model: modelName as BflModel,
            prompt,
            inputImage: imageBuffer,
            referenceImages: swatches.map(s => s.buffer),
          });

          await uploadIntermediate(supabase, result.imageBuffer, mainPassPath);
          const durationMs = Math.round(performance.now() - genStart);
          console.log(`[generate/photo] Single pass complete for ${stepPhotoId} in ${durationMs}ms`);
          return { type: "generated" as const, prompt, durationMs, lastPath: mainPassPath, passes: 1 };
        } else {
          // --- Two-pass split: structural then fixtures in same step ---
          // Both passes share the already-loaded optionLookup, swatches, and hero.
          // Vercel Pro + Fluid Compute gives us 300s per step — plenty for 2 BFL calls.
          const structuralSelections: Record<string, string> = {};
          const fixtureSelections: Record<string, string> = {};
          for (const [subId, optId] of Object.entries(scopedSelections)) {
            if (isFixture(subId)) fixtureSelections[subId] = optId;
            else structuralSelections[subId] = optId;
          }

          const { prompt: structuralPrompt, swatches: structuralSwatches } = await buildBflEditPrompt(
            structuralSelections, optionLookup, spatialHints, scopedSubcategoryIds,
            sceneDescription, photoSpatialHint, cachedResolver, resolvedPolicy.promptOverrides,
          );
          const { prompt: fixturePrompt, swatches: fixtureSwatches } = await buildBflEditPrompt(
            fixtureSelections, optionLookup, spatialHints, scopedSubcategoryIds,
            sceneDescription, photoSpatialHint, cachedResolver, resolvedPolicy.promptOverrides,
          );
          lap("prompts-built");

          const pass1Result = await generateImage({
            model: modelName as BflModel,
            prompt: structuralPrompt,
            inputImage: imageBuffer,
            referenceImages: structuralSwatches.map(s => s.buffer),
          });
          lap("pass1-done");

          const pass2Result = await generateImage({
            model: modelName as BflModel,
            prompt: fixturePrompt,
            inputImage: pass1Result.imageBuffer,
            referenceImages: fixtureSwatches.map(s => s.buffer),
          });
          lap("pass2-done");

          await uploadIntermediate(supabase, pass2Result.imageBuffer, mainPassPath);
          const durationMs = Math.round(performance.now() - genStart);
          console.log(`[generate/photo] Two-pass complete for ${stepPhotoId} in ${durationMs}ms`);
          return { type: "generated" as const, prompt: `${structuralPrompt}\n\nPASS_2 (fixtures):\n${fixturePrompt}`, durationMs, lastPath: mainPassPath, passes: 2 };
        }
      } catch (err) {
        const durationMs = Math.round(performance.now() - genStart);
        await captureAiError(sessionId, {
          provider: "bfl",
          model: modelName,
          route: "/api/generate/photo",
          duration_ms: durationMs,
          error: err,
          orgId,
          orgSlug,
          floorplanSlug,
        });
        throw err;
      }
    });

    // --- Tracking vars ---
    let isScopedEdit = false;
    let scopedEditDepth = 0;
    let scopedEditSurface: string | undefined;
    let scopedEditModelUsed: string = SCOPED_EDIT_MODEL;
    let finalPrompt: string;
    let totalDurationMs: number;
    let currentPath: string;
    let totalPasses: number;

    // --- Scoped edit path (diff cache hit) ---
    if (generateResult.type === "scoped-edit-needed") {
      const { imagePath: baseImagePath, depth, changedSubcategoryId, changedNewOptionId } = generateResult;
      isScopedEdit = true;
      scopedEditDepth = depth + 1;
      scopedEditSurface = changedSubcategoryId;
      totalPasses = 1;

      const scopedResult = await step.run("scoped-edit", async () => {
        const supabase = getServiceClient();

        const [optionLookup, baseImageResult] = await Promise.all([
          getOptionLookup(orgId),
          supabase.storage.from("generated-images").download(baseImagePath),
        ]);
        const { data: baseImageData, error: dlErr } = baseImageResult;
        if (dlErr || !baseImageData) throw new Error(`Failed to download base image: ${dlErr?.message}`);

        const baseBuffer = Buffer.from(await baseImageData.arrayBuffer());
        const resolveSwatchBuffer = createSwatchResolver(supabase);

        const { prompt, swatches } = await buildBflScopedEditPrompt(
          changedSubcategoryId,
          changedNewOptionId,
          scopedSelections,
          optionLookup,
          spatialHints,
          scopedSubcategoryIds,
          sceneDescription,
          photoSpatialHint,
          resolveSwatchBuffer,
          resolvedPolicy.promptOverrides,
        );

        // Range/oven swaps are structural geometry changes — use Max instead of Klein 4B
        const isRangeOven = changedSubcategoryId.includes("range") || changedSubcategoryId.includes("oven");
        const scopedModel = isRangeOven ? IMAGE_MODEL : SCOPED_EDIT_MODEL;

        console.log(`[generate/photo] Scoped edit for ${stepPhotoId}: changing ${changedSubcategoryId} with ${scopedModel} (depth ${depth} → ${depth + 1})`);

        const genStart = performance.now();
        try {
          const result = await generateImage({
            model: scopedModel as BflModel,
            prompt,
            inputImage: baseBuffer,
            referenceImages: swatches.map(s => s.buffer),
          });

          await uploadIntermediate(supabase, result.imageBuffer, scopedEditPath);
          const durationMs = Math.round(performance.now() - genStart);

          console.log(`[generate/photo] Scoped edit complete for ${stepPhotoId} in ${durationMs}ms`);
          return { prompt, durationMs, model: scopedModel };
        } catch (err) {
          const durationMs = Math.round(performance.now() - genStart);
          await captureAiError(sessionId, {
            provider: "bfl",
            model: scopedModel,
            route: "/api/generate/photo",
            duration_ms: durationMs,
            error: err,
            orgId, orgSlug, floorplanSlug,
          });
          throw err;
        }
      });

      currentPath = scopedEditPath;
      finalPrompt = scopedResult.prompt;
      totalDurationMs = scopedResult.durationMs;
      scopedEditModelUsed = scopedResult.model;
    } else {
      // --- Full pipeline: single or two-pass completed ---
      finalPrompt = generateResult.prompt;
      totalDurationMs = generateResult.durationMs;
      currentPath = generateResult.lastPath;
      totalPasses = generateResult.passes;
    }

    // --- Step 2: Oven correction / second pass (conditional) ---
    if (!isScopedEdit && resolvedPolicy.secondPass) {
      const secondPass = await step.run("refine", async () => {
        const supabase = getServiceClient();
        const prevBuffer = await downloadIntermediate(supabase, currentPath);

        console.log(
          `[generate/photo] Running second pass (${resolvedPolicy.secondPass!.reason}) for photo ${stepPhotoId}`,
        );

        const genStart = performance.now();
        try {
          const result = await generateImage({
            model: modelName as BflModel,
            prompt: resolvedPolicy.secondPass!.prompt,
            inputImage: prevBuffer,
          });

          await uploadIntermediate(supabase, result.imageBuffer, refinePath);
          const durationMs = Math.round(performance.now() - genStart);
          console.log(`[generate/photo] Second pass complete for ${stepPhotoId} in ${durationMs}ms`);
          return { durationMs, success: true as const, path: refinePath };
        } catch (err) {
          const durationMs = Math.round(performance.now() - genStart);
          console.warn(`[generate/photo] Second pass failed for ${stepPhotoId}; keeping previous output.`, err);
          return { durationMs, success: false as const };
        }
      });

      totalDurationMs += secondPass.durationMs;
      if (secondPass.success) {
        currentPath = secondPass.path;
        finalPrompt = `${finalPrompt}\n\nSECOND_PASS (${resolvedPolicy.secondPass.reason}):\n${resolvedPolicy.secondPass.prompt}`;
        totalPasses += 1;
      }
    }

    // --- Step 3: Persist — copy final intermediate to canonical path + write DB ---
    await step.run("persist", async () => {
      const supabase = getServiceClient();

      if (currentPath !== outputPath) {
        const finalBuffer = await downloadIntermediate(supabase, currentPath);
        await uploadIntermediate(supabase, finalBuffer, outputPath);
      }

      const { error: upsertError } = await supabase
        .from("generated_images")
        .upsert({
          selections_hash: selectionsHash,
          selections_json: selectionsJsonForClaim,
          image_path: outputPath,
          prompt: finalPrompt,
          step_id: stepId,
          step_photo_id: stepPhotoId,
          buyer_session_id: sessionId,
          selections_fingerprint: selectionsFingerprint,
          model: modelName,
          org_id: orgId,
          scoped_edit_depth: isScopedEdit ? scopedEditDepth : 0,
          leave_one_out_hashes: leaveOneOutHashes,
        }, { onConflict: "selections_hash" });

      if (upsertError) {
        console.error("[generate/photo] DB upsert failed:", upsertError);
      }

      await captureAiEvent(sessionId, {
        provider: "bfl",
        model: isScopedEdit ? scopedEditModelUsed : modelName,
        route: "/api/generate/photo",
        duration_ms: totalDurationMs,
        cost_usd: isScopedEdit
          ? estimateBflCost(scopedEditModelUsed)
          : estimateBflCost(modelName, totalPasses),
        orgId,
        orgSlug,
        floorplanSlug,
        image_size: "1536x1024",
        scoped_edit: isScopedEdit,
        scoped_edit_depth: isScopedEdit ? scopedEditDepth : undefined,
        scoped_edit_surface: scopedEditSurface,
        second_pass: totalPasses > 1 && !isScopedEdit,
        two_pass_split: totalPasses >= 2 && !isScopedEdit && !resolvedPolicy.secondPass,
      });

      console.log(`[generate/photo] Completed for photo ${stepPhotoId} in ${totalDurationMs}ms (${totalPasses} pass${totalPasses > 1 ? "es" : ""}${isScopedEdit ? ", scoped edit" : ""})`);
    });
  },
);
