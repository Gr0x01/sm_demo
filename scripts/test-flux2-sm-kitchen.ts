#!/usr/bin/env npx tsx
/**
 * Flux 2 end-to-end test for Stone Martin Kinkade Kitchen.
 *
 * Tests the REAL pipeline: fetches hero from Supabase, builds prompt with
 * buildEditPrompt (including spatial hints, generation rules, linked options),
 * calls BFL Flux 2 Max, saves output.
 *
 * Combos test key scenarios:
 *   1. defaults — baseline (white cabinets, granite, subway backsplash) — 9 swatches → two-pass split
 *   2. stain-two-tone — Sahara stain + Onyx island + herringbone carbon — tests stain grain + tile pattern + two-tone
 *   3. slide-in-range — Slide-in range + white cabinets — tests oven correction second pass
 *   4. fridge-add — Add GE French Door fridge to empty alcove — tests appliance placement
 *
 * Usage: npx tsx scripts/test-flux2-sm-kitchen.ts [--combo NAME] [--skip-existing]
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import fs from "fs";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { buildEditPrompt, resolveLinkedOptions } from "../src/lib/generate";
import type { SwatchBufferResolver } from "../src/lib/generate";
import type { Option, SubCategory } from "../src/types";

const BFL_API_KEY = process.env.BFL_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!BFL_API_KEY) { console.error("Missing BFL_API_KEY"); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("Missing Supabase env vars"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OUTPUT_DIR = path.join(__dirname, "flux2-sm-kitchen-outputs");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const HERO_PATH = "364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp";

const STEP_PHOTO_ID = "6c1e444f-1237-45ee-8bd8-2a6dec1d8bc3";

// Scene context from DB
const SCENE_DESCRIPTION = "Large island in the foreground with undermount sink and arched faucet on top, dishwasher panel on the left side. Perimeter cabinets (upper and lower) along the back wall with smooth white backsplash between them. Stainless gas range with microwave/hood above on the back wall. To the RIGHT of the range/microwave is the refrigerator alcove — an empty wall recess with a plain painted wall (NO tile, NO backsplash), a power outlet, and upper cabinets above. White pantry door visible at far right. Two glass pendant lights over island. Granite countertops. LVP hardwood flooring. Recessed ceiling lights.";

const PHOTO_SPATIAL_HINT = "Large island dominates the foreground with sink + faucet on the island; keep sink cutout and faucet direction fixed. Perimeter cabinets, backsplash, and range are on the back wall. To the RIGHT of the range/microwave is the refrigerator alcove — an empty wall recess with plain painted wall. Do NOT tile, backsplash, or fill this alcove with cabinets. Dishwasher remains next to the sink; do not alter cabinet panel geometry.";

const SPATIAL_HINTS: Record<string, string> = {
  "range": "range/stovetop along the back wall next to the microwave. NOTE: if the range is a 'slide-in' model, it has NO raised back panel — it sits flush with the countertop and the backsplash tile is visible behind it. Only freestanding ranges have the raised back panel with controls.",
  "lighting": "light fixtures (chandelier, pendants)",
  "backsplash": "tile backsplash between upper cabinets and countertop on the perimeter back wall ONLY. Do NOT extend tile into the refrigerator alcove — that wall must remain plain painted wall.",
  "counter-top": "all countertop surfaces (island and perimeter)",
  "kitchen-sink": "undermount sink basin in the island countertop — preserve the exact sink position and orientation from the original photo",
  "refrigerator": "the empty wall opening to the left of the pantry door, between the perimeter countertop and the island — place the selected refrigerator here",
  "kitchen-faucet": "faucet on the island countertop — the faucet spout arches AWAY from the camera toward the back wall/range side. Keep this exact orientation, do NOT flip it.",
  "countertop-edge": "edge profile of all countertops",
  "common-wall-paint": "all wall surfaces",
  "kitchen-cabinet-color": "all perimeter cabinet doors and drawer fronts along the walls — both upper and lower rows. NOT the island.",
  "kitchen-cabinet-hardware": "cabinet knobs and pulls on all cabinets",
  "main-area-flooring-color": "LVP/hardwood plank flooring in non-bathroom areas (closets, bedrooms, hallways) — NOT on bathroom floors which have tile",
  "kitchen-island-cabinet-color": "island cabinet doors and drawer fronts on the freestanding island in the foreground. NOT the perimeter wall cabinets.",
};

const SCOPED_SUBCATEGORY_IDS = [
  "counter-top", "countertop-edge", "backsplash", "kitchen-cabinet-color",
  "kitchen-island-cabinet-color", "kitchen-cabinet-hardware", "kitchen-sink",
  "kitchen-faucet", "range", "common-wall-paint", "main-area-flooring-color",
  "lighting", "refrigerator",
];

// Invariant rules from DB policy
const PROMPT_OVERRIDES = {
  invariantRulesWhenSelected: {
    "refrigerator": [
      "Place the refrigerator in the empty wall opening to the left of the pantry door, between the perimeter countertop and the island. There is a power outlet on the wall and upper cabinets above this opening. Do NOT place the refrigerator anywhere else.",
    ],
  },
  invariantRulesWhenNotSelected: {
    "refrigerator": [
      "Refrigerator opening state must match the source photo exactly: if the opening/alcove is empty, keep it empty; if it contains a refrigerator, keep that refrigerator unchanged.",
      "Never convert the refrigerator opening into cabinetry, drawers, shelves, pantry units, countertops, or trim build-outs.",
      "Do NOT extend backsplash tile or any tile into the refrigerator alcove. The back wall of the alcove must remain plain painted wall with only paint/finish changes allowed.",
    ],
  },
};

// Oven correction second pass prompt (from DB policy)
const OVEN_SECOND_PASS_PROMPT = "Second pass: correct ONLY the cooking range geometry on the back wall. The selected range is slide-in: NO raised backguard panel, backsplash tile must be visible directly behind the cooktop, and there must be exactly one oven door below the cooktop. Keep all surrounding cabinetry, countertop seams, island, sink, faucet, floor, walls, and lighting unchanged.";

// ---------------------------------------------------------------------------
// Test combos — each is a set of selections using the real SM slug IDs
// ---------------------------------------------------------------------------

interface TestCombo {
  name: string;
  description: string;
  selections: Record<string, string>;
  /** Whether this combo should trigger the oven correction second pass */
  expectSecondPass?: boolean;
}

