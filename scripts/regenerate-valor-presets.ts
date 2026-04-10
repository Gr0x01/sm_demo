/**
 * Regenerate the 3 Valor prospect demo presets (Standard / Mid-Range / Premium)
 * against production. Used after cache busts to warm the Loom-recording cache.
 *
 * Usage: npx tsx scripts/regenerate-valor-presets.ts [--base-url https://withfin.ch]
 */

const BASE_URL = process.env.BASE_URL
  || (process.argv.includes("--base-url") ? process.argv[process.argv.indexOf("--base-url") + 1] : "https://withfin.ch");

const ORG_SLUG = "demo";
const ORG_ID = "0d255878-9268-468a-b9e2-95b7552b6126";
const FLOORPLAN_SLUG = "valor";
const FLOORPLAN_ID = "0efa6053-96cd-478f-8809-4f4e57ae8ef4";
const KITCHEN_STEP_PHOTO_ID = "a9266d4d-07e9-4e64-abe5-eebd8d6e0ca9";

const PRESETS: { label: string; selections: Record<string, string> }[] = [
  {
    label: "Standard",
    selections: {
      "kitchen-cabinet-color": "kitchen-cab-color-white",
      "kitchen-island-cabinet-color": "island-color-white",
      "counter-top": "ct-granite-dallas-white",
      "backsplash": "bs-baker-4x12-bev-white",
      "main-area-flooring-color": "floor-color-polaris-toasted-taupe",
    },
  },
  {
    label: "Mid-Range",
    selections: {
      "kitchen-cabinet-color": "kitchen-cab-color-white",
      "kitchen-island-cabinet-color": "island-color-admiral-blue",
      "counter-top": "ct-quartz-lace-white",
      "backsplash": "bs-baker-4x16-glacier",
      "main-area-flooring-color": "floor-color-polaris-wild-dunes",
    },
  },
  {
    label: "Premium",
    selections: {
      "kitchen-cabinet-color": "kitchen-cab-color-fog",
      "kitchen-island-cabinet-color": "island-color-onyx",
      "counter-top": "ct-quartz-calacatta-venice",
      "backsplash": "bs-herringbone-white",
      "main-area-flooring-color": "floor-color-delray-lowtide",
    },
  },
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createSession(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/buyer-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ org_id: ORG_ID, floorplan_id: FLOORPLAN_ID }),
  });
  if (!res.ok) throw new Error(`Session create failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.sessionId;
}

async function pollUntilComplete(selectionsHash: string, label: string): Promise<{ imageUrl?: string; status: string }> {
  const deadline = Date.now() + 5 * 60 * 1000;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt++;
    const res = await fetch(`${BASE_URL}/api/generate/photo/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectionsHash }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === "complete" && data.imageUrl) return { status: "complete", imageUrl: data.imageUrl };
      if (data.status === "failed") return { status: "failed" };
    }
    if (attempt % 10 === 0) console.log(`    [${label}] still waiting (${attempt * 3}s)...`);
    await sleep(3000);
  }
  return { status: "timeout" };
}

async function runPreset(sessionId: string, preset: typeof PRESETS[number]) {
  console.log(`\n▶ ${preset.label}`);
  const start = Date.now();

  const res = await fetch(`${BASE_URL}/api/generate/photo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orgSlug: ORG_SLUG,
      floorplanSlug: FLOORPLAN_SLUG,
      stepPhotoId: KITCHEN_STEP_PHOTO_ID,
      selections: preset.selections,
      sessionId,
      retry: true, // force Max full gen, bypass any lingering scoped-edit diff cache
    }),
  });

  const data = await res.json();

  if (res.status === 200 && data.imageUrl) {
    const dur = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ✅ ${preset.label} cached hit (${dur}s) — ${data.imageUrl}`);
    return;
  }

  if (res.status === 202 || res.status === 429) {
    if (!data.selectionsHash) {
      console.error(`  ❌ ${preset.label} missing selectionsHash in ${res.status} response:`, data);
      return;
    }
    const result = await pollUntilComplete(data.selectionsHash, preset.label);
    const dur = ((Date.now() - start) / 1000).toFixed(1);
    if (result.status === "complete") {
      console.log(`  ✅ ${preset.label} generated (${dur}s) — ${result.imageUrl}`);
    } else {
      console.error(`  ❌ ${preset.label} ${result.status} after ${dur}s`);
    }
    return;
  }

  console.error(`  ❌ ${preset.label} failed:`, res.status, data);
}

async function main() {
  console.log(`🏠 Regenerating 3 Valor presets on ${BASE_URL}`);

  const sessionId = await createSession();
  console.log(`Session: ${sessionId}`);

  for (const preset of PRESETS) {
    await runPreset(sessionId, preset);
  }

  console.log(`\nDone.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
