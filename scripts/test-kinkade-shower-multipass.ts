/**
 * Test multi-pass on Kinkade Shower (8613cb79-9d23-4570-afa0-f51c1176b204)
 * Usage: npx tsx scripts/test-kinkade-shower-multipass.ts [--combo N]
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:3003";
const ORG_SLUG = "stonemartin";
const FLOORPLAN_SLUG = "kinkade";
const SESSION_ID = "4c995bcd-d596-4d6d-8135-fadd5a0bb6f2";
const STEP_PHOTO_ID = "8613cb79-9d23-4570-afa0-f51c1176b204";

const DEFAULTS: Record<string, string> = {
  "primary-shower": "pri-shower-omega-bone-square",
  "primary-shower-entry": "shower-entry-no",
  "rain-head": "rain-head-no",
  "wall-mount-hand-shower": "hand-shower-no",
  "floor-tile-color": "floor-tile-omega-bone",
  "common-wall-paint": "wall-whiskers",
  "accent-color": "accent-shark",
};

const COMBOS = [
  { name: "1-defaults", description: "All defaults — bone tile, no rain head", selections: { ...DEFAULTS } },
  {
    name: "2-dark-tile",
    description: "Dark grey tile + silver shower mosaic + fog walls",
    selections: { ...DEFAULTS, "floor-tile-color": "floor-tile-onyx-dark-grey", "primary-shower": "pri-shower-omega-silver-square", "common-wall-paint": "wall-fog" },
  },
  {
    name: "3-calacatta",
    description: "Calacatta tile + calacatta shower + white walls",
    selections: { ...DEFAULTS, "floor-tile-color": "floor-tile-infinity-calacatta", "primary-shower": "pri-shower-infinity-calacatta", "common-wall-paint": "wall-delicate-white" },
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
  console.log(`Testing Kinkade Shower — ${combos.length} combo(s)`);
  for (const c of combos) await runCombo(c);
  console.log("\nDone.");
}
main().catch(console.error);
