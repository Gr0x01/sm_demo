import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { buildEditPrompt, hashSelections } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getVisualSubCategoryIds } from "@/lib/options-data";
import { readFile } from "fs/promises";
import path from "path";

export const maxDuration = 60;

// Simple rate limiting (demo — global, not per-IP)
const lastRequestTime = { value: 0 };

// Double-click guard: track in-progress generation hashes
const inProgressHashes = new Set<string>();

// Allowed hero images (prevent path traversal)
const ALLOWED_HERO_IMAGES = new Set([
  "/rooms/greatroom-wide.webp",
  "/rooms/kitchen-close.webp",
  "/rooms/kitchen-greatroom.webp",
  "/rooms/primary-bath-vanity.webp",
  "/rooms/primary-bath-shower.webp",
  "/rooms/bath-closet.webp",
]);

export async function POST(request: Request) {
  try {
    const { selections, heroImage } = await request.json();

    if (!selections || typeof selections !== "object") {
      return NextResponse.json(
        { error: "Invalid selections" },
        { status: 400 }
      );
    }

    if (!heroImage || !ALLOWED_HERO_IMAGES.has(heroImage)) {
      return NextResponse.json(
        { error: "Invalid or missing heroImage" },
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

      // Read the base room image from public/
      const imagePath = path.join(process.cwd(), "public", heroImage);
      const imageBuffer = await readFile(imagePath);
      const ext = path.extname(heroImage).slice(1); // "webp"
      const mimeType = ext === "webp" ? "image/webp" : `image/${ext}`;

      // Build edit-style prompt + load swatch images
      const { prompt, swatches } = await buildEditPrompt(selections);

      // Assemble multimodal message: base room photo + swatch images + text prompt
      const contentParts: Array<
        | { type: "image"; image: Buffer; mediaType: string }
        | { type: "text"; text: string }
      > = [
        { type: "image", image: imageBuffer, mediaType: mimeType },
      ];

      // Add each swatch image with a label
      for (const swatch of swatches) {
        contentParts.push({ type: "text", text: `[Swatch: ${swatch.label}]` });
        contentParts.push({ type: "image", image: swatch.buffer, mediaType: swatch.mediaType });
      }

      // Add the main prompt last
      contentParts.push({ type: "text", text: prompt });

      const result = await generateText({
        model: google("gemini-2.5-flash-preview-04-17"),
        providerOptions: {
          google: { responseModalities: ["TEXT", "IMAGE"] },
        },
        messages: [{ role: "user", content: contentParts }],
      });

      const imageFile = result.files?.find((f) =>
        f.mediaType?.startsWith("image/")
      );

      if (!imageFile) {
        return NextResponse.json(
          { error: "No image was generated" },
          { status: 500 }
        );
      }

      const outputExt = imageFile.mediaType?.split("/")[1] || "png";
      const outputPath = `${selectionsHash}.${outputExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("kitchen-images")
        .upload(outputPath, Buffer.from(imageFile.uint8Array), {
          contentType: imageFile.mediaType || "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        // Still return the image as base64 if upload fails
        const base64 = Buffer.from(imageFile.uint8Array).toString("base64");
        return NextResponse.json({
          imageUrl: `data:${imageFile.mediaType || "image/png"};base64,${base64}`,
          cacheHit: false,
        });
      }

      // Cache the result (upsert to handle race conditions)
      await supabase.from("generated_images").upsert({
        selections_hash: selectionsHash,
        selections_json: selections,
        image_path: outputPath,
        prompt,
      }, { onConflict: 'selections_hash' });

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("kitchen-images")
        .getPublicUrl(outputPath);

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
