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
    options: [
      { id: "bs-white-gloss-subway", name: "White Gloss Subway", price: 0, swatchUrl: "/swatches/backsplash/BACKSPLASH---BAKER-BLVD-4X16---WHITE-GLOSS---3RD-STAGGER-LAY.jpg", swatchColor: "#F5F5F5", promptDescriptor: "white glossy 4x16 subway tile backsplash in staggered layout" },
      { id: "bs-charcoal-subway", name: "Charcoal Subway", price: 150, swatchUrl: "/swatches/backsplash/BACKSPLASH---BAKER-BLVD-4X16---CARBON---3RD-STAGGER-LAY.jpg", swatchColor: "#3D3D3D", promptDescriptor: "dark charcoal 4x16 subway tile backsplash in staggered layout" },
      { id: "bs-ivory-handmade", name: "Ivory Handmade", price: 350, swatchUrl: "/swatches/backsplash/NAIVE_BACKSPLASH_3x12_PEARL.jpg", swatchColor: "#EDE9E2", promptDescriptor: "handmade-look 3x12 ivory tile with wavy texture in horizontal stagger" },
      { id: "bs-grey-herringbone", name: "Grey Herringbone", price: 425, swatchUrl: "/swatches/backsplash/BACKSPLASH---BAKER-BLVD-HERRINGBONE-MATTE-MOSAIC---WARM-GREY.jpg", swatchColor: "#A8A49E", promptDescriptor: "warm grey matte herringbone mosaic tile backsplash" },
      { id: "bs-seafoam-picket", name: "Seafoam Picket", price: 375, swatchUrl: "/swatches/backsplash/BACKSPLASH---GATEWAY-3X12-PICKET---ROBINS-EGG---HORIZONTAL-LAY-IRL-PHOTO.jpg", swatchColor: "#96C8C4", promptDescriptor: "seafoam blue-green 3x12 picket tile backsplash in horizontal layout" },
    ],
  },
  {
    id: "counter-top",
    name: "Countertop",
    categoryId: "demo",
    isVisual: true,
    options: [
      { id: "ct-dark-granite", name: "Pepper Granite", price: 0, swatchUrl: "/swatches/countertops/COUNTER-TOP---GRANITE---STEEL-GREY.jpg", swatchColor: "#6B6E72", promptDescriptor: "dark pepper granite countertop with charcoal tones and subtle crystalline flecks" },
      { id: "ct-cream-granite", name: "Cream Granite", price: 0, swatchUrl: "/swatches/countertops/COUNTER-TOP---GRANITE---DALLAS-WHITE.jpg", swatchColor: "#E8E2D9", promptDescriptor: "cream granite countertop with soft gray and white veining on a warm base" },
      { id: "ct-brown-granite", name: "Autumn Granite", price: 1050, swatchUrl: "/swatches/countertops/COUNTER-TOP---GRANITE---FANTASY-BROWN.jpg", swatchColor: "#C8B49A", promptDescriptor: "autumn brown granite countertop with flowing brown, gray, and white veining" },
      { id: "ct-white-quartz", name: "Arctic Quartz", price: 1100, swatchUrl: "/swatches/countertops/COUNTER-TOP---QUARTZ---LACE-WHITE.jpg", swatchColor: "#F4F1EC", promptDescriptor: "arctic white quartz countertop with clean white surface and minimal pattern" },
      { id: "ct-marble-quartz", name: "Calacatta Quartz", price: 2450, swatchUrl: "/swatches/countertops/COUNTER-TOP---QUARTZ---CALACATTA-VENICE.jpg", swatchColor: "#EBE8E1", promptDescriptor: "calacatta marble-look quartz countertop with dramatic gray and gold veining on a bright white base", nudge: "Most popular upgrade" },
    ],
  },
  {
    id: "kitchen-cabinet-color",
    name: "Cabinet Color",
    categoryId: "demo",
    isVisual: true,
    options: [
      { id: "kitchen-cab-color-natural", name: "Natural Oak", price: 0, swatchUrl: "/swatches/cabinets/COLOR__0020_DRIFTWOOD_TSP.png", swatchColor: "#B09A7E", promptDescriptor: "light natural oak stained wood" },
      { id: "kitchen-cab-color-white", name: "Classic White", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---WHITE-PAINT-1.png", swatchColor: "#F5F5F2", promptDescriptor: "crisp classic white painted", nudge: "Most popular" },
      { id: "kitchen-cab-color-dove", name: "Dove Grey", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---FOG-PAINT-1.png", swatchColor: "#B8BFC6", promptDescriptor: "soft dove grey painted" },
      { id: "kitchen-cab-color-navy", name: "Navy", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---ADMIRAL-BLUE-PAINT.png", swatchColor: "#1B3A5C", promptDescriptor: "rich deep navy painted" },
      { id: "kitchen-cab-color-black", name: "Matte Black", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---ONYX-PAINT-1.png", swatchColor: "#1C1C1E", promptDescriptor: "deep matte black painted" },
    ],
  },
  {
    id: "island-cabinet-color",
    name: "Island Color",
    categoryId: "demo",
    isVisual: true,
    options: [
      { id: "island-cab-color-natural", name: "Natural Oak", price: 0, swatchUrl: "/swatches/cabinets/COLOR__0020_DRIFTWOOD_TSP.png", swatchColor: "#B09A7E", promptDescriptor: "light natural oak stained wood" },
      { id: "island-cab-color-white", name: "Classic White", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---WHITE-PAINT-1.png", swatchColor: "#F5F5F2", promptDescriptor: "crisp classic white painted" },
      { id: "island-cab-color-dove", name: "Dove Grey", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---FOG-PAINT-1.png", swatchColor: "#B8BFC6", promptDescriptor: "soft dove grey painted" },
      { id: "island-cab-color-navy", name: "Navy", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---ADMIRAL-BLUE-PAINT.png", swatchColor: "#1B3A5C", promptDescriptor: "rich deep navy painted" },
      { id: "island-cab-color-black", name: "Matte Black", price: 250, swatchUrl: "/swatches/cabinets/KITCHEN-CABINET-COLOR---ONYX-PAINT-1.png", swatchColor: "#1C1C1E", promptDescriptor: "deep matte black painted" },
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
