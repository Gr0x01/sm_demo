#!/usr/bin/env npx tsx
/**
 * Upload approved swatch replacements to Supabase Storage and update the DB.
 *
 * Reads the decisions JSON exported from tmp/swatch-replacements.html and, for
 * each approved optionId, resizes the candidate image (512px, JPEG q85) via
 * sharp — matching SwatchUpload.tsx's pipeline — then overwrites the existing
 * Supabase Storage file in place and cache-busts the DB swatch_url.
 *
 * Usage:
 *   npx tsx scripts/upload-approved-swatches.ts [--decisions path] [--dry-run]
 *
 * Default decisions path: temp/swatch-decisions (1).json
 */

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("Missing Supabase env vars"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const REPO_ROOT = path.join(__dirname, "..");
const REPLACEMENTS_DIR = path.join(REPO_ROOT, "tmp", "swatch-replacements");
const DEFAULT_DECISIONS = path.join(REPO_ROOT, "temp", "swatch-decisions (1).json");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const decisionsArgIdx = args.indexOf("--decisions");
const decisionsPath = decisionsArgIdx >= 0 ? args[decisionsArgIdx + 1] : DEFAULT_DECISIONS;

const MAX_DIM = 512;

type Decisions = { approved: string[]; rejected?: string[] };

async function main() {
  if (!fs.existsSync(decisionsPath)) {
    console.error(`Decisions file not found: ${decisionsPath}`);
    process.exit(1);
  }
  const decisions: Decisions = JSON.parse(fs.readFileSync(decisionsPath, "utf-8"));
  const approved = decisions.approved || [];
  console.log(`${approved.length} approved swatches to upload\n`);
  if (dryRun) console.log("[DRY RUN — no writes]\n");

  // Pull current swatch_url for all approved option IDs
  const { data: options, error } = await supabase
    .from("options")
    .select("id, name, slug, swatch_url")
    .in("id", approved);
  if (error || !options) {
    console.error("Failed to fetch options:", error?.message);
    process.exit(1);
  }

  const found = new Map(options.map((o) => [o.id, o]));
  const missingFromDB = approved.filter((id) => !found.has(id));
  if (missingFromDB.length > 0) {
    console.warn(`WARNING: ${missingFromDB.length} approved option IDs not found in DB:`);
    missingFromDB.forEach((id) => console.warn(`  ${id}`));
    console.warn("");
  }

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const option of options) {
    const localPath = path.join(REPLACEMENTS_DIR, `${option.id}.jpg`);
    if (!fs.existsSync(localPath)) {
      console.log(`[skip] ${option.name} — no local candidate at ${localPath}`);
      skipped++;
      continue;
    }
    if (!option.swatch_url) {
      console.log(`[skip] ${option.name} — no existing swatch_url in DB`);
      skipped++;
      continue;
    }

    // Extract storage path from the public URL
    const match = option.swatch_url.match(/\/object\/public\/swatches\/(.+?)(?:\?|$)/);
    if (!match) {
      console.log(`[skip] ${option.name} — can't parse storage path from ${option.swatch_url}`);
      skipped++;
      continue;
    }
    const storagePath = decodeURIComponent(match[1]);

    // Resize through the same pipeline as SwatchUpload.tsx
    const originalBuf = fs.readFileSync(localPath);
    const resizedBuf = await sharp(originalBuf)
      .resize(MAX_DIM, MAX_DIM, { fit: "inside" })
      .jpeg({ quality: 85 })
      .toBuffer();
    const sizeKB = (resizedBuf.length / 1024).toFixed(1);

    if (dryRun) {
      console.log(`[dry] ${option.name}`);
      console.log(`      ${storagePath} (${sizeKB}KB)`);
      uploaded++;
      continue;
    }

    // Upload (overwrite in place)
    const { error: uploadErr } = await supabase.storage
      .from("swatches")
      .upload(storagePath, resizedBuf, { upsert: true, contentType: "image/jpeg" });
    if (uploadErr) {
      console.log(`[FAIL] ${option.name} — upload error: ${uploadErr.message}`);
      failed++;
      continue;
    }

    // Cache-bust the DB swatch_url
    const cleanUrl = option.swatch_url.split("?")[0];
    const newUrl = `${cleanUrl}?t=${Date.now()}`;
    const { error: updateErr } = await supabase
      .from("options")
      .update({ swatch_url: newUrl })
      .eq("id", option.id);
    if (updateErr) {
      console.log(`[FAIL] ${option.name} — DB update error: ${updateErr.message}`);
      failed++;
      continue;
    }

    console.log(`[ok]   ${option.name} (${sizeKB}KB)`);
    uploaded++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Approved:  ${approved.length}`);
  console.log(`Uploaded:  ${uploaded}`);
  console.log(`Skipped:   ${skipped}`);
  console.log(`Failed:    ${failed}`);
  if (dryRun) console.log(`\n(dry run — rerun without --dry-run to apply)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
