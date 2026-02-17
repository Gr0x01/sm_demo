/**
 * Defines paired subcategories where selections can be synced.
 * When a user picks an option in one, we offer to match the other.
 * Matching is done by option name (both sides have identical names).
 */

export interface SyncPair {
  a: string; // subcategory ID
  b: string; // subcategory ID
  label: string; // human-readable name for the popup
}

export const syncPairs: SyncPair[] = [
  {
    a: "kitchen-cabinet-hardware",
    b: "bathroom-cabinet-hardware",
    label: "cabinet hardware",
  },
];

/**
 * Given a subcategory ID that was just changed, find its sync partner (if any).
 */
export function getSyncPartner(
  changedSubId: string
): { partnerSubId: string; label: string } | null {
  for (const pair of syncPairs) {
    if (pair.a === changedSubId) return { partnerSubId: pair.b, label: pair.label };
    if (pair.b === changedSubId) return { partnerSubId: pair.a, label: pair.label };
  }
  return null;
}