const COMBOS: TestCombo[] = [
  {
    name: "defaults",
    description: "Baseline defaults — Driftwood stain, match island, Steel Grey granite, white subway, bronze hw, SS faucet, freestanding range, no fridge",
    selections: {
      "kitchen-cabinet-color": "kitchen-cab-color-driftwood",
      "kitchen-island-cabinet-color": "island-color-match",
      "counter-top": "ct-granite-steel-grey",
      "backsplash": "bs-baker-4x16-white-gloss",
      "kitchen-cabinet-hardware": "hw-seaver-pull-knob-bronze",
      "kitchen-faucet": "faucet-pfirst-ss",
      "range": "range-ge-included-freestanding",
      "common-wall-paint": "wall-whiskers",
      "main-area-flooring-color": "floor-color-polaris-toasted-taupe",
    },
  },
  {
    name: "stain-two-tone",
    description: "Sahara stain perimeter + Onyx island + Carbon herringbone — stress test for stain grain + dark tile pattern + high contrast two-tone",
    selections: {
      "kitchen-cabinet-color": "kitchen-cab-color-sahara",
      "kitchen-island-cabinet-color": "island-color-onyx",
      "counter-top": "ct-granite-steel-grey",
      "backsplash": "bs-baker-herringbone-carbon",
      "kitchen-cabinet-hardware": "hw-seaver-pull-knob-bronze",
      "kitchen-faucet": "faucet-pfirst-ss",
      "range": "range-ge-included-freestanding",
      "common-wall-paint": "wall-whiskers",
      "main-area-flooring-color": "floor-color-polaris-toasted-taupe",
    },
  },
  {
    name: "slide-in-range",
    description: "Slide-in range + white cabinets — tests oven correction second pass",
    selections: {
      "kitchen-cabinet-color": "kitchen-cab-color-white",
      "kitchen-island-cabinet-color": "island-color-match",
      "counter-top": "ct-granite-steel-grey",
      "backsplash": "bs-baker-4x16-white-gloss",
      "kitchen-cabinet-hardware": "hw-seaver-pull-knob-bronze",
      "kitchen-faucet": "faucet-pfirst-ss",
      "range": "range-ge-gas-slide-in",
      "common-wall-paint": "wall-whiskers",
      "main-area-flooring-color": "floor-color-polaris-toasted-taupe",
    },
    expectSecondPass: true,
  },
  {
    name: "fridge-add",
    description: "Add GE French Door fridge to empty alcove — tests appliance placement with many surfaces",
    selections: {
      "kitchen-cabinet-color": "kitchen-cab-color-driftwood",
      "kitchen-island-cabinet-color": "island-color-match",
      "counter-top": "ct-granite-steel-grey",
      "backsplash": "bs-baker-4x16-white-gloss",
      "kitchen-cabinet-hardware": "hw-seaver-pull-knob-bronze",
      "kitchen-faucet": "faucet-pfirst-ss",
      "range": "range-ge-included-freestanding",
      "refrigerator": "refrigerator-ge-french-door",
      "common-wall-paint": "wall-whiskers",
      "main-area-flooring-color": "floor-color-polaris-toasted-taupe",
    },
  },
];

