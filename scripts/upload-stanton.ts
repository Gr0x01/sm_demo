import dotenv from "dotenv";
import path from "path";
import fs from "fs";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DEMO_ORG_ID = "0d255878-9268-468a-b9e2-95b7552b6126";
const SOURCE_FILE = path.join(__dirname, "..", "tmp/swatch-compare/stanton-gold.jpg");
const TARGET_PATH = `${DEMO_ORG_ID}/cabinets/KITCHEN-CABINET-HARDWARE---STANTON-ALL-PULLS---BRUSHED-GOLD-Photoroom.jpg`;

async function main() {
  const raw = fs.readFileSync(SOURCE_FILE);
  const resized = await sharp(raw).resize(512, 512, { fit: "inside" }).jpeg({ quality: 85 }).toBuffer();

  const { error: upErr } = await supabase.storage.from("swatches").upload(TARGET_PATH, resized, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (upErr) throw upErr;

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/swatches/${TARGET_PATH}`;
  console.log("Uploaded:", publicUrl);

  const { error: dbErr } = await supabase
    .from("options")
    .update({
      swatch_url: publicUrl + "?v=" + Date.now(),
      name: "Stanton All Pulls - Brushed Gold",
    })
    .eq("slug", "hw-key-grande-pulls-brushed-gold")
    .eq("org_id", DEMO_ORG_ID);

  if (dbErr) throw dbErr;
  console.log("DB updated");
}

main().catch(e => { console.error(e); process.exit(1); });
