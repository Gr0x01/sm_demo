/**
 * Seed script: populates the "Finch Homes" demo org at /demo with a fully
 * playable floorplan ("The Nest") plus 3 inactive display floorplans.
 *
 * Cherry-picks ~100-120 options from Stone Martin data, uploads swatches and
 * room photos, and configures generation policies.
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts
 *   npx tsx scripts/seed-demo.ts --dry-run
 *
 * Idempotent — all upserts on (org_id, slug). Safe to re-run.
 */

import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// ---------- CLI args ----------

const DRY_RUN = process.argv.includes("--dry-run");

// ---------- Supabase client ----------

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key);

// ---------- Org config ----------

const ORG_SLUG = "demo";
const ORG_NAME = "Finch Homes";
const ORG_PRIMARY_COLOR = "#2D4A3E"; // forest green
const ORG_SECONDARY_COLOR = "#C8A96E"; // warm gold accent
const GENERATION_CAP = 30;

// ---------- Floorplans ----------

const FLOORPLANS = [
  { name: "The Nest", slug: "nest", isActive: true, coverPhoto: "greatroom-wide.webp" },
  { name: "The Wren", slug: "wren", isActive: false, coverPhoto: "kitchen-close.webp" },
  { name: "The Sparrow", slug: "sparrow", isActive: false, coverPhoto: "primary-bath-vanity.webp" },
  { name: "The Robin", slug: "robin", isActive: false, coverPhoto: "secondary-bedroom.webp" },
];

// ---------- Categories (same 9 as SM) ----------

const CATEGORIES = [
  { slug: "cabinets", name: "Cabinets" },
  { slug: "countertops", name: "Countertops" },
  { slug: "flooring", name: "Flooring" },
  { slug: "paint", name: "Paint" },
  { slug: "trim", name: "Trim" },
  { slug: "plumbing", name: "Plumbing" },
  { slug: "electrical", name: "Electrical" },
  { slug: "hardware", name: "Hardware" },
  { slug: "appliances", name: "Appliances" },
];

// ---------- Subcategories ----------

type SubcatDef = {
  slug: string;
  name: string;
  categorySlug: string;
  isVisual: boolean;
  generationHint?: string;
};

const SUBCATEGORIES: SubcatDef[] = [
  // Step 1: Set Your Style
  { slug: "cabinet-style-whole-house", name: "Cabinet Style Whole House", categorySlug: "cabinets", isVisual: true },
  { slug: "main-area-flooring-type", name: "Main Area Flooring Type", categorySlug: "flooring", isVisual: false, generationHint: "always_send" },
  { slug: "main-area-flooring-color", name: "Main Area Flooring Color", categorySlug: "flooring", isVisual: true },
  { slug: "carpet-color", name: "Carpet Color", categorySlug: "flooring", isVisual: true, generationHint: "always_send" },
  { slug: "common-wall-paint", name: "Common Wall Paint Color", categorySlug: "paint", isVisual: true },
  { slug: "baseboard", name: "Baseboard Options", categorySlug: "trim", isVisual: true },
  { slug: "crown-options", name: "Crown Options", categorySlug: "trim", isVisual: true },
  { slug: "interior-door-style", name: "Interior Door Style", categorySlug: "trim", isVisual: true },
  { slug: "fireplace-mantel", name: "Fireplace Mantel", categorySlug: "trim", isVisual: true },
  { slug: "lighting", name: "Lighting Package", categorySlug: "electrical", isVisual: true },
  { slug: "great-room-fan", name: "Great Room Fan Color", categorySlug: "electrical", isVisual: true },
  { slug: "bedroom-fan", name: "Bedroom Fan Color", categorySlug: "electrical", isVisual: true },
  // Step 2: Design Your Kitchen
  { slug: "counter-top", name: "Counter Top", categorySlug: "countertops", isVisual: true },
  { slug: "backsplash", name: "Backsplash", categorySlug: "flooring", isVisual: true },
  { slug: "kitchen-cabinet-color", name: "Kitchen Cabinet Color", categorySlug: "cabinets", isVisual: true },
  { slug: "kitchen-island-cabinet-color", name: "Kitchen Island Cabinet Color", categorySlug: "cabinets", isVisual: true },
  { slug: "kitchen-cabinet-hardware", name: "Kitchen Cabinet Hardware", categorySlug: "cabinets", isVisual: true },
  { slug: "kitchen-sink", name: "Kitchen Sink", categorySlug: "countertops", isVisual: true },
  { slug: "kitchen-faucet", name: "Kitchen Faucet", categorySlug: "plumbing", isVisual: true },
  { slug: "refrigerator", name: "Refrigerator", categorySlug: "appliances", isVisual: true },
  { slug: "range", name: "Range", categorySlug: "appliances", isVisual: true },
  // Step 3: Primary Bath
  { slug: "primary-bath-cabinet-color", name: "Primary Bath Cabinet Color", categorySlug: "cabinets", isVisual: true },
  { slug: "bathroom-cabinet-hardware", name: "Bathroom Cabinet Hardware", categorySlug: "cabinets", isVisual: true },
  { slug: "primary-bath-mirrors", name: "Primary Bath Mirrors", categorySlug: "hardware", isVisual: true },
  { slug: "floor-tile-color", name: "Floor Tile Color", categorySlug: "flooring", isVisual: true },
  { slug: "primary-shower", name: "Primary Shower", categorySlug: "flooring", isVisual: true },
  { slug: "bath-faucets", name: "Bath Faucets", categorySlug: "plumbing", isVisual: true },
  { slug: "bath-hardware", name: "Bath Hardware", categorySlug: "hardware", isVisual: true },
  // Step 4: Secondary Spaces
  { slug: "secondary-bath-cabinet-color", name: "Secondary Bath Cabinet Color", categorySlug: "cabinets", isVisual: true },
  { slug: "door-hardware", name: "Door Hardware", categorySlug: "hardware", isVisual: true },
  // Step 5: Finishing Touches
  { slug: "front-door", name: "Front Door", categorySlug: "hardware", isVisual: false },
  { slug: "garage-door-keypad", name: "Garage Door Keypad", categorySlug: "hardware", isVisual: false },
  { slug: "window-screens", name: "Window Screens", categorySlug: "electrical", isVisual: false },
  { slug: "blinds", name: "Blinds", categorySlug: "electrical", isVisual: false },
  { slug: "toilet-upgrade", name: "Toilet Upgrade", categorySlug: "plumbing", isVisual: false },
];

// ---------- Options (cherry-picked from SM, ~5 per subcategory) ----------

type OptionDef = {
  slug: string;
  subcategorySlug: string;
  name: string;
  price: number;
  isDefault?: boolean;
  swatchUrl?: string;
  swatchColor?: string;
  promptDescriptor?: string;
  nudge?: string;
};

