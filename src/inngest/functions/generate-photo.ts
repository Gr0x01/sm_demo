import sharp from "sharp";
import { inngest } from "@/inngest/client";
import { buildEditPrompt } from "@/lib/generate";
import type { SwatchBufferResolver } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getStepPhotoAiConfig, getOptionLookup } from "@/lib/db-queries";
import { captureAiEvent, estimateGeminiImageCost } from "@/lib/posthog-server";
import { generateImageWithGemini, wrapPromptForGemini, splitSelectionsForGemini } from "@/lib/gemini-image";

const SUPPORTED_SWATCH_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Build a swatch resolver that downloads from Supabase Storage. */
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

/**
 * Resolve the currently selected range swatch (if any) as a Gemini-compatible image attachment.
 * Used by range-focused refinement passes to reduce model ambiguity about appliance geometry.
 */
async function getSelectedRangeSwatch(
  scopedSelections: Record<string, string>,
  optionLookup: Map<string, { option: { swatchUrl?: string } }>,
  resolveSwatchBuffer: SwatchBufferResolver,
): Promise<Array<{ buffer: Buffer; mediaType: string }>> {
  const selectedRange = scopedSelections.range;
  if (!selectedRange) return [];

  const found = optionLookup.get(`range:${selectedRange}`);
  if (!found?.option.swatchUrl) return [];

  const resolved = await resolveSwatchBuffer(found.option.swatchUrl);
  if (!resolved) return [];
  if (!SUPPORTED_SWATCH_MEDIA_TYPES.has(resolved.mediaType)) return [];
  return [resolved];
}

function buildRangeGeometryPrompt(basePrompt: string, withSwatch: boolean): string {
  const swatchInstruction = withSwatch
    ? "Use attached swatch #1 as the source of truth for the selected range model and finish."
    : "No swatch attachment is available in this pass; still enforce the selected range geometry exactly.";

  return `${basePrompt}

CRITICAL RANGE GEOMETRY LOCK:
- ${swatchInstruction}
- The selected range is slide-in: NO raised backguard panel and NO rear control panel rising above the countertop.
- Keep backsplash tile visible directly behind the cooktop.
- Keep exactly one oven door below the cooktop.
- Edit ONLY the cooking range appliance in-place; keep surrounding cabinetry, countertop seams, island, sink, faucet, walls, flooring, and lighting unchanged.`;
}

/** Upload intermediate image to temp storage, return the path. Keeps step state small. */
async function uploadTempImage(
  supabase: ReturnType<typeof getServiceClient>,
  orgId: string,
  selectionsHash: string,
  suffix: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const ext = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/webp" ? "webp" : "png";
  const tempPath = `${orgId}/temp-${selectionsHash}-${suffix}.${ext}`;
  const { error } = await supabase.storage
    .from("generated-images")
    .upload(tempPath, buffer, { contentType: mimeType, upsert: true });
  if (error) throw new Error(`Temp upload failed: ${error.message}`);
  return tempPath;
}

