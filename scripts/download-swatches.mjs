#!/usr/bin/env node
/**
 * Download swatch images from stonemartinbuilders.com/media/
 * Filenames extracted from CMS JSON embedded in the rendered HTML.
 */

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SWATCHES_DIR = path.join(ROOT, "public", "swatches");

const BASE_URL = "https://www.stonemartinbuilders.com/media/";

async function extractCmsFilenames() {
  const files = ["kitchen.html", "flooring.html", "bathroom.html"];
  const allFilenames = new Set();

  for (const file of files) {
    const htmlPath = path.join(ROOT, "scripts", "debug", file);
    if (!existsSync(htmlPath)) continue;
    const html = await readFile(htmlPath, "utf8");

    // Extract filenames from CMS JSON (double-escaped): \"filename\":\"SOMETHING.jpg\"
    const escapedRegex = /\\?"filename\\?":\\?"([^"\\]+\.(jpg|jpeg|png|webp))\\?"/gi;
    let m;
    while ((m = escapedRegex.exec(html)) !== null) {
      // Skip URL paths like /find-my-home/...
      if (!m[1].startsWith("/")) {
        allFilenames.add(m[1]);
      }
    }

    // Also get filenames from /media/ URL patterns
    const mediaRegex = /stonemartinbuilders\.com\/media\/([^"'\s\\&;]+\.(jpg|jpeg|png|webp))/gi;
    while ((m = mediaRegex.exec(html)) !== null) {
      allFilenames.add(decodeURIComponent(m[1]));
    }
  }

  return [...allFilenames];
}

function categorizeFilename(filename) {
  const f = filename.toUpperCase();

  // Under-cabinet lighting
  if (f.includes("UNDER-CABINET-LIGHTING") || f.includes("UNDER CABINET LIGHTING"))
    return "electrical";

  // Cabinet colors (specific swatch filenames)
  if (
    f.includes("CABINET-COLOR") || f.includes("CABINET COLOR") ||
    (f.includes("CABINET") && (f.includes("DRIFTWOOD") || f.includes("CAPPUCINO") ||
      f.includes("SAHARA") || f.includes("FOG") || f.includes("ONYX") ||
      f.includes("WHITE") || f.includes("BUTTERCREAM") || f.includes("WILLOW") ||
      f.includes("ADMIRAL") || f.includes("SADDLE") || f.includes("PACIFIC") ||
      f.includes("BLUE-SMOKE") || f.includes("BLUE SMOKE")))
  )
    return "cabinets";

  // Cabinet styles
  if (f.includes("CABINET-STYLE") || f.includes("CABINET STYLE"))
    return "cabinets";
  if ((f.includes("FAIRMONT") || f.includes("MERIDIAN") || f.includes("OXFORD")) &&
    !f.includes("FLOORING") && !f.includes("BACKSPLASH"))
    return "cabinets";

  // Cabinet style + color combos (e.g. FAIRMONT_SADDLE.jpg, MERIDIAN_CAPPUCINO.jpg)
  if (f.includes("DRIFTWOOD") && f.includes("TSP")) return "cabinets";

  // Kitchen cabinet hardware
  if (f.includes("SEAVER") || f.includes("SEDONA") || f.includes("NAPLES") ||
    f.includes("DOMINIQUE") || f.includes("STANTON") || f.includes("KEY-GRANDE") ||
    f.includes("KEY GRANDE"))
    return "cabinets";

  // Door hardware (not kitchen - skip)
  if (f.includes("HARDWARE") && (f.includes("LEVER") || f.includes("KNOB")))
    return null;

  // Countertops
  if (f.includes("COUNTER-TOP") || f.includes("COUNTERTOP"))
    return "countertops";
  if (f.includes("GRANITE---") || f.includes("QUARTZ---"))
    return "countertops";

  // Countertop edges
  if (f.includes("COUNTERTOP-EDGE") || f.includes("COUNTOP-EDGE") ||
    ((f.includes("OGEE") || f.includes("BULLNOSE")) && f.includes("EDGE")))
    return "countertops";

  // Backsplash
  if (f.includes("BACKSPLASH")) return "backsplash";
  if (f.includes("BAKER-BLVD") || f.includes("BAKER BLVD")) return "backsplash";
  if (f.includes("GATEWAY") && f.includes("PICKET")) return "backsplash";
  if (f.includes("VESPER")) return "backsplash";
  if (f.includes("NAIVE")) return "backsplash";
  if (f.includes("MYTHOLOGY")) return "backsplash";

  // Sinks
  if (f.includes("SINK")) return "sinks";
  if (f.includes("EGRANITE")) return "sinks";
  if (f.includes("FARMHOUSE-SINK") || f.includes("FARMHOUSE SINK")) return "sinks";

  // Faucets
  if (f.includes("FAUCET")) return "faucets";
  if (f.includes("PFIRST") || f.includes("COLFAX") || f.includes("STELLEN") ||
    f.includes("MONTAY") || f.includes("BRISLIN"))
    return "faucets";

  // Flooring
  if (f.includes("FLOORING-COLOR") || f.includes("FLOORING COLOR")) return "flooring";
  if (f.includes("POLARIS") || f.includes("HOMESTEAD") || f.includes("MARINER") || f.includes("DELRAY"))
    return "flooring";

  // Appliances
  if (f.startsWith("GE ") || f.includes("REFRIGERATOR") || f.includes("DISHWASHER") ||
    f.includes("FREE STANDING") || f.includes("FREESTANDING") ||
    f.includes("SLIDE IN") || f.includes("SLIDE-IN") ||
    f.includes("WALL OVEN") || f.includes("MICROWAVE") || f.includes("COOKTOP"))
    return "appliances";

  // Generic cabinet
  if (f.includes("CABINET")) return "cabinets";

  return null;
}

