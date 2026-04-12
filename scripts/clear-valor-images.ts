/**
 * Delete every cached generation for Valor's kitchen step photo:
 * - storage objects in `generated-images` bucket
 * - rows in `generated_images` table
 *
 * Run: npx tsx -r dotenv/config scripts/clear-valor-images.ts dotenv_config_path=.env.local
 */

import { createClient } from "@supabase/supabase-js";

const STEP_PHOTO_ID = "a9266d4d-07e9-4e64-abe5-eebd8d6e0ca9";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  const { data: rows, error: selErr } = await supabase
    .from("generated_images")
    .select("image_path")
    .eq("step_photo_id", STEP_PHOTO_ID);
  if (selErr) {
    console.error("Failed to load rows:", selErr);
    process.exit(1);
  }

  const paths = (rows ?? [])
    .map(r => r.image_path as string)
    .filter(p => p && !["__pending__", "__failed__"].includes(p));

  console.log(`Found ${rows?.length ?? 0} DB rows for Valor (${paths.length} with real storage paths).`);

  if (paths.length > 0) {
    // Storage delete in batches of 100
    let deleted = 0;
    for (let i = 0; i < paths.length; i += 100) {
      const batch = paths.slice(i, i + 100);
      const { error: delErr } = await supabase.storage.from("generated-images").remove(batch);
      if (delErr) {
        console.error(`Storage delete failed for batch starting at ${i}:`, delErr);
      } else {
        deleted += batch.length;
      }
    }
    console.log(`Deleted ${deleted} storage objects.`);
  }

  const { error: dbDelErr, count } = await supabase
    .from("generated_images")
    .delete({ count: "exact" })
    .eq("step_photo_id", STEP_PHOTO_ID);
  if (dbDelErr) {
    console.error("Failed to delete DB rows:", dbDelErr);
    process.exit(1);
  }
  console.log(`Deleted ${count ?? 0} DB rows.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
