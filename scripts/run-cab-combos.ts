/**
 * One-off sequential lab runner for 4 cab combo variants.
 * Each variant has different cab selections, so we have to swap
 * config.selections between runs (the lab uses one global selections per
 * session). Saves results into the session config under each variant id.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const CONFIG_PATH = "tmp/prompt-lab/nest-kitchen-cabs-stain/config.json";

const stainPerim = "stain every upper, lower, and corner cabinet door and drawer with wood grain matching {image}";
const paintPerim = "paint every upper, lower, and corner cabinet door and drawer to match {image}";
const stainIsland = "stain the center freestanding cabinet door and drawer with wood grain matching {image}";
const paintIsland = "paint the center freestanding cabinet door and drawer to match {image}";

const baseSelections = {
  backsplash: "bs-baker-4x16-glacier",
  "counter-top": "ct-granite-steel-grey",
  "main-area-flooring-color": "floor-color-delray-windsurf",
  "common-wall-paint": "wall-delicate-white",
};

const baseProse = (perimClause: string, islandClause: string) => ({
  version: 2,
  actions: {
    "kitchen-cabinet-color": perimClause,
    "kitchen-island-cabinet-color": islandClause,
    backsplash:
      "retile the wall between the upper cabinets and countertop with {image}, large staggered rectangular tiles in horizontal rows at hex #D4E4EC",
    "counter-top": "apply {image} to every countertop surface matching hex #6B6E72",
    "main-area-flooring-color": "change all visible flooring throughout the room to match {image} at hex #9A8268",
    "common-wall-paint": "paint every wall surface to match {image}",
  },
  mergedClauses: [],
  style: "Shot on Canon 5D Mark IV. Soft diffused afternoon fill light, neutral interior photography.",
});

interface Combo {
  id: string;
  label: string;
  perim: string;
  island: string;
  perimClause: string;
  islandClause: string;
}

const combos: Combo[] = [
  { id: "v-combo-dove-driftwood", label: "Dove perim + Driftwood island", perim: "kitchen-cab-color-white", island: "island-color-driftwood", perimClause: paintPerim, islandClause: stainIsland },
  { id: "v-combo-driftwood-onyx", label: "Driftwood perim + Onyx island", perim: "kitchen-cab-color-driftwood", island: "island-color-onyx", perimClause: stainPerim, islandClause: paintIsland },
  { id: "v-combo-fog-admiral", label: "Fog perim + Admiral Blue island", perim: "kitchen-cab-color-fog", island: "island-color-admiral-blue", perimClause: paintPerim, islandClause: paintIsland },
  { id: "v-combo-dove-admiral", label: "Dove perim + Admiral Blue island", perim: "kitchen-cab-color-white", island: "island-color-admiral-blue", perimClause: paintPerim, islandClause: paintIsland },
];

// Snapshot the original config (we will restore at the end with all results)
const originalConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const accumulatedVariants: any[] = [];

for (const combo of combos) {
  console.log(`\n=== Running ${combo.id} ===`);

  // Swap config to this combo
  const c = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  c.selections = { ...baseSelections, "kitchen-cabinet-color": combo.perim, "kitchen-island-cabinet-color": combo.island };
  c.variants = [
    {
      id: combo.id,
      label: combo.label,
      prose: baseProse(combo.perimClause, combo.islandClause),
      runs: 1,
      results: [],
      forceHex: ["kitchen-cabinet-color", "kitchen-island-cabinet-color"],
      model: "flux-2-flex",
      steps: 50,
      guidance: 9,
    },
  ];
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(c, null, 2));

  // Run
  execSync("npx tsx scripts/prompt-lab.ts run nest-kitchen-cabs-stain", { stdio: "inherit" });

  // Read back to capture results
  const after = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  accumulatedVariants.push(after.variants[0]);
}

// Final restore: write all 4 variants with results into config so review shows them
const final = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
final.variants = accumulatedVariants;
fs.writeFileSync(CONFIG_PATH, JSON.stringify(final, null, 2));

console.log("\n--- All 4 variants done. Variants in config:", accumulatedVariants.map(v => v.id).join(", "));
