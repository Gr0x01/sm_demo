/**
 * Seed script: creates the Lenox floorplan for Stone Martin by duplicating Kinkade,
 * then seeds per-floorplan pricing overrides from Lenox price sheet data.
 *
 * Usage:
 *   npx tsx scripts/seed-lenox.ts
 *
 * Prerequisites:
 *   - option_floorplan_pricing table must exist (run migration first)
 *   - Stone Martin org + Kinkade floorplan must exist
 *
 * Idempotent: skips floorplan creation if "lenox" slug already exists.
 */

import { createClient } from "@supabase/supabase-js";

// ---------- Supabase client ----------

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key);

const SM_ORG_SLUG = "stonemartin";
const KINKADE_SLUG = "kinkade";
const LENOX_SLUG = "lenox";
const LENOX_NAME = "Lenox";

// ---------- Lenox pricing overrides ----------
// Keyed by option slug → Lenox price (dollars, matching existing format).
// Only include options where Lenox price differs from Kinkade base price.
// Extracted from Lenox price sheet (McClain Landing Phase 7).

const LENOX_PRICES: Record<string, number> = {
  // ── Flooring — Main Area Flooring Type ──
  // Lenox is larger so all flooring upgrades cost more
  "flooring-type-7-lvp-primary": 1775,        // Kinkade: 1475
  "flooring-type-9-lvp-standard": 2620,        // Kinkade: 2095
  "flooring-type-5-hardwood-standard": 3980,   // Kinkade: 3350
  "flooring-type-9-lvp-primary": 4920,         // Kinkade: 3980
  "flooring-type-5-hardwood-primary": 5890,    // Kinkade: 4955
  "flooring-type-7-lvp-whole": 6430,           // Kinkade: 5515
  "flooring-type-7-hardwood-standard": 6735,   // Kinkade: 5495
  "flooring-type-7-hardwood-primary": 8835,    // Kinkade: 7410
  "flooring-type-9-lvp-whole": 10210,          // Kinkade: 8690
  "flooring-type-5-hardwood-whole": 12100,     // Kinkade: 10210
  "flooring-type-7-hardwood-whole": 16320,     // Kinkade: 13695

  // ── Flooring — Carpet Color (Gifted series) ──
  "carpet-gifted-art-sculpture": 1100,         // Kinkade: 900
  "carpet-gifted-blend-sculpture": 1100,       // Kinkade: 900
  "carpet-gifted-art-almond-silk": 1100,       // Kinkade: 900
  "carpet-gifted-art-river-birch": 1100,       // Kinkade: 900
  "carpet-gifted-art-subtle-clay": 1100,       // Kinkade: 900
  "carpet-gifted-blend-river-birch": 1100,     // Kinkade: 900
  "carpet-gifted-blend-subtle-clay": 1100,     // Kinkade: 900
  "carpet-gifted-blend-almond-silk": 1100,     // Kinkade: 900

  // ── Countertops — Counter Top ──
  // Larger kitchen means more counter surface
  "ct-granite-luna-pearl": 450,                // Kinkade: 350
  "ct-granite-leathered-steel-grey": 750,      // Kinkade: 600
  "ct-granite-colonial-white": 950,            // Kinkade: 750
  "ct-granite-oyster-white": 950,              // Kinkade: 750
  "ct-granite-fantasy-brown": 1300,            // Kinkade: 1050
  "ct-quartz-lace-white": 1400,               // Kinkade: 1100
  "ct-quartz-bianco-carrara": 1750,            // Kinkade: 1400
  "ct-quartz-carrara-mist": 1750,              // Kinkade: 1400
  "ct-quartz-pure-white": 1900,               // Kinkade: 1550
  "ct-quartz-calacatta-duolina": 1950,         // Kinkade: 1550
  "ct-granite-leathered-fantasy-brown": 1950,  // Kinkade: 1550
  "ct-quartz-calacatta-idillio": 2600,         // Kinkade: 2100
  "ct-quartz-calacatta-lavasa": 3000,          // Kinkade: 2400
  "ct-quartz-calacatta-venice": 3050,          // Kinkade: 2450

  // ── Countertops — Countertop Edge ──
  "edge-ogee": 450,                            // Kinkade: 350
  "edge-bullnose": 450,                        // Kinkade: 350

  // ── Trim — Crown Options ──
  "crown-all-flat-ceiling": 1200,              // Kinkade: 1000
  "crown-cove-included": 1800,                 // Kinkade: 1500
  "crown-cove-all": 3600,                      // Kinkade: 3000

  // ── Trim — Baseboard Options ──
  "baseboard-craftsman": 425,                  // Kinkade: 350
  "baseboard-7inch": 750,                      // Kinkade: 600

  // ── Trim — Wainscoting ──
  "wainscoting-traditional": 1100,             // Kinkade: 900
  "wainscoting-tall-shaker": 1500,             // Kinkade: 1200

  // ── Trim — Door and Window Casing ──
  "casing-craftsman": 3100,                    // Kinkade: 2500

  // ── Trim — Interior Door Style ──
  "door-cheyenne": 300,                        // Kinkade: 250
  "door-riverchase": 350,                      // Kinkade: 275

  // ── Trim — Pantry Shelving ──
  "pantry-wood": 1200,                         // Kinkade: 1000

  // ── Trim — Primary Closet Shelving ──
  "closet-wood": 3500,                         // Kinkade: 2900

  // ── Trim — Bonus Room Stair Treads ──
  "stair-hardwood": 1600,                      // Kinkade: 1300

  // ── Paint — Door and Door Casing Color ──
  "door-color-in-the-shadows": 3100,           // Kinkade: 2500
  "door-color-rabbits-ear": 3100,              // Kinkade: 2500
  "door-color-hurricane-haze": 3100,           // Kinkade: 2500
  "door-color-dark-woods": 3100,               // Kinkade: 2500
  "door-color-knights-armor": 3100,            // Kinkade: 2500

  // ── Hardware — Blinds ──
  "blinds-add": 1500,                          // Kinkade: 1300

  // ── Insulation — Spray Foam ──
  "spray-foam-add": 9500,                      // Kinkade: 8000
};

