/**
 * Test multi-pass on remaining 6 rooms — one combo each
 * Usage: npx tsx scripts/test-remaining-rooms-multipass.ts
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:3003";

const PHOTOS = [
  {
    label: "Lenox Living Room",
    orgSlug: "stonemartin", floorplanSlug: "lenox",
    sessionId: "cfd329b3-b169-4edb-b058-b5639dc32db7",
    stepPhotoId: "4009c8ab-ba66-4852-9e98-9e02a5f3b820",
    selections: {
      "common-wall-paint": "wall-shark", "ceiling-paint": "ceiling-commercial-white",
      "trim-paint": "trim-commercial-white", "baseboard": "baseboard-7inch",
      "crown-options": "crown-upgrade", "main-area-flooring-type": "flooring-type-7-hardwood-standard",
      "main-area-flooring-color": "floor-color-mariner-harbor",
      "fireplace-mantel": "mantel-craftsman", "fireplace-hearth": "hearth-brick",
      "fireplace-tile-surround": "fp-tile-marvel-statuario",
      "great-room-fan": "gr-fan-4light-black", "lighting": "lighting-black-wh",
    },
  },
  {
    label: "Lenox Entryway",
    orgSlug: "stonemartin", floorplanSlug: "lenox",
    sessionId: "cfd329b3-b169-4edb-b058-b5639dc32db7",
    stepPhotoId: "3fbd8070-46b1-473b-9b5c-d8d0db20a0d7",
    selections: {
      "common-wall-paint": "wall-fog", "trim-paint": "trim-commercial-white",
      "baseboard": "baseboard-7inch", "crown-options": "crown-upgrade",
      "wainscoting": "wainscoting-included",
      "main-area-flooring-type": "flooring-type-7-hardwood-standard",
      "main-area-flooring-color": "floor-color-mariner-voyage",
      "door-casing-color": "door-color-match-trim", "front-door": "front-door-georgia",
    },
  },
  {
    label: "Lenox Dining Room",
    orgSlug: "stonemartin", floorplanSlug: "lenox",
    sessionId: "cfd329b3-b169-4edb-b058-b5639dc32db7",
    stepPhotoId: "0cde67b0-d76d-4190-b131-00b587796fbc",
    selections: {
      "common-wall-paint": "wall-cold-foam", "ceiling-paint": "ceiling-commercial-white",
      "trim-paint": "trim-commercial-white", "baseboard": "baseboard-7inch",
      "crown-options": "crown-upgrade", "main-area-flooring-type": "flooring-type-9-lvp-standard",
      "main-area-flooring-color": "floor-color-homestead-cabriole-brown",
      "lighting": "lighting-designer-brushed-gold-wh",
      "interior-door-style": "door-winslow", "door-casing-color": "door-color-match-trim",
    },
  },
  {
    label: "Lenox Kitchen & Dining",
    orgSlug: "stonemartin", floorplanSlug: "lenox",
    sessionId: "cfd329b3-b169-4edb-b058-b5639dc32db7",
    stepPhotoId: "c6dc7f72-6f23-4546-8f5b-539963743976",
    selections: {
      "counter-top": "ct-quartz-calacatta-venice", "countertop-edge": "edge-ogee",
      "backsplash": "bs-baker-4x16-carbon", "kitchen-cabinet-color": "kitchen-cab-color-onyx",
      "kitchen-island-cabinet-color": "island-color-white",
      "kitchen-cabinet-hardware": "hw-key-grande-all-pulls-brushed-gold",
      "kitchen-sink": "sink-fireclay-farmhouse", "kitchen-faucet": "faucet-stellen-gold",
      "dishwasher": "dishwasher-ge-included", "range": "range-ge-included-freestanding",
      "refrigerator": "refrigerator-none", "cabinet-style-whole-house": "cabinet-style-oxford",
      "main-area-flooring-type": "flooring-type-7-hardwood-standard",
      "main-area-flooring-color": "floor-color-mariner-harbor",
      "common-wall-paint": "wall-delicate-white", "lighting": "lighting-brushed-gold-wh",
    },
  },
  {
    label: "Kinkade Great Room",
    orgSlug: "stonemartin", floorplanSlug: "kinkade",
    sessionId: "4c995bcd-d596-4d6d-8135-fadd5a0bb6f2",
    stepPhotoId: "4da09abb-72ad-4814-a628-9732e8147477",
    selections: {
      "common-wall-paint": "wall-fog", "ceiling-paint": "ceiling-commercial-white",
      "trim-paint": "trim-commercial-white", "baseboard": "baseboard-7inch",
      "crown-options": "crown-upgrade", "door-casing-color": "door-color-match-trim",
      "main-area-flooring-type": "flooring-type-7-hardwood-standard",
      "main-area-flooring-color": "floor-color-mariner-voyage",
      "wainscoting": "wainscoting-included", "fireplace-hearth": "hearth-brick",
      "cabinet-style-whole-house": "cabinet-style-oxford",
      "lighting": "lighting-designer-black-wh", "great-room-fan": "gr-fan-4light-black",
      "interior-door-style": "door-winslow",
      "kitchen-cabinet-color": "kitchen-cab-color-onyx",
      "kitchen-island-cabinet-color": "island-color-admiral-blue",
      "counter-top": "ct-quartz-calacatta-venice",
      "kitchen-cabinet-hardware": "hw-stanton-all-pulls-black",
      "kitchen-faucet": "faucet-stellen-black", "kitchen-sink": "sink-single-bowl-stainless",
      "backsplash": "bs-baker-herringbone-glacier",
    },
  },
  {
    label: "Kinkade Fireplace",
    orgSlug: "stonemartin", floorplanSlug: "kinkade",
    sessionId: "4c995bcd-d596-4d6d-8135-fadd5a0bb6f2",
    stepPhotoId: "9bbf9805-e3fe-4ff2-99bc-5ab4fe5fba30",
    selections: {
      "common-wall-paint": "wall-cold-foam", "ceiling-paint": "ceiling-commercial-white",
      "trim-paint": "trim-commercial-white", "baseboard": "baseboard-7inch",
      "crown-options": "crown-upgrade", "door-casing-color": "door-color-match-trim",
      "main-area-flooring-type": "flooring-type-7-hardwood-standard",
      "main-area-flooring-color": "floor-color-mariner-harbor",
      "wainscoting": "wainscoting-included",
      "fireplace-mantel": "mantel-craftsman",
      "fireplace-mantel-accent": "fp-accent-no",
      "fireplace-hearth": "hearth-stone",
      "fireplace-tile-surround": "fp-tile-marvel-statuario",
      "lighting": "lighting-designer-brushed-gold-wh",
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
  console.log(`Testing remaining 6 rooms`);
  await Promise.all(PHOTOS.map(p => runPhoto(p)));
  console.log("\nDone.");
}
main().catch(console.error);
