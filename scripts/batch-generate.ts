/**
 * Batch generation script for wall/floor color combos.
 * Hits the production /api/generate/photo endpoint for each combo × photo.
 *
 * Usage: npx tsx scripts/batch-generate.ts [--dry-run] [--concurrency 5]
 */

const BASE_URL = process.env.BASE_URL || "https://withfin.ch";
const ORG_SLUG = "stonemartin";
const FLOORPLAN_SLUG = "kinkade";
const SESSION_ID = "4c995bcd-d596-4d6d-8135-fadd5a0bb6f2";

// --- Wall colors (Common Wall Paint Color subcategory slug: "common-wall-paint") ---
const WALL_OPTIONS = [
  { name: "Delicate White", slug: "wall-delicate-white" },
  { name: "Willow Springs", slug: "wall-willow-springs" },
  { name: "Commercial White", slug: "wall-commercial-white" },
  { name: "Cold Foam", slug: "wall-cold-foam" },
  { name: "Focus", slug: "wall-focus" },
];

// --- Floor colors (Main Area Flooring Color subcategory slug: "main-area-flooring-color") ---
const FLOOR_OPTIONS = [
  { name: "Toasted Taupe", slug: "floor-color-polaris-toasted-taupe" },
  { name: "Sea Glass", slug: "floor-color-polaris-sea-glass" },
  { name: "Harbor", slug: "floor-color-mariner-harbor" },
  { name: "Marina", slug: "floor-color-polaris-marina" },
];

// --- Room photos ---
const PHOTOS = [
  { id: "4da09abb-72ad-4814-a628-9732e8147477", label: "Great Room", hasHardwood: true },
  { id: "9bbf9805-e3fe-4ff2-99bc-5ab4fe5fba30", label: "Fireplace", hasHardwood: true },
  { id: "76575756-eb64-4560-be1f-1a2deb67e995", label: "Primary Bedroom", hasHardwood: true },
  { id: "6c1e444f-1237-45ee-8bd8-2a6dec1d8bc3", label: "Kitchen", hasHardwood: true },
  { id: "062c55c3-0674-4a33-a7ef-ff28fab70360", label: "Vanity", hasHardwood: false },
  { id: "8613cb79-9d23-4570-afa0-f51c1176b204", label: "Shower", hasHardwood: false },
  { id: "eb4bf92b-3355-487d-a3d0-b1f43bc98b9b", label: "Bath & Closet", hasHardwood: false },
  { id: "4959509b-4885-4793-9c29-4c52ecfaeeb4", label: "Secondary Bedroom", hasHardwood: false },
];

