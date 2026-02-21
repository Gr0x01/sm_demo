import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getServiceClient } from "./supabase";
import type { AdminCategory, AdminStep, AdminStepPhoto } from "@/types";

// Admin queries use service-role client + unstable_cache with org-scoped tags.
// Auth is already verified by getAuthenticatedUser() in each page/route before calling these.
// Mutations call invalidateOrgCache() to bust relevant tags.

const REVALIDATE = 86400; // 24h — mutations bust via tags

// ---------- Option Tree (categories → subcategories → options) ----------

const _getAdminOptionTree = async (orgId: string): Promise<AdminCategory[]> => {
  const supabase = getServiceClient();
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
};

export const getAdminOptionTree = cache((orgId: string) =>
  unstable_cache(_getAdminOptionTree, ["admin-option-tree", orgId], {
    revalidate: REVALIDATE,
    tags: [`admin:categories:${orgId}`],
  })(orgId)
);

// ---------- Steps for floorplan (with photo count) ----------

const _getAdminStepsForFloorplan = async (
  floorplanId: string,
  orgId: string
): Promise<(AdminStep & { photo_count: number; preview_image_path: string | null })[]> => {
  const supabase = getServiceClient();
  const { data: steps, error } = await supabase
    .from("steps")
    .select(`
      id, slug, org_id, floorplan_id, number, name, subtitle,
      hero_image, hero_variant, show_generate_button,
      scene_description, also_include_ids, photo_baseline,
      spatial_hints, sort_order, sections,
      step_photos ( id, image_path )
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
    preview_image_path:
      Array.isArray(s.step_photos) && s.step_photos.length > 0
        ? ((s.step_photos[0] as { image_path?: string }).image_path ?? null)
        : null,
    step_photos: undefined,
  }));
};

export const getAdminStepsForFloorplan = cache(
  (floorplanId: string, orgId: string) =>
    unstable_cache(
      _getAdminStepsForFloorplan,
      ["admin-steps", floorplanId, orgId],
      {
        revalidate: REVALIDATE,
        tags: [`admin:steps:${floorplanId}`],
      }
    )(floorplanId, orgId)
);

// ---------- Steps with nested photos ----------

const _getAdminStepPhotos = async (
  floorplanId: string,
  orgId: string
): Promise<(AdminStep & { step_photos: AdminStepPhoto[] })[]> => {
  const supabase = getServiceClient();
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
        checked_at, spatial_hint, photo_baseline, subcategory_ids, created_at
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
};

export const getAdminStepPhotos = cache(
  (floorplanId: string, orgId: string) =>
    unstable_cache(_getAdminStepPhotos, ["admin-step-photos", floorplanId, orgId], {
      revalidate: REVALIDATE,
      tags: [`admin:steps:${floorplanId}`],
    })(floorplanId, orgId)
);

// ---------- All steps for org (options page grouping) ----------

type StepSummary = {
  name: string;
  floorplan_name: string;
  floorplan_id: string;
  sort_order: number;
  sections: { subcategory_ids: string[] }[];
};

const _getAdminAllStepsForOrg = async (orgId: string): Promise<StepSummary[]> => {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("steps")
    .select("name, sort_order, floorplan_id, sections, floorplans!inner(name)")
    .eq("org_id", orgId)
    .order("sort_order");

  if (error || !data) return [];

  return data.map((s: Record<string, unknown>) => ({
    name: s.name as string,
    floorplan_name: (s.floorplans as { name: string }).name,
    floorplan_id: s.floorplan_id as string,
    sort_order: s.sort_order as number,
    sections: (s.sections as { subcategory_ids: string[] }[]) ?? [],
  }));
};

export const getAdminAllStepsForOrg = cache((orgId: string) =>
  unstable_cache(_getAdminAllStepsForOrg, ["admin-all-steps", orgId], {
    revalidate: REVALIDATE,
    tags: [`admin:steps-all:${orgId}`],
  })(orgId)
);

// ---------- Floorplans for org ----------

const _getAdminFloorplans = async (orgId: string) => {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("floorplans")
    .select(`
      id,
      name,
      slug,
      community,
      is_active,
      cover_image_path,
      created_at,
      steps (
        id,
        step_photos ( id )
      )
    `)
    .eq("org_id", orgId)
    .order("name");

  if (error || !data) return [];
  return data.map((floorplan) => {
    const steps = Array.isArray(floorplan.steps) ? floorplan.steps : [];
    const photo_count = steps.reduce((total, step) => {
      const photos = Array.isArray(step.step_photos) ? step.step_photos.length : 0;
      return total + photos;
    }, 0);

    return {
      id: floorplan.id,
      name: floorplan.name,
      slug: floorplan.slug,
      community: floorplan.community,
      is_active: floorplan.is_active,
      cover_image_path: floorplan.cover_image_path,
      created_at: floorplan.created_at,
      step_count: steps.length,
      photo_count,
    };
  });
};

export const getAdminFloorplans = cache((orgId: string) =>
  unstable_cache(_getAdminFloorplans, ["admin-floorplans", orgId], {
    revalidate: REVALIDATE,
    tags: [`admin:floorplans:${orgId}`],
  })(orgId)
);
