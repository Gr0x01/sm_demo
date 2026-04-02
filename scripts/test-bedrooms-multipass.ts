/**
 * Test multi-pass on all 4 bedrooms — one dramatic combo each
 * Usage: npx tsx scripts/test-bedrooms-multipass.ts
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:3003";

const PHOTOS = [
  {
    label: "Lenox Primary Bedroom",
    orgSlug: "stonemartin", floorplanSlug: "lenox",
    sessionId: "cfd329b3-b169-4edb-b058-b5639dc32db7",
    stepPhotoId: "37ef4ca5-f5c9-41ad-aa29-e29f62424956",
    selections: {
      "common-wall-paint": "wall-shark",
      "accent-color": "accent-delicate-white",
      "ceiling-paint": "ceiling-commercial-white",
      "trim-paint": "trim-commercial-white",
      "baseboard": "baseboard-7inch",
      "crown-options": "crown-upgrade",
      "carpet-color": "carpet-concrete",
      "main-area-flooring-type": "flooring-type-7-lvp-standard",
      "main-area-flooring-color": "floor-color-polaris-toasted-taupe",
      "bedroom-fan": "bed-fan-black",
      "interior-door-style": "door-carrara",
      "door-casing-color": "door-color-match-trim",
      "floor-tile-color": "floor-tile-omega-bone",
      "primary-bath-cabinet-color": "primary-bath-cab-driftwood",
    },
  },
  {
    label: "Lenox Secondary Bedroom",
    orgSlug: "stonemartin", floorplanSlug: "lenox",
    sessionId: "cfd329b3-b169-4edb-b058-b5639dc32db7",
    stepPhotoId: "83182c53-f3c0-4e14-8903-3aff1db77f62",
    selections: {
      "carpet-color": "carpet-ecru",
      "main-area-flooring-type": "flooring-type-7-lvp-standard",
      "main-area-flooring-color": "floor-color-polaris-toasted-taupe",
      "common-wall-paint": "wall-fog",
      "ceiling-paint": "ceiling-commercial-white",
      "trim-paint": "trim-commercial-white",
      "baseboard": "baseboard-7inch",
      "crown-options": "crown-upgrade",
      "bedroom-fan": "bed-fan-bronze",
    },
  },
  {
    label: "Kinkade Primary Bedroom",
    orgSlug: "stonemartin", floorplanSlug: "kinkade",
    sessionId: "4c995bcd-d596-4d6d-8135-fadd5a0bb6f2",
    stepPhotoId: "76575756-eb64-4560-be1f-1a2deb67e995",
    selections: {
      "common-wall-paint": "wall-cold-foam",
      "accent-color": "accent-shark",
      "ceiling-paint": "ceiling-commercial-white",
      "trim-paint": "trim-commercial-white",
      "baseboard": "baseboard-7inch",
      "crown-options": "crown-upgrade",
      "door-casing-color": "door-color-match-trim",
      "main-area-flooring-type": "flooring-type-7-hardwood-primary",
      "main-area-flooring-color": "floor-color-mariner-harbor",
      "carpet-color": "carpet-concrete",
      "bedroom-fan": "bed-fan-brushed-gold",
      "interior-door-style": "door-winslow",
    },
  },
  {
    label: "Kinkade Secondary Bedroom",
    orgSlug: "stonemartin", floorplanSlug: "kinkade",
    sessionId: "4c995bcd-d596-4d6d-8135-fadd5a0bb6f2",
    stepPhotoId: "4959509b-4885-4793-9c29-4c52ecfaeeb4",
    selections: {
      "carpet-color": "carpet-whisper",
      "main-area-flooring-type": "flooring-type-7-lvp-standard",
      "main-area-flooring-color": "floor-color-polaris-sea-glass",
      "common-wall-paint": "wall-maiden-mist",
      "ceiling-paint": "ceiling-commercial-white",
      "trim-paint": "trim-commercial-white",
      "baseboard": "baseboard-7inch",
      "door-casing-color": "door-color-match-trim",
      "crown-options": "crown-upgrade",
      "bedroom-fan": "bed-fan-white",
      "door-hardware": "door-hw-lombard-sn",
    },
  },
];

async function runPhoto(photo: typeof PHOTOS[0]): Promise<void> {
  console.log(`\n${"=".repeat(70)}\n${photo.label}\n${"=".repeat(70)}`);
  const startTime = Date.now();
  const genRes = await fetch(`${BASE_URL}/api/generate/photo`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgSlug: photo.orgSlug, floorplanSlug: photo.floorplanSlug, stepPhotoId: photo.stepPhotoId, sessionId: photo.sessionId, selections: photo.selections }),
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
  console.log(`Testing all 4 bedrooms`);
  // Run all 4 in parallel
  await Promise.all(PHOTOS.map(p => runPhoto(p)));
  console.log("\nDone.");
}
main().catch(console.error);
