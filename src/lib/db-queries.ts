import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getServiceClient } from "./supabase";
import type { Category, SubCategory, Option } from "@/types";
import type { StepConfig, StepSection, StepPhoto } from "./step-config";

// ---------- Cross-request cache (Next.js data cache) ----------
// These rarely change — revalidate every 5 minutes, bust via tags on admin update.

const REVALIDATE_SECONDS = 86400; // 24 hours — data changes ~quarterly, bust via tags when needed

// ---------- Organization ----------

const _getOrgBySlug = async (slug: string) => {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url, primary_color, secondary_color, accent_color, generation_cap_per_session")
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

// ---------- Floorplans list for org landing page ----------

const _getFloorplansForOrg = async (orgId: string) => {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("floorplans")
    .select("id, name, slug, is_active, cover_image_path")
    .eq("org_id", orgId)
    .order("name");

  if (error || !data) return [];
  return data;
};

export const getFloorplansForOrg = cache((orgId: string) =>
  unstable_cache(_getFloorplansForOrg, ["floorplans-for-org", orgId], {
    revalidate: REVALIDATE_SECONDS,
    tags: [`floorplans:${orgId}`],
  })(orgId)
);

// ---------- Categories with options (single nested select) ----------

const _getCategoriesWithOptions = async (orgId: string): Promise<Category[]> => {
  const supabase = getServiceClient();

  const { data: cats, error } = await supabase
    .from("categories")
    .select(`
      id, slug, name, sort_order,
      subcategories (
        id, slug, name, category_id, is_visual, is_additive, unit_label, max_quantity, sort_order,
        options ( id, slug, name, price, prompt_descriptor, swatch_url, swatch_color, nudge, sort_order )
      )
    `)
    .eq("org_id", orgId)
    .order("sort_order");

  if (error || !cats) return [];

  return cats.map((cat) => ({
    id: cat.slug,
    name: cat.name,
    subCategories: ((cat.subcategories ?? []) as {
      id: string; slug: string; name: string; category_id: string; is_visual: boolean;
      is_additive: boolean | null; unit_label: string | null; max_quantity: number | null;
      sort_order: number;
      options: {
        id: string; slug: string; name: string; price: number; prompt_descriptor: string | null;
        swatch_url: string | null; swatch_color: string | null; nudge: string | null;
        sort_order: number;
      }[];
    }[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((sub): SubCategory => ({
        id: sub.slug,
        name: sub.name,
        categoryId: cat.slug,
        isVisual: sub.is_visual,
        isAdditive: sub.is_additive || undefined,
        unitLabel: sub.unit_label ?? undefined,
        maxQuantity: sub.max_quantity ?? undefined,
        options: (sub.options ?? [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((opt): Option => ({
            id: opt.slug,
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

// ---------- Floorplan-scoped categories (category junction + column filters) ----------

const _getCategoriesForFloorplan = async (orgId: string, floorplanId: string): Promise<Category[]> => {
  const supabase = getServiceClient();

  // Single query for categories + nested data, plus category-level scope junction
  const [catsResult, catScopeResult] = await Promise.all([
    supabase
      .from("categories")
      .select(`
        id, slug, name, sort_order,
        subcategories (
          id, slug, name, category_id, is_visual, is_additive, unit_label, max_quantity, sort_order, floorplan_ids,
          options ( id, slug, name, price, prompt_descriptor, swatch_url, swatch_color, nudge, sort_order, floorplan_ids )
        )
      `)
      .eq("org_id", orgId)
      .order("sort_order"),
    supabase.from("category_floorplan_scope").select("category_id").eq("floorplan_id", floorplanId),
  ]);

  const cats = catsResult.data;
  if (catsResult.error || !cats) return [];

  // Category scope: junction table (has rows = restricted, no rows = all floorplans)
  const catScoped = new Set((catScopeResult.data ?? []).map((r) => r.category_id));
  // Get scope rows only for this org's categories to know which are restricted
  const orgCatIds = cats.map((c) => c.id);
  const { data: allCatScope } = await supabase
    .from("category_floorplan_scope")
    .select("category_id")
    .in("category_id", orgCatIds);
  const catHasScope = new Set((allCatScope ?? []).map((r) => r.category_id));

  type RawSub = {
    id: string; slug: string; name: string; category_id: string; is_visual: boolean;
    is_additive: boolean | null; unit_label: string | null; max_quantity: number | null;
    sort_order: number; floorplan_ids: string[];
    options: {
      id: string; slug: string; name: string; price: number; prompt_descriptor: string | null;
      swatch_url: string | null; swatch_color: string | null; nudge: string | null;
      sort_order: number; floorplan_ids: string[];
    }[];
  };

  // Subcategory/option scope: floorplan_ids column (empty = all, non-empty = restricted)
  const fitsFloorplan = (ids: string[]) => ids.length === 0 || ids.includes(floorplanId);

  return cats
    .filter((cat) => !catHasScope.has(cat.id) || catScoped.has(cat.id))
    .map((cat) => ({
      id: cat.slug,
      name: cat.name,
      subCategories: ((cat.subcategories ?? []) as RawSub[])
        .filter((sub) => fitsFloorplan(sub.floorplan_ids))
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((sub): SubCategory => ({
          id: sub.slug,
          name: sub.name,
          categoryId: cat.slug,
          isVisual: sub.is_visual,
          isAdditive: sub.is_additive || undefined,
          unitLabel: sub.unit_label ?? undefined,
          maxQuantity: sub.max_quantity ?? undefined,
          options: (sub.options ?? [])
            .filter((opt) => fitsFloorplan(opt.floorplan_ids))
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((opt): Option => ({
              id: opt.slug,
              name: opt.name,
              price: opt.price,
              promptDescriptor: opt.prompt_descriptor ?? undefined,
              swatchUrl: opt.swatch_url ?? undefined,
              swatchColor: opt.swatch_color ?? undefined,
              nudge: opt.nudge ?? undefined,
            })),
        })),
    }))
    .filter((cat) => cat.subCategories.length > 0);
};

export const getCategoriesForFloorplan = cache((orgId: string, floorplanId: string) =>
  unstable_cache(_getCategoriesForFloorplan, ["categories-fp", orgId, floorplanId], {
    revalidate: REVALIDATE_SECONDS,
    tags: [`categories:${orgId}`],
  })(orgId, floorplanId)
);

// ---------- Steps with config ----------

const _getStepsWithConfig = async (floorplanId: string): Promise<StepConfig[]> => {
  const supabase = getServiceClient();

  const { data: dbSteps, error: stepsErr } = await supabase
    .from("steps")
    .select(`
      id, slug, number, name, subtitle, hero_image, hero_variant,
      show_generate_button, scene_description, also_include_ids, photo_baseline,
      sort_order, sections, spatial_hints,
      step_photos!step_photos_org_match ( id, image_path, label, is_hero, sort_order, spatial_hint, photo_baseline )
    `)
    .eq("floorplan_id", floorplanId)
    .order("sort_order");

  if (stepsErr || !dbSteps) return [];

  // Resolve step_photos public URLs from Supabase Storage
  const resolvePhotoUrl = (imagePath: string): string => {
    const { data: { publicUrl } } = supabase.storage.from("rooms").getPublicUrl(imagePath);
    return publicUrl;
  };

  return dbSteps.map((s) => {
    const rawSections = (s.sections as { title: string; subcategory_ids: string[]; sort_order: number }[]) ?? [];
    const sections: StepSection[] = rawSections
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((sec) => ({
        title: sec.title,
        subCategoryIds: sec.subcategory_ids,
      }));

    // Map step_photos rows into StepPhoto[] (sorted, hero first)
    type RawStepPhoto = {
      id: string; image_path: string; label: string; is_hero: boolean;
      sort_order: number; spatial_hint: string | null; photo_baseline: string | null;
    };
    const rawPhotos = ((s.step_photos ?? []) as RawStepPhoto[])
      .sort((a, b) => a.sort_order - b.sort_order);
    const photos: StepPhoto[] | undefined = rawPhotos.length > 0
      ? rawPhotos.map((p): StepPhoto => ({
          id: p.id,
          imagePath: p.image_path,
          imageUrl: resolvePhotoUrl(p.image_path),
          label: p.label,
          isHero: p.is_hero,
          sortOrder: p.sort_order,
          spatialHint: p.spatial_hint,
          photoBaseline: p.photo_baseline,
        }))
      : undefined;

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
      photos,
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
    .select("slug")
    .eq("org_id", orgId)
    .eq("is_visual", true);

  if (error || !data) return [];
  return data.map((d) => d.slug);
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
    .select("id, scene_description, also_include_ids, photo_baseline, spatial_hints")
    .eq("floorplan_id", floorplanId)
    .eq("slug", stepSlug)
    .single();

  if (stepErr || !step) return null;

  return {
    stepId: step.id,
    sceneDescription: step.scene_description as string | null,
    spatialHints: (step.spatial_hints as Record<string, string>) ?? {},
  };
}

// ---------- Step photo AI config (multi-tenant generation routes) ----------

export async function getStepPhotoAiConfig(stepPhotoId: string) {
  const supabase = getServiceClient();

  const { data: photo, error: photoErr } = await supabase
    .from("step_photos")
    .select("id, step_id, spatial_hint, photo_baseline, image_path")
    .eq("id", stepPhotoId)
    .single();

  if (photoErr || !photo) return null;

  const { data: step, error: stepErr } = await supabase
    .from("steps")
    .select("id, slug, scene_description, also_include_ids, photo_baseline, spatial_hints, sections, org_id, floorplan_id")
    .eq("id", photo.step_id)
    .single();

  if (stepErr || !step) return null;

  return {
    stepId: step.id,
    stepSlug: step.slug,
    orgId: step.org_id as string,
    floorplanId: step.floorplan_id as string,
    sceneDescription: step.scene_description as string | null,
    spatialHints: (step.spatial_hints as Record<string, string>) ?? {},
    stepPhotoBaseline: (step.photo_baseline as Record<string, string>) ?? {},
    alsoIncludeIds: (step.also_include_ids as string[]) ?? [],
    sections: (step.sections as { title: string; subcategory_ids: string[]; sort_order: number }[]) ?? [],
    photo: {
      id: photo.id as string,
      imagePath: photo.image_path as string,
      spatialHint: photo.spatial_hint as string | null,
      photoBaseline: photo.photo_baseline as string | null,
    },
  };
}

export interface StepPhotoGenerationPolicyRecord {
  policyKey: string;
  isActive: boolean;
  policyJson: Record<string, unknown>;
}

/**
 * Internal per-photo generation policy lookup.
 * Returns null when no policy exists OR the table is not deployed yet.
 */
export async function getStepPhotoGenerationPolicy(
  orgId: string,
  stepPhotoId: string,
): Promise<StepPhotoGenerationPolicyRecord | null> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("step_photo_generation_policies")
    .select("policy_key, is_active, policy_json, updated_at")
    .eq("org_id", orgId)
    .eq("step_photo_id", stepPhotoId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Graceful fallback while this table is rolling out to environments.
    if (error.code === "PGRST205") return null;
    console.warn("[db-queries] step_photo_generation_policies lookup failed:", error.message);
    return null;
  }

  if (!data) return null;

  return {
    policyKey: data.policy_key as string,
    isActive: Boolean(data.is_active),
    policyJson:
      data.policy_json && typeof data.policy_json === "object"
        ? (data.policy_json as Record<string, unknown>)
        : {},
  };
}

// ---------- Generated images for a buyer session ----------

export async function getGeneratedImagesForSession(sessionId: string) {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("generated_images")
    .select("id, step_photo_id, step_id, image_path, created_at, steps(slug)")
    .eq("buyer_session_id", sessionId)
    .neq("image_path", "__pending__")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  // Keep only the latest image per step_photo_id (or step_id for legacy)
  const seen = new Set<string>();
  const deduped = data.filter((row) => {
    const key = (row.step_photo_id as string | null) ?? `step:${row.step_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.map((row) => {
    const { data: { publicUrl } } = supabase.storage
      .from("generated-images")
      .getPublicUrl(row.image_path);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stepSlug = (row as any).steps?.slug as string | undefined;

    return {
      stepPhotoId: row.step_photo_id as string | null,
      stepSlug: stepSlug ?? (row.step_id as string),
      imagePath: row.image_path as string,
      imageUrl: publicUrl,
    };
  });
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
