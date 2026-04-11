/**
 * Visual-impact sort for Flux 2 prompt assembly.
 *
 * BFL weights earlier tokens most, so action lines are sorted by the dominance
 * of the surface in a typical kitchen photo: cabinets > island cabinets >
 * countertops > backsplash > flooring > paint. This determines both the
 * swatch image index order and the assembled prompt's action-line order.
 *
 * This module is intentionally dependency-free so both the server-side prompt
 * builder (`src/lib/generate.ts`) and the client-side admin editor
 * (`src/components/admin/PhotoManager.tsx`) can import it without dragging
 * node-only deps across the boundary.
 */

// Attention in Flux decays through the prompt — tokens earlier in the prompt
// receive more weight. The hardest surfaces to get right (cabinets, then the
// physically segmented backsplash with its zone enumeration) are placed first
// so their action lines land while attention is densest. Sorted order:
// cabinets → backsplash → island cabinets → countertop → flooring → paint.
//
// NOTE: pattern match order matters — more specific patterns must come first
// in the array so they win the match. `kitchen-island-cabinet-color` contains
// the substring `cabinet-color`, so `island-cabinet` must be listed before
// `cabinet-color` even though it has a higher numeric priority.
const SUBCATEGORY_PRIORITY: readonly (readonly [string, number])[] = [
  ["island-cabinet", 2],   // must match before "cabinet-color" (more specific)
  ["cabinet-color", 0],    // perimeter cabinets — largest surface, hardest to land uniformly
  ["backsplash", 1],       // physically segmented; needs long zone enumeration, must run before attention decays
  ["counter", 3],
  ["floor", 4],
  ["paint", 5],
];

export function getSubcategoryPriority(slug: string): number {
  for (const [pattern, priority] of SUBCATEGORY_PRIORITY) {
    if (slug.includes(pattern)) return priority;
  }
  return 99;
}

export function sortSelectionsByVisualImpact(
  selections: Record<string, string>,
): [string, string][] {
  return Object.entries(selections).sort(([a], [b]) => {
    const pa = getSubcategoryPriority(a);
    const pb = getSubcategoryPriority(b);
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });
}

export function sortSubcategoryIdsByVisualImpact(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const pa = getSubcategoryPriority(a);
    const pb = getSubcategoryPriority(b);
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });
}
