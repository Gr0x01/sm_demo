export interface RoomConfig {
  id: string;
  name: string;
  subtitle: string;
  image: string;
  subCategoryIds: string[];
}

export const rooms: RoomConfig[] = [
  {
    id: "kitchen-close",
    name: "Your Kitchen",
    subtitle: "Cabinets, countertops & backsplash",
    image: "/rooms/kitchen-close.webp",
    subCategoryIds: [
      "cabinet-style-whole-house",
      "kitchen-cabinet-color",
      "kitchen-island-cabinet-color",
      "kitchen-cabinet-hardware",
      "counter-top",
      "countertop-edge",
      "backsplash",
      "kitchen-sink",
      "kitchen-faucet",
      "dishwasher",
      "refrigerator",
      "range",
    ],
  },
  {
    id: "kitchen-greatroom",
    name: "Kitchen to Great Room",
    subtitle: "Flooring, lighting & open layout",
    image: "/rooms/kitchen-greatroom.webp",
    subCategoryIds: [
      "main-area-flooring-type",
      "main-area-flooring-color",
      "under-cabinet-lighting",
      "great-room-fan",
    ],
  },
  {
    id: "greatroom-wide",
    name: "Great Room & Living",
    subtitle: "Paint, fireplace & trim",
    image: "/rooms/greatroom-wide.webp",
    subCategoryIds: [
      "common-wall-paint",
      "accent-color",
      "ceiling-paint",
      "trim-paint",
      "door-casing-color",
      "fireplace-mantel",
      "fireplace-mantel-accent",
      "fireplace-hearth",
      "fireplace-tile-surround",
      "lighting",
      "wainscoting",
      "crown-options",
      "baseboard",
      "door-window-casing",
      "interior-door-style",
    ],
  },
  {
    id: "primary-bath-vanity",
    name: "Primary Bath",
    subtitle: "Vanity, mirrors & tile",
    image: "/rooms/primary-bath-vanity.webp",
    subCategoryIds: [
      "primary-bath-cabinet-color",
      "primary-bath-vanity",
      "bathroom-cabinet-hardware",
      "bath-faucets",
      "bath-hardware",
      "primary-bath-mirrors",
      "floor-tile-color",
    ],
  },
  {
    id: "primary-bath-shower",
    name: "Primary Shower",
    subtitle: "Tile, shower head & entry",
    image: "/rooms/primary-bath-shower.webp",
    subCategoryIds: [
      "primary-shower",
      "rain-head",
      "wall-mount-hand-shower",
      "primary-shower-entry",
    ],
  },
  {
    id: "bath-closet",
    name: "Bath & Closet",
    subtitle: "Secondary bath, shelving & storage",
    image: "/rooms/bath-closet.webp",
    subCategoryIds: [
      "secondary-bath-cabinet-color",
      "secondary-bath-mirrors",
      "secondary-shower",
      "secondary-bath-walk-in",
      "secondary-bath-steel-tub",
      "primary-closet-shelving",
      "pantry-shelving",
    ],
  },
];

// Collect all subcategory IDs that belong to a room
const roomSubCategoryIds = new Set(rooms.flatMap((r) => r.subCategoryIds));

// Helper: get subcategory IDs that don't belong to any room
export function getOrphanSubCategoryIds(allSubCategoryIds: string[]): string[] {
  return allSubCategoryIds.filter((id) => !roomSubCategoryIds.has(id));
}
