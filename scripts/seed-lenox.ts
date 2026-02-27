/**
 * Seed script: creates the Lenox floorplan for Stone Martin by duplicating Kinkade,
 * uploads actual Lenox room photos with full AI generation metadata,
 * seeds generation policies, and sets per-floorplan pricing overrides.
 *
 * Usage:
 *   npx tsx scripts/seed-lenox.ts
 *
 * Prerequisites:
 *   - option_floorplan_pricing table must exist (run migration first)
 *   - Stone Martin org + Kinkade floorplan must exist
 *   - Lenox photos in tmp/Lenox/
 *
 * Idempotent: skips floorplan creation if "lenox" slug already exists,
 * but always re-uploads photos and re-seeds policies.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ---------- Supabase client ----------

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key);

const SM_ORG_SLUG = "stonemartin";
const KINKADE_SLUG = "kinkade";
const LENOX_SLUG = "lenox";
const LENOX_NAME = "Lenox";
const PHOTO_DIR = path.resolve(__dirname, "../tmp/Lenox");

// ---------- Lenox photo definitions ----------

type LenoxPhotoDef = {
  stepSlug: string;
  file: string;
  label: string;
  isHero: boolean;
  sortOrder: number;
  spatialHint: string;
  photoBaseline: string;
  scopeSlugs: string[];
};

const LENOX_PHOTOS: LenoxPhotoDef[] = [
  // ── Set Your Style ──
  {
    stepSlug: "set-your-style",
    file: "Lenox-Living_Room.webp",
    label: "Living Room",
    isHero: true,
    sortOrder: 0,
    spatialHint:
      "Open living room viewed from the left side toward the back-right corner. Vaulted ceiling with exposed white beams; ceiling fan hangs from the peak. " +
      "The BACK WALL (far wall) has two zones: smooth painted drywall on the lower-left portion (beside a half-wall pass-through opening), and the fireplace assembly (white mantel surround with picture-frame panel, white brick hearth) on the right portion. " +
      "A window is on the RIGHT WALL immediately beside the fireplace corner. The LEFT WALL is also smooth painted drywall. " +
      "LVP flooring covers the entire floor. Crown molding lines the ceiling edges. White baseboard runs along all walls.",
    photoBaseline:
      "Vaulted great room with white beam ceiling, brushed-nickel ceiling fan, warm-toned LVP flooring, light greige walls. " +
      "Smooth painted drywall on the lower-left portion of the back wall; white fireplace mantel with white brick surround on the right portion of the back wall. " +
      "Window on the right wall beside the fireplace. Recessed lights throughout.",
    scopeSlugs: [
      "common-wall-paint", "ceiling-paint", "trim-paint", "baseboard", "crown-options",
      "main-area-flooring-type", "main-area-flooring-color",
      "fireplace-mantel", "fireplace-mantel-accent", "fireplace-hearth", "fireplace-tile-surround",
      "great-room-fan", "lighting",
    ],
  },
  {
    stepSlug: "set-your-style",
    file: "Lenox-Entryway.webp",
    label: "Entryway",
    isHero: false,
    sortOrder: 1,
    spatialHint:
      "Narrow foyer hallway looking toward the front door. Tall shaker-style wainscoting panels (from an upgrade option) cover both side walls up to roughly chest height. " +
      "Crown molding runs along the ceiling. LVP flooring runs the length of the hallway. The front door with three glass panes is centered at the far end. " +
      "A sidelight window is on the right wall near the door. White baseboard at the floor line.",
    photoBaseline:
      "Narrow entry foyer with tall white shaker wainscoting on both walls, light greige paint above, crown molding, warm-toned LVP flooring, " +
      "brown Craftsman-style front door with three glass lites, sidelight window on the right, recessed ceiling light.",
    scopeSlugs: [
      "common-wall-paint", "trim-paint", "baseboard", "crown-options",
      "wainscoting", "main-area-flooring-type", "main-area-flooring-color",
      "door-casing-color", "front-door",
    ],
  },
  {
    stepSlug: "set-your-style",
    file: "Lenox-Dining_Room.webp",
    label: "Dining Room",
    isHero: false,
    sortOrder: 2,
    spatialHint:
      "Open dining room with flat ceiling. A modern brushed-nickel chandelier hangs from center. Large window on the left wall with white trim. " +
      "A doorway on the back wall leads to a patio door. A paneled interior door is visible on the right wall. " +
      "Crown molding along the ceiling. LVP flooring throughout. White baseboard along all walls. Paint on all wall surfaces.",
    photoBaseline:
      "Dining room with flat white ceiling, brushed-nickel ring chandelier, light greige walls, large window on the left overlooking the yard, " +
      "patio door passthrough at the back, white interior door on the right, crown molding, white baseboard, warm-toned LVP flooring, recessed lights.",
    scopeSlugs: [
      "common-wall-paint", "ceiling-paint", "trim-paint", "baseboard", "crown-options",
      "main-area-flooring-type", "main-area-flooring-color",
      "lighting", "interior-door-style", "door-casing-color",
    ],
  },
  {
    stepSlug: "primary-bath",
    file: "Lenox-Primary-Bedroom.webp",
    label: "Primary Bedroom",
    isHero: false,
    sortOrder: 1,
    spatialHint:
      "Primary bedroom with tray ceiling and crown molding at the tray edge. Dark-bladed ceiling fan centered in the tray. " +
      "Carpet covers the entire floor. Two windows on the left wall. A doorway on the right leads to the en-suite bathroom; " +
      "another doorway beside it leads to the walk-in closet. White baseboard along all walls. Paint on all wall surfaces.",
    photoBaseline:
      "Primary bedroom with white tray ceiling, dark-bladed ceiling fan with light kit, neutral carpet flooring, light greige walls, " +
      "two windows on the left wall, doorway to en-suite bath on the right, doorway to walk-in closet, white crown molding at tray edge, white baseboard.",
    scopeSlugs: [
      "common-wall-paint", "accent-color", "ceiling-paint", "trim-paint", "baseboard", "crown-options",
      "carpet-color", "main-area-flooring-type", "main-area-flooring-color",
      "bedroom-fan", "interior-door-style", "door-casing-color",
    ],
  },

  // ── Design Your Kitchen ──
  {
    stepSlug: "design-your-kitchen",
    file: "Lenox-Kitchen.webp",
    label: "Kitchen",
    isHero: true,
    sortOrder: 0,
    spatialHint:
      "Kitchen viewed from the living area. Island is in the center foreground with sink and faucet; keep sink cutout and faucet direction fixed. " +
      "Perimeter cabinets and backsplash on the back wall with range and microwave above. Double pantry doors on the far left. " +
      "Two glass pendant lights hang over the island. LVP flooring throughout. No refrigerator is visible in this shot.",
    photoBaseline:
      "Kitchen with light grey shaker cabinets, white quartz countertops on island and perimeter, smooth white backsplash, " +
      "stainless gas range with microwave above, island with undermount sink and arched faucet, two glass pendant lights, " +
      "brushed-nickel cabinet pulls, double white pantry doors on the left, warm-toned LVP flooring, recessed lights.",
    scopeSlugs: [
      "counter-top", "countertop-edge", "backsplash",
      "kitchen-cabinet-color", "kitchen-island-cabinet-color", "kitchen-cabinet-hardware",
      "kitchen-sink", "kitchen-faucet", "cabinet-style-whole-house",
      "under-cabinet-lighting", "light-rail", "glass-cabinet-door", "trash-can-cabinet",
      "range", "main-area-flooring-type", "main-area-flooring-color", "common-wall-paint",
    ],
  },
  {
    stepSlug: "design-your-kitchen",
    file: "Lenox-Kitchen_and_Dining.webp",
    label: "Kitchen & Dining",
    isHero: false,
    sortOrder: 1,
    spatialHint:
      "Kitchen from the side angle showing island in the left foreground with dishwasher panel visible on the near side and sink/faucet on top. " +
      "Perimeter cabinets run along the right wall and wrap around to the back wall. " +
      "Backsplash tile covers the ENTIRE perimeter wall between upper and lower cabinets — both to the right of the pantry doors (behind the range and microwave) and to the left of the pantry doors (where more upper cabinets and countertop continue). " +
      "Double pantry doors in the back center. Dining area visible through the opening on the far left with chandelier and windows. LVP flooring throughout.",
    photoBaseline:
      "Side view of kitchen: light grey shaker island with stainless dishwasher panel, undermount sink and arched faucet on island top, " +
      "white quartz countertops, perimeter cabinets with range and over-range microwave on the right, white backsplash, glass pendant lights, " +
      "double pantry doors in background, dining area visible at left with ring chandelier, warm-toned LVP flooring.",
    scopeSlugs: [
      "counter-top", "countertop-edge", "backsplash",
      "kitchen-cabinet-color", "kitchen-island-cabinet-color", "kitchen-cabinet-hardware",
      "kitchen-sink", "kitchen-faucet", "dishwasher", "range", "refrigerator",
      "cabinet-style-whole-house", "main-area-flooring-type", "main-area-flooring-color", "common-wall-paint",
    ],
  },

  // ── Primary Bath ──
  {
    stepSlug: "primary-bath",
    file: "Lenox-Primary_Bath.webp",
    label: "Primary Bath",
    isHero: true,
    sortOrder: 0,
    spatialHint:
      "Primary bathroom with single vanity on the left, glass-enclosed shower in the center, and soaking tub on the right beneath a window. " +
      "Vanity has a single undermount sink with a brushed-nickel faucet and a framed mirror above with a glass sconce light. " +
      "Towel ring is on the wall beside the vanity. Shower has a glass door with tile walls and mosaic tile floor. " +
      "Large-format tile covers the bathroom floor. The tub surround has tile wainscoting.",
    photoBaseline:
      "Primary bath with light grey single vanity, white quartz top, brushed-nickel faucet, framed nickel mirror, glass sconce above, " +
      "towel ring on the wall beside the vanity, glass-door walk-in shower with grey tile walls and mosaic tile floor, " +
      "white soaking tub on the right with tile surround and large window above, grey large-format tile floor.",
    scopeSlugs: [
      "primary-bath-vanity", "primary-bath-cabinet-color", "bathroom-cabinet-hardware",
      "primary-bath-mirrors", "floor-tile-color", "primary-shower", "primary-shower-entry",
      "bath-faucets", "bath-hardware", "cabinet-style-whole-house",
      "rain-head", "wall-mount-hand-shower", "common-wall-paint",
    ],
  },

  // ── Secondary Spaces ──
  {
    stepSlug: "secondary-spaces",
    file: "Lenox-Bath.webp",
    label: "Secondary Bath",
    isHero: true,
    sortOrder: 0,
    spatialHint:
      "Small secondary bathroom. Single vanity on the left with undermount sink, brushed-nickel faucet, and framed mirror above. " +
      "White one-piece tub/shower combo against the back wall with brushed-nickel fixtures. Toilet between the vanity and tub. " +
      "Towel bar on the right wall above the tub. Grey tile floor. White paneled door on the far right.",
    photoBaseline:
      "Secondary bath with light grey single vanity, white quartz top, brushed-nickel faucet, framed nickel mirror, " +
      "white one-piece tub/shower combo at the back, toilet between vanity and tub, brushed-nickel towel bar, " +
      "grey tile floor, white paneled door on the right, white walls.",
    scopeSlugs: [
      "secondary-bath-cabinet-color", "bathroom-cabinet-hardware",
      "secondary-bath-mirrors", "secondary-shower", "floor-tile-color",
      "secondary-bath-steel-tub", "secondary-bath-walk-in",
      "bath-faucets", "bath-hardware", "common-wall-paint", "trim-paint", "baseboard",
      "door-casing-color", "interior-door-style", "door-hardware",
    ],
  },
  {
    stepSlug: "secondary-spaces",
    file: "Lenox-Bedroom.webp",
    label: "Secondary Bedroom",
    isHero: false,
    sortOrder: 1,
    spatialHint:
      "Simple secondary bedroom with flat ceiling. Dark-bladed ceiling fan centered on the ceiling. " +
      "One window on the right wall with white trim. Carpet covers the entire floor. White baseboard along all walls. " +
      "Paint on all wall surfaces.",
    photoBaseline:
      "Secondary bedroom with flat white ceiling, dark-bladed ceiling fan with light kit, neutral carpet flooring, " +
      "light greige walls, single window on the right wall with white trim, white baseboard.",
    scopeSlugs: [
      "carpet-color", "main-area-flooring-type", "main-area-flooring-color",
      "common-wall-paint", "ceiling-paint", "trim-paint", "baseboard", "crown-options",
      "bedroom-fan",
    ],
  },
];

// ---------- Lenox step-level metadata ----------

/** Scene descriptions for each step (keyed by step slug). */
const LENOX_SCENE_DESCRIPTIONS: Record<string, string> = {
  "set-your-style":
    "This photo shows an open living room in a new-construction home. It has a vaulted ceiling with white beams, " +
    "a fireplace with white mantel and brick tile surround, wainscoting, LVP flooring, and a ceiling fan.",
  "design-your-kitchen":
    "This photo shows a kitchen in a new-construction home. There is an island with sink in the center, " +
    "perimeter cabinets with range and microwave on the back wall, pendant lights, pantry doors, and LVP flooring.",
  "primary-bath":
    "This photo shows a primary bathroom and bedroom in a new-construction home. The bathroom has a single vanity with mirror on the left, " +
    "a glass-enclosed walk-in shower in the center, and a soaking tub on the right with tile flooring throughout. " +
    "The primary bedroom has a tray ceiling with ceiling fan, carpet flooring, and a walk-in closet.",
  "secondary-spaces":
    "This photo shows a secondary bathroom in a new-construction home. There is a single vanity, a one-piece tub/shower combo, " +
    "a toilet, tile flooring, and a secondary bedroom with carpet and a ceiling fan.",
};

