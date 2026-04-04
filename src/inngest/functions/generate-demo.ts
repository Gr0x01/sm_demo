import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { inngest } from "@/inngest/client";
import { buildBflEditPrompt, buildBflScopedEditPrompt, identifyChangedSubcategory } from "@/lib/generate";
import type { SwatchBufferResolver } from "@/lib/generate";
import { DEMO_SUBCATEGORIES } from "@/lib/demo-options";
import { DEMO_GENERATION_CACHE_VERSION, DEMO_ORG_ID } from "@/lib/demo-generate";
import { findDemoDiffMatch } from "@/lib/db-queries";
import { getServiceClient } from "@/lib/supabase";
import { captureAiEvent, captureAiError, estimateBflCost } from "@/lib/posthog-server";
import { IMAGE_MODEL, SCOPED_EDIT_MODEL } from "@/lib/models";
import { generateImage } from "@/lib/bfl";
import type { BflModel } from "@/lib/bfl";
import type { Option, SubCategory } from "@/types";

/** Fallback spatial hints when Gemini doesn't provide them */
const DEFAULT_SPATIAL_HINTS: Record<string, string> = {
  backsplash: "the wall strip between upper cabinets and countertop along the back wall, including the taller section behind the range hood",
  "counter-top": "the horizontal stone slab on top of the island and on top of the perimeter cabinets — horizontal surface only, not vertical faces",
  "kitchen-cabinet-color": "ALL perimeter/wall cabinet doors and drawer fronts — back wall uppers and lowers, side wall cabinets, and cabinets flanking the refrigerator and oven. The island is a SEPARATE selection — do not change it here",
  "island-cabinet-color": "the flat smooth vertical front panel of the island base (the freestanding structure in the foreground, below the countertop overhang). Apply as a smooth painted surface — no beadboard, no grooves, no vertical lines. Perimeter wall cabinets are a SEPARATE selection — do not change them here",
};

/** Build option lookup from hardcoded demo subcategories */
function buildDemoOptionLookup(): Map<string, { option: Option; subCategory: SubCategory }> {
  const map = new Map<string, { option: Option; subCategory: SubCategory }>();
  for (const sub of DEMO_SUBCATEGORIES) {
    for (const opt of sub.options) {
      map.set(`${sub.id}:${opt.id}`, { option: opt, subCategory: sub });
    }
  }
  return map;
}

/** Swatch resolver that reads from local public/ directory (works on Vercel — public/ is bundled) */
const resolveLocalSwatch: SwatchBufferResolver = async (swatchUrl: string) => {
  const swatchPath = path.join(process.cwd(), "public", swatchUrl);
  const ext = path.extname(swatchUrl).slice(1).toLowerCase();

  try {
    const rawBuffer = await readFile(swatchPath);

    if (ext === "svg" || ext === "svgz") {
      const pngBuffer = await sharp(rawBuffer).png().toBuffer();
      return { buffer: pngBuffer, mediaType: "image/png" };
    }

    const mediaType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    return { buffer: rawBuffer, mediaType };
  } catch {
    return null;
  }
};

