import sharp from "sharp";
import { inngest } from "@/inngest/client";
import { NonRetriableError } from "inngest";
import { identifyChangedSubcategory, stripExclusionRulesForMergedLinks } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getOptionLookup, findSingleSurfaceDiffMatch } from "@/lib/db-queries";
import { captureAiEvent, captureAiError, estimateBflCost } from "@/lib/posthog-server";
import { SCOPED_EDIT_MODEL } from "@/lib/models";
import { generateImage } from "@/lib/bfl";
import { BflContentModerationError } from "@/lib/bfl";
import type { BflModel } from "@/lib/bfl";
import { fluxGenerate, fluxScopedEdit, createSwatchResolver } from "@/lib/flux-pipeline";

/**
 * Upload a buffer to generated-images storage.
 */
async function uploadIntermediate(
  supabase: ReturnType<typeof getServiceClient>,
  buffer: Buffer,
  path: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from("generated-images")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });
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
    name: "Generate Photo (buyer/prospect)",
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
      spatialHints,
      selectionsJsonForClaim,
      leaveOneOutHashes,
      heroImagePath,
      source,
    } = event.data;

    console.log(`[generate/photo] Source: ${source}`);
    const MAX_SCOPED_EDIT_DEPTH = 3;
    const outputPath = `${orgId}/${selectionsHash}.jpg`;
    const mainPassPath = `${orgId}/${selectionsHash}_main.jpg`;
    const scopedEditPath = `${orgId}/${selectionsHash}_scoped.jpg`;
    const refinePath = `${orgId}/${selectionsHash}_refine.jpg`;

    // --- Step 1: Diff cache check + full generation ---
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

      // No scoped edit — full generation via shared Flux pipeline
      const supabase = getServiceClient();

      // Parallel — hero download runs alongside optionLookup setup
      const optionLookupP = getOptionLookup(orgId).then(ol => {
        stripExclusionRulesForMergedLinks(scopedSubcategoryIds, scopedSelections, ol);
        return ol;
      });
      const [heroResult, optionLookup] = await Promise.all([
        supabase.storage.from("rooms").download(heroImagePath),
        optionLookupP,
      ]);
      lap("parallel-setup");

      const { data: imageData, error: downloadErr } = heroResult;
      if (downloadErr || !imageData) {
        throw new Error(`Failed to load base photo: ${downloadErr?.message}`);
      }

      const rawImageBuffer = Buffer.from(await imageData.arrayBuffer());
      const heroExt = heroImagePath.split(".").pop()?.toLowerCase() || "webp";
      const needsConversion = !["png", "jpg", "jpeg", "webp", "gif"].includes(heroExt);
      const heroBuffer = needsConversion
        ? await sharp(rawImageBuffer).png().toBuffer()
        : rawImageBuffer;

      try {
        const result = await fluxGenerate({
          heroBuffer,
          selections: scopedSelections,
          optionLookup,
          spatialHints,
          swatchResolver: createSwatchResolver(supabase),
          model: modelName,
        });

        await uploadIntermediate(supabase, result.imageBuffer, mainPassPath);
        lap("generation-done");
        console.log(`[generate/photo] ${result.passes === 1 ? "Single" : "Two"}-pass complete for ${stepPhotoId} in ${result.durationMs}ms`);
        return { type: "generated" as const, prompt: result.prompt, durationMs: result.durationMs, lastPath: mainPassPath, passes: result.passes };
      } catch (err) {
        await captureAiError(sessionId, {
          provider: "bfl",
          model: modelName,
          route: "/api/generate/photo",
          duration_ms: Math.round(performance.now() - t0),
          error: err,
          orgId, orgSlug, floorplanSlug,
        });
        if (err instanceof BflContentModerationError) {
          // Mark the row as failed so the polling client sees it immediately
          await supabase.from("generated_images")
            .update({ image_path: "__failed__" })
            .eq("selections_hash", selectionsHash)
            .eq("image_path", "__pending__");
          throw new NonRetriableError(err.message, { cause: err });
        }
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

        const genStart = performance.now();
        try {
          const result = await fluxScopedEdit({
            baseImageBuffer: Buffer.from(await baseImageData.arrayBuffer()),
            changedSubcategoryId,
            changedOptionId: changedNewOptionId,
            optionLookup,
            spatialHints,
            swatchResolver: createSwatchResolver(supabase),
          });

          await uploadIntermediate(supabase, result.imageBuffer, scopedEditPath);
          console.log(`[generate/photo] Scoped edit for ${stepPhotoId}: ${changedSubcategoryId} with ${result.model} (depth ${depth} → ${depth + 1}) in ${result.durationMs}ms`);
          return { prompt: result.prompt, durationMs: result.durationMs, model: result.model };
        } catch (err) {
          await captureAiError(sessionId, {
            provider: "bfl",
            model: SCOPED_EDIT_MODEL,
            route: "/api/generate/photo",
            duration_ms: Math.round(performance.now() - genStart),
            error: err,
            orgId, orgSlug, floorplanSlug,
          });
          if (err instanceof BflContentModerationError) {
            await supabase.from("generated_images")
              .update({ image_path: "__failed__" })
              .eq("selections_hash", selectionsHash)
              .eq("image_path", "__pending__");
            throw new NonRetriableError(err.message, { cause: err });
          }
          throw err;
        }
      });

      currentPath = scopedEditPath;
      finalPrompt = scopedResult.prompt;
      totalDurationMs = scopedResult.durationMs;
      scopedEditModelUsed = scopedResult.model;
    } else {
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

        console.log(`[generate/photo] Running second pass (${resolvedPolicy.secondPass!.reason}) for ${stepPhotoId}`);

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

    // --- Step 3: Persist ---
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

      if (upsertError) console.error("[generate/photo] DB upsert failed:", upsertError);

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

      console.log(`[generate/photo] Completed for ${stepPhotoId} in ${totalDurationMs}ms (${totalPasses} pass${totalPasses > 1 ? "es" : ""}${isScopedEdit ? ", scoped edit" : ""})`);
    });
  },
);
