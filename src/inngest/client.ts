import { Inngest, EventSchemas } from "inngest";
import type { ResolvedPhotoGenerationPolicy } from "@/lib/photo-generation-policy";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";

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
}

export interface DemoGenerateRequestedData {
  combinedHash: string;
  photoHash: string;
  effectiveSelections: Record<string, string>;
  sceneAnalysis: DemoSceneAnalysis | null;
}

type Events = {
  "photo/generate.requested": {
    data: PhotoGenerateRequestedData;
  };
  "demo/generate.requested": {
    data: DemoGenerateRequestedData;
  };
};

export const inngest = new Inngest({
  id: "finch",
  schemas: new EventSchemas().fromRecord<Events>(),
});