// ---------------------------------------------------------------------------
// BFL helpers (same as bfl.ts but standalone)
// ---------------------------------------------------------------------------

async function submitBfl(model: string, prompt: string, inputImage: Buffer, referenceImages: Buffer[]): Promise<string> {
  const body: Record<string, unknown> = {
    prompt,
    input_image: inputImage.toString("base64"),
    width: 1536,
    height: 1024,
    output_format: "jpeg",
  };
  for (let i = 0; i < referenceImages.length; i++) {
    body[`input_image_${i + 2}`] = referenceImages[i].toString("base64");
  }
  const res = await fetch(`https://api.bfl.ai/v1/${model}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-key": BFL_API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Submit failed: ${res.status} ${await res.text()}`);
  const data = await res.json() as { id: string; polling_url: string };
  console.log(`  Task ${data.id} submitted, polling...`);
  return data.polling_url;
}

async function pollBfl(pollingUrl: string, maxWaitMs = 120_000): Promise<Buffer> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const res = await fetch(pollingUrl, { headers: { "x-key": BFL_API_KEY } });
    if (res.status === 404) { await sleep(1500); continue; }
    if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
    const data = await res.json() as { status: string; result?: { sample?: string } };
    if (data.status === "Ready" && data.result?.sample) {
      const imgRes = await fetch(data.result.sample);
      return Buffer.from(await imgRes.arrayBuffer());
    }
    if (data.status === "Error") throw new Error(`BFL error: ${JSON.stringify(data)}`);
    if (data.status === "Request Moderated" || data.status === "Content Moderated") {
      throw new Error(`BFL moderated: ${data.status}`);
    }
    await sleep(1500);
  }
  throw new Error("Timeout");
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// Option lookup builder from Supabase
// ---------------------------------------------------------------------------

async function buildOptionLookup(orgId: string): Promise<Map<string, { option: Option; subCategory: SubCategory }>> {
  const { data: cats, error } = await supabase
    .from("categories")
    .select(`
      id, slug, name, sort_order,
      subcategories (
        id, slug, name, is_appliance, sort_order,
        generation_rules, generation_rules_when_not_selected,
        options (
          id, slug, name, swatch_url, swatch_color,
          prompt_descriptor, generation_rules, dimensions,
          needs_isolation, linked_to_subcategory, is_default, sort_order
        )
      )
    `)
    .eq("org_id", orgId)
    .order("sort_order");

  if (error) {
    console.error("Option lookup query error:", error);
    return new Map();
  }

  const map = new Map<string, { option: Option; subCategory: SubCategory }>();
  for (const cat of cats ?? []) {
    for (const sc of (cat.subcategories as any[] ?? [])) {
      const subCategory: SubCategory = {
        id: sc.slug,
        name: sc.name,
        isAppliance: sc.is_appliance ?? false,
        generationRules: sc.generation_rules ?? undefined,
        generationRulesWhenNotSelected: sc.generation_rules_when_not_selected ?? undefined,
        options: [],
      };
      for (const o of (sc.options as any[] ?? [])) {
        const option: Option = {
          id: o.slug,
          name: o.name,
          swatchUrl: o.swatch_url ?? undefined,
          swatchColor: o.swatch_color ?? undefined,
          promptDescriptor: o.prompt_descriptor ?? undefined,
          generationRules: o.generation_rules ?? undefined,
          dimensions: o.dimensions ?? undefined,
          needsIsolation: o.needs_isolation ?? false,
          linkedToSubcategory: o.linked_to_subcategory ?? undefined,
          isDefault: o.is_default ?? false,
          price: 0,
          displayOrder: 0,
        };
        map.set(`${sc.slug}:${o.slug}`, { option, subCategory });
      }
    }
  }
  return map;
}

