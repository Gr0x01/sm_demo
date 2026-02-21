/**
 * Migration script: uploads Stone Martin static assets to Supabase Storage
 * and creates step_photos rows so SM uses the multi-tenant generation path.
 *
 * Usage: npx tsx scripts/migrate-sm-storage.ts
 *
 * Idempotent — updates existing step_photos in place and inserts missing rows,
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

const ORG_SLUG = "stonemartin";
const FLOORPLAN_SLUG = "kinkade";

/** Per-image spatial hints used by AI generation prompts. */
const ROOM_PHOTO_SPATIAL_HINTS: Record<string, string> = {
  "kitchen-close.webp":
    "Large island dominates the foreground with sink + faucet on the island; keep sink cutout and faucet direction fixed. Perimeter cabinets, backsplash, and range are on the back wall; refrigerator stays in its alcove. Dishwasher remains next to the sink; do not alter cabinet panel geometry.",
  "kitchen-greatroom.webp":
    "View runs from kitchen into great room: island in midground, living area/fireplace beyond. Keep kitchen finishes confined to cabinets/counters/backsplash and keep great-room finishes on walls/fireplace/flooring. Maintain continuous plank-floor perspective and fixture positions.",
  "greatroom-wide.webp":
    "Great room is foreground, kitchen is background. Fireplace wall, trim, and paint are primary editable surfaces in the living area; kitchen cabinetry remains separate unless explicitly selected. Keep chandelier/fan positions and room layout unchanged.",
  "primary-bath-vanity.webp":
    "Double vanity and mirrors are on the left; shower zone is on the right. Vanity color/hardware/faucet edits apply only to the vanity assembly; mirror edits apply only above sinks. Keep tile confined to bathroom floor/shower surfaces and preserve shower glass geometry.",
  "primary-bath-shower.webp":
    "Shower is the focal area with large-format wall tile, distinct shower-floor mosaic, and glass entry. Keep rain head/hand shower in the same positions and preserve glass panel shape. Do not move tile materials into non-shower wall zones.",
  "fireplace.png":
    "Brick fireplace is the focal point on the center wall. Editable surfaces: mantel surround and style, accent area above the mantel, hearth/base brick or tile, and tile surround framing the firebox. Keep firebox opening shape and proportions fixed. Hardwood flooring runs throughout the room. Ceiling fan and chandelier remain in place — preserve positions. Windows flank the fireplace on both sides — preserve window positions and natural light. Wall paint and trim edits apply to surrounding walls. Flooring, baseboard, and crown edits apply to the room surfaces.",
  "primary-bedroom.webp":
    "Primary bedroom with hardwood/LVP flooring throughout. Tray ceiling with crown molding and ceiling fan — keep ceiling shape and fan position fixed. Two windows on the right wall, doorway to bathroom on the left — preserve window and door positions. Wall paint, trim, baseboard, and door-style edits apply to visible surfaces. Flooring edits apply to the hardwood floor. Do not change room geometry.",
  "bath-closet.webp":
    "Split scene: primary bathroom zone on the left (vanity with white cabinets, dark-framed mirror, vanity light fixture, towel rings, tile floor) and walk-in closet on the right (wire shelving, hardwood floor). A door in the center leads to the bedroom. Keep vanity/mirror/hardware edits confined to the bath side, and closet shelving edits confined to the closet side. Preserve doorway boundaries and mixed-surface transitions between tile and hardwood.",
  "secondary-bedroom.webp":
    "Carpeted secondary bedroom with dormer nook. Ceiling fan centered in main area; keep fan position fixed. Window is recessed in the dormer alcove — preserve window and dormer geometry. Carpet covers the entire floor. White baseboards run along all walls. Wall paint and trim edits apply to all wall surfaces. Do not alter room shape or dormer proportions.",
};