const OPTIONS: OptionDef[] = [
  // --- Cabinet Style Whole House (3) ---
  { slug: "cabinet-style-fairmont", subcategorySlug: "cabinet-style-whole-house", name: "Fairmont", price: 0, isDefault: true, swatchUrl: "/swatches/cabinets/STYLE__0003_FAIRMONT_SADDLE.jpg", promptDescriptor: "Fairmont style traditional raised panel cabinet doors with elegant detailing" },
  { slug: "cabinet-style-meridian", subcategorySlug: "cabinet-style-whole-house", name: "Meridian", price: 500, swatchUrl: "/swatches/cabinets/STYLE__0007_MERIDIAN_CAPPUCINO.jpg", promptDescriptor: "Meridian style transitional cabinet doors with clean lines and subtle raised panel" },
  { slug: "cabinet-style-oxford", subcategorySlug: "cabinet-style-whole-house", name: "Oxford", price: 900, swatchUrl: "/swatches/cabinets/STYLE__0009_OXFORD_ADMIRAL-BLUE.jpg", promptDescriptor: "Oxford style shaker cabinet doors with clean lines and recessed center panel", nudge: "Chosen by 3 out of 4 buyers" },

  // --- Main Area Flooring Type (2) ---
  { slug: "flooring-type-7-lvp-standard", subcategorySlug: "main-area-flooring-type", name: "7 Inch LVP Standard Areas", price: 0, isDefault: true },
  { slug: "flooring-type-5-hardwood-standard", subcategorySlug: "main-area-flooring-type", name: "5 Inch Hardwood Standard Areas", price: 3350 },

  // --- Main Area Flooring Color (5) ---
  { slug: "floor-color-polaris-toasted-taupe", subcategorySlug: "main-area-flooring-color", name: "7\" LVP - Polaris Plus - Toasted Taupe", price: 0, isDefault: true, swatchColor: "#A89278", swatchUrl: "/swatches/flooring/MAIN-AREA-FLOORING-COLOR---7-INCH-LVP---POLARIS-PLUS---TOASTED-TAUPE.jpg", promptDescriptor: "warm toasted taupe luxury vinyl plank flooring" },
  { slug: "floor-color-polaris-wild-dunes", subcategorySlug: "main-area-flooring-color", name: "7\" LVP - Polaris Plus - Wild Dunes", price: 0, swatchColor: "#C8BA9E", swatchUrl: "/swatches/flooring/MAIN-AREA-FLOORING-COLOR---7-INCH-LVP---POLARIS-PLUS---WILD-DUNES.jpg", promptDescriptor: "light sandy Wild Dunes luxury vinyl plank flooring" },
  { slug: "floor-color-polaris-cinnamon-walnut", subcategorySlug: "main-area-flooring-color", name: "7\" LVP - Polaris Plus - Cinnamon Walnut", price: 0, swatchColor: "#7A4A2E", swatchUrl: "/swatches/flooring/MAIN-AREA-FLOORING-COLOR---7-INCH-LVP---POLARIS-PLUS---CINNAMON-WALNUT.jpg", promptDescriptor: "rich cinnamon walnut luxury vinyl plank flooring" },
  { slug: "floor-color-delray-lowtide", subcategorySlug: "main-area-flooring-color", name: "5\" Hardwood - Delray - Lowtide", price: 0, swatchColor: "#C4B49A", swatchUrl: "/swatches/flooring/delray-lowtide.jpg", promptDescriptor: "5-inch Lowtide hardwood flooring with light natural tones" },
  { slug: "floor-color-delray-windsurf", subcategorySlug: "main-area-flooring-color", name: "5\" Hardwood - Delray - Windsurf", price: 0, swatchColor: "#9A8268", swatchUrl: "/swatches/flooring/delray-windsurf.jpg", promptDescriptor: "5-inch Windsurf hardwood flooring with medium warm tones" },

  // --- Carpet Color (4) ---
  { slug: "carpet-soft-taupe", subcategorySlug: "carpet-color", name: "Graceful Finesse - Soft Taupe", price: 0, isDefault: true, swatchUrl: "/swatches/carpet/graceful-finesse-soft-taupe.jpg" },
  { slug: "carpet-ecru", subcategorySlug: "carpet-color", name: "Graceful Finesse - Ecru", price: 0, swatchUrl: "/swatches/carpet/graceful-finesse-ecru.jpg" },
  { slug: "carpet-whisper", subcategorySlug: "carpet-color", name: "Graceful Finesse - Whisper", price: 0, swatchUrl: "/swatches/carpet/graceful-finesse-whisper.jpg" },
  { slug: "carpet-concrete", subcategorySlug: "carpet-color", name: "Graceful Finesse - Concrete", price: 0, swatchUrl: "/swatches/carpet/graceful-finesse-concrete.jpg" },

  // --- Common Wall Paint (5) ---
  { slug: "wall-delicate-white", subcategorySlug: "common-wall-paint", name: "Delicate White", price: 0, isDefault: true, swatchUrl: "/swatches/paint/delicate-white.svg", swatchColor: "#F1F2EE" },
  { slug: "wall-whiskers", subcategorySlug: "common-wall-paint", name: "Whiskers", price: 0, swatchUrl: "/swatches/paint/whiskers.svg", swatchColor: "#D1CCC2" },
  { slug: "wall-hurricane-haze", subcategorySlug: "common-wall-paint", name: "Hurricane Haze", price: 0, swatchUrl: "/swatches/paint/hurricane-haze.svg", swatchColor: "#BDBBAD" },
  { slug: "wall-fog", subcategorySlug: "common-wall-paint", name: "Fog", price: 0, swatchUrl: "/swatches/paint/fog.svg", swatchColor: "#D6D7D2" },
  { slug: "wall-cold-foam", subcategorySlug: "common-wall-paint", name: "Cold Foam", price: 0, swatchUrl: "/swatches/paint/cold-foam.svg", swatchColor: "#E9E5D7" },

  // --- Baseboard (3) ---
  { slug: "baseboard-5inch", subcategorySlug: "baseboard", name: "5 Inch Included Style Base", price: 0, isDefault: true, swatchUrl: "/swatches/trim/BASEBOARD OPTIONS - 5 INCH INCLUDED STYLE BASE THROUGHOUT HOME.png" },
  { slug: "baseboard-craftsman", subcategorySlug: "baseboard", name: "1x6 Craftsman Base", price: 350, swatchUrl: "/swatches/trim/BASEBOARD OPTIONS - 1X6 CRAFTSMAN BASE THROUGHOUT HOME.png" },
  { slug: "baseboard-7inch", subcategorySlug: "baseboard", name: "7 Inch Base", price: 600, swatchUrl: "/swatches/trim/BASEBOARD OPTIONS - 7 INCH BASE THROUGHOUT HOME.png" },

  // --- Crown Options (3) ---
  { slug: "crown-included", subcategorySlug: "crown-options", name: "5 Inch Included Style Crown", price: 0, isDefault: true, swatchUrl: "/swatches/trim/CROWN OPTIONS - 5 INCH INCLUDED STYLE CROWN IN INCLUDED AREAS PER PLAN.png" },
  { slug: "crown-all-flat-ceiling", subcategorySlug: "crown-options", name: "Add Crown to All Flat Ceiling Rooms", price: 1000, swatchUrl: "/swatches/trim/CROWN OPTIONS - 5 INCH INCLUDED STYLE CROWN IN INCLUDED AREAS PER PLAN.png" },
  { slug: "crown-cove-included", subcategorySlug: "crown-options", name: "Swap Crown with 5 Inch Cove", price: 1500, swatchUrl: "/swatches/trim/CROWN OPTIONS - SWAP INCLUDED CROWN WITH 5 INCH COVE IN INCLUDED AREAS.png" },

  // --- Interior Door Style (3) ---
  { slug: "door-carrara", subcategorySlug: "interior-door-style", name: "Carrara Whole House", price: 0, isDefault: true, swatchUrl: "/swatches/doors/INTERIOR-DOOR-STYLE---CARRARA-WHOLE-HOUSE.jpg" },
  { slug: "door-cheyenne", subcategorySlug: "interior-door-style", name: "Cheyenne Whole House", price: 250, swatchUrl: "/swatches/doors/INTERIOR-DOOR-STYLE---CHEYENNE-WHOLE-HOUSE.jpg" },
  { slug: "door-riverchase", subcategorySlug: "interior-door-style", name: "Riverchase Whole House", price: 275, swatchUrl: "/swatches/doors/INTERIOR-DOOR-STYLE---RIVERCHASE-WHOLE-HOUSE.jpg" },

  // --- Fireplace Mantel (3) ---
  { slug: "mantel-newport", subcategorySlug: "fireplace-mantel", name: "Newport", price: 0, isDefault: true, swatchUrl: "/swatches/fireplace/FIREPLACE-MANTEL---NEWPORT.jpg" },
  { slug: "mantel-fairfax", subcategorySlug: "fireplace-mantel", name: "Fairfax", price: 125, swatchUrl: "/swatches/fireplace/FIREPLACE-MANTEL---FAIRFAX.jpg" },
  { slug: "mantel-jefferson", subcategorySlug: "fireplace-mantel", name: "Jefferson", price: 200, swatchUrl: "/swatches/fireplace/FIREPLACE-MANTEL---JEFFERSON.jpg" },

  // --- Lighting (5) ---
  { slug: "lighting-satin-nickel-wh", subcategorySlug: "lighting", name: "Included Satin Nickel Whole House", price: 0, isDefault: true, swatchUrl: "/swatches/lighting/lighting---included-satin-nickel-whole-house.png" },
  { slug: "lighting-orb-wh", subcategorySlug: "lighting", name: "Included Oil Rubbed Bronze Whole House", price: 0, swatchUrl: "/swatches/lighting/lighting---included-oil-rubbed-bronze-whole-house.png" },
  { slug: "lighting-designer-brushed-gold-wh", subcategorySlug: "lighting", name: "Designer Brushed Gold Whole House", price: 595, swatchUrl: "/swatches/lighting/lighting---designer-brushed-gold-whole-house.png" },
  { slug: "lighting-black-wh-2", subcategorySlug: "lighting", name: "Black Whole House", price: 690, swatchUrl: "/swatches/lighting/lighting---black-whole-house.png" },
  { slug: "lighting-designer-satin-bronze-wh", subcategorySlug: "lighting", name: "Designer Satin Bronze Whole House", price: 1100, swatchUrl: "/swatches/lighting/lighting---designer-satin-bronze-whole-house.png" },

  // --- Great Room Fan (4) ---
  { slug: "gr-fan-brushed-nickel", subcategorySlug: "great-room-fan", name: "Single Light Brushed Nickel", price: 0, isDefault: true, swatchUrl: "/swatches/fans/GREAT-ROOM-FAN-COLOR---SINGLE-LIGHT-BRUSHED-NICKEL.jpg" },
  { slug: "gr-fan-white", subcategorySlug: "great-room-fan", name: "Single Light White", price: 140, swatchUrl: "/swatches/fans/GREAT-ROOM-FAN-COLOR---SINGLE-LIGHT-WHITE.jpg" },
  { slug: "gr-fan-bronze", subcategorySlug: "great-room-fan", name: "Single Light Bronze", price: 140, swatchUrl: "/swatches/fans/GREAT-ROOM-FAN-COLOR---SINGLE-LIGHT-BRONZE.jpg" },
  { slug: "gr-fan-black", subcategorySlug: "great-room-fan", name: "Single Light Black", price: 140, swatchUrl: "/swatches/fans/GREAT-ROOM-FAN-COLOR---SINGLE-LIGHT-BLACK.jpg" },

  // --- Bedroom Fan (4) ---
  { slug: "bed-fan-brushed-nickel", subcategorySlug: "bedroom-fan", name: "Brushed Nickel", price: 0, isDefault: true, swatchUrl: "/swatches/fans/BEDROOM-FAN-COLOR---BRUSHED-NICKEL.jpg" },
  { slug: "bed-fan-white", subcategorySlug: "bedroom-fan", name: "White", price: 140, swatchUrl: "/swatches/fans/BEDROOM-FAN-COLOR---WHITE.jpg" },
  { slug: "bed-fan-bronze", subcategorySlug: "bedroom-fan", name: "Bronze", price: 175, swatchUrl: "/swatches/fans/BEDROOM-FAN-COLOR---BRONZE.jpg" },
  { slug: "bed-fan-black", subcategorySlug: "bedroom-fan", name: "Black", price: 200, swatchUrl: "/swatches/fans/BEDROOM-FAN-COLOR---BLACK.jpg" },

  // ============ Step 2: Design Your Kitchen ============

  // --- Counter Top (5) ---
  { slug: "ct-granite-steel-grey", subcategorySlug: "counter-top", name: "Granite - Steel Grey", price: 0, isDefault: true, swatchUrl: "/swatches/countertops/COUNTER-TOP---GRANITE---STEEL-GREY.jpg", swatchColor: "#6B6E72", promptDescriptor: "Steel Grey granite countertop with dark charcoal tones and subtle crystalline flecks" },
  { slug: "ct-granite-dallas-white", subcategorySlug: "counter-top", name: "Granite - Dallas White", price: 0, swatchUrl: "/swatches/countertops/COUNTER-TOP---GRANITE---DALLAS-WHITE.jpg", swatchColor: "#E8E2D9", promptDescriptor: "Dallas White granite countertop with soft gray and white veining on a creamy base" },
  { slug: "ct-quartz-lace-white", subcategorySlug: "counter-top", name: "Quartz - Lace White", price: 1100, swatchUrl: "/swatches/countertops/COUNTER-TOP---QUARTZ---LACE-WHITE.jpg", swatchColor: "#F4F1EC", promptDescriptor: "Lace White quartz countertop with clean white surface and minimal pattern" },
  { slug: "ct-quartz-calacatta-duolina", subcategorySlug: "counter-top", name: "Quartz - Calacatta Duolina", price: 1550, swatchUrl: "/swatches/countertops/COUNTER-TOP---QUARTZ---CALACATTA-DUOLINA.jpg", swatchColor: "#F0EDE6", promptDescriptor: "Calacatta Duolina quartz countertop with bold gray veining on bright white base", nudge: "Best value quartz upgrade" },
  { slug: "ct-quartz-calacatta-venice", subcategorySlug: "counter-top", name: "Quartz - Calacatta Venice", price: 2450, swatchUrl: "/swatches/countertops/COUNTER-TOP---QUARTZ---CALACATTA-VENICE.jpg", swatchColor: "#EBE8E1", promptDescriptor: "Calacatta Venice quartz countertop with dramatic gray and gold veining on a bright white base", nudge: "Most popular countertop upgrade" },

  // --- Backsplash (5) ---
  { slug: "bs-baker-4x16-white-gloss", subcategorySlug: "backsplash", name: "Baker Blvd 4x16 - White Gloss", price: 0, isDefault: true, swatchUrl: "/swatches/backsplash/BACKSPLASH---BAKER-BLVD-4X16---WHITE-GLOSS---3RD-STAGGER-LAY.jpg", swatchColor: "#F5F5F5", promptDescriptor: "white glossy 4x16 subway tile backsplash in staggered layout" },
  { slug: "bs-baker-4x16-taupe", subcategorySlug: "backsplash", name: "Baker Blvd 4x16 - Taupe", price: 150, swatchUrl: "/swatches/backsplash/BACKSPLASH---BAKER-BLVD-4X16---TAUPE---3RD-STAGGER-LAY.jpg", swatchColor: "#B5A898", promptDescriptor: "warm taupe 4x16 subway tile backsplash in staggered layout" },
  { slug: "bs-baker-4x16-carbon", subcategorySlug: "backsplash", name: "Baker Blvd 4x16 - Carbon", price: 150, swatchUrl: "/swatches/backsplash/BACKSPLASH---BAKER-BLVD-4X16---CARBON---3RD-STAGGER-LAY.jpg", swatchColor: "#3D3D3D", promptDescriptor: "dark carbon 4x16 subway tile backsplash in staggered layout" },
  { slug: "bs-baker-herringbone-white", subcategorySlug: "backsplash", name: "Baker Blvd Herringbone - White", price: 425, swatchUrl: "/swatches/backsplash/BACKSPLASH---BAKER-BLVD-HERRINGBONE-MATTE-MOSAIC---WHITE.jpg", swatchColor: "#F5F5F5", promptDescriptor: "white matte herringbone mosaic tile backsplash", nudge: "Interior designer favorite" },
  { slug: "bs-naive-white", subcategorySlug: "backsplash", name: "Naive 3x12 - White", price: 350, swatchUrl: "/swatches/backsplash/NAIVE_BACKSPLASH_3x12_WHITE.jpg", swatchColor: "#F4F2EF", promptDescriptor: "handmade-look Naive 3x12 white tile with wavy texture in horizontal stagger" },

  // --- Kitchen Cabinet Color (5) ---
  { slug: "kitchen-cab-color-driftwood", subcategorySlug: "kitchen-cabinet-color", name: "Driftwood Stain", price: 0, isDefault: true, swatchUrl: "/swatches/cabinets/COLOR__0020_DRIFTWOOD_TSP.png", swatchColor: "#B09A7E", promptDescriptor: "light Driftwood stained wood" },
  { slug: "kitchen-cab-color-white", subcategorySlug: "kitchen-cabinet-color", name: "White Paint", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---WHITE-PAINT-1.png", swatchColor: "#F5F5F2", promptDescriptor: "crisp White painted", nudge: "Most popular cabinet color" },
  { slug: "kitchen-cab-color-fog", subcategorySlug: "kitchen-cabinet-color", name: "Fog Paint", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---FOG-PAINT-1.png", swatchColor: "#B8BFC6", promptDescriptor: "soft gray Fog painted" },
  { slug: "kitchen-cab-color-onyx", subcategorySlug: "kitchen-cabinet-color", name: "Onyx Paint", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---ONYX-PAINT-1.png", swatchColor: "#1C1C1E", promptDescriptor: "deep black Onyx painted" },
  { slug: "kitchen-cab-color-admiral-blue", subcategorySlug: "kitchen-cabinet-color", name: "Admiral Blue Paint", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---ADMIRAL-BLUE-PAINT.png", swatchColor: "#1B3A5C", promptDescriptor: "rich navy Admiral Blue painted" },

  // --- Kitchen Island Cabinet Color (5) ---
  { slug: "island-color-match", subcategorySlug: "kitchen-island-cabinet-color", name: "Match to Main Kitchen Cabinet Color", price: 0, isDefault: true, promptDescriptor: "matching the main kitchen cabinet color" },
  { slug: "island-color-driftwood", subcategorySlug: "kitchen-island-cabinet-color", name: "Driftwood Stain", price: 0, swatchUrl: "/swatches/cabinets/COLOR__0020_DRIFTWOOD_TSP.png", swatchColor: "#B09A7E", promptDescriptor: "light Driftwood stained wood kitchen island" },
  { slug: "island-color-white", subcategorySlug: "kitchen-island-cabinet-color", name: "White Paint", price: 200, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---WHITE-PAINT-1.png", swatchColor: "#F5F5F2", promptDescriptor: "crisp White painted kitchen island" },
  { slug: "island-color-admiral-blue", subcategorySlug: "kitchen-island-cabinet-color", name: "Admiral Blue", price: 200, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---ADMIRAL-BLUE-PAINT.png", swatchColor: "#1B3A5C", promptDescriptor: "rich navy Admiral Blue painted kitchen island" },
  { slug: "island-color-onyx", subcategorySlug: "kitchen-island-cabinet-color", name: "Onyx Paint", price: 200, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---ONYX-PAINT-1.png", swatchColor: "#1C1C1E", promptDescriptor: "deep black Onyx painted kitchen island" },

  // --- Kitchen Cabinet Hardware (5) ---
  { slug: "hw-seaver-pull-knob-bronze", subcategorySlug: "kitchen-cabinet-hardware", name: "Seaver Pull Knob Combo - Bronze", price: 0, isDefault: true, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-HARDWARE---SEAVER-PULL-KNOB-COMBO---BRONZE-Photoroom.jpg", swatchColor: "#804A2E", promptDescriptor: "Seaver style bronze pull and knob cabinet hardware" },
  { slug: "hw-seaver-pull-knob-satin-nickel", subcategorySlug: "kitchen-cabinet-hardware", name: "Seaver Pull Knob Combo - Satin Nickel", price: 0, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-HARDWARE---SEAVER-PULL-KNOB-COMBO---SATIN-NICKEL-Photoroom.jpg", swatchColor: "#C0BDBA", promptDescriptor: "Seaver style satin nickel pull and knob cabinet hardware" },
  { slug: "hw-sedona-pull-knob-black", subcategorySlug: "kitchen-cabinet-hardware", name: "Sedona Pull Knob Combo - Black", price: 100, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-HARDWARE---SEDONA-PULL-KNOB-COMBO---BLACK-Photoroom.jpg", swatchColor: "#1A1A1A", promptDescriptor: "Sedona style matte black pull and knob cabinet hardware" },
  { slug: "hw-sedona-pulls-black", subcategorySlug: "kitchen-cabinet-hardware", name: "Sedona All Pulls - Black", price: 200, swatchUrl: "/swatches/cabinets/bathroom-cabinet-hardware---sedona-all-pulls---black.png", swatchColor: "#1A1A1A", promptDescriptor: "Sedona style all-pull matte black cabinet hardware", nudge: "Modern minimalist choice" },
  { slug: "hw-key-grande-pulls-brushed-gold", subcategorySlug: "kitchen-cabinet-hardware", name: "Key Grande All Pulls - Brushed Gold", price: 300, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-HARDWARE---KEY-GRANDE-ALL-PULLS---BRUSHED-GOLD-Photoroom.jpg", swatchColor: "#CCBA78", promptDescriptor: "Key Grande style all-pull brushed gold cabinet hardware" },

  // --- Kitchen Sink (4) ---
  { slug: "sink-high-divide-60-40", subcategorySlug: "kitchen-sink", name: "High Divide 60/40 Stainless Undermount", price: 0, isDefault: true, swatchUrl: "/swatches/sinks/KITCHEN-SINK---HIGH-DIVIDE-60-40-STAINLESS-UNDERMOUNT-SINK.jpg", swatchColor: "#C8C8C8", promptDescriptor: "stainless steel undermount 60/40 double bowl kitchen sink with high divider" },
  { slug: "sink-single-bowl-stainless", subcategorySlug: "kitchen-sink", name: "Single Bowl Stainless Undermount", price: 650, swatchUrl: "/swatches/sinks/KITCHEN-SINK---UPGRADE-TO-SINGLE-BOWL-STAINLESS-UNDERMOUNT-SINK.jpg", swatchColor: "#C8C8C8", promptDescriptor: "large single bowl stainless steel undermount kitchen sink" },
  { slug: "sink-stainless-farmhouse", subcategorySlug: "kitchen-sink", name: "Stainless Steel Farmhouse Sink", price: 750, swatchUrl: "/swatches/sinks/KITCHEN-SINK---UPGRADE-TO-STAINLESS-STEEL-FARMHOUSE-SINK.jpg", swatchColor: "#C8C8C8", promptDescriptor: "stainless steel farmhouse apron-front kitchen sink", nudge: "Trending in new construction" },
  { slug: "sink-fireclay-farmhouse", subcategorySlug: "kitchen-sink", name: "Fireclay Farmhouse Sink", price: 1395, swatchUrl: "/swatches/sinks/farmhouse-sink.png", swatchColor: "#F5F3EE", promptDescriptor: "white fireclay smooth front farmhouse apron kitchen sink" },

  // --- Kitchen Faucet (4) ---
  { slug: "faucet-pfirst-ss", subcategorySlug: "kitchen-faucet", name: "Pfirst Pull Down - Stainless Steel", price: 0, isDefault: true, swatchUrl: "/swatches/faucets/Pfirst-Pull-Down-Stainless-Steel-Photoroom.jpg", swatchColor: "#C8C8C8", promptDescriptor: "Pfirst stainless steel pull-down kitchen faucet" },
  { slug: "faucet-colfax-black", subcategorySlug: "kitchen-faucet", name: "Colfax - Matte Black", price: 350, swatchUrl: "/swatches/faucets/Colfax-Matte-Black-Photoroom.jpg", swatchColor: "#1A1A1A", promptDescriptor: "Colfax matte black pull-down kitchen faucet" },
  { slug: "faucet-stellen-ss", subcategorySlug: "kitchen-faucet", name: "Stellen - Stainless Steel", price: 350, swatchUrl: "/swatches/faucets/KITCHEN-FAUCET---STELLEN---STAINLESS-STEEL-Photoroom-2.jpg", swatchColor: "#C8C8C8", promptDescriptor: "Stellen stainless steel pull-down kitchen faucet with spring spout" },
  { slug: "faucet-brislin-ss", subcategorySlug: "kitchen-faucet", name: "Brislin Culinary - Stainless Steel", price: 450, swatchUrl: "/swatches/faucets/Brislin-Culinary-Stainless-Steel-Photoroom-1.jpg", swatchColor: "#C8C8C8", promptDescriptor: "Brislin Culinary professional-style stainless steel kitchen faucet with coil spring", nudge: "Professional-grade upgrade" },

  // --- Refrigerator (4) ---
  { slug: "refrigerator-none", subcategorySlug: "refrigerator", name: "No Refrigerator", price: 0, isDefault: true, promptDescriptor: "empty refrigerator alcove" },
  { slug: "refrigerator-ge-side-by-side", subcategorySlug: "refrigerator", name: "GE Side by Side", price: 1800, swatchUrl: "/swatches/appliances/GE-25.3-CU-FT-SIDE-BY-SIDE-REFRIGERATOR-Photoroom.jpg", swatchColor: "#C8C8C8", promptDescriptor: "GE stainless steel side-by-side refrigerator" },
  { slug: "refrigerator-ge-french-door", subcategorySlug: "refrigerator", name: "GE French Door", price: 3000, swatchUrl: "/swatches/appliances/GE-ENERGY-STAR-22.1-CU-FT-COUNTER-DEPTH-FRENCH-DOOR-REFRIGERATOR-Photoroom.jpg", swatchColor: "#C8C8C8", promptDescriptor: "GE stainless steel French door refrigerator", nudge: "Most requested appliance upgrade" },
  { slug: "refrigerator-ge-french-door-drawer", subcategorySlug: "refrigerator", name: "GE French Door with Drawer", price: 3500, swatchUrl: "/swatches/appliances/GE-PROFILE-ENERGY-STAR-29-CU-FT-SMART-4-DOOR-FRENCH-DOOR-REFRIGERATOR-WITH-DOOR-IN-DOOR-Photoroom.jpg", swatchColor: "#C8C8C8", promptDescriptor: "GE stainless steel French door refrigerator with bottom freezer drawer" },

  // --- Range (3) ---
  { slug: "range-ge-included-freestanding", subcategorySlug: "range", name: "GE Included Gas Freestanding Range", price: 0, isDefault: true, swatchUrl: "/swatches/appliances/GE-30-INCH-FREE-STANDING-GAS-RANGE-Photoroom.jpg", swatchColor: "#C8C8C8", promptDescriptor: "standard GE gas freestanding range with raised backguard panel behind the burners and front controls" },
  { slug: "range-ge-gas-slide-in", subcategorySlug: "range", name: "GE Gas Slide In Range", price: 500, swatchUrl: "/swatches/appliances/GE-30-INCH-SLIDE-IN-FRONT-CONTROL-GAS-RANGE-Photoroom.jpg", swatchColor: "#C8C8C8", promptDescriptor: "GE stainless steel gas slide-in range — NO backguard, no raised back panel, the cooktop sits flush and level with the countertop on all sides, backsplash is visible directly behind the range", nudge: "Most popular cooking upgrade" },
  { slug: "range-ge-gas-slide-in-convection", subcategorySlug: "range", name: "GE Gas Slide In Convection Range", price: 800, swatchUrl: "/swatches/appliances/GE-30-INCH-SLIDE-IN-FRONT-CONTROL-CONVECTION-GAS-RANGE-Photoroom-(3).jpg", swatchColor: "#C8C8C8", promptDescriptor: "GE stainless steel gas slide-in convection range — NO backguard, no raised back panel, the cooktop sits flush and level with the countertop on all sides, backsplash is visible directly behind the range" },

  // ============ Step 3: Primary Bath ============

  // --- Primary Bath Cabinet Color (5) ---
  { slug: "primary-bath-cab-driftwood", subcategorySlug: "primary-bath-cabinet-color", name: "Driftwood Stain", price: 0, isDefault: true, swatchUrl: "/swatches/cabinets/COLOR__0020_DRIFTWOOD_TSP.png" },
  { slug: "primary-bath-cab-white", subcategorySlug: "primary-bath-cabinet-color", name: "White Paint", price: 150, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---WHITE-PAINT-1.png" },
  { slug: "primary-bath-cab-fog", subcategorySlug: "primary-bath-cabinet-color", name: "Fog Paint", price: 150, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---FOG-PAINT-1.png" },
  { slug: "primary-bath-cab-onyx", subcategorySlug: "primary-bath-cabinet-color", name: "Onyx Paint", price: 150, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---ONYX-PAINT-1.png" },
  { slug: "primary-bath-cab-admiral-blue", subcategorySlug: "primary-bath-cabinet-color", name: "Admiral Blue Paint", price: 150, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---ADMIRAL-BLUE-PAINT.png" },

  // --- Bathroom Cabinet Hardware (5) ---
  { slug: "bath-hw-seaver-bronze", subcategorySlug: "bathroom-cabinet-hardware", name: "Seaver Pull Knob Combo - Bronze", price: 0, isDefault: true, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-HARDWARE---SEAVER-PULL-KNOB-COMBO---BRONZE-Photoroom.jpg", swatchColor: "#804A2E" },
  { slug: "bath-hw-seaver-satin-nickel", subcategorySlug: "bathroom-cabinet-hardware", name: "Seaver Pull Knob Combo - Satin Nickel", price: 0, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-HARDWARE---SEAVER-PULL-KNOB-COMBO---SATIN-NICKEL-Photoroom.jpg", swatchColor: "#C0BDBA" },
  { slug: "bath-hw-sedona-black", subcategorySlug: "bathroom-cabinet-hardware", name: "Sedona Pull Knob Combo - Black", price: 100, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-HARDWARE---SEDONA-PULL-KNOB-COMBO---BLACK-Photoroom.jpg", swatchColor: "#1A1A1A" },
  { slug: "bath-hw-sedona-pulls-black", subcategorySlug: "bathroom-cabinet-hardware", name: "Sedona All Pulls - Black", price: 200, swatchUrl: "/swatches/cabinets/bathroom-cabinet-hardware---sedona-all-pulls---black.png", swatchColor: "#1A1A1A" },
  { slug: "bath-hw-dominique-brushed-gold", subcategorySlug: "bathroom-cabinet-hardware", name: "Dominique All Pulls - Brushed Gold", price: 250, swatchUrl: "/swatches/cabinets/bathroom-cabinet-hardware---dominique-all-pulls---brushed-gold.png", swatchColor: "#CCBA78" },

  // --- Primary Bath Mirrors (3) ---
  { slug: "pri-mirror-49-gunmetal", subcategorySlug: "primary-bath-mirrors", name: "Style 49 Gunmetal Nickel", price: 0, isDefault: true, swatchUrl: "/swatches/mirrors/SECONDARY-BATH-MIRRORS---STYLE-49-GUNMETAL-NICKEL.jpg" },
  { slug: "pri-mirror-897-black", subcategorySlug: "primary-bath-mirrors", name: "Style 897 Black", price: 75, swatchUrl: "/swatches/mirrors/SECONDARY-BATH-MIRRORS---STYLE-897-BLACK-Photoroom.jpg" },
  { slug: "pri-mirror-fc30-black", subcategorySlug: "primary-bath-mirrors", name: "Style FC30 Round Black", price: 300, swatchUrl: "/swatches/mirrors/SECONDARY-BATH-MIRRORS---STYLE-FC30-ROUND-BLACK-Photoroom.jpg" },

  // --- Floor Tile Color (5) ---
  { slug: "floor-tile-omega-bone", subcategorySlug: "floor-tile-color", name: "Omega 13x13 - Bone", price: 0, isDefault: true, swatchUrl: "/swatches/floor-tile/FLOOR-TILE-COLOR---OMEGA-13X13---BONE.jpg" },
  { slug: "floor-tile-omega-silver", subcategorySlug: "floor-tile-color", name: "Omega 13x13 - Silver", price: 0, swatchUrl: "/swatches/floor-tile/FLOOR-TILE-COLOR---OMEGA-13X13---SILVER.jpg" },
  { slug: "floor-tile-omega-grey", subcategorySlug: "floor-tile-color", name: "Omega 13x13 - Grey", price: 0, swatchUrl: "/swatches/floor-tile/Omega-Gray-Floor-Tile-1.jpg" },
  { slug: "floor-tile-infinity-calacatta", subcategorySlug: "floor-tile-color", name: "Infinity 12x24 - Calacatta", price: 1300, swatchUrl: "/swatches/floor-tile/FLOOR-TILE-COLOR---INFINITY-12X24---CALACATTA.jpg" },
  { slug: "floor-tile-onyx-white", subcategorySlug: "floor-tile-color", name: "Onyx 12x24 Matte - White", price: 2000, swatchUrl: "/swatches/floor-tile/FLOOR-TILE-COLOR---ONYX-12X24-MATTE---WHITE.jpg" },

  // --- Primary Shower (4) ---
  { slug: "pri-shower-omega-bone-square", subcategorySlug: "primary-shower", name: "Omega 13x13 - Bone - Square Floor", price: 0, isDefault: true, swatchUrl: "/swatches/shower-tile/primary-shower-tile---omega-13x13---bone---khaki-outline-square-floor.png" },
  { slug: "pri-shower-omega-silver-square", subcategorySlug: "primary-shower", name: "Omega 13x13 - Silver - Square Floor", price: 0, swatchUrl: "/swatches/shower-tile/primary-shower-tile---omega-13x13---silver---concrete-outline-square-floor.png" },
  { slug: "pri-shower-infinity-v-calacatta", subcategorySlug: "primary-shower", name: "Infinity 12x24 - Calacatta", price: 1250, swatchUrl: "/swatches/shower-tile/PRIMARY-SHOWER-TILE---INFINITY-12X24---CALACATTA---2X2-MATCH-FLOOR.jpg" },
  { slug: "pri-shower-sphinx-h-white", subcategorySlug: "primary-shower", name: "Sphinx 12x24 - White", price: 1400, swatchUrl: "/swatches/shower-tile/PRIMARY-SHOWER-TILE---SPHINX-12X24---WHITE---HEXAGON-CALACATTA-FLOOR.jpg" },

  // --- Bath Faucets (3) ---
  { slug: "bath-faucet-weller-bn", subcategorySlug: "bath-faucets", name: "Weller - Brushed Nickel", price: 0, isDefault: true, swatchUrl: "/swatches/faucets/Weller-Faucet-Brushed-Nickel-Photoroom.jpg" },
  { slug: "bath-faucet-weller-black", subcategorySlug: "bath-faucets", name: "Weller - Matte Black", price: 750, swatchUrl: "/swatches/faucets/Weller-Faucet-Matte-Black-Photoroom.jpg" },
  { slug: "bath-faucet-holliston-bn", subcategorySlug: "bath-faucets", name: "Holliston - Brushed Nickel", price: 1015, swatchUrl: "/swatches/faucets/Holliston-Faucet-Brushed-Nickel-Photoroom.jpg" },

  // --- Bath Hardware (3) ---
  { slug: "bath-hw-miraloma-sn", subcategorySlug: "bath-hardware", name: "Miraloma Park - Satin Nickel", price: 0, isDefault: true, swatchUrl: "/swatches/bath-hardware/bath-hardware---miraloma-park---satin-nickel.png" },
  { slug: "bath-hw-miraloma-black", subcategorySlug: "bath-hardware", name: "Miraloma Park - Black", price: 250, swatchUrl: "/swatches/bath-hardware/bath-hardware---miraloma-park---black.png" },
  { slug: "bath-hw-tiburon-sn", subcategorySlug: "bath-hardware", name: "Tiburon - Satin Nickel", price: 500, swatchUrl: "/swatches/bath-hardware/bath-hardware---tiburion---satin-nickel.png" },

  // ============ Step 4: Secondary Spaces ============

  // --- Secondary Bath Cabinet Color (5) ---
  { slug: "secondary-bath-cab-driftwood", subcategorySlug: "secondary-bath-cabinet-color", name: "Driftwood Stain", price: 0, isDefault: true, swatchUrl: "/swatches/cabinets/COLOR__0020_DRIFTWOOD_TSP.png" },
  { slug: "secondary-bath-cab-white", subcategorySlug: "secondary-bath-cabinet-color", name: "White Paint", price: 150, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---WHITE-PAINT-1.png" },
  { slug: "secondary-bath-cab-fog", subcategorySlug: "secondary-bath-cabinet-color", name: "Fog Paint", price: 150, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---FOG-PAINT-1.png" },
  { slug: "secondary-bath-cab-onyx", subcategorySlug: "secondary-bath-cabinet-color", name: "Onyx Paint", price: 150, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---ONYX-PAINT-1.png" },
  { slug: "secondary-bath-cab-admiral-blue", subcategorySlug: "secondary-bath-cabinet-color", name: "Admiral Blue Paint", price: 150, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---ADMIRAL-BLUE-PAINT.png" },

  // --- Door Hardware (4) ---
  { slug: "door-hw-miraloma-sn", subcategorySlug: "door-hardware", name: "Miraloma Park Knob - Satin Nickel", price: 0, isDefault: true, swatchUrl: "/swatches/door-hardware/DOOR-HARDWARE---MIRALOMA-PARK-KNOB---SATIN-NICKEL.jpg" },
  { slug: "door-hw-miraloma-black", subcategorySlug: "door-hardware", name: "Miraloma Park Knob - Black", price: 100, swatchUrl: "/swatches/door-hardware/DOOR-HARDWARE---MIRALOMA-PARK-KNOB---BLACK.jpg" },
  { slug: "door-hw-lombard-sn", subcategorySlug: "door-hardware", name: "Lombard Lever - Satin Nickel", price: 200, swatchUrl: "/swatches/door-hardware/DOOR-HARDWARE---LOMBARD-LEVER---SATIN-NICKEL.jpg" },
  { slug: "door-hw-lombard-black", subcategorySlug: "door-hardware", name: "Lombard Lever - Black", price: 250, swatchUrl: "/swatches/door-hardware/DOOR-HARDWARE---LOMBARD-LEVER---BLACK.jpg" },

  // --- Finishing Touches ---
  // Front Door (3)
  { slug: "standard-front-door", subcategorySlug: "front-door", name: "Standard 6-Panel", price: 0, isDefault: true },
  { slug: "craftsman-front-door", subcategorySlug: "front-door", name: "Craftsman Entry Door", price: 650 },
  { slug: "full-glass-front-door", subcategorySlug: "front-door", name: "Full Glass Panel Entry", price: 1200 },
  // Garage Door Keypad (2)
  { slug: "no-garage-keypad", subcategorySlug: "garage-door-keypad", name: "No Keypad", price: 0, isDefault: true },
  { slug: "garage-keypad", subcategorySlug: "garage-door-keypad", name: "Wireless Keypad", price: 85 },
  // Window Screens (2)
  { slug: "no-window-screens", subcategorySlug: "window-screens", name: "No Screens", price: 0, isDefault: true },
  { slug: "full-house-screens", subcategorySlug: "window-screens", name: "Full House Window Screens", price: 950 },
  // Blinds (3)
  { slug: "no-blinds", subcategorySlug: "blinds", name: "No Blinds", price: 0, isDefault: true },
  { slug: "faux-wood-blinds", subcategorySlug: "blinds", name: "Faux Wood Blinds (Whole House)", price: 2800 },
  { slug: "cordless-cellular-shades", subcategorySlug: "blinds", name: "Cordless Cellular Shades", price: 3500 },
  // Toilet Upgrade (2)
  { slug: "standard-toilet", subcategorySlug: "toilet-upgrade", name: "Standard Height", price: 0, isDefault: true },
  { slug: "comfort-height-toilet", subcategorySlug: "toilet-upgrade", name: "Comfort Height (All Baths)", price: 350 },
];

// ---------- Steps ----------

const STEP_TEMPLATES = [
  {
    name: "Set Your Style",
    slug: "set-your-style",
    subtitle: "Choose the foundation finishes for your home",
    sections: [
      { title: "Cabinets", subcategorySlugs: ["cabinet-style-whole-house"] },
      { title: "Flooring", subcategorySlugs: ["main-area-flooring-type", "main-area-flooring-color", "carpet-color"] },
      { title: "Paint & Trim", subcategorySlugs: ["common-wall-paint", "baseboard", "crown-options", "interior-door-style"] },
      { title: "Fireplace & Lighting", subcategorySlugs: ["fireplace-mantel", "lighting", "great-room-fan", "bedroom-fan"] },
    ],
  },
  {
    name: "Design Your Kitchen",
    slug: "design-your-kitchen",
    subtitle: "Customize your kitchen surfaces and fixtures",
    sections: [
      { title: "Surfaces", subcategorySlugs: ["counter-top", "backsplash"] },
      { title: "Cabinets", subcategorySlugs: ["kitchen-cabinet-color", "kitchen-island-cabinet-color", "kitchen-cabinet-hardware"] },
      { title: "Sink & Faucet", subcategorySlugs: ["kitchen-sink", "kitchen-faucet"] },
      { title: "Appliances", subcategorySlugs: ["refrigerator", "range"] },
    ],
  },
  {
    name: "Primary Bath",
    slug: "primary-bath",
    subtitle: "Design your primary bathroom",
    sections: [
      { title: "Vanity", subcategorySlugs: ["primary-bath-cabinet-color", "bathroom-cabinet-hardware", "primary-bath-mirrors"] },
      { title: "Tile", subcategorySlugs: ["floor-tile-color", "primary-shower"] },
      { title: "Fixtures", subcategorySlugs: ["bath-faucets", "bath-hardware"] },
    ],
  },
  {
    name: "Secondary Spaces",
    slug: "secondary-spaces",
    subtitle: "Finish your secondary bath and other rooms",
    sections: [
      { title: "Secondary Bath", subcategorySlugs: ["secondary-bath-cabinet-color"] },
      { title: "Hardware", subcategorySlugs: ["door-hardware"] },
    ],
  },
  {
    name: "Finishing Touches",
    slug: "finishing-touches",
    subtitle: "Doors, blinds, and final details",
    sections: [
      { title: "Exterior & Doors", subcategorySlugs: ["front-door", "garage-door-keypad", "window-screens"] },
      { title: "Interior", subcategorySlugs: ["blinds", "toilet-upgrade"] },
    ],
  },
];

// ---------- Room photos ----------

const ROOM_PHOTO_SPATIAL_HINTS: Record<string, string> = {
  "greatroom-wide.webp":
    "Great room is foreground, kitchen is background. Fireplace wall, trim, and paint are primary editable surfaces in the living area; kitchen cabinetry remains separate unless explicitly selected. Keep chandelier/fan positions and room layout unchanged.",
  "kitchen-close.webp":
    "Large island dominates the foreground with sink + faucet on the island; keep sink cutout and faucet direction fixed. Perimeter cabinets, backsplash, and range are on the back wall; refrigerator stays in its alcove. Dishwasher remains next to the sink; do not alter cabinet panel geometry.",
  "primary-bath-vanity.webp":
    "Double vanity and mirrors are on the left; shower zone is on the right. Vanity color/hardware/faucet edits apply only to the vanity assembly; mirror edits apply only above sinks. Keep tile confined to bathroom floor/shower surfaces and preserve shower glass geometry.",
  "secondary-bedroom.webp":
    "Carpeted secondary bedroom with dormer nook. Ceiling fan centered in main area; keep fan position fixed. Window is recessed in the dormer alcove — preserve window and dormer geometry. Carpet covers the entire floor. White baseboards run along all walls. Wall paint and trim edits apply to all wall surfaces. Do not alter room shape or dormer proportions.",
};

type RoomPhotoDef = {
  stepSlug: string;
  file: string;
  isHero: boolean;
  sortOrder: number;
  label: string;
  spatialHint: string | null;
  photoBaseline: string | null;
  /** Subcategory slugs that are in scope for this photo's generation */
  scopeSlugs: string[];
};

const ROOM_PHOTOS: RoomPhotoDef[] = [
  {
    stepSlug: "set-your-style",
    file: "greatroom-wide.webp",
    isHero: true,
    sortOrder: 0,
    label: "Living Room",
    spatialHint: ROOM_PHOTO_SPATIAL_HINTS["greatroom-wide.webp"],
    photoBaseline: null,
    scopeSlugs: [
      "cabinet-style-whole-house", "main-area-flooring-type", "main-area-flooring-color",
      "common-wall-paint", "baseboard", "crown-options", "interior-door-style",
      "fireplace-mantel", "lighting", "great-room-fan",
      "kitchen-cabinet-color", "kitchen-island-cabinet-color", "kitchen-cabinet-hardware", "kitchen-faucet",
    ],
  },
  {
    stepSlug: "design-your-kitchen",
    file: "kitchen-close.webp",
    isHero: true,
    sortOrder: 0,
    label: "Kitchen",
    spatialHint: ROOM_PHOTO_SPATIAL_HINTS["kitchen-close.webp"],
    photoBaseline: null,
    scopeSlugs: [
      "cabinet-style-whole-house", "counter-top", "backsplash",
      "kitchen-cabinet-color", "kitchen-island-cabinet-color", "kitchen-cabinet-hardware",
      "kitchen-sink", "kitchen-faucet", "refrigerator", "range",
      "main-area-flooring-type", "main-area-flooring-color", "common-wall-paint",
    ],
  },
  {
    stepSlug: "primary-bath",
    file: "primary-bath-vanity.webp",
    isHero: true,
    sortOrder: 0,
    label: "Bathroom",
    spatialHint: ROOM_PHOTO_SPATIAL_HINTS["primary-bath-vanity.webp"],
    photoBaseline: null,
    scopeSlugs: [
      "primary-bath-cabinet-color", "bathroom-cabinet-hardware", "primary-bath-mirrors",
      "floor-tile-color", "bath-faucets", "bath-hardware",
    ],
  },
  {
    stepSlug: "secondary-spaces",
    file: "secondary-bedroom.webp",
    isHero: true,
    sortOrder: 0,
    label: "Bedroom",
    spatialHint: ROOM_PHOTO_SPATIAL_HINTS["secondary-bedroom.webp"],
    photoBaseline: null,
    scopeSlugs: [
      "carpet-color", "common-wall-paint", "baseboard", "bedroom-fan",
    ],
  },
];

// ---------- Helpers ----------

function mimeFromExt(ext: string): string {
  const e = ext.toLowerCase();
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "png") return "image/png";
  if (e === "webp") return "image/webp";
  if (e === "svg") return "image/svg+xml";
  return `image/${e}`;
}

/** Collect all unique swatch paths referenced by options */
function collectSwatchPaths(): Set<string> {
  const paths = new Set<string>();
  for (const opt of OPTIONS) {
    if (opt.swatchUrl?.startsWith("/swatches/")) {
      paths.add(opt.swatchUrl);
    }
  }
  return paths;
}

// ---------- Main ----------

async function main() {
  if (DRY_RUN) console.log("=== DRY RUN — no DB changes ===\n");

  console.log(`Seeding Wren Homes demo org...\n`);

  // 1. Upsert org
  console.log("--- 1. Organization ---");
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .upsert(
      {
        name: ORG_NAME,
        slug: ORG_SLUG,
        primary_color: ORG_PRIMARY_COLOR,
        secondary_color: ORG_SECONDARY_COLOR,
        generation_cap_per_session: GENERATION_CAP,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (orgErr || !org) {
    console.error("Failed to upsert org:", orgErr);
    process.exit(1);
  }
  const orgId = org.id;
  console.log(`  ${ORG_NAME} (${orgId})`);

  // 2. Upsert floorplans
  console.log("\n--- 2. Floorplans ---");
  const floorplanIds = new Map<string, string>();

  for (const fp of FLOORPLANS) {
    const { data, error } = await supabase
      .from("floorplans")
      .upsert(
        { org_id: orgId, name: fp.name, slug: fp.slug, is_active: fp.isActive },
        { onConflict: "org_id,slug" }
      )
      .select("id")
      .single();

    if (error || !data) {
      console.error(`  Failed to upsert floorplan ${fp.name}:`, error);
      process.exit(1);
    }
    floorplanIds.set(fp.slug, data.id);
    console.log(`  ${fp.name} (${data.id}) — ${fp.isActive ? "active" : "inactive"}`);
  }

  // 3. Upload cover images for floorplans
  console.log("\n--- 3. Cover images ---");
  const roomsDir = path.join(process.cwd(), "public", "rooms");

  for (const fp of FLOORPLANS) {
    const fpId = floorplanIds.get(fp.slug)!;
    const localPath = path.join(roomsDir, fp.coverPhoto);
    if (!existsSync(localPath)) {
      console.warn(`  Skipped cover for ${fp.name}: ${fp.coverPhoto} not found`);
      continue;
    }
    const ext = path.extname(fp.coverPhoto).slice(1);
    const storagePath = `${orgId}/floorplans/${fpId}.${ext}`;

    const buffer = await readFile(localPath);
    const { error: uploadErr } = await supabase.storage
      .from("rooms")
      .upload(storagePath, buffer, { contentType: mimeFromExt(ext), upsert: true });

    if (uploadErr) {
      console.warn(`  Upload failed for ${fp.name} cover:`, uploadErr.message);
    } else {
      await supabase.from("floorplans").update({ cover_image_path: storagePath }).eq("id", fpId);
      console.log(`  ${fp.name} → ${storagePath}`);
    }
  }

  // 4. Upsert categories
  console.log("\n--- 4. Categories ---");
  const categoryRows = CATEGORIES.map((cat, i) => ({
    slug: cat.slug,
    org_id: orgId,
    name: cat.name,
    sort_order: i,
  }));

  const { error: catErr } = await supabase
    .from("categories")
    .upsert(categoryRows, { onConflict: "org_id,slug" });
  if (catErr) {
    console.error("Failed to upsert categories:", catErr);
    process.exit(1);
  }
  console.log(`  ${categoryRows.length} categories`);

  // Fetch category slug → UUID
  const { data: catLookup } = await supabase
    .from("categories")
    .select("id, slug")
    .eq("org_id", orgId);
  const catSlugToId = new Map((catLookup ?? []).map((c) => [c.slug, c.id as string]));

  // 5. Upsert subcategories
  console.log("\n--- 5. Subcategories ---");
  const subcategoryRows = SUBCATEGORIES.map((sub, i) => {
    const catId = catSlugToId.get(sub.categorySlug);
    if (!catId) {
      console.error(`No category UUID for: ${sub.categorySlug}`);
      process.exit(1);
    }
    return {
      slug: sub.slug,
      category_id: catId,
      org_id: orgId,
      name: sub.name,
      is_visual: sub.isVisual,
      is_additive: false,
      generation_hint: sub.generationHint ?? null,
      sort_order: i,
    };
  });

  const { error: subErr } = await supabase
    .from("subcategories")
    .upsert(subcategoryRows, { onConflict: "org_id,slug" });
  if (subErr) {
    console.error("Failed to upsert subcategories:", subErr);
    process.exit(1);
  }
  console.log(`  ${subcategoryRows.length} subcategories`);

  // Fetch subcategory slug → UUID
  const { data: subLookup } = await supabase
    .from("subcategories")
    .select("id, slug")
    .eq("org_id", orgId);
  const subSlugToId = new Map((subLookup ?? []).map((s) => [s.slug, s.id as string]));

  // 6. Upsert options
  console.log("\n--- 6. Options ---");
  const optionRows = OPTIONS.map((opt, i) => {
    const subId = subSlugToId.get(opt.subcategorySlug);
    if (!subId) {
      console.error(`No subcategory UUID for: ${opt.subcategorySlug}`);
      process.exit(1);
    }
    return {
      slug: opt.slug,
      subcategory_id: subId,
      org_id: orgId,
      name: opt.name,
      price: opt.price,
      is_default: opt.isDefault ?? false,
      prompt_descriptor: opt.promptDescriptor ?? null,
      swatch_url: opt.swatchUrl ?? null,
      swatch_color: opt.swatchColor ?? null,
      nudge: opt.nudge ?? null,
      sort_order: i,
    };
  });

  const { error: optErr } = await supabase
    .from("options")
    .upsert(optionRows, { onConflict: "org_id,slug" });
  if (optErr) {
    console.error("Failed to upsert options:", optErr);
    process.exit(1);
  }
  console.log(`  ${optionRows.length} options`);

  // 7. Upload referenced swatches → update swatch_url to Storage URLs
  console.log("\n--- 7. Swatches ---");
  const swatchPaths = collectSwatchPaths();
  const swatchesDir = path.join(process.cwd(), "public", "swatches");
  let uploadedSwatches = 0;
  const failedSwatchPaths = new Set<string>();

  for (const swatchPath of swatchPaths) {
    // swatchPath is like "/swatches/cabinets/FOO.jpg"
    const relativePath = swatchPath.slice("/swatches/".length);
    const localPath = path.join(swatchesDir, relativePath);
    if (!existsSync(localPath)) {
      console.warn(`  Swatch not found: ${localPath}`);
      failedSwatchPaths.add(swatchPath);
      continue;
    }

    const storagePath = `${orgId}/${relativePath}`;
    const ext = path.extname(relativePath).slice(1);
    const buffer = await readFile(localPath);
    const { error: uploadErr } = await supabase.storage
      .from("swatches")
      .upload(storagePath, buffer, { contentType: mimeFromExt(ext), upsert: true });

    if (uploadErr && !uploadErr.message?.includes("already exists")) {
      console.warn(`  Upload failed: ${relativePath} — ${uploadErr.message}`);
      failedSwatchPaths.add(swatchPath);
    } else {
      uploadedSwatches++;
    }
  }
  console.log(`  Uploaded: ${uploadedSwatches} swatches`);

  // Update option swatch_urls to full Storage public URLs
  console.log("\n--- 7b. Updating swatch URLs ---");
  const { data: optionsToUpdate } = await supabase
    .from("options")
    .select("id, swatch_url")
    .eq("org_id", orgId)
    .not("swatch_url", "is", null);

  let updatedUrls = 0;
  for (const opt of optionsToUpdate ?? []) {
    if (!opt.swatch_url || opt.swatch_url.startsWith("http")) continue;
    if (failedSwatchPaths.has(opt.swatch_url)) continue;

    let relativePath = opt.swatch_url;
    if (relativePath.startsWith("/swatches/")) {
      relativePath = relativePath.slice("/swatches/".length);
    }

    const storagePath = `${orgId}/${relativePath}`;
    const { data: { publicUrl } } = supabase.storage
      .from("swatches")
      .getPublicUrl(storagePath);

    const { error: updateErr } = await supabase
      .from("options")
      .update({ swatch_url: publicUrl })
      .eq("id", opt.id);

    if (!updateErr) updatedUrls++;
  }
  console.log(`  Updated: ${updatedUrls} swatch URLs`);

  // 8. Upsert steps with sections (only for The Nest floorplan)
  console.log("\n--- 8. Steps ---");
  const nestFloorplanId = floorplanIds.get("nest")!;
  const stepIdMap = new Map<string, string>();

  // Fetch existing steps to preserve IDs
  const { data: existingSteps } = await supabase
    .from("steps")
    .select("id, slug")
    .eq("floorplan_id", nestFloorplanId);
  const existingStepMap = new Map((existingSteps ?? []).map((s) => [s.slug, s.id as string]));

  for (let i = 0; i < STEP_TEMPLATES.length; i++) {
    const tmpl = STEP_TEMPLATES[i];

    // Store slugs (not UUIDs) — the picker's subCategoryMap is keyed by slug
    const sections = tmpl.sections.map((sec, j) => ({
      title: sec.title,
      subcategory_ids: sec.subcategorySlugs.map((slug) => {
        if (!subSlugToId.has(slug)) {
          console.error(`No subcategory found for: ${slug}`);
          process.exit(1);
        }
        return slug;
      }),
      sort_order: j,
    }));

    const stepRow = {
      floorplan_id: nestFloorplanId,
      org_id: orgId,
      slug: tmpl.slug,
      number: i + 1,
      name: tmpl.name,
      subtitle: tmpl.subtitle,
      hero_image: null,
      hero_variant: "full" as const,
      show_generate_button: false,
      scene_description: null,
      also_include_ids: [] as string[],
      photo_baseline: null,
      sort_order: i,
      sections,
    };

    const existingId = existingStepMap.get(tmpl.slug);
    const upsertRow = existingId ? { id: existingId, ...stepRow } : stepRow;

    const { data: stepData, error: stepErr } = await supabase
      .from("steps")
      .upsert(upsertRow, { onConflict: existingId ? "id" : "floorplan_id,slug" })
      .select("id, slug")
      .single();

    if (stepErr || !stepData) {
      console.error(`Failed to upsert step ${tmpl.slug}:`, stepErr);
      process.exit(1);
    }
    stepIdMap.set(stepData.slug, stepData.id);
  }
  console.log(`  ${STEP_TEMPLATES.length} steps`);

  // 9. Upload room photos to Storage
  console.log("\n--- 9. Room photos ---");
  for (const photo of ROOM_PHOTOS) {
    const stepId = stepIdMap.get(photo.stepSlug);
    if (!stepId) {
      console.error(`  Step not found: ${photo.stepSlug}`);
      continue;
    }

    const localPath = path.join(roomsDir, photo.file);
    if (!existsSync(localPath)) {
      console.warn(`  Room photo not found: ${photo.file}`);
      continue;
    }

    const storagePath = `${orgId}/rooms/${stepId}/${photo.file}`;
    const ext = path.extname(photo.file).slice(1);
    const buffer = await readFile(localPath);
    const { error: uploadErr } = await supabase.storage
      .from("rooms")
      .upload(storagePath, buffer, { contentType: mimeFromExt(ext), upsert: true });

    if (uploadErr) {
      console.error(`  Upload failed for ${photo.file}:`, uploadErr.message);
    } else {
      console.log(`  Uploaded: ${storagePath}`);
    }
  }

  // 10. Upsert step_photos
  console.log("\n--- 10. Step photos ---");

  // Build valid photo keys for orphan cleanup
  const validPhotoKeys = new Set(
    ROOM_PHOTOS.map((photo) => {
      const stepId = stepIdMap.get(photo.stepSlug)!;
      return `${stepId}:${orgId}/rooms/${stepId}/${photo.file}`;
    })
  );

  // Delete orphaned step_photos first
  const { data: allPhotos } = await supabase
    .from("step_photos")
    .select("id, step_id, image_path, label")
    .eq("org_id", orgId);

  let deletedOrphans = 0;
  for (const p of allPhotos ?? []) {
    const key = `${p.step_id}:${p.image_path}`;
    if (!validPhotoKeys.has(key)) {
      await supabase.from("step_photos").delete().eq("id", p.id);
      deletedOrphans++;
    }
  }
  if (deletedOrphans > 0) console.log(`  Cleaned up ${deletedOrphans} orphaned step_photos`);

  // Check existing photos for update-in-place
  const { data: existingPhotos } = await supabase
    .from("step_photos")
    .select("id, step_id, image_path")
    .eq("org_id", orgId);
  const existingPhotoByKey = new Map(
    (existingPhotos ?? []).map((p) => [`${p.step_id}:${p.image_path}`, p.id as string])
  );

  let insertedPhotos = 0;
  let updatedPhotos = 0;

  for (const photo of ROOM_PHOTOS) {
    const stepId = stepIdMap.get(photo.stepSlug)!;
    const storagePath = `${orgId}/rooms/${stepId}/${photo.file}`;
    const key = `${stepId}:${storagePath}`;

    // Store slugs (not UUIDs) — consistent with how picker resolves them
    const subcategoryIds = photo.scopeSlugs
      .filter((slug) => subSlugToId.has(slug));

    const photoData = {
      is_hero: photo.isHero,
      sort_order: photo.sortOrder,
      label: photo.label,
      spatial_hint: photo.spatialHint,
      photo_baseline: photo.photoBaseline,
      subcategory_ids: subcategoryIds,
    };

    const existingId = existingPhotoByKey.get(key);
    if (existingId) {
      const { error: updateErr } = await supabase
        .from("step_photos")
        .update(photoData)
        .eq("id", existingId);
      if (updateErr) {
        console.error(`  Update failed for ${photo.file}:`, updateErr);
      } else {
        updatedPhotos++;
      }
    } else {
      const { error: insertErr } = await supabase
        .from("step_photos")
        .insert({
          step_id: stepId,
          org_id: orgId,
          image_path: storagePath,
          ...photoData,
        });
      if (insertErr) {
        console.error(`  Insert failed for ${photo.file}:`, insertErr);
      } else {
        insertedPhotos++;
      }
    }
  }
  console.log(`  Inserted: ${insertedPhotos}, Updated: ${updatedPhotos}`);

  // 11. Upsert generation policies
  console.log("\n--- 11. Generation policies ---");

  // Re-fetch step_photos to get IDs for policy references
  const { data: stepPhotos } = await supabase
    .from("step_photos")
    .select("id, image_path")
    .eq("org_id", orgId);

  const photoByFile = new Map(
    (stepPhotos ?? []).map((p) => [p.image_path.split("/").pop(), p.id as string])
  );

  // Kitchen policy
  const kitchenPhotoId = photoByFile.get("kitchen-close.webp");
  if (kitchenPhotoId) {
    const kitchenPolicy = {
      promptOverrides: {
        invariantRulesWhenSelected: {
          refrigerator: [
            "Refrigerator opening is reserved for the refrigerator only. Place the selected refrigerator in that opening and do NOT fill that opening with cabinets, drawers, shelves, pantry units, or countertops.",
          ],
        },
        invariantRulesWhenNotSelected: {
          refrigerator: [
            "Refrigerator opening state must match the source photo exactly: if the opening/alcove is empty, keep it empty; if it contains a refrigerator, keep that refrigerator unchanged.",
            "Never convert the refrigerator opening into cabinetry, drawers, shelves, pantry units, countertops, or trim build-outs.",
          ],
        },
      },
      secondPass: {
        reason: "demo_kitchen_slide_in_range",
        inputFidelity: "low",
        models: ["gpt-image-1.5"],
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

    const { error: kitchenPolicyErr } = await supabase
      .from("step_photo_generation_policies")
      .upsert(
        {
          org_id: orgId,
          step_photo_id: kitchenPhotoId,
          policy_key: "demo:nest:kitchen-close:v1",
          is_active: true,
          policy_json: kitchenPolicy,
        },
        { onConflict: "org_id,step_photo_id,policy_key" }
      );

    if (kitchenPolicyErr) {
      console.error("  Failed to upsert kitchen policy:", kitchenPolicyErr);
    } else {
      console.log("  Kitchen policy: demo:nest:kitchen-close:v1");
    }
  }

  // Great room policy
  const greatroomPhotoId = photoByFile.get("greatroom-wide.webp");
  if (greatroomPhotoId) {
    const greatroomPolicy = {
      promptOverrides: {
        invariantRulesAlways: [
          "Preserve room zoning exactly as the source photo: the main great-room/living floor area must stay open and uncluttered.",
          "Do NOT add any new kitchen structures in the great-room area: no new islands, perimeter cabinets, countertops, appliances, sinks, faucets, or backsplash walls.",
          "Kitchen edits are allowed ONLY on existing kitchen elements already visible in the source background kitchen zone. Do NOT expand the kitchen footprint into the living room.",
        ],
      },
    };

    const { error: greatroomPolicyErr } = await supabase
      .from("step_photo_generation_policies")
      .upsert(
        {
          org_id: orgId,
          step_photo_id: greatroomPhotoId,
          policy_key: "demo:nest:greatroom-wide:v1",
          is_active: true,
          policy_json: greatroomPolicy,
        },
        { onConflict: "org_id,step_photo_id,policy_key" }
      );

    if (greatroomPolicyErr) {
      console.error("  Failed to upsert greatroom policy:", greatroomPolicyErr);
    } else {
      console.log("  Greatroom policy: demo:nest:greatroom-wide:v1");
    }
  }

  // ---------- Summary ----------
  console.log("\n=== Seed complete! ===");
  console.log(`  Org: ${ORG_NAME} (${orgId})`);
  console.log(`  Floorplans: ${FLOORPLANS.length} (1 active, 3 inactive)`);
  console.log(`  Categories: ${CATEGORIES.length}`);
  console.log(`  Subcategories: ${SUBCATEGORIES.length}`);
  console.log(`  Options: ${OPTIONS.length}`);
  console.log(`  Swatches uploaded: ${uploadedSwatches}`);
  console.log(`  Room photos: ${ROOM_PHOTOS.length}`);
  console.log(`  Generation policies: 2`);
  console.log(`  Generation cap: ${GENERATION_CAP}/session`);
  console.log(`\nVerify at: withfin.ch/demo`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