// ---------- Main ----------

async function main() {
  // 1. Look up SM org
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", SM_ORG_SLUG)
    .single();

  if (orgErr || !org) {
    console.error("Stone Martin org not found:", orgErr?.message);
    process.exit(1);
  }
  console.log(`Found org: ${org.name} (${org.id})`);

  // 2. Look up Kinkade floorplan
  const { data: kinkade, error: kErr } = await supabase
    .from("floorplans")
    .select("id, name")
    .eq("org_id", org.id)
    .eq("slug", KINKADE_SLUG)
    .single();

  if (kErr || !kinkade) {
    console.error("Kinkade floorplan not found:", kErr?.message);
    process.exit(1);
  }
  console.log(`Found Kinkade: ${kinkade.name} (${kinkade.id})`);

  // 3. Check if Lenox already exists
  const { data: existing } = await supabase
    .from("floorplans")
    .select("id")
    .eq("org_id", org.id)
    .eq("slug", LENOX_SLUG)
    .maybeSingle();

  let lenoxId: string;

  if (existing) {
    lenoxId = existing.id;
    console.log(`Lenox already exists (${lenoxId}), skipping creation.`);
  } else {
    // 4. Duplicate Kinkade → Lenox
    // Replicate the duplicate logic directly with service client (no auth needed)
    console.log("Duplicating Kinkade → Lenox...");

    // Fetch source floorplan
    const { data: source } = await supabase
      .from("floorplans")
      .select("*")
      .eq("id", kinkade.id)
      .single();

    if (!source) {
      console.error("Failed to fetch Kinkade details");
      process.exit(1);
    }

    // Create Lenox floorplan
    const { data: newFp, error: fpErr } = await supabase
      .from("floorplans")
      .insert({
        slug: LENOX_SLUG,
        org_id: org.id,
        name: LENOX_NAME,
        community: source.community,
        price_sheet_label: "Lenox",
        is_active: true,
      })
      .select()
      .single();

    if (fpErr || !newFp) {
      console.error("Failed to create Lenox floorplan:", fpErr?.message);
      process.exit(1);
    }

    lenoxId = newFp.id;
    console.log(`Created Lenox floorplan: ${lenoxId}`);

    // Clone steps
    const { data: sourceSteps } = await supabase
      .from("steps")
      .select("*")
      .eq("floorplan_id", kinkade.id)
      .eq("org_id", org.id)
      .order("sort_order", { ascending: true });

    const stepIdMap = new Map<string, string>();

    for (const [index, step] of (sourceSteps ?? []).entries()) {
      const { data: newStep, error: stepErr } = await supabase
        .from("steps")
        .insert({
          slug: step.slug,
          org_id: org.id,
          floorplan_id: lenoxId,
          name: step.name,
          subtitle: step.subtitle,
          number: index + 1,
          sort_order: index,
          show_generate_button: step.show_generate_button,
          scene_description: step.scene_description,
          also_include_ids: step.also_include_ids,
          photo_baseline: step.photo_baseline,
          spatial_hints: step.spatial_hints,
          sections: step.sections,
          hero_variant: step.hero_variant,
        })
        .select()
        .single();

      if (stepErr || !newStep) {
        console.error(`Failed to clone step "${step.name}":`, stepErr?.message);
        continue;
      }

      stepIdMap.set(step.id, newStep.id);
      console.log(`  Cloned step: ${step.name}`);

      // Clone step photos
      const { data: photos } = await supabase
        .from("step_photos")
        .select("*")
        .eq("step_id", step.id)
        .eq("org_id", org.id)
        .order("sort_order", { ascending: true });

      for (const photo of photos ?? []) {
        // Download + re-upload photo
        const { data: fileData, error: dlErr } = await supabase.storage
          .from("rooms")
          .download(photo.image_path);

        if (dlErr || !fileData) {
          console.error(`  Failed to download photo: ${photo.image_path}`);
          continue;
        }

        const originalName = photo.image_path.split("/").pop() ?? "photo.jpg";
        const filename = `${photo.id}_${originalName}`;
        const newPath = `${org.id}/rooms/${newStep.id}/${filename}`;

        const { error: upErr } = await supabase.storage
          .from("rooms")
          .upload(newPath, fileData, {
            contentType: fileData.type || "image/jpeg",
            upsert: true,
          });

        if (upErr) {
          console.error(`  Failed to upload photo: ${upErr.message}`);
          continue;
        }

        const { error: insertErr } = await supabase.from("step_photos").insert({
          org_id: org.id,
          step_id: newStep.id,
          image_path: newPath,
          label: photo.label,
          is_hero: photo.is_hero,
          sort_order: photo.sort_order,
          spatial_hint: photo.spatial_hint,
          photo_baseline: photo.photo_baseline,
          subcategory_ids: photo.subcategory_ids,
          check_result: photo.check_result,
          check_feedback: photo.check_feedback,
        });

        if (insertErr) {
          console.error(`  Failed to insert photo row: ${insertErr.message}`);
        }
      }
    }

    // Remap also_include_ids
    for (const [oldId, newId] of stepIdMap) {
      const sourceStep = (sourceSteps ?? []).find((s) => s.id === oldId);
      if (!sourceStep?.also_include_ids?.length) continue;

      const remapped = (sourceStep.also_include_ids as string[])
        .map((refId: string) => stepIdMap.get(refId))
        .filter(Boolean);

      await supabase.from("steps").update({ also_include_ids: remapped }).eq("id", newId);
    }

    console.log("Floorplan duplication complete.");
  }

  // 5. Seed pricing overrides
  console.log("\nSeeding Lenox pricing overrides...");

  // Look up all options for this org by slug
  const { data: allOptions, error: optErr } = await supabase
    .from("options")
    .select("id, slug, price")
    .eq("org_id", org.id);

  if (optErr || !allOptions) {
    console.error("Failed to fetch options:", optErr?.message);
    process.exit(1);
  }

  const optionsBySlug = new Map(allOptions.map((o) => [o.slug, o]));

  let matchCount = 0;
  let missingCount = 0;
  const rows: { option_id: string; floorplan_id: string; price: number }[] = [];

  for (const [slug, lenoxPrice] of Object.entries(LENOX_PRICES)) {
    const opt = optionsBySlug.get(slug);
    if (!opt) {
      console.warn(`  Option slug not found: ${slug}`);
      missingCount++;
      continue;
    }

    if (opt.price === lenoxPrice) {
      matchCount++;
      continue;
    }

    rows.push({ option_id: opt.id, floorplan_id: lenoxId, price: lenoxPrice });
    console.log(`  Override: ${slug} $${opt.price} → $${lenoxPrice}`);
  }

  if (rows.length > 0) {
    const { error: upsertErr } = await supabase
      .from("option_floorplan_pricing")
      .upsert(rows, { onConflict: "option_id,floorplan_id" });

    if (upsertErr) {
      console.error("Failed to upsert overrides:", upsertErr.message);
      process.exit(1);
    }
  }

  console.log(`\nDone. ${rows.length} overrides, ${matchCount} matching base, ${missingCount} missing slugs.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
