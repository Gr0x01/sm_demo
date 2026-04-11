import { Inngest, EventSchemas } from "inngest";
import type { ResolvedPhotoGenerationPolicy } from "@/lib/photo-generation-policy";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";
import type { PromptProse } from "@/lib/step-config";

export interface PhotoGenerateRequestedData {
  /** Human-readable label for Inngest dev UI, e.g. "SM Kinkade / Kitchen" or "prospect:stylecraft / Kitchen" */
  source: string;
  selectionsHash: string;
  selectionsFingerprint: string;
  orgId: string;
  orgSlug: string;
  floorplanSlug: string;
  stepPhotoId: string;
  stepId: string;
  sessionId: string;
  scopedSelections: Record<string, string>;
  scopedSubcategoryIds: string[];
  modelName: string;
  resolvedPolicy: ResolvedPhotoGenerationPolicy;
  sceneDescription: string | null;
  spatialHints: Record<string, string>;
  photoSpatialHint: string | null;
  promptProse: PromptProse | null;
  selectionsJsonForClaim: Record<string, unknown>;
  leaveOneOutHashes: string[];
  heroImagePath: string;
  /** Buyer-initiated retry — forces full Flux 2 Max gen (skips partial-cache scoped edit path). */
  retry?: boolean;
}

export interface DemoGenerateRequestedData {
  combinedHash: string;
  photoHash: string;
  sessionId: string;
  effectiveSelections: Record<string, string>;
  sceneAnalysis: DemoSceneAnalysis | null;
  leaveOneOutHashes: string[];
}

export interface PilotLeadReceivedData {
  name: string;
  company: string;
  email: string;
  phone: string | null;
}

type Events = {
  "photo/generate.requested": {
    data: PhotoGenerateRequestedData;
  };
  "demo/generate.requested": {
    data: DemoGenerateRequestedData;
  };
  "pilot/lead.received": {
    data: PilotLeadReceivedData;
  };
};

export const inngest = new Inngest({
  id: "finch",
  schemas: new EventSchemas().fromRecord<Events>(),
});
