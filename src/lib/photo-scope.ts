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

  if (isGreatRoomKitchenView && effective.has("kitchen-faucet")) {
    effective.add("cabinet-style-whole-house");
    effective.add("kitchen-cabinet-color");
    effective.add("kitchen-island-cabinet-color");
    effective.add("kitchen-cabinet-hardware");
  }

  return effective;
}
