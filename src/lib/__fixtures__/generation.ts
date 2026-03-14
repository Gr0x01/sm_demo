/**
 * Shared fixture data for generation pipeline tests.
 * Models realistic SM Kinkade / Demo patterns without hitting the DB.
 */
import type { Option, SubCategory } from "@/types";
import type { StepPhotoAiConfig, OptionLookupMap } from "@/lib/generate";
import type { StepPhotoGenerationPolicyRecord } from "@/lib/db-queries";

// ---------- AI Configs (mimics getStepPhotoAiConfig return) ----------

export const kitchenAiConfig: StepPhotoAiConfig = {
  stepId: "step-kitchen-001",
  stepSlug: "design-your-kitchen",
  orgId: "org-001",
  floorplanId: "fp-001",
  sceneDescription: "Open kitchen with island, stainless appliances, granite countertops",
  spatialHints: {
    cabinets: "upper and lower cabinets throughout",
    countertops: "island and perimeter countertops",
    backsplash: "area between upper cabinets and countertops",
    range: "slide-in range in center of back wall",
    refrigerator: "left side of kitchen near pantry",
    "common-wall-paint": "walls above backsplash and in breakfast nook",
  },
  stepPhotoBaseline: {},
  alsoIncludeIds: [],
  sections: [
    { title: "Surfaces", subcategory_ids: ["cabinets", "countertops", "backsplash"], sort_order: 0 },
    { title: "Appliances", subcategory_ids: ["range", "refrigerator", "dishwasher"], sort_order: 1 },
  ],
  photo: {
    id: "photo-kitchen-001",
    imagePath: "org-001/rooms/step-kitchen-001/kitchen-hero.webp",
    spatialHint: "Wide-angle shot of kitchen from dining area looking toward back wall",
    photoBaseline: "Modern kitchen with white shaker cabinets, gray granite counters, stainless appliances",
    subcategoryIds: ["cabinets", "countertops", "backsplash", "range", "refrigerator", "dishwasher"],
    remapAccentAsWallPaint: false,
  },
};

export const bedroomAiConfig: StepPhotoAiConfig = {
  stepId: "step-style-001",
  stepSlug: "set-your-style",
  orgId: "org-001",
  floorplanId: "fp-001",
  sceneDescription: "Primary bedroom with en-suite entrance visible",
  spatialHints: {
    "common-wall-paint": "all visible walls",
    "carpet-color": "floor throughout bedroom",
    "main-area-flooring-type": "floor type selection",
    "main-area-flooring-color": "floor color if hard surface",
  },
  stepPhotoBaseline: {},
  alsoIncludeIds: [],
  sections: [
    {
      title: "Surfaces",
      subcategory_ids: ["common-wall-paint", "carpet-color", "main-area-flooring-type", "main-area-flooring-color"],
      sort_order: 0,
    },
  ],
  photo: {
    id: "photo-bedroom-001",
    imagePath: "org-001/rooms/step-style-001/primary-bedroom.webp",
    spatialHint: "View from doorway looking into bedroom toward windows",
    photoBaseline: "Primary bedroom with carpet flooring and neutral walls",
    subcategoryIds: ["common-wall-paint", "carpet-color", "main-area-flooring-type", "main-area-flooring-color"],
    remapAccentAsWallPaint: false,
  },
};

export const livingRoomAiConfig: StepPhotoAiConfig = {
  stepId: "step-style-001",
  stepSlug: "set-your-style",
  orgId: "org-001",
  floorplanId: "fp-001",
  sceneDescription: "Open great room with fireplace and accent wall",
  spatialHints: {
    "common-wall-paint": "main walls excluding accent wall",
    "accent-color": "fireplace accent wall",
    "main-area-flooring-type": "floor type",
    "main-area-flooring-color": "floor color",
  },
  stepPhotoBaseline: {},
  alsoIncludeIds: [],
  sections: [
    {
      title: "Surfaces",
      subcategory_ids: ["common-wall-paint", "accent-color", "main-area-flooring-type", "main-area-flooring-color"],
      sort_order: 0,
    },
  ],
  photo: {
    id: "photo-living-001",
    imagePath: "org-001/rooms/step-style-001/living-room.webp",
    spatialHint: "View of great room from entryway with fireplace on right wall",
    photoBaseline: "Great room with hardwood floors, accent wall behind fireplace",
    subcategoryIds: ["common-wall-paint", "accent-color", "main-area-flooring-type", "main-area-flooring-color"],
    remapAccentAsWallPaint: true,
  },
};

