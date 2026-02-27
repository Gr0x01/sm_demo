import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { inngest } from "@/inngest/client";
import { buildEditPrompt } from "@/lib/generate";
import type { SwatchBufferResolver } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getStepPhotoAiConfig, getOptionLookup } from "@/lib/db-queries";
import { captureAiEvent, estimateOpenAICost } from "@/lib/posthog-server";

const openai = new OpenAI();

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
    } = event.data;

    // --- Step 1: Prep + first-pass generation (up to 120s) ---
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

      const imageBuffer = Buffer.from(await imageData.arrayBuffer());
      const heroExt = aiConfig.photo.imagePath.split(".").pop()?.toLowerCase() || "webp";
      const heroMime = heroExt === "jpg" ? "image/jpeg" : `image/${heroExt}`;
      const heroFilename = aiConfig.photo.imagePath.split("/").pop() || "room.webp";

      // Swatch resolver
      const resolveSwatchBuffer: SwatchBufferResolver = async (swatchUrl: string) => {
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

      // Build prompt
      const { prompt, swatches } = await buildEditPrompt(
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
      const result = await openai.images.edit({
        model: modelName,
        image: inputImages,
        prompt,
        quality: "high",
        size: "1536x1024",
        input_fidelity: "high",
      });

      const generatedData = result.data?.[0];
      if (!generatedData?.b64_json) {
        throw new Error("No image was generated");
      }

      const durationMs = Math.round(performance.now() - genStart);
      console.log(`[generate/photo] First pass complete for ${stepPhotoId} in ${durationMs}ms`);

      return { b64: generatedData.b64_json, prompt, durationMs };
    });

    // --- Step 2: Second pass (conditional, gets its own 120s) ---
    let finalB64 = firstPass.b64;
    let finalPrompt = firstPass.prompt;
    let passes = 1;
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
            quality: "high",
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
        passes = 2;
      }
    }

    // --- Step 3: Upload to storage + persist to DB ---
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
        console.error("[generate/photo] DB upsert failed:", upsertError);
      }

      await captureAiEvent(sessionId, {
        provider: "openai",
        model: modelName,
        route: "/api/generate/photo",
        duration_ms: totalDurationMs,
        cost_usd: estimateOpenAICost(modelName, passes),
        orgId,
        orgSlug,
        floorplanSlug,
        image_size: "1536x1024",
        image_quality: "high",
        second_pass: passes > 1,
      });

      console.log(`[generate/photo] Completed for photo ${stepPhotoId} in ${totalDurationMs}ms (${passes} pass${passes > 1 ? "es" : ""})`);
    });
  },
);
