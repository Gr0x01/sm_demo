/**
 * Migration script: uploads Stone Martin static assets to Supabase Storage
 * and creates step_photos rows so SM uses the multi-tenant generation path.
 *
 * Usage: npx tsx scripts/migrate-sm-storage.ts
 *
 * Idempotent — checks for existing step_photos before inserting,
 * uses upsert for Storage uploads, skips swatch_url if already a full URL.
 */

import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import path from "path";
import { readdirSync, statSync } from "fs";

// ---------- Supabase client ----------

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key);

// ---------- Constants ----------

const ORG_SLUG = "stone-martin";
const FLOORPLAN_SLUG = "kinkade";

/** Room photo config: step slug → photos to upload */
const ROOM_PHOTOS: {
  stepSlug: string;
  file: string;
  isHero: boolean;
  sortOrder: number;
  label: string;
  photoBaseline: string | null;
}[] = [
  { stepSlug: "set-your-style", file: "greatroom-wide.webp", isHero: true, sortOrder: 0, label: "Great Room", photoBaseline: null },
  { stepSlug: "design-your-kitchen", file: "kitchen-close.webp", isHero: true, sortOrder: 0, label: "Kitchen", photoBaseline: null },
  { stepSlug: "primary-bath", file: "primary-bath-vanity.webp", isHero: true, sortOrder: 0, label: "Vanity", photoBaseline: null },
  {
    stepSlug: "primary-bath",
    file: "primary-bath-shower.webp",
    isHero: false,
    sortOrder: 1,
    label: "Shower",
    photoBaseline: "This photo shows a walk-in shower in a primary bathroom of a new-construction home. The shower has large format tile on the walls and floor, a glass entry panel, a showerhead, and a small mosaic tile accent on the shower floor. The bathroom floor outside the shower is also tiled.",
  },
  { stepSlug: "secondary-spaces", file: "primary-bedroom.webp", isHero: true, sortOrder: 0, label: "Primary Bedroom", photoBaseline: null },
  {
    stepSlug: "secondary-spaces",
    file: "bath-closet.webp",
    isHero: false,
    sortOrder: 1,
    label: "Bath & Closet",
    photoBaseline: "This photo shows a secondary bathroom and walk-in closet in a new-construction home. The bathroom has a vanity with a mirror, tile flooring, and a shower or tub. The closet has shelving. Walls are painted white with white trim.",
  },
];

// ---------- Helpers ----------

/** Recursively collect all files under a directory, returning relative paths. */
function walkDir(dir: string, base: string = dir): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkDir(full, base));
    } else {
      results.push(path.relative(base, full));
    }
  }
  return results;
}

function mimeFromExt(ext: string): string {
  const e = ext.toLowerCase();
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "png") return "image/png";
  if (e === "webp") return "image/webp";
  if (e === "svg") return "image/svg+xml";
  return `image/${e}`;
}

// ---------- Main ----------

