import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { invalidateOrgCache } from "@/lib/admin-cache";
import { slugify } from "@/lib/slugify";

const createSchema = z.object({
  org_id: z.string(),
  category_id: z.string(),
  name: z.string().min(1),
  is_visual: z.boolean().optional(),
  is_additive: z.boolean().optional(),
  unit_label: z.string().nullable().optional(),
  max_quantity: z.number().int().nullable().optional(),
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
    const { category_id, name, is_visual, is_additive, unit_label, max_quantity, sort_order } = parsed.data;
    const baseSlug = slugify(name);

    const { data: uniqueSlug, error: slugError } = await supabase.rpc("generate_unique_slug", {
      p_table: "subcategories",
      p_base_slug: baseSlug,
      p_scope_column: "org_id",
      p_scope_value: orgId,
    });
    if (slugError) return NextResponse.json({ error: "Failed to generate slug" }, { status: 500 });

    const { data, error } = await supabase
      .from("subcategories")
      .insert({
        slug: uniqueSlug ?? baseSlug,
        org_id: orgId,
        category_id,
        name,
        is_visual: is_visual ?? false,
        is_additive: is_additive ?? false,
        unit_label: unit_label ?? null,
        max_quantity: max_quantity ?? null,
        sort_order: sort_order ?? 0,
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
