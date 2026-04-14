import { inngest } from "@/inngest/client";
import { NonRetriableError } from "inngest";
import { identifyChangedSubcategory, resolveLinkedOptions } from "@/lib/generate";
import { DEMO_GENERATION_CACHE_VERSION, DEMO_ORG_ID, SAMPLE_KITCHEN_HASH, SAMPLE_KITCHEN_PROSE } from "@/lib/demo-generate";
import { findDemoDiffMatch, getOptionLookup } from "@/lib/db-queries";
import { getServiceClient } from "@/lib/supabase";
import { captureAiEvent, captureAiError, estimateBflCost } from "@/lib/posthog-server";
import { IMAGE_MODEL, SCOPED_EDIT_MODEL } from "@/lib/models";
import { BflContentModerationError } from "@/lib/bfl";
import { fluxGenerate, fluxScopedEdit, createSwatchResolver } from "@/lib/flux-pipeline";

/** Short fallback spatial hints when Gemini scene analysis doesn't provide them. */
const DEFAULT_SPATIAL_HINTS: Record<string, string> = {
  backsplash: "backsplash tile surface behind the countertop, bounded by the underside of upper cabinets above and the countertop below",
  "counter-top": "all horizontal countertop surfaces — perimeter and center workspace",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets above and flanking appliances — every perimeter cabinet door and drawer",
  "kitchen-island-cabinet-color": "freestanding base cabinet panel below the countertop overhang in the foreground",
};

/** Merge Gemini-provided spatial hints with defaults */
function mergeSpatialHints(sceneAnalysis: { spatialHints?: Record<string, string> } | null): Record<string, string> {
  const hints: Record<string, string> = { ...DEFAULT_SPATIAL_HINTS };
  if (sceneAnalysis?.spatialHints) {
    for (const [key, hint] of Object.entries(sceneAnalysis.spatialHints)) {
      if (hint?.trim()) hints[key] = hint;
    }
  }
  return hints;
}

