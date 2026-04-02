/**
 * Test multi-pass pipeline on Lenox Secondary Bath (ac301d08-cf8f-44b5-afa6-377a2b777e59)
 *
 * Usage: npx tsx scripts/test-lenox-secondary-bath-multipass.ts [--dry-run] [--combo N]
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3003";
const ORG_SLUG = "stonemartin";
const FLOORPLAN_SLUG = "lenox";
const SESSION_ID = "cfd329b3-b169-4edb-b058-b5639dc32db7";
const STEP_PHOTO_ID = "ac301d08-cf8f-44b5-afa6-377a2b777e59";

const DEFAULTS: Record<string, string> = {
  "secondary-bath-cabinet-color": "secondary-bath-cab-driftwood",
  "bathroom-cabinet-hardware": "bath-hw-seaver-bronze",
  "secondary-bath-mirrors": "sec-mirror-49-gunmetal",
  "secondary-shower": "sec-shower-omega-bone",
  "floor-tile-color": "floor-tile-omega-bone",
  "secondary-bath-steel-tub": "sec-tub-fiberglass",
  "secondary-bath-walk-in": "sec-bath-tub-combo",
  "bath-faucets": "bath-faucet-weller-bn",
  "bath-hardware": "bath-hw-miraloma-sn",
  "common-wall-paint": "wall-whiskers",
  "trim-paint": "trim-cold-foam",
  "baseboard": "baseboard-5inch",
  "door-casing-color": "door-color-match-trim",
  "interior-door-style": "door-carrara",
  "door-hardware": "door-hw-miraloma-sn",
};

interface TestCombo {
  name: string;
  description: string;
  selections: Record<string, string>;
}

const COMBOS: TestCombo[] = [
  {
    name: "1-defaults",
    description: "All defaults — Driftwood vanity, bone tile, brushed nickel everything, fiberglass tub",
    selections: { ...DEFAULTS },
  },
  {
    name: "2-dark-vanity",
    description: "Onyx vanity + dark grey tile + matte black fixtures + dark wall paint",
    selections: {
      ...DEFAULTS,
      "secondary-bath-cabinet-color": "secondary-bath-cab-onyx",
      "floor-tile-color": "floor-tile-onyx-dark-grey",
      "bath-faucets": "bath-faucet-weller-black",
      "bath-hardware": "bath-hw-miraloma-black",
      "bathroom-cabinet-hardware": "bath-hw-sedona-black",
      "door-hardware": "door-hw-miraloma-black",
      "common-wall-paint": "wall-fog",
    },
  },
  {
    name: "3-blue-vanity",
    description: "Admiral Blue vanity + calacatta tile + gold faucet + white walls",
    selections: {
      ...DEFAULTS,
      "secondary-bath-cabinet-color": "secondary-bath-cab-admiral-blue",
      "floor-tile-color": "floor-tile-infinity-calacatta",
      "bath-faucets": "bath-faucet-holliston-gold",
      "bath-hardware": "bath-hw-tiburon-brass",
      "common-wall-paint": "wall-delicate-white",
    },
  },
];

async function runCombo(combo: TestCombo, dryRun: boolean): Promise<void> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`COMBO: ${combo.name}`);
  console.log(`  ${combo.description}`);
  console.log(`${"=".repeat(70)}`);

  if (dryRun) {
    console.log("  [DRY RUN]");
    return;
  }

  const startTime = Date.now();
  const genRes = await fetch(`${BASE_URL}/api/generate/photo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orgSlug: ORG_SLUG, floorplanSlug: FLOORPLAN_SLUG,
      stepPhotoId: STEP_PHOTO_ID, sessionId: SESSION_ID,
      selections: combo.selections,
    }),
  });
  const genData = await genRes.json();

  if (genRes.status === 200 && genData.cacheHit) {
    console.log(`  CACHE HIT in ${Date.now() - startTime}ms`);
    console.log(`  ${genData.imageUrl}`);
    return;
  }
  if (genRes.status !== 202) {
    console.error(`  FAILED: ${genRes.status}`, genData);
    return;
  }

  const { selectionsHash } = genData;
  console.log(`  Dispatched: ${selectionsHash}`);

  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, i < 10 ? 1500 : 3000));
    const checkRes = await fetch(`${BASE_URL}/api/generate/photo/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectionsHash }),
    });
    if (checkRes.status === 200) {
      const d = await checkRes.json();
      if (d.status === "complete" && d.imageUrl) {
        console.log(`  DONE in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
        console.log(`  ${d.imageUrl}`);
        return;
      }
      if (d.status === "not_found") {
        console.error(`  FAILED (not_found)`);
        return;
      }
    }
  }
  console.error(`  TIMED OUT after ${((Date.now() - startTime) / 1000).toFixed(0)}s`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const comboArg = args.find(a => a.startsWith("--combo"));
  const comboIdx = comboArg ? parseInt(args[args.indexOf(comboArg) + 1]) : null;
  const combos = comboIdx !== null ? COMBOS.filter((_, i) => i + 1 === comboIdx) : COMBOS;

  console.log(`Testing Lenox Secondary Bath — ${combos.length} combo(s)${dryRun ? " (DRY RUN)" : ""}`);
  for (const c of combos) await runCombo(c, dryRun);
  console.log("\nDone.");
}

main().catch(console.error);
