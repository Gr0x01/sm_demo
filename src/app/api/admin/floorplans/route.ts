import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { invalidateOrgCache } from "@/lib/admin-cache";
import { slugify } from "@/lib/slugify";

const createSchema = z.object({
  org_id: z.string(),
  name: z.string().min(1),
  community: z.string().optional(),
  price_sheet_label: z.string().optional(),
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
    const { name, community, price_sheet_label } = parsed.data;
    const baseSlug = slugify(name);

    const { data: uniqueSlug, error: slugError } = await supabase.rpc("generate_unique_slug", {
      p_table: "floorplans",
      p_base_slug: baseSlug,
      p_scope_column: "org_id",
      p_scope_value: orgId,
    });
    if (slugError) return NextResponse.json({ error: "Failed to generate slug" }, { status: 500 });

    const { data, error } = await supabase
      .from("floorplans")
      .insert({
        slug: uniqueSlug ?? baseSlug,
        org_id: orgId,
        name,
        community: community || null,
        price_sheet_label: price_sheet_label || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    invalidateOrgCache(orgId);
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
