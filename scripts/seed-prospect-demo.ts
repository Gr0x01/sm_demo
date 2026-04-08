/**
 * Seed a prospect demo page in the Demo org.
 *
 * Usage:
 *   npx tsx scripts/seed-prospect-demo.ts --config scripts/prospect-configs/westbay.json
 *   npx tsx scripts/seed-prospect-demo.ts --config scripts/prospect-configs/westbay.json --generate
 *   npx tsx scripts/seed-prospect-demo.ts --config scripts/prospect-configs/westbay.json --generate --base-url http://localhost:3003
 *
 * Flags:
 *   --config <path>    Path to JSON config file (required)
 *   --generate         Trigger preset image generation after seeding
 *   --base-url <url>   API base URL (default: http://localhost:3003)
 *   --skip-upload      Skip photo uploads (if already uploaded)
 *   --presets-only      Skip DB seeding, just generate presets (for re-runs)
 *
 * Config file format: see scripts/prospect-configs/README.md
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import sharp from "sharp";

// ---------- Types ----------

interface PresetVariation {
  label: string;
  selections: Record<string, string>;
}

interface ProspectConfig {
  slug: string;
  name: string;             // e.g. "Homes By WestBay — Key Largo II"
  heroHeadline: string;
  heroBody: string;
  // Photos — local file paths (relative to project root)
  kitchenPhoto: string;     // e.g. "/tmp/westbay-kitchen.jpg"
  exteriorPhoto: string;    // e.g. "/tmp/westbay-exterior.jpg"
  // Step photo config
  photoBaseline: string;
  spatialHint: string;
  subcategoryIds: string[]; // e.g. ["kitchen-cabinet-color", "counter-top", ...]
  sections: Array<{ title: string; subcategory_ids: string[] }>;
  spatialHints?: Record<string, string>; // per-subcategory overrides (auto-generated if omitted)
  remapAccentAsWallPaint?: boolean;
  // Insights sidebar
  insights: Array<{ label: string; value: string }>;
  closingLine?: string;
  // Presets for variation gallery
  presets: PresetVariation[];
}

// ---------- CLI args ----------

function parseArgs() {
  const args = process.argv.slice(2);
  let configPath = "";
  let generate = false;
  let baseUrl = "http://localhost:3003";
  let skipUpload = false;
  let presetsOnly = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config" && args[i + 1]) configPath = args[++i];
    else if (args[i] === "--generate") generate = true;
    else if (args[i] === "--base-url" && args[i + 1]) baseUrl = args[++i];
    else if (args[i] === "--skip-upload") skipUpload = true;
    else if (args[i] === "--presets-only") presetsOnly = true;
  }

  if (!configPath) {
    console.error("Usage: npx tsx scripts/seed-prospect-demo.ts --config <path> [--generate] [--base-url <url>]");
    process.exit(1);
  }

  return { configPath, generate, baseUrl, skipUpload, presetsOnly };
}

// ---------- Constants ----------

const DEMO_ORG_ID = "0d255878-9268-468a-b9e2-95b7552b6126";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ---------- Main ----------

async function main() {
  const { configPath, generate, baseUrl, skipUpload, presetsOnly } = parseArgs();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const config: ProspectConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  // Validate required config fields
  const required: (keyof ProspectConfig)[] = ["slug", "name", "heroHeadline", "heroBody", "photoBaseline", "spatialHint", "subcategoryIds", "sections", "insights"];
  for (const key of required) {
    if (!config[key]) { console.error(`Missing required config field: ${key}`); process.exit(1); }
  }

  // Validate photo files exist before any DB work
  if (!presetsOnly && !skipUpload) {
    for (const photoField of ["kitchenPhoto", "exteriorPhoto"] as const) {
      const p = path.isAbsolute(config[photoField]) ? config[photoField] : path.resolve(config[photoField]);
      if (!fs.existsSync(p)) { console.error(`Photo not found: ${p} (${photoField})`); process.exit(1); }
    }
  }

  console.log(`\n🏠 Setting up prospect demo: ${config.name} (/${config.slug})`);

  let floorplanId: string;
  let stepId: string;
  let stepPhotoId: string;

  if (presetsOnly) {
    // Look up existing records
    const { data: fp } = await supabase
      .from("floorplans")
      .select("id")
      .eq("org_id", DEMO_ORG_ID)
      .eq("slug", config.slug)
      .single();
    if (!fp) { console.error("Floorplan not found"); process.exit(1); }
    floorplanId = fp.id;

    const { data: s } = await supabase
      .from("steps")
      .select("id")
      .eq("floorplan_id", floorplanId)
      .single();
    if (!s) { console.error("Step not found"); process.exit(1); }
    stepId = s.id;

    const { data: sp } = await supabase
      .from("step_photos")
      .select("id")
      .eq("step_id", stepId)
      .single();
    if (!sp) { console.error("Step photo not found"); process.exit(1); }
    stepPhotoId = sp.id;

    console.log(`  Found existing: floorplan=${floorplanId}, step=${stepId}, photo=${stepPhotoId}`);
  } else {
    // --- 1. Upload photos ---
    if (!skipUpload) {
      console.log("\n📸 Uploading photos...");
      await uploadPhoto(supabase, config.kitchenPhoto, `${DEMO_ORG_ID}/rooms/${config.slug}-kitchen.webp`, "rooms");
      await uploadPhoto(supabase, config.exteriorPhoto, `${DEMO_ORG_ID}/rooms/${config.slug}-exterior.webp`, "rooms");
      console.log("  ✓ Photos uploaded");
    }

    // --- 2. Create floorplan ---
    console.log("\n📋 Creating floorplan...");
    const { data: fp, error: fpErr } = await supabase
      .from("floorplans")
      .upsert({
        org_id: DEMO_ORG_ID,
        slug: config.slug,
        name: config.name,
        is_prospect_demo: true,
        hero_headline: config.heroHeadline,
        hero_body: config.heroBody,
        cover_image_path: `${DEMO_ORG_ID}/rooms/${config.slug}-exterior.webp`,
        calendly_url: "https://calendly.com/finch-rashaad/finch-demo",
        prospect_insights: {
          insights: config.insights,
          closingLine: config.closingLine,
        },
      }, { onConflict: "org_id,slug" })
      .select("id")
      .single();

    if (fpErr) { console.error("Floorplan error:", fpErr); process.exit(1); }
    floorplanId = fp.id;
    console.log(`  ✓ Floorplan: ${floorplanId}`);

    // --- 3. Create step ---
    console.log("\n📝 Creating step...");
    // Build spatial hints from subcategory list
    const hasIsland = config.subcategoryIds.includes("kitchen-island-cabinet-color");
    // BFL spatial hints: never name surfaces you're NOT changing.
    // Use "cabinetry" (architectural noun) not "cabinets" (surface category).
    // Use "cooking zone" not "between cabinets and countertop".
    const spatialHints: Record<string, string> = {
      "kitchen-cabinet-color": hasIsland
        ? "upper wall cabinets, lower base cabinets, and cabinets flanking appliances — every perimeter cabinet door and drawer front"
        : "upper wall cabinets, lower base cabinets, and cabinets flanking appliances — every cabinet door and drawer front",
      "counter-top": hasIsland
        ? "all horizontal countertop surfaces — perimeter and center workspace"
        : "all horizontal countertop surfaces along the perimeter",
      "backsplash": "the narrow wall strip on the back wall in the cooking zone",
      "main-area-flooring-color": "all visible floor area throughout the kitchen",
      "common-wall-paint": "painted wall surfaces visible above the cabinetry and on surrounding walls",
    };
    if (hasIsland) {
      spatialHints["kitchen-island-cabinet-color"] = "freestanding base cabinet doors and panels in the center foreground";
    }
    // Allow config to override any hint
    if (config.spatialHints) {
      Object.assign(spatialHints, config.spatialHints);
    }

    const { data: s, error: sErr } = await supabase
      .from("steps")
      .upsert({
        floorplan_id: floorplanId,
        org_id: DEMO_ORG_ID,
        slug: "kitchen",
        name: "Design Your Kitchen",
        number: 1,
        sort_order: 0,
        sections: config.sections,
        spatial_hints: spatialHints,
      }, { onConflict: "floorplan_id,slug" })
      .select("id")
      .single();

    if (sErr) { console.error("Step error:", sErr); process.exit(1); }
    stepId = s.id;
    console.log(`  ✓ Step: ${stepId}`);

    // --- 4. Create step photo ---
    console.log("\n🖼️  Creating step photo...");
    // Delete existing photos for this step first (upsert doesn't work well here)
    await supabase.from("step_photos").delete().eq("step_id", stepId);

    const { data: sp, error: spErr } = await supabase
      .from("step_photos")
      .insert({
        step_id: stepId,
        org_id: DEMO_ORG_ID,
        image_path: `${DEMO_ORG_ID}/rooms/${config.slug}-kitchen.webp`,
        label: "Kitchen",
        is_hero: true,
        sort_order: 0,
        photo_baseline: config.photoBaseline,
        spatial_hint: config.spatialHint,
        subcategory_ids: config.subcategoryIds,
        remap_accent_as_wall_paint: config.remapAccentAsWallPaint ?? false,
      })
      .select("id")
      .single();

    if (spErr) { console.error("Step photo error:", spErr); process.exit(1); }
    stepPhotoId = sp.id;
    console.log(`  ✓ Step photo: ${stepPhotoId}`);
  }

  // --- 5. Generate presets (optional) ---
  if (generate && config.presets.length > 0) {
    console.log(`\n🎨 Generating ${config.presets.length} preset variations...`);

    // Create a buyer session
    const { data: session, error: sessErr } = await supabase
      .from("buyer_sessions")
      .insert({ org_id: DEMO_ORG_ID, floorplan_id: floorplanId, selections: {} })
      .select("id")
      .single();

    if (sessErr) { console.error("Session error:", sessErr); process.exit(1); }
    const sessionId = session.id;

    // Trigger each preset
    const hashes: string[] = [];
    for (const preset of config.presets) {
      // Clean up any existing pending row for this combo
      const res = await fetch(`${baseUrl}/api/generate/photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgSlug: "demo",
          floorplanSlug: config.slug,
          stepPhotoId,
          sessionId,
          selections: preset.selections,
        }),
      });

      if (!res.ok) {
        console.error(`  ✗ ${preset.label}: HTTP ${res.status} ${res.statusText}`);
        continue;
      }

      const data = await res.json();
      if (data.error) {
        console.error(`  ✗ ${preset.label}: ${data.error}`);
      } else {
        console.log(`  → ${preset.label}: dispatched (hash: ${data.selectionsHash})`);
        hashes.push(data.selectionsHash);
      }
    }

    // Poll for completion
    console.log("\n⏳ Waiting for generations to complete...");
    const maxWait = 5 * 60 * 1000; // 5 minutes
    const pollInterval = 5000;
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      const { data: images } = await supabase
        .from("generated_images")
        .select("selections_hash, image_path")
        .eq("step_photo_id", stepPhotoId)
        .in("selections_hash", hashes);

      const completed = images?.filter(i => i.image_path !== "__pending__") || [];
      const pending = hashes.length - completed.length;

      if (pending === 0) {
        console.log(`  ✓ All ${hashes.length} generations complete!`);

        // Wire up preset_variations on the floorplan
        const presetVariations = config.presets.map((preset, i) => {
          const img = completed.find(c => c.selections_hash === hashes[i]);
          return {
            label: preset.label,
            selections: preset.selections,
            imagePath: img?.image_path || "",
          };
        });

        const { error: updateErr } = await supabase
          .from("floorplans")
          .update({ preset_variations: presetVariations })
          .eq("id", floorplanId);

        if (updateErr) {
          console.error("  ✗ Failed to update preset_variations:", updateErr);
        } else {
          console.log("  ✓ preset_variations wired up on floorplan");
        }

        // Clean up temp session
        await supabase.from("buyer_sessions").delete().eq("id", sessionId);
        break;
      }

      process.stdout.write(`  ${completed.length}/${hashes.length} complete, waiting...\r`);
      await new Promise(r => setTimeout(r, pollInterval));
    }

    if (Date.now() - start >= maxWait) {
      console.error("\n  ✗ Timed out waiting for generations. Check Inngest dashboard.");
      console.log("  Hashes:", hashes);
      console.log("  Run with --presets-only --generate to retry after fixing.");
      // Clean up temp session on timeout too
      await supabase.from("buyer_sessions").delete().eq("id", sessionId);
    }
  }

  console.log(`\n✅ Done! Page live at: withfin.ch/for/${config.slug}`);
  if (!generate && config.presets.length > 0) {
    console.log("   Run with --generate to create preset variation images.");
  }
}

// ---------- Helpers ----------

async function uploadPhoto(
  supabase: ReturnType<typeof createClient>,
  localPath: string,
  storagePath: string,
  bucket: string,
) {
  const absolutePath = path.isAbsolute(localPath) ? localPath : path.resolve(localPath);
  const inputBuffer = fs.readFileSync(absolutePath);

  // Convert to webp
  const webpBuffer = await sharp(inputBuffer).webp({ quality: 85 }).toBuffer();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, webpBuffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (error) {
    console.error(`  ✗ Upload failed (${bucket}/${storagePath}):`, error.message);
    throw error;
  }
  console.log(`  ✓ ${bucket}/${storagePath} (${(webpBuffer.length / 1024).toFixed(0)}KB)`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
