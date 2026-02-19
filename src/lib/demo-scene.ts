export type DemoKitchenType =
  | "single-wall"
  | "galley"
  | "l-shape"
  | "u-shape"
  | "island"
  | "peninsula"
  | "open-concept"
  | "other";

export type DemoCameraAngle =
  | "straight-on"
  | "angled"
  | "wide"
  | "close-up"
  | "other";

export interface DemoVisibleSurfaces {
  backsplash: boolean;
  countertop: boolean;
  cabinets: boolean;
  island: boolean;
}

export interface DemoSceneAnalysis {
  sceneDescription?: string;
  hasIsland?: boolean;
  spatialHints?: Record<string, string>;
  kitchenType?: DemoKitchenType;
  cameraAngle?: DemoCameraAngle;
  visibleSurfaces?: Partial<DemoVisibleSurfaces>;
}

const SUBCATEGORY_TO_SURFACE_KEY = {
  backsplash: "backsplash",
  "counter-top": "countertop",
  "kitchen-cabinet-color": "cabinets",
  "island-cabinet-color": "island",
} as const;

export function isDemoSubCategoryVisible(
  subCategoryId: string,
  sceneAnalysis?: DemoSceneAnalysis,
): boolean {
  const surfaceKey = SUBCATEGORY_TO_SURFACE_KEY[subCategoryId as keyof typeof SUBCATEGORY_TO_SURFACE_KEY];
  if (!surfaceKey) return true;

  const flag = sceneAnalysis?.visibleSurfaces?.[surfaceKey];
  // Default to visible when the checker did not return a signal.
  return flag !== false;
}

export function filterDemoSelectionsByVisibility(
  selections: Record<string, string>,
  sceneAnalysis?: DemoSceneAnalysis,
): Record<string, string> {
  if (!sceneAnalysis?.visibleSurfaces) return { ...selections };

  const filtered: Record<string, string> = {};
  for (const [subCategoryId, optionId] of Object.entries(selections)) {
    if (isDemoSubCategoryVisible(subCategoryId, sceneAnalysis)) {
      filtered[subCategoryId] = optionId;
    }
  }
  return filtered;
}

export function getHiddenDemoSubCategoryIds(sceneAnalysis?: DemoSceneAnalysis): string[] {
  return Object.keys(SUBCATEGORY_TO_SURFACE_KEY).filter(
    (subCategoryId) => !isDemoSubCategoryVisible(subCategoryId, sceneAnalysis),
  );
}
