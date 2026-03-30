import { IMAGE_MODEL, ISOLATION_IMAGE_MODEL } from "@/lib/models";
import type { Option, SubCategory } from "@/types";

export type PassName = "structural" | "fixtures" | "oven" | "specialty";

export interface PassDefinition {
  name: PassName;
  subcategoryIds: string[];
  model: string;
  promptStyle: "openai" | "gemini";
}

type OptionLookupMap = Map<string, { option: Option; subCategory: SubCategory }>;

// Subcategory slugs that are fixtures (physical objects, not surfaces)
// regardless of whether is_appliance is set in the DB
const FIXTURE_SLUG_PATTERNS = [
  "hardware", "faucet", "sink", "lighting", "fan",
  "refrigerator", "range", "dishwasher",
];

// Subcategory slugs that always go to specialty pass (Gemini, isolation prompting)
const SPECIALTY_SLUG_PATTERNS = [
  "backsplash",
];

function matchesAny(slug: string, patterns: string[]): boolean {
  return patterns.some(p => slug.includes(p));
}

/**
 * Derive the ordered pass definitions for a given photo based on its scoped
 * subcategories and the buyer's current selections.
 *
 * Classification (in priority order):
 *   1. -none options → excluded (no-op selection, skip entirely)
 *   2. needsIsolation on selected option → specialty
 *   3. Slug matches SPECIALTY_SLUG_PATTERNS → specialty
 *   4. Slide-in range → oven (separate geometry correction)
 *   5. isAppliance OR slug matches FIXTURE_SLUG_PATTERNS → fixtures
 *   6. Everything else → structural
 *
 * Returns only passes that have at least one subcategory.
 * A bedroom with just paint + flooring returns [{ name: 'structural', ... }].
 */
export function derivePassDefinitions(
  scopedSelections: Record<string, string>,
  optionLookup: OptionLookupMap,
): PassDefinition[] {
  const structural: string[] = [];
  const fixtures: string[] = [];
  const oven: string[] = [];
  const specialty: string[] = [];

  for (const [subId, optId] of Object.entries(scopedSelections)) {
    // Skip -none selections (e.g. refrigerator-none = no refrigerator)
    if (optId.endsWith("-none")) continue;

    const entry = optionLookup.get(`${subId}:${optId}`);
    if (!entry) {
      structural.push(subId);
      continue;
    }

    const { option, subCategory } = entry;

    // Specialty: option-level needs_isolation flag (e.g. herringbone backsplash)
    if (option.needsIsolation) {
      specialty.push(subId);
      continue;
    }

    // Specialty: slug-based (backsplash always goes to specialty pass)
    if (matchesAny(subId, SPECIALTY_SLUG_PATTERNS)) {
      specialty.push(subId);
      continue;
    }

    // Oven: slide-in range needs its own geometry correction pass
    if (subId.includes("range") && optId.includes("slide-in")) {
      oven.push(subId);
      continue;
    }

    // Fixtures: appliances + hardware/sink/faucet/lighting by slug or DB flag
    if (subCategory.isAppliance || matchesAny(subId, FIXTURE_SLUG_PATTERNS)) {
      fixtures.push(subId);
      continue;
    }

    // Everything else: cabinets, countertops, flooring, paint, etc.
    structural.push(subId);
  }

  const passes: PassDefinition[] = [];

  if (structural.length > 0) {
    passes.push({
      name: "structural",
      subcategoryIds: structural,
      model: IMAGE_MODEL,
      promptStyle: "openai",
    });
  }

  if (fixtures.length > 0) {
    passes.push({
      name: "fixtures",
      subcategoryIds: fixtures,
      model: IMAGE_MODEL,
      promptStyle: "openai",
    });
  }

  if (oven.length > 0) {
    passes.push({
      name: "oven",
      subcategoryIds: oven,
      model: IMAGE_MODEL,
      promptStyle: "openai",
    });
  }

  if (specialty.length > 0) {
    passes.push({
      name: "specialty",
      subcategoryIds: specialty,
      model: ISOLATION_IMAGE_MODEL,
      promptStyle: "gemini",
    });
  }

  return passes;
}
