import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { invalidateOrgCache } from "@/lib/admin-cache";

const updateSchema = z.object({
  org_id: z.string(),
  name: z.string().min(1).optional(),
  price: z.number().int().optional(),
  description: z.string().nullable().optional(),
  prompt_descriptor: z.string().nullable().optional(),
  swatch_url: z.string().nullable().optional(),
  swatch_color: z.string().nullable().optional(),
  nudge: z.string().nullable().optional(),
  is_default: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  generation_rules: z.array(z.string().min(1).max(500)).max(20).nullable().optional(),
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
    const { org_id: _orgId, ...updates } = parsed.data;

    const { data, error } = await supabase
      .from("options")
      .update(updates)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: status === 404 ? "Not found" : error.message }, { status });
    }

    invalidateOrgCache(orgId);
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

    const { error } = await supabase
      .from("options")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    invalidateOrgCache(orgId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
