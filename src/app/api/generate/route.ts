import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { buildEditPrompt, GENERATION_CACHE_VERSION, hashSelections } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getVisualSubCategoryIdsFromDb, getOptionLookup, getStepAiConfig } from "@/lib/db-queries";
import { readFile } from "fs/promises";
import path from "path";
import { deflateSync } from "zlib";

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

// Hardcoded org/floorplan for SM demo — will be dynamic in Phase 2
const SM_ORG_SLUG = "stone-martin";
const SM_FLOORPLAN_SLUG = "kinkade";
const SLIDE_IN_RANGE_OPTION_IDS = new Set([
  "range-ge-gas-slide-in",
  "range-ge-gas-slide-in-convection",
]);
const SLIDE_IN_RANGE_REFINE_RECT = {
  // Tuned for 1536x1024 output.
  // Wide enough to include the full visible slide-in range footprint and nearby backsplash,
  // but capped above the island-front panel area to avoid cabinet drift.
  x: 800,
  y: 330,
  width: 540,
  height: 290,
};

function mediaTypeFromExt(ext: string): string {
  const normalized = ext.toLowerCase();
  if (normalized === "jpg" || normalized === "jpeg") return "image/jpeg";
  if (normalized === "png") return "image/png";
  if (normalized === "webp") return "image/webp";
  return `image/${normalized}`;
}

function crc32(buf: Buffer): Buffer {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  crc ^= 0xffffffff;
  const out = Buffer.alloc(4);
  out.writeUInt32BE(crc >>> 0);
  return out;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, "ascii");
  const crc = crc32(Buffer.concat([typeB, data]));
  return Buffer.concat([len, typeB, data, crc]);
}

