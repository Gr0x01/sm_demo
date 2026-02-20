import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { invalidateOrgCache } from "@/lib/admin-cache";
import { slugify } from "@/lib/slugify";

const createSchema = z.object({
  org_id: z.string(),
  floorplan_id: z.string(),
  name: z.string().min(1),
  number: z.number().int().optional(),
  sort_order: z.number().int().optional(),
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
    const { floorplan_id, name, number, sort_order } = parsed.data;

    // Verify floorplan belongs to org
    const { data: fp, error: fpErr } = await supabase
      .from("floorplans")
      .select("id")
      .eq("id", floorplan_id)
      .eq("org_id", orgId)
      .single();

    if (fpErr || !fp) {
      return NextResponse.json({ error: "Floorplan not found" }, { status: 404 });
    }

    const baseSlug = slugify(name);
    const { data: uniqueSlug, error: slugError } = await supabase.rpc("generate_unique_slug", {
      p_table: "steps",
      p_base_slug: baseSlug,
      p_scope_column: "floorplan_id",
      p_scope_value: floorplan_id,
    });
    if (slugError) return NextResponse.json({ error: "Failed to generate slug" }, { status: 500 });

    const { data, error } = await supabase
      .from("steps")
      .insert({
        slug: uniqueSlug ?? baseSlug,
        org_id: orgId,
        floorplan_id,
        name,
        number: number ?? 1,
        sort_order: sort_order ?? 0,
        show_generate_button: false,
        sections: [],
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    invalidateOrgCache(orgId, { floorplanId: floorplan_id });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
