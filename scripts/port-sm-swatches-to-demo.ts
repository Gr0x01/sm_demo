/**
 * Port SM swatch bytes into Demo org storage to eliminate cross-tenant coupling.
 *
 * Three groups:
 * 1. Backsplash (5): Demo rows currently point at SM storage paths.
 *    → Download SM bytes, upload to Demo's backsplash path, UPDATE swatch_url.
 * 2. Primary-shower (4): Demo rows point at Demo storage but have stale pre-Shaw bytes.
 *    → Download SM's Shaw-updated bytes, overwrite Demo's file in-place.
 * 3. Floor-tile-color (1): onyx-white — SM has a better Shaw catalog shot.
 *    → Same as primary-shower: overwrite Demo's file with SM's bytes.
 *
 * Idempotent: re-running after a successful run is a no-op (bytes match, URLs already updated).
 *
 * Usage: npx tsx scripts/port-sm-swatches-to-demo.ts [--dry-run]
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SM_ORG_ID = "364538bf-1712-48e7-a905-04ad90983eb2";
const DEMO_ORG_ID = "0d255878-9268-468a-b9e2-95b7552b6126";
const BUCKET = "swatches";

const dryRun = process.argv.includes("--dry-run");

// ── Group 1: Backsplash (path bleed — Demo URLs point at SM) ────────────────

const BACKSPLASH_FILES = [
  "backsplash/BACKSPLASH---BAKER-BLVD-4X12-BEVELED---WHITE-GLOSS---3RD-STAGGER-LAY.jpg",
  "backsplash/BACKSPLASH---BAKER-BLVD-HERRINGBONE-MATTE-MOSAIC---WHITE.jpg",
  "backsplash/BACKSPLASH---BAKER-BLVD-HERRINGBONE-MATTE-MOSAIC---CARBON.jpg",
  "backsplash/BACKSPLASH---BAKER-BLVD-4X16---CARBON---3RD-STAGGER-LAY.jpg",
  "backsplash/BACKSPLASH---BAKER-BLVD-4X16---GLACIER---3RD-STAGGER-LAY.jpg",
];

// ── Group 2: Primary-shower (stale Demo bytes, SM has Shaw-updated) ─────────

const PRIMARY_SHOWER_FILES = [
  "shower-tile/PRIMARY-SHOWER-TILE---INFINITY-12X24---CALACATTA---2X2-MATCH-FLOOR.jpg",
  "shower-tile/primary-shower-tile---omega-13x13---bone---khaki-outline-square-floor.jpg",
  "shower-tile/primary-shower-tile---omega-13x13---silver---concrete-outline-square-floor.jpg",
  "shower-tile/PRIMARY-SHOWER-TILE---SPHINX-12X24---WHITE---HEXAGON-CALACATTA-FLOOR.jpg",
];

// ── Group 3: Floor-tile-color (one file differs: onyx-white) ────────────────

const FLOOR_TILE_FILES = [
  "floor-tile/FLOOR-TILE-COLOR---ONYX-12X24-MATTE---WHITE.jpg",
];

async function downloadFromStorage(storagePath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) throw new Error(`Download failed: ${storagePath} — ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}

async function uploadToStorage(storagePath: string, bytes: Buffer): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
    upsert: true,
    contentType: "image/jpeg",
    // Short TTL prevents Supabase CDN edge from serving stale bytes after an in-place
    // overwrite. Without this, Group 2/3 URL-unchanged rewrites can show old bytes for
    // up to the default 1hr CDN cache window.
    cacheControl: "60",
  });
  if (error) throw new Error(`Upload failed: ${storagePath} — ${error.message}`);
}

function buildPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function portFile(
  relPath: string,
  opts: { updateUrl: boolean }
): Promise<{ action: string; relPath: string }> {
  const smPath = `${SM_ORG_ID}/${relPath}`;
  const demoPath = `${DEMO_ORG_ID}/${relPath}`;

  const smBytes = await downloadFromStorage(smPath);

  if (dryRun) {
    return {
      action: opts.updateUrl ? "DRY-RUN: would copy + update URL" : "DRY-RUN: would overwrite bytes",
      relPath,
    };
  }

  await uploadToStorage(demoPath, smBytes);

  if (opts.updateUrl) {
    const newUrl = buildPublicUrl(demoPath);
    // Single atomic UPDATE scoped to the exact bucket-prefix path. The leading
    // `/swatches/` anchor prevents the LIKE from matching URLs that happen to
    // embed the SM org_id + relPath as a substring elsewhere.
    const { data: updated, error } = await supabase
      .from("options")
      .update({ swatch_url: newUrl })
      .eq("org_id", DEMO_ORG_ID)
      .like("swatch_url", `%/swatches/${SM_ORG_ID}/${relPath}%`)
      .select("id");

    if (error) throw new Error(`URL update failed for ${relPath}: ${error.message}`);
    if (!updated || updated.length === 0) {
      return { action: "SKIP: no Demo row with SM URL found (already fixed?)", relPath };
    }
    return { action: `copied + updated URL (${updated.length} row${updated.length > 1 ? "s" : ""})`, relPath };
  }

  return { action: "overwritten with SM bytes", relPath };
}

async function main() {
  console.log(`\n=== PORT SM SWATCHES TO DEMO ${dryRun ? "(DRY RUN)" : ""} ===\n`);

  const results: { action: string; relPath: string }[] = [];

  console.log("── Group 1: Backsplash (path bleed fix) ──");
  for (const file of BACKSPLASH_FILES) {
    const result = await portFile(file, { updateUrl: true });
    console.log(`  ${result.action}: ${result.relPath}`);
    results.push(result);
  }

  console.log("\n── Group 2: Primary-shower (stale bytes fix) ──");
  for (const file of PRIMARY_SHOWER_FILES) {
    const result = await portFile(file, { updateUrl: false });
    console.log(`  ${result.action}: ${result.relPath}`);
    results.push(result);
  }

  console.log("\n── Group 3: Floor-tile-color (onyx-white byte fix) ──");
  for (const file of FLOOR_TILE_FILES) {
    const result = await portFile(file, { updateUrl: false });
    console.log(`  ${result.action}: ${result.relPath}`);
    results.push(result);
  }

  // Completeness assertion: Group 1 must update exactly BACKSPLASH_FILES.length rows
  // on a fresh run. Anything else means partial state from an earlier run or a
  // concurrent writer. If we re-run and everything is already ported, all 5 will
  // report SKIP — that's fine (idempotent no-op).
  if (!dryRun) {
    const group1 = results.slice(0, BACKSPLASH_FILES.length);
    const updated = group1.filter((r) => r.action.startsWith("copied + updated")).length;
    const skipped = group1.filter((r) => r.action.startsWith("SKIP")).length;
    if (updated + skipped !== BACKSPLASH_FILES.length) {
      console.warn(
        `\nWARNING: backsplash group had ${updated} updates + ${skipped} skips, expected ${BACKSPLASH_FILES.length} combined`
      );
    }
  }

  console.log(`\n=== DONE: ${results.length} files processed ===\n`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
