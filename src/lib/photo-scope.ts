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

function isPrimaryAccentAsWallView(context: { stepSlug?: string | null; imagePath?: string | null }): boolean {
  const imagePath = (context.imagePath ?? "").toLowerCase();
  return (
    imagePath.includes("primary-bedroom.webp") ||
    imagePath.includes("primary_bedroom.webp") ||
    context.stepSlug === "primary-bath" ||
    imagePath.includes("primary-bath-vanity.webp") ||
    imagePath.includes("primary-bath-shower.webp") ||
    imagePath.includes("bath-closet.webp")
  );
}

/**
 * For Stone Martin primary bedroom/bath photos, treat accent color as whole-wall paint.
 * This remaps accent option IDs to their wall equivalents and removes accent-color.
 */
export function normalizePrimaryAccentAsWallPaint(
  selections: Record<string, string>,
  context: { stepSlug?: string | null; imagePath?: string | null },
): Record<string, string> {
  if (!isPrimaryAccentAsWallView(context)) return selections;
  const accentOptionId = selections["accent-color"];
  if (!accentOptionId || !accentOptionId.startsWith("accent-")) return selections;

  const wallOptionId = `wall-${accentOptionId.slice("accent-".length)}`;
  const next: Record<string, string> = { ...selections, "common-wall-paint": wallOptionId };
  delete next["accent-color"];
  return next;
}
