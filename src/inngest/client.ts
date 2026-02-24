import { Inngest, EventSchemas } from "inngest";
import type { ResolvedPhotoGenerationPolicy } from "@/lib/photo-generation-policy";

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
  modelName: string;
  resolvedPolicy: ResolvedPhotoGenerationPolicy;
  sceneDescription: string | null;
  spatialHints: Record<string, string>;
  photoSpatialHint: string | null;
  selectionsJsonForClaim: Record<string, unknown>;
  promptContextSignature: string;
}

type Events = {
  "photo/generate.requested": {
    data: PhotoGenerateRequestedData;
  };
};

export const inngest = new Inngest({
  id: "finch",
  schemas: new EventSchemas().fromRecord<Events>(),
});
