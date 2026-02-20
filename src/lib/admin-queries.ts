import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminCategory } from "@/types";

/**
 * Fetches the full category → subcategory → option tree for admin views.
 * Receives the user-scoped Supabase client (RLS enforced).
 * No caching — admin always sees live data.
 */
export async function getAdminOptionTree(
  supabase: SupabaseClient,
  orgId: string
): Promise<AdminCategory[]> {
  const { data: cats, error } = await supabase
    .from("categories")
    .select(`
      id, slug, org_id, name, sort_order,
      subcategories (
        id, slug, category_id, org_id, name, is_visual, is_additive, unit_label, max_quantity, sort_order, floorplan_ids,
        options ( id, slug, subcategory_id, org_id, name, price, description, prompt_descriptor, swatch_url, swatch_color, nudge, is_default, sort_order, floorplan_ids )
      )
    `)
    .eq("org_id", orgId)
    .order("sort_order");

  if (error || !cats) return [];

  return (cats as AdminCategory[]).map((cat) => ({
    ...cat,
    subcategories: (cat.subcategories ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((sub) => ({
        ...sub,
        options: (sub.options ?? []).sort((a, b) => a.sort_order - b.sort_order),
      })),
  }));
}

/**
 * Fetches floorplans for an org (used in scope UI).
 */
export async function getAdminFloorplans(
  supabase: SupabaseClient,
  orgId: string
) {
  const { data, error } = await supabase
    .from("floorplans")
    .select("id, name, slug, community, is_active")
    .eq("org_id", orgId)
    .order("name");

  if (error || !data) return [];
  return data;
}
