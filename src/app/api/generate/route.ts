import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { buildEditPrompt, hashSelections } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getVisualSubCategoryIds } from "@/lib/options-data";
import { readFile } from "fs/promises";
import path from "path";

export const maxDuration = 120;

const openai = new OpenAI();

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
  "/rooms/primary-bedroom.webp",
]);

export async function POST(request: Request) {
  try {
    const { selections, heroImage, model } = await request.json();

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

    const modelName = model === "gpt-5.2" ? "gpt-5.2" : "gpt-image-1.5";
    const selectionsHash = hashSelections({ ...selections, _model: modelName });

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
      const heroExt = path.extname(heroImage).slice(1).toLowerCase();
      const heroMime = heroExt === "jpg" ? "image/jpeg" : `image/${heroExt}`;
      const heroFilename = path.basename(heroImage);

      // Build edit-style prompt + load swatch images (all selections with swatches)
      const { prompt, swatches } = await buildEditPrompt(selections, heroImage);

      let outputBuffer: Buffer;

      if (model === "gpt-5.2") {
        // --- GPT-5.2 via Responses API ---
        const heroBase64 = imageBuffer.toString("base64");
        const heroDataUrl = `data:${heroMime};base64,${heroBase64}`;

        const contentItems = [
          { type: "input_image" as const, detail: "high" as const, image_url: heroDataUrl },
          ...swatches.map((s) => ({
            type: "input_image" as const,
            detail: "high" as const,
            image_url: `data:${s.mediaType};base64,${s.buffer.toString("base64")}`,
          })),
          { type: "input_text" as const, text: prompt },
        ];

        console.log(`[generate] Sending ${1 + swatches.length} images + prompt to gpt-5.2 via Responses API`);

        const response = await openai.responses.create({
          model: "gpt-5.2",
          input: [{ role: "user", content: contentItems }],
          tools: [{ type: "image_generation", quality: "high", size: "1536x1024" }],
        });

        const imageOutput = response.output.find(
          (o) => o.type === "image_generation_call"
        );

        if (!imageOutput || !("result" in imageOutput) || !imageOutput.result) {
          console.error("[generate] GPT-5.2 response output:", JSON.stringify(response.output, null, 2));
          return NextResponse.json(
            { error: "GPT-5.2 did not generate an image" },
            { status: 500 }
          );
        }

        outputBuffer = Buffer.from(imageOutput.result as string, "base64");
      } else {
        // --- gpt-image-1.5 via Images Edit API (all swatches included) ---
        const inputImages = [
          await toFile(imageBuffer, heroFilename, { type: heroMime }),
          ...await Promise.all(
            swatches.map((s) => {
              const ext = s.mediaType.split("/")[1] || "png";
              const filename = `${s.label.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
              return toFile(s.buffer, filename, { type: s.mediaType });
            })
          ),
        ];

        console.log(`[generate] Sending ${inputImages.length} images (1 room + ${swatches.length} swatches) to gpt-image-1.5`);

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

        outputBuffer = Buffer.from(imageData.b64_json, "base64");
      }

      const outputPath = `${selectionsHash}.png`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("kitchen-images")
        .upload(outputPath, outputBuffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        const fileSize = outputBuffer.length;
        console.error("Upload error:", uploadError);
        console.error(`[generate] Upload details: path=${outputPath}, size=${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
        console.warn("[generate] Storage upload failed — returning base64 fallback. This image will NOT appear in admin cache.");
        return NextResponse.json({
          imageUrl: `data:image/png;base64,${outputBuffer.toString("base64")}`,
          cacheHit: false,
          warning: "Image was not cached due to storage upload failure",
        });
      }

      // Cache the result (upsert to handle race conditions)
      const { error: upsertError } = await supabase.from("generated_images").upsert({
        selections_hash: selectionsHash,
        selections_json: { ...selections, _model: modelName },
        image_path: outputPath,
        prompt,
      }, { onConflict: 'selections_hash' });

      if (upsertError) {
        console.error("[generate] DB upsert failed:", upsertError);
      } else {
        console.log(`[generate] Cached (${modelName}): ${selectionsHash} → ${outputPath}`);
      }

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
