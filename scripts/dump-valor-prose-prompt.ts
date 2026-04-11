/**
 * One-off dry-run: assembles the prose prompt for Valor's kitchen photo using
 * the three prospect demo presets (Standard / Mid-Range / Premium) and prints
 * the resulting prompt strings. Does NOT call BFL.
 *
 * Used during Phase A authoring to visually verify the prose assembles cleanly
 * before spending BFL budget on a real generation.
 *
 * Usage: npx tsx scripts/dump-valor-prose-prompt.ts
 */

import { createClient } from "@supabase/supabase-js";
import { buildProsePrompt, buildProseScopedEdit } from "@/lib/generate";
import { analyzeProseCoverage } from "@/lib/flux-pipeline";
import type { PromptProse } from "@/lib/step-config";
import type { Option, SubCategory } from "@/types";

const STEP_PHOTO_ID = "a9266d4d-07e9-4e64-abe5-eebd8d6e0ca9";
const ORG_ID = "0d255878-9268-468a-b9e2-95b7552b6126";

const PRESETS: { label: string; selections: Record<string, string> }[] = [
  {
    label: "Standard",
    selections: {
      "kitchen-cabinet-color": "kitchen-cab-color-white",
      "kitchen-island-cabinet-color": "island-color-white",
      "counter-top": "ct-granite-dallas-white",
      "backsplash": "bs-baker-4x12-bev-white",
      "main-area-flooring-color": "floor-color-polaris-toasted-taupe",
    },
  },
  {
    label: "Mid-Range",
    selections: {
      "kitchen-cabinet-color": "kitchen-cab-color-white",
      "kitchen-island-cabinet-color": "island-color-admiral-blue",
      "counter-top": "ct-quartz-lace-white",
      "backsplash": "bs-baker-4x16-glacier",
      "main-area-flooring-color": "floor-color-polaris-wild-dunes",
    },
  },
  {
    label: "Premium",
    selections: {
      "kitchen-cabinet-color": "kitchen-cab-color-fog",
      "kitchen-island-cabinet-color": "island-color-onyx",
      "counter-top": "ct-quartz-calacatta-venice",
      "backsplash": "bs-herringbone-white",
      "main-area-flooring-color": "floor-color-delray-lowtide",
    },
  },
];

// Fake swatch resolver — returns a tiny buffer so buildProsePrompt proceeds
// past its "swatch failed to resolve" guard. We only care about the prompt string.
const fakeResolver = async () => ({
  buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  mediaType: "image/jpeg",
});

