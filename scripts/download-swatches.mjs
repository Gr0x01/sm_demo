#!/usr/bin/env node
/**
 * Download swatch images from stonemartinbuilders.com/media/
 * using filenames extracted from the rendered kitchen HTML.
 */

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SWATCHES_DIR = path.join(ROOT, "public", "swatches");

const BASE_URL = "https://www.stonemartinbuilders.com/media/";

// Extract all swatch filenames from the debug HTML files
async function extractFilenames() {
  const files = ["kitchen.html", "flooring.html", "bathroom.html"];
  const allFilenames = new Set();

  for (const file of files) {
    const htmlPath = path.join(ROOT, "scripts", "debug", file);
    if (!existsSync(htmlPath)) continue;
    const html = await readFile(htmlPath, "utf8");

    // Extract filenames from /media/ paths
    const mediaRegex = /stonemartinbuilders\.com\/media\/([^"'\s\\&;]+\.(jpg|jpeg|png|webp))/gi;
    let m;
    while ((m = mediaRegex.exec(html)) !== null) {
      allFilenames.add(decodeURIComponent(m[1]));
    }
  }

  return [...allFilenames];
}

// Map filenames to our option IDs and categories
function categorizeFilename(filename) {
  const f = filename.toUpperCase();

  // Cabinet colors
  if (f.includes("CABINET") && f.includes("COLOR")) return { category: "cabinets/colors", keep: true };
  if (f.includes("CABINET") && f.includes("STYLE")) return { category: "cabinets/styles", keep: true };
  if (f.includes("CABINET") && f.includes("LIGHTING")) return { category: "electrical", keep: true };

  // Hardware - door hardware, not cabinet hardware
  if (f.includes("HARDWARE") && (f.includes("LEVER") || f.includes("KNOB"))) return { category: "hardware-door", keep: false };

  // Kitchen cabinet hardware (Seaver, Sedona, etc.)
  if (f.includes("SEAVER") || f.includes("SEDONA") || f.includes("NAPLES") ||
      f.includes("DOMINIQUE") || f.includes("STANTON") || f.includes("KEY-GRANDE") ||
      f.includes("KEY GRANDE")) return { category: "cabinets/hardware", keep: true };

  // Countertops
  if (f.includes("COUNTER-TOP") || f.includes("COUNTERTOP")) return { category: "countertops", keep: true };
  if (f.includes("GRANITE---") || f.includes("QUARTZ---")) return { category: "countertops", keep: true };
  if (f.includes("COUNTERTOP-EDGE") || f.includes("EDGE-") && (f.includes("OGEE") || f.includes("BULLNOSE"))) return { category: "countertops/edges", keep: true };

  // Backsplash
  if (f.includes("BACKSPLASH")) return { category: "backsplash", keep: true };
  if (f.includes("BAKER-BLVD") && !f.includes("FLOOR")) return { category: "backsplash", keep: true };
  if (f.includes("GATEWAY") && f.includes("PICKET")) return { category: "backsplash", keep: true };
  if (f.includes("VESPER")) return { category: "backsplash", keep: true };
  if (f.includes("NAIVE")) return { category: "backsplash", keep: true };
  if (f.includes("MYTHOLOGY")) return { category: "backsplash", keep: true };

  // Sinks
  if (f.includes("SINK")) return { category: "sinks", keep: true };
  if (f.includes("EGRANITE") && !f.includes("COUNTER")) return { category: "sinks", keep: true };
  if (f.includes("FARMHOUSE") && !f.includes("COUNTER")) return { category: "sinks", keep: true };

  // Faucets
  if (f.includes("FAUCET")) return { category: "faucets", keep: true };
  if (f.includes("PFIRST") || f.includes("COLFAX") || f.includes("STELLEN") ||
      f.includes("MONTAY") || f.includes("BRISLIN")) return { category: "faucets", keep: true };

  // Flooring
  if (f.includes("FLOORING") || f.includes("LVP") || f.includes("HARDWOOD")) return { category: "flooring", keep: true };
  if (f.includes("POLARIS") || f.includes("HOMESTEAD") || f.includes("MARINER") || f.includes("DELRAY")) return { category: "flooring", keep: true };

  // Appliances
  if (f.includes("GE ") || f.includes("REFRIGERATOR") || f.includes("DISHWASHER") ||
      f.includes("RANGE") || f.includes("OVEN") || f.includes("MICROWAVE") ||
      f.includes("COOKTOP")) return { category: "appliances", keep: true };

  // Cabinet style swatch images (by specific names)
  if (f.includes("FAIRMONT") || f.includes("MERIDIAN") || f.includes("OXFORD")) return { category: "cabinets/styles", keep: true };
  if (f.includes("DRIFTWOOD") || f.includes("CAPPUCINO") || f.includes("SAHARA") ||
      f.includes("WILLOW") || f.includes("BUTTERCREAM") || f.includes("ADMIRAL") ||
      f.includes("SADDLE") || f.includes("PACIFIC") || f.includes("BLUE-SMOKE") ||
      f.includes("BLUE SMOKE")) return { category: "cabinets/colors", keep: true };

  // Misc kitchen
  if (f.includes("CABINET")) return { category: "cabinets", keep: true };

  return { category: "other", keep: false };
}

async function downloadFile(url, destPath) {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    const dir = path.dirname(destPath);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(destPath, buffer);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log("Extracting swatch filenames from scraped HTML...\n");

  const allFilenames = await extractFilenames();
  console.log(`Found ${allFilenames.length} total media filenames\n`);

  // Categorize and filter to swatches only
  const swatches = [];
  const skipped = [];

  for (const filename of allFilenames) {
    const { category, keep } = categorizeFilename(filename);
    if (keep) {
      swatches.push({ filename, category });
    } else if (category !== "other") {
      skipped.push({ filename, category });
    }
  }

  // Deduplicate by filename
  const seen = new Set();
  const unique = swatches.filter((s) => {
    if (seen.has(s.filename)) return false;
    seen.add(s.filename);
    return true;
  });

  console.log(`Swatch images to download: ${unique.length}`);
  console.log(`Skipped: ${skipped.length} (door hardware, etc.)\n`);

  // Group by category for display
  const byCategory = {};
  for (const s of unique) {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s.filename);
  }

  for (const [cat, files] of Object.entries(byCategory).sort()) {
    console.log(`${cat}: ${files.length} images`);
    for (const f of files.sort()) {
      console.log(`  ${f}`);
    }
  }

  console.log("\nDownloading...\n");

  let ok = 0;
  let fail = 0;

  for (const { filename, category } of unique) {
    const cleanFilename = filename.replace(/%20/g, "-").replace(/\s/g, "-");
    const destPath = path.join(SWATCHES_DIR, category, cleanFilename);

    if (existsSync(destPath)) {
      console.log(`  skip ${category}/${cleanFilename}`);
      ok++;
      continue;
    }

    const url = BASE_URL + encodeURIComponent(filename).replace(/%2F/g, "/");
    const success = await downloadFile(url, destPath);
    if (success) {
      console.log(`  ✅ ${category}/${cleanFilename}`);
      ok++;
    } else {
      // Try with spaces encoded differently
      const url2 = BASE_URL + filename.replace(/ /g, "%20");
      const success2 = await downloadFile(url2, destPath);
      if (success2) {
        console.log(`  ✅ ${category}/${cleanFilename} (retry)`);
        ok++;
      } else {
        console.log(`  ❌ ${category}/${cleanFilename}`);
        fail++;
      }
    }
  }

  console.log(`\nDone! ✅ ${ok} downloaded, ❌ ${fail} failed`);

  // Generate mapping JSON for options-data.ts integration
  const mapping = {};
  for (const { filename, category } of unique) {
    const cleanFilename = filename.replace(/%20/g, "-").replace(/\s/g, "-");
    const swatchPath = `/swatches/${category}/${cleanFilename}`;
    mapping[filename] = swatchPath;
  }

  const mappingPath = path.join(ROOT, "scripts", "debug", "swatch-mapping.json");
  await writeFile(mappingPath, JSON.stringify(mapping, null, 2));
  console.log(`\nMapping saved to scripts/debug/swatch-mapping.json`);
}

main().catch(console.error);
