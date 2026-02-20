import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { invalidateOrgCache } from "@/lib/admin-cache";
import { getServiceClient } from "@/lib/supabase";

const sectionSchema = z.object({
  title: z.string(),
  subcategory_ids: z.array(z.string()),
  sort_order: z.number().int(),
});

const updateSchema = z.object({
  org_id: z.string(),
  name: z.string().min(1).optional(),
  subtitle: z.string().nullable().optional(),
  number: z.number().int().optional(),
  show_generate_button: z.boolean().optional(),
  scene_description: z.string().nullable().optional(),
  also_include_ids: z.array(z.string()).optional(),
  sections: z.array(sectionSchema).optional(),
  sort_order: z.number().int().optional(),
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
    const { name, subtitle, number, show_generate_button, scene_description, also_include_ids, sections, sort_order } = parsed.data;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (subtitle !== undefined) updates.subtitle = subtitle;
    if (number !== undefined) updates.number = number;
    if (show_generate_button !== undefined) updates.show_generate_button = show_generate_button;
    if (scene_description !== undefined) updates.scene_description = scene_description;
    if (also_include_ids !== undefined) updates.also_include_ids = also_include_ids;
    if (sections !== undefined) updates.sections = sections;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    const { data, error } = await supabase
      .from("steps")
      .update(updates)
      .eq("id", id)
      .eq("org_id", orgId)
      .select("*, floorplan_id")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: status === 404 ? "Not found" : error.message }, { status });
    }

    invalidateOrgCache(orgId, { floorplanId: data.floorplan_id });
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

    // Get floorplan_id for cache invalidation + fetch photos for cleanup
    const { data: step } = await supabase
      .from("steps")
      .select("floorplan_id")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (!step) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch step_photos for storage cleanup
    const { data: photos } = await supabase
      .from("step_photos")
      .select("image_path")
      .eq("step_id", id)
      .eq("org_id", orgId);

    // Delete step row (CASCADE deletes step_photos)
    const { error } = await supabase
      .from("steps")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Delete storage files (best-effort)
    if (photos && photos.length > 0) {
      const serviceClient = getServiceClient();
      const paths = photos.map((p) => p.image_path);
      await serviceClient.storage.from("rooms").remove(paths).catch((err: unknown) => {
        console.error("[step-delete] Storage cleanup error:", err);
      });
    }

    invalidateOrgCache(orgId, { floorplanId: step.floorplan_id });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
