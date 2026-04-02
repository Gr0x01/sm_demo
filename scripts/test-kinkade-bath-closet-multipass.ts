/**
 * Test multi-pass pipeline on Kinkade Bath & Closet (eb4bf92b-3355-487d-a3d0-b1f43bc98b9b)
 *
 * Usage: npx tsx scripts/test-kinkade-bath-closet-multipass.ts [--dry-run] [--combo N]
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3003";
const ORG_SLUG = "stonemartin";
const FLOORPLAN_SLUG = "kinkade";
const SESSION_ID = "4c995bcd-d596-4d6d-8135-fadd5a0bb6f2";
const STEP_PHOTO_ID = "eb4bf92b-3355-487d-a3d0-b1f43bc98b9b";

const DEFAULTS: Record<string, string> = {
  "primary-bath-vanity": "primary-vanity-no-upgrade",
  "primary-bath-cabinet-color": "primary-bath-cab-driftwood",
  "bathroom-cabinet-hardware": "bath-hw-seaver-bronze",
  "primary-bath-mirrors": "pri-mirror-49-gunmetal",
  "floor-tile-color": "floor-tile-omega-bone",
  "bath-faucets": "bath-faucet-weller-bn",
  "bath-hardware": "bath-hw-miraloma-sn",
  "primary-closet-shelving": "closet-wire",
  "carpet-color": "carpet-soft-taupe",
  "main-area-flooring-type": "flooring-type-7-lvp-standard",
  "main-area-flooring-color": "floor-color-polaris-toasted-taupe",
  "common-wall-paint": "wall-whiskers",
  "accent-color": "accent-shark",
};

interface TestCombo {
  name: string;
  description: string;
  selections: Record<string, string>;
}

const COMBOS: TestCombo[] = [
  {
    name: "1-defaults",
    description: "All defaults — Driftwood vanity, bone tile, brushed nickel, wire closet",
    selections: { ...DEFAULTS },
  },
  {
    name: "2-dark-vanity-hardwood",
    description: "Onyx vanity + dark grey tile + black fixtures + hardwood in closet",
    selections: {
      ...DEFAULTS,
      "primary-bath-cabinet-color": "primary-bath-cab-onyx",
      "floor-tile-color": "floor-tile-onyx-dark-grey",
      "bath-faucets": "bath-faucet-weller-black",
      "bath-hardware": "bath-hw-miraloma-black",
      "bathroom-cabinet-hardware": "bath-hw-sedona-black",
      "main-area-flooring-type": "flooring-type-7-hardwood-standard",
      "main-area-flooring-color": "floor-color-mariner-harbor",
      "common-wall-paint": "wall-fog",
    },
  },
  {
    name: "3-blue-vanity-accent",
    description: "Admiral Blue vanity + calacatta tile + gold fixtures + accent wall",
    selections: {
      ...DEFAULTS,
      "primary-bath-cabinet-color": "primary-bath-cab-admiral-blue",
      "floor-tile-color": "floor-tile-infinity-calacatta",
      "bath-faucets": "bath-faucet-holliston-gold",
      "bath-hardware": "bath-hw-tiburon-brass",
      "accent-color": "accent-delicate-white",
      "common-wall-paint": "wall-cold-foam",
    },
  },
];

async function runCombo(combo: TestCombo, dryRun: boolean): Promise<void> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`COMBO: ${combo.name}`);
  console.log(`  ${combo.description}`);
  console.log(`${"=".repeat(70)}`);

  if (dryRun) { console.log("  [DRY RUN]"); return; }

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
      if (d.status === "not_found") { console.error(`  FAILED (not_found)`); return; }
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

  console.log(`Testing Kinkade Bath & Closet — ${combos.length} combo(s)${dryRun ? " (DRY RUN)" : ""}`);
  for (const c of combos) await runCombo(c, dryRun);
  console.log("\nDone.");
}

main().catch(console.error);
