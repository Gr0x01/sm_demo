import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { buildEditPrompt, buildPromptContextSignature, GENERATION_CACHE_VERSION, hashSelections } from "@/lib/generate";
import type { SwatchBufferResolver } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getStepPhotoAiConfig, getStepPhotoGenerationPolicy, getOptionLookup, getOrgBySlug, getFloorplan } from "@/lib/db-queries";
import { resolvePhotoGenerationPolicy } from "@/lib/photo-generation-policy";
import { captureAiEvent, estimateOpenAICost } from "@/lib/posthog-server";
import { IMAGE_MODEL } from "@/lib/models";

export const maxDuration = 120;

const openai = new OpenAI();

function buildSceneDescription(aiConfig: NonNullable<Awaited<ReturnType<typeof getStepPhotoAiConfig>>>): string | null {
  const lines: string[] = [];
  if (aiConfig.sceneDescription?.trim()) lines.push(aiConfig.sceneDescription.trim());
  if (aiConfig.photo.photoBaseline?.trim()) lines.push(`PHOTO_BASELINE: ${aiConfig.photo.photoBaseline.trim()}`);
  return lines.length > 0 ? lines.join("\n") : null;
}

/**
 * Claim a generation slot by inserting a placeholder row into generated_images.
 * If the row already exists (cache hit or in-progress), returns false.
 * The placeholder has image_path = '__pending__' which gets upserted on completion.
 * This is cross-instance safe since Postgres enforces UNIQUE(selections_hash).
 */
type ClaimResult = "claimed" | "in_progress" | "db_error";

async function claimGenerationSlot(
  supabase: ReturnType<typeof getServiceClient>,
  selectionsHash: string,
  stepPhotoId: string,
  orgId: string,
  stepId: string,
  selectionsJson: Record<string, unknown>,
): Promise<ClaimResult> {
  // Clean up stale pending rows (older than 5 min — safely above maxDuration of 120s)
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  await supabase
    .from("generated_images")
    .delete()
    .eq("selections_hash", selectionsHash)
    .eq("image_path", "__pending__")
    .lt("created_at", staleThreshold);

  const { error } = await supabase
    .from("generated_images")
    .insert({
      selections_hash: selectionsHash,
      selections_json: selectionsJson,
      image_path: "__pending__",
      step_photo_id: stepPhotoId,
      org_id: orgId,
      step_id: stepId,
    });

  if (error) {
    if (error.code === "23505") return "in_progress";
    console.error("[generate/photo] Claim slot failed:", error);
    return "db_error";
  }
  return "claimed";
}

/**
 * Clean up a pending placeholder if generation fails, so retries can proceed.
 */
async function releaseGenerationSlot(
  supabase: ReturnType<typeof getServiceClient>,
  selectionsHash: string,
): Promise<void> {
  await supabase
    .from("generated_images")
    .delete()
    .eq("selections_hash", selectionsHash)
    .eq("image_path", "__pending__");
}

/**
 * Multi-tenant per-photo generation route.
 * SM demo uses the original /api/generate route — this is for orgs with step_photos.
 */
