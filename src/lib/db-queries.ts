import { getServiceClient } from "./supabase";
import type { Category, SubCategory, Option } from "@/types";
import type { StepConfig, StepSection } from "./step-config";

// ---------- Organization ----------

export async function getOrgBySlug(slug: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url, primary_color, secondary_color")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data;
}

// ---------- Floorplan ----------

export async function getFloorplan(orgId: string, floorplanSlug: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("floorplans")
    .select("id, name, slug, community, price_sheet_label, contract_locked_ids, sync_pairs, is_active")
    .eq("org_id", orgId)
    .eq("slug", floorplanSlug)
    .single();

  if (error || !data) return null;
  return data;
}

// ---------- Categories with options ----------

export async function getCategoriesWithOptions(orgId: string): Promise<Category[]> {
  const supabase = getServiceClient();

  const { data: cats, error: catErr } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("org_id", orgId)
    .order("sort_order");

  if (catErr || !cats) return [];

  const { data: subs, error: subErr } = await supabase
    .from("subcategories")
    .select("id, category_id, name, is_visual, is_additive, unit_label, max_quantity, sort_order")
    .eq("org_id", orgId)
    .order("sort_order");

  if (subErr || !subs) return [];

  const { data: opts, error: optErr } = await supabase
    .from("options")
    .select("id, subcategory_id, name, price, prompt_descriptor, swatch_url, swatch_color, nudge, is_default, sort_order")
    .eq("org_id", orgId)
    .order("sort_order");

  if (optErr || !opts) return [];

  // Group options by subcategory
  const optionsBySubId = new Map<string, Option[]>();
  for (const opt of opts) {
    const list = optionsBySubId.get(opt.subcategory_id) ?? [];
    list.push({
      id: opt.id,
      name: opt.name,
      price: opt.price,
      promptDescriptor: opt.prompt_descriptor ?? undefined,
      swatchUrl: opt.swatch_url ?? undefined,
      swatchColor: opt.swatch_color ?? undefined,
      nudge: opt.nudge ?? undefined,
    });
    optionsBySubId.set(opt.subcategory_id, list);
  }

  // Group subcategories by category
  const subsByCatId = new Map<string, SubCategory[]>();
  for (const sub of subs) {
    const list = subsByCatId.get(sub.category_id) ?? [];
    list.push({
      id: sub.id,
      name: sub.name,
      categoryId: sub.category_id,
      isVisual: sub.is_visual,
      isAdditive: sub.is_additive || undefined,
      unitLabel: sub.unit_label ?? undefined,
      maxQuantity: sub.max_quantity ?? undefined,
      options: optionsBySubId.get(sub.id) ?? [],
    });
    subsByCatId.set(sub.category_id, list);
  }

  // Assemble categories
  return cats.map((cat) => ({
    id: cat.id,
    name: cat.name,
    subCategories: subsByCatId.get(cat.id) ?? [],
  }));
}

// ---------- Steps with config ----------

export async function getStepsWithConfig(floorplanId: string): Promise<StepConfig[]> {
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
}

// ---------- Visual subcategory IDs (cached at module scope) ----------

let cachedVisualIds: Set<string> | null = null;
let cachedOrgId: string | null = null;

export async function getVisualSubCategoryIdsFromDb(orgId: string): Promise<Set<string>> {
  if (cachedVisualIds && cachedOrgId === orgId) return cachedVisualIds;

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("subcategories")
    .select("id")
    .eq("org_id", orgId)
    .eq("is_visual", true);

  if (error || !data) return new Set();

  cachedVisualIds = new Set(data.map((d) => d.id));
  cachedOrgId = orgId;
  return cachedVisualIds;
}

// ---------- Step AI config lookup ----------

export async function getStepAiConfig(stepSlug: string, floorplanId: string) {
  const supabase = getServiceClient();

  // First get the step UUID from slug
  const { data: step, error: stepErr } = await supabase
    .from("steps")
    .select("id, scene_description, also_include_ids, photo_baseline")
    .eq("floorplan_id", floorplanId)
    .eq("slug", stepSlug)
    .single();

  if (stepErr || !step) return null;

  // Then get AI config
  const { data: config, error: configErr } = await supabase
    .from("step_ai_config")
    .select("spatial_hints")
    .eq("step_id", step.id)
    .single();

  return {
    stepId: step.id,
    sceneDescription: step.scene_description as string | null,
    spatialHints: (config?.spatial_hints ?? {}) as Record<string, string>,
  };
}

// ---------- Option lookup for prompt building ----------

export async function getOptionLookup(orgId: string): Promise<Map<string, { option: Option; subCategory: SubCategory }>> {
  const categories = await getCategoriesWithOptions(orgId);
  const map = new Map<string, { option: Option; subCategory: SubCategory }>();

  for (const cat of categories) {
    for (const sub of cat.subCategories) {
      for (const opt of sub.options) {
        // Key by "subId:optId" for the findOption pattern
        map.set(`${sub.id}:${opt.id}`, { option: opt, subCategory: sub });
      }
    }
  }

  return map;
}
