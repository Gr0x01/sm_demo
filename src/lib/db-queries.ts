import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getServiceClient } from "./supabase";
import type { Category, SubCategory, Option } from "@/types";
import type { StepConfig, StepSection } from "./step-config";

// ---------- Cross-request cache (Next.js data cache) ----------
// These rarely change — revalidate every 5 minutes, bust via tags on admin update.

const REVALIDATE_SECONDS = 86400; // 24 hours — data changes ~quarterly, bust via tags when needed

// ---------- Organization ----------

const _getOrgBySlug = async (slug: string) => {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url, primary_color, secondary_color, accent_color")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data;
};

/** Request-deduped + cross-request cached org lookup */
export const getOrgBySlug = cache((slug: string) =>
  unstable_cache(_getOrgBySlug, ["org-by-slug", slug], {
    revalidate: REVALIDATE_SECONDS,
    tags: [`org:${slug}`],
  })(slug)
);

// ---------- Floorplan ----------

const _getFloorplan = async (orgId: string, floorplanSlug: string) => {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("floorplans")
    .select("id, name, slug, community, price_sheet_label, contract_locked_ids, sync_pairs, is_active")
    .eq("org_id", orgId)
    .eq("slug", floorplanSlug)
    .single();

  if (error || !data) return null;
  return data;
};

export const getFloorplan = cache((orgId: string, floorplanSlug: string) =>
  unstable_cache(_getFloorplan, ["floorplan", orgId, floorplanSlug], {
    revalidate: REVALIDATE_SECONDS,
    tags: [`floorplan:${orgId}:${floorplanSlug}`],
  })(orgId, floorplanSlug)
);

// ---------- Categories with options (single nested select) ----------

const _getCategoriesWithOptions = async (orgId: string): Promise<Category[]> => {
  const supabase = getServiceClient();

  const { data: cats, error } = await supabase
    .from("categories")
    .select(`
      id, name, sort_order,
      subcategories (
        id, name, category_id, is_visual, is_additive, unit_label, max_quantity, sort_order,
        options ( id, name, price, prompt_descriptor, swatch_url, swatch_color, nudge, sort_order )
      )
    `)
    .eq("org_id", orgId)
    .order("sort_order");

  if (error || !cats) return [];

  return cats.map((cat) => ({
    id: cat.id,
    name: cat.name,
    subCategories: ((cat.subcategories ?? []) as {
      id: string; name: string; category_id: string; is_visual: boolean;
      is_additive: boolean | null; unit_label: string | null; max_quantity: number | null;
      sort_order: number;
      options: {
        id: string; name: string; price: number; prompt_descriptor: string | null;
        swatch_url: string | null; swatch_color: string | null; nudge: string | null;
        sort_order: number;
      }[];
    }[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((sub): SubCategory => ({
        id: sub.id,
        name: sub.name,
        categoryId: sub.category_id,
        isVisual: sub.is_visual,
        isAdditive: sub.is_additive || undefined,
        unitLabel: sub.unit_label ?? undefined,
        maxQuantity: sub.max_quantity ?? undefined,
        options: (sub.options ?? [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((opt): Option => ({
            id: opt.id,
            name: opt.name,
            price: opt.price,
            promptDescriptor: opt.prompt_descriptor ?? undefined,
            swatchUrl: opt.swatch_url ?? undefined,
            swatchColor: opt.swatch_color ?? undefined,
            nudge: opt.nudge ?? undefined,
          })),
      })),
  }));
};

export const getCategoriesWithOptions = cache((orgId: string) =>
  unstable_cache(_getCategoriesWithOptions, ["categories", orgId], {
    revalidate: REVALIDATE_SECONDS,
    tags: [`categories:${orgId}`],
  })(orgId)
);

// ---------- Steps with config ----------

const _getStepsWithConfig = async (floorplanId: string): Promise<StepConfig[]> => {
  const supabase = getServiceClient();

  const { data: dbSteps, error: stepsErr } = await supabase
    .from("steps")
    .select(`
      id, slug, number, name, subtitle, hero_image, hero_variant,
      show_generate_button, scene_description, also_include_ids, photo_baseline,
      sort_order,
      step_sections ( id, title, subcategory_ids, sort_order ),
      step_ai_config ( spatial_hints )
    `)
    .eq("floorplan_id", floorplanId)
    .order("sort_order");

  if (stepsErr || !dbSteps) return [];

  return dbSteps.map((s) => {
    const sections: StepSection[] = (s.step_sections as { title: string; subcategory_ids: string[]; sort_order: number }[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((sec) => ({
        title: sec.title,
        subCategoryIds: sec.subcategory_ids,
      }));

    return {
      id: s.slug,
      number: s.number,
      name: s.name,
      subtitle: s.subtitle ?? "",
      heroImage: s.hero_image ?? "",
      heroVariant: s.hero_variant as StepConfig["heroVariant"],
      showGenerateButton: s.show_generate_button,
      sections,
      alsoIncludeIds: s.also_include_ids ?? [],
      photoBaseline: (s.photo_baseline as Record<string, string>) ?? undefined,
    };
  });
};

export const getStepsWithConfig = cache((floorplanId: string) =>
  unstable_cache(_getStepsWithConfig, ["steps", floorplanId], {
    revalidate: REVALIDATE_SECONDS,
    tags: [`steps:${floorplanId}`],
  })(floorplanId)
);

// ---------- Visual subcategory IDs ----------

const _getVisualSubCategoryIdsFromDb = async (orgId: string): Promise<string[]> => {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("subcategories")
    .select("id")
    .eq("org_id", orgId)
    .eq("is_visual", true);

  if (error || !data) return [];
  return data.map((d) => d.id);
};

/** Returns visual subcategory IDs as a Set. Cached across requests. */
export async function getVisualSubCategoryIdsFromDb(orgId: string): Promise<Set<string>> {
  const ids = await unstable_cache(_getVisualSubCategoryIdsFromDb, ["visual-subs", orgId], {
    revalidate: REVALIDATE_SECONDS,
    tags: [`categories:${orgId}`],
  })(orgId);
  return new Set(ids);
}

// ---------- Step AI config lookup (API routes only — no RSC cache needed) ----------

export async function getStepAiConfig(stepSlug: string, floorplanId: string) {
  const supabase = getServiceClient();

  const { data: step, error: stepErr } = await supabase
    .from("steps")
    .select("id, scene_description, also_include_ids, photo_baseline, step_ai_config ( spatial_hints )")
    .eq("floorplan_id", floorplanId)
    .eq("slug", stepSlug)
    .single();

  if (stepErr || !step) return null;

  const config = step.step_ai_config as { spatial_hints: Record<string, string> }[] | null;

  return {
    stepId: step.id,
    sceneDescription: step.scene_description as string | null,
    spatialHints: (config?.[0]?.spatial_hints ?? {}) as Record<string, string>,
  };
}

// ---------- Option lookup for prompt building ----------

export async function getOptionLookup(orgId: string): Promise<Map<string, { option: Option; subCategory: SubCategory }>> {
  const categories = await getCategoriesWithOptions(orgId);
  const map = new Map<string, { option: Option; subCategory: SubCategory }>();

  for (const cat of categories) {
    for (const sub of cat.subCategories) {
      for (const opt of sub.options) {
        map.set(`${sub.id}:${opt.id}`, { option: opt, subCategory: sub });
      }
    }
  }

  return map;
}
