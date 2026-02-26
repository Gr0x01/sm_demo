/**
 * Build effective per-photo scope IDs and apply targeted safeguards for known
 * layouts where incomplete scope can drop required cabinet selections.
 */
export function getEffectivePhotoScopedIds(
  rawIds: string[] | null | undefined,
  context: { stepSlug?: string | null; imagePath?: string | null },
): Set<string> | null {
  if (!rawIds?.length) return null;

  const effective = new Set(rawIds);

  // Great-room views with a visible kitchen island should not keep faucet edits
  // while excluding kitchen cabinet edits.
  const imagePath = (context.imagePath ?? "").toLowerCase();
  const isGreatRoomKitchenView =
    context.stepSlug === "set-your-style" ||
    imagePath.includes("greatroom-wide.webp") ||
    imagePath.includes("kitchen-greatroom.webp");
  const isKitchenView =
    context.stepSlug === "design-your-kitchen" ||
    imagePath.includes("kitchen-close.webp");
  const isBathClosetView = imagePath.includes("bath-closet.webp");
  const isPrimaryBedroomView =
    imagePath.includes("primary-bedroom.webp") ||
    imagePath.includes("primary_bedroom.webp");
  const isPrimaryBathView =
    context.stepSlug === "primary-bath" ||
    imagePath.includes("primary-bath-vanity.webp") ||
    imagePath.includes("primary-bath-shower.webp") ||
    isBathClosetView;
  const hasVanitySignal =
    effective.has("bath-faucets") ||
    effective.has("primary-bath-mirrors") ||
    effective.has("secondary-bath-mirrors") ||
    effective.has("primary-bath-vanity") ||
    effective.has("powder-room-vanity");

  if (isGreatRoomKitchenView && effective.has("kitchen-faucet")) {
    effective.add("cabinet-style-whole-house");
    effective.add("kitchen-cabinet-color");
    effective.add("kitchen-island-cabinet-color");
    effective.add("kitchen-cabinet-hardware");
  }

  // Vanity views can end up scoped to faucets/mirrors while dropping cabinet color,
  // which makes explicit cabinet-color selections (e.g. white bath cabinets) no-op.
  if (context.stepSlug === "primary-bath" && hasVanitySignal) {
    effective.add("primary-bath-cabinet-color");
    effective.add("bathroom-cabinet-hardware");
  }
  if (context.stepSlug === "secondary-spaces" && hasVanitySignal) {
    effective.add("secondary-bath-cabinet-color");
    effective.add("bathroom-cabinet-hardware");
  }

  // Kitchen/great-room floor finish should remain in scope for those photos.
  // Without this, narrowed photo scopes can edit counters/cabinets but leave
  // plank flooring unchanged.
  if (isGreatRoomKitchenView || isKitchenView) {
    effective.add("main-area-flooring-color");
    effective.add("main-area-flooring-type");
  }

  // Wall paint should remain in scope for kitchen and split bath+closet views.
  if (isGreatRoomKitchenView || isKitchenView || isBathClosetView) {
    effective.add("common-wall-paint");
  }

  // Stone Martin semantics: primary bedroom + primary bath should support accent
  // paint selection, but final prompting treats those walls as whole-wall paint.
  // Keep both IDs in scope here; selection normalization handles the remap.
  if (isPrimaryBedroomView || isPrimaryBathView) {
    effective.add("accent-color");
    effective.add("common-wall-paint");
  }

  return effective;
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
