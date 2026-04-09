#!/usr/bin/env node
/**
 * Splits tmp/sm-swatches-manifest.json into per-subagent review batches.
 * Writes one JSON file per batch to tmp/swatch-review-batches/{batchName}.json.
 */
import fs from "fs";
import path from "path";

const __dirname = new URL(".", import.meta.url).pathname;
const ROOT = path.join(__dirname, "..");
const MANIFEST = path.join(ROOT, "tmp", "sm-swatches-manifest.json");
const OUT_DIR = path.join(ROOT, "tmp", "swatch-review-batches");

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));

// Define batches by (category, subcategory) filter
const batches = {
  "01-cabinets-colors": (r) =>
    r.category === "Cabinets" &&
    ["Cabinet Style Whole House", "Kitchen Cabinet Color", "Kitchen Island Cabinet Color"].includes(r.subcategory),
  "02-cabinets-hardware": (r) =>
    r.category === "Cabinets" &&
    ["Kitchen Cabinet Hardware", "Bathroom Cabinet Hardware"].includes(r.subcategory),
  "03-cabinets-bath-laundry": (r) =>
    r.category === "Cabinets" &&
    ["Primary Bath Cabinet Color", "Secondary Bath Cabinet Color", "Laundry Room Cabinets", "Powder Room Vanity"].includes(r.subcategory),
  "04-flooring-backsplash-main": (r) =>
    r.category === "Flooring" &&
    ["Backsplash", "Main Area Flooring Color"].includes(r.subcategory),
  "05-flooring-carpet-primaryshower": (r) =>
    r.category === "Flooring" &&
    ["Carpet Color", "Primary Shower"].includes(r.subcategory),
  "06-flooring-tile-secondaryshower-fireplace": (r) =>
    r.category === "Flooring" &&
    ["Floor Tile Color", "Secondary Shower Style Tile", "Fireplace Tile Surround"].includes(r.subcategory),
  "07-hardware-door-bath-front": (r) =>
    r.category === "Hardware" &&
    ["Door Hardware", "Bath Hardware", "Front Door Handle Style"].includes(r.subcategory),
  "08-hardware-mirrors": (r) =>
    r.category === "Hardware" &&
    ["Primary Bath Mirrors", "Secondary Bath Mirrors"].includes(r.subcategory),
  "09-countertops": (r) => r.category === "Countertops",
  "10-electrical": (r) => r.category === "Electrical",
  "11-paint": (r) => r.category === "Paint",
  "12-plumbing": (r) => r.category === "Plumbing",
  "13-trim": (r) => r.category === "Trim",
  "14-appliances-windows": (r) =>
    r.category === "Appliances" || r.category === "Windows/Ext Doors",
};

fs.mkdirSync(OUT_DIR, { recursive: true });

let totalAssigned = 0;
for (const [name, filter] of Object.entries(batches)) {
  const items = manifest
    .filter(filter)
    .map((r) => ({
      optionId: r.optionId,
      optionName: r.optionName,
      category: r.category,
      subcategory: r.subcategory,
      localPath: r.localPath,
      bytes: r.bytes,
      width: r.width,
      height: r.height,
      sizeFlags: r.sizeFlags,
    }));
  const outPath = path.join(OUT_DIR, `${name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(items, null, 2));
  console.log(`${name.padEnd(45)} ${items.length} items → ${outPath}`);
  totalAssigned += items.length;
}

console.log(`\nTotal assigned: ${totalAssigned} / ${manifest.length}`);
const allOptionIds = new Set(manifest.map((r) => r.optionId));
for (const [name, filter] of Object.entries(batches)) {
  manifest.filter(filter).forEach((r) => allOptionIds.delete(r.optionId));
}
if (allOptionIds.size > 0) {
  console.log(`\nWARNING: ${allOptionIds.size} options NOT assigned to any batch:`);
  for (const id of allOptionIds) {
    const row = manifest.find((r) => r.optionId === id);
    console.log(`  ${row.category} / ${row.subcategory} / ${row.optionName}`);
  }
}
