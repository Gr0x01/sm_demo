/**
 * Test multi-pass pipeline on Lenox Kitchen (step_photo_id: 68d72b00-1c83-4246-af29-0307f2115a76)
 *
 * Exercises all pass types:
 *   1. Defaults (structural + fixtures + specialty)
 *   2. Stain cabs + herringbone BS + slide-in range (structural + fixtures + oven + specialty)
 *   3. Paint cabs (onyx) + two-tone island (white) + carbon BS (structural + fixtures + specialty)
 *   4. Premium: quartz + hardwood + stain + fancy fixtures (structural + fixtures + specialty)
 *
 * Usage: npx tsx scripts/test-lenox-kitchen-multipass.ts [--dry-run] [--combo 1]
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3003";
const ORG_SLUG = "stonemartin";
const FLOORPLAN_SLUG = "lenox";
const SESSION_ID = "cfd329b3-b169-4edb-b058-b5639dc32db7";
const STEP_PHOTO_ID = "68d72b00-1c83-4246-af29-0307f2115a76"; // Lenox Kitchen

// Lenox Kitchen defaults (is_default options for scoped subcategories)
const DEFAULTS: Record<string, string> = {
  "counter-top": "ct-granite-steel-grey",
  "countertop-edge": "edge-no-upgrade",
  "backsplash": "bs-baker-4x16-white-gloss",
  "kitchen-cabinet-color": "kitchen-cab-color-driftwood",
  "kitchen-island-cabinet-color": "island-color-match",
  "kitchen-cabinet-hardware": "hw-seaver-pull-knob-bronze",
  "kitchen-sink": "sink-high-divide-60-40",
  "kitchen-faucet": "faucet-pfirst-ss",
  "cabinet-style-whole-house": "cabinet-style-fairmont",
  "under-cabinet-lighting": "under-cab-light-no",
  "light-rail": "light-rail-no-upgrade",
  "glass-cabinet-door": "glass-door-no-upgrade",
  "trash-can-cabinet": "trash-can-no-upgrade",
  "range": "range-ge-included-freestanding",
  "main-area-flooring-type": "flooring-type-7-lvp-standard",
  "main-area-flooring-color": "floor-color-polaris-toasted-taupe",
  "common-wall-paint": "wall-whiskers",
  "lighting": "lighting-satin-nickel-wh",
};

interface TestCombo {
  name: string;
  description: string;
  expectedPasses: string;
  selections: Record<string, string>;
}

const COMBOS: TestCombo[] = [
  {
    name: "1-defaults",
    description: "All defaults — Driftwood stain, Steel Grey granite, White Gloss 4x16 BS, LVP, freestanding range",
    expectedPasses: "structural + fixtures + specialty (backsplash always goes to specialty)",
    selections: { ...DEFAULTS },
  },
  {
    name: "2-worst-case",
    description: "Cappuccino stain + herringbone BS (needs_isolation) + slide-in range + quartz + dark floor",
    expectedPasses: "structural + fixtures + oven + specialty (all 4 passes)",
    selections: {
      ...DEFAULTS,
      "kitchen-cabinet-color": "kitchen-cab-color-cappucino",
      "kitchen-island-cabinet-color": "island-color-cappucino",
      "backsplash": "bs-baker-herringbone-carbon",
      "range": "range-ge-gas-slide-in",
      "counter-top": "ct-quartz-calacatta-venice",
      "main-area-flooring-color": "floor-color-homestead-cabriole-brown",
      "main-area-flooring-type": "flooring-type-9-lvp-standard",
      "kitchen-cabinet-hardware": "hw-naples-pull-knob-black",
      "kitchen-faucet": "faucet-stellen-black",
      "kitchen-sink": "sink-egranite-anthracite",
      "lighting": "lighting-black-wh",
    },
  },
  {
    name: "3-two-tone-dark",
    description: "Onyx perimeter + White island + Carbon 4x16 BS + brushed gold fixtures",
    expectedPasses: "structural + fixtures + specialty",
    selections: {
      ...DEFAULTS,
      "kitchen-cabinet-color": "kitchen-cab-color-onyx",
      "kitchen-island-cabinet-color": "island-color-white",
      "backsplash": "bs-baker-4x16-carbon",
      "counter-top": "ct-quartz-pure-white",
      "kitchen-cabinet-hardware": "hw-key-grande-all-pulls-brushed-gold",
      "kitchen-faucet": "faucet-stellen-gold",
      "lighting": "lighting-brushed-gold-wh",
      "main-area-flooring-color": "floor-color-polaris-sea-glass",
    },
  },
  {
    name: "4-premium-stain",
    description: "Sahara stain + Admiral Blue island + picket BS (needs_isolation) + hardwood + farmhouse sink",
    expectedPasses: "structural + fixtures + specialty",
    selections: {
      ...DEFAULTS,
      "kitchen-cabinet-color": "kitchen-cab-color-sahara",
      "kitchen-island-cabinet-color": "island-color-admiral-blue",
      "backsplash": "baker-blvd-picket-gloss-taupe-horizontal",
      "counter-top": "ct-quartz-calacatta-idillio",
      "main-area-flooring-type": "flooring-type-7-hardwood-standard",
      "main-area-flooring-color": "floor-color-mariner-harbor",
      "kitchen-sink": "sink-fireclay-farmhouse",
      "kitchen-faucet": "faucet-brislin-black",
      "kitchen-cabinet-hardware": "hw-stanton-all-pulls-black",
      "lighting": "lighting-designer-black-wh",
      "cabinet-style-whole-house": "cabinet-style-oxford",
      "under-cabinet-lighting": "under-cab-light-add",
    },
  },
];

// --- Execution ---

async function runCombo(combo: TestCombo, dryRun: boolean): Promise<void> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`COMBO: ${combo.name}`);
  console.log(`  ${combo.description}`);
  console.log(`  Expected passes: ${combo.expectedPasses}`);
  console.log(`${"=".repeat(70)}`);

  if (dryRun) {
    console.log("  [DRY RUN] Would send:", JSON.stringify({
      orgSlug: ORG_SLUG,
      floorplanSlug: FLOORPLAN_SLUG,
      stepPhotoId: STEP_PHOTO_ID,
      sessionId: SESSION_ID,
      selections: combo.selections,
    }, null, 2));
    return;
  }

  const startTime = Date.now();

  // Fire generation
  const genRes = await fetch(`${BASE_URL}/api/generate/photo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orgSlug: ORG_SLUG,
      floorplanSlug: FLOORPLAN_SLUG,
      stepPhotoId: STEP_PHOTO_ID,
      sessionId: SESSION_ID,
      selections: combo.selections,
    }),
  });

  const genData = await genRes.json();

  if (genRes.status === 200 && genData.cacheHit) {
    console.log(`  ✓ CACHE HIT in ${Date.now() - startTime}ms`);
    console.log(`    Image: ${genData.imageUrl}`);
    return;
  }

  if (genRes.status !== 202) {
    console.error(`  ✗ Generation failed: ${genRes.status}`, genData);
    return;
  }

  const { selectionsHash } = genData;
  console.log(`  Dispatched: ${selectionsHash}`);

  // Poll for completion
  const MAX_POLLS = 80; // ~4 min with adaptive polling
  for (let i = 0; i < MAX_POLLS; i++) {
    const interval = i < 10 ? 1500 : 3000;
    await new Promise(r => setTimeout(r, interval));

    const checkRes = await fetch(`${BASE_URL}/api/generate/photo/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectionsHash }),
    });

    if (checkRes.status === 200) {
      const checkData = await checkRes.json();
      if (checkData.status === "complete" && checkData.imageUrl) {
        const elapsed = Date.now() - startTime;
        console.log(`  ✓ DONE in ${(elapsed / 1000).toFixed(1)}s`);
        console.log(`    Image: ${checkData.imageUrl}`);
        return;
      }
      if (checkData.status === "not_found") {
        console.error(`  ✗ Generation failed (not_found after dispatch)`);
        return;
      }
    }
  }

  console.error(`  ✗ Timed out after ${((Date.now() - startTime) / 1000).toFixed(0)}s`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const comboArg = args.find(a => a.startsWith("--combo"));
  const comboIdx = comboArg ? parseInt(args[args.indexOf(comboArg) + 1]) : null;

  const combosToRun = comboIdx !== null
    ? COMBOS.filter((_, i) => i + 1 === comboIdx)
    : COMBOS;

  console.log(`Testing Lenox Kitchen multi-pass pipeline`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Combos: ${combosToRun.length}${dryRun ? " (DRY RUN)" : ""}`);

  for (const combo of combosToRun) {
    await runCombo(combo, dryRun);
  }

  console.log("\nDone.");
}

main().catch(console.error);