async function main() {
  console.log("Migrating Stone Martin assets to Supabase Storage...\n");

  // 1. Look up org and floorplan
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", ORG_SLUG)
    .single();

  if (orgErr || !org) {
    console.error("Failed to find org:", orgErr);
    process.exit(1);
  }
  const orgId = org.id;
  console.log(`  Org: ${ORG_SLUG} (${orgId})`);

  const { data: fp, error: fpErr } = await supabase
    .from("floorplans")
    .select("id")
    .eq("org_id", orgId)
    .eq("slug", FLOORPLAN_SLUG)
    .single();

  if (fpErr || !fp) {
    console.error("Failed to find floorplan:", fpErr);
    process.exit(1);
  }
  const floorplanId = fp.id;
  console.log(`  Floorplan: ${FLOORPLAN_SLUG} (${floorplanId})`);

  // Look up steps
  const { data: stepsData, error: stepsErr } = await supabase
    .from("steps")
    .select("id, slug")
    .eq("floorplan_id", floorplanId);

  if (stepsErr || !stepsData) {
    console.error("Failed to fetch steps:", stepsErr);
    process.exit(1);
  }
  const stepSlugToId = new Map(stepsData.map((s) => [s.slug, s.id]));
  console.log(`  Steps found: ${stepsData.length}`);

  // ---------------------------------------------------------------
  // 1a. Upload room photos to `rooms` bucket
  // ---------------------------------------------------------------
  console.log("\n--- Uploading room photos ---");
  const roomsDir = path.join(process.cwd(), "public", "rooms");

  for (const photo of ROOM_PHOTOS) {
    const stepId = stepSlugToId.get(photo.stepSlug);
    if (!stepId) {
      console.error(`  Step not found: ${photo.stepSlug}`);
      continue;
    }

    const localPath = path.join(roomsDir, photo.file);
    const storagePath = `${orgId}/rooms/${stepId}/${photo.file}`;
    const ext = path.extname(photo.file).slice(1);
    const contentType = mimeFromExt(ext);

    const buffer = await readFile(localPath);
    const { error: uploadErr } = await supabase.storage
      .from("rooms")
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (uploadErr) {
      console.error(`  Upload failed for ${photo.file}:`, uploadErr);
    } else {
      console.log(`  Uploaded: ${storagePath}`);
    }
  }

  // ---------------------------------------------------------------
  // 1b. Create step_photos rows
  // ---------------------------------------------------------------
  console.log("\n--- Creating step_photos ---");

  // Check existing step_photos for this org to avoid duplicates
  const { data: existingPhotos } = await supabase
    .from("step_photos")
    .select("step_id, image_path")
    .eq("org_id", orgId);

  const existingPhotoKeys = new Set(
    (existingPhotos ?? []).map((p) => `${p.step_id}:${p.image_path}`)
  );

  let insertedPhotos = 0;
  let skippedPhotos = 0;

  for (const photo of ROOM_PHOTOS) {
    const stepId = stepSlugToId.get(photo.stepSlug);
    if (!stepId) continue;

    const storagePath = `${orgId}/rooms/${stepId}/${photo.file}`;
    const key = `${stepId}:${storagePath}`;

    if (existingPhotoKeys.has(key)) {
      skippedPhotos++;
      continue;
    }

    const { error: insertErr } = await supabase
      .from("step_photos")
      .insert({
        step_id: stepId,
        org_id: orgId,
        image_path: storagePath,
        is_hero: photo.isHero,
        sort_order: photo.sortOrder,
        label: photo.label,
        spatial_hint: null,
        photo_baseline: photo.photoBaseline,
      });

    if (insertErr) {
      console.error(`  Insert failed for ${photo.file}:`, insertErr);
    } else {
      insertedPhotos++;
      console.log(`  Created: step_photo for ${photo.label} (${photo.stepSlug})`);
    }
  }
  console.log(`  Inserted: ${insertedPhotos}, Skipped (existing): ${skippedPhotos}`);

  // ---------------------------------------------------------------
  // 1c. Upload swatches to `swatches` bucket
  // ---------------------------------------------------------------
  console.log("\n--- Uploading swatches ---");
  const swatchesDir = path.join(process.cwd(), "public", "swatches");
  const swatchFiles = walkDir(swatchesDir);
  console.log(`  Found ${swatchFiles.length} swatch files`);

  let uploadedSwatches = 0;
  const failedSwatchPaths = new Set<string>();
  for (const relativePath of swatchFiles) {
    const localPath = path.join(swatchesDir, relativePath);
    const storagePath = `${orgId}/${relativePath}`;
    const ext = path.extname(relativePath).slice(1);
    const contentType = mimeFromExt(ext);

    const buffer = await readFile(localPath);
    const { error: uploadErr } = await supabase.storage
      .from("swatches")
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (uploadErr) {
      if (!uploadErr.message?.includes("already exists")) {
        console.error(`  Upload failed for ${relativePath}:`, uploadErr);
        failedSwatchPaths.add(relativePath);
      }
    } else {
      uploadedSwatches++;
    }
  }
  console.log(`  Uploaded: ${uploadedSwatches} swatches`);
  if (failedSwatchPaths.size > 0) {
    console.warn(`  Failed: ${failedSwatchPaths.size} swatches (will skip URL update for these)`);
  }

  // ---------------------------------------------------------------
  // 1d. Update options.swatch_url to point to Storage public URLs
  // ---------------------------------------------------------------
  console.log("\n--- Updating swatch_url on options ---");

  const { data: options, error: optErr } = await supabase
    .from("options")
    .select("id, swatch_url")
    .eq("org_id", orgId)
    .not("swatch_url", "is", null);

  if (optErr) {
    console.error("Failed to fetch options:", optErr);
    process.exit(1);
  }

  let updatedUrls = 0;
  let skippedUrls = 0;

  for (const opt of options ?? []) {
    if (!opt.swatch_url) continue;

    // Skip if already a full URL (already migrated)
    if (opt.swatch_url.startsWith("http")) {
      skippedUrls++;
      continue;
    }

    // Strip leading /swatches/ prefix
    let relativePath = opt.swatch_url;
    if (relativePath.startsWith("/swatches/")) {
      relativePath = relativePath.slice("/swatches/".length);
    }

    // Skip if the swatch upload failed for this file
    if (failedSwatchPaths.has(relativePath)) {
      console.warn(`  Skipping URL update for ${opt.id} — swatch upload failed`);
      continue;
    }

    const storagePath = `${orgId}/${relativePath}`;
    const { data: { publicUrl } } = supabase.storage
      .from("swatches")
      .getPublicUrl(storagePath);

    const { error: updateErr } = await supabase
      .from("options")
      .update({ swatch_url: publicUrl })
      .eq("id", opt.id);

    if (updateErr) {
      console.error(`  Update failed for option ${opt.id}:`, updateErr);
    } else {
      updatedUrls++;
    }
  }
  console.log(`  Updated: ${updatedUrls}, Skipped (already URL): ${skippedUrls}`);

  // ---------------------------------------------------------------
  // 1e. Increase generation cap for SM (sales demo — don't want cap during demos)
  // ---------------------------------------------------------------
  console.log("\n--- Updating generation cap ---");
  const { error: capErr } = await supabase
    .from("organizations")
    .update({ generation_cap_per_session: 100 })
    .eq("id", orgId);

  if (capErr) {
    console.error("Failed to update generation cap:", capErr);
  } else {
    console.log("  Set generation_cap_per_session = 100 for Stone Martin");
  }

  // ---------- Summary ----------
  console.log("\nMigration complete!");
  console.log(`  ${ROOM_PHOTOS.length} room photos → Storage + step_photos rows`);
  console.log(`  ${uploadedSwatches} swatches → Storage`);
  console.log(`  ${updatedUrls} option swatch_url fields → Storage public URLs`);
  console.log(`  Generation cap → 100`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
