import { NextResponse } from "next/server";
import { GENERATION_CACHE_VERSION, hashSelections } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getOrgBySlug, getFloorplan, getStepPhotoAiConfig, getStepPhotoGenerationPolicy } from "@/lib/db-queries";
import { resolvePhotoGenerationPolicy } from "@/lib/photo-generation-policy";

function buildPromptContextSignature(aiConfig: Awaited<ReturnType<typeof getStepPhotoAiConfig>>): string {
  if (!aiConfig) return "";
  const sortedSpatialHints = Object.entries(aiConfig.spatialHints ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
  return [
    `scene:${aiConfig.sceneDescription ?? ""}`,
    `photoBaseline:${aiConfig.photo.photoBaseline ?? ""}`,
    `photoSpatialHint:${aiConfig.photo.spatialHint ?? ""}`,
    `spatialHints:${sortedSpatialHints}`,
  ].join("||");
}

/**
 * Multi-tenant per-photo cache check.
 * Returns cached imageUrl if available, null otherwise.
 */
export async function POST(request: Request) {
  try {
    const { orgSlug, floorplanSlug, stepPhotoId, selections, model } = await request.json();

    if (!orgSlug || !floorplanSlug || !stepPhotoId || !selections) {
      return NextResponse.json({ imageUrl: null });
    }

    // Validate ownership chain
    const org = await getOrgBySlug(orgSlug);
    if (!org) return NextResponse.json({ imageUrl: null });

    const floorplan = await getFloorplan(org.id, floorplanSlug);
    if (!floorplan) return NextResponse.json({ imageUrl: null });

    const aiConfig = await getStepPhotoAiConfig(stepPhotoId);
    if (!aiConfig || aiConfig.orgId !== org.id || aiConfig.floorplanId !== floorplan.id) {
      return NextResponse.json({ imageUrl: null });
    }

    const modelName = (typeof model === "string" && model) ? model : "gpt-image-1.5";
    const promptContextSignature = buildPromptContextSignature(aiConfig);
    const dbPolicy = await getStepPhotoGenerationPolicy(org.id, stepPhotoId);
    const resolvedPolicy = resolvePhotoGenerationPolicy({
      orgSlug,
      floorplanSlug,
      stepSlug: aiConfig.stepSlug,
      stepPhotoId,
      imagePath: aiConfig.photo.imagePath,
      modelName,
      selections,
    }, dbPolicy);
    const selectionsHash = hashSelections({
      ...selections,
      _stepPhotoId: stepPhotoId,
      _model: modelName,
      _cacheVersion: GENERATION_CACHE_VERSION,
      _promptPolicy: resolvedPolicy.policyKey,
      _promptContext: promptContextSignature,
    });

    const supabase = getServiceClient();
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
        generatedImageId: String(cached.id),
      });
    }

    return NextResponse.json({ imageUrl: null });
  } catch {
    return NextResponse.json({ imageUrl: null });
  }
}
