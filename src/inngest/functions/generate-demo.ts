import { inngest } from "@/inngest/client";
import { buildDemoPrompt } from "@/lib/demo-prompt";
import { DEMO_GENERATION_CACHE_VERSION } from "@/lib/demo-generate";
import { getServiceClient } from "@/lib/supabase";
import { captureAiEvent, estimateGeminiImageCost } from "@/lib/posthog-server";
import { IMAGE_MODEL } from "@/lib/models";
import { generateImageWithGemini, wrapPromptForGemini } from "@/lib/gemini-image";

export const generateDemo = inngest.createFunction(
  {
    id: "generate-demo",
    retries: 2,
    concurrency: { limit: 3 },
  },
  { event: "demo/generate.requested" },
  async ({ event, step }) => {
    const { combinedHash, photoHash, effectiveSelections, sceneAnalysis } = event.data;

    // --- Step 1: Prep + generate ---
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

      // Build prompt + load swatches (reads from local public/ dir)
      const { prompt, swatches } = await buildDemoPrompt(
        effectiveSelections,
        sceneAnalysis ?? undefined,
      );

      // Filter to supported formats
      const supportedSwatches = swatches.filter((s) => {
        const supported = ["image/jpeg", "image/png", "image/webp"];
        return supported.includes(s.mediaType);
      });

      const geminiPrompt = wrapPromptForGemini(prompt);
      console.log(`[demo/generate] Sending ${1 + supportedSwatches.length} images (1 photo + ${supportedSwatches.length} swatches) to ${IMAGE_MODEL}`);

      const genStart = performance.now();
      const genResult = await generateImageWithGemini({
        roomBuffer: photoBuffer,
        roomMimeType: "image/jpeg",
        swatches: supportedSwatches,
        prompt: geminiPrompt,
        model: IMAGE_MODEL,
      });

      const durationMs = Math.round(performance.now() - genStart);
      console.log(`[demo/generate] Generation complete in ${durationMs}ms`);

      return { b64: genResult.b64, prompt, durationMs };
    });

    // --- Step 2: Upload + persist ---
    await step.run("persist", async () => {
      const supabase = getServiceClient();
      const outputBuffer = Buffer.from(result.b64, "base64");
      const outputPath = `demo-${combinedHash}.png`;

      const { error: uploadError } = await supabase.storage
        .from("demo-generated")
        .upload(outputPath, outputBuffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Cache the result (upsert replaces __pending__ placeholder)
      const { error: upsertError } = await supabase.from("generated_images").upsert({
        selections_hash: combinedHash,
        selections_json: {
          _source: "demo",
          _cacheVersion: DEMO_GENERATION_CACHE_VERSION,
          photo_hash: photoHash,
          ...effectiveSelections,
        },
        image_path: outputPath,
        prompt: result.prompt,
        step_id: null,
        model: IMAGE_MODEL,
      }, { onConflict: "selections_hash" });

      if (upsertError) {
        throw new Error(`DB upsert failed: ${upsertError.message}`);
      }

      await captureAiEvent("anonymous", {
        provider: "google",
        model: IMAGE_MODEL,
        route: "/api/try/generate",
        duration_ms: result.durationMs,
        cost_usd: estimateGeminiImageCost(IMAGE_MODEL, 1),
        image_size: "1K",
        second_pass: false,
        swatch_batch_count: 1,
      });

      console.log(`[demo/generate] Cached: ${combinedHash} → ${outputPath}`);
    });
  },
);
