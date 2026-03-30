import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { GoogleGenAI } from "@google/genai";
import { inngest } from "@/inngest/client";
import { buildEditPrompt, identifyChangedSubcategory, resolveLinkedOptions, hashSelections, GENERATION_CACHE_VERSION } from "@/lib/generate";
import type { SwatchBufferResolver } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getOptionLookup, findSingleSurfaceDiffMatch, findPassCacheHit, upsertPassCache } from "@/lib/db-queries";
import { captureAiEvent, captureAiError, estimateOpenAICost, estimateGeminiImageCost } from "@/lib/posthog-server";
import { ISOLATION_IMAGE_MODEL } from "@/lib/models";
import type { PassDefinition } from "@/lib/pass-definitions";
import type { Option, SubCategory } from "@/types";

const openai = new OpenAI();

// ---------------------------------------------------------------------------
// Shared helpers (same as generate-photo.ts)
// ---------------------------------------------------------------------------

function createSwatchResolver(supabase: ReturnType<typeof getServiceClient>): SwatchBufferResolver {
  return async (swatchUrl: string) => {
    let storagePath = swatchUrl;
    if (swatchUrl.startsWith("http")) {
      const match = swatchUrl.match(/\/object\/public\/swatches\/(.+)$/);
      if (match) storagePath = match[1];
      else return null;
    }
    if (storagePath.startsWith("/swatches/")) storagePath = storagePath.slice("/swatches/".length);
    const { data, error } = await supabase.storage.from("swatches").download(storagePath);
    if (error || !data) return null;
    const rawBuffer = Buffer.from(await data.arrayBuffer());
    const ext = storagePath.split(".").pop()?.toLowerCase() || "png";
    if (ext === "svg" || ext === "svgz") {
      return { buffer: await sharp(rawBuffer).png().toBuffer(), mediaType: "image/png" };
    }
    return { buffer: rawBuffer, mediaType: ext === "jpg" ? "image/jpeg" : `image/${ext}` };
  };
}

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
  const results = await Promise.all(urlList.map(url => resolver(url).catch(() => null)));
  const cache = new Map<string, { buffer: Buffer; mediaType: string } | null>();
  for (let i = 0; i < urlList.length; i++) cache.set(urlList[i], results[i]);
  return async (url: string) => cache.get(url) ?? null;
}

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

