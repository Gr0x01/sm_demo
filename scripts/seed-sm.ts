/**
 * Seed script: migrates Stone Martin demo data from static TypeScript to Supabase.
 *
 * Usage: npx tsx scripts/seed-sm.ts
 *
 * Idempotent — uses upsert so it can be re-run safely.
 */

import { createClient } from "@supabase/supabase-js";
import { categories } from "../src/lib/options-data";
import { steps as stepConfigs } from "../src/lib/step-config";
import { CONTRACT_LOCKED_IDS } from "../src/lib/contract-phase";
import { syncPairs } from "../src/lib/sync-pairs";
import path from "path";

/** Scene descriptions keyed by hero image filename. */
const SCENE_DESCRIPTIONS: Record<string, string> = {
  "greatroom-wide.webp": "This photo shows an open-concept great room and kitchen in a new-construction home. The kitchen is in the background with an island, and the great room is in the foreground with hardwood/LVP flooring throughout.",
  "kitchen-close.webp": "This photo shows a kitchen in a new-construction home. There is a large island in the foreground, wall cabinets and countertops along the back wall, and appliances. The floor is hardwood/LVP.",
  "primary-bath-vanity.webp": "This photo shows a primary bathroom in a new-construction home. There is a double vanity with mirrors on the left, tile flooring in the bathroom, and a walk-in shower with tile walls on the right.",
  "primary-bedroom.webp": "This photo shows a primary bedroom in a new-construction home. It has CARPET flooring (replace the wood floor in the photo with carpet), a tray ceiling with crown molding, a ceiling fan, white painted walls, white trim and baseboard, and a doorway on the left showing a peek into the en-suite bathroom.",
};

/** Spatial hints telling the model WHERE in the photo each subcategory appears. */
const SPATIAL_HINTS: Record<string, string> = {
  "kitchen-cabinet-color": "wall cabinets (upper cabinets mounted on walls)",
  "kitchen-island-cabinet-color": "island base cabinets (large freestanding island in foreground)",
  "kitchen-cabinet-hardware": "cabinet knobs and pulls on all cabinets",
  "counter-top": "all countertop surfaces (island and perimeter)",
  "countertop-edge": "edge profile of all countertops",
  "backsplash": "tile backsplash between upper cabinets and countertop on the walls",
  "kitchen-sink": "undermount sink basin in the island countertop — preserve the exact sink position and orientation from the original photo",
  "kitchen-faucet": "faucet on the island countertop — the faucet spout arches AWAY from the camera toward the back wall/range side. Keep this exact orientation, do NOT flip it.",
  "dishwasher": "dishwasher panel (left side of island or near sink)",
  "refrigerator": "refrigerator in its built-in alcove",
  "range": "range/stovetop along the back wall next to the microwave. NOTE: if the range is a 'slide-in' model, it has NO raised back panel — it sits flush with the countertop and the backsplash tile is visible behind it. Only freestanding ranges have the raised back panel with controls.",
  "cabinet-style-whole-house": "cabinet door style on ALL cabinets (shaker, flat, raised panel, etc.)",
  "main-area-flooring-color": "LVP/hardwood plank flooring in non-bathroom areas (closets, bedrooms, hallways) — NOT on bathroom floors which have tile",
  "common-wall-paint": "all wall surfaces",
  "ceiling-paint": "ceiling",
  "trim-paint": "trim and molding along walls",
  "door-casing-color": "door frames and casings",
  "baseboard": "baseboard molding along the floor line",
  "wainscoting": "wainscoting panels on lower walls",
  "interior-door-style": "interior doors (panel style)",
  "lighting": "light fixtures (chandelier, pendants)",
  "great-room-fan": "ceiling fan in the great room",
  "primary-bath-vanity": "bathroom vanity cabinet (below the mirrors)",
  "primary-bath-cabinet-color": "vanity cabinet color",
  "bathroom-cabinet-hardware": "vanity cabinet hardware (pulls and knobs)",
  "primary-bath-mirrors": "mirrors above the vanity",
  "floor-tile-color": "large format tile on the bathroom floor AND shower walls ONLY (same tile covers both surfaces) — do NOT tile the closet or bedroom, those have LVP/hardwood flooring",
  "primary-shower": "small mosaic tile on the SHOWER FLOOR ONLY (the small square or penny tiles on the ground inside the shower enclosure)",
  "primary-shower-entry": "shower entry/door (glass panel separating shower from bathroom)",
  "bath-faucets": "faucets on the vanity",
  "bath-hardware": "towel rings, toilet paper holders, and bath accessories on walls",
  "secondary-bath-cabinet-color": "vanity cabinet color",
  "secondary-bath-mirrors": "mirror above vanity",
  "secondary-shower": "shower tile",
  "primary-closet-shelving": "closet shelving system",
  "crown-options": "crown molding where walls meet ceiling",
  "bedroom-fan": "ceiling fan in the bedroom",
  "carpet-color": "carpet flooring covering the entire bedroom floor",
  "door-hardware": "door knobs/levers on interior doors",
  "under-cabinet-lighting": "LED strip lighting underneath upper cabinets, illuminating the countertop",
};

