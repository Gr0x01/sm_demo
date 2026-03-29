import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { GoogleGenAI } from "@google/genai";
import { inngest } from "@/inngest/client";
import { buildEditPrompt, buildScopedEditPrompt, identifyChangedSubcategory, resolveLinkedOptions } from "@/lib/generate";
import type { SwatchBufferResolver } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getStepPhotoAiConfig, getOptionLookup, findSingleSurfaceDiffMatch } from "@/lib/db-queries";
import { captureAiEvent, captureAiError, estimateOpenAICost, estimateGeminiImageCost } from "@/lib/posthog-server";
import type { Option, SubCategory } from "@/types";

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

/**
 * Pre-download all swatch images in parallel and return a cached resolver.
 * The returned resolver serves from memory — no network I/O.
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
    urlList.map(url => resolver(url).catch(() => null)),
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
 * Convert a raw PNG buffer (from OpenAI b64) to JPEG for smaller storage/transfer.
 * Quality 90 is visually indistinguishable for AI-generated room photos.
 */
async function toJpeg(pngBuffer: Buffer): Promise<Buffer> {
  return sharp(pngBuffer).jpeg({ quality: 90 }).toBuffer();
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
    } = event.data;

    const MAX_SCOPED_EDIT_DEPTH = 3;
    const outputPath = `${orgId}/${selectionsHash}.jpg`;

    // --- Step 0: Check for single-surface diff match (partial cache) ---
    const diffMatch = await step.run("check-diff-cache", async () => {
      return findSingleSurfaceDiffMatch(stepPhotoId, leaveOneOutHashes, MAX_SCOPED_EDIT_DEPTH);
    });

    if (diffMatch) {
      const changedSub = identifyChangedSubcategory(diffMatch.selectionsJson, scopedSelections);

      if (changedSub) {
        // --- Scoped edit: change only the differing surface ---
        // Generates and uploads to storage in one step (no b64 in step output)
        const scopedResult = await step.run("scoped-edit", async () => {
          const supabase = getServiceClient();

          // Parallel: option lookup + base image download
          const [optionLookup, baseImageResult] = await Promise.all([
            getOptionLookup(orgId),
            supabase.storage.from("generated-images").download(diffMatch.imagePath),
          ]);
          const { data: baseImageData, error: dlErr } = baseImageResult;
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

          const supportedSwatches = swatches.filter(s =>
            ["image/jpeg", "image/png", "image/webp"].includes(s.mediaType),
          );

          const inputImages = [
            await toFile(baseBuffer, "base.jpg", { type: "image/jpeg" }),
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

            // Convert PNG → JPEG and upload — don't return b64 through Inngest
            await uploadIntermediate(supabase, await toJpeg(Buffer.from(generatedData.b64_json, "base64")), outputPath);

            console.log(`[generate/photo] Scoped edit complete for ${stepPhotoId} in ${durationMs}ms`);
            return { prompt, durationMs };
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

        // --- Persist scoped edit to DB ---
        await step.run("persist-scoped", async () => {
          const supabase = getServiceClient();

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
    // Generates image and uploads to storage. Returns only metadata (no b64).
    const firstPass = await step.run("generate", async () => {
      const supabase = getServiceClient();

      // Phase 1: Parallel DB queries
      const [aiConfig, optionLookup] = await Promise.all([
        getStepPhotoAiConfig(stepPhotoId),
        getOptionLookup(orgId),
      ]);
      if (!aiConfig) throw new Error(`Step photo ${stepPhotoId} not found`);

      // If flashPostPass is configured, exclude its subcategories from main pass.
      let mainSelections = scopedSelections;
      if (resolvedPolicy.flashPostPass) {
        const isolatedSubs = new Set(resolvedPolicy.flashPostPass.isolateSubcategories);
        mainSelections = {};
        for (const [subId, optId] of Object.entries(scopedSelections)) {
          if (!isolatedSubs.has(subId)) mainSelections[subId] = optId;
        }
      }

      const baseResolver = createSwatchResolver(supabase);

      // Phase 2: Parallel — hero image download + swatch pre-warm
      const [heroResult, cachedResolver] = await Promise.all([
        supabase.storage.from("rooms").download(aiConfig.photo.imagePath),
        preWarmSwatchCache(mainSelections, optionLookup, baseResolver),
      ]);

      const { data: imageData, error: downloadErr } = heroResult;
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

      const { prompt, swatches } = await buildEditPrompt(
        mainSelections,
        optionLookup,
        spatialHints,
        scopedSubcategoryIds,
        sceneDescription,
        photoSpatialHint,
        cachedResolver,
        resolvedPolicy.promptOverrides,
      );

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

        // Convert PNG → JPEG (10x smaller) and upload — don't return b64 through Inngest
        await uploadIntermediate(supabase, await toJpeg(Buffer.from(generatedData.b64_json, "base64")), outputPath);

        console.log(`[generate/photo] Main pass complete for ${stepPhotoId} in ${durationMs}ms`);
        return { prompt, durationMs };
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
    let finalPrompt = firstPass.prompt;
    let openaiPasses = 1;
    let totalDurationMs = firstPass.durationMs;

    if (resolvedPolicy.secondPass) {
      const secondPass = await step.run("refine", async () => {
        const supabase = getServiceClient();
        const prevBuffer = await downloadIntermediate(supabase, outputPath);
        const secondPassInput = [
          await toFile(prevBuffer, "first-pass.jpg", { type: "image/jpeg" }),
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
            await uploadIntermediate(supabase, await toJpeg(Buffer.from(secondPassData.b64_json, "base64")), outputPath);
            console.log(`[generate/photo] Second pass complete for ${stepPhotoId} in ${durationMs}ms`);
            return { durationMs, success: true as const };
          }

          console.warn(`[generate/photo] Second pass produced no image for ${stepPhotoId}; keeping first-pass output.`);
          return { durationMs, success: false as const };
        } catch (err) {
          const durationMs = Math.round(performance.now() - genStart);
          console.warn(`[generate/photo] Second pass failed for ${stepPhotoId}; keeping first-pass output.`, err);
          return { durationMs, success: false as const };
        }
      });

      totalDurationMs += secondPass.durationMs;
      if (secondPass.success) {
        finalPrompt = `${firstPass.prompt}\n\nSECOND_PASS (${resolvedPolicy.secondPass.reason}):\n${resolvedPolicy.secondPass.prompt}`;
        openaiPasses += 1;
      }
    }

    // --- Step 3: Flash post-pass for isolated surfaces (conditional, gets its own 120s) ---
    let flashPostPassResult: { prompt: string; durationMs: number } | null = null;

    if (resolvedPolicy.flashPostPass) {
      flashPostPassResult = await step.run("flash-post-pass", async () => {
        const supabase = getServiceClient();
        const isolatedSubs = new Set(resolvedPolicy.flashPostPass!.isolateSubcategories);
        const baseResolver = createSwatchResolver(supabase);

        // Phase 1: Parallel — option lookup + previous output download
        const [optionLookup, prevOutputBuffer] = await Promise.all([
          getOptionLookup(orgId),
          downloadIntermediate(supabase, outputPath),
        ]);

        // Identify isolated entries
        const entries: Array<{
          subId: string; optId: string;
          option: { swatchUrl?: string | null; swatchColor?: string | null; name: string; dimensions?: string | null; generationRules?: string[] | null };
          subCategory: { name: string; generationRules?: string[] | null };
        }> = [];
        for (const [subId, optId] of Object.entries(scopedSelections)) {
          if (!isolatedSubs.has(subId)) continue;
          const entry = optionLookup.get(`${subId}:${optId}`);
          if (!entry) continue;
          entries.push({ subId, optId, option: entry.option, subCategory: entry.subCategory });
        }

        if (entries.length === 0) {
          console.warn(`[generate/photo] Flash post-pass skipped for ${stepPhotoId}: no isolated selections resolved`);
          return null;
        }

        // Phase 2: Parallel — download all swatches at once
        const swatchResults = await Promise.all(
          entries.map(e => e.option.swatchUrl ? baseResolver(e.option.swatchUrl).catch(() => null) : Promise.resolve(null)),
        );

        // Phase 3: Build prompt (CPU only, no I/O)
        const swatches: Array<{ buffer: Buffer; mediaType: string }> = [];
        const lines: string[] = [];
        const rules: string[] = [];
        let swatchIdx = 1;

        for (let i = 0; i < entries.length; i++) {
          const { option, subCategory, subId } = entries[i];
          for (const r of subCategory.generationRules ?? []) rules.push(r);
          for (const r of option.generationRules ?? []) rules.push(r);

          const hint = spatialHints[subId];
          const target = hint ? `${subCategory.name} → apply to ${hint}` : subCategory.name;
          const dimSuffix = option.dimensions?.trim() ? `; dimensions: ${option.dimensions.trim()}` : "";

          const resolved = swatchResults[i];
          if (resolved) {
            swatches.push(resolved);
            lines.push(`${swatchIdx}. ${target}${dimSuffix} (use swatch #${swatchIdx})`);
            swatchIdx += 1;
          } else {
            const hex = option.swatchColor?.trim();
            if (hex) {
              lines.push(`${swatchIdx}. ${target} (no swatch; target color ${hex})`);
            } else {
              lines.push(`${swatchIdx}. ${target}: ${option.name} (no swatch; follow text)`);
            }
            swatchIdx += 1;
          }
        }

        const rulesBlock = rules.length > 0
          ? `\n\nRULES:\n${rules.map(r => `- ${r}`).join("\n")}`
          : "";

        const prompt = `Edit this room photo. Change ONLY the surface(s) listed below. Do not alter anything else in the image — no objects, appliances, fixtures, alcoves, or other surfaces.

${lines.join("\n")}

Swatch mapping: after the room photo, attached swatches are ordered #1..#${swatches.length}.
Match each swatch's color, pattern, and texture EXACTLY on its specified surface.${rulesBlock}`;

        const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: prevOutputBuffer.toString("base64") } },
        ];
        for (const swatch of swatches) {
          parts.push({ inlineData: { mimeType: swatch.mediaType, data: swatch.buffer.toString("base64") } });
        }

        const postPassModel = resolvedPolicy.flashPostPass!.model;
        const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!googleApiKey) throw new Error("Missing GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY for flash post-pass");

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

          // Resize to match OpenAI main pass output (1536x1024), JPEG for smaller transfer
          const resized = await sharp(Buffer.from(imageB64, "base64"))
            .resize(1536, 1024, { fit: "fill" })
            .jpeg({ quality: 90 })
            .toBuffer();

          // Upload to storage — overwrites the main pass output
          await uploadIntermediate(supabase, resized, outputPath);

          console.log(`[generate/photo] Flash post-pass complete for ${stepPhotoId} in ${durationMs}ms`);
          return { prompt, durationMs };
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
        totalDurationMs += flashPostPassResult.durationMs;
      }
    }

    // --- Step 3b: Pro refinement post-pass for cabinets + optionally backsplash (conditional) ---
    let proPostPassResult: { prompt: string; durationMs: number } | null = null;

    if (resolvedPolicy.proPostPass) {
      proPostPassResult = await step.run("pro-post-pass", async () => {
        const supabase = getServiceClient();
        const proSubs = new Set(resolvedPolicy.proPostPass!.subcategories);

        // Phase 1: Parallel — option lookup + previous output download
        const [optionLookup, prevOutputBuffer] = await Promise.all([
          getOptionLookup(orgId),
          downloadIntermediate(supabase, outputPath),
        ]);

        // Resolve linked options (e.g. "Match to Main" → merge into source when same swatch)
        // Copy spatialHints so we don't mutate the event data
        const postPassHints = { ...spatialHints };
        resolveLinkedOptions(scopedSelections, optionLookup, postPassHints);

        // Build selections for just the post-pass subcategories
        const postPassSelections: Record<string, string> = {};
        for (const [subId, optId] of Object.entries(scopedSelections)) {
          if (proSubs.has(subId)) postPassSelections[subId] = optId;
        }

        const baseResolver = createSwatchResolver(supabase);
        const cachedResolver = await preWarmSwatchCache(postPassSelections, optionLookup, baseResolver);

        const { prompt, swatches } = await buildEditPrompt(
          postPassSelections,
          optionLookup,
          postPassHints,
          [...proSubs],
          sceneDescription,
          photoSpatialHint,
          cachedResolver,
          resolvedPolicy.promptOverrides,
        );

        const supportedSwatches = swatches.filter(s =>
          ["image/jpeg", "image/png", "image/webp"].includes(s.mediaType),
        );

        if (supportedSwatches.length === 0) {
          console.warn(`[generate/photo] Pro post-pass skipped for ${stepPhotoId}: no swatches resolved`);
          return null;
        }

        // Build Gemini multimodal request
        const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: prevOutputBuffer.toString("base64") } },
        ];
        for (const swatch of supportedSwatches) {
          parts.push({ inlineData: { mimeType: swatch.mediaType, data: swatch.buffer.toString("base64") } });
        }

        const postPassModel = resolvedPolicy.proPostPass!.model;
        const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!googleApiKey) throw new Error("Missing GOOGLE_API_KEY for Pro post-pass");

        const ai = new GoogleGenAI({ apiKey: googleApiKey });

        console.log(
          `[generate/photo] Pro post-pass: sending ${supportedSwatches.length + 1} images to ${postPassModel} for photo ${stepPhotoId} (${[...proSubs].join(", ")})`,
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
          if (!candidate?.content?.parts) throw new Error("No response from Pro post-pass model");

          let imageB64: string | null = null;
          for (const part of candidate.content.parts) {
            if ((part as any).inlineData) {
              imageB64 = (part as any).inlineData.data;
              break;
            }
          }
          if (!imageB64) throw new Error("Pro post-pass model returned no image");

          const resized = await sharp(Buffer.from(imageB64, "base64"))
            .resize(1536, 1024, { fit: "fill" })
            .jpeg({ quality: 90 })
            .toBuffer();

          await uploadIntermediate(supabase, resized, outputPath);

          console.log(`[generate/photo] Pro post-pass complete for ${stepPhotoId} in ${durationMs}ms`);
          return { prompt, durationMs };
        } catch (err) {
          const durationMs = Math.round(performance.now() - genStart);
          await captureAiError(sessionId, {
            provider: "google",
            model: postPassModel,
            route: "/api/generate/photo",
            duration_ms: durationMs,
            error: err,
            orgId, orgSlug, floorplanSlug,
          });
          console.warn(`[generate/photo] Pro post-pass failed for ${stepPhotoId}; keeping previous output.`, err);
          return null;
        }
      });

      if (proPostPassResult) {
        totalDurationMs += proPostPassResult.durationMs;
      }
    }

    // --- Step 4: Persist to DB (image already in storage from previous steps) ---
    await step.run("persist", async () => {
      const supabase = getServiceClient();

      // Build full prompt log
      let promptLog = finalPrompt;
      if (flashPostPassResult) {
        promptLog = `${promptLog}\n\nFLASH_POST_PASS (${resolvedPolicy.flashPostPass!.reason}, ${resolvedPolicy.flashPostPass!.model}):\n${flashPostPassResult.prompt}`;
      }
      if (proPostPassResult) {
        promptLog = `${promptLog}\n\nPRO_POST_PASS (${resolvedPolicy.proPostPass!.reason}, ${resolvedPolicy.proPostPass!.model}):\n${proPostPassResult.prompt}`;
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

      const totalPasses = openaiPasses + (flashPostPassResult ? 1 : 0) + (proPostPassResult ? 1 : 0);

      await captureAiEvent(sessionId, {
        provider: "openai",
        model: modelName,
        route: "/api/generate/photo",
        duration_ms: totalDurationMs,
        cost_usd: estimateOpenAICost(modelName, openaiPasses)
          + (flashPostPassResult ? estimateGeminiImageCost(resolvedPolicy.flashPostPass!.model) : 0)
          + (proPostPassResult ? estimateGeminiImageCost(resolvedPolicy.proPostPass!.model) : 0),
        orgId,
        orgSlug,
        floorplanSlug,
        image_size: "1536x1024",
        image_quality: "medium",
        second_pass: openaiPasses > 1,
        flash_post_pass: !!flashPostPassResult,
        flash_post_pass_model: flashPostPassResult ? resolvedPolicy.flashPostPass!.model : undefined,
        pro_post_pass: !!proPostPassResult,
        pro_post_pass_model: proPostPassResult ? resolvedPolicy.proPostPass!.model : undefined,
      });

      const passLabels = [
        `${openaiPasses} OpenAI`,
        flashPostPassResult ? "flash post-pass" : null,
        proPostPassResult ? "pro post-pass" : null,
      ].filter(Boolean).join(", ");
      console.log(`[generate/photo] Completed for photo ${stepPhotoId} in ${totalDurationMs}ms (${totalPasses} passes: ${passLabels})`);
    });
  },
);