/** Download an intermediate image from temp storage. */
async function downloadTempImage(
  supabase: ReturnType<typeof getServiceClient>,
  tempPath: string,
): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from("generated-images")
    .download(tempPath);
  if (error || !data) throw new Error(`Temp download failed: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

/** Clean up temp intermediate images (best-effort). */
async function cleanupTempImages(
  supabase: ReturnType<typeof getServiceClient>,
  orgId: string,
  selectionsHash: string,
): Promise<void> {
  const { data: files } = await supabase.storage
    .from("generated-images")
    .list(orgId, { search: `temp-${selectionsHash}-` });
  if (files?.length) {
    await supabase.storage
      .from("generated-images")
      .remove(files.map((f) => `${orgId}/${f.name}`));
  }
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
      modelName,
      resolvedPolicy,
      sceneDescription,
      spatialHints,
      photoSpatialHint,
      selectionsJsonForClaim,
    } = event.data;

    // --- Step 1: First swatch batch (always runs, up to 120s) ---
    // Also computes and returns batch assignments so continuation steps don't re-derive from DB.
    const firstBatch = await step.run("generate-1", async () => {
      const supabase = getServiceClient();

      const aiConfig = await getStepPhotoAiConfig(stepPhotoId);
      if (!aiConfig) throw new Error(`Step photo ${stepPhotoId} not found`);

      const optionLookup = await getOptionLookup(orgId);

      // Split selections into batches for Gemini's 14-image limit.
      // Serialize the batch assignments so continuation steps use the same split.
      const batches = splitSelectionsForGemini(scopedSelections, optionLookup);
      const batchCount = batches.length;

      // Download hero image
      const { data: imageData, error: downloadErr } = await supabase.storage
        .from("rooms")
        .download(aiConfig.photo.imagePath);

      if (downloadErr || !imageData) {
        throw new Error(`Failed to load base photo: ${downloadErr?.message}`);
      }

      const imageBuffer = Buffer.from(await imageData.arrayBuffer());
      const heroExt = aiConfig.photo.imagePath.split(".").pop()?.toLowerCase() || "webp";
      const heroMime = heroExt === "jpg" ? "image/jpeg" : `image/${heroExt}`;

      const resolveSwatchBuffer = createSwatchResolver(supabase);

      // Build prompt for first batch only
      const { prompt, swatches } = await buildEditPrompt(
        batches[0],
        optionLookup,
        spatialHints,
        sceneDescription,
        photoSpatialHint,
        resolveSwatchBuffer,
        resolvedPolicy.promptOverrides,
      );

      // Filter unsupported swatch formats
      const supportedSwatches = swatches.filter((s) => SUPPORTED_SWATCH_MEDIA_TYPES.has(s.mediaType));

      const geminiPrompt = wrapPromptForGemini(prompt);
      console.log(`[generate/photo] Sending ${1 + supportedSwatches.length} images to ${modelName} for photo ${stepPhotoId} (batch 1/${batchCount})`);

      const genStart = performance.now();
      const result = await generateImageWithGemini({
        roomBuffer: imageBuffer,
        roomMimeType: heroMime,
        swatches: supportedSwatches,
        prompt: geminiPrompt,
        model: modelName,
      });

      const durationMs = Math.round(performance.now() - genStart);
      console.log(`[generate/photo] Batch 1 complete for ${stepPhotoId} in ${durationMs}ms`);

      // Upload intermediate image to storage instead of passing b64 through step state
      let tempPath: string | null = null;
      if (batchCount > 1 || resolvedPolicy.secondPass) {
        tempPath = await uploadTempImage(
          supabase, orgId, selectionsHash, "batch-1",
          Buffer.from(result.b64, "base64"), result.mimeType,
        );
      }

      return {
        prompt,
        durationMs,
        batchCount,
        batchAssignments: batchCount > 1 ? batches : null,
        tempPath,
        mimeType: result.mimeType,
        // Only pass b64 through state if this is the final image (no continuation/refine needed)
        finalB64: (!tempPath) ? result.b64 : null,
      };
    });

    // --- Step 2: Continuation batches (conditional: batches > 1) ---
    let latestTempPath = firstBatch.tempPath;
    let latestMimeType = firstBatch.mimeType;
    let currentPrompt = firstBatch.prompt;
    let totalDurationMs = firstBatch.durationMs;
    const batchCount = firstBatch.batchCount;

    if (batchCount > 1 && firstBatch.batchAssignments) {
      for (let batchIdx = 1; batchIdx < batchCount; batchIdx++) {
        const stepName = `generate-continuation-${batchIdx + 1}`;
        const prevTempPath = latestTempPath!;
        const prevMimeType = latestMimeType;
        const batchSelections = firstBatch.batchAssignments[batchIdx];

        const continuation = await step.run(stepName, async () => {
          const supabase = getServiceClient();
          const optionLookup = await getOptionLookup(orgId);
          const resolveSwatchBuffer = createSwatchResolver(supabase);

          // Download previous pass output from temp storage
          const roomBuffer = await downloadTempImage(supabase, prevTempPath);

          // Build prompt for this batch's selections only
          const { prompt: batchPrompt, swatches } = await buildEditPrompt(
            batchSelections,
            optionLookup,
            spatialHints,
            sceneDescription,
            photoSpatialHint,
            resolveSwatchBuffer,
            resolvedPolicy.promptOverrides,
          );

          const supportedSwatches = swatches.filter((s) => SUPPORTED_SWATCH_MEDIA_TYPES.has(s.mediaType));

          const geminiPrompt = wrapPromptForGemini(batchPrompt);
          console.log(`[generate/photo] Sending ${1 + supportedSwatches.length} images to ${modelName} for photo ${stepPhotoId} (batch ${batchIdx + 1}/${batchCount})`);

          const genStart = performance.now();
          const result = await generateImageWithGemini({
            roomBuffer,
            roomMimeType: prevMimeType,
            swatches: supportedSwatches,
            prompt: geminiPrompt,
            model: modelName,
          });

          const durationMs = Math.round(performance.now() - genStart);
          console.log(`[generate/photo] Batch ${batchIdx + 1} complete for ${stepPhotoId} in ${durationMs}ms`);

          // Upload intermediate to temp storage
          const tempPath = await uploadTempImage(
            supabase, orgId, selectionsHash, `batch-${batchIdx + 1}`,
            Buffer.from(result.b64, "base64"), result.mimeType,
          );

          return { prompt: batchPrompt, durationMs, tempPath, mimeType: result.mimeType };
        });

        latestTempPath = continuation.tempPath;
        latestMimeType = continuation.mimeType;
        currentPrompt += `\n\nBATCH ${batchIdx + 1}:\n${continuation.prompt}`;
        totalDurationMs += continuation.durationMs;
      }
    }

    // --- Step 3: Policy second pass (conditional, gets its own 120s) ---
    let finalPrompt = currentPrompt;
    let policySecondPassAttempted = false;
    let rangeLockPassAttempted = false;

    if (resolvedPolicy.secondPass) {
      const prevTempPath = latestTempPath!;
      const prevMimeType = latestMimeType;

      const secondPass = await step.run("refine", async () => {
        const supabase = getServiceClient();
        const optionLookup = await getOptionLookup(orgId);
        const resolveSwatchBuffer = createSwatchResolver(supabase);

        console.log(
          `[generate/photo] Running second pass (${resolvedPolicy.secondPass!.reason}) for photo ${stepPhotoId}`,
        );

        const roomBuffer = await downloadTempImage(supabase, prevTempPath);
        const isRangePolicy = /range/i.test(resolvedPolicy.secondPass!.reason);
        const rangeSwatch = isRangePolicy
          ? await getSelectedRangeSwatch(scopedSelections, optionLookup, resolveSwatchBuffer)
          : [];
        const secondPassPrompt = isRangePolicy
          ? buildRangeGeometryPrompt(resolvedPolicy.secondPass!.prompt, rangeSwatch.length > 0)
          : resolvedPolicy.secondPass!.prompt;
        const geminiPrompt = wrapPromptForGemini(secondPassPrompt);

        const genStart = performance.now();
        try {
          const result = await generateImageWithGemini({
            roomBuffer,
            roomMimeType: prevMimeType,
            swatches: rangeSwatch,
            prompt: geminiPrompt,
            model: modelName,
          });

          const durationMs = Math.round(performance.now() - genStart);
          console.log(`[generate/photo] Second pass complete for ${stepPhotoId} in ${durationMs}ms`);

          // Upload refined image
          const tempPath = await uploadTempImage(
            supabase, orgId, selectionsHash, "refine",
            Buffer.from(result.b64, "base64"), result.mimeType,
          );

          return {
            tempPath,
            mimeType: result.mimeType,
            durationMs,
            success: true as const,
            promptUsed: secondPassPrompt,
          };
        } catch (err) {
          const durationMs = Math.round(performance.now() - genStart);
          console.warn(`[generate/photo] Second pass failed for ${stepPhotoId}; keeping previous output.`, err);
          return {
            tempPath: null,
            mimeType: null,
            durationMs,
            success: false as const,
            promptUsed: secondPassPrompt,
          };
        }
      });

      policySecondPassAttempted = true;
      totalDurationMs += secondPass.durationMs;
      if (secondPass.success && secondPass.tempPath) {
        latestTempPath = secondPass.tempPath;
        finalPrompt = `${currentPrompt}\n\nSECOND_PASS (${resolvedPolicy.secondPass.reason}):\n${secondPass.promptUsed}`;
      }
    }

    // --- Step 3b: Range lock pass (conditional third pass for known slide-in range drift) ---
    if (resolvedPolicy.secondPass && /range/i.test(resolvedPolicy.secondPass.reason) && scopedSelections.range) {
      const prevTempPath = latestTempPath!;
      const prevMimeType = latestMimeType;

      const rangeLock = await step.run("refine-range-lock", async () => {
        const supabase = getServiceClient();
        const optionLookup = await getOptionLookup(orgId);
        const resolveSwatchBuffer = createSwatchResolver(supabase);

        console.log(`[generate/photo] Running range lock pass for photo ${stepPhotoId}`);

        const roomBuffer = await downloadTempImage(supabase, prevTempPath);
        const rangeSwatch = await getSelectedRangeSwatch(scopedSelections, optionLookup, resolveSwatchBuffer);
        const lockPrompt = buildRangeGeometryPrompt(
          "Final correction pass: verify and correct ONLY the cooking range geometry.",
          rangeSwatch.length > 0,
        );
        const geminiPrompt = wrapPromptForGemini(lockPrompt);

        const genStart = performance.now();
        try {
          const result = await generateImageWithGemini({
            roomBuffer,
            roomMimeType: prevMimeType,
            swatches: rangeSwatch,
            prompt: geminiPrompt,
            model: modelName,
          });

          const durationMs = Math.round(performance.now() - genStart);
          console.log(`[generate/photo] Range lock pass complete for ${stepPhotoId} in ${durationMs}ms`);

          const tempPath = await uploadTempImage(
            supabase, orgId, selectionsHash, "range-lock",
            Buffer.from(result.b64, "base64"), result.mimeType,
          );

          return {
            tempPath,
            mimeType: result.mimeType,
            durationMs,
            success: true as const,
            promptUsed: lockPrompt,
          };
        } catch (err) {
          const durationMs = Math.round(performance.now() - genStart);
          console.warn(`[generate/photo] Range lock pass failed for ${stepPhotoId}; keeping previous output.`, err);
          return {
            tempPath: null,
            mimeType: null,
            durationMs,
            success: false as const,
            promptUsed: lockPrompt,
          };
        }
      });

      rangeLockPassAttempted = true;
      totalDurationMs += rangeLock.durationMs;
      if (rangeLock.success && rangeLock.tempPath) {
        latestTempPath = rangeLock.tempPath;
        finalPrompt = `${finalPrompt}\n\nRANGE_LOCK_PASS:\n${rangeLock.promptUsed}`;
      }
    }

    // --- Step 4: Upload to storage + persist to DB ---
    const attemptedPasses = batchCount + (policySecondPassAttempted ? 1 : 0) + (rangeLockPassAttempted ? 1 : 0);

    await step.run("persist", async () => {
      const supabase = getServiceClient();

      // Get final image: either from temp storage or from step 1's direct b64
      let outputBuffer: Buffer;
      if (latestTempPath) {
        outputBuffer = await downloadTempImage(supabase, latestTempPath);
      } else {
        outputBuffer = Buffer.from(firstBatch.finalB64!, "base64");
      }

      const outputPath = `${orgId}/${selectionsHash}.png`;

      const { error: uploadError } = await supabase.storage
        .from("generated-images")
        .upload(outputPath, outputBuffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
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
        }, { onConflict: "selections_hash" });

      if (upsertError) {
        throw new Error(`DB upsert failed: ${upsertError.message}`);
      }

      // Clean up temp intermediate images (best-effort)
      await cleanupTempImages(supabase, orgId, selectionsHash);

      await captureAiEvent(sessionId, {
        provider: "google",
        model: modelName,
        route: "/api/generate/photo",
        duration_ms: totalDurationMs,
        cost_usd: estimateGeminiImageCost(modelName, attemptedPasses),
        orgId,
        orgSlug,
        floorplanSlug,
        image_size: "1K",
        second_pass: policySecondPassAttempted,
        swatch_batch_count: batchCount,
      });

      console.log(`[generate/photo] Completed for photo ${stepPhotoId} in ${totalDurationMs}ms (${attemptedPasses} pass${attemptedPasses > 1 ? "es" : ""}, ${batchCount} batch${batchCount > 1 ? "es" : ""})`);
    });
  },
);
