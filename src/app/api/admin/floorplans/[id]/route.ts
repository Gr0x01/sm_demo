import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { invalidateOrgCache } from "@/lib/admin-cache";
import { getServiceClient } from "@/lib/supabase";

const updateSchema = z.object({
  org_id: z.string(),
  name: z.string().min(1).optional(),
  community: z.string().nullable().optional(),
  price_sheet_label: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  cover_image_path: z.string().nullable().optional(),
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
    const { name, community, price_sheet_label, is_active, cover_image_path } = parsed.data;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (community !== undefined) updates.community = community;
    if (price_sheet_label !== undefined) updates.price_sheet_label = price_sheet_label;
    if (is_active !== undefined) updates.is_active = is_active;
    if (cover_image_path !== undefined) {
      // Validate path is scoped to this org (prevent cross-org references)
      if (cover_image_path !== null && !cover_image_path.startsWith(`${orgId}/`)) {
        return NextResponse.json({ error: "Invalid cover image path" }, { status: 400 });
      }
      updates.cover_image_path = cover_image_path;
    }

    const { data, error } = await supabase
      .from("floorplans")
      .update(updates)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: status === 404 ? "Not found" : error.message }, { status });
    }

    invalidateOrgCache(orgId, { floorplanSlug: data.slug });
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

    // Fetch floorplan slug + cover image for cleanup before deleting
    const { data: fp } = await supabase
      .from("floorplans")
      .select("slug, cover_image_path")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (!fp) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch step_photos image_paths for storage cleanup
    const { data: stepRows } = await supabase
      .from("steps")
      .select("id")
      .eq("floorplan_id", id)
      .eq("org_id", orgId);

    const stepIds = stepRows?.map((s) => s.id) ?? [];

    if (stepIds.length > 0) {
      const { data: photos } = await supabase
        .from("step_photos")
        .select("image_path")
        .eq("org_id", orgId)
        .in("step_id", stepIds);

      // Delete storage files (best-effort)
      if (photos && photos.length > 0) {
        const serviceClient = getServiceClient();
        const paths = photos.map((p) => p.image_path);
        await serviceClient.storage.from("rooms").remove(paths).catch((err: unknown) => {
          console.error("[floorplan-delete] Storage cleanup error:", err);
        });
      }
    }

    // Clean up cover image from storage (best-effort)
    if (fp.cover_image_path) {
      const serviceClient = getServiceClient();
      await serviceClient.storage.from("rooms").remove([fp.cover_image_path]).catch((err: unknown) => {
        console.error("[floorplan-delete] Cover image cleanup error:", err);
      });
    }

    // Delete floorplan row (CASCADE handles steps + step_photos)
    const { error } = await supabase
      .from("floorplans")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    invalidateOrgCache(orgId, { floorplanId: id, floorplanSlug: fp.slug });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
