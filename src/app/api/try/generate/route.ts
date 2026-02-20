import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { buildDemoPrompt } from "@/lib/demo-prompt";
import { DEMO_SUBCATEGORY_IDS, DEMO_OPTION_IDS } from "@/lib/demo-options";
import { DEMO_GENERATION_CACHE_VERSION, hashDemoSelections } from "@/lib/demo-generate";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";
import { getServiceClient } from "@/lib/supabase";

export const maxDuration = 120;

const openai = new OpenAI();

// Rate limiting
const lastRequestTime = { value: 0 };
const inProgressHashes = new Set<string>();

export async function POST(request: Request) {
  try {
    const { photoBase64, photoHash, selections, sceneAnalysis } = await request.json() as {
      photoBase64?: string;
      photoHash?: string;
      selections?: Record<string, string>;
      sceneAnalysis?: DemoSceneAnalysis;
    };

    if (!photoBase64 || typeof photoBase64 !== "string") {
      return NextResponse.json({ error: "Missing photo data" }, { status: 400 });
    }
    if (!photoHash || typeof photoHash !== "string") {
      return NextResponse.json({ error: "Missing photo hash" }, { status: 400 });
    }
    if (!selections || typeof selections !== "object") {
      return NextResponse.json({ error: "Invalid selections" }, { status: 400 });
    }

    // Validate selection keys are demo subcategories
    const unknownKeys = Object.keys(selections).filter((k) => !DEMO_SUBCATEGORY_IDS.has(k));
    if (unknownKeys.length > 0) {
      return NextResponse.json(
        { error: `Unknown selection keys: ${unknownKeys.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate option IDs
    const unknownOptions = Object.values(selections).filter((v) => !DEMO_OPTION_IDS.has(v as string));
    if (unknownOptions.length > 0) {
      return NextResponse.json(
        { error: `Unknown option IDs: ${unknownOptions.join(", ")}` },
        { status: 400 }
      );
    }

    // Rate limiting — 5 second cooldown
    const now = Date.now();
    if (now - lastRequestTime.value < 5000) {
      return NextResponse.json(
        { error: "Please wait before generating again" },
        { status: 429 }
      );
    }
    lastRequestTime.value = now;

    // Drop selections for surfaces that are not visible in this photo.
    const { combinedHash, effectiveSelections } = hashDemoSelections(photoHash, selections, sceneAnalysis);
    if (Object.keys(effectiveSelections).length === 0) {
      return NextResponse.json(
        { error: "None of the selected surfaces are visible in this photo." },
        { status: 400 },
      );
    }

    // Double-click guard
    if (inProgressHashes.has(combinedHash)) {
      return NextResponse.json(
        { error: "This combination is already being generated" },
        { status: 429 }
      );
    }
    inProgressHashes.add(combinedHash);

    try {
      const supabase = getServiceClient();

      // Re-check cache (race guard)
      const { data: cached } = await supabase
        .from("generated_images")
        .select("image_path")
        .eq("selections_hash", combinedHash)
        .single();

      if (cached?.image_path) {
        const {
          data: { publicUrl },
        } = supabase.storage
          .from("demo-generated")
          .getPublicUrl(cached.image_path);

        return NextResponse.json({ imageUrl: publicUrl, cacheHit: true });
      }

      // Upload user photo to demo-uploads bucket
      const photoBuffer = Buffer.from(photoBase64, "base64");
      await supabase.storage
        .from("demo-uploads")
        .upload(`${photoHash}.jpg`, photoBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      // Build prompt + load swatches
      const { prompt, swatches } = await buildDemoPrompt(effectiveSelections, sceneAnalysis);

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

      console.log(`[demo/generate] Sending ${inputImages.length} images (1 photo + ${swatches.length} swatches) to gpt-image-1.5`);

      const result = await openai.images.edit({
        model: "gpt-image-1.5",
        image: inputImages,
        prompt,
        quality: "high",
        size: "1536x1024",
        input_fidelity: "high",
      });

      const imageData = result.data?.[0];
      if (!imageData?.b64_json) {
        return NextResponse.json(
          { error: "No image was generated" },
          { status: 500 }
        );
      }

      const outputBuffer = Buffer.from(imageData.b64_json, "base64");
      const outputPath = `demo-${combinedHash}.png`;

      // Upload result
      const { error: uploadError } = await supabase.storage
        .from("demo-generated")
        .upload(outputPath, outputBuffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error("[demo/generate] Upload error:", uploadError);
        return NextResponse.json({
          imageUrl: `data:image/png;base64,${outputBuffer.toString("base64")}`,
          cacheHit: false,
          warning: "Image was not cached due to storage upload failure",
        });
      }

      // Cache the result
      const { error: upsertError } = await supabase.from("generated_images").upsert({
        selections_hash: combinedHash,
        selections_json: {
          _source: "demo",
          _cacheVersion: DEMO_GENERATION_CACHE_VERSION,
          photo_hash: photoHash,
          ...effectiveSelections,
        },
        image_path: outputPath,
        prompt,
        step_id: null,
        model: "gpt-image-1.5",
      }, { onConflict: "selections_hash" });

      if (upsertError) {
        console.error("[demo/generate] DB upsert failed:", upsertError);
      } else {
        console.log(`[demo/generate] Cached: ${combinedHash} → ${outputPath}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("demo-generated")
        .getPublicUrl(outputPath);

      return NextResponse.json({ imageUrl: publicUrl, cacheHit: false });
    } finally {
      inProgressHashes.delete(combinedHash);
    }
  } catch (error) {
    console.error("[demo/generate] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
