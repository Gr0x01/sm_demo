import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { invalidateOrgCache } from "@/lib/admin-cache";
import { slugify } from "@/lib/slugify";

const SKELETON_STEPS = [
  "Set Your Style",
  "Design Your Kitchen",
  "Primary Bath",
  "Secondary Spaces",
  "Finishing Touches",
];

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

    // Insert skeleton steps (non-fatal)
    for (let i = 0; i < SKELETON_STEPS.length; i++) {
      try {
        const stepName = SKELETON_STEPS[i];
        const stepBaseSlug = slugify(stepName);
        const { data: stepSlug } = await supabase.rpc("generate_unique_slug", {
          p_table: "steps",
          p_base_slug: stepBaseSlug,
          p_scope_column: "floorplan_id",
          p_scope_value: data.id,
        });
        const { error: insertErr } = await supabase.from("steps").insert({
          slug: stepSlug ?? stepBaseSlug,
          org_id: orgId,
          floorplan_id: data.id,
          name: stepName,
          number: i + 1,
          sort_order: i,
          show_generate_button: false,
          sections: [],
        });
        if (insertErr) {
          console.error(`[floorplan-create] Failed to insert skeleton step ${i}:`, insertErr);
        }
      } catch (stepErr) {
        console.error(`[floorplan-create] Failed to insert skeleton step ${i}:`, stepErr);
      }
    }

    invalidateOrgCache(orgId, { floorplanId: data.id });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