/** Spatial hints per subcategory slug — same as Kinkade's shared set, reused. */
const LENOX_SPATIAL_HINTS: Record<string, string> = {
  "kitchen-cabinet-color": "wall cabinets (upper cabinets mounted on walls)",
  "kitchen-island-cabinet-color": "island base cabinets (large freestanding island in center)",
  "kitchen-cabinet-hardware": "cabinet knobs and pulls on all cabinets",
  "counter-top": "all countertop surfaces (island and perimeter)",
  "countertop-edge": "edge profile of all countertops",
  "backsplash": "tile backsplash covering the ENTIRE perimeter wall between upper cabinets and countertop — runs the full length on both sides of the pantry doors, not just behind the range",
  "kitchen-sink": "undermount sink basin in the island countertop — preserve the exact sink position and orientation from the original photo",
  "kitchen-faucet": "faucet on the island countertop — the faucet spout arches AWAY from the camera toward the back wall/range side. Keep this exact orientation, do NOT flip it.",
  "dishwasher": "dishwasher panel on the near side of the island",
  "refrigerator": "refrigerator (not visible in hero shot; visible in side-angle kitchen & dining shot)",
  "range": "range/stovetop along the back wall next to the microwave. NOTE: if the range is a 'slide-in' model, it has NO raised back panel — it sits flush with the countertop and the backsplash tile is visible behind it. Only freestanding ranges have the raised back panel with controls.",
  "cabinet-style-whole-house": "cabinet door style on ALL cabinets (shaker, flat, raised panel, etc.)",
  "main-area-flooring-color": "LVP/hardwood plank flooring in non-bathroom areas — NOT on bathroom floors which have tile",
  "main-area-flooring-type": "LVP/hardwood plank flooring type in non-bathroom areas",
  "common-wall-paint": "all wall surfaces",
  "ceiling-paint": "ceiling",
  "trim-paint": "trim and molding along walls",
  "door-casing-color": "door frames and casings",
  "baseboard": "baseboard molding along the floor line",
  "wainscoting": "if selected, install wainscoting panels on the lower-left portion of the BACK WALL (to the left of the fireplace). The base photo has NO wainscoting — do NOT add wainscoting to the left wall or right wall",
  "interior-door-style": "interior doors (panel style)",
  "lighting": "light fixtures (chandelier, pendants)",
  "great-room-fan": "ceiling fan in the great room (vaulted ceiling)",
  "fireplace-mantel": "fireplace mantel surround on the right portion of the back wall",
  "fireplace-mantel-accent": "fireplace mantel accent/trim details on the back wall above the fireplace",
  "fireplace-hearth": "fireplace hearth at floor level on the back wall",
  "fireplace-tile-surround": "tile surround inside the fireplace opening on the back wall",
  "primary-bath-vanity": "bathroom vanity cabinet (single vanity, below the mirror)",
  "primary-bath-cabinet-color": "vanity cabinet color",
  "bathroom-cabinet-hardware": "vanity cabinet hardware (pulls and knobs)",
  "primary-bath-mirrors": "framed mirror above the vanity",
  "floor-tile-color": "large format tile on the bathroom floor AND shower walls (same tile covers both surfaces) — do NOT tile outside the bathroom",
  "primary-shower": "small mosaic tile on the SHOWER FLOOR ONLY (the small square or penny tiles on the ground inside the shower enclosure)",
  "primary-shower-entry": "shower entry/door (glass panel separating shower from bathroom)",
  "bath-faucets": "faucets on the vanity",
  "bath-hardware": "towel rings, towel bars, and bath accessories on walls",
  "secondary-bath-cabinet-color": "vanity cabinet color",
  "secondary-bath-mirrors": "mirror above vanity",
  "secondary-shower": "shower/tub surround",
  "crown-options": "crown molding where walls meet ceiling",
  "bedroom-fan": "ceiling fan in the bedroom",
  "carpet-color": "carpet flooring covering the entire bedroom floor",
  "door-hardware": "door knobs/levers on interior doors",
  "under-cabinet-lighting": "LED strip lighting underneath upper cabinets, illuminating the countertop",
  "accent-color": "accent wall color (if different from main wall paint)",
  "rain-head": "rain shower head mounted in ceiling of shower",
  "wall-mount-hand-shower": "hand shower mounted on the shower wall",
  "light-rail": "light rail molding beneath upper cabinets",
  "glass-cabinet-door": "glass-front cabinet doors on select upper cabinets",
  "trash-can-cabinet": "pull-out trash can cabinet",
  "secondary-bath-steel-tub": "steel tub upgrade for secondary bath",
  "secondary-bath-walk-in": "walk-in shower upgrade replacing tub/shower combo",
};