// --- Base selections (Peau's current picks) ---
const BASE_SELECTIONS: Record<string, string> = {
  "range": "range-ge-gas-slide-in",
  "blinds": "blinds-add",
  "gas-stub": "gas-stub-no",
  "hose-bib": "hose-bib-no",
  "lighting": "lighting-satin-nickel-wh-2",
  "baseboard": "baseboard-5inch",
  "rain-head": "rain-head-no",
  "rear-door": "rear-door-standard",
  "adt-keypad": "adt-keypad-no",
  "backsplash": "bs-baker-herringbone-glacier",
  "dishwasher": "dishwasher-ge-included",
  "front-door": "front-door-georgia",
  "light-rail": "light-rail-no-upgrade",
  "spray-foam": "spray-foam-no",
  "trim-paint": "trim-commercial-white",
  "bedroom-fan": "bed-fan-brushed-nickel",
  "counter-top": "ct-granite-dallas-white",
  "toilet-seat": "toilet-seat-no",
  "wainscoting": "wainscoting-included",
  "accent-color": "accent-delicate-white",
  "adt-contract": "adt-contract-no",
  "adt-deadbolt": "adt-deadbolt-no",
  "adt-security": "adt-security-no",
  "bath-faucets": "bath-faucet-weller-bn",
  "carpet-color": "carpet-concrete",
  "kitchen-sink": "sink-single-bowl-stainless",
  "refrigerator": "refrigerator-none",
  "utility-sink": "utility-sink-no",
  "address-style": "address-5inch",
  "bath-hardware": "bath-hw-miraloma-sn",
  "ceiling-paint": "ceiling-commercial-white",
  "crown-options": "crown-included",
  "door-hardware": "door-hw-miraloma-sn",
  "shutter-style": "shutter-2bar",
  "smart-plugs-5": "smart-plugs-5-no",
  "great-room-fan": "gr-fan-4light-brushed-nickel",
  "kitchen-faucet": "faucet-pfirst-ss",
  "primary-shower": "pri-shower-omega-silver-square",
  "smart-plugs-10": "smart-plugs-10-no",
  "toilet-upgrade": "toilet-standard",
  "window-screens": "screens-no",
  "add-220v-outlet": "220v-no",
  "countertop-edge": "edge-no-upgrade",
  "pantry-shelving": "pantry-wire",
  "deako-5-switches": "deako-5-no",
  "fireplace-hearth": "hearth-wood",
  "fireplace-mantel": "mantel-regency",
  "floor-tile-color": "floor-tile-omega-silver",
  "secondary-shower": "sec-shower-omega-silver",
  "clean-air-upgrade": "clean-air-no",
  "common-wall-paint": "wall-delicate-white",
  "deako-15-switches": "deako-15-no",
  "deako-30-switches": "deako-30-no",
  "door-casing-color": "door-color-match-trim",
  "front-door-handle": "front-handle-match",
  "trash-can-cabinet": "trash-can-no-upgrade",
  "can-lights-primary": "cans-primary-no",
  "data-raised-outlet": "data-raised-no",
  "door-window-casing": "casing-481",
  "garage-door-keypad": "garage-keypad-no",
  "glass-cabinet-door": "glass-door-no-upgrade",
  "powder-room-vanity": "powder-pedestal",
  "additional-concrete": "concrete-no",
  "cable-outlet-raised": "cable-raised-no",
  "great-room-av-point": "av-point-no",
  "interior-door-style": "door-carrara",
  "primary-bath-vanity": "primary-vanity-no-upgrade",
  "data-standard-outlet": "data-std-add",
  "primary-bath-mirrors": "pri-mirror-49-gunmetal",
  "primary-shower-entry": "shower-entry-no",
  "cable-outlet-standard": "cable-std-no",
  "can-lights-additional": "cans-additional-no",
  "garage-utility-lights": "garage-lights-no",
  "kitchen-cabinet-color": "kitchen-cab-color-white",
  "laundry-room-cabinets": "laundry-no-cabinets",
  "outdoor-eave-lighting": "eave-lighting-no",
  "secondary-bath-mirrors": "sec-mirror-49-gunmetal",
  "secondary-bath-walk-in": "sec-bath-tub-combo",
  "under-cabinet-lighting": "under-cab-light-no",
  "wall-mount-hand-shower": "hand-shower-no",
  "bonus-room-stair-treads": "stair-hardwood",
  "fireplace-mantel-accent": "fp-accent-no",
  "fireplace-tile-surround": "fp-tile-marvel-statuario",
  "main-area-flooring-type": "flooring-type-7-lvp-standard",
  "primary-closet-shelving": "closet-wire",
  "kitchen-cabinet-hardware": "hw-sedona-pull-knob-satin-nickel",
  "main-area-flooring-color": "floor-color-polaris-toasted-taupe",
  "secondary-bath-steel-tub": "sec-tub-steel",
  "bathroom-cabinet-hardware": "bath-hw-sedona-satin-nickel",
  "cabinet-style-whole-house": "cabinet-style-fairmont",
  "data-elec-exterior-raised": "data-elec-ext-no",
  "data-elec-interior-raised": "data-elec-int-no",
  "electrical-outlets-raised": "outlets-raised-no-upgrade",
  "cable-elec-exterior-raised": "cable-elec-ext-no",
  "cable-elec-interior-raised": "cable-elec-int-no",
  "primary-bath-cabinet-color": "primary-bath-cab-white",
  "electrical-outlets-standard": "outlets-std-add",
  "kitchen-island-cabinet-color": "island-color-admiral-blue",
  "secondary-bath-cabinet-color": "secondary-bath-cab-white",
  "dedicated-garage-fridge-outlet": "garage-fridge-outlet-no",
};

// --- Types ---
interface Job {
  wall: typeof WALL_OPTIONS[number];
  floor: typeof FLOOR_OPTIONS[number];
  photo: typeof PHOTOS[number];
  comboLabel: string;
}

