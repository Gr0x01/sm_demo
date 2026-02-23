/**
 * Seed script: creates a fully structured (but minimal) starter org for a new builder.
 *
 * Usage:
 *   npx tsx scripts/seed-new-tenant.ts --org-name "Prestige Homes" --org-slug "prestige"
 *   npx tsx scripts/seed-new-tenant.ts --org-name "Prestige Homes" --org-slug "prestige" --floorplan-name "Model A"
 *
 * Creates: 1 org, 1 floorplan, 9 categories, 15 subcategories, 15 default options,
 * 5 steps with populated sections. No AI generation (no photos, show_generate_button: false).
 *
 * Idempotent — uses upsert so it can be re-run safely.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// ---------- CLI args ----------

function parseArgs(): { orgName: string; orgSlug: string; floorplanName: string } {
  const args = process.argv.slice(2);
  let orgName = "";
  let orgSlug = "";
  let floorplanName = "Sample Plan";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--org-name" && args[i + 1]) orgName = args[++i];
    else if (args[i] === "--org-slug" && args[i + 1]) orgSlug = args[++i];
    else if (args[i] === "--floorplan-name" && args[i + 1]) floorplanName = args[++i];
  }

  if (!orgName || !orgSlug) {
    console.error("Usage: npx tsx scripts/seed-new-tenant.ts --org-name <name> --org-slug <slug> [--floorplan-name <name>]");
    process.exit(1);
  }

  return { orgName, orgSlug, floorplanName };
}

// ---------- Supabase client ----------

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key);

// ---------- Template data ----------

const CATEGORIES = [
  { slug: "cabinets", name: "Cabinets" },
  { slug: "countertops", name: "Countertops" },
  { slug: "flooring", name: "Flooring" },
  { slug: "paint", name: "Paint" },
  { slug: "trim", name: "Trim" },
  { slug: "plumbing", name: "Plumbing" },
  { slug: "lighting", name: "Lighting" },
  { slug: "electrical", name: "Electrical" },
  { slug: "exterior", name: "Exterior" },
] as const;

type CatSlug = (typeof CATEGORIES)[number]["slug"];

const SUBCATEGORIES: {
  slug: string;
  name: string;
  categorySlug: CatSlug;
  isVisual: boolean;
  isAdditive: boolean;
}[] = [
  // Step 1: Set Your Style
  { slug: "cabinet-style", name: "Cabinet Style", categorySlug: "cabinets", isVisual: true, isAdditive: false },
  { slug: "main-flooring", name: "Main Flooring", categorySlug: "flooring", isVisual: true, isAdditive: false },
  { slug: "wall-paint", name: "Wall Paint", categorySlug: "paint", isVisual: true, isAdditive: false },
  { slug: "baseboard", name: "Baseboard", categorySlug: "trim", isVisual: true, isAdditive: false },
  // Step 2: Design Your Kitchen
  { slug: "countertop", name: "Countertop", categorySlug: "countertops", isVisual: true, isAdditive: false },
  { slug: "kitchen-cabinet-color", name: "Kitchen Cabinet Color", categorySlug: "cabinets", isVisual: true, isAdditive: false },
  { slug: "kitchen-sink", name: "Kitchen Sink", categorySlug: "plumbing", isVisual: true, isAdditive: false },
  // Step 3: Primary Bath
  { slug: "bath-vanity", name: "Bath Vanity", categorySlug: "cabinets", isVisual: true, isAdditive: false },
  { slug: "floor-tile", name: "Floor Tile", categorySlug: "flooring", isVisual: true, isAdditive: false },
  { slug: "bath-faucet", name: "Bath Faucet", categorySlug: "plumbing", isVisual: true, isAdditive: false },
  // Step 4: Secondary Spaces
  { slug: "secondary-bath-vanity", name: "Secondary Bath Vanity", categorySlug: "cabinets", isVisual: true, isAdditive: false },
  { slug: "laundry-cabinets", name: "Laundry Cabinets", categorySlug: "cabinets", isVisual: true, isAdditive: false },
  // Step 5: Finishing Touches
  { slug: "outlets", name: "Outlets", categorySlug: "electrical", isVisual: false, isAdditive: true },
  { slug: "door-hardware", name: "Door Hardware", categorySlug: "lighting", isVisual: true, isAdditive: false },
  { slug: "front-door", name: "Front Door", categorySlug: "exterior", isVisual: true, isAdditive: false },
];

/** Default option for each subcategory (Builder Grade / Standard, $0). */
const DEFAULT_OPTIONS: { subcategorySlug: string; slug: string; name: string }[] = [
  { subcategorySlug: "cabinet-style", slug: "cabinet-style-standard", name: "Builder Standard" },
  { subcategorySlug: "main-flooring", slug: "main-flooring-standard", name: "Builder Standard" },
  { subcategorySlug: "wall-paint", slug: "wall-paint-standard", name: "Builder Standard" },
  { subcategorySlug: "baseboard", slug: "baseboard-standard", name: "Builder Standard" },
  { subcategorySlug: "countertop", slug: "countertop-standard", name: "Builder Standard" },
  { subcategorySlug: "kitchen-cabinet-color", slug: "kitchen-cabinet-color-standard", name: "Builder Standard" },
  { subcategorySlug: "kitchen-sink", slug: "kitchen-sink-standard", name: "Builder Standard" },
  { subcategorySlug: "bath-vanity", slug: "bath-vanity-standard", name: "Builder Standard" },
  { subcategorySlug: "floor-tile", slug: "floor-tile-standard", name: "Builder Standard" },
  { subcategorySlug: "bath-faucet", slug: "bath-faucet-standard", name: "Builder Standard" },
  { subcategorySlug: "secondary-bath-vanity", slug: "secondary-bath-vanity-standard", name: "Builder Standard" },
  { subcategorySlug: "laundry-cabinets", slug: "laundry-cabinets-standard", name: "Builder Standard" },
  { subcategorySlug: "outlets", slug: "outlets-standard", name: "Standard" },
  { subcategorySlug: "door-hardware", slug: "door-hardware-standard", name: "Builder Standard" },
  { subcategorySlug: "front-door", slug: "front-door-standard", name: "Builder Standard" },
];

