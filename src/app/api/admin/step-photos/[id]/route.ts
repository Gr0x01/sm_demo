import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { invalidateOrgCache } from "@/lib/admin-cache";
import { getServiceClient } from "@/lib/supabase";
import { getOptionLookup } from "@/lib/db-queries";
import { PromptProseError, validatePromptProse } from "@/lib/generate";

const promptProseSchema = z.object({
  version: z.literal(2),
  actions: z.record(z.string(), z.string()),
  lead: z.string().optional(),
  style: z.string().optional(),
  preserve: z.array(z.string()).optional(),
  mergedClauses: z
    .array(
      z.object({
        when: z.array(z.string()),
        clause: z.string(),
      }),
    )
    .optional(),
});

const updateSchema = z.object({
  org_id: z.string(),
  label: z.string().optional(),
  is_hero: z.boolean().optional(),
  spatial_hint: z.string().nullable().optional(),
  photo_baseline: z.string().nullable().optional(),
  subcategory_ids: z.array(z.string()).nullable().optional(),
  sort_order: z.number().int().optional(),
  prompt_prose: promptProseSchema.nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const auth = await authenticateAdminRequest(body);
    if ("error" in auth) return auth.error;

    const { supabase, orgId } = auth;
    const { label, is_hero, spatial_hint, photo_baseline, subcategory_ids, sort_order, prompt_prose } = parsed.data;

    // Validate prompt_prose structurally AND against coverage of the photo's
    // effective subcategory_ids. Save-time coverage enforcement prevents the
    // "active badge lies" failure mode where an author saves partial prose,
    // ships, and the photo silently falls back to the legacy builder at
    // generation time.
    if (prompt_prose) {
      try {
        const [optionLookup, existingPhoto] = await Promise.all([
          getOptionLookup(orgId),
          supabase
            .from("step_photos")
            .select("subcategory_ids")
            .eq("id", id)
            .eq("org_id", orgId)
            .single(),
        ]);
        if (existingPhoto.error || !existingPhoto.data) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        // The PATCH may be updating subcategory_ids in the same request —
        // validate against the incoming value if present, otherwise the stored one.
        const effectiveSubIds =
          subcategory_ids !== undefined
            ? subcategory_ids ?? []
            : ((existingPhoto.data.subcategory_ids as string[] | null) ?? []);
        validatePromptProse(prompt_prose, optionLookup, effectiveSubIds);
      } catch (err) {
        if (err instanceof PromptProseError) {
          return NextResponse.json({ error: err.message }, { status: 400 });
        }
        throw err;
      }
    }

    // If setting hero, do atomic swap via dedicated RPC
    if (is_hero === true) {
      const { data: photo } = await supabase
        .from("step_photos")
        .select("step_id")
        .eq("id", id)
        .eq("org_id", orgId)
        .single();

      if (!photo) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const { error: heroErr } = await supabase.rpc("swap_hero_photo", {
        p_photo_id: id,
        p_step_id: photo.step_id,
      });

      if (heroErr) {
        return NextResponse.json({ error: "Failed to set hero photo" }, { status: 500 });
      }
    }

    // Build updates for non-hero fields
    const updates: Record<string, unknown> = {};
    if (label !== undefined) updates.label = label;
    if (spatial_hint !== undefined) updates.spatial_hint = spatial_hint;
    if (photo_baseline !== undefined) updates.photo_baseline = photo_baseline;
    if (subcategory_ids !== undefined) updates.subcategory_ids = subcategory_ids;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (prompt_prose !== undefined) updates.prompt_prose = prompt_prose;
    if (is_hero === false) updates.is_hero = false;

    let data;
    if (Object.keys(updates).length > 0) {
      const result = await supabase
        .from("step_photos")
        .update(updates)
        .eq("id", id)
        .eq("org_id", orgId)
        .select()
        .single();

      if (result.error) {
        const status = result.error.code === "PGRST116" ? 404 : 500;
        return NextResponse.json({ error: status === 404 ? "Not found" : result.error.message }, { status });
      }
      data = result.data;
    } else {
      // Just return the updated photo (hero was set above)
      const result = await supabase
        .from("step_photos")
        .select()
        .eq("id", id)
        .eq("org_id", orgId)
        .single();

      if (result.error) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      data = result.data;
    }

    // Get floorplan_id for cache invalidation
    const { data: step } = await supabase
      .from("steps")
      .select("floorplan_id")
      .eq("id", data.step_id)
      .single();

    invalidateOrgCache(orgId, { floorplanId: step?.floorplan_id });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const auth = await authenticateAdminRequest(body);
    if ("error" in auth) return auth.error;

    const { supabase, orgId } = auth;

    // Fetch photo to get image_path and step_id
    const { data: photo } = await supabase
      .from("step_photos")
      .select("image_path, step_id")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (!photo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get floorplan_id for cache invalidation
    const { data: step } = await supabase
      .from("steps")
      .select("floorplan_id")
      .eq("id", photo.step_id)
      .single();

    // Delete DB row first
    const { error } = await supabase
      .from("step_photos")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Delete storage file (best-effort)
    const serviceClient = getServiceClient();
    await serviceClient.storage.from("rooms").remove([photo.image_path]).catch((err: unknown) => {
      console.error("[step-photo-delete] Storage cleanup error:", err);
    });

    invalidateOrgCache(orgId, { floorplanId: step?.floorplan_id });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
