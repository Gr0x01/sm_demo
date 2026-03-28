import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { inngest } from "@/inngest/client";
import { buildEditPrompt, buildScopedEditPrompt, identifyChangedSubcategory } from "@/lib/generate";
import type { SwatchBufferResolver } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getStepPhotoAiConfig, getOptionLookup, findSingleSurfaceDiffMatch } from "@/lib/db-queries";
import { captureAiEvent, captureAiError, estimateOpenAICost, estimateGeminiImageCost } from "@/lib/posthog-server";

const openai = new OpenAI();

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
    } = event.data;

    const MAX_SCOPED_EDIT_DEPTH = 3;

    // --- Step 0: Check for single-surface diff match (partial cache) ---
    const diffMatch = await step.run("check-diff-cache", async () => {
      return findSingleSurfaceDiffMatch(stepPhotoId, leaveOneOutHashes, MAX_SCOPED_EDIT_DEPTH);
    });

    if (diffMatch) {
      const changedSub = identifyChangedSubcategory(diffMatch.selectionsJson, scopedSelections);

      if (changedSub) {
        // --- Scoped edit: change only the differing surface ---
        const scopedResult = await step.run("scoped-edit", async () => {
          const supabase = getServiceClient();
          const optionLookup = await getOptionLookup(orgId);

          // Download the base image from storage
          const { data: baseImageData, error: dlErr } = await supabase.storage
            .from("generated-images")
            .download(diffMatch.imagePath);
          if (dlErr || !baseImageData) throw new Error(`Failed to download base image: ${dlErr?.message}`);

          const baseBuffer = Buffer.from(await baseImageData.arrayBuffer());
          const resolveSwatchBuffer = createSwatchResolver(supabase);

          const { prompt, swatches } = await buildScopedEditPrompt(
            changedSub.subcategoryId,
            changedSub.newOptionId,
            scopedSelections,
            optionLookup,
            spatialHints,
            scopedSubcategoryIds,
            sceneDescription,
            photoSpatialHint,
            resolveSwatchBuffer,
            resolvedPolicy.promptOverrides,
          );

          // Filter unsupported swatch formats
          const supportedSwatches = swatches.filter(s =>
            ["image/jpeg", "image/png", "image/webp"].includes(s.mediaType),
          );

          const inputImages = [
            await toFile(baseBuffer, "base.png", { type: "image/png" }),
            ...await Promise.all(
              supportedSwatches.map(s => {
                const ext = s.mediaType.split("/")[1] || "png";
                const filename = `${s.label.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
                return toFile(s.buffer, filename, { type: s.mediaType });
              }),
            ),
          ];

          console.log(`[generate/photo] Scoped edit for ${stepPhotoId}: changing ${changedSub.subcategoryId} (depth ${diffMatch.depth} → ${diffMatch.depth + 1})`);

          const genStart = performance.now();
          try {
            const result = await openai.images.edit({
              model: modelName,
              image: inputImages,
              prompt,
              quality: "medium",
              size: "1536x1024",
              input_fidelity: "high",
            });

            const generatedData = result.data?.[0];
            if (!generatedData?.b64_json) throw new Error("No image from scoped edit");

            const durationMs = Math.round(performance.now() - genStart);
            console.log(`[generate/photo] Scoped edit complete for ${stepPhotoId} in ${durationMs}ms`);
            return { b64: generatedData.b64_json, prompt, durationMs };
          } catch (err) {
            const durationMs = Math.round(performance.now() - genStart);
            await captureAiError(sessionId, {
              provider: "openai",
              model: modelName,
              route: "/api/generate/photo",
              duration_ms: durationMs,
              error: err,
              orgId, orgSlug, floorplanSlug,
            });
            throw err;
          }
        });

        // --- Persist scoped edit result ---
        await step.run("persist-scoped", async () => {
          const supabase = getServiceClient();
          const outputBuffer = Buffer.from(scopedResult.b64, "base64");
          const outputPath = `${orgId}/${selectionsHash}.png`;

          const { error: uploadError } = await supabase.storage
            .from("generated-images")
            .upload(outputPath, outputBuffer, { contentType: "image/png", upsert: true });

          if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

          const { error: upsertError } = await supabase
            .from("generated_images")
            .upsert({
              selections_hash: selectionsHash,
              selections_json: selectionsJsonForClaim,
              image_path: outputPath,
              prompt: scopedResult.prompt,
              step_id: stepId,
              step_photo_id: stepPhotoId,
              buyer_session_id: sessionId,
              selections_fingerprint: selectionsFingerprint,
              model: modelName,
              org_id: orgId,
              scoped_edit_depth: diffMatch.depth + 1,
              leave_one_out_hashes: leaveOneOutHashes,
            }, { onConflict: "selections_hash" });

          if (upsertError) console.error("[generate/photo] DB upsert failed:", upsertError);

          await captureAiEvent(sessionId, {
            provider: "openai",
            model: modelName,
            route: "/api/generate/photo",
            duration_ms: scopedResult.durationMs,
            cost_usd: estimateOpenAICost(modelName, 1),
            orgId, orgSlug, floorplanSlug,
            image_size: "1536x1024",
            image_quality: "medium",
            scoped_edit: true,
            scoped_edit_depth: diffMatch.depth + 1,
            scoped_edit_surface: changedSub.subcategoryId,
          });

          console.log(`[generate/photo] Scoped edit persisted for ${stepPhotoId} (depth ${diffMatch.depth + 1})`);
        });

        return; // Done — skip full pipeline
      }
    }

    // --- Step 1: Main pass generation via OpenAI (up to 120s) ---
    const firstPass = await step.run("generate", async () => {
      const supabase = getServiceClient();

      const aiConfig = await getStepPhotoAiConfig(stepPhotoId);
      if (!aiConfig) throw new Error(`Step photo ${stepPhotoId} not found`);

      const optionLookup = await getOptionLookup(orgId);

      // Download hero image
      const { data: imageData, error: downloadErr } = await supabase.storage
        .from("rooms")
        .download(aiConfig.photo.imagePath);
      if (downloadErr || !imageData) {
        throw new Error(`Failed to load base photo: ${downloadErr?.message}`);
      }

      const rawImageBuffer = Buffer.from(await imageData.arrayBuffer());
      const heroExt = aiConfig.photo.imagePath.split(".").pop()?.toLowerCase() || "webp";
      const needsConversion = !["png", "jpg", "jpeg", "webp", "gif"].includes(heroExt);
      const imageBuffer = needsConversion
        ? await sharp(rawImageBuffer).png().toBuffer()
        : rawImageBuffer;
      const heroMime = needsConversion ? "image/png" : (heroExt === "jpg" ? "image/jpeg" : `image/${heroExt}`);
      const heroFilename = needsConversion
        ? (aiConfig.photo.imagePath.split("/").pop()?.replace(/\.[^.]+$/, ".png") || "room.png")
        : (aiConfig.photo.imagePath.split("/").pop() || "room.webp");

      // If flashPostPass is configured, exclude its subcategories from main pass.
      // They stay in scopedSubcategoryIds so generation_rules_when_not_selected fire
      // (telling the AI to preserve those surfaces for the post-pass).
      let mainSelections = scopedSelections;
      if (resolvedPolicy.flashPostPass) {
        const isolatedSubs = new Set(resolvedPolicy.flashPostPass.isolateSubcategories);
        mainSelections = {};
        for (const [subId, optId] of Object.entries(scopedSelections)) {
          if (!isolatedSubs.has(subId)) mainSelections[subId] = optId;
        }
      }

      const resolveSwatchBuffer = createSwatchResolver(supabase);

      // Build prompt
      const { prompt, swatches } = await buildEditPrompt(
        mainSelections,
        optionLookup,
        spatialHints,
        scopedSubcategoryIds,
        sceneDescription,
        photoSpatialHint,
        resolveSwatchBuffer,
        resolvedPolicy.promptOverrides,
      );

      // Filter unsupported swatch formats
      const supportedSwatches = swatches.filter((s) => {
        const supported = ["image/jpeg", "image/png", "image/webp"];
        return supported.includes(s.mediaType);
      });

      const inputImages = [
        await toFile(imageBuffer, heroFilename, { type: heroMime }),
        ...await Promise.all(
          supportedSwatches.map((s) => {
            const ext = s.mediaType.split("/")[1] || "png";
            const filename = `${s.label.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
            return toFile(s.buffer, filename, { type: s.mediaType });
          })
        ),
      ];

      console.log(`[generate/photo] Sending ${inputImages.length} images to ${modelName} for photo ${stepPhotoId}`);

      const genStart = performance.now();
      try {
        const result = await openai.images.edit({
          model: modelName,
          image: inputImages,
          prompt,
          quality: "medium",
          size: "1536x1024",
          input_fidelity: "high",
        });

        const generatedData = result.data?.[0];
        if (!generatedData?.b64_json) {
          throw new Error("No image was generated");
        }

        const durationMs = Math.round(performance.now() - genStart);
        console.log(`[generate/photo] Main pass complete for ${stepPhotoId} in ${durationMs}ms`);

        return { b64: generatedData.b64_json, prompt, durationMs };
      } catch (err) {
        const durationMs = Math.round(performance.now() - genStart);
        await captureAiError(sessionId, {
          provider: "openai",
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

    // --- Step 2: Second pass / oven refinement (conditional, gets its own 120s) ---
    let finalB64 = firstPass.b64;
    let finalPrompt = firstPass.prompt;
    let openaiPasses = 1;
    let totalDurationMs = firstPass.durationMs;

    if (resolvedPolicy.secondPass) {
      const secondPass = await step.run("refine", async () => {
        const outputBuffer = Buffer.from(firstPass.b64, "base64");
        const secondPassInput = [
          await toFile(outputBuffer, "first-pass.png", { type: "image/png" }),
        ];

        console.log(
          `[generate/photo] Running second pass (${resolvedPolicy.secondPass!.reason}) for photo ${stepPhotoId}`,
        );

        const genStart = performance.now();
        try {
          const secondPassResult = await openai.images.edit({
            model: modelName,
            image: secondPassInput,
            prompt: resolvedPolicy.secondPass!.prompt,
            quality: "medium",
            size: "1536x1024",
            input_fidelity: resolvedPolicy.secondPass!.inputFidelity,
          });

          const secondPassData = secondPassResult.data?.[0];
          const durationMs = Math.round(performance.now() - genStart);

          if (secondPassData?.b64_json) {
            console.log(`[generate/photo] Second pass complete for ${stepPhotoId} in ${durationMs}ms`);
            return { b64: secondPassData.b64_json, durationMs, success: true as const };
          }

          console.warn(`[generate/photo] Second pass produced no image for ${stepPhotoId}; keeping first-pass output.`);
          return { b64: null, durationMs, success: false as const };
        } catch (err) {
          const durationMs = Math.round(performance.now() - genStart);
          console.warn(`[generate/photo] Second pass failed for ${stepPhotoId}; keeping first-pass output.`, err);
          return { b64: null, durationMs, success: false as const };
        }
      });

      totalDurationMs += secondPass.durationMs;
      if (secondPass.success && secondPass.b64) {
        finalB64 = secondPass.b64;
        finalPrompt = `${firstPass.prompt}\n\nSECOND_PASS (${resolvedPolicy.secondPass.reason}):\n${resolvedPolicy.secondPass.prompt}`;
        openaiPasses += 1;
      }
    }

    // --- Step 3: Flash post-pass for isolated surfaces (conditional, gets its own 120s) ---
    let flashPostPassResult: { b64: string; prompt: string; durationMs: number } | null = null;

    if (resolvedPolicy.flashPostPass) {
      flashPostPassResult = await step.run("flash-post-pass", async () => {
        const supabase = getServiceClient();
        const optionLookup = await getOptionLookup(orgId);

        // Build a minimal prompt for the post-pass — only what Flash needs to change the surface.
        // The full buildEditPrompt sends scene context, spatial hints, PRESERVE rules, etc.
        // that cause Flash to hallucinate objects (e.g. adding a fridge to an empty alcove).
        const isolatedSubs = new Set(resolvedPolicy.flashPostPass!.isolateSubcategories);
        const resolveSwatchBuffer = createSwatchResolver(supabase);

        const swatches: Array<{ buffer: Buffer; mediaType: string }> = [];
        const lines: string[] = [];
        const rules: string[] = [];
        let swatchIdx = 1;

        for (const [subId, optId] of Object.entries(scopedSelections)) {
          if (!isolatedSubs.has(subId)) continue;
          const entry = optionLookup.get(`${subId}:${optId}`);
          if (!entry) continue;
          const { option, subCategory } = entry;

          // Collect generation rules from subcategory + option
          for (const r of subCategory.generationRules ?? []) rules.push(r);
          for (const r of option.generationRules ?? []) rules.push(r);

          const hint = spatialHints[subId];
          const target = hint ? `${subCategory.name} → apply to ${hint}` : subCategory.name;
          const dimSuffix = option.dimensions?.trim() ? `; dimensions: ${option.dimensions.trim()}` : "";

          if (option.swatchUrl) {
            const resolved = await resolveSwatchBuffer(option.swatchUrl);
            if (resolved) {
              swatches.push(resolved);
              lines.push(`${swatchIdx}. ${target}${dimSuffix} (use swatch #${swatchIdx})`);
              swatchIdx += 1;
              continue;
            }
          }
          // Fallback: no swatch
          const hex = option.swatchColor?.trim();
          if (hex) {
            lines.push(`${swatchIdx}. ${target} (no swatch; target color ${hex})`);
          } else {
            lines.push(`${swatchIdx}. ${target}: ${option.name} (no swatch; follow text)`);
          }
          swatchIdx += 1;
        }

        // Guard: if no lines were produced, the post-pass has nothing to do.
        // Return null to fall back to the main pass output rather than sending an empty prompt.
        if (lines.length === 0) {
          console.warn(`[generate/photo] Flash post-pass skipped for ${stepPhotoId}: no isolated selections resolved`);
          return null;
        }

        const rulesBlock = rules.length > 0
          ? `\n\nRULES:\n${rules.map(r => `- ${r}`).join("\n")}`
          : "";

        const prompt = `Edit this room photo. Change ONLY the surface(s) listed below. Do not alter anything else in the image — no objects, appliances, fixtures, alcoves, or other surfaces.

${lines.join("\n")}

Swatch mapping: after the room photo, attached swatches are ordered #1..#${swatches.length}.
Match each swatch's color, pattern, and texture EXACTLY on its specified surface.${rulesBlock}`;

        // Build multimodal parts for Gemini: previous output + swatches + prompt
        const prevOutputBuffer = Buffer.from(finalB64, "base64");
        const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [
          { text: prompt },
          { inlineData: { mimeType: "image/png", data: prevOutputBuffer.toString("base64") } },
        ];
        for (const swatch of swatches) {
          parts.push({ inlineData: { mimeType: swatch.mediaType, data: swatch.buffer.toString("base64") } });
        }

        const postPassModel = resolvedPolicy.flashPostPass!.model;
        const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!googleApiKey) throw new Error("Missing GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY for flash post-pass");

        // Lazy import — @google/genai is a devDependency, only loaded when post-pass is needed
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: googleApiKey });

        console.log(
          `[generate/photo] Flash post-pass: sending ${swatches.length + 1} images to ${postPassModel} for photo ${stepPhotoId} (isolated: ${lines.length} surface(s))`,
        );

        const genStart = performance.now();
        try {
          const response = await ai.models.generateContent({
            model: postPassModel,
            contents: [{ role: "user", parts }],
            config: {
              responseModalities: ["TEXT", "IMAGE"],
              imageConfig: { aspectRatio: "3:2", imageSize: "2K" },
            },
          });
          const durationMs = Math.round(performance.now() - genStart);

          const candidate = response.candidates?.[0];
          if (!candidate?.content?.parts) throw new Error("No response from flash post-pass model");

          let imageB64: string | null = null;
          for (const part of candidate.content.parts) {
            if ((part as any).inlineData) {
              imageB64 = (part as any).inlineData.data;
              break;
            }
          }
          if (!imageB64) throw new Error("Flash post-pass model returned no image");

          // Resize to match OpenAI main pass output (1536x1024) — Flash may return different dimensions
          const resized = await sharp(Buffer.from(imageB64, "base64"))
            .resize(1536, 1024, { fit: "fill" })
            .png()
            .toBuffer();

          console.log(`[generate/photo] Flash post-pass complete for ${stepPhotoId} in ${durationMs}ms`);
          return { b64: resized.toString("base64"), prompt, durationMs };
        } catch (err) {
          const durationMs = Math.round(performance.now() - genStart);
          await captureAiError(sessionId, {
            provider: "google",
            model: postPassModel,
            route: "/api/generate/photo",
            duration_ms: durationMs,
            error: err,
            orgId,
            orgSlug,
            floorplanSlug,
          });
          // Fall back to previous output rather than killing the whole generation
          console.warn(`[generate/photo] Flash post-pass failed for ${stepPhotoId}; keeping previous output.`, err);
          return null;
        }
      });

      if (flashPostPassResult) {
        finalB64 = flashPostPassResult.b64;
        totalDurationMs += flashPostPassResult.durationMs;
      }
    }

    // --- Step 4: Upload to storage + persist to DB ---
    await step.run("persist", async () => {
      const supabase = getServiceClient();
      const outputBuffer = Buffer.from(finalB64, "base64");
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

      // Build full prompt log
      let promptLog = finalPrompt;
      if (flashPostPassResult) {
        promptLog = `${promptLog}\n\nFLASH_POST_PASS (${resolvedPolicy.flashPostPass!.reason}, ${resolvedPolicy.flashPostPass!.model}):\n${flashPostPassResult.prompt}`;
      }

      const { error: upsertError } = await supabase
        .from("generated_images")
        .upsert({
          selections_hash: selectionsHash,
          selections_json: selectionsJsonForClaim,
          image_path: outputPath,
          prompt: promptLog,
          step_id: stepId,
          step_photo_id: stepPhotoId,
          buyer_session_id: sessionId,
          selections_fingerprint: selectionsFingerprint,
          model: modelName,
          org_id: orgId,
          scoped_edit_depth: 0,
          leave_one_out_hashes: leaveOneOutHashes,
        }, { onConflict: "selections_hash" });

      if (upsertError) {
        console.error("[generate/photo] DB upsert failed:", upsertError);
      }

      const totalPasses = openaiPasses + (flashPostPassResult ? 1 : 0);

      await captureAiEvent(sessionId, {
        provider: "openai",
        model: modelName,
        route: "/api/generate/photo",
        duration_ms: totalDurationMs,
        cost_usd: estimateOpenAICost(modelName, openaiPasses)
          + (flashPostPassResult ? estimateGeminiImageCost(resolvedPolicy.flashPostPass!.model) : 0),
        orgId,
        orgSlug,
        floorplanSlug,
        image_size: "1536x1024",
        image_quality: "medium",
        second_pass: openaiPasses > 1,
        flash_post_pass: !!flashPostPassResult,
        flash_post_pass_model: flashPostPassResult ? resolvedPolicy.flashPostPass!.model : undefined,
      });

      console.log(`[generate/photo] Completed for photo ${stepPhotoId} in ${totalDurationMs}ms (${totalPasses} pass${totalPasses > 1 ? "es" : ""}${flashPostPassResult ? ", with flash post-pass" : ""})`);
    });
  },
);