export async function POST(request: Request) {
  try {
    const { orgSlug, floorplanSlug, stepPhotoId, selections, sessionId, model, retry } = await request.json();

    if (!orgSlug || !floorplanSlug || !stepPhotoId || !selections || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // --- Validate ownership chain: org → floorplan → step → step_photo, session → org/floorplan ---
    const org = await getOrgBySlug(orgSlug);
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const floorplan = await getFloorplan(org.id, floorplanSlug);
    if (!floorplan) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const aiConfig = await getStepPhotoAiConfig(stepPhotoId);
    if (!aiConfig || aiConfig.orgId !== org.id || aiConfig.floorplanId !== floorplan.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Validate session ownership
    const { data: session } = await supabase
      .from("buyer_sessions")
      .select("id, org_id, floorplan_id, generation_count")
      .eq("id", sessionId)
      .single();

    if (!session || session.org_id !== org.id || session.floorplan_id !== floorplan.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // --- Server-side per-photo selection scoping ---
    // If the photo declares subcategoryIds, only allow those + step's alsoIncludeIds
    let scopedSelections = selections;
    if (aiConfig.photo.subcategoryIds?.length) {
      const allowedIds = new Set([
        ...aiConfig.photo.subcategoryIds,
        ...aiConfig.alsoIncludeIds,
      ]);
      scopedSelections = Object.fromEntries(
        Object.entries(selections as Record<string, string>).filter(([key]) => allowedIds.has(key))
      );
    }

    const modelName = (typeof model === "string" && model) ? model : IMAGE_MODEL;
    const optionLookup = await getOptionLookup(org.id);
    const promptContextSignature = buildPromptContextSignature(aiConfig, scopedSelections, optionLookup);
    const dbPolicy = await getStepPhotoGenerationPolicy(org.id, stepPhotoId);
    const resolvedPolicy = resolvePhotoGenerationPolicy({
      orgSlug,
      floorplanSlug,
      stepSlug: aiConfig.stepSlug,
      stepPhotoId,
      imagePath: aiConfig.photo.imagePath,
      modelName,
      selections: scopedSelections,
    }, dbPolicy);
    const selectionsHash = hashSelections({
      ...scopedSelections,
      _stepPhotoId: stepPhotoId,
      _model: modelName,
      _cacheVersion: GENERATION_CACHE_VERSION,
      _promptPolicy: resolvedPolicy.policyKey,
      _promptContext: promptContextSignature,
    });

    // --- Retry: delete existing cached image so we regenerate fresh ---
    if (retry) {
      await supabase
        .from("generated_images")
        .delete()
        .eq("selections_hash", selectionsHash)
        .neq("image_path", "__pending__");
    }

    // --- Cache check (skip __pending__ placeholder rows) ---
    const { data: cached } = await supabase
      .from("generated_images")
      .select("id, image_path")
      .eq("step_photo_id", stepPhotoId)
      .eq("selections_hash", selectionsHash)
      .neq("image_path", "__pending__")
      .single();

    if (cached?.image_path) {
      const { data: { publicUrl } } = supabase.storage
        .from("generated-images")
        .getPublicUrl(cached.image_path);

      return NextResponse.json({
        imageUrl: publicUrl,
        cacheHit: true,
        generatedImageId: String(cached.id),
        creditsUsed: session.generation_count,
        creditsTotal: org.generation_cap_per_session ?? 20,
      });
    }

    // --- Double-click guard via DB placeholder row (cross-instance safe) ---
    const selectionsJsonForClaim = {
      ...scopedSelections,
      _stepPhotoId: stepPhotoId,
      _model: modelName,
      _cacheVersion: GENERATION_CACHE_VERSION,
      _promptPolicy: resolvedPolicy.policyKey,
      _promptContext: promptContextSignature,
    };
    const claimResult = await claimGenerationSlot(supabase, selectionsHash, stepPhotoId, org.id, aiConfig.stepId, selectionsJsonForClaim);
    if (claimResult === "in_progress") {
      return NextResponse.json(
        { error: "This combination is already being generated", selectionsHash },
        { status: 429 }
      );
    }
    if (claimResult === "db_error") {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    // Everything below has claimed the slot — release it on any failure
    try {

    // --- Pre-check credit availability (non-mutating) ---
    const cap = org.generation_cap_per_session ?? 20;
    if (session.generation_count >= cap) {
      await releaseGenerationSlot(supabase, selectionsHash);
      return NextResponse.json({
        error: "cap_reached",
        creditsUsed: cap,
        creditsTotal: cap,
      }, { status: 429 });
    }

    // --- Load hero image from Supabase Storage ---
    const { data: imageData, error: downloadErr } = await supabase.storage
      .from("rooms")
      .download(aiConfig.photo.imagePath);

    if (downloadErr || !imageData) {
      await releaseGenerationSlot(supabase, selectionsHash);
      return NextResponse.json({ error: "Failed to load base photo" }, { status: 500 });
    }

    const imageBuffer = Buffer.from(await imageData.arrayBuffer());
    const heroExt = aiConfig.photo.imagePath.split(".").pop()?.toLowerCase() || "webp";
    const heroMime = heroExt === "jpg" ? "image/jpeg" : `image/${heroExt}`;
    const heroFilename = aiConfig.photo.imagePath.split("/").pop() || "room.webp";

    // --- Build swatch resolver for Supabase Storage ---
    const resolveSwatchBuffer: SwatchBufferResolver = async (swatchUrl: string) => {
      let storagePath = swatchUrl;
      if (swatchUrl.startsWith("http")) {
        const match = swatchUrl.match(/\/object\/public\/swatches\/(.+)$/);
        if (match) storagePath = match[1];
        else return null;
      }
      if (storagePath.startsWith("/swatches/")) storagePath = storagePath.slice("/swatches/".length);

      const { data: swatchData, error: swatchErr } = await supabase.storage
        .from("swatches")
        .download(storagePath);

      if (swatchErr || !swatchData) return null;

      const buffer = Buffer.from(await swatchData.arrayBuffer());
      const ext = storagePath.split(".").pop()?.toLowerCase() || "png";
      const mediaType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
      return { buffer, mediaType };
    };

    // --- Build prompt ---
    const spatialHints = { ...aiConfig.spatialHints };
    const sceneDescription = buildSceneDescription(aiConfig);
    const photoSpatialHint = aiConfig.photo.spatialHint;

    const { prompt, swatches } = await buildEditPrompt(
      scopedSelections,
      optionLookup,
      spatialHints,
      sceneDescription,
      photoSpatialHint,
      resolveSwatchBuffer,
      resolvedPolicy.promptOverrides,
    );

    // --- Generate image (filter out unsupported formats like SVG) ---
    const supportedSwatches = swatches.filter((s) => {
      const supported = ["image/jpeg", "image/png", "image/webp"];
      return supported.includes(s.mediaType);
    });

    const inputImages = [
      await toFile(imageBuffer, heroFilename, { type: heroMime }),
      ...await Promise.all(
        supportedSwatches.map((s) => {
          const ext = s.mediaType.split("/")[1] || "png";
          const filename = `${s.label.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
          return toFile(s.buffer, filename, { type: s.mediaType });
        })
      ),
    ];

    console.log(`[generate/photo] Sending ${inputImages.length} images to ${modelName} for photo ${stepPhotoId}`);

    const genStart = performance.now();
    const result = await openai.images.edit({
      model: modelName,
      image: inputImages,
      prompt,
      quality: "high",
      size: "1536x1024",
      input_fidelity: "high",
    });

    const generatedData = result.data?.[0];
    if (!generatedData?.b64_json) {
      await releaseGenerationSlot(supabase, selectionsHash);
      return NextResponse.json({ error: "No image was generated" }, { status: 500 });
    }

    let outputBuffer = Buffer.from(generatedData.b64_json, "base64");
    let promptForStorage = prompt;
    let passes = 1;

    if (resolvedPolicy.secondPass) {
      try {
        const secondPassInput = [
          await toFile(outputBuffer, "first-pass.png", { type: "image/png" }),
        ];
        console.log(
          `[generate/photo] Running second pass (${resolvedPolicy.secondPass.reason}) for photo ${stepPhotoId}`,
        );
        const secondPassResult = await openai.images.edit({
          model: modelName,
          image: secondPassInput,
          prompt: resolvedPolicy.secondPass.prompt,
          quality: "high",
          size: "1536x1024",
          input_fidelity: resolvedPolicy.secondPass.inputFidelity,
        });
        const secondPassData = secondPassResult.data?.[0];
        if (secondPassData?.b64_json) {
          outputBuffer = Buffer.from(secondPassData.b64_json, "base64");
          promptForStorage = `${prompt}\n\nSECOND_PASS (${resolvedPolicy.secondPass.reason}):\n${resolvedPolicy.secondPass.prompt}`;
          passes = 2;
        } else {
          console.warn(
            `[generate/photo] Second pass produced no image for photo ${stepPhotoId}; keeping first-pass output.`,
          );
        }
      } catch (secondPassError) {
        console.warn(
          `[generate/photo] Second pass failed for photo ${stepPhotoId}; keeping first-pass output.`,
          secondPassError,
        );
      }
    }
    const genDuration = Math.round(performance.now() - genStart);

    await captureAiEvent(sessionId, {
      provider: "openai",
      model: modelName,
      route: "/api/generate/photo",
      duration_ms: genDuration,
      cost_usd: estimateOpenAICost(modelName, passes),
      orgId: org.id,
      orgSlug,
      image_size: "1536x1024",
      image_quality: "high",
      second_pass: passes > 1,
    });

    // --- Reserve credit AFTER successful generation (prevents credit leak on failure) ---
    const { data: newCount } = await supabase.rpc("reserve_generation_credit", {
      p_session_id: sessionId,
      p_org_id: org.id,
    });

    // If cap was reached between pre-check and now, still save the image (we already generated it)
    // but report the actual credit state
    const creditsUsed = newCount ?? cap;

    // --- Upload to Storage ---
    const outputPath = `${org.id}/${selectionsHash}.png`;

    const { error: uploadError } = await supabase.storage
      .from("generated-images")
      .upload(outputPath, outputBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("[generate/photo] Storage upload failed:", uploadError);
      await releaseGenerationSlot(supabase, selectionsHash);
      return NextResponse.json({
        imageUrl: `data:image/png;base64,${outputBuffer.toString("base64")}`,
        cacheHit: false,
        creditsUsed,
        creditsTotal: cap,
        warning: "Image was not cached due to storage upload failure",
      });
    }

    // --- Cache the result (upsert replaces the __pending__ placeholder) ---
    const selectionsFingerprint = hashSelections(scopedSelections);
    const { data: upserted, error: upsertError } = await supabase
      .from("generated_images")
      .upsert({
        selections_hash: selectionsHash,
        selections_json: {
          ...scopedSelections,
          _stepPhotoId: stepPhotoId,
          _model: modelName,
          _cacheVersion: GENERATION_CACHE_VERSION,
          _promptPolicy: resolvedPolicy.policyKey,
          _promptContext: promptContextSignature,
        },
        image_path: outputPath,
        prompt: promptForStorage,
        step_id: aiConfig.stepId,
        step_photo_id: stepPhotoId,
        buyer_session_id: sessionId,
        selections_fingerprint: selectionsFingerprint,
        model: modelName,
        org_id: org.id,
      }, { onConflict: "selections_hash" })
      .select("id")
      .single();

    if (upsertError) {
      console.error("[generate/photo] DB upsert failed:", upsertError);
    }

    const { data: { publicUrl } } = supabase.storage
      .from("generated-images")
      .getPublicUrl(outputPath);

    return NextResponse.json({
      imageUrl: publicUrl,
      cacheHit: false,
      generatedImageId: upserted ? String(upserted.id) : null,
      creditsUsed,
      creditsTotal: cap,
    });

    } catch (genError) {
      // Generation failed — release the placeholder so retries can proceed
      await releaseGenerationSlot(supabase, selectionsHash);
      throw genError;
    }
  } catch (error) {
    console.error("[generate/photo] Error:", error);
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
  }
}
