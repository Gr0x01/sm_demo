/**
 * Resolve photo scope from stored subcategory_ids with step-section fallback.
 * Returns null when no scope can be determined (include everything).
 */
export function getPhotoScopedIds(
  ids: string[] | null | undefined,
  fallbackSectionIds?: string[],
): Set<string> | null {
  if (ids && ids.length > 0) return new Set(ids);
  if (fallbackSectionIds?.length) return new Set(fallbackSectionIds);
  return null;
}

/**
 * For photos where accent color should be treated as whole-wall paint,
 * remap accent option IDs to their wall equivalents and remove accent-color.
 * Controlled by the `remap_accent_as_wall_paint` flag on step_photos.
 */
export function normalizePrimaryAccentAsWallPaint(
  selections: Record<string, string>,
  remapAccentAsWallPaint: boolean,
): Record<string, string> {
  if (!remapAccentAsWallPaint) return selections;
  const accentOptionId = selections["accent-color"];
  if (!accentOptionId || !accentOptionId.startsWith("accent-")) return selections;

  const wallOptionId = `wall-${accentOptionId.slice("accent-".length)}`;
  const next: Record<string, string> = { ...selections, "common-wall-paint": wallOptionId };
  delete next["accent-color"];
  return next;
}
