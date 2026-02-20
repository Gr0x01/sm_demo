import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminCategory, AdminStep, AdminStepPhoto } from "@/types";

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
 * Fetches steps for a floorplan with photo count per step.
 */
export async function getAdminStepsForFloorplan(
  supabase: SupabaseClient,
  floorplanId: string,
  orgId: string
): Promise<(AdminStep & { photo_count: number })[]> {
  const { data: steps, error } = await supabase
    .from("steps")
    .select(`
      id, slug, org_id, floorplan_id, number, name, subtitle,
      hero_image, hero_variant, show_generate_button,
      scene_description, also_include_ids, photo_baseline,
      spatial_hints, sort_order, sections,
      step_photos ( id )
    `)
    .eq("floorplan_id", floorplanId)
    .eq("org_id", orgId)
    .order("sort_order");

  if (error || !steps) return [];

  return steps.map((s) => ({
    ...s,
    sections: (s.sections as AdminStep["sections"]) ?? [],
    also_include_ids: s.also_include_ids ?? [],
    photo_count: Array.isArray(s.step_photos) ? s.step_photos.length : 0,
    step_photos: undefined,
  }));
}

/**
 * Fetches steps with nested step_photos for a floorplan.
 */
export async function getAdminStepPhotos(
  supabase: SupabaseClient,
  floorplanId: string,
  orgId: string
): Promise<(AdminStep & { step_photos: AdminStepPhoto[] })[]> {
  const { data: steps, error } = await supabase
    .from("steps")
    .select(`
      id, slug, org_id, floorplan_id, number, name, subtitle,
      hero_image, hero_variant, show_generate_button,
      scene_description, also_include_ids, photo_baseline,
      spatial_hints, sort_order, sections,
      step_photos (
        id, step_id, org_id, image_path, label, is_hero,
        sort_order, check_result, check_feedback, check_raw_response,
        checked_at, spatial_hint, photo_baseline, created_at
      )
    `)
    .eq("floorplan_id", floorplanId)
    .eq("org_id", orgId)
    .order("sort_order");

  if (error || !steps) return [];

  return steps.map((s) => ({
    ...s,
    sections: (s.sections as AdminStep["sections"]) ?? [],
    also_include_ids: s.also_include_ids ?? [],
    step_photos: ((s.step_photos as AdminStepPhoto[]) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order
    ),
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
