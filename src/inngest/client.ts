import { Inngest, EventSchemas } from "inngest";
import type { ResolvedPhotoGenerationPolicy } from "@/lib/photo-generation-policy";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";
import type { PassDefinition } from "@/lib/pass-definitions";
import type { PassHashEntry } from "@/lib/generate";

export interface PhotoGenerateRequestedData {
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
  selectionsJsonForClaim: Record<string, unknown>;
  leaveOneOutHashes: string[];
  heroImagePath: string;
  /** Multi-pass pipeline: ordered pass definitions (present when useMultiPass is true) */
  passDefinitions?: PassDefinition[];
  /** Multi-pass pipeline: per-pass hashes for cache lookup */
  passHashes?: PassHashEntry[];
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
