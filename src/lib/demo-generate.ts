import { createHash } from "crypto";
import { hashSelections } from "@/lib/generate";
import { getCategoriesWithOptions } from "@/lib/db-queries";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";
import { filterDemoSelectionsByVisibility } from "@/lib/demo-scene";
import type { PromptProse } from "@/lib/step-config";

export const DEMO_ORG_ID = "0d255878-9268-468a-b9e2-95b7552b6126";

/** Known photo hash for the sample kitchen (public/sample-kitchen.jpg, pre-sized 1536x1024). */
export const SAMPLE_KITCHEN_HASH = "a6aeb46b36635226";

/** v2 prose spec for the sample kitchen. */
export const SAMPLE_KITCHEN_PROSE: PromptProse = {
  version: 2,
  actions: {
    "kitchen-cabinet-color": "apply {image} to every perimeter cabinet door and drawer front along each wall",
    "kitchen-island-cabinet-color": "apply {image} to the freestanding center structure base panel in the foreground",
    "counter-top": "apply {image} to all horizontal countertop surfaces on the perimeter and center structure",
    "backsplash": "change the backsplash to {image}, including behind the hood",
  },
  mergedClauses: [
    {
      when: ["kitchen-cabinet-color", "kitchen-island-cabinet-color"],
      clause: "apply {image} to every cabinet door and drawer front throughout the kitchen",
    },
  ],
};

/** Derived from prose content — auto-invalidates when the prose changes. */
export const DEMO_GENERATION_CACHE_VERSION = createHash("sha256")
  .update(JSON.stringify(SAMPLE_KITCHEN_PROSE))
  .digest("hex")
  .slice(0, 8);

/**
 * Get valid subcategory and option IDs from the Demo org DB.
 * Cached via unstable_cache inside getCategoriesWithOptions.
 */
export async function getDemoValidIds(): Promise<{
  subCategoryIds: Set<string>;
  optionIds: Set<string>;
}> {
  const categories = await getCategoriesWithOptions(DEMO_ORG_ID);
  const subCategoryIds = new Set<string>();
  const optionIds = new Set<string>();
  for (const cat of categories) {
    for (const sub of cat.subCategories) {
      subCategoryIds.add(sub.id);
      for (const opt of sub.options) {
        optionIds.add(opt.id);
      }
    }
  }
  return { subCategoryIds, optionIds };
}

export function hashDemoSelections(
  photoHash: string,
  selections: Record<string, string>,
  sceneAnalysis?: DemoSceneAnalysis,
): { combinedHash: string; effectiveSelections: Record<string, string> } {
  const effectiveSelections = filterDemoSelectionsByVisibility(selections, sceneAnalysis);
  const selectionsHash = hashSelections({
    ...effectiveSelections,
    _cacheVersion: DEMO_GENERATION_CACHE_VERSION,
  });
  const combinedHash = createHash("sha256")
    .update(`${photoHash}|${selectionsHash}`)
    .digest("hex")
    .slice(0, 16);

  return { combinedHash, effectiveSelections };
}

/**
 * Compute leave-one-out hashes for demo partial cache matching.
 * For each subcategory in effectiveSelections, computes a combined hash
 * (photoHash + all selections EXCEPT that subcategory) so that two requests
 * differing by exactly one surface will share an overlapping hash.
 *
 * The photoHash is embedded so different users' photos never cross-match.
 */
export function computeDemoLeaveOneOutHashes(
  photoHash: string,
  effectiveSelections: Record<string, string>,
): string[] {
  return Object.keys(effectiveSelections).sort().map(subId => {
    const without: Record<string, string> = { ...effectiveSelections, _cacheVersion: DEMO_GENERATION_CACHE_VERSION };
    delete without[subId];
    const selectionsHash = hashSelections(without);
    return createHash("sha256")
      .update(`${photoHash}|${selectionsHash}`)
      .digest("hex")
      .slice(0, 16);
  });
}
