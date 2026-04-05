import type { SubCategory } from "@/types";

/**
 * 15 curated options for the /demo page — 5 per category.
 * Pulled from real SM data but with generic display names (no SM branding).
 * Options reference the same swatch images in public/swatches/.
 */

export const DEMO_SUBCATEGORIES: SubCategory[] = [
  {
    id: "backsplash",
    name: "Backsplash",
    categoryId: "demo",
    isVisual: true,
    generationRules: [
      "Tile stays within the backsplash zone only — between countertop and upper cabinets.",
    ],
    generationRulesWhenNotSelected: [
      "Keep the existing backsplash exactly as shown.",
    ],
    options: [
      { id: "bs-white-gloss-subway", name: "Blanc Subway", price: 0, swatchUrl: "/swatches/backsplash/demo-white-subway.jpg", swatchColor: "#F5F5F5", dimensions: "4x16 subway tiles, staggered layout" },
      { id: "bs-charcoal-subway", name: "Graphite Subway", price: 150, swatchUrl: "/swatches/backsplash/BACKSPLASH---BAKER-BLVD-4X16---CARBON---3RD-STAGGER-LAY.jpg", swatchColor: "#3D3D3D", dimensions: "4x16 subway tiles, staggered layout" },
      { id: "bs-taupe-subway", name: "Sandstone Subway", price: 350, swatchUrl: "/swatches/backsplash/BACKSPLASH---BAKER-BLVD-4X16---TAUPE---3RD-STAGGER-LAY.jpg", swatchColor: "#C4B8A8", dimensions: "4x16 subway tiles, staggered layout" },
      { id: "bs-dark-herringbone", name: "Ember Herringbone", price: 425, swatchUrl: "/swatches/backsplash/demo-dark-herringbone.jpg", swatchColor: "#2A2A30", dimensions: "0.5x2 inch mosaic pieces in herringbone pattern" },
      { id: "bs-carbon-hex", name: "Slate Hex", price: 375, swatchUrl: "/swatches/backsplash/demo-carbon-hex.jpg", swatchColor: "#3D3D3D", dimensions: "1-inch hexagon mosaic tiles" },
    ],
  },
  {
    id: "counter-top",
    name: "Countertop",
    categoryId: "demo",
    isVisual: true,
    options: [
      { id: "ct-dark-granite", name: "Iron Granite", price: 0, swatchUrl: "/swatches/countertops/COUNTER-TOP---GRANITE---STEEL-GREY.jpg", swatchColor: "#6B6E72", promptDescriptor: "dark granite — match swatch exactly" },
      { id: "ct-cream-granite", name: "Shoreline Granite", price: 0, swatchUrl: "/swatches/countertops/COUNTER-TOP---GRANITE---DALLAS-WHITE.jpg", swatchColor: "#E8E2D9", promptDescriptor: "light granite — match swatch exactly" },
      { id: "ct-speckled-granite", name: "Stardust Granite", price: 1050, swatchUrl: "/swatches/countertops/COUNTER-TOP---GRANITE---LUNA-PEARL.jpg", swatchColor: "#C4C0BC", promptDescriptor: "speckled granite — match swatch exactly" },
      { id: "ct-white-quartz", name: "Glacier Quartz", price: 1100, swatchUrl: "/swatches/countertops/COUNTER-TOP---QUARTZ---LACE-WHITE.jpg", swatchColor: "#F4F1EC", promptDescriptor: "white quartz — match swatch exactly" },
      { id: "ct-marble-quartz", name: "Veined Quartz", price: 2450, swatchUrl: "/swatches/countertops/COUNTER-TOP---QUARTZ---CALACATTA-VENICE.jpg", swatchColor: "#EBE8E1", promptDescriptor: "marble-look veined quartz — match swatch exactly", nudge: "Most popular upgrade" },
    ],
  },
  {
    id: "kitchen-cabinet-color",
    name: "Wall & Floor Cabinets",
    categoryId: "demo",
    isVisual: true,
    generationRulesWhenNotSelected: [
      "Keep the perimeter wall and floor cabinets exactly as shown.",
    ],
    options: [
      { id: "kitchen-cab-color-timber", name: "Timber Wash", price: 0, swatchUrl: "/swatches/cabinets/COLOR__0020_DRIFTWOOD_TSP.jpg", swatchColor: "#B09A7E", promptDescriptor: "stained wood finish — match swatch exactly" },
      { id: "kitchen-cab-color-pearl", name: "Dove", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---WHITE-PAINT-1.jpg", swatchColor: "#F5F5F2", promptDescriptor: "painted finish — match swatch exactly", nudge: "Most popular" },
      { id: "kitchen-cab-color-mist", name: "Morning Mist", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---FOG-PAINT-1.jpg", swatchColor: "#B8BFC6", promptDescriptor: "painted finish — match swatch exactly" },
      { id: "kitchen-cab-color-depths", name: "Deep Current", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---ADMIRAL-BLUE-PAINT.jpg", swatchColor: "#1B3A5C", promptDescriptor: "painted finish — match swatch exactly" },
      { id: "kitchen-cab-color-ink", name: "Ink", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---ONYX-PAINT-1.jpg", swatchColor: "#1C1C1E", promptDescriptor: "painted finish — match swatch exactly" },
    ],
  },
  {
    id: "island-cabinet-color",
    name: "Island Base",
    categoryId: "demo",
    isVisual: true,
    generationRulesWhenNotSelected: [
      "Keep the island base exactly as shown.",
    ],
    options: [
      { id: "island-cab-color-timber", name: "Timber Wash", price: 0, swatchUrl: "/swatches/cabinets/COLOR__0020_DRIFTWOOD_TSP.jpg", swatchColor: "#B09A7E", promptDescriptor: "stained wood finish — match swatch exactly" },
      { id: "island-cab-color-pearl", name: "Dove", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---WHITE-PAINT-1.jpg", swatchColor: "#F5F5F2", promptDescriptor: "painted finish — match swatch exactly" },
      { id: "island-cab-color-mist", name: "Morning Mist", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---FOG-PAINT-1.jpg", swatchColor: "#B8BFC6", promptDescriptor: "painted finish — match swatch exactly" },
      { id: "island-cab-color-depths", name: "Deep Current", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---ADMIRAL-BLUE-PAINT.jpg", swatchColor: "#1B3A5C", promptDescriptor: "painted finish — match swatch exactly" },
      { id: "island-cab-color-ink", name: "Ink", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---ONYX-PAINT-1.jpg", swatchColor: "#1C1C1E", promptDescriptor: "painted finish — match swatch exactly" },
    ],
  },
];

/** Set of all valid demo option IDs for server-side validation */
export const DEMO_OPTION_IDS = new Set(
  DEMO_SUBCATEGORIES.flatMap((sub) => sub.options.map((o) => o.id))
);

/** Set of valid demo subcategory IDs */
export const DEMO_SUBCATEGORY_IDS = new Set(
  DEMO_SUBCATEGORIES.map((sub) => sub.id)
);