async function downloadIntermediate(
  supabase: ReturnType<typeof getServiceClient>,
  path: string,
): Promise<Buffer> {
  const { data, error } = await supabase.storage.from("generated-images").download(path);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

async function toJpeg(pngBuffer: Buffer): Promise<Buffer> {
  return sharp(pngBuffer).jpeg({ quality: 90 }).toBuffer();
}

// ---------------------------------------------------------------------------
// Generation helpers
// ---------------------------------------------------------------------------

async function generateOpenAI(
  imageBuffer: Buffer,
  imageMime: string,
  imageFilename: string,
  prompt: string,
  swatches: Array<{ buffer: Buffer; mediaType: string; label: string }>,
  modelName: string,
): Promise<{ imageBuffer: Buffer; durationMs: number }> {
  const supportedSwatches = swatches.filter(s =>
    ["image/jpeg", "image/png", "image/webp"].includes(s.mediaType),
  );
  const inputImages = [
    await toFile(imageBuffer, imageFilename, { type: imageMime }),
    ...await Promise.all(
      supportedSwatches.map(s => {
        const ext = s.mediaType.split("/")[1] || "png";
        const filename = `${s.label.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
        return toFile(s.buffer, filename, { type: s.mediaType });
      }),
    ),
  ];
  const start = performance.now();
  const result = await openai.images.edit({
    model: modelName,
    image: inputImages,
    prompt,
    quality: "medium",
    size: "1536x1024",
    input_fidelity: "high",
  });
  const durationMs = Math.round(performance.now() - start);
  const data = result.data?.[0];
  if (!data?.b64_json) throw new Error("No image from OpenAI");
  return { imageBuffer: Buffer.from(data.b64_json, "base64"), durationMs };
}

async function generateGemini(
  imageBuffer: Buffer,
  prompt: string,
  swatches: Array<{ buffer: Buffer; mediaType: string }>,
  modelName: string,
): Promise<{ imageBuffer: Buffer; durationMs: number }> {
  const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!googleApiKey) throw new Error("Missing Google API key for Gemini pass");
  const ai = new GoogleGenAI({ apiKey: googleApiKey });

  const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [
    { text: prompt },
    { inlineData: { mimeType: "image/jpeg", data: imageBuffer.toString("base64") } },
  ];
  for (const swatch of swatches) {
    parts.push({ inlineData: { mimeType: swatch.mediaType, data: swatch.buffer.toString("base64") } });
  }

  const start = performance.now();
  const response = await ai.models.generateContent({
    model: modelName,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "3:2", imageSize: "2K" },
    },
  });
  const durationMs = Math.round(performance.now() - start);

  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) throw new Error("No response from Gemini");
  for (const part of candidate.content.parts) {
    if ((part as any).inlineData) {
      const rawBuffer = Buffer.from((part as any).inlineData.data, "base64");
      const resized = await sharp(rawBuffer).resize(1536, 1024, { fit: "fill" }).jpeg({ quality: 90 }).toBuffer();
      return { imageBuffer: resized, durationMs };
    }
  }
  throw new Error("No image in Gemini response");
}

// ---------------------------------------------------------------------------
// Prompt builders per pass style
// ---------------------------------------------------------------------------

function buildGeminiSpecialtyPrompt(
  entries: Array<{ subId: string; option: Option; subCategory: SubCategory }>,
  spatialHints: Record<string, string>,
  scopedSubcategoryIds: string[],
  selections: Record<string, string>,
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
  swatchResults: Array<{ buffer: Buffer; mediaType: string } | null>,
): { prompt: string; swatches: Array<{ buffer: Buffer; mediaType: string }> } {
  const swatches: Array<{ buffer: Buffer; mediaType: string }> = [];
  const lines: string[] = [];
  const rules: string[] = [];
  let swIdx = 1;

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
      lines.push(`${swIdx}. ${target}${dimSuffix} (use swatch #${swIdx})`);
      swIdx += 1;
    }
  }

  // Negative guards for specialty scope
  const subCategoryById = new Map<string, SubCategory>();
  for (const [, { subCategory }] of optionLookup) {
    if (!subCategoryById.has(subCategory.id)) subCategoryById.set(subCategory.id, subCategory);
  }
  for (const subId of scopedSubcategoryIds) {
    if (subId in selections) continue;
    const sub = subCategoryById.get(subId);
    if (sub?.generationRulesWhenNotSelected?.length) {
      for (const r of sub.generationRulesWhenNotSelected) rules.push(r);
    }
  }

  const rulesBlock = rules.length > 0 ? `\n\nRULES:\n${rules.map(r => `- ${r}`).join("\n")}` : "";

  const prompt = `Edit this room photo. Change ONLY the surface(s) listed below. Every other pixel in the image must remain identical — do not add, remove, or alter any objects, appliances, fixtures, shelves, pantry contents, doorways, alcoves, or other surfaces. Do not change cabinet colors, countertops, flooring, wall paint, or any surface not listed below.

${lines.join("\n")}

Swatch mapping: after the room photo, attached swatches are ordered #1..#${swatches.length}.
Match each swatch's color, pattern, and texture EXACTLY on its specified surface.
Do NOT extend tile below the countertop or beyond the backsplash zone.${rulesBlock}`;

  return { prompt, swatches };
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export const generatePhotoMultipass = inngest.createFunction(
  {
    id: "generate-photo-multipass",
    retries: 2,
    concurrency: { limit: 5 },
  },
  { event: "photo/generate.requested" },
  async ({ event, step }) => {
    const {
      selectionsHash, selectionsFingerprint, orgId, orgSlug, floorplanSlug,
      stepPhotoId, stepId, sessionId, scopedSelections, scopedSubcategoryIds,
      modelName, resolvedPolicy, sceneDescription, spatialHints, photoSpatialHint,
      selectionsJsonForClaim, leaveOneOutHashes, heroImagePath, passDefinitions,
    } = event.data;

    // Guard: only run if passDefinitions are present (multi-pass dispatch)
    if (!passDefinitions || passDefinitions.length === 0) return;

    const outputPath = `${orgId}/${selectionsHash}.jpg`;
    const MAX_SCOPED_EDIT_DEPTH = 3;

    // --- Step: Plan — determine execution path ---
    const plan = await step.run("plan", async () => {
      // Layer 2: check scoped +1 edit on final image (existing leave-one-out)
      // Skip for specialty surfaces (backsplash) — they should re-run from the pass cache
      // via Layer 3 so Flash handles them, not 1.5.
      const diffMatch = await findSingleSurfaceDiffMatch(stepPhotoId, leaveOneOutHashes, MAX_SCOPED_EDIT_DEPTH);
      if (diffMatch) {
        const changedSub = identifyChangedSubcategory(diffMatch.selectionsJson, scopedSelections);
        const isApplianceAddRemove = changedSub && (
          changedSub.oldOptionId.endsWith("-none") || changedSub.newOptionId.endsWith("-none")
        );
        const isSpecialtySurface = changedSub && (passDefinitions as PassDefinition[]).some(
          p => p.promptStyle === "gemini" && p.subcategoryIds.includes(changedSub.subcategoryId),
        );
        if (changedSub && !isApplianceAddRemove && !isSpecialtySurface) {
          return {
            type: "scoped-edit" as const,
            baseImagePath: diffMatch.imagePath,
            baseDepth: diffMatch.depth,
            changedSubcategoryId: changedSub.subcategoryId,
            changedNewOptionId: changedSub.newOptionId,
          };
        }
      }

      // Layer 3: check pass cache — find the first pass that misses
      const passHashes = event.data.passHashes!;
      let startFromPass = 0;
      let startImagePath = heroImagePath;

      for (let i = 0; i < passHashes.length; i++) {
        const { passName, passHash, upstreamHash } = passHashes[i];
        const cached = await findPassCacheHit(stepPhotoId, passName, passHash, upstreamHash);
        if (cached) {
          startFromPass = i + 1;
          startImagePath = cached;
        } else {
          break;
        }
      }

      return {
        type: "multi-pass" as const,
        startFromPass,
        startImagePath,
      };
    });

    let totalDurationMs = 0;
    let currentPath: string;
    let isScopedEdit = false;
    let scopedEditDepth = 0;

    // --- Scoped edit path (Layer 2 hit) ---
    if (plan.type === "scoped-edit") {
      isScopedEdit = true;
      scopedEditDepth = plan.baseDepth + 1;

      const scopedResult = await step.run("scoped-edit", async () => {
        const supabase = getServiceClient();
        const [optionLookup, baseImageResult] = await Promise.all([
          getOptionLookup(orgId),
          supabase.storage.from("generated-images").download(plan.baseImagePath),
        ]);
        const { data: baseData, error: dlErr } = baseImageResult;
        if (dlErr || !baseData) throw new Error(`Failed to download base image: ${dlErr?.message}`);
        const baseBuffer = Buffer.from(await baseData.arrayBuffer());

        const { buildScopedEditPrompt } = await import("@/lib/generate");
        const { prompt, swatches } = await buildScopedEditPrompt(
          plan.changedSubcategoryId, plan.changedNewOptionId,
          scopedSelections, optionLookup, spatialHints, scopedSubcategoryIds,
          sceneDescription, photoSpatialHint, createSwatchResolver(supabase), resolvedPolicy.promptOverrides,
        );

        // Use Flash for scoped edits — 1.5 destroys specialty surfaces (herringbone
        // backsplash, picket tiles) that were applied by the Flash specialty pass.
        // Flash preserves them while making the single-surface change. R&D confirmed
        // across oven, countertop, cabinets, paint, and flooring scoped edits.
        const flashSwatches = swatches.map(s => ({ buffer: s.buffer, mediaType: s.mediaType }));
        let result: { imageBuffer: Buffer; durationMs: number };
        try {
          result = await generateGemini(baseBuffer, prompt, flashSwatches, ISOLATION_IMAGE_MODEL);
        } catch (err) {
          await captureAiError(sessionId, {
            provider: "google", model: ISOLATION_IMAGE_MODEL, route: "/api/generate/photo",
            duration_ms: 0, error: err, orgId, orgSlug, floorplanSlug,
          });
          throw err;
        }
        const intermediatePath = `${orgId}/${selectionsHash}_scoped.jpg`;
        await uploadIntermediate(supabase, await toJpeg(result.imageBuffer), intermediatePath);

        console.log(`[multipass] Flash scoped edit for ${stepPhotoId}: ${plan.changedSubcategoryId} in ${result.durationMs}ms`);
        return { path: intermediatePath, durationMs: result.durationMs, prompt };
      });

      currentPath = scopedResult.path;
      totalDurationMs = scopedResult.durationMs;
    } else {
      // --- Multi-pass path (Layer 3/4) ---
      currentPath = plan.startImagePath;
      const passes = passDefinitions as PassDefinition[];
      const passHashes = event.data.passHashes!;

      for (let i = plan.startFromPass; i < passes.length; i++) {
        const pass = passes[i];
        const ph = passHashes[i];

        const passResult = await step.run(`pass-${pass.name}`, async () => {
          const supabase = getServiceClient();
          const baseResolver = createSwatchResolver(supabase);

          // Filter selections to this pass's subcategories
          const passSelections: Record<string, string> = {};
          for (const subId of pass.subcategoryIds) {
            if (subId in scopedSelections) passSelections[subId] = scopedSelections[subId];
          }

          if (Object.keys(passSelections).length === 0) {
            return { path: currentPath, durationMs: 0, skipped: true };
          }

          // Parallel: optionLookup + input image + swatch pre-warm
          const optionLookupP = getOptionLookup(orgId).then(ol => {
            // Strip exclusion rules for merged linked subcategories (same as generate-photo.ts)
            for (const subId of scopedSubcategoryIds) {
              if (subId in passSelections || subId in scopedSelections) continue;
              for (const [key, entry] of ol) {
                if (!key.startsWith(`${subId}:`)) continue;
                const linkedSub = entry.option.linkedToSubcategory;
                if (!linkedSub || !(linkedSub in passSelections)) continue;
                const sourceKey = `${linkedSub}:${passSelections[linkedSub]}`;
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

          const inputImageP = currentPath === heroImagePath
            ? supabase.storage.from("rooms").download(heroImagePath)
            : supabase.storage.from("generated-images").download(currentPath);

          const [optionLookup, inputResult, cachedResolver] = await Promise.all([
            optionLookupP,
            inputImageP,
            optionLookupP.then(ol => preWarmSwatchCache(passSelections, ol, baseResolver)),
          ]);

          const { data: inputData, error: inputErr } = inputResult;
          if (inputErr || !inputData) throw new Error(`Failed to download input image: ${inputErr?.message}`);

          const rawInputBuffer = Buffer.from(await inputData.arrayBuffer());
          // Convert non-standard formats for OpenAI
          let inputBuffer: Buffer;
          if (currentPath === heroImagePath) {
            const ext = heroImagePath.split(".").pop()?.toLowerCase() || "webp";
            if (!["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
              inputBuffer = await sharp(rawInputBuffer).png().toBuffer();
            } else {
              inputBuffer = rawInputBuffer;
            }
          } else {
            inputBuffer = rawInputBuffer;
          }

          const inputMime = currentPath.endsWith(".webp") ? "image/webp" :
            currentPath.endsWith(".png") ? "image/png" : "image/jpeg";
          const inputFilename = currentPath.split("/").pop() || "input.jpg";

          // Filter spatial hints to this pass's subcategories
          const passHints: Record<string, string> = {};
          for (const subId of pass.subcategoryIds) {
            if (subId in spatialHints) passHints[subId] = spatialHints[subId];
          }

          let result: { imageBuffer: Buffer; durationMs: number };

          if (pass.promptStyle === "openai") {
            // Pass full scopedSubcategoryIds (not just this pass's) so negative guards
            // fire for surfaces handled by other passes (e.g. "don't change backsplash")
            const { prompt, swatches } = await buildEditPrompt(
              passSelections, optionLookup, passHints, scopedSubcategoryIds,
              sceneDescription, photoSpatialHint, cachedResolver, resolvedPolicy.promptOverrides,
            );
            try {
              result = await generateOpenAI(inputBuffer, inputMime, inputFilename, prompt, swatches, pass.model);
            } catch (err) {
              await captureAiError(sessionId, {
                provider: "openai", model: pass.model, route: "/api/generate/photo",
                duration_ms: 0, error: err, orgId, orgSlug, floorplanSlug,
              });
              throw err; // Let Inngest retry
            }
          } else {
            // Gemini specialty pass — graceful degradation on failure
            // Resolve linked options (e.g. "Match to Main") before building prompt
            const specialtyHintsCopy = { ...passHints };
            resolveLinkedOptions(passSelections, optionLookup, specialtyHintsCopy);

            const entries: Array<{ subId: string; option: Option; subCategory: SubCategory }> = [];
            for (const [subId, optId] of Object.entries(passSelections)) {
              const entry = optionLookup.get(`${subId}:${optId}`);
              if (entry) entries.push({ subId, option: entry.option, subCategory: entry.subCategory });
            }
            const swatchResults = await Promise.all(
              entries.map(e => e.option.swatchUrl ? baseResolver(e.option.swatchUrl).catch(() => null) : Promise.resolve(null)),
            );
            const { prompt, swatches } = buildGeminiSpecialtyPrompt(
              entries, passHints, pass.subcategoryIds, scopedSelections, optionLookup, swatchResults,
            );
            if (swatches.length === 0) {
              return { path: currentPath, durationMs: 0, skipped: true };
            }
            try {
              result = await generateGemini(inputBuffer, prompt, swatches, pass.model);
            } catch (err) {
              await captureAiError(sessionId, {
                provider: "google", model: pass.model, route: "/api/generate/photo",
                duration_ms: 0, error: err, orgId, orgSlug, floorplanSlug,
              });
              // Fall back to previous pass output rather than failing the whole pipeline
              console.warn(`[multipass] ${pass.name} failed, keeping previous output.`, err);
              return { path: currentPath, durationMs: 0, skipped: true };
            }
          }

          const intermediatePath = `${orgId}/${selectionsHash}_${pass.name}.jpg`;
          await uploadIntermediate(supabase, await toJpeg(result.imageBuffer), intermediatePath);

          // Cache the intermediate
          await upsertPassCache({
            stepPhotoId, orgId,
            passName: ph.passName,
            passHash: ph.passHash,
            upstreamHash: ph.upstreamHash,
            model: pass.model,
            passSelectionsJson: passSelections,
            imagePath: intermediatePath,
          });

          console.log(`[multipass] ${pass.name} complete for ${stepPhotoId} in ${result.durationMs}ms`);
          return { path: intermediatePath, durationMs: result.durationMs, skipped: false };
        });

        currentPath = passResult.path;
        totalDurationMs += passResult.durationMs;
      }
    }

    // --- Persist: copy final to canonical path + write DB ---
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
          prompt: `multipass: ${(passDefinitions as PassDefinition[]).map(p => p.name).join(" → ")}`,
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
        console.error("[multipass] DB upsert failed:", upsertError);
      }

      const passes = passDefinitions as PassDefinition[];
      const openaiPasses = isScopedEdit ? 0 : passes.filter(p => p.promptStyle === "openai").length;
      const geminiPasses = isScopedEdit ? 1 : passes.filter(p => p.promptStyle === "gemini").length;
      const totalCost = isScopedEdit
        ? estimateGeminiImageCost(ISOLATION_IMAGE_MODEL)
        : estimateOpenAICost(modelName, openaiPasses)
          + passes.filter(p => p.promptStyle === "gemini").reduce((sum, p) => sum + estimateGeminiImageCost(p.model), 0);

      await captureAiEvent(sessionId, {
        provider: isScopedEdit ? "google" : "openai",
        model: isScopedEdit ? ISOLATION_IMAGE_MODEL : modelName,
        route: "/api/generate/photo",
        duration_ms: totalDurationMs,
        cost_usd: totalCost,
        orgId, orgSlug, floorplanSlug,
        image_size: "1536x1024",
        image_quality: "medium",
        scoped_edit: isScopedEdit,
        scoped_edit_depth: isScopedEdit ? scopedEditDepth : undefined,
        multi_pass: true,
        multi_pass_count: openaiPasses + geminiPasses,
      });

      console.log(`[multipass] Complete for ${stepPhotoId} in ${totalDurationMs}ms (${openaiPasses + geminiPasses} passes${isScopedEdit ? ", scoped edit" : ""})`);
    });
  },
);