export const generateDemo = inngest.createFunction(
  {
    id: "generate-demo",
    name: "Generate Demo (/try)",
    retries: 2,
    concurrency: { limit: 3 },
  },
  { event: "demo/generate.requested" },
  async ({ event, step }) => {
    const { combinedHash, photoHash, sessionId, effectiveSelections, sceneAnalysis, leaveOneOutHashes } = event.data;

    console.log(`[generate/demo] Source: /try (session ${sessionId.slice(0, 8)})`);
    const MAX_SCOPED_EDIT_DEPTH = 3;
    const outputPath = `demo-${combinedHash}.jpg`;

    // --- Step 1: Diff cache check + full generation ---
    const generateResult = await step.run("generate", async () => {
      const diffMatch = await findDemoDiffMatch(photoHash, leaveOneOutHashes, MAX_SCOPED_EDIT_DEPTH, DEMO_GENERATION_CACHE_VERSION);
      if (diffMatch) {
        const changedSub = identifyChangedSubcategory(diffMatch.selectionsJson, effectiveSelections);
        const isApplianceAddRemove = changedSub && (
          changedSub.oldOptionId.endsWith("-none") || changedSub.newOptionId.endsWith("-none")
        );
        if (isApplianceAddRemove) {
          console.log(`[generate/demo] Skipping scoped edit: appliance add/remove (${changedSub!.subcategoryId} ${changedSub!.oldOptionId} → ${changedSub!.newOptionId})`);
        }
        if (changedSub && !isApplianceAddRemove) {
          return {
            type: "scoped-edit-needed" as const,
            imagePath: diffMatch.imagePath,
            bucket: "demo-generated" as const,
            depth: diffMatch.depth,
            changedSubcategoryId: changedSub.subcategoryId,
            changedNewOptionId: changedSub.newOptionId,
          };
        }
      }

      // Single selection with no diff match — scoped edit directly on original photo
      const selectionEntries = Object.entries(effectiveSelections);
      if (selectionEntries.length === 1) {
        const [subId, optId] = selectionEntries[0];
        console.log(`[generate/demo] Single selection, scoped edit from original photo: ${subId} → ${optId}`);
        return {
          type: "scoped-edit-needed" as const,
          imagePath: `${photoHash}.jpg`,
          bucket: "demo-uploads" as const,
          depth: 0,
          changedSubcategoryId: subId,
          changedNewOptionId: optId,
        };
      }

      // No scoped edit — full generation via shared Flux pipeline
      const supabase = getServiceClient();
      const spatialHints = mergeSpatialHints(sceneAnalysis);

      const [photoResult, optionLookup] = await Promise.all([
        supabase.storage.from("demo-uploads").download(`${photoHash}.jpg`),
        getOptionLookup(DEMO_ORG_ID),
      ]);
      const { data: photoData, error: downloadErr } = photoResult;
      if (downloadErr || !photoData) {
        throw new Error(`Failed to load demo photo: ${downloadErr?.message}`);
      }

      // Resolve linked options (e.g. "Match to Main" island → merge with perimeter cabinet)
      const resolvedSelections = { ...effectiveSelections };
      resolveLinkedOptions(resolvedSelections, optionLookup, spatialHints);

      // Remove merged subcategories from defaultSurfaceColors so they don't
      // get contradicting preservation lines (e.g. "island stays at #F5F5F2"
      // while the merged cabinet line tells Flux to apply the swatch there)
      let resolvedDefaultColors = sceneAnalysis?.defaultSurfaceColors;
      if (resolvedDefaultColors) {
        const merged = Object.keys(effectiveSelections).filter(k => !(k in resolvedSelections));
        if (merged.length > 0) {
          resolvedDefaultColors = { ...resolvedDefaultColors };
          for (const k of merged) delete resolvedDefaultColors[k];
        }
      }

      const genStart = performance.now();
      try {
        const promptProse = photoHash === SAMPLE_KITCHEN_HASH ? SAMPLE_KITCHEN_PROSE : null;
        const result = await fluxGenerate({
          heroBuffer: Buffer.from(await photoData.arrayBuffer()),
          selections: resolvedSelections,
          optionLookup,
          spatialHints,
          swatchResolver: createSwatchResolver(supabase),
          defaultSurfaceColors: resolvedDefaultColors,
          promptProse,
        });

        // Upload to storage within this step
        const { error: uploadError } = await supabase.storage
          .from("demo-generated")
          .upload(outputPath, result.imageBuffer, { contentType: "image/jpeg", upsert: true });
        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

        console.log(`[generate/demo] Generation complete in ${result.durationMs}ms (${result.passes} pass${result.passes > 1 ? "es" : ""}, models: ${result.modelsUsed.join(", ")})`);
        return {
          type: "generated" as const,
          prompt: result.prompt,
          durationMs: result.durationMs,
          modelsUsed: result.modelsUsed,
        };
      } catch (err) {
        await captureAiError("anonymous", {
          provider: "bfl",
          model: IMAGE_MODEL,
          route: "/api/try/generate",
          duration_ms: Math.round(performance.now() - genStart),
          error: err,
        });
        if (err instanceof BflContentModerationError) {
          await supabase.from("generated_images")
            .update({ image_path: "__failed__" })
            .eq("selections_hash", combinedHash)
            .eq("image_path", "__pending__");
          throw new NonRetriableError(err.message, { cause: err });
        }
        throw err;
      }
    });

    // --- Scoped edit path ---
    if (generateResult.type === "scoped-edit-needed") {
      const { imagePath: baseImagePath, bucket: baseBucket, depth, changedSubcategoryId, changedNewOptionId } = generateResult;

      const scopedResult = await step.run("scoped-edit", async () => {
        const supabase = getServiceClient();

        const [baseImageResult, optionLookup] = await Promise.all([
          supabase.storage.from(baseBucket).download(baseImagePath),
          getOptionLookup(DEMO_ORG_ID),
        ]);
        const { data: baseImageData, error: dlErr } = baseImageResult;
        if (dlErr || !baseImageData) throw new Error(`Failed to download base image: ${dlErr?.message}`);

        const spatialHints = mergeSpatialHints(sceneAnalysis);

        const genStart = performance.now();
        try {
          const promptProse = photoHash === SAMPLE_KITCHEN_HASH ? SAMPLE_KITCHEN_PROSE : null;
          const result = await fluxScopedEdit({
            baseImageBuffer: Buffer.from(await baseImageData.arrayBuffer()),
            changedSubcategoryId,
            changedOptionId: changedNewOptionId,
            optionLookup,
            spatialHints,
            swatchResolver: createSwatchResolver(supabase),
            promptProse,
          });

          const { error: uploadError } = await supabase.storage
            .from("demo-generated")
            .upload(outputPath, result.imageBuffer, { contentType: "image/jpeg", upsert: true });
          if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

          console.log(`[generate/demo] Scoped edit complete: ${changedSubcategoryId} (depth ${depth} → ${depth + 1}) in ${result.durationMs}ms`);
          return { prompt: result.prompt, durationMs: result.durationMs, model: result.model };
        } catch (err) {
          await captureAiError("anonymous", {
            provider: "bfl",
            model: SCOPED_EDIT_MODEL,
            route: "/api/try/generate",
            duration_ms: Math.round(performance.now() - genStart),
            error: err,
          });
          if (err instanceof BflContentModerationError) {
            await supabase.from("generated_images")
              .update({ image_path: "__failed__" })
              .eq("selections_hash", combinedHash)
              .eq("image_path", "__pending__");
            throw new NonRetriableError(err.message, { cause: err });
          }
          throw err;
        }
      });

      // Save image row first — unblocks the client ASAP, before PostHog flush.
      await step.run("save-image-scoped", async () => {
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
          model: scopedResult.model,
          org_id: DEMO_ORG_ID,
          scoped_edit_depth: depth + 1,
          leave_one_out_hashes: leaveOneOutHashes,
        }, { onConflict: "selections_hash" });

        if (upsertError) console.error("[generate/demo] DB upsert failed:", upsertError);
      });

      // PostHog tracking (off the critical path)
      await step.run("track-scoped", async () => {
        await captureAiEvent("anonymous", {
          provider: "bfl",
          model: scopedResult.model,
          route: "/api/try/generate",
          duration_ms: scopedResult.durationMs,
          cost_usd: estimateBflCost(scopedResult.model),
          image_size: "1536x1024",
          scoped_edit: true,
          scoped_edit_depth: depth + 1,
          scoped_edit_surface: changedSubcategoryId,
        });
      });

      return;
    }

    // --- Save image row — unblocks the client ASAP ---
    const result = generateResult;
    await step.run("save-image", async () => {
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
        // Terminal model actually used. Hardware-routed demo runs will write
        // `flux-2-max` here; non-hardware runs stay on IMAGE_MODEL.
        model: result.modelsUsed.at(-1) ?? IMAGE_MODEL,
        org_id: DEMO_ORG_ID,
        scoped_edit_depth: 0,
        leave_one_out_hashes: leaveOneOutHashes,
      }, { onConflict: "selections_hash" });

      if (upsertError) console.error("[generate/demo] DB upsert failed:", upsertError);
    });

    // --- PostHog tracking (off the critical path) ---
    await step.run("track", async () => {
      await captureAiEvent("anonymous", {
        provider: "bfl",
        // Terminal model (Max for hardware-routed runs, Flex otherwise).
        model: result.modelsUsed.at(-1) ?? IMAGE_MODEL,
        route: "/api/try/generate",
        duration_ms: result.durationMs,
        // Per-pass model array so hybrid Flex+Max runs sum correctly.
        cost_usd: estimateBflCost(result.modelsUsed),
        image_size: "1536x1024",
      });

      console.log(`[generate/demo] Cached: ${combinedHash} → ${outputPath}`);
    });
  },
);
