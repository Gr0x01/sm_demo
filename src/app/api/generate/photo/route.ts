import { NextResponse } from "next/server";
import { buildPromptContextSignature, GENERATION_CACHE_VERSION, hashSelections } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getStepPhotoAiConfig, getStepPhotoGenerationPolicy, getOptionLookup, getOrgBySlug, getFloorplan } from "@/lib/db-queries";
import { resolvePhotoGenerationPolicy } from "@/lib/photo-generation-policy";
import { IMAGE_MODEL } from "@/lib/models";
import { resolveScopedFlooringSelections } from "@/lib/flooring-selection";
import { getEffectivePhotoScopedIds, normalizePrimaryAccentAsWallPaint } from "@/lib/photo-scope";
import { inngest } from "@/inngest/client";

export const maxDuration = 30;

function buildSceneDescription(aiConfig: NonNullable<Awaited<ReturnType<typeof getStepPhotoAiConfig>>>): string | null {
  // Per-photo baseline text is the authoritative scene context when present.
  if (aiConfig.photo.photoBaseline?.trim()) return aiConfig.photo.photoBaseline.trim();
  if (aiConfig.sceneDescription?.trim()) return aiConfig.sceneDescription.trim();
  return null;
}

function filterSpatialHints(
  spatialHints: Record<string, string>,
  allowedIds: Set<string> | null,
): Record<string, string> {
  if (!allowedIds) return { ...spatialHints };
  return Object.fromEntries(
    Object.entries(spatialHints).filter(([key]) => allowedIds.has(key)),
  );
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
 * Clean up a pending placeholder if Inngest event send fails.
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
 * Validates, claims slot, then dispatches to Inngest for background generation.
 * Client polls /api/generate/photo/check (existing pattern).
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
      .select("id, org_id, floorplan_id")
      .eq("id", sessionId)
      .single();

    if (!session || session.org_id !== org.id || session.floorplan_id !== floorplan.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // --- Server-side per-photo selection scoping ---
    // If a photo declares subcategoryIds, that list is the full scope.
    const photoScopedIds = getEffectivePhotoScopedIds(aiConfig.photo.subcategoryIds, {
      stepSlug: aiConfig.stepSlug,
      imagePath: aiConfig.photo.imagePath,
    });
    let scopedSelections = selections as Record<string, string>;
    if (photoScopedIds) {
      scopedSelections = Object.fromEntries(
        Object.entries(scopedSelections).filter(([key]) => photoScopedIds.has(key)),
      );
    }
    const flooringContextText = [
      aiConfig.photo.photoBaseline ?? "",
      aiConfig.photo.spatialHint ?? "",
      aiConfig.sceneDescription ?? "",
    ].join("\n");
    scopedSelections = resolveScopedFlooringSelections(scopedSelections, flooringContextText);
    scopedSelections = normalizePrimaryAccentAsWallPaint(scopedSelections, {
      stepSlug: aiConfig.stepSlug,
      imagePath: aiConfig.photo.imagePath,
    });
    const spatialHints = filterSpatialHints(aiConfig.spatialHints, photoScopedIds);
    const sceneDescription = buildSceneDescription(aiConfig);

    const modelName = (typeof model === "string" && model) ? model : IMAGE_MODEL;
    const optionLookup = await getOptionLookup(org.id);
    const promptContextSignature = buildPromptContextSignature({
      sceneDescription,
      spatialHints,
      photo: {
        photoBaseline: aiConfig.photo.photoBaseline,
        spatialHint: aiConfig.photo.spatialHint,
      },
    }, scopedSelections, optionLookup);
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
    const selectionsFingerprint = hashSelections(scopedSelections);

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

    // --- Dispatch to Inngest for background generation ---
    try {
      await inngest.send({
        name: "photo/generate.requested",
        data: {
          selectionsHash,
          selectionsFingerprint,
          orgId: org.id,
          orgSlug,
          floorplanSlug,
          stepPhotoId,
          stepId: aiConfig.stepId,
          sessionId,
          scopedSelections,
          modelName,
          resolvedPolicy,
          sceneDescription,
          spatialHints,
          photoSpatialHint: aiConfig.photo.spatialHint,
          selectionsJsonForClaim,
          promptContextSignature,
        },
      });
    } catch (sendError) {
      console.error("[generate/photo] Inngest send failed:", sendError);
      await releaseGenerationSlot(supabase, selectionsHash);
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { selectionsHash },
      { status: 202 }
    );
  } catch (error) {
    console.error("[generate/photo] Error:", error);
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
  }
}