/** Swatch resolver that downloads from Supabase Storage */
const resolveSwatchBuffer: SwatchBufferResolver = async (swatchUrl: string) => {
  let storagePath = swatchUrl;
  if (swatchUrl.startsWith("http")) {
    const match = swatchUrl.match(/\/object\/public\/swatches\/(.+)$/);
    if (match) storagePath = match[1];
    else return null;
  }
  if (storagePath.startsWith("/swatches/")) storagePath = storagePath.slice("/swatches/".length);

  const { data, error } = await supabase.storage.from("swatches").download(storagePath);
  if (error || !data) return null;

  const rawBuffer = Buffer.from(await data.arrayBuffer());
  const ext = storagePath.split(".").pop()?.toLowerCase() || "png";
  if (ext === "svg" || ext === "svgz") {
    const pngBuffer = await sharp(rawBuffer).png().toBuffer();
    return { buffer: pngBuffer, mediaType: "image/png" };
  }
  return { buffer: rawBuffer, mediaType: ext === "jpg" ? "image/jpeg" : `image/${ext}` };
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const comboFilter = args.includes("--combo") ? args[args.indexOf("--combo") + 1] : null;
  const skipExisting = args.includes("--skip-existing");

  // Get SM org
  const { data: org } = await supabase.from("organizations").select("id").eq("slug", "stonemartin").single();
  if (!org) { console.error("SM org not found"); process.exit(1); }

  // Download hero image
  console.log("Downloading SM Kinkade kitchen hero...");
  const { data: heroData, error: heroErr } = await supabase.storage.from("rooms").download(HERO_PATH);
  if (heroErr || !heroData) { console.error("Hero download failed:", heroErr); process.exit(1); }
  const heroRaw = Buffer.from(await heroData.arrayBuffer());
  // Convert webp to png for BFL
  const heroBuffer = await sharp(heroRaw).png().toBuffer();
  console.log(`  Hero: ${(heroRaw.length / 1024).toFixed(0)}KB webp → ${(heroBuffer.length / 1024).toFixed(0)}KB png\n`);

  // Build option lookup
  console.log("Building option lookup...");
  const optionLookup = await buildOptionLookup(org.id);
  console.log(`  ${optionLookup.size} options loaded\n`);

  // Run combos
  const combosToRun = comboFilter ? COMBOS.filter(c => c.name === comboFilter) : COMBOS;
  if (combosToRun.length === 0) {
    console.error(`No combo matching "${comboFilter}". Available: ${COMBOS.map(c => c.name).join(", ")}`);
    process.exit(1);
  }

  for (const combo of combosToRun) {
    const mainOut = path.join(OUTPUT_DIR, `${combo.name}.jpg`);
    const secondOut = path.join(OUTPUT_DIR, `${combo.name}-second-pass.jpg`);

    if (skipExisting && fs.existsSync(mainOut)) {
      console.log(`[skip] ${combo.name} — already exists`);
      continue;
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`[${combo.name}] ${combo.description}`);
    console.log(`${"=".repeat(60)}`);

    // Clone selections and resolve linked options
    const selections = { ...combo.selections };
    const hints = { ...SPATIAL_HINTS };
    resolveLinkedOptions(selections, optionLookup, hints);

    // Count swatches to predict single vs two-pass
    const FIXTURE_PATTERNS = ["hardware", "faucet", "sink", "lighting", "fan", "refrigerator", "range", "dishwasher"];
    const isFixture = (subId: string) => FIXTURE_PATTERNS.some(p => subId.includes(p));
    let structuralCount = 0;
    let fixtureCount = 0;
    for (const [subId, optId] of Object.entries(selections)) {
      const entry = optionLookup.get(`${subId}:${optId}`);
      if (!entry?.option.swatchUrl) continue;
      if (isFixture(subId)) fixtureCount++;
      else structuralCount++;
    }
    const totalSwatches = structuralCount + fixtureCount;
    const needsSplit = totalSwatches > 7 && fixtureCount > 0 && structuralCount > 0;

    console.log(`  Selections: ${Object.keys(selections).length} (${totalSwatches} swatches: ${structuralCount} structural, ${fixtureCount} fixture)`);
    console.log(`  Strategy: ${needsSplit ? "TWO-PASS SPLIT" : "SINGLE PASS"}`);

    const overallStart = Date.now();

    if (!needsSplit) {
      // Single pass
      const { prompt, swatches } = await buildEditPrompt(
        selections, optionLookup, hints, SCOPED_SUBCATEGORY_IDS,
        SCENE_DESCRIPTION, PHOTO_SPATIAL_HINT, resolveSwatchBuffer, PROMPT_OVERRIDES,
      );

      console.log(`  Prompt: ${prompt.length} chars, ${swatches.length} swatch images`);
      fs.writeFileSync(path.join(OUTPUT_DIR, `${combo.name}-prompt.txt`), prompt);

      console.log(`  Submitting to flux-2-max...`);
      const start = Date.now();
      const pollingUrl = await submitBfl("flux-2-max", prompt, heroBuffer, swatches.map(s => s.buffer));
      const resultBuffer = await pollBfl(pollingUrl);
      const jpegBuffer = await sharp(resultBuffer).jpeg({ quality: 90 }).toBuffer();
      fs.writeFileSync(mainOut, jpegBuffer);
      console.log(`  ✓ Main pass: ${((Date.now() - start) / 1000).toFixed(1)}s → ${mainOut}`);
    } else {
      // Two-pass split: structural then fixtures
      const structuralSelections: Record<string, string> = {};
      const fixtureSelections: Record<string, string> = {};
      for (const [subId, optId] of Object.entries(selections)) {
        if (isFixture(subId)) fixtureSelections[subId] = optId;
        else structuralSelections[subId] = optId;
      }

      console.log(`  Pass 1 (structural): ${Object.keys(structuralSelections).join(", ")}`);
      const { prompt: p1, swatches: s1 } = await buildEditPrompt(
        structuralSelections, optionLookup, hints, SCOPED_SUBCATEGORY_IDS,
        SCENE_DESCRIPTION, PHOTO_SPATIAL_HINT, resolveSwatchBuffer, PROMPT_OVERRIDES,
      );
      fs.writeFileSync(path.join(OUTPUT_DIR, `${combo.name}-prompt-pass1.txt`), p1);
      console.log(`    Prompt: ${p1.length} chars, ${s1.length} swatches`);

      let start = Date.now();
      const pollingUrl1 = await submitBfl("flux-2-max", p1, heroBuffer, s1.map(s => s.buffer));
      const pass1Buffer = await pollBfl(pollingUrl1);
      const pass1Jpeg = await sharp(pass1Buffer).jpeg({ quality: 90 }).toBuffer();
      fs.writeFileSync(path.join(OUTPUT_DIR, `${combo.name}-pass1.jpg`), pass1Jpeg);
      console.log(`    ✓ Pass 1: ${((Date.now() - start) / 1000).toFixed(1)}s`);

      console.log(`  Pass 2 (fixtures): ${Object.keys(fixtureSelections).join(", ")}`);
      const { prompt: p2, swatches: s2 } = await buildEditPrompt(
        fixtureSelections, optionLookup, hints, SCOPED_SUBCATEGORY_IDS,
        SCENE_DESCRIPTION, PHOTO_SPATIAL_HINT, resolveSwatchBuffer, PROMPT_OVERRIDES,
      );
      fs.writeFileSync(path.join(OUTPUT_DIR, `${combo.name}-prompt-pass2.txt`), p2);
      console.log(`    Prompt: ${p2.length} chars, ${s2.length} swatches`);

      start = Date.now();
      const pollingUrl2 = await submitBfl("flux-2-max", p2, pass1Jpeg, s2.map(s => s.buffer));
      const pass2Buffer = await pollBfl(pollingUrl2);
      const pass2Jpeg = await sharp(pass2Buffer).jpeg({ quality: 90 }).toBuffer();
      fs.writeFileSync(mainOut, pass2Jpeg);
      console.log(`    ✓ Pass 2: ${((Date.now() - start) / 1000).toFixed(1)}s → ${mainOut}`);
    }

    // Oven correction second pass (slide-in range)
    if (combo.expectSecondPass) {
      console.log(`  Running oven correction second pass...`);
      const mainBuffer = fs.readFileSync(mainOut);
      const start = Date.now();
      const pollingUrl = await submitBfl("flux-2-max", OVEN_SECOND_PASS_PROMPT, mainBuffer, []);
      const resultBuffer = await pollBfl(pollingUrl);
      const jpegBuffer = await sharp(resultBuffer).jpeg({ quality: 90 }).toBuffer();
      fs.writeFileSync(secondOut, jpegBuffer);
      console.log(`  ✓ Second pass: ${((Date.now() - start) / 1000).toFixed(1)}s → ${secondOut}`);
    }

    const total = ((Date.now() - overallStart) / 1000).toFixed(1);
    console.log(`  TOTAL: ${total}s`);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Results in: ${OUTPUT_DIR}`);
  console.log(`${"=".repeat(60)}`);
}

main().catch(console.error);
