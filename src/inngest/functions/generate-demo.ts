import OpenAI, { toFile } from "openai";
import { inngest } from "@/inngest/client";
import { buildDemoPrompt } from "@/lib/demo-prompt";
import { DEMO_GENERATION_CACHE_VERSION } from "@/lib/demo-generate";
import { getServiceClient } from "@/lib/supabase";
import { captureAiEvent, estimateOpenAICost } from "@/lib/posthog-server";
import { IMAGE_MODEL } from "@/lib/models";

const openai = new OpenAI();

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

      // Assemble images: user photo + swatches
      const inputImages = [
        await toFile(photoBuffer, "kitchen.jpg", { type: "image/jpeg" }),
        ...await Promise.all(
          swatches.map((s) => {
            const ext = s.mediaType.split("/")[1] || "png";
            const filename = `${s.label.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
            return toFile(s.buffer, filename, { type: s.mediaType });
          })
        ),
      ];

      console.log(`[demo/generate] Sending ${inputImages.length} images (1 photo + ${swatches.length} swatches) to ${IMAGE_MODEL}`);

      const genStart = performance.now();
      const genResult = await openai.images.edit({
        model: IMAGE_MODEL,
        image: inputImages,
        prompt,
        quality: "high",
        size: "1536x1024",
        input_fidelity: "high",
      });

      const imageData = genResult.data?.[0];
      if (!imageData?.b64_json) {
        throw new Error("No image was generated");
      }

      const durationMs = Math.round(performance.now() - genStart);
      console.log(`[demo/generate] Generation complete in ${durationMs}ms`);

      return { b64: imageData.b64_json, prompt, durationMs };
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
        console.error("[demo/generate] DB upsert failed:", upsertError);
      }

      await captureAiEvent("anonymous", {
        provider: "openai",
        model: IMAGE_MODEL,
        route: "/api/try/generate",
        duration_ms: result.durationMs,
        cost_usd: estimateOpenAICost(IMAGE_MODEL, 1),
        image_size: "1536x1024",
        image_quality: "high",
        second_pass: false,
      });

      console.log(`[demo/generate] Cached: ${combinedHash} → ${outputPath}`);
    });
  },
);
