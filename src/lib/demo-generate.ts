import { createHash } from "crypto";
import { hashSelections } from "@/lib/generate";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";
import { filterDemoSelectionsByVisibility } from "@/lib/demo-scene";

export const DEMO_GENERATION_CACHE_VERSION = "v2.12";
export const DEMO_ORG_ID = "0d255878-9268-468a-b9e2-95b7552b6126";

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
