import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { invalidateOrgCache } from "@/lib/admin-cache";
import { slugify } from "@/lib/slugify";

const createSchema = z.object({
  org_id: z.string(),
  subcategory_id: z.string(),
  name: z.string().min(1),
  price: z.number().int().default(0),
  description: z.string().nullable().optional(),
  prompt_descriptor: z.string().nullable().optional(),
  swatch_url: z.string().nullable().optional(),
  swatch_color: z.string().nullable().optional(),
  nudge: z.string().nullable().optional(),
  is_default: z.boolean().optional(),
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
    const { subcategory_id, name, price, description, prompt_descriptor, swatch_url, swatch_color, nudge, is_default, sort_order } = parsed.data;
    const baseSlug = slugify(name);

    const { data: uniqueSlug, error: slugError } = await supabase.rpc("generate_unique_slug", {
      p_table: "options",
      p_base_slug: baseSlug,
      p_scope_column: "org_id",
      p_scope_value: orgId,
    });
    if (slugError) return NextResponse.json({ error: "Failed to generate slug" }, { status: 500 });

    const { data, error } = await supabase
      .from("options")
      .insert({
        slug: uniqueSlug ?? baseSlug,
        org_id: orgId,
        subcategory_id,
        name,
        price,
        description: description ?? null,
        prompt_descriptor: prompt_descriptor ?? null,
        swatch_url: swatch_url ?? null,
        swatch_color: swatch_color ?? null,
        nudge: nudge ?? null,
        is_default: is_default ?? false,
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
