/**
 * Test multi-pass on Kinkade Vanity (062c55c3-0674-4a33-a7ef-ff28fab70360)
 * Usage: npx tsx scripts/test-kinkade-vanity-multipass.ts [--combo N]
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:3003";
const ORG_SLUG = "stonemartin";
const FLOORPLAN_SLUG = "kinkade";
const SESSION_ID = "4c995bcd-d596-4d6d-8135-fadd5a0bb6f2";
const STEP_PHOTO_ID = "062c55c3-0674-4a33-a7ef-ff28fab70360";

const DEFAULTS: Record<string, string> = {
  "primary-bath-vanity": "primary-vanity-no-upgrade",
  "primary-bath-cabinet-color": "primary-bath-cab-driftwood",
  "bathroom-cabinet-hardware": "bath-hw-seaver-bronze",
  "primary-bath-mirrors": "pri-mirror-49-gunmetal",
  "floor-tile-color": "floor-tile-omega-bone",
  "bath-faucets": "bath-faucet-weller-bn",
  "bath-hardware": "bath-hw-miraloma-sn",
  "common-wall-paint": "wall-whiskers",
  "accent-color": "accent-shark",
};

const COMBOS = [
  { name: "1-defaults", description: "All defaults", selections: { ...DEFAULTS } },
  {
    name: "2-dark",
    description: "Onyx vanity + dark tile + black fixtures",
    selections: { ...DEFAULTS, "primary-bath-cabinet-color": "primary-bath-cab-onyx", "floor-tile-color": "floor-tile-onyx-dark-grey", "bath-faucets": "bath-faucet-weller-black", "bath-hardware": "bath-hw-miraloma-black", "bathroom-cabinet-hardware": "bath-hw-sedona-black", "common-wall-paint": "wall-fog" },
  },
  {
    name: "3-blue-gold",
    description: "Admiral Blue vanity + calacatta tile + gold fixtures",
    selections: { ...DEFAULTS, "primary-bath-cabinet-color": "primary-bath-cab-admiral-blue", "floor-tile-color": "floor-tile-infinity-calacatta", "bath-faucets": "bath-faucet-holliston-gold", "bath-hardware": "bath-hw-tiburon-brass", "common-wall-paint": "wall-delicate-white" },
  },
];

async function runCombo(combo: typeof COMBOS[0]): Promise<void> {
  console.log(`\n${"=".repeat(70)}\nCOMBO: ${combo.name}\n  ${combo.description}\n${"=".repeat(70)}`);
  const startTime = Date.now();
  const genRes = await fetch(`${BASE_URL}/api/generate/photo`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgSlug: ORG_SLUG, floorplanSlug: FLOORPLAN_SLUG, stepPhotoId: STEP_PHOTO_ID, sessionId: SESSION_ID, selections: combo.selections }),
  });
  const genData = await genRes.json();
  if (genRes.status === 200 && genData.cacheHit) { console.log(`  CACHE HIT\n  ${genData.imageUrl}`); return; }
  if (genRes.status !== 202) { console.error(`  FAILED: ${genRes.status}`, genData); return; }
  const { selectionsHash } = genData;
  console.log(`  Dispatched: ${selectionsHash}`);
  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, i < 10 ? 1500 : 3000));
    const d = await (await fetch(`${BASE_URL}/api/generate/photo/check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selectionsHash }) })).json();
    if (d.status === "complete" && d.imageUrl) { console.log(`  DONE in ${((Date.now() - startTime) / 1000).toFixed(1)}s\n  ${d.imageUrl}`); return; }
    if (d.status === "not_found") { console.error(`  FAILED (not_found)`); return; }
  }
  console.error(`  TIMED OUT`);
}

async function main() {
  const args = process.argv.slice(2);
  const comboArg = args.find(a => a.startsWith("--combo"));
  const comboIdx = comboArg ? parseInt(args[args.indexOf(comboArg) + 1]) : null;
  const combos = comboIdx !== null ? COMBOS.filter((_, i) => i + 1 === comboIdx) : COMBOS;
  console.log(`Testing Kinkade Vanity — ${combos.length} combo(s)`);
  for (const c of combos) await runCombo(c);
  console.log("\nDone.");
}
main().catch(console.error);
