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
  const isPrimaryBedroomView = imagePath.includes("primary-bedroom.webp");
  const isPrimaryBathView =
    context.stepSlug === "primary-bath" ||
    imagePath.includes("primary-bath-vanity.webp") ||
    imagePath.includes("primary-bath-shower.webp") ||
    isBathClosetView;

  if (isGreatRoomKitchenView && effective.has("kitchen-faucet")) {
    effective.add("cabinet-style-whole-house");
    effective.add("kitchen-cabinet-color");
    effective.add("kitchen-island-cabinet-color");
    effective.add("kitchen-cabinet-hardware");
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

  // Stone Martin semantics: accent color owns primary bedroom + primary bath walls.
  // If we keep common wall paint in those views, the prompt receives conflicting
  // wall-color instructions and the accent color is frequently overridden.
  if (isPrimaryBedroomView || isPrimaryBathView) {
    effective.add("accent-color");
    effective.delete("common-wall-paint");
  }

  return effective;
}