interface Result {
  comboLabel: string;
  photo: string;
  status: "success" | "cached" | "error";
  imageUrl?: string;
  error?: string;
  durationMs: number;
}

// --- Build job list ---
function buildJobs(): Job[] {
  const jobs: Job[] = [];
  for (const wall of WALL_OPTIONS) {
    for (const floor of FLOOR_OPTIONS) {
      const comboLabel = `${wall.name} + ${floor.name}`;
      for (const photo of PHOTOS) {
        jobs.push({ wall, floor, photo, comboLabel });
      }
    }
  }
  return jobs;
}

// --- Run a single generation ---
async function runJob(job: Job): Promise<Result> {
  const { wall, floor, photo, comboLabel } = job;
  const selections = {
    ...BASE_SELECTIONS,
    "common-wall-paint": wall.slug,
    "main-area-flooring-color": floor.slug,
  };

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300_000); // 5 min timeout
    const res = await fetch(`${BASE_URL}/api/generate/photo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgSlug: ORG_SLUG,
        floorplanSlug: FLOORPLAN_SLUG,
        stepPhotoId: photo.id,
        selections,
        sessionId: SESSION_ID,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await res.json();
    const durationMs = Date.now() - start;

    if (!res.ok) {
      // 429 = already generating (join-in-progress), wait and retry once
      if (res.status === 429 && data.error !== "cap_reached") {
        console.log(`  ⏳ ${photo.label} in progress, waiting 30s to retry...`);
        await sleep(30_000);
        return runJob(job);
      }
      return { comboLabel, photo: photo.label, status: "error", error: `${res.status}: ${data.error}`, durationMs };
    }

    return {
      comboLabel,
      photo: photo.label,
      status: data.cacheHit ? "cached" : "success",
      imageUrl: data.imageUrl,
      durationMs,
    };
  } catch (err) {
    return {
      comboLabel,
      photo: photo.label,
      status: "error",
      error: String(err),
      durationMs: Date.now() - start,
    };
  }
}

// --- Concurrency limiter ---
async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Main ---
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const concurrencyIdx = args.indexOf("--concurrency");
  const concurrency = concurrencyIdx !== -1 ? parseInt(args[concurrencyIdx + 1], 10) : 3;

  const jobs = buildJobs();
  const combos = WALL_OPTIONS.length * FLOOR_OPTIONS.length;

  console.log(`\n🏠 Batch Generation: ${WALL_OPTIONS.length} walls × ${FLOOR_OPTIONS.length} floors = ${combos} combos`);
  console.log(`📸 ${PHOTOS.length} photos per combo = ${jobs.length} total generations`);
  console.log(`⚡ Concurrency: ${concurrency}`);
  console.log(`🌐 Target: ${BASE_URL}`);
  console.log(`👤 Session: ${SESSION_ID}\n`);

  if (dryRun) {
    console.log("DRY RUN — listing all jobs:\n");
    for (const job of jobs) {
      console.log(`  ${job.comboLabel} → ${job.photo.label}`);
    }
    console.log(`\nTotal: ${jobs.length} jobs`);
    return;
  }

  const startTime = Date.now();
  let completed = 0;
  let cached = 0;
  let errors = 0;

  const tasks = jobs.map((job) => async () => {
    const result = await runJob(job);
    completed++;

    const icon = result.status === "cached" ? "💾" : result.status === "success" ? "✅" : "❌";
    if (result.status === "cached") cached++;
    if (result.status === "error") errors++;

    const progress = `[${completed}/${jobs.length}]`;
    const duration = `${(result.durationMs / 1000).toFixed(1)}s`;
    console.log(`${progress} ${icon} ${result.comboLabel} → ${result.photo} (${duration})${result.error ? ` — ${result.error}` : ""}`);

    return result;
  });

  const results = await runWithConcurrency(tasks, concurrency);

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const generated = results.filter((r) => r.status === "success").length;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Done in ${totalTime} min`);
  console.log(`  ✅ Generated: ${generated}`);
  console.log(`  💾 Cached: ${cached}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log(`  📊 Total: ${completed}/${jobs.length}`);
}

main().catch(console.error);