// Minimal uncached optionLookup fetch — bypasses Next.js unstable_cache which
// can't run in a standalone tsx script. Uses the same query shape as
// _getCategoriesWithOptions in src/lib/db-queries.ts.
async function loadOptionLookup(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
): Promise<Map<string, { option: Option; subCategory: SubCategory }>> {
  const { data: cats, error } = await supabase
    .from("categories")
    .select(`
      id, slug, name, sort_order,
      subcategories (
        id, slug, name, category_id, is_visual, is_additive, unit_label, max_quantity, sort_order, generation_hint, generation_rules, generation_rules_when_not_selected, is_appliance,
        options ( id, slug, name, price, prompt_descriptor, dimensions, swatch_url, swatch_color, nudge, sort_order, generation_rules, is_default, scoped_edit_model, linked_to_subcategory )
      )
    `)
    .eq("org_id", orgId)
    .order("sort_order");

  if (error || !cats) throw new Error(`categories query failed: ${error?.message}`);

  const map = new Map<string, { option: Option; subCategory: SubCategory }>();
  type RawSub = {
    slug: string; name: string; is_visual: boolean; is_additive: boolean | null;
    unit_label: string | null; max_quantity: number | null;
    generation_hint: string | null; generation_rules: string[] | null;
    generation_rules_when_not_selected: string[] | null; is_appliance: boolean;
    sort_order: number;
    options: {
      slug: string; name: string; price: number; prompt_descriptor: string | null;
      dimensions: string | null; swatch_url: string | null; swatch_color: string | null;
      nudge: string | null; generation_rules: string[] | null; is_default: boolean;
      scoped_edit_model: string | null; linked_to_subcategory: string | null;
      sort_order: number;
    }[];
  };
  for (const cat of cats as { slug: string; subcategories: RawSub[] }[]) {
    for (const sub of cat.subcategories ?? []) {
      const subCategory: SubCategory = {
        id: sub.slug,
        name: sub.name,
        categoryId: cat.slug,
        isVisual: sub.is_visual,
        isAdditive: sub.is_additive || undefined,
        unitLabel: sub.unit_label ?? undefined,
        maxQuantity: sub.max_quantity ?? undefined,
        generationHint: (sub.generation_hint as SubCategory["generationHint"]) ?? undefined,
        generationRules: sub.generation_rules ?? undefined,
        generationRulesWhenNotSelected: sub.generation_rules_when_not_selected ?? undefined,
        isAppliance: sub.is_appliance || undefined,
        options: [],
      };
      for (const opt of sub.options ?? []) {
        const option: Option = {
          id: opt.slug,
          name: opt.name,
          price: opt.price,
          promptDescriptor: opt.prompt_descriptor ?? undefined,
          dimensions: opt.dimensions ?? undefined,
          swatchUrl: opt.swatch_url ?? undefined,
          swatchColor: opt.swatch_color ?? undefined,
          nudge: opt.nudge ?? undefined,
          generationRules: opt.generation_rules ?? undefined,
          isDefault: opt.is_default || undefined,
          scopedEditModel: opt.scoped_edit_model ?? undefined,
          linkedToSubcategory: opt.linked_to_subcategory ?? undefined,
        };
        map.set(`${sub.slug}:${opt.slug}`, { option, subCategory });
      }
    }
  }
  return map;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  const { data: photo, error } = await supabase
    .from("step_photos")
    .select("prompt_prose")
    .eq("id", STEP_PHOTO_ID)
    .single();

  if (error || !photo?.prompt_prose) {
    console.error("Failed to load Valor prompt_prose:", error);
    process.exit(1);
  }

  const prose = photo.prompt_prose as PromptProse;
  const optionLookup = await loadOptionLookup(supabase, ORG_ID);

  console.log("=".repeat(80));
  console.log("VALOR — prompt prose dry run");
  console.log("=".repeat(80));

  for (const preset of PRESETS) {
    console.log(`\n▶ ${preset.label}`);
    console.log("-".repeat(80));

    const coverage = analyzeProseCoverage(prose, preset.selections, optionLookup);
    console.log(`Coverage: present=${coverage.present}, missing=[${coverage.missing.join(", ")}]`);

    if (!coverage.present || coverage.missing.length > 0) {
      console.log("(would fall back to legacy builder)");
      continue;
    }

    try {
      const { prompt, swatches } = await buildProsePrompt(
        prose,
        preset.selections,
        optionLookup,
        fakeResolver,
      );
      console.log(`Swatches: ${swatches.length}`);
      console.log(`Word count: ~${prompt.split(/\s+/).length}`);
      console.log("\nPrompt:");
      console.log(prompt);
    } catch (err) {
      console.error(`Failed to build prompt: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Scoped edit dry-run: change cabinet color only
  console.log("\n" + "=".repeat(80));
  console.log("▶ Scoped edit — kitchen-cabinet-color → kitchen-cab-color-fog");
  console.log("-".repeat(80));
  try {
    const { prompt } = await buildProseScopedEdit(
      prose,
      "kitchen-cabinet-color",
      "kitchen-cab-color-fog",
      optionLookup,
      fakeResolver,
    );
    console.log(`Word count: ~${prompt.split(/\s+/).length}`);
    console.log("\nPrompt:");
    console.log(prompt);
  } catch (err) {
    console.error(`Failed to build scoped edit: ${err instanceof Error ? err.message : err}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