/** Step template: name, slug, subtitle, and sections (with subcategory slugs to resolve). */
const STEP_TEMPLATES = [
  {
    name: "Set Your Style",
    slug: "set-your-style",
    subtitle: "Choose the foundation finishes for your home",
    sections: [
      { title: "Cabinets", subcategorySlugs: ["cabinet-style"] },
      { title: "Flooring", subcategorySlugs: ["main-flooring"] },
      { title: "Paint", subcategorySlugs: ["wall-paint"] },
      { title: "Trim", subcategorySlugs: ["baseboard"] },
    ],
  },
  {
    name: "Design Your Kitchen",
    slug: "design-your-kitchen",
    subtitle: "Customize your kitchen surfaces and fixtures",
    sections: [
      { title: "Surfaces", subcategorySlugs: ["countertop"] },
      { title: "Cabinets", subcategorySlugs: ["kitchen-cabinet-color"] },
      { title: "Sink & Faucet", subcategorySlugs: ["kitchen-sink"] },
    ],
  },
  {
    name: "Primary Bed and Bath",
    slug: "primary-bath",
    subtitle: "Design your primary bedroom and bathroom",
    sections: [
      { title: "Vanity", subcategorySlugs: ["bath-vanity"] },
      { title: "Tile", subcategorySlugs: ["floor-tile"] },
      { title: "Fixtures", subcategorySlugs: ["bath-faucet"] },
    ],
  },
  {
    name: "Secondary Spaces",
    slug: "secondary-spaces",
    subtitle: "Finish your secondary bath and laundry",
    sections: [
      { title: "Secondary Bath", subcategorySlugs: ["secondary-bath-vanity"] },
      { title: "Laundry", subcategorySlugs: ["laundry-cabinets"] },
    ],
  },
  {
    name: "Finishing Touches",
    slug: "finishing-touches",
    subtitle: "Add the details that make it yours",
    sections: [
      { title: "Electrical", subcategorySlugs: ["outlets"] },
      { title: "Hardware", subcategorySlugs: ["door-hardware"] },
      { title: "Exterior", subcategorySlugs: ["front-door"] },
    ],
  },
];

