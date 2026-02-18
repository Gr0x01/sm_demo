export interface StepSection {
  title: string;
  subCategoryIds: string[];
}

export interface StepConfig {
  id: string;
  number: number;
  name: string;
  subtitle: string;
  heroImage: string | string[];
  heroVariant: "full" | "compact" | "split" | "none";
  showGenerateButton: boolean;
  sections: StepSection[];
  /** Subcategory IDs that dominate the room photo — only these send swatch images to the AI. Others are described in text only. */
  highImpactIds?: string[];
}

export const steps: StepConfig[] = [
  {
    id: "set-your-style",
    number: 1,
    name: "Set Your Style",
    subtitle: "Whole-home vibe — cabinets, flooring, paint & trim",
    heroImage: "/rooms/greatroom-wide.webp",
    heroVariant: "compact",
    showGenerateButton: true,
    highImpactIds: [
      "cabinet-style-whole-house",
      "main-area-flooring-color",
      "common-wall-paint",
      "ceiling-paint",
      "trim-paint",
      "door-casing-color",
      "baseboard",
      "wainscoting",
      "interior-door-style",
      "fireplace-tile-surround",
      "lighting",
      "great-room-fan",
      "can-lights-primary",
    ],
    sections: [
      {
        title: "Cabinets",
        subCategoryIds: ["cabinet-style-whole-house"],
      },
      {
        title: "Flooring",
        subCategoryIds: [
          "main-area-flooring-type",
          "main-area-flooring-color",
          "carpet-color",
          "bonus-room-stair-treads",
        ],
      },
      {
        title: "Paint",
        subCategoryIds: [
          "common-wall-paint",
          "accent-color",
          "ceiling-paint",
          "trim-paint",
          "door-casing-color",
        ],
      },
      {
        title: "Trim & Millwork",
        subCategoryIds: [
          "baseboard",
          "wainscoting",
          "crown-options",
          "door-window-casing",
          "interior-door-style",
        ],
      },
      {
        title: "Fireplace",
        subCategoryIds: [
          "fireplace-mantel",
          "fireplace-mantel-accent",
          "fireplace-hearth",
          "fireplace-tile-surround",
        ],
      },
      {
        title: "Lighting & Fans",
        subCategoryIds: [
          "lighting",
          "great-room-fan",
          "bedroom-fan",
          "can-lights-primary",
          "can-lights-additional",
        ],
      },
    ],
  },
  {
    id: "design-your-kitchen",
    number: 2,
    name: "Design Your Kitchen",
    subtitle: "Countertops, cabinets, backsplash & appliances",
    heroImage: "/rooms/kitchen-close.webp",
    heroVariant: "full",
    showGenerateButton: true,
    highImpactIds: [
      "counter-top",
      "countertop-edge",
      "backsplash",
      "kitchen-cabinet-color",
      "kitchen-island-cabinet-color",
      "kitchen-cabinet-hardware",
      "kitchen-sink",
      "kitchen-faucet",
      "range",
      "under-cabinet-lighting",
      "light-rail",
    ],
    sections: [
      {
        title: "Surfaces",
        subCategoryIds: ["counter-top", "countertop-edge", "backsplash"],
      },
      {
        title: "Cabinets",
        subCategoryIds: [
          "kitchen-cabinet-color",
          "kitchen-island-cabinet-color",
          "kitchen-cabinet-hardware",
        ],
      },
      {
        title: "Sink & Faucet",
        subCategoryIds: ["kitchen-sink", "kitchen-faucet"],
      },
      {
        title: "Appliances",
        subCategoryIds: ["dishwasher", "refrigerator", "range"],
      },
      {
        title: "Extras",
        subCategoryIds: [
          "under-cabinet-lighting",
          "trash-can-cabinet",
          "light-rail",
          "glass-cabinet-door",
        ],
      },
    ],
  },
  {
    id: "primary-bath",
    number: 3,
    name: "Primary Bath",
    subtitle: "Vanity, tile, shower & fixtures",
    heroImage: "/rooms/primary-bath-vanity.webp",
    heroVariant: "full",
    showGenerateButton: true,
    highImpactIds: [
      "primary-bath-vanity",
      "primary-bath-cabinet-color",
      "bathroom-cabinet-hardware",
      "primary-bath-mirrors",
      "floor-tile-color",
      "primary-shower",
      "primary-shower-entry",
      "bath-faucets",
      "bath-hardware",
    ],
    sections: [
      {
        title: "Vanity & Cabinets",
        subCategoryIds: [
          "primary-bath-vanity",
          "primary-bath-cabinet-color",
          "bathroom-cabinet-hardware",
        ],
      },
      {
        title: "Mirrors",
        subCategoryIds: ["primary-bath-mirrors"],
      },
      {
        title: "Tile & Flooring",
        subCategoryIds: ["floor-tile-color"],
      },
      {
        title: "Shower",
        subCategoryIds: [
          "primary-shower",
          "primary-shower-entry",
          "rain-head",
          "wall-mount-hand-shower",
        ],
      },
      {
        title: "Fixtures",
        subCategoryIds: ["bath-faucets", "bath-hardware"],
      },
    ],
  },
  {
    id: "secondary-spaces",
    number: 4,
    name: "Secondary Spaces",
    subtitle: "Secondary bath, laundry, powder room & closets",
    heroImage: "/rooms/bath-closet.webp",
    heroVariant: "full",
    showGenerateButton: true,
    highImpactIds: [
      "secondary-bath-cabinet-color",
      "secondary-bath-mirrors",
      "secondary-shower",
      "primary-closet-shelving",
    ],
    sections: [
      {
        title: "Secondary Bath",
        subCategoryIds: [
          "secondary-bath-cabinet-color",
          "secondary-bath-mirrors",
          "secondary-shower",
          "secondary-bath-walk-in",
          "secondary-bath-steel-tub",
        ],
      },
      {
        title: "Laundry Room",
        subCategoryIds: ["laundry-room-cabinets"],
      },
      {
        title: "Powder Room",
        subCategoryIds: ["powder-room-vanity"],
      },
      {
        title: "Closets & Storage",
        subCategoryIds: [
          "primary-closet-shelving",
          "pantry-shelving",
        ],
      },
    ],
  },
  {
    id: "finishing-touches",
    number: 5,
    name: "Finishing Touches",
    subtitle: "Electrical, hardware, smart home & exterior",
    heroImage: "",
    heroVariant: "none",
    showGenerateButton: false,
    sections: [
      {
        title: "Electrical",
        subCategoryIds: [
          "electrical-outlets-standard",
          "electrical-outlets-raised",
          "dedicated-garage-fridge-outlet",
          "outdoor-eave-lighting",
          "add-220v-outlet",
          "garage-utility-lights",
        ],
      },
      {
        title: "Hardware & Doors",
        subCategoryIds: [
          "door-hardware",
          "front-door-handle",
          "blinds",
          "address-style",
        ],
      },
      {
        title: "Low Voltage & Smart Home",
        subCategoryIds: [
          "adt-security",
          "adt-contract",
          "adt-deadbolt",
          "adt-keypad",
          "deako-5-switches",
          "deako-15-switches",
          "deako-30-switches",
          "smart-plugs-5",
          "smart-plugs-10",
          "great-room-av-point",
          "cable-outlet-standard",
          "cable-outlet-raised",
          "cable-elec-interior-raised",
          "cable-elec-exterior-raised",
          "data-elec-interior-raised",
          "data-elec-exterior-raised",
          "data-standard-outlet",
          "data-raised-outlet",
        ],
      },
      {
        title: "Plumbing & Utilities",
        subCategoryIds: [
          "toilet-upgrade",
          "toilet-seat",
          "utility-sink",
          "hose-bib",
          "gas-stub",
        ],
      },
      {
        title: "HVAC & Insulation",
        subCategoryIds: ["clean-air-upgrade", "spray-foam"],
      },
      {
        title: "Exterior",
        subCategoryIds: [
          "shutter-style",
          "additional-concrete",
          "window-screens",
          "front-door",
          "rear-door",
          "garage-door-keypad",
        ],
      },
    ],
  },
];

// Collect all subcategory IDs across all steps for audit
const allStepSubCategoryIds = new Set(
  steps.flatMap((s) => s.sections.flatMap((sec) => sec.subCategoryIds))
);

/** Check if a subcategory ID is mapped to a step */
export function isInStep(subCategoryId: string): boolean {
  return allStepSubCategoryIds.has(subCategoryId);
}

/** Get all subcategory IDs that aren't mapped to any step */
export function getUnmappedSubCategoryIds(allIds: string[]): string[] {
  return allIds.filter((id) => !allStepSubCategoryIds.has(id));
}
