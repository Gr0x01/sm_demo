/**
 * Sequential lab runner: scoped edit perimeter cab × 3 cab options × 3 models = 9 runs.
 * Tests whether the perimeter-only clause keeps the island preserved across
 * different materials and models.
 */
import fs from "fs";
import { execSync } from "child_process";

const CONFIG_PATH = "tmp/prompt-lab/nest-kitchen-cabs-stain/config.json";

const stainClause = "stain every perimeter cabinet door and drawer with wood grain matching {image}";
const paintClause = "paint every perimeter cabinet door and drawer to match {image}";

interface CabOption {
  optSlug: string;
  optLabel: string;
  material: "paint" | "stain";
}

const options: CabOption[] = [
  { optSlug: "kitchen-cab-color-driftwood", optLabel: "Driftwood", material: "stain" },
  { optSlug: "kitchen-cab-color-white", optLabel: "Dove", material: "paint" },
  { optSlug: "kitchen-cab-color-admiral-blue", optLabel: "AdmiralBlue", material: "paint" },
];

const models: { id: string; name: string; isFlex: boolean }[] = [
  { id: "flex", name: "flux-2-flex", isFlex: true },
  { id: "k9b", name: "flux-2-klein-9b", isFlex: false },
  { id: "k4b", name: "flux-2-klein-4b", isFlex: false },
];

const accumulated: any[] = [];

for (const opt of options) {
  for (const model of models) {
    const variantId = `v-perim-${opt.optLabel.toLowerCase()}-${model.id}`;
    const label = `${opt.optLabel} (${opt.material}) - ${model.name}`;
    console.log(`\n=== Running ${variantId} ===`);

    const c = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    c.selections = { "kitchen-cabinet-color": opt.optSlug };
    c.variants = [
      {
        id: variantId,
        label,
        prose: {
          version: 2,
          actions: { "kitchen-cabinet-color": opt.material === "stain" ? stainClause : paintClause },
          mergedClauses: [],
          style: "Shot on Canon 5D Mark IV. Soft diffused afternoon fill light, neutral interior photography.",
        },
        runs: 1,
        results: [],
        scoped: { subcategoryId: "kitchen-cabinet-color", optionId: opt.optSlug },
        forceHex: ["kitchen-cabinet-color"],
        model: model.name,
        ...(model.isFlex ? { steps: 50, guidance: 7 } : {}),
      },
    ];
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(c, null, 2));

    execSync("npx tsx scripts/prompt-lab.ts run nest-kitchen-cabs-stain", { stdio: "inherit" });

    const after = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    accumulated.push(after.variants[0]);
  }
}

const final = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
final.variants = accumulated;
fs.writeFileSync(CONFIG_PATH, JSON.stringify(final, null, 2));
console.log("\n--- 9 variants done:", accumulated.map(v => v.id).join(", "));