/** Room photo config: step slug → photos to upload */
const ROOM_PHOTOS: {
  stepSlug: string;
  file: string;
  isHero: boolean;
  sortOrder: number;
  label: string;
  spatialHint: string | null;
  photoBaseline: string | null;
}[] = [
  {
    stepSlug: "set-your-style",
    file: "greatroom-wide.webp",
    isHero: true,
    sortOrder: 0,
    label: "Great Room",
    spatialHint: ROOM_PHOTO_SPATIAL_HINTS["greatroom-wide.webp"] ?? null,
    photoBaseline: null,
  },
  {
    stepSlug: "set-your-style",
    file: "fireplace.png",
    isHero: false,
    sortOrder: 1,
    label: "Fireplace",
    spatialHint: ROOM_PHOTO_SPATIAL_HINTS["fireplace.png"] ?? null,
    photoBaseline: "This photo shows the great room of a new-construction home focused on a brick fireplace with a white painted mantel surround. The room has hardwood flooring, white walls, white trim, a ceiling fan, and a chandelier. Large windows flank the fireplace on both sides.",
  },
  {
    stepSlug: "design-your-kitchen",
    file: "kitchen-close.webp",
    isHero: true,
    sortOrder: 0,
    label: "Kitchen",
    spatialHint: ROOM_PHOTO_SPATIAL_HINTS["kitchen-close.webp"] ?? null,
    photoBaseline: null,
  },
  {
    stepSlug: "primary-bath",
    file: "primary-bath-vanity.webp",
    isHero: true,
    sortOrder: 0,
    label: "Vanity",
    spatialHint: ROOM_PHOTO_SPATIAL_HINTS["primary-bath-vanity.webp"] ?? null,
    photoBaseline: null,
  },
  {
    stepSlug: "primary-bath",
    file: "primary-bath-shower.webp",
    isHero: false,
    sortOrder: 1,
    label: "Shower",
    spatialHint: ROOM_PHOTO_SPATIAL_HINTS["primary-bath-shower.webp"] ?? null,
    photoBaseline: "This photo shows a walk-in shower in a primary bathroom of a new-construction home. The shower has large format tile on the walls and floor, a glass entry panel, a showerhead, and a small mosaic tile accent on the shower floor. The bathroom floor outside the shower is also tiled.",
  },
  {
    stepSlug: "set-your-style",
    file: "primary-bedroom.webp",
    isHero: false,
    sortOrder: 2,
    label: "Primary Bedroom",
    spatialHint: ROOM_PHOTO_SPATIAL_HINTS["primary-bedroom.webp"] ?? null,
    photoBaseline: "This photo shows the primary bedroom of a new-construction home. The room has hardwood/LVP flooring, a tray ceiling with crown molding and a ceiling fan, white painted walls, white trim, and white baseboards. Two windows on the right wall and a doorway to the bathroom on the left.",
  },
  {
    stepSlug: "primary-bath",
    file: "bath-closet.webp",
    isHero: false,
    sortOrder: 2,
    label: "Bath & Closet",
    spatialHint: ROOM_PHOTO_SPATIAL_HINTS["bath-closet.webp"] ?? null,
    photoBaseline: "This photo shows the primary bathroom and walk-in closet of a new-construction home. The bathroom side has a white vanity with cabinet hardware, a dark-framed mirror, a vanity light fixture, towel rings, and tile flooring. The closet side has wire shelving and hardwood flooring. A door in the center leads to the bedroom. Walls are painted white with white trim and dark door hardware.",
  },
  {
    stepSlug: "secondary-spaces",
    file: "secondary-bedroom.webp",
    isHero: true,
    sortOrder: 0,
    label: "Secondary Bedroom",
    spatialHint: ROOM_PHOTO_SPATIAL_HINTS["secondary-bedroom.webp"] ?? null,
    photoBaseline: null,
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

  // Build set of valid (step_id, image_path) keys from current config
  const validPhotoKeys = new Set(
    ROOM_PHOTOS.map((photo) => {
      const stepId = stepSlugToId.get(photo.stepSlug);
      const storagePath = `${orgId}/rooms/${stepId}/${photo.file}`;
      return `${stepId}:${storagePath}`;
    })
  );

  // Delete orphaned step_photos BEFORE inserting new ones (avoids unique constraint conflicts)
  console.log("\n--- Cleaning up orphaned step_photos ---");
  const { data: allPhotosForCleanup } = await supabase
    .from("step_photos")
    .select("id, step_id, image_path, label")
    .eq("org_id", orgId);

  let deletedOrphans = 0;
  for (const photo of allPhotosForCleanup ?? []) {
    const key = `${photo.step_id}:${photo.image_path}`;
    if (!validPhotoKeys.has(key)) {
      const { error: delErr } = await supabase
        .from("step_photos")
        .delete()
        .eq("id", photo.id);

      if (delErr) {
        console.error(`  Delete failed for orphan ${photo.label} (${photo.id}):`, delErr);
      } else {
        deletedOrphans++;
        console.log(`  Deleted orphan: ${photo.label} (step_id=${photo.step_id})`);
      }
    }
  }
  console.log(`  Deleted: ${deletedOrphans} orphaned step_photos`);

  // Check existing step_photos for this org so we can update in place when rerun
  const { data: existingPhotos } = await supabase
    .from("step_photos")
    .select("id, step_id, image_path")
    .eq("org_id", orgId);

  const existingPhotoByKey = new Map<string, string>(
    (existingPhotos ?? []).map((p) => [`${p.step_id}:${p.image_path}`, p.id as string])
  );

  let insertedPhotos = 0;
  let updatedPhotos = 0;

  for (const photo of ROOM_PHOTOS) {
    const stepId = stepSlugToId.get(photo.stepSlug);
    if (!stepId) continue;

    const storagePath = `${orgId}/rooms/${stepId}/${photo.file}`;
    const key = `${stepId}:${storagePath}`;

    const existingId = existingPhotoByKey.get(key);
    if (existingId) {
      const { error: updateErr } = await supabase
        .from("step_photos")
        .update({
          is_hero: photo.isHero,
          sort_order: photo.sortOrder,
          label: photo.label,
          spatial_hint: photo.spatialHint,
          photo_baseline: photo.photoBaseline,
        })
        .eq("id", existingId);

      if (updateErr) {
        console.error(`  Update failed for ${photo.file}:`, updateErr);
      } else {
        updatedPhotos++;
        console.log(`  Updated: step_photo for ${photo.label} (${photo.stepSlug})`);
      }
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
        spatial_hint: photo.spatialHint,
        photo_baseline: photo.photoBaseline,
      });

    if (insertErr) {
      console.error(`  Insert failed for ${photo.file}:`, insertErr);
    } else {
      insertedPhotos++;
      console.log(`  Created: step_photo for ${photo.label} (${photo.stepSlug})`);
    }
  }
  console.log(`  Inserted: ${insertedPhotos}, Updated (existing): ${updatedPhotos}`);

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