async function downloadFile(filename, destPath) {
  const url = BASE_URL + filename;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      // Try URL-encoded version
      const url2 = BASE_URL + encodeURIComponent(filename);
      const res2 = await fetch(url2);
      if (!res2.ok) return false;
      const buffer = Buffer.from(await res2.arrayBuffer());
      const dir = path.dirname(destPath);
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
      await writeFile(destPath, buffer);
      return true;
    }
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
  console.log("Extracting filenames from scraped HTML...\n");

  const allFilenames = await extractCmsFilenames();
  console.log(`Found ${allFilenames.length} total media filenames\n`);

  // Categorize
  const toDownload = [];
  const skipped = [];
  const seen = new Set();

  for (const filename of allFilenames) {
    if (seen.has(filename)) continue;
    seen.add(filename);

    const category = categorizeFilename(filename);
    if (category) {
      toDownload.push({ filename, category });
    } else {
      skipped.push(filename);
    }
  }

  // Group by category for display
  const byCategory = {};
  for (const item of toDownload) {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item.filename);
  }

  console.log(`Swatch images to download: ${toDownload.length}`);
  console.log(`Skipped: ${skipped.length}\n`);

  for (const [cat, files] of Object.entries(byCategory).sort()) {
    console.log(`${cat} (${files.length}):`);
    for (const f of files.sort()) {
      console.log(`  ${f}`);
    }
  }

  console.log("\nDownloading...\n");

  let ok = 0;
  let fail = 0;

  for (const { filename, category } of toDownload) {
    const cleanFilename = filename.replace(/\s/g, "-");
    const destPath = path.join(SWATCHES_DIR, category, cleanFilename);

    if (existsSync(destPath)) {
      ok++;
      continue;
    }

    const success = await downloadFile(filename, destPath);
    if (success) {
      console.log(`  ✅ ${category}/${cleanFilename}`);
      ok++;
    } else {
      console.log(`  ❌ ${category}/${cleanFilename}`);
      fail++;
    }
  }

  console.log(`\nDone! ✅ ${ok} downloaded, ❌ ${fail} failed`);

  // Generate mapping: original filename -> local path
  const mapping = {};
  for (const { filename, category } of toDownload) {
    const cleanFilename = filename.replace(/\s/g, "-");
    mapping[filename] = `/swatches/${category}/${cleanFilename}`;
  }

  const mappingPath = path.join(ROOT, "scripts", "debug", "swatch-mapping.json");
  await writeFile(mappingPath, JSON.stringify(mapping, null, 2));
  console.log(`Mapping saved to scripts/debug/swatch-mapping.json`);
}

main().catch(console.error);
