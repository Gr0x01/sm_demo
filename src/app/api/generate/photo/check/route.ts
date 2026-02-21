import { NextResponse } from "next/server";
import { buildPromptContextSignature, GENERATION_CACHE_VERSION, hashSelections } from "@/lib/generate";
import { getServiceClient } from "@/lib/supabase";
import { getOrgBySlug, getFloorplan, getStepPhotoAiConfig, getStepPhotoGenerationPolicy, getOptionLookup } from "@/lib/db-queries";
import { resolvePhotoGenerationPolicy } from "@/lib/photo-generation-policy";
import { IMAGE_MODEL } from "@/lib/models";

/**
 * Multi-tenant per-photo cache check.
 *
 * Two modes:
 * 1. Fast poll mode: pass `selectionsHash` directly (skips re-derivation, single DB query)
 * 2. Full mode: pass orgSlug/floorplanSlug/stepPhotoId/selections (derives hash from scratch)
 *
 * Returns:
 * - status: "complete" + imageUrl when cached result exists
 * - status: "pending" when __pending__ placeholder exists (generation in progress)
 * - status: "not_found" when no row exists (generation failed or never started)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getServiceClient();

    // Fast path: selectionsHash provided directly (used by polling after 429).
    // No ownership validation needed: hash is unguessable (SHA-256 of selections +
    // internal keys) and the result is a public storage URL.
    let hash: string | null = typeof body.selectionsHash === "string" ? body.selectionsHash : null;

    if (!hash) {
      // Full path: derive hash from inputs (used by initial cache restore)
      const { orgSlug, floorplanSlug, stepPhotoId, selections, model } = body;
      if (!orgSlug || !floorplanSlug || !stepPhotoId || !selections) {
        return NextResponse.json({ status: "not_found", imageUrl: null });
      }

      const org = await getOrgBySlug(orgSlug);
      if (!org) return NextResponse.json({ status: "not_found", imageUrl: null });

      const floorplan = await getFloorplan(org.id, floorplanSlug);
      if (!floorplan) return NextResponse.json({ status: "not_found", imageUrl: null });

      const aiConfig = await getStepPhotoAiConfig(stepPhotoId);
      if (!aiConfig || aiConfig.orgId !== org.id || aiConfig.floorplanId !== floorplan.id) {
        return NextResponse.json({ status: "not_found", imageUrl: null });
      }

      // Server-side per-photo selection scoping (mirrors generate route)
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
      hash = hashSelections({
        ...scopedSelections,
        _stepPhotoId: stepPhotoId,
        _model: modelName,
        _cacheVersion: GENERATION_CACHE_VERSION,
        _promptPolicy: resolvedPolicy.policyKey,
        _promptContext: promptContextSignature,
      });
    }

    // Single query: get the row regardless of pending state
    const { data: row, error: queryError } = await supabase
      .from("generated_images")
      .select("id, image_path")
      .eq("selections_hash", hash)
      .single();

    if (queryError) {
      // PGRST116 = "no rows returned" from .single() — genuine not_found
      // Anything else (timeout, RLS, connection) is transient
      if (queryError.code === "PGRST116") {
        return NextResponse.json({ status: "not_found", imageUrl: null });
      }
      return NextResponse.json({ status: "error", imageUrl: null });
    }

    if (!row) {
      return NextResponse.json({ status: "not_found", imageUrl: null });
    }

    if (row.image_path === "__pending__") {
      return NextResponse.json({ status: "pending", imageUrl: null });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("generated-images")
      .getPublicUrl(row.image_path);

    return NextResponse.json({
      status: "complete",
      imageUrl: publicUrl,
      generatedImageId: String(row.id),
    });
  } catch {
    // Transient error (DB hiccup, timeout) — don't report as not_found
    // so polling clients keep retrying instead of treating it as terminal failure
    return NextResponse.json({ status: "error", imageUrl: null });
  }
}