export const generateDemo = inngest.createFunction(
  {
    id: "generate-demo",
    retries: 2,
    concurrency: { limit: 3 },
  },
  { event: "demo/generate.requested" },
  async ({ event, step }) => {
    const { combinedHash, photoHash, sessionId, effectiveSelections, sceneAnalysis, leaveOneOutHashes } = event.data;

    const MAX_SCOPED_EDIT_DEPTH = 3;
    const outputPath = `demo-${combinedHash}.jpg`;

    // --- Step 1: Diff cache check + full generation (merged to save a step transition) ---
    const generateResult = await step.run("generate", async () => {
      // Quick diff cache check (~100ms DB query, saves a full Inngest step transition)
      const diffMatch = await findDemoDiffMatch(photoHash, leaveOneOutHashes, MAX_SCOPED_EDIT_DEPTH, DEMO_GENERATION_CACHE_VERSION);
      if (diffMatch) {
        const changedSub = identifyChangedSubcategory(diffMatch.selectionsJson, effectiveSelections);
        const isApplianceAddRemove = changedSub && (
          changedSub.oldOptionId.endsWith("-none") || changedSub.newOptionId.endsWith("-none")
        );
        if (isApplianceAddRemove) {
          console.log(`[demo/generate] Skipping scoped edit: appliance add/remove (${changedSub!.subcategoryId} ${changedSub!.oldOptionId} → ${changedSub!.newOptionId})`);
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

      // Build option lookup + spatial hints + scene description (all sync/CPU)
      const optionLookup = buildDemoOptionLookup();

      const spatialHints: Record<string, string> = { ...DEFAULT_SPATIAL_HINTS };
      if (sceneAnalysis?.spatialHints) {
        for (const [key, hint] of Object.entries(sceneAnalysis.spatialHints)) {
          if (!hint?.trim()) continue;
          if (key === "kitchen-cabinet-color") {
            // Merge Gemini's cabinet locations with island separation rule
            spatialHints[key] = `${hint.trim()}. The island is a SEPARATE selection — do not change it here`;
          } else if (key === "island-cabinet-color") {
            spatialHints[key] = `${hint.trim()}. Perimeter wall cabinets are a SEPARATE selection — do not change them here`;
          } else {
            spatialHints[key] = hint;
          }
        }
      }
      const scopedSubcategoryIds = DEMO_SUBCATEGORIES.map(s => s.id);

      const sceneLines: string[] = [];
      if (sceneAnalysis?.sceneDescription?.trim()) {
        sceneLines.push(sceneAnalysis.sceneDescription.trim());
      }
      if (sceneAnalysis?.kitchenType) {
        sceneLines.push(`Kitchen type: ${sceneAnalysis.kitchenType}`);
      }
      if (sceneAnalysis?.cameraAngle) {
        sceneLines.push(`Camera angle: ${sceneAnalysis.cameraAngle}`);
      }
      if (sceneAnalysis?.visibleSurfaces) {
        const visible: string[] = [];
        if (sceneAnalysis.visibleSurfaces.backsplash !== false) visible.push("backsplash");
        if (sceneAnalysis.visibleSurfaces.countertop !== false) visible.push("countertop");
        if (sceneAnalysis.visibleSurfaces.cabinets !== false) visible.push("cabinets");
        if (sceneAnalysis.visibleSurfaces.island) visible.push("island");
        if (visible.length > 0) sceneLines.push(`Visible surfaces: ${visible.join(", ")}`);
      }
      const sceneDescription = sceneLines.length > 0 ? sceneLines.join(". ") : null;

      // Parallel: download user photo + build prompt (resolves local swatches)
      const [photoResult, promptResult] = await Promise.all([
        supabase.storage.from("demo-uploads").download(`${photoHash}.jpg`),
        buildBflEditPrompt(
          effectiveSelections, optionLookup, spatialHints, scopedSubcategoryIds,
          sceneDescription, null, resolveLocalSwatch,
        ),
      ]);

      const { data: photoData, error: downloadErr } = photoResult;
      if (downloadErr || !photoData) {
        throw new Error(`Failed to load demo photo: ${downloadErr?.message}`);
      }
      const photoBuffer = Buffer.from(await photoData.arrayBuffer());
      const { prompt, swatches } = promptResult;

      console.log(`[demo/generate] Sending ${swatches.length} swatches to ${IMAGE_MODEL}`);
      console.log(`[demo/generate] Swatch order: ${swatches.map((s, i) => `image ${i + 2}=${s.subcategoryId}`).join(", ")}`);
      console.log(`[demo/generate] Prompt:\n${prompt}`);

      const genStart = performance.now();
      try {
        const result = await generateImage({
          model: IMAGE_MODEL as BflModel,
          prompt,
          inputImage: photoBuffer,
          referenceImages: swatches.map(s => s.buffer),
        });

        // Upload to storage within this step
        const { error: uploadError } = await supabase.storage
          .from("demo-generated")
          .upload(outputPath, result.imageBuffer, { contentType: "image/jpeg", upsert: true });
        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

        const durationMs = Math.round(performance.now() - genStart);
        console.log(`[demo/generate] Generation complete in ${durationMs}ms`);

        return { type: "generated" as const, prompt, durationMs };
      } catch (err) {
        const durationMs = Math.round(performance.now() - genStart);
        await captureAiError("anonymous", {
          provider: "bfl",
          model: IMAGE_MODEL,
          route: "/api/try/generate",
          duration_ms: durationMs,
          error: err,
        });
        throw err;
      }
    });

    // --- Scoped edit path (diff cache hit) ---
    if (generateResult.type === "scoped-edit-needed") {
      const { imagePath: baseImagePath, depth, changedSubcategoryId, changedNewOptionId } = generateResult;

      const scopedResult = await step.run("scoped-edit", async () => {
        const supabase = getServiceClient();
        const optionLookup = buildDemoOptionLookup();

        // Download the base image (previously generated)
        const { data: baseImageData, error: dlErr } = await supabase.storage
          .from("demo-generated")
          .download(baseImagePath);
        if (dlErr || !baseImageData) throw new Error(`Failed to download base image: ${dlErr?.message}`);

        const baseBuffer = Buffer.from(await baseImageData.arrayBuffer());

        // Merge spatial hints (same logic as full gen path)
        const spatialHints: Record<string, string> = { ...DEFAULT_SPATIAL_HINTS };
        if (sceneAnalysis?.spatialHints) {
          for (const [key, hint] of Object.entries(sceneAnalysis.spatialHints)) {
            if (!hint?.trim()) continue;
            if (key === "kitchen-cabinet-color") {
              spatialHints[key] = `${hint.trim()}. The island is a SEPARATE selection — do not change it here`;
            } else if (key === "island-cabinet-color") {
              spatialHints[key] = `${hint.trim()}. Perimeter wall cabinets are a SEPARATE selection — do not change them here`;
            } else {
              spatialHints[key] = hint;
            }
          }
        }

        const scopedSubcategoryIds = DEMO_SUBCATEGORIES.map(s => s.id);

        const { prompt, swatches } = await buildBflScopedEditPrompt(
          changedSubcategoryId,
          changedNewOptionId,
          effectiveSelections,
          optionLookup,
          spatialHints,
          scopedSubcategoryIds,
          sceneAnalysis?.sceneDescription ?? null,
          null, // photoSpatialHint
          resolveLocalSwatch,
        );

        console.log(`[demo/generate] Scoped edit: changing ${changedSubcategoryId} (depth ${depth} → ${depth + 1})`);
        console.log(`[demo/generate] Base image: ${baseImagePath}`);
        console.log(`[demo/generate] Scoped prompt:\n${prompt}`);

        const genStart = performance.now();
        try {
          const result = await generateImage({
            model: SCOPED_EDIT_MODEL,
            prompt,
            inputImage: baseBuffer,
            referenceImages: swatches.map(s => s.buffer),
          });

          const { error: uploadError } = await supabase.storage
            .from("demo-generated")
            .upload(outputPath, result.imageBuffer, { contentType: "image/jpeg", upsert: true });
          if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

          const durationMs = Math.round(performance.now() - genStart);
          console.log(`[demo/generate] Scoped edit complete in ${durationMs}ms`);
          return { prompt, durationMs };
        } catch (err) {
          const durationMs = Math.round(performance.now() - genStart);
          await captureAiError("anonymous", {
            provider: "bfl",
            model: SCOPED_EDIT_MODEL,
            route: "/api/try/generate",
            duration_ms: durationMs,
            error: err,
          });
          throw err;
        }
      });

      // --- Persist scoped edit ---
      await step.run("persist-scoped", async () => {
        const supabase = getServiceClient();

        const { error: upsertError } = await supabase.from("generated_images").upsert({
          selections_hash: combinedHash,
          selections_json: {
            _source: "demo",
            _cacheVersion: DEMO_GENERATION_CACHE_VERSION,
            _session_id: sessionId,
            _photo_hash: photoHash,
            ...effectiveSelections,
          },
          image_path: outputPath,
          prompt: scopedResult.prompt,
          step_id: null,
          model: SCOPED_EDIT_MODEL,
          org_id: DEMO_ORG_ID,
          scoped_edit_depth: depth + 1,
          leave_one_out_hashes: leaveOneOutHashes,
        }, { onConflict: "selections_hash" });

        if (upsertError) console.error("[demo/generate] DB upsert failed:", upsertError);

        await captureAiEvent("anonymous", {
          provider: "bfl",
          model: SCOPED_EDIT_MODEL,
          route: "/api/try/generate",
          duration_ms: scopedResult.durationMs,
          cost_usd: estimateBflCost(SCOPED_EDIT_MODEL),
          image_size: "1536x1024",
          scoped_edit: true,
          scoped_edit_depth: depth + 1,
          scoped_edit_surface: changedSubcategoryId,
        });

        console.log(`[demo/generate] Scoped edit persisted (depth ${depth + 1})`);
      });

      return; // Done — skip full pipeline
    }

    // --- Step 2: Persist to DB (image already in storage from step 1) ---
    const result = generateResult;
    await step.run("persist", async () => {
      const supabase = getServiceClient();

      const { error: upsertError } = await supabase.from("generated_images").upsert({
        selections_hash: combinedHash,
        selections_json: {
          _source: "demo",
          _cacheVersion: DEMO_GENERATION_CACHE_VERSION,
          _session_id: sessionId,
          _photo_hash: photoHash,
          ...effectiveSelections,
        },
        image_path: outputPath,
        prompt: result.prompt,
        step_id: null,
        model: IMAGE_MODEL,
        org_id: DEMO_ORG_ID,
        scoped_edit_depth: 0,
        leave_one_out_hashes: leaveOneOutHashes,
      }, { onConflict: "selections_hash" });

      if (upsertError) {
        console.error("[demo/generate] DB upsert failed:", upsertError);
      }

      await captureAiEvent("anonymous", {
        provider: "bfl",
        model: IMAGE_MODEL,
        route: "/api/try/generate",
        duration_ms: result.durationMs,
        cost_usd: estimateBflCost(IMAGE_MODEL),
        image_size: "1536x1024",
      });

      console.log(`[demo/generate] Cached: ${combinedHash} → ${outputPath}`);
    });
  },
);
