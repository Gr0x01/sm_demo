/** Contract phase locking — structural/rough-in decisions lock at contract signing. */

export type ContractPhase = "pre-contract" | "post-contract";

/** Subcategory IDs that get locked after contract signing (structural/rough-in). */
export const CONTRACT_LOCKED_IDS = new Set([
  // Electrical — rough-in / wiring only (fixtures & finishes stay unlocked)
  "electrical-outlets-standard",
  "electrical-outlets-raised",
  "dedicated-garage-fridge-outlet",
  "can-lights-primary",
  "can-lights-additional",
  "great-room-av-point",
  "cable-outlet-standard",
  "cable-outlet-raised",
  "cable-elec-interior-raised",
  "cable-elec-exterior-raised",
  "data-elec-interior-raised",
  "data-elec-exterior-raised",
  "add-220v-outlet",
  "garage-utility-lights",
  "data-standard-outlet",
  "data-raised-outlet",

  // Plumbing — rough-in only (fixtures & finishes stay unlocked)
  "utility-sink",
  "hose-bib",
  "gas-stub",
  "primary-shower-entry",
  "secondary-bath-walk-in",
  "secondary-bath-steel-tub",

  // Cabinets (select)
  "glass-cabinet-door",
  "trash-can-cabinet",
  "primary-bath-vanity",

  // Ext finishes
  "additional-concrete",

  // Insulation
  "clean-air-upgrade",
  "spray-foam",

  // Low voltage
  "adt-keypad",
]);

/** Check whether a subcategory is locked in the given contract phase. */
export function isLocked(subCategoryId: string, phase: ContractPhase): boolean {
  return phase === "post-contract" && CONTRACT_LOCKED_IDS.has(subCategoryId);
}