// ---------- Supabase client ----------

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key);

// ---------- Constants ----------

const ORG_NAME = "Stone Martin Builders";
const ORG_SLUG = "stone-martin";
const FLOORPLAN_NAME = "Kinkade";
const FLOORPLAN_SLUG = "kinkade";
const COMMUNITY = "McClain Landing Phase 7";

// ---------- Main ----------

async function main() {
  console.log("Seeding Stone Martin data...\n");

  // 1. Organization
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .upsert(
      {
        name: ORG_NAME,
        slug: ORG_SLUG,
        logo_url: "/logo.svg",
        primary_color: "#1B2A4A",
        secondary_color: "#C5A572",
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (orgErr || !org) {
    console.error("Failed to upsert org:", orgErr);
    process.exit(1);
  }
  const orgId = org.id;
  console.log(`  Organization: ${ORG_NAME} (${orgId})`);

  // 2. Floorplan
  const { data: fp, error: fpErr } = await supabase
    .from("floorplans")
    .upsert(
      {
        org_id: orgId,
        name: FLOORPLAN_NAME,
        slug: FLOORPLAN_SLUG,
        community: COMMUNITY,
        contract_locked_ids: Array.from(CONTRACT_LOCKED_IDS),
        sync_pairs: syncPairs.map((sp) => ({
          a: sp.a,
          b: sp.b,
          label: sp.label,
        })),
      },
      { onConflict: "org_id,slug" }
    )
    .select("id")
    .single();

  if (fpErr || !fp) {
    console.error("Failed to upsert floorplan:", fpErr);
    process.exit(1);
  }
  const floorplanId = fp.id;
  console.log(`  Floorplan: ${FLOORPLAN_NAME} (${floorplanId})`);

  // 3. Categories
  const categoryRows = categories.map((cat, i) => ({
    id: cat.id,
    org_id: orgId,
    name: cat.name,
    sort_order: i,
  }));
  const { error: catErr } = await supabase
    .from("categories")
    .upsert(categoryRows, { onConflict: "id" });
  if (catErr) {
    console.error("Failed to upsert categories:", catErr);
    process.exit(1);
  }
  console.log(`  Categories: ${categoryRows.length}`);

  // 4. Subcategories
  const subcategoryRows: {
    id: string;
    category_id: string;
    org_id: string;
    name: string;
    is_visual: boolean;
    is_additive: boolean;
    unit_label: string | null;
    max_quantity: number | null;
    sort_order: number;
  }[] = [];

  for (const cat of categories) {
    for (let i = 0; i < cat.subCategories.length; i++) {
      const sub = cat.subCategories[i];
      subcategoryRows.push({
        id: sub.id,
        category_id: cat.id,
        org_id: orgId,
        name: sub.name,
        is_visual: sub.isVisual,
        is_additive: sub.isAdditive ?? false,
        unit_label: sub.unitLabel ?? null,
        max_quantity: sub.maxQuantity ?? null,
        sort_order: i,
      });
    }
  }

  // Upsert in batches (Supabase has a row limit per request)
  for (let i = 0; i < subcategoryRows.length; i += 50) {
    const batch = subcategoryRows.slice(i, i + 50);
    const { error } = await supabase
      .from("subcategories")
      .upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`Failed to upsert subcategories batch ${i}:`, error);
      process.exit(1);
    }
  }
  console.log(`  Subcategories: ${subcategoryRows.length}`);

  // 5. Options
  const optionRows: {
    id: string;
    subcategory_id: string;
    org_id: string;
    name: string;
    price: number;
    prompt_descriptor: string | null;
    swatch_url: string | null;
    swatch_color: string | null;
    nudge: string | null;
    is_default: boolean;
    sort_order: number;
  }[] = [];

  for (const cat of categories) {
    for (const sub of cat.subCategories) {
      for (let i = 0; i < sub.options.length; i++) {
        const opt = sub.options[i];
        optionRows.push({
          id: opt.id,
          subcategory_id: sub.id,
          org_id: orgId,
          name: opt.name,
          price: opt.price,
          prompt_descriptor: opt.promptDescriptor ?? null,
          swatch_url: opt.swatchUrl ?? null,
          swatch_color: opt.swatchColor ?? null,
          nudge: opt.nudge ?? null,
          is_default: opt.price === 0 && i === 0, // first $0 option is the default
          sort_order: i,
        });
      }
    }
  }

  for (let i = 0; i < optionRows.length; i += 50) {
    const batch = optionRows.slice(i, i + 50);
    const { error } = await supabase
      .from("options")
      .upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`Failed to upsert options batch ${i}:`, error);
      process.exit(1);
    }
  }
  console.log(`  Options: ${optionRows.length}`);

  // 6. Steps
  // Map hero image filename to scene description
  const sceneDescByHero: Record<string, string> = {};
  for (const [filename, desc] of Object.entries(SCENE_DESCRIPTIONS)) {
    sceneDescByHero[filename] = desc;
  }

  const stepRows: {
    floorplan_id: string;
    org_id: string;
    slug: string;
    number: number;
    name: string;
    subtitle: string;
    hero_image: string | null;
    hero_variant: string;
    show_generate_button: boolean;
    scene_description: string | null;
    also_include_ids: string[];
    photo_baseline: Record<string, string> | null;
    sort_order: number;
  }[] = [];

  for (let i = 0; i < stepConfigs.length; i++) {
    const step = stepConfigs[i];
    const heroImage = typeof step.heroImage === "string"
      ? step.heroImage
      : Array.isArray(step.heroImage)
      ? step.heroImage[0]
      : "";

    const heroFilename = heroImage ? path.basename(heroImage) : "";
    const sceneDesc = sceneDescByHero[heroFilename] ?? null;

    stepRows.push({
      floorplan_id: floorplanId,
      org_id: orgId,
      slug: step.id,
      number: step.number,
      name: step.name,
      subtitle: step.subtitle,
      hero_image: heroImage || null,
      hero_variant: step.heroVariant,
      show_generate_button: step.showGenerateButton,
      scene_description: sceneDesc,
      also_include_ids: step.alsoIncludeIds ?? [],
      photo_baseline: step.photoBaseline ?? null,
      sort_order: i,
    });
  }

  // Insert steps (can't upsert easily with auto-generated UUIDs, so delete + insert)
  // First check if steps exist for this floorplan
  const { data: existingSteps } = await supabase
    .from("steps")
    .select("id, slug")
    .eq("floorplan_id", floorplanId);

  const existingStepMap = new Map<string, string>();
  if (existingSteps) {
    for (const s of existingSteps) {
      existingStepMap.set(s.slug, s.id);
    }
  }

  // Upsert each step individually to get back IDs
  const stepIdMap = new Map<string, string>(); // slug → uuid

  for (const row of stepRows) {
    const existingId = existingStepMap.get(row.slug);
    const upsertRow = existingId ? { id: existingId, ...row } : row;

    const { data: stepData, error: stepErr } = await supabase
      .from("steps")
      .upsert(upsertRow, { onConflict: existingId ? "id" : "floorplan_id,slug" })
      .select("id, slug")
      .single();

    if (stepErr || !stepData) {
      console.error(`Failed to upsert step ${row.slug}:`, stepErr);
      process.exit(1);
    }
    stepIdMap.set(stepData.slug, stepData.id);
  }
  console.log(`  Steps: ${stepRows.length}`);

  // 7. Step sections
  // Delete existing sections for these steps, then insert fresh
  const stepUuids = Array.from(stepIdMap.values());
  if (stepUuids.length > 0) {
    await supabase.from("step_sections").delete().in("step_id", stepUuids);
  }

  const sectionRows: {
    step_id: string;
    title: string;
    subcategory_ids: string[];
    sort_order: number;
  }[] = [];

  for (const stepConfig of stepConfigs) {
    const stepUuid = stepIdMap.get(stepConfig.id);
    if (!stepUuid) continue;

    for (let i = 0; i < stepConfig.sections.length; i++) {
      const section = stepConfig.sections[i];
      sectionRows.push({
        step_id: stepUuid,
        title: section.title,
        subcategory_ids: section.subCategoryIds,
        sort_order: i,
      });
    }
  }

  const { error: secErr } = await supabase
    .from("step_sections")
    .insert(sectionRows);
  if (secErr) {
    console.error("Failed to insert step_sections:", secErr);
    process.exit(1);
  }
  console.log(`  Step sections: ${sectionRows.length}`);

  // 8. Step AI config (spatial hints per step)
  // Delete existing configs for these steps, then insert fresh
  if (stepUuids.length > 0) {
    await supabase.from("step_ai_config").delete().in("step_id", stepUuids);
  }

  // Build spatial hints per step: collect all subcategory IDs referenced by a step
  // (from sections + alsoIncludeIds), then include only the relevant SPATIAL_HINTS entries
  const aiConfigRows: {
    step_id: string;
    spatial_hints: Record<string, string>;
  }[] = [];

  for (const stepConfig of stepConfigs) {
    const stepUuid = stepIdMap.get(stepConfig.id);
    if (!stepUuid) continue;
    if (!stepConfig.showGenerateButton) continue; // No AI generation for this step

    const allSubIds = new Set<string>([
      ...stepConfig.sections.flatMap((s) => s.subCategoryIds),
      ...(stepConfig.alsoIncludeIds ?? []),
    ]);

    const hints: Record<string, string> = {};
    for (const [subId, hint] of Object.entries(SPATIAL_HINTS)) {
      if (allSubIds.has(subId)) {
        hints[subId] = hint;
      }
    }

    aiConfigRows.push({
      step_id: stepUuid,
      spatial_hints: hints,
    });
  }

  if (aiConfigRows.length > 0) {
    const { error: aiErr } = await supabase
      .from("step_ai_config")
      .insert(aiConfigRows);
    if (aiErr) {
      console.error("Failed to insert step_ai_config:", aiErr);
      process.exit(1);
    }
  }
  console.log(`  Step AI configs: ${aiConfigRows.length}`);

  // ---------- Summary ----------
  console.log("\nSeed complete!");
  console.log(`  1 org, 1 floorplan`);
  console.log(`  ${categoryRows.length} categories`);
  console.log(`  ${subcategoryRows.length} subcategories`);
  console.log(`  ${optionRows.length} options`);
  console.log(`  ${stepRows.length} steps, ${sectionRows.length} sections, ${aiConfigRows.length} AI configs`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
