import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { invalidateOrgCache } from "@/lib/admin-cache";

const createSchema = z.object({
  org_id: z.string(),
  step_id: z.string(),
  image_path: z.string().min(1),
  label: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const auth = await authenticateAdminRequest(body);
    if ("error" in auth) return auth.error;

    const { supabase, orgId } = auth;
    const { step_id, image_path, label } = parsed.data;

    // Verify image_path matches expected format: {orgId}/rooms/{stepId}/{filename}
    const expectedPrefix = `${orgId}/rooms/${step_id}/`;
    if (!image_path.startsWith(expectedPrefix) || image_path.includes("..") || image_path.includes("//")) {
      return NextResponse.json({ error: "Invalid image path" }, { status: 400 });
    }

    // Verify step belongs to org
    const { data: step, error: stepErr } = await supabase
      .from("steps")
      .select("id, floorplan_id")
      .eq("id", step_id)
      .eq("org_id", orgId)
      .single();

    if (stepErr || !step) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    // Get current max sort_order for this step
    const { data: maxSort } = await supabase
      .from("step_photos")
      .select("sort_order")
      .eq("step_id", step_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from("step_photos")
      .insert({
        step_id,
        org_id: orgId,
        image_path,
        label: label || "",
        sort_order: (maxSort?.sort_order ?? -1) + 1,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    invalidateOrgCache(orgId, { floorplanId: step.floorplan_id });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
