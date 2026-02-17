import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { experimental_generateImage as generateImage } from "ai";
import { buildPrompt, hashSelections } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getVisualSubCategoryIds } from "@/lib/options-data";

export const maxDuration = 60;

// Simple rate limiting (demo — global, not per-IP)
const lastRequestTime = { value: 0 };

// Double-click guard: track in-progress generation hashes
const inProgressHashes = new Set<string>();

export async function POST(request: Request) {
  try {
    const { selections } = await request.json();

    if (!selections || typeof selections !== "object") {
      return NextResponse.json(
        { error: "Invalid selections" },
        { status: 400 }
      );
    }

    // Validate that all selection keys are known visual subcategory IDs
    const validIds = getVisualSubCategoryIds();
    const unknownKeys = Object.keys(selections).filter((k) => !validIds.has(k));
    if (unknownKeys.length > 0) {
      return NextResponse.json(
        { error: `Unknown selection keys: ${unknownKeys.join(", ")}` },
        { status: 400 }
      );
    }

    // Rate limiting — 5 second cooldown between requests
    const now = Date.now();
    if (now - lastRequestTime.value < 5000) {
      return NextResponse.json(
        { error: "Please wait before generating again" },
        { status: 429 }
      );
    }
    lastRequestTime.value = now;

    const selectionsHash = hashSelections(selections);

    // Double-click guard — skip if this exact hash is already being generated
    if (inProgressHashes.has(selectionsHash)) {
      return NextResponse.json(
        { error: "This combination is already being generated" },
        { status: 429 }
      );
    }
    inProgressHashes.add(selectionsHash);

    try {
      const supabase = getServiceClient();

      // Check cache
      const { data: cached } = await supabase
        .from("generated_images")
        .select("image_path")
        .eq("selections_hash", selectionsHash)
        .single();

      if (cached?.image_path) {
        const {
          data: { publicUrl },
        } = supabase.storage
          .from("kitchen-images")
          .getPublicUrl(cached.image_path);

        return NextResponse.json({
          imageUrl: publicUrl,
          cacheHit: true,
        });
      }

      // Generate image
      const prompt = buildPrompt(selections);

      const result = await generateImage({
        model: openai.image("gpt-image-1"),
        prompt,
        size: "1536x1024",
        providerOptions: {
          openai: { quality: "high" },
        },
      });

      const imageData = result.image;
      const imagePath = `${selectionsHash}.png`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("kitchen-images")
        .upload(imagePath, Buffer.from(imageData.uint8Array), {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        // Still return the image as base64 if upload fails
        return NextResponse.json({
          imageUrl: `data:image/png;base64,${imageData.base64}`,
          cacheHit: false,
        });
      }

      // Cache the result (upsert to handle race conditions)
      await supabase.from("generated_images").upsert({
        selections_hash: selectionsHash,
        selections_json: selections,
        image_path: imagePath,
        prompt,
      }, { onConflict: 'selections_hash' });

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("kitchen-images")
        .getPublicUrl(imagePath);

      return NextResponse.json({
        imageUrl: publicUrl,
        cacheHit: false,
      });
    } finally {
      inProgressHashes.delete(selectionsHash);
    }
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
