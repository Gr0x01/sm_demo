/**
 * Audit script: Pull all SM Kinkade step photos, subcategories, and options
 * from the DB and dump them for BFL Flux 2 readiness review.
 *
 * Usage: npx tsx scripts/audit-sm-kinkade.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  // 1. Get SM org
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", "stonemartin")
    .single();

  if (orgErr || !org) {
    console.error("Could not find stonemartin org:", orgErr);
    process.exit(1);
  }
  console.log(`\n=== ORG: ${org.name} (${org.id}) ===\n`);

  // 2. Get Kinkade floorplan specifically
  const { data: floorplans, error: fpErr } = await supabase
    .from("floorplans")
    .select("id, name, slug")
    .eq("org_id", org.id)
    .ilike("name", "%kinkade%");

  if (fpErr || !floorplans || floorplans.length === 0) {
    console.error("Could not find Kinkade floorplan:", fpErr);
    process.exit(1);
  }

  const floorplan = floorplans[0];
  console.log(`=== FLOORPLAN: ${floorplan.name} (id: ${floorplan.id}, slug: ${floorplan.slug}) ===\n`);

  // 3. Get all steps for this floorplan
  const { data: steps, error: stepsErr } = await supabase
    .from("steps")
    .select("id, slug, name, number, scene_description, spatial_hints, photo_baseline, sections")
    .eq("floorplan_id", floorplan.id)
    .order("sort_order");

  if (stepsErr || !steps) {
    console.error("Could not fetch steps:", stepsErr);
    process.exit(1);
  }

  console.log(`Found ${steps.length} steps.\n`);

  // 4. Get all step photos
  const { data: photos, error: photosErr } = await supabase
    .from("step_photos")
    .select("id, label, image_path, is_hero, sort_order, spatial_hint, photo_baseline, subcategory_ids, step_id")
    .in("step_id", steps.map((s) => s.id))
    .order("sort_order");

  if (photosErr || !photos) {
    console.error("Could not fetch step_photos:", photosErr);
    process.exit(1);
  }

  console.log(`Found ${photos.length} step photos.\n`);

  // 5. Get generation policies for all photos
  const { data: policies, error: policiesErr } = await supabase
    .from("step_photo_generation_policies")
    .select("step_photo_id, policy_key, is_active, policy_json")
    .eq("org_id", org.id);

  const policyByPhotoId = new Map<string, Record<string, unknown>>();
  for (const p of policies ?? []) {
    if (p.is_active) {
      policyByPhotoId.set(p.step_photo_id as string, p.policy_json as Record<string, unknown>);
    }
  }

  if (policiesErr) {
    console.warn("Warning: could not fetch generation policies:", policiesErr.message);
  }

  // 6. Get all subcategories for this org
  const { data: subcats, error: subcatsErr } = await supabase
    .from("subcategories")
    .select("id, slug, name, is_visual, generation_hint, generation_rules, generation_rules_when_not_selected, is_appliance")
    .eq("org_id", org.id);

  if (subcatsErr || !subcats) {
    console.error("Could not fetch subcategories:", subcatsErr);
    process.exit(1);
  }
  const subcatBySlug = new Map(subcats.map((s) => [s.slug, s]));

  // 7. Get all options with generation_rules, dimensions, or prompt_descriptor
  const { data: options, error: optsErr } = await supabase
    .from("options")
    .select("id, slug, name, subcategory_id, generation_rules, dimensions, prompt_descriptor, swatch_url, swatch_color")
    .eq("org_id", org.id);

  if (optsErr) {
    console.warn("Warning: could not fetch options:", optsErr.message);
  }

  // ============================================================
  // DUMP STEP PHOTOS
  // ============================================================
  console.log("==========================================================");
  console.log("STEP PHOTOS AUDIT");
  console.log("==========================================================\n");

  const stepById = new Map(steps.map((s) => [s.id, s]));

  for (const photo of photos) {
    const step = stepById.get(photo.step_id);
    console.log(`--------------------------------------------------------------`);
    console.log(`PHOTO: "${photo.label}" (id: ${photo.id})`);
    console.log(`  Step: ${step?.name ?? "?"} (slug: ${step?.slug})`);
    console.log(`  is_hero: ${photo.is_hero}`);
    console.log(`  subcategory_ids: ${JSON.stringify(photo.subcategory_ids)}`);
    console.log();

    // spatial_hint
    console.log(`  spatial_hint (per-photo):`);
    if (photo.spatial_hint) {
      console.log(`    "${photo.spatial_hint}"`);
    } else {
      console.log(`    [NULL — MISSING]`);
    }

    // photo_baseline
    console.log(`  photo_baseline (per-photo):`);
    if (photo.photo_baseline) {
      console.log(`    "${photo.photo_baseline}"`);
    } else {
      console.log(`    [NULL — MISSING]`);
    }

    // generation policy
    const policy = policyByPhotoId.get(photo.id);
    console.log(`  step_photo_generation_policies:`);
    if (policy) {
      console.log(JSON.stringify(policy, null, 4).split("\n").map((l) => `    ${l}`).join("\n"));
    } else {
      console.log(`    [NONE — no active policy]`);
    }
    console.log();
  }

  // Step-level spatial_hints (from steps table)
  console.log("==========================================================");
  console.log("STEPS — spatial_hints (step-level)");
  console.log("==========================================================\n");

  for (const step of steps) {
    console.log(`STEP: ${step.name} (slug: ${step.slug})`);
    console.log(`  scene_description: ${step.scene_description ? `"${step.scene_description}"` : "[NULL]"}`);
    console.log(`  spatial_hints (JSONB):`);
    if (step.spatial_hints) {
      console.log(
        JSON.stringify(step.spatial_hints, null, 4)
          .split("\n")
          .map((l) => `    ${l}`)
          .join("\n"),
      );
    } else {
      console.log(`    [NULL — MISSING]`);
    }
    console.log(`  photo_baseline (JSONB):`);
    if (step.photo_baseline) {
      console.log(
        JSON.stringify(step.photo_baseline, null, 4)
          .split("\n")
          .map((l) => `    ${l}`)
          .join("\n"),
      );
    } else {
      console.log(`    [NULL]`);
    }
    console.log();
  }

  // ============================================================
  // SUBCATEGORIES AUDIT
  // ============================================================
  console.log("==========================================================");
  console.log("SUBCATEGORIES AUDIT (visual ones referenced in this floorplan)");
  console.log("==========================================================\n");

  // Collect all slugs referenced in step photos
  const referencedSlugs = new Set<string>();
  for (const p of photos) {
    for (const slug of p.subcategory_ids ?? []) {
      referencedSlugs.add(slug);
    }
  }
  // Also include slugs from step sections
  for (const step of steps) {
    const sections = (step.sections as { title: string; subcategory_ids: string[] }[]) ?? [];
    for (const sec of sections) {
      for (const slug of sec.subcategory_ids ?? []) {
        referencedSlugs.add(slug);
      }
    }
  }

  for (const slug of Array.from(referencedSlugs).sort()) {
    const sub = subcatBySlug.get(slug);
    if (!sub) {
      console.log(`SUBCATEGORY slug="${slug}" — NOT FOUND IN DB`);
      continue;
    }
    if (!sub.is_visual) continue; // skip non-visual

    console.log(`SUBCATEGORY: "${sub.name}" (slug: ${slug})`);
    console.log(`  is_appliance: ${sub.is_appliance}`);

    console.log(`  generation_hint:`);
    if (sub.generation_hint) {
      console.log(`    "${sub.generation_hint}"`);
    } else {
      console.log(`    [NULL]`);
    }

    console.log(`  generation_rules (array):`);
    if (sub.generation_rules && sub.generation_rules.length > 0) {
      for (const r of sub.generation_rules) {
        console.log(`    - "${r}"`);
      }
    } else {
      console.log(`    [NULL or empty]`);
    }

    console.log(`  generation_rules_when_not_selected:`);
    if (sub.generation_rules_when_not_selected && sub.generation_rules_when_not_selected.length > 0) {
      for (const r of sub.generation_rules_when_not_selected) {
        console.log(`    - "${r}"`);
      }
    } else {
      console.log(`    [NULL or empty]`);
    }
    console.log();
  }

  // ============================================================
  // OPTIONS WITH GENERATION_RULES, DIMENSIONS, OR DESCRIPTOR
  // ============================================================
  console.log("==========================================================");
  console.log("OPTIONS — generation_rules, dimensions, prompt_descriptor (referenced subcats)");
  console.log("==========================================================\n");

  const subcatIdBySlug = new Map(subcats.map((s) => [s.slug, s.id]));
  const referencedSubcatIds = new Set(
    Array.from(referencedSlugs)
      .map((slug) => subcatIdBySlug.get(slug))
      .filter(Boolean) as string[],
  );

  for (const opt of options ?? []) {
    if (!referencedSubcatIds.has(opt.subcategory_id)) continue;

    const hasRules = opt.generation_rules && opt.generation_rules.length > 0;
    const hasDims = opt.dimensions && opt.dimensions.trim().length > 0;
    const hasDescriptor = opt.prompt_descriptor && opt.prompt_descriptor.trim().length > 0;
    const hasSwatch = !!opt.swatch_url;

    if (!hasRules && !hasDims && !hasDescriptor) continue;

    const sub = subcats.find((s) => s.id === opt.subcategory_id);

    console.log(`OPTION: "${opt.name}" (slug: ${opt.slug})`);
    console.log(`  Subcategory: ${sub?.name ?? "?"}`);
    console.log(`  has_swatch: ${hasSwatch}`);

    if (hasDescriptor) {
      console.log(`  prompt_descriptor: "${opt.prompt_descriptor}"`);
      if (hasSwatch) {
        console.log(`    ^ WARNING: prompt_descriptor present alongside swatch — swatch authority violation`);
      }
    }

    if (hasDims) {
      console.log(`  dimensions: "${opt.dimensions}"`);
    }

    if (hasRules) {
      console.log(`  generation_rules:`);
      for (const r of opt.generation_rules!) {
        console.log(`    - "${r}"`);
      }
    }
    console.log();
  }

  console.log("\nAudit complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