const COVER_IMAGE_PATH = path.join(__dirname, "../tmp/Gemini_Generated_Image_9hnl699hnl699hnl (1).png");

// ---------- Helpers ----------

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ---------- Main ----------

async function main() {
  const { orgName, orgSlug, floorplanName } = parseArgs();
  const floorplanSlug = slugify(floorplanName);

  console.log(`Seeding new tenant: ${orgName} (${orgSlug})\n`);

  // 1. Organization
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .upsert(
      {
        name: orgName,
        slug: orgSlug,
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
  console.log(`  Organization: ${orgName} (${orgId})`);

  // 2. Categories
  const categoryRows = CATEGORIES.map((cat, i) => ({
    slug: cat.slug,
    org_id: orgId,
    name: cat.name,
    sort_order: i,
  }));

  const { error: catErr } = await supabase
    .from("categories")
    .upsert(categoryRows, { onConflict: "org_id,slug" });
  if (catErr) {
    console.error("Failed to upsert categories:", catErr);
    process.exit(1);
  }
  console.log(`  Categories: ${categoryRows.length}`);

  // Fetch category slug → UUID map
  const { data: catLookup, error: catLookupErr } = await supabase
    .from("categories")
    .select("id, slug")
    .eq("org_id", orgId);
  if (catLookupErr || !catLookup) {
    console.error("Failed to fetch category UUIDs:", catLookupErr);
    process.exit(1);
  }
  const catSlugToUuid = new Map(catLookup.map((c) => [c.slug, c.id]));

  // 3. Subcategories
  const subcategoryRows = SUBCATEGORIES.map((sub, i) => {
    const catUuid = catSlugToUuid.get(sub.categorySlug);
    if (!catUuid) {
      console.error(`No UUID found for category slug: ${sub.categorySlug}`);
      process.exit(1);
    }
    return {
      slug: sub.slug,
      category_id: catUuid,
      org_id: orgId,
      name: sub.name,
      is_visual: sub.isVisual,
      is_additive: sub.isAdditive,
      unit_label: null,
      max_quantity: null,
      sort_order: i,
    };
  });

  const { error: subErr } = await supabase
    .from("subcategories")
    .upsert(subcategoryRows, { onConflict: "org_id,slug" });
  if (subErr) {
    console.error("Failed to upsert subcategories:", subErr);
    process.exit(1);
  }
  console.log(`  Subcategories: ${subcategoryRows.length}`);

  // Fetch subcategory slug → UUID map
  const { data: subLookup, error: subLookupErr } = await supabase
    .from("subcategories")
    .select("id, slug")
    .eq("org_id", orgId);
  if (subLookupErr || !subLookup) {
    console.error("Failed to fetch subcategory UUIDs:", subLookupErr);
    process.exit(1);
  }
  const subSlugToUuid = new Map(subLookup.map((s) => [s.slug, s.id]));

  // 4. Options (1 default per subcategory, $0)
  const optionRows = DEFAULT_OPTIONS.map((opt, i) => {
    const subUuid = subSlugToUuid.get(opt.subcategorySlug);
    if (!subUuid) {
      console.error(`No UUID found for subcategory slug: ${opt.subcategorySlug}`);
      process.exit(1);
    }
    return {
      slug: opt.slug,
      subcategory_id: subUuid,
      org_id: orgId,
      name: opt.name,
      price: 0,
      prompt_descriptor: null,
      swatch_url: null,
      swatch_color: null,
      nudge: null,
      is_default: true,
      sort_order: 0,
    };
  });

  const { error: optErr } = await supabase
    .from("options")
    .upsert(optionRows, { onConflict: "org_id,slug" });
  if (optErr) {
    console.error("Failed to upsert options:", optErr);
    process.exit(1);
  }
  console.log(`  Options: ${optionRows.length}`);

  // 5. Floorplan
  const { data: fp, error: fpErr } = await supabase
    .from("floorplans")
    .upsert(
      {
        org_id: orgId,
        name: floorplanName,
        slug: floorplanSlug,
        is_active: true,
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
  console.log(`  Floorplan: ${floorplanName} (${floorplanId})`);

  // 6. Upload cover image
  if (fs.existsSync(COVER_IMAGE_PATH)) {
    const coverBuffer = fs.readFileSync(COVER_IMAGE_PATH);
    const storagePath = `${orgId}/floorplans/${floorplanId}.png`;

    const { error: uploadErr } = await supabase.storage
      .from("rooms")
      .upload(storagePath, coverBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadErr) {
      console.warn(`  Warning: Failed to upload cover image: ${uploadErr.message}`);
    } else {
      // Update floorplan with cover image path
      const { error: updateErr } = await supabase
        .from("floorplans")
        .update({ cover_image_path: storagePath })
        .eq("id", floorplanId);
      if (updateErr) {
        console.warn(`  Warning: Failed to update cover_image_path: ${updateErr.message}`);
      } else {
        console.log(`  Cover image: uploaded to ${storagePath}`);
      }
    }
  } else {
    console.log(`  Cover image: skipped (file not found at ${COVER_IMAGE_PATH})`);
  }

  // 7. Steps with sections (subcategory UUIDs resolved)
  const existingSteps = await supabase
    .from("steps")
    .select("id, slug")
    .eq("floorplan_id", floorplanId);

  const existingStepMap = new Map<string, string>();
  if (existingSteps.data) {
    for (const s of existingSteps.data) {
      existingStepMap.set(s.slug, s.id);
    }
  }

  const stepIdMap = new Map<string, string>();

  for (let i = 0; i < STEP_TEMPLATES.length; i++) {
    const tmpl = STEP_TEMPLATES[i];

    // Resolve sections: subcategory slugs → UUIDs
    const sections = tmpl.sections.map((sec, j) => ({
      title: sec.title,
      subcategory_ids: sec.subcategorySlugs.map((slug) => {
        const uuid = subSlugToUuid.get(slug);
        if (!uuid) {
          console.error(`No UUID found for subcategory slug: ${slug}`);
          process.exit(1);
        }
        return uuid;
      }),
      sort_order: j,
    }));

    const stepRow = {
      floorplan_id: floorplanId,
      org_id: orgId,
      slug: tmpl.slug,
      number: i + 1,
      name: tmpl.name,
      subtitle: tmpl.subtitle,
      hero_image: null,
      hero_variant: "full" as const,
      show_generate_button: false,
      scene_description: null,
      also_include_ids: [] as string[],
      photo_baseline: null,
      sort_order: i,
      sections,
    };

    const existingId = existingStepMap.get(tmpl.slug);
    const upsertRow = existingId ? { id: existingId, ...stepRow } : stepRow;

    const { data: stepData, error: stepErr } = await supabase
      .from("steps")
      .upsert(upsertRow, { onConflict: existingId ? "id" : "floorplan_id,slug" })
      .select("id, slug")
      .single();

    if (stepErr || !stepData) {
      console.error(`Failed to upsert step ${tmpl.slug}:`, stepErr);
      process.exit(1);
    }
    stepIdMap.set(stepData.slug, stepData.id);
  }
  console.log(`  Steps: ${STEP_TEMPLATES.length}`);

  // ---------- Summary ----------
  console.log("\nSeed complete!");
  console.log(`  1 org, 1 floorplan`);
  console.log(`  ${categoryRows.length} categories`);
  console.log(`  ${subcategoryRows.length} subcategories`);
  console.log(`  ${optionRows.length} options`);
  console.log(`  ${STEP_TEMPLATES.length} steps with ${STEP_TEMPLATES.reduce((n, s) => n + s.sections.length, 0)} sections`);
  console.log("\nNext steps:");
  console.log(`  1. Upload room photos in the admin panel`);
  console.log(`  2. Add upgrade options with swatches for each subcategory`);
  console.log(`  3. Configure AI generation (scene descriptions, spatial hints)`);
  console.log(`  4. Visit: http://localhost:3003/${orgSlug}/${floorplanSlug}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