function createRectEditMaskPng(
  width: number,
  height: number,
  editRect: { x: number; y: number; width: number; height: number },
): Buffer {
  const raw = Buffer.alloc(height * (1 + width * 4));

  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;

    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4;
      const inside =
        x >= editRect.x &&
        x < editRect.x + editRect.width &&
        y >= editRect.y &&
        y < editRect.y + editRect.height;

      raw[px] = 0;
      raw[px + 1] = 0;
      raw[px + 2] = 0;
      raw[px + 3] = inside ? 0 : 255;
    }
  }

  const compressed = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export async function POST(request: Request) {
  try {
    const { selections, heroImage, model, stepSlug } = await request.json();

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

    // Resolve org and floorplan from DB
    const supabase = getServiceClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", SM_ORG_SLUG)
      .single();

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { data: floorplan } = await supabase
      .from("floorplans")
      .select("id")
      .eq("org_id", org.id)
      .eq("slug", SM_FLOORPLAN_SLUG)
      .single();

    if (!floorplan) {
      return NextResponse.json({ error: "Floorplan not found" }, { status: 404 });
    }

    // Validate that all selection keys are known visual subcategory IDs
    const validIds = await getVisualSubCategoryIdsFromDb(org.id);
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
    const selectionsHash = hashSelections({
      ...selections,
      _model: modelName,
      _cacheVersion: GENERATION_CACHE_VERSION,
    });

    // Double-click guard — skip if this exact hash is already being generated
    if (inProgressHashes.has(selectionsHash)) {
      return NextResponse.json(
        { error: "This combination is already being generated" },
        { status: 429 }
      );
    }
    inProgressHashes.add(selectionsHash);

    try {
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

      // Fetch step AI config from DB
      let spatialHints: Record<string, string> = {};
      let sceneDescription: string | null = null;
      let stepId: string | undefined;

      if (stepSlug) {
        const aiConfig = await getStepAiConfig(stepSlug, floorplan.id);
        if (aiConfig) {
          spatialHints = aiConfig.spatialHints;
          sceneDescription = aiConfig.sceneDescription;
          stepId = aiConfig.stepId;
        }
      }

      // Build option lookup from DB
      const optionLookup = await getOptionLookup(org.id);

      // Read the base room image from public/
      const imagePath = path.join(process.cwd(), "public", heroImage);
      const imageBuffer = await readFile(imagePath);
      const heroExt = path.extname(heroImage).slice(1).toLowerCase();
      const heroMime = heroExt === "jpg" ? "image/jpeg" : `image/${heroExt}`;
      const heroFilename = path.basename(heroImage);

      const selectedRangeId = typeof selections.range === "string" ? selections.range : null;
      const shouldRunSlideInRangeRefine =
        heroImage === "/rooms/kitchen-close.webp" &&
        !!selectedRangeId &&
        SLIDE_IN_RANGE_OPTION_IDS.has(selectedRangeId);

      // For known-stubborn slide-in range cases, defer range editing to pass 2 only.
      // This keeps pass 1 focused on finishes and avoids incidental cabinet-geometry drift.
      const primaryPassSelections = shouldRunSlideInRangeRefine
        ? Object.fromEntries(Object.entries(selections).filter(([subId]) => subId !== "range"))
        : selections;

      // Build edit-style prompt + load swatch images
      const { prompt, swatches } = await buildEditPrompt(
        primaryPassSelections,
        optionLookup,
        spatialHints,
        sceneDescription,
      );

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

        if (shouldRunSlideInRangeRefine && selectedRangeId) {
          try {
            const selectedRange = optionLookup.get(`range:${selectedRangeId}`);
            const selectedRangeName = selectedRange?.option.name ?? "slide-in range";
            const selectedRangeDescriptor = selectedRange?.option.promptDescriptor?.trim();

            const rangeRefineImages = [
              await toFile(outputBuffer, "kitchen-pass-1.png", { type: "image/png" }),
            ];

            if (selectedRange?.option.swatchUrl) {
              try {
                const swatchPath = path.join(process.cwd(), "public", selectedRange.option.swatchUrl);
                const swatchBuffer = await readFile(swatchPath);
                const ext = path.extname(selectedRange.option.swatchUrl).slice(1).toLowerCase();
                const swatchMime = mediaTypeFromExt(ext);
                rangeRefineImages.push(
                  await toFile(swatchBuffer, `range-swatch.${ext || "jpg"}`, { type: swatchMime })
                );
              } catch (swatchErr) {
                console.warn("[generate] Range refine pass: failed to load range swatch", swatchErr);
              }
            }

            const rangeMask = createRectEditMaskPng(1536, 1024, SLIDE_IN_RANGE_REFINE_RECT);

            const refinePrompt = `Refine ONLY the kitchen range in the masked region.
Selected model: ${selectedRangeName}${selectedRangeDescriptor ? ` (${selectedRangeDescriptor})` : ""}.
Critical requirements:
- Must be a slide-in gas range: NO raised backguard/control panel behind burners.
- Keep the range clearly present and complete in frame (burners/knobs and single oven door visible where the base perspective allows).
- Backsplash tile must be visible directly behind the cooktop.
- Keep exactly one oven door below cooktop; do NOT add an upper oven compartment.
- Do NOT alter any part of the foreground island cabinetry (panel style, grooves, door seams, or color).
- Do NOT modify anything below the island countertop plane.
- Preserve all surrounding cabinets, countertop, microwave, faucet, lighting, camera angle, and room geometry unchanged.
- Keep the range in the exact same opening and approximate footprint.`;

            console.log("[generate] Running slide-in range refine pass (masked, low fidelity)");
            const refineResult = await openai.images.edit({
              model: "gpt-image-1.5",
              image: rangeRefineImages,
              mask: await toFile(rangeMask, "range-mask.png", { type: "image/png" }),
              prompt: refinePrompt,
              quality: "high",
              size: "1536x1024",
              input_fidelity: "low",
            });

            const refineImageData = refineResult.data?.[0];
            if (refineImageData?.b64_json) {
              outputBuffer = Buffer.from(refineImageData.b64_json, "base64");
            } else {
              console.warn("[generate] Range refine pass returned no image; keeping first pass output");
            }
          } catch (refineErr) {
            console.warn("[generate] Range refine pass failed; keeping first pass output", refineErr);
          }
        }
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
        selections_json: {
          ...selections,
          _model: modelName,
          _cacheVersion: GENERATION_CACHE_VERSION,
        },
        image_path: outputPath,
        prompt,
        step_id: stepId ?? null,
        model: modelName,
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
