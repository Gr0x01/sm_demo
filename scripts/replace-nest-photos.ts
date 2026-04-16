#!/usr/bin/env tsx
/**
 * Replace Nest demo room photos with new nano-banana-generated heroes.
 *
 * Swaps kitchen, living room, and bathroom step_photos on the Nest floorplan
 * in the Demo org. Does NOT touch the bedroom.
 *
 * Process per photo:
 *   1. Read local PNG, convert to 1920x1080 WebP via sharp
 *   2. Upload to {existing step_id path}/nest-{room}-v2-{ts}.webp in `rooms` bucket
 *   3. Update step_photos.image_path to the new path
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const DEMO_ORG_ID = "0d255878-9268-468a-b9e2-95b7552b6126";

type Swap = {
  stepPhotoId: string;
  stepId: string;
  label: string;
  localFile: string;
  filenameStem: string;
};

const SWAPS: Swap[] = [
  {
    stepPhotoId: "bf34efb4-8cfa-4499-a887-3bd8265b5660",
    stepId: "963ea4a0-3ae7-4e3e-8738-b372f2d4a05c",
    label: "Kitchen",
    localFile: "tmp/nest-kitchen-final.png",
    filenameStem: "nest-kitchen",
  },
  {
    stepPhotoId: "050f518e-6d92-4ae6-9a0d-6253556c4e6f",
    stepId: "a725a9fd-6b03-4cd5-a6ce-cf7a7f4a68c1",
    label: "Living Room",
    localFile: "tmp/nest-livingRoom-final.png",
    filenameStem: "nest-living-room",
  },
  {
    stepPhotoId: "17010d06-f65e-424c-894d-1f1186089c54",
    stepId: "ea66cf4e-4de3-4c4f-a627-a8bdc8200f09",
    label: "Bathroom",
    localFile: "tmp/nest-bathroom-final.png",
    filenameStem: "nest-bathroom",
  },
];

async function main() {
  const ts = Date.now();
  for (const swap of SWAPS) {
    console.log(`\n[${swap.label}]`);
    const inputBuf = await readFile(path.resolve(swap.localFile));
    console.log(`  read ${swap.localFile} (${(inputBuf.length / 1024).toFixed(0)}KB)`);

    const webpBuf = await sharp(inputBuf)
      .resize(1920, 1080, { fit: "cover", position: "center" })
      .webp({ quality: 88 })
      .toBuffer();
    console.log(`  resized to 1920x1080 webp (${(webpBuf.length / 1024).toFixed(0)}KB)`);

    const newPath = `${DEMO_ORG_ID}/rooms/${swap.stepId}/${swap.filenameStem}-v2-${ts}.webp`;

    const { error: upErr } = await supabase.storage
      .from("rooms")
      .upload(newPath, webpBuf, { contentType: "image/webp", upsert: false });
    if (upErr) throw new Error(`upload failed: ${upErr.message}`);
    console.log(`  uploaded → rooms/${newPath}`);

    const { error: dbErr } = await supabase
      .from("step_photos")
      .update({ image_path: newPath })
      .eq("id", swap.stepPhotoId);
    if (dbErr) throw new Error(`db update failed: ${dbErr.message}`);
    console.log(`  step_photos.image_path updated`);
  }

  console.log("\nDone. Demo org cache will need to be busted via admin invalidate or restart.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
