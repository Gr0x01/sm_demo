#!/usr/bin/env npx tsx
/**
 * Resize all oversized swatches in Supabase Storage to 512px max dimension.
 * Converts to JPEG. Skips SVGs (tiny already). Overwrites in place.
 *
 * Usage: npx tsx scripts/resize-swatches.ts [--dry-run]
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("Missing Supabase env vars"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MAX_DIM = 512;
const dryRun = process.argv.includes("--dry-run");

async function listAllSwatches(prefix: string): Promise<string[]> {
  const paths: string[] = [];
  const { data: folders } = await supabase.storage.from("swatches").list(prefix, { limit: 1000 });
  if (!folders) return paths;

  for (const item of folders) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      // It's a folder — recurse
      const sub = await listAllSwatches(fullPath);
      paths.push(...sub);
    } else {
      paths.push(fullPath);
    }
  }
  return paths;
}

async function main() {
  console.log(dryRun ? "[DRY RUN] Scanning swatches...\n" : "Resizing swatches...\n");

  // Get all org IDs to scan
  const { data: orgs } = await supabase.from("organizations").select("id, slug");
  if (!orgs?.length) { console.error("No orgs found"); return; }

  let totalFiles = 0;
  let resized = 0;
  let skipped = 0;
  let alreadySmall = 0;
  let totalSavedBytes = 0;

  for (const org of orgs) {
    console.log(`\n--- ${org.slug} (${org.id}) ---`);
    const allPaths = await listAllSwatches(org.id);
    console.log(`  ${allPaths.length} files`);

    for (const filePath of allPaths) {
      totalFiles++;
      const ext = filePath.split(".").pop()?.toLowerCase() || "";

      // Skip SVGs — they're tiny vector files
      if (ext === "svg" || ext === "svgz") {
        skipped++;
        continue;
      }

      const { data, error } = await supabase.storage.from("swatches").download(filePath);
      if (error || !data) {
        console.log(`  [skip] ${filePath} — download failed: ${error?.message}`);
        skipped++;
        continue;
      }

      const originalBuffer = Buffer.from(await data.arrayBuffer());
      const meta = await sharp(originalBuffer).metadata().catch(() => null);
      if (!meta?.width || !meta?.height) {
        console.log(`  [skip] ${filePath} — can't read metadata`);
        skipped++;
        continue;
      }

      if (meta.width <= MAX_DIM && meta.height <= MAX_DIM) {
        alreadySmall++;
        continue;
      }

      // Needs resize
      const resizedBuffer = await sharp(originalBuffer)
        .resize(MAX_DIM, MAX_DIM, { fit: "inside" })
        .jpeg({ quality: 85 })
        .toBuffer();

      const saved = originalBuffer.length - resizedBuffer.length;
      totalSavedBytes += saved;

      // Upload with .jpg extension (may change ext from .png)
      const newPath = filePath.replace(/\.[^.]+$/, ".jpg");

      if (dryRun) {
        console.log(`  [would resize] ${filePath} ${meta.width}x${meta.height} (${(originalBuffer.length / 1024).toFixed(0)}KB → ${(resizedBuffer.length / 1024).toFixed(0)}KB, -${(saved / 1024).toFixed(0)}KB)`);
      } else {
        const { error: uploadError } = await supabase.storage
          .from("swatches")
          .upload(newPath, resizedBuffer, { upsert: true, contentType: "image/jpeg" });

        if (uploadError) {
          console.log(`  [error] ${filePath} — upload failed: ${uploadError.message}`);
          continue;
        }

        // If extension changed (e.g. .png → .jpg), delete the old file
        if (newPath !== filePath) {
          await supabase.storage.from("swatches").remove([filePath]);
        }

        // Update DB swatch_url if it referenced the old path
        const { data: { publicUrl } } = supabase.storage.from("swatches").getPublicUrl(newPath);
        await supabase.from("options")
          .update({ swatch_url: publicUrl })
          .like("swatch_url", `%${filePath}%`);

        console.log(`  [resized] ${filePath} ${meta.width}x${meta.height} → ${MAX_DIM}px (${(originalBuffer.length / 1024).toFixed(0)}KB → ${(resizedBuffer.length / 1024).toFixed(0)}KB)`);
      }
      resized++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total files: ${totalFiles}`);
  console.log(`Resized: ${resized}`);
  console.log(`Already small: ${alreadySmall}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Space saved: ${(totalSavedBytes / 1024 / 1024).toFixed(1)}MB`);
  if (dryRun) console.log(`\nRe-run without --dry-run to apply.`);
}

main().catch(console.error);
