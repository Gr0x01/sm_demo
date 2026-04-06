import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { inngest } from "@/inngest/client";
import { identifyChangedSubcategory } from "@/lib/generate";
import type { SwatchBufferResolver } from "@/lib/generate";
import { DEMO_SUBCATEGORIES } from "@/lib/demo-options";
import { DEMO_GENERATION_CACHE_VERSION, DEMO_ORG_ID } from "@/lib/demo-generate";
import { findDemoDiffMatch } from "@/lib/db-queries";
import { getServiceClient } from "@/lib/supabase";
import { captureAiEvent, captureAiError, estimateBflCost } from "@/lib/posthog-server";
import { IMAGE_MODEL, SCOPED_EDIT_MODEL } from "@/lib/models";
import { fluxGenerate, fluxScopedEdit } from "@/lib/flux-pipeline";
import type { Option, SubCategory } from "@/types";

/** Fallback spatial hints when Gemini doesn't provide them */
const DEFAULT_SPATIAL_HINTS: Record<string, string> = {
  backsplash: "wall between upper cabinets and countertop",
  "counter-top": "all horizontal countertop surfaces — perimeter and center workspace",
  "kitchen-cabinet-color": "upper wall cabinets, lower base cabinets, and cabinets above and flanking appliances — every perimeter cabinet door and drawer",
  "island-cabinet-color": "island base cabinet panel in the foreground, separate from perimeter cabinets",
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

      const { data: photoData, error: downloadErr } = await supabase.storage
        .from("demo-uploads")
        .download(`${photoHash}.jpg`);
      if (downloadErr || !photoData) {
        throw new Error(`Failed to load demo photo: ${downloadErr?.message}`);
      }

      const genStart = performance.now();
      try {
        const result = await fluxGenerate({
          heroBuffer: Buffer.from(await photoData.arrayBuffer()),
          selections: effectiveSelections,
          optionLookup: buildDemoOptionLookup(),
          spatialHints,
          swatchResolver: resolveLocalSwatch,
          defaultSurfaceColors: sceneAnalysis?.defaultSurfaceColors,
        });

        // Upload to storage within this step
        const { error: uploadError } = await supabase.storage
          .from("demo-generated")
          .upload(outputPath, result.imageBuffer, { contentType: "image/jpeg", upsert: true });
        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

        console.log(`[generate/demo] Generation complete in ${result.durationMs}ms (${result.passes} pass${result.passes > 1 ? "es" : ""})`);
        return { type: "generated" as const, prompt: result.prompt, durationMs: result.durationMs };
      } catch (err) {
        await captureAiError("anonymous", {
          provider: "bfl",
          model: IMAGE_MODEL,
          route: "/api/try/generate",
          duration_ms: Math.round(performance.now() - genStart),
          error: err,
        });
        throw err;
      }
    });

    // --- Scoped edit path ---
    if (generateResult.type === "scoped-edit-needed") {
      const { imagePath: baseImagePath, bucket: baseBucket, depth, changedSubcategoryId, changedNewOptionId } = generateResult;

      const scopedResult = await step.run("scoped-edit", async () => {
        const supabase = getServiceClient();

        const { data: baseImageData, error: dlErr } = await supabase.storage
          .from(baseBucket)
          .download(baseImagePath);
        if (dlErr || !baseImageData) throw new Error(`Failed to download base image: ${dlErr?.message}`);

        const spatialHints = mergeSpatialHints(sceneAnalysis);

        const genStart = performance.now();
        try {
          const result = await fluxScopedEdit({
            baseImageBuffer: Buffer.from(await baseImageData.arrayBuffer()),
            changedSubcategoryId,
            changedOptionId: changedNewOptionId,
            optionLookup: buildDemoOptionLookup(),
            spatialHints,
            swatchResolver: resolveLocalSwatch,
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
          throw err;
        }
      });

      // Persist scoped edit
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
          model: scopedResult.model,
          org_id: DEMO_ORG_ID,
          scoped_edit_depth: depth + 1,
          leave_one_out_hashes: leaveOneOutHashes,
        }, { onConflict: "selections_hash" });

        if (upsertError) console.error("[generate/demo] DB upsert failed:", upsertError);

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

    // --- Persist full generation ---
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

      if (upsertError) console.error("[generate/demo] DB upsert failed:", upsertError);

      await captureAiEvent("anonymous", {
        provider: "bfl",
        model: IMAGE_MODEL,
        route: "/api/try/generate",
        duration_ms: result.durationMs,
        cost_usd: estimateBflCost(IMAGE_MODEL),
        image_size: "1536x1024",
      });

      console.log(`[generate/demo] Cached: ${combinedHash} → ${outputPath}`);
    });
  },
);
