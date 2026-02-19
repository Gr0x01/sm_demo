import { createHash } from "crypto";
import { hashSelections } from "@/lib/generate";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";
import { filterDemoSelectionsByVisibility } from "@/lib/demo-scene";

export const DEMO_GENERATION_CACHE_VERSION = "v2";

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
