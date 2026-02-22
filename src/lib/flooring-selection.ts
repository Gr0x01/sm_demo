export const CARPET_COLOR_SUBCATEGORY = "carpet-color";
export const MAIN_AREA_FLOORING_TYPE_SUBCATEGORY = "main-area-flooring-type";
export const MAIN_AREA_FLOORING_COLOR_SUBCATEGORY = "main-area-flooring-color";
const FLOORING_CONTROL_SUBCATEGORY_IDS = new Set([
  CARPET_COLOR_SUBCATEGORY,
  MAIN_AREA_FLOORING_TYPE_SUBCATEGORY,
  MAIN_AREA_FLOORING_COLOR_SUBCATEGORY,
]);

export function shouldForceSendFlooringSubcategory(subcategoryId: string): boolean {
  return FLOORING_CONTROL_SUBCATEGORY_IDS.has(subcategoryId);
}

function isBedroomContext(contextText?: string | null): boolean {
  if (!contextText) return false;
  return /\bbedroom\b/i.test(contextText);
}

function bedroomUsesHardSurface(
  flooringTypeOptionId?: string,
  carpetOptionId?: string,
): boolean {
  // Explicit no-carpet option always means hard-surface in bedroom.
  if (carpetOptionId?.includes("carpet-none")) return true;
  // Flooring type slugs include "primary" / "whole" when hard-surface extends to bedrooms.
  if (!flooringTypeOptionId) return false;
  return flooringTypeOptionId.includes("primary") || flooringTypeOptionId.includes("whole");
}

/**
 * Resolve bedroom flooring conflicts by sending one effective floor material instruction.
 * For bedroom-context photos:
 * - If bedroom should be hard-surface: drop carpet-color.
 * - Otherwise: drop main-area-flooring-color.
 */
export function resolveScopedFlooringSelections(
  selections: Record<string, string>,
  contextText?: string | null,
): Record<string, string> {
  const resolved = { ...selections };
  if (!isBedroomContext(contextText)) return resolved;

  const carpetOptionId = resolved[CARPET_COLOR_SUBCATEGORY];
  const mainFloorColorOptionId = resolved[MAIN_AREA_FLOORING_COLOR_SUBCATEGORY];
  if (!carpetOptionId || !mainFloorColorOptionId) return resolved;

  const flooringTypeOptionId = resolved[MAIN_AREA_FLOORING_TYPE_SUBCATEGORY];
  if (bedroomUsesHardSurface(flooringTypeOptionId, carpetOptionId)) {
    delete resolved[CARPET_COLOR_SUBCATEGORY];
  } else {
    delete resolved[MAIN_AREA_FLOORING_COLOR_SUBCATEGORY];
  }

  return resolved;
}
