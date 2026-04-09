#!/usr/bin/env node
/**
 * Build per-brand batch files listing flagged swatches that can be replaced
 * from manufacturer catalog sites. Subagents consume these batches.
 *
 * Writes tmp/swatch-replacement-batches/{brand}.json.
 */
import fs from "fs";
import path from "path";

const __dirname = new URL(".", import.meta.url).pathname;
const ROOT = path.join(__dirname, "..");
const MANIFEST = path.join(ROOT, "tmp", "sm-swatches-manifest.json");
const REVIEW = path.join(ROOT, "tmp", "swatch-visual-review-flat.json");
const OUT_DIR = path.join(ROOT, "tmp", "swatch-replacement-batches");

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const review = JSON.parse(fs.readFileSync(REVIEW, "utf8"));

// Only consider options that were visually flagged
const flagged = manifest.filter((r) => review[r.optionId]);

const brands = {
  "baker-blvd": {
    filter: (r) => /baker\s*blvd/i.test(r.optionName),
    hypothesis: "MSI Surfaces — Baker Blvd is a ceramic subway/mosaic line (sometimes called Bakerstreet). Check msisurfaces.com. Colors: Glacier (light blue-grey), Carbon (dark grey), Warm Grey, Taupe, White Gloss.",
  },
  "sphinx-12x24": {
    filter: (r) => /sphinx\s*12x24/i.test(r.optionName),
    hypothesis: "Likely MSI or Daltile porcelain line. Colors: White, Grey, Cream.",
  },
  "onyx-12x24": {
    filter: (r) => /onyx\s*12x24/i.test(r.optionName),
    hypothesis: "Likely MSI porcelain line. Colors: Dark Grey, Ivory, White.",
  },
  "infinity-12x24": {
    filter: (r) => /infinity\s*12x24/i.test(r.optionName),
    hypothesis: "Likely MSI or Daltile porcelain line. Colors: Calacatta, Marquant.",
  },
  "omega-13x13": {
    filter: (r) => /omega\s*13x13/i.test(r.optionName),
    hypothesis: "Likely MSI ceramic/porcelain line. Colors: Bone, Grey, Khaki, Taupe.",
  },
  "naive-3x12": {
    filter: (r) => /naive\s*3x12/i.test(r.optionName),
    hypothesis: "Likely MSI ceramic subway line. Colors: Pearl, Mint, White.",
  },
  "vesper-6x6": {
    filter: (r) => /vesper\s*6x6/i.test(r.optionName),
    hypothesis: "Likely MSI ceramic line. Colors: Alba, Awaken, Callisto, Eminent.",
  },
  "shaw-mariner-oak": {
    filter: (r) => /mariner\s*oak/i.test(r.optionName),
    hypothesis: "Shaw Floors — Mariner Oak 7\" hardwood. Check shawfloors.com. Colors: Voyage, Port.",
  },
  "park-presidio-orb": {
    filter: (r) => /park\s*presidio.*(oil\s*rubbed|orb)/i.test(r.optionName),
    hypothesis: "Bath hardware. Pfister Park Avenue or similar. Check pfisterfaucets.com.",
  },
  "style-fr-fa-mirrors": {
    filter: (r) => /style\s*fr|style\s*fa/i.test(r.optionName),
    hypothesis: "Bath mirror brand unknown. 'FR2436' likely means 'Frameless Radius 24x36'. 'FA2638' likely 'Frameless Arched 26x38'. Search for 'FR2436 mirror' and 'FA2638 arched mirror'. Fairmont, Basco, or Foremost could be suppliers.",
  },
};

fs.mkdirSync(OUT_DIR, { recursive: true });

let total = 0;
for (const [name, { filter, hypothesis }] of Object.entries(brands)) {
  const items = flagged
    .filter(filter)
    .map((r) => ({
      optionId: r.optionId,
      optionName: r.optionName,
      optionSlug: r.optionSlug,
      category: r.category,
      subcategory: r.subcategory,
      currentSwatchLocalPath: r.localPath,
      currentSwatchUrl: r.swatchUrl,
      reviewReason: review[r.optionId].reason,
      reviewSeverity: review[r.optionId].severity,
    }));

  const batch = { brand: name, hypothesis, items };
  const outPath = path.join(OUT_DIR, `${name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(batch, null, 2));
  console.log(`${name.padEnd(30)} ${items.length} items`);
  total += items.length;
}

console.log(`\nTotal: ${total} items across ${Object.keys(brands).length} brands`);