// ---------- Lenox pricing overrides ----------
// Keyed by option slug → Lenox price (dollars, matching existing format).
// Only include options where Lenox price differs from Kinkade base price.
// Extracted from Lenox price sheet (McClain Landing Phase 7).

const LENOX_PRICES: Record<string, number> = {
  // ── Flooring — Main Area Flooring Type ──
  // Lenox is larger so all flooring upgrades cost more
  "flooring-type-7-lvp-primary": 1775,        // Kinkade: 1475
  "flooring-type-9-lvp-standard": 2620,        // Kinkade: 2095
  "flooring-type-5-hardwood-standard": 3980,   // Kinkade: 3350
  "flooring-type-9-lvp-primary": 4920,         // Kinkade: 3980
  "flooring-type-5-hardwood-primary": 5890,    // Kinkade: 4955
  "flooring-type-7-lvp-whole": 6430,           // Kinkade: 5515
  "flooring-type-7-hardwood-standard": 6735,   // Kinkade: 5495
  "flooring-type-7-hardwood-primary": 8835,    // Kinkade: 7410
  "flooring-type-9-lvp-whole": 10210,          // Kinkade: 8690
  "flooring-type-5-hardwood-whole": 12100,     // Kinkade: 10210
  "flooring-type-7-hardwood-whole": 16320,     // Kinkade: 13695

  // ── Flooring — Carpet Color (Gifted series) ──
  "carpet-gifted-art-sculpture": 1100,         // Kinkade: 900
  "carpet-gifted-blend-sculpture": 1100,       // Kinkade: 900
  "carpet-gifted-art-almond-silk": 1100,       // Kinkade: 900
  "carpet-gifted-art-river-birch": 1100,       // Kinkade: 900
  "carpet-gifted-art-subtle-clay": 1100,       // Kinkade: 900
  "carpet-gifted-blend-river-birch": 1100,     // Kinkade: 900
  "carpet-gifted-blend-subtle-clay": 1100,     // Kinkade: 900
  "carpet-gifted-blend-almond-silk": 1100,     // Kinkade: 900

  // ── Countertops — Counter Top ──
  // Larger kitchen means more counter surface
  "ct-granite-luna-pearl": 450,                // Kinkade: 350
  "ct-granite-leathered-steel-grey": 750,      // Kinkade: 600
  "ct-granite-colonial-white": 950,            // Kinkade: 750
  "ct-granite-oyster-white": 950,              // Kinkade: 750
  "ct-granite-fantasy-brown": 1300,            // Kinkade: 1050
  "ct-quartz-lace-white": 1400,               // Kinkade: 1100
  "ct-quartz-bianco-carrara": 1750,            // Kinkade: 1400
  "ct-quartz-carrara-mist": 1750,              // Kinkade: 1400
  "ct-quartz-pure-white": 1900,               // Kinkade: 1550
  "ct-quartz-calacatta-duolina": 1950,         // Kinkade: 1550
  "ct-granite-leathered-fantasy-brown": 1950,  // Kinkade: 1550
  "ct-quartz-calacatta-idillio": 2600,         // Kinkade: 2100
  "ct-quartz-calacatta-lavasa": 3000,          // Kinkade: 2400
  "ct-quartz-calacatta-venice": 3050,          // Kinkade: 2450

  // ── Countertops — Countertop Edge ──
  "edge-ogee": 450,                            // Kinkade: 350
  "edge-bullnose": 450,                        // Kinkade: 350

  // ── Trim — Crown Options ──
  "crown-all-flat-ceiling": 1200,              // Kinkade: 1000
  "crown-cove-included": 1800,                 // Kinkade: 1500
  "crown-cove-all": 3600,                      // Kinkade: 3000

  // ── Trim — Baseboard Options ──
  "baseboard-craftsman": 425,                  // Kinkade: 350
  "baseboard-7inch": 750,                      // Kinkade: 600

  // ── Trim — Wainscoting ──
  "wainscoting-traditional": 1100,             // Kinkade: 900
  "wainscoting-tall-shaker": 1500,             // Kinkade: 1200

  // ── Trim — Door and Window Casing ──
  "casing-craftsman": 3100,                    // Kinkade: 2500

  // ── Trim — Interior Door Style ──
  "door-cheyenne": 300,                        // Kinkade: 250
  "door-riverchase": 350,                      // Kinkade: 275

  // ── Trim — Pantry Shelving ──
  "pantry-wood": 1200,                         // Kinkade: 1000

  // ── Trim — Primary Closet Shelving ──
  "closet-wood": 3500,                         // Kinkade: 2900

  // ── Trim — Bonus Room Stair Treads ──
  "stair-hardwood": 1600,                      // Kinkade: 1300

  // ── Paint — Door and Door Casing Color ──
  "door-color-in-the-shadows": 3100,           // Kinkade: 2500
  "door-color-rabbits-ear": 3100,              // Kinkade: 2500
  "door-color-hurricane-haze": 3100,           // Kinkade: 2500
  "door-color-dark-woods": 3100,               // Kinkade: 2500
  "door-color-knights-armor": 3100,            // Kinkade: 2500

  // ── Hardware — Blinds ──
  "blinds-add": 1500,                          // Kinkade: 1300

  // ── Insulation — Spray Foam ──
  "spray-foam-add": 9500,                      // Kinkade: 8000
};

