import OpenAI, { toFile } from "openai";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { inngest } from "@/inngest/client";
import { buildEditPrompt, buildScopedEditPrompt, identifyChangedSubcategory } from "@/lib/generate";
import type { SwatchBufferResolver } from "@/lib/generate";
import { DEMO_SUBCATEGORIES } from "@/lib/demo-options";
import { DEMO_GENERATION_CACHE_VERSION, DEMO_ORG_ID } from "@/lib/demo-generate";
import { findDemoDiffMatch } from "@/lib/db-queries";
import { getServiceClient } from "@/lib/supabase";
import { captureAiEvent, captureAiError, estimateOpenAICost } from "@/lib/posthog-server";
import { IMAGE_MODEL } from "@/lib/models";
import type { Option, SubCategory } from "@/types";

const openai = new OpenAI();

/** Fallback spatial hints when Gemini doesn't provide them */
const DEFAULT_SPATIAL_HINTS: Record<string, string> = {
  backsplash: "tile backsplash between upper cabinets and countertop on the walls",
  "counter-top": "all visible countertop surfaces",
  "kitchen-cabinet-color": "all visible perimeter/wall cabinet faces (NOT the island)",
  "island-cabinet-color": "island base cabinet faces only (NOT the perimeter/wall cabinets)",
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

    // --- Step 0: Check for single-surface diff match (partial cache) ---
    const diffMatch = await step.run("check-diff-cache", async () => {
      return findDemoDiffMatch(photoHash, leaveOneOutHashes, MAX_SCOPED_EDIT_DEPTH);
    });

    if (diffMatch) {
      const changedSub = identifyChangedSubcategory(diffMatch.selectionsJson, effectiveSelections);

      if (changedSub) {
        // --- Scoped edit: change only the differing surface ---
        const scopedResult = await step.run("scoped-edit", async () => {
          const supabase = getServiceClient();
          const optionLookup = buildDemoOptionLookup();

          // Download the base image (previously generated)
          const { data: baseImageData, error: dlErr } = await supabase.storage
            .from("demo-generated")
            .download(diffMatch.imagePath);
          if (dlErr || !baseImageData) throw new Error(`Failed to download base image: ${dlErr?.message}`);

          const baseBuffer = Buffer.from(await baseImageData.arrayBuffer());

          // Merge spatial hints
          const spatialHints: Record<string, string> = { ...DEFAULT_SPATIAL_HINTS };
          if (sceneAnalysis?.spatialHints) {
            for (const [key, hint] of Object.entries(sceneAnalysis.spatialHints)) {
              if (hint && hint.trim()) spatialHints[key] = hint;
            }
          }

          const scopedSubcategoryIds = DEMO_SUBCATEGORIES.map(s => s.id);

          const { prompt, swatches } = await buildScopedEditPrompt(
            changedSub.subcategoryId,
            changedSub.newOptionId,
            effectiveSelections,
            optionLookup,
            spatialHints,
            scopedSubcategoryIds,
            sceneAnalysis?.sceneDescription ?? null,
            null, // photoSpatialHint
            resolveLocalSwatch,
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

          console.log(`[demo/generate] Scoped edit: changing ${changedSub.subcategoryId} (depth ${diffMatch.depth} → ${diffMatch.depth + 1})`);

          const genStart = performance.now();
          try {
            const result = await openai.images.edit({
              model: IMAGE_MODEL,
              image: inputImages,
              prompt,
              quality: "medium",
              size: "1536x1024",
              input_fidelity: "high",
            });

            const generatedData = result.data?.[0];
            if (!generatedData?.b64_json) throw new Error("No image from scoped edit");

            const durationMs = Math.round(performance.now() - genStart);

            const jpegBuffer = await sharp(Buffer.from(generatedData.b64_json, "base64"))
              .jpeg({ quality: 90 })
              .toBuffer();

            const { error: uploadError } = await supabase.storage
              .from("demo-generated")
              .upload(outputPath, jpegBuffer, { contentType: "image/jpeg", upsert: true });
            if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

            console.log(`[demo/generate] Scoped edit complete in ${durationMs}ms`);
            return { prompt, durationMs };
          } catch (err) {
            const durationMs = Math.round(performance.now() - genStart);
            await captureAiError("anonymous", {
              provider: "openai",
              model: IMAGE_MODEL,
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
            model: IMAGE_MODEL,
            org_id: DEMO_ORG_ID,
            scoped_edit_depth: diffMatch.depth + 1,
            leave_one_out_hashes: leaveOneOutHashes,
          }, { onConflict: "selections_hash" });

          if (upsertError) console.error("[demo/generate] DB upsert failed:", upsertError);

          await captureAiEvent("anonymous", {
            provider: "openai",
            model: IMAGE_MODEL,
            route: "/api/try/generate",
            duration_ms: scopedResult.durationMs,
            cost_usd: estimateOpenAICost(IMAGE_MODEL, 1),
            image_size: "1536x1024",
            image_quality: "medium",
            scoped_edit: true,
            scoped_edit_depth: diffMatch.depth + 1,
            scoped_edit_surface: changedSub.subcategoryId,
          });

          console.log(`[demo/generate] Scoped edit persisted (depth ${diffMatch.depth + 1})`);
        });

        return; // Done — skip full pipeline
      }
    }

    // --- Step 1: Full generation via OpenAI ---
    const result = await step.run("generate", async () => {
      const supabase = getServiceClient();

      // Download user photo from demo-uploads
      const { data: photoData, error: downloadErr } = await supabase.storage
        .from("demo-uploads")
        .download(`${photoHash}.jpg`);

      if (downloadErr || !photoData) {
        throw new Error(`Failed to load demo photo: ${downloadErr?.message}`);
      }

      const photoBuffer = Buffer.from(await photoData.arrayBuffer());

      // Build option lookup from hardcoded demo options
      const optionLookup = buildDemoOptionLookup();

      // Merge Gemini spatial hints with defaults
      const spatialHints: Record<string, string> = { ...DEFAULT_SPATIAL_HINTS };
      if (sceneAnalysis?.spatialHints) {
        for (const [key, hint] of Object.entries(sceneAnalysis.spatialHints)) {
          if (hint && hint.trim()) spatialHints[key] = hint;
        }
      }

      // Separate perimeter from island when island detected
      if (sceneAnalysis?.hasIsland) {
        if (spatialHints["kitchen-cabinet-color"] === DEFAULT_SPATIAL_HINTS["kitchen-cabinet-color"]) {
          spatialHints["kitchen-cabinet-color"] = "perimeter/wall cabinet faces only (NOT the island base cabinets)";
        }
        if (spatialHints["island-cabinet-color"] === DEFAULT_SPATIAL_HINTS["island-cabinet-color"]) {
          spatialHints["island-cabinet-color"] = "island base cabinet faces only (NOT the perimeter/wall cabinets)";
        }
      }

      // All demo subcategory IDs are in scope (not just selected ones).
      // This allows negative-guard rules to fire for unselected subcategories.
      const scopedSubcategoryIds = DEMO_SUBCATEGORIES.map(s => s.id);

      // Scene description: combine Gemini's free-text description with structured metadata.
      // buildEditPrompt only accepts sceneDescription (text) and photoSpatialHint,
      // so we fold kitchenType/cameraAngle/visibleSurfaces into the description string.
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

      // Build prompt using the real pipeline's prompt builder
      const { prompt, swatches } = await buildEditPrompt(
        effectiveSelections,
        optionLookup,
        spatialHints,
        scopedSubcategoryIds,
        sceneDescription,
        null, // photoSpatialHint — not applicable for user-uploaded photos
        resolveLocalSwatch,
      );

      // Filter unsupported swatch formats
      const supportedSwatches = swatches.filter((s) => {
        const supported = ["image/jpeg", "image/png", "image/webp"];
        return supported.includes(s.mediaType);
      });

      // Assemble images: user photo + swatches
      const inputImages = [
        await toFile(photoBuffer, "kitchen.jpg", { type: "image/jpeg" }),
        ...await Promise.all(
          supportedSwatches.map((s) => {
            const ext = s.mediaType.split("/")[1] || "png";
            const filename = `${s.label.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
            return toFile(s.buffer, filename, { type: s.mediaType });
          })
        ),
      ];

      console.log(`[demo/generate] Sending ${inputImages.length} images (1 photo + ${supportedSwatches.length} swatches) to ${IMAGE_MODEL}`);

      const genStart = performance.now();
      try {
        const genResult = await openai.images.edit({
          model: IMAGE_MODEL,
          image: inputImages,
          prompt,
          quality: "medium",
          size: "1536x1024",
          input_fidelity: "high",
        });

        const imageData = genResult.data?.[0];
        if (!imageData?.b64_json) {
          throw new Error("No image was generated");
        }

        const durationMs = Math.round(performance.now() - genStart);

        // Convert PNG → JPEG and upload within this step — don't return b64 through Inngest
        const jpegBuffer = await sharp(Buffer.from(imageData.b64_json, "base64"))
          .jpeg({ quality: 90 })
          .toBuffer();

        const { error: uploadError } = await supabase.storage
          .from("demo-generated")
          .upload(outputPath, jpegBuffer, { contentType: "image/jpeg", upsert: true });
        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

        console.log(`[demo/generate] Generation complete in ${durationMs}ms`);

        return { prompt, durationMs };
      } catch (err) {
        const durationMs = Math.round(performance.now() - genStart);
        await captureAiError("anonymous", {
          provider: "openai",
          model: IMAGE_MODEL,
          route: "/api/try/generate",
          duration_ms: durationMs,
          error: err,
        });
        throw err;
      }
    });

    // --- Step 2: Persist to DB (image already in storage from step 1) ---
    await step.run("persist", async () => {
      const supabase = getServiceClient();

      // Cache the result (upsert replaces __pending__ placeholder)
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
        provider: "openai",
        model: IMAGE_MODEL,
        route: "/api/try/generate",
        duration_ms: result.durationMs,
        cost_usd: estimateOpenAICost(IMAGE_MODEL, 1),
        image_size: "1536x1024",
        image_quality: "medium",
        second_pass: false,
      });

      console.log(`[demo/generate] Cached: ${combinedHash} → ${outputPath}`);
    });
  },
);