// ---------- Option Lookup ----------

function makeSub(id: string, name: string, overrides: Partial<SubCategory> = {}): SubCategory {
  return {
    id,
    name,
    categoryId: "cat-001",
    isVisual: true,
    options: [],
    ...overrides,
  };
}

function makeOpt(id: string, name: string, overrides: Partial<Option> = {}): Option {
  return { id, name, price: 0, ...overrides };
}

export function buildOptionLookup(): OptionLookupMap {
  const map: OptionLookupMap = new Map();

  const wallPaintSub = makeSub("common-wall-paint", "Wall Paint", {
    generationRules: ["If Accent Color is also selected, apply wall paint only to non-accent zones"],
  });
  const wallPaintOpt = makeOpt("wall-agreeable-gray", "Agreeable Gray", { swatchUrl: "https://storage/swatch-ag.jpg" });
  map.set("common-wall-paint:wall-agreeable-gray", { option: wallPaintOpt, subCategory: wallPaintSub });

  const accentSub = makeSub("accent-color", "Accent Color");
  const accentOpt = makeOpt("accent-navy", "Navy Accent", { swatchUrl: "https://storage/swatch-navy.jpg" });
  map.set("accent-color:accent-navy", { option: accentOpt, subCategory: accentSub });

  const cabinetsSub = makeSub("cabinets", "Cabinets", {
    generationRules: ["Preserve shaker panel profile on all cabinet doors"],
  });
  const cabinetsOpt = makeOpt("cab-white-shaker", "White Shaker", { swatchUrl: "https://storage/swatch-ws.jpg", price: 0 });
  map.set("cabinets:cab-white-shaker", { option: cabinetsOpt, subCategory: cabinetsSub });
  const cabinetsOptUpgrade = makeOpt("cab-espresso", "Espresso", { swatchUrl: "https://storage/swatch-esp.jpg", price: 2500 });
  map.set("cabinets:cab-espresso", { option: cabinetsOptUpgrade, subCategory: cabinetsSub });

  const counterSub = makeSub("countertops", "Countertops");
  const counterOpt = makeOpt("ct-granite-luna", "Luna Pearl Granite", { swatchUrl: "https://storage/swatch-luna.jpg", price: 1800 });
  map.set("countertops:ct-granite-luna", { option: counterOpt, subCategory: counterSub });

  const backsplashSub = makeSub("backsplash", "Backsplash");
  const backsplashOpt = makeOpt("bs-subway-white", "White Subway Tile", { swatchUrl: "https://storage/swatch-sub.jpg", price: 0 });
  map.set("backsplash:bs-subway-white", { option: backsplashOpt, subCategory: backsplashSub });

  const rangeSub = makeSub("range", "Range", {
    isAppliance: true,
    generationRulesWhenNotSelected: ["Keep existing range unchanged"],
  });
  const rangeOpt = makeOpt("range-slide-in-ss", "Slide-In Stainless", {
    swatchUrl: "https://storage/swatch-range.jpg",
    promptDescriptor: "GE Profile 30\" slide-in gas range",
    price: 3200,
    generationRules: ["Replace range in-place, maintain exact counter gap"],
  });
  map.set("range:range-slide-in-ss", { option: rangeOpt, subCategory: rangeSub });

  const fridgeSub = makeSub("refrigerator", "Refrigerator", {
    isAppliance: true,
    generationRulesWhenNotSelected: ["Keep existing refrigerator unchanged"],
  });
  const fridgeOpt = makeOpt("fridge-french-ss", "French Door Stainless", {
    promptDescriptor: "Samsung 36\" french door refrigerator",
    price: 2800,
  });
  map.set("refrigerator:fridge-french-ss", { option: fridgeOpt, subCategory: fridgeSub });

  const dishwasherSub = makeSub("dishwasher", "Dishwasher", { isAppliance: true });
  const dishwasherOpt = makeOpt("dw-ss-standard", "Stainless Standard", { price: 0 });
  map.set("dishwasher:dw-ss-standard", { option: dishwasherOpt, subCategory: dishwasherSub });

  const carpetSub = makeSub("carpet-color", "Carpet Color");
  const carpetOpt = makeOpt("carpet-warm-beige", "Warm Beige", { swatchUrl: "https://storage/swatch-carpet.jpg" });
  map.set("carpet-color:carpet-warm-beige", { option: carpetOpt, subCategory: carpetSub });
  const carpetNone = makeOpt("carpet-none", "No Carpet", { price: 0 });
  map.set("carpet-color:carpet-none", { option: carpetNone, subCategory: carpetSub });

  const floorTypeSub = makeSub("main-area-flooring-type", "Flooring Type");
  const floorTypeOpt = makeOpt("floor-type-primary", "Primary Areas + Bedrooms", { price: 1200 });
  map.set("main-area-flooring-type:floor-type-primary", { option: floorTypeOpt, subCategory: floorTypeSub });
  const floorTypeStandard = makeOpt("floor-type-standard", "Main Areas Only", { price: 0 });
  map.set("main-area-flooring-type:floor-type-standard", { option: floorTypeStandard, subCategory: floorTypeSub });

  const floorColorSub = makeSub("main-area-flooring-color", "Flooring Color");
  const floorColorOpt = makeOpt("floor-color-oak", "Natural Oak LVP", { swatchUrl: "https://storage/swatch-oak.jpg", price: 0 });
  map.set("main-area-flooring-color:floor-color-oak", { option: floorColorOpt, subCategory: floorColorSub });

  return map;
}