// ---------- Main ----------

async function main() {
  // 1. Look up SM org
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", SM_ORG_SLUG)
    .single();

  if (orgErr || !org) {
    console.error("Stone Martin org not found:", orgErr?.message);
    process.exit(1);
  }
  console.log(`Found org: ${org.name} (${org.id})`);

  // 2. Look up Kinkade floorplan
  const { data: kinkade, error: kErr } = await supabase
    .from("floorplans")
    .select("id, name")
    .eq("org_id", org.id)
    .eq("slug", KINKADE_SLUG)
    .single();

  if (kErr || !kinkade) {
    console.error("Kinkade floorplan not found:", kErr?.message);
    process.exit(1);
  }
  console.log(`Found Kinkade: ${kinkade.name} (${kinkade.id})`);

  // 3. Check if Lenox already exists
  const { data: existing } = await supabase
    .from("floorplans")
    .select("id")
    .eq("org_id", org.id)
    .eq("slug", LENOX_SLUG)
    .maybeSingle();

  let lenoxId: string;

  if (existing) {
    lenoxId = existing.id;
    console.log(`Lenox already exists (${lenoxId}), skipping creation.`);
  } else {
    // 4. Duplicate Kinkade → Lenox (steps + sections, but NOT photos)
    console.log("Duplicating Kinkade → Lenox...");

    // Fetch source floorplan
    const { data: source } = await supabase
      .from("floorplans")
      .select("*")
      .eq("id", kinkade.id)
      .single();

    if (!source) {
      console.error("Failed to fetch Kinkade details");
      process.exit(1);
    }

    // Create Lenox floorplan
    const { data: newFp, error: fpErr } = await supabase
      .from("floorplans")
      .insert({
        slug: LENOX_SLUG,
        org_id: org.id,
        name: LENOX_NAME,
        community: source.community,
        price_sheet_label: "Lenox",
        is_active: true,
      })
      .select()
      .single();

    if (fpErr || !newFp) {
      console.error("Failed to create Lenox floorplan:", fpErr?.message);
      process.exit(1);
    }

    lenoxId = newFp.id;
    console.log(`Created Lenox floorplan: ${lenoxId}`);

    // Clone steps (without photos — we'll upload Lenox-specific photos below)
    const { data: sourceSteps } = await supabase
      .from("steps")
      .select("*")
      .eq("floorplan_id", kinkade.id)
      .eq("org_id", org.id)
      .order("sort_order", { ascending: true });

    const stepIdMap = new Map<string, string>();

    for (const [index, step] of (sourceSteps ?? []).entries()) {
      const { data: newStep, error: stepErr } = await supabase
        .from("steps")
        .insert({
          slug: step.slug,
          org_id: org.id,
          floorplan_id: lenoxId,
          name: step.name,
          subtitle: step.subtitle,
          number: index + 1,
          sort_order: index,
          show_generate_button: step.show_generate_button,
          scene_description: step.scene_description,
          also_include_ids: step.also_include_ids,
          photo_baseline: step.photo_baseline,
          spatial_hints: step.spatial_hints,
          sections: step.sections,
          hero_variant: step.hero_variant,
        })
        .select()
        .single();

      if (stepErr || !newStep) {
        console.error(`Failed to clone step "${step.name}":`, stepErr?.message);
        continue;
      }

      stepIdMap.set(step.id, newStep.id);
      console.log(`  Cloned step: ${step.name}`);
    }

    // Remap also_include_ids
    for (const [oldId, newId] of stepIdMap) {
      const sourceStep = (sourceSteps ?? []).find((s) => s.id === oldId);
      if (!sourceStep?.also_include_ids?.length) continue;

      const remapped = (sourceStep.also_include_ids as string[])
        .map((refId: string) => stepIdMap.get(refId))
        .filter(Boolean);

      await supabase.from("steps").update({ also_include_ids: remapped }).eq("id", newId);
    }

    console.log("Floorplan duplication complete.");
  }

  // 5. Look up Lenox steps by slug
  const { data: lenoxSteps, error: lsErr } = await supabase
    .from("steps")
    .select("id, slug")
    .eq("floorplan_id", lenoxId)
    .eq("org_id", org.id);

  if (lsErr || !lenoxSteps) {
    console.error("Failed to fetch Lenox steps:", lsErr?.message);
    process.exit(1);
  }

  const stepBySlug = new Map(lenoxSteps.map((s) => [s.slug, s.id]));

  // 6. Update step-level metadata (scene_description + spatial_hints) for Lenox
  console.log("\nUpdating step-level metadata...");

  for (const [stepSlug, sceneDesc] of Object.entries(LENOX_SCENE_DESCRIPTIONS)) {
    const stepId = stepBySlug.get(stepSlug);
    if (!stepId) {
      console.warn(`  Step slug not found: ${stepSlug}`);
      continue;
    }

    // Build spatial_hints for this step: collect all subcategory slugs from photos in this step
    const stepPhotoDefs = LENOX_PHOTOS.filter((p) => p.stepSlug === stepSlug);
    const allSubIds = new Set<string>();
    for (const photo of stepPhotoDefs) {
      for (const slug of photo.scopeSlugs) {
        allSubIds.add(slug);
      }
    }

    const hints: Record<string, string> = {};
    for (const [subId, hint] of Object.entries(LENOX_SPATIAL_HINTS)) {
      if (allSubIds.has(subId)) {
        hints[subId] = hint;
      }
    }

    const { error: updateErr } = await supabase
      .from("steps")
      .update({ scene_description: sceneDesc, spatial_hints: hints, photo_baseline: null })
      .eq("id", stepId);

    if (updateErr) {
      console.error(`  Failed to update step ${stepSlug}:`, updateErr.message);
    } else {
      console.log(`  Updated: ${stepSlug} (${Object.keys(hints).length} spatial hints)`);
    }
  }

  // 7. Upload Lenox photos (clean slate: delete existing step_photos for Lenox steps first)
  console.log("\nUploading Lenox room photos...");

  const stepIds = Array.from(stepBySlug.values());
  if (stepIds.length > 0) {
    const { error: delErr } = await supabase
      .from("step_photos")
      .delete()
      .eq("org_id", org.id)
      .in("step_id", stepIds);

    if (delErr) {
      console.error("Failed to delete existing step_photos:", delErr.message);
    } else {
      console.log("  Cleared existing step_photos for Lenox steps.");
    }
  }

  // Track inserted photo IDs by filename for policy seeding
  const photoIdByFile = new Map<string, string>();

  for (const photo of LENOX_PHOTOS) {
    const stepId = stepBySlug.get(photo.stepSlug);
    if (!stepId) {
      console.error(`  Step slug not found for photo: ${photo.stepSlug}`);
      continue;
    }

    const filePath = path.join(PHOTO_DIR, photo.file);
    if (!fs.existsSync(filePath)) {
      console.error(`  Photo file not found: ${filePath}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `${org.id}/rooms/${stepId}/${photo.file}`;

    const { error: upErr } = await supabase.storage
      .from("rooms")
      .upload(storagePath, fileBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (upErr) {
      console.error(`  Failed to upload ${photo.file}: ${upErr.message}`);
      continue;
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("step_photos")
      .insert({
        org_id: org.id,
        step_id: stepId,
        image_path: storagePath,
        label: photo.label,
        is_hero: photo.isHero,
        sort_order: photo.sortOrder,
        spatial_hint: photo.spatialHint,
        photo_baseline: photo.photoBaseline,
        subcategory_ids: photo.scopeSlugs,
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      console.error(`  Failed to insert photo row for ${photo.file}: ${insertErr?.message}`);
      continue;
    }

    photoIdByFile.set(photo.file, inserted.id);
    console.log(`  Uploaded: ${photo.file} → ${photo.label} (${inserted.id})`);
  }

  // 8. Seed generation policies
  console.log("\nSeeding generation policies...");

  // Kitchen hero — second pass for slide-in range
  const kitchenPhotoId = photoIdByFile.get("Lenox-Kitchen.webp");
  if (kitchenPhotoId) {
    const policy = {
      secondPass: {
        reason: "stonemartin_kitchen_slide_in_range",
        inputFidelity: "low",
        whenSelected: {
          subId: "range",
          optionIds: ["range-ge-gas-slide-in", "range-ge-gas-slide-in-convection"],
        },
        prompt:
          "Second pass: correct ONLY the cooking range geometry on the back wall. " +
          "The selected range is slide-in: NO raised backguard panel, backsplash tile must be visible directly behind the cooktop, " +
          "and there must be exactly one oven door below the cooktop. Keep all surrounding cabinetry, countertop seams, island, sink, faucet, floor, walls, and lighting unchanged.",
      },
    };

    const { error } = await supabase
      .from("step_photo_generation_policies")
      .upsert(
        {
          org_id: org.id,
          step_photo_id: kitchenPhotoId,
          policy_key: "stonemartin:lenox:kitchen:v1",
          is_active: true,
          policy_json: policy,
        },
        { onConflict: "org_id,step_photo_id,policy_key" },
      );
    if (error) {
      console.error("  Failed to upsert kitchen policy:", error.message);
    } else {
      console.log("  Kitchen hero policy: slide-in range second pass");
    }
  }

  // Kitchen & Dining — refrigerator invariant + second pass for slide-in range
  const kitchenDiningPhotoId = photoIdByFile.get("Lenox-Kitchen_and_Dining.webp");
  if (kitchenDiningPhotoId) {
    const policy = {
      promptOverrides: {
        invariantRulesWhenSelected: {
          refrigerator: [
            "No refrigerator is currently visible in this photo. Place the selected refrigerator in the kitchen in a natural position along the perimeter cabinetry. Do NOT fill any other opening or remove existing cabinetry to make room — find the most natural placement.",
          ],
        },
        invariantRulesWhenNotSelected: {
          refrigerator: [
            "No refrigerator is visible in this photo. Do NOT add a refrigerator or create a refrigerator alcove/opening.",
          ],
        },
      },
      secondPass: {
        reason: "stonemartin_kitchen_slide_in_range",
        inputFidelity: "low",
        whenSelected: {
          subId: "range",
          optionIds: ["range-ge-gas-slide-in", "range-ge-gas-slide-in-convection"],
        },
        prompt:
          "Second pass: correct ONLY the cooking range geometry on the back wall. " +
          "The selected range is slide-in: NO raised backguard panel, backsplash tile must be visible directly behind the cooktop, " +
          "and there must be exactly one oven door below the cooktop. Keep all surrounding cabinetry, countertop seams, island, sink, faucet, floor, walls, and lighting unchanged.",
      },
    };

    const { error } = await supabase
      .from("step_photo_generation_policies")
      .upsert(
        {
          org_id: org.id,
          step_photo_id: kitchenDiningPhotoId,
          policy_key: "stonemartin:lenox:kitchen-dining:v1",
          is_active: true,
          policy_json: policy,
        },
        { onConflict: "org_id,step_photo_id,policy_key" },
      );
    if (error) {
      console.error("  Failed to upsert kitchen-dining policy:", error.message);
    } else {
      console.log("  Kitchen & Dining policy: slide-in range second pass");
    }
  }

  // Entryway — wainscoting removal when not selected
  const entrywayPhotoId = photoIdByFile.get("Lenox-Entryway.webp");
  if (entrywayPhotoId) {
    const policy = {
      promptOverrides: {
        invariantRulesWhenNotSelected: {
          wainscoting: [
            "IMPORTANT: The source photo shows tall shaker wainscoting panels on both hallway walls — this is an upgrade that was NOT selected. REMOVE all wainscoting panels from both walls and show smooth painted drywall from baseboard to crown molding. No battens, panels, grooves, rails, or trim banding.",
          ],
        },
      },
    };

    const { error } = await supabase
      .from("step_photo_generation_policies")
      .upsert(
        {
          org_id: org.id,
          step_photo_id: entrywayPhotoId,
          policy_key: "stonemartin:lenox:entryway:v1",
          is_active: true,
          policy_json: policy,
        },
        { onConflict: "org_id,step_photo_id,policy_key" },
      );
    if (error) {
      console.error("  Failed to upsert entryway policy:", error.message);
    } else {
      console.log("  Entryway policy: wainscoting removal when not selected");
    }
  }

  // Living Room — zone protection
  const livingRoomPhotoId = photoIdByFile.get("Lenox-Living_Room.webp");
  if (livingRoomPhotoId) {
    const policy = {
      promptOverrides: {
        invariantRulesAlways: [
          "FIREPLACE POSITION LOCK: The fireplace is on the right portion of the BACK WALL (far wall from the camera). The window is on the adjacent RIGHT WALL, not on the fireplace wall. The fireplace must remain on the back wall in its exact position. Do NOT relocate, mirror, or redraw the fireplace on any other wall. Preserve the fireplace opening shape, mantel structure, brick surround, and hearth in their original position and proportions.",
          "WAINSCOTING PLACEMENT: The base photo has NO wainscoting — all walls are smooth painted drywall. If a wainscoting style is selected, install it ONLY on the lower-left portion of the BACK WALL (to the left of the fireplace). Do NOT place wainscoting on the left wall, right wall, or any other surface. If no wainscoting is selected, do NOT mention or add wainscoting anywhere.",
          "Preserve room zoning exactly as the source photo: the main living room floor area must stay open and uncluttered.",
          "Do NOT add any kitchen structures in the living room area: no islands, perimeter cabinets, countertops, appliances, sinks, faucets, or backsplash walls.",
        ],
      },
    };

    const { error } = await supabase
      .from("step_photo_generation_policies")
      .upsert(
        {
          org_id: org.id,
          step_photo_id: livingRoomPhotoId,
          policy_key: "stonemartin:lenox:living-room:v3",
          is_active: true,
          policy_json: policy,
        },
        { onConflict: "org_id,step_photo_id,policy_key" },
      );
    if (error) {
      console.error("  Failed to upsert living room policy:", error.message);
    } else {
      console.log("  Living Room policy: zone protection");
    }
  }

  // 9. Seed pricing overrides
  console.log("\nSeeding Lenox pricing overrides...");

  // Look up all options for this org by slug
  const { data: allOptions, error: optErr } = await supabase
    .from("options")
    .select("id, slug, price")
    .eq("org_id", org.id);

  if (optErr || !allOptions) {
    console.error("Failed to fetch options:", optErr?.message);
    process.exit(1);
  }

  const optionsBySlug = new Map(allOptions.map((o) => [o.slug, o]));

  let matchCount = 0;
  let missingCount = 0;
  const rows: { option_id: string; floorplan_id: string; price: number }[] = [];

  for (const [slug, lenoxPrice] of Object.entries(LENOX_PRICES)) {
    const opt = optionsBySlug.get(slug);
    if (!opt) {
      console.warn(`  Option slug not found: ${slug}`);
      missingCount++;
      continue;
    }

    if (opt.price === lenoxPrice) {
      matchCount++;
      continue;
    }

    rows.push({ option_id: opt.id, floorplan_id: lenoxId, price: lenoxPrice });
    console.log(`  Override: ${slug} $${opt.price} → $${lenoxPrice}`);
  }

  if (rows.length > 0) {
    const { error: upsertErr } = await supabase
      .from("option_floorplan_pricing")
      .upsert(rows, { onConflict: "option_id,floorplan_id" });

    if (upsertErr) {
      console.error("Failed to upsert overrides:", upsertErr.message);
      process.exit(1);
    }
  }

  console.log(`\nDone. ${rows.length} price overrides, ${matchCount} matching base, ${missingCount} missing slugs.`);
  console.log(`${photoIdByFile.size} photos uploaded, 4 generation policies seeded.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