// ---------- Selections ----------

export const kitchenSelections: Record<string, string> = {
  cabinets: "cab-espresso",
  countertops: "ct-granite-luna",
  backsplash: "bs-subway-white",
  range: "range-slide-in-ss",
  "common-wall-paint": "wall-agreeable-gray",
};

export const bedroomSelectionsWithCarpet: Record<string, string> = {
  "common-wall-paint": "wall-agreeable-gray",
  "carpet-color": "carpet-warm-beige",
  "main-area-flooring-type": "floor-type-standard",
  "main-area-flooring-color": "floor-color-oak",
};

export const bedroomSelectionsHardSurface: Record<string, string> = {
  "common-wall-paint": "wall-agreeable-gray",
  "carpet-color": "carpet-warm-beige",
  "main-area-flooring-type": "floor-type-primary",
  "main-area-flooring-color": "floor-color-oak",
};

export const livingRoomSelectionsWithAccent: Record<string, string> = {
  "common-wall-paint": "wall-agreeable-gray",
  "accent-color": "accent-navy",
  "main-area-flooring-type": "floor-type-standard",
  "main-area-flooring-color": "floor-color-oak",
};

// ---------- Generation Policies ----------

export const kitchenSlideInRangePolicy: StepPhotoGenerationPolicyRecord = {
  policyKey: "kitchen-hero-slide-in-range",
  isActive: true,
  policyJson: {
    promptOverrides: {
      invariantRulesAlways: ["Preserve countertop overhang on both sides of range"],
    },
    secondPass: {
      reason: "Slide-in range refinement",
      prompt: "Refine the slide-in range: ensure flush fit between countertops, correct handle position, and realistic stainless finish.",
      inputFidelity: "high",
      whenSelected: {
        subId: "range",
        optionIds: ["range-slide-in-ss"],
      },
    },
  },
};

// ---------- Policy context ----------

export const defaultPolicyContext = {
  orgSlug: "stonemartin",
  floorplanSlug: "kinkade",
  stepPhotoId: "photo-kitchen-001",
};
