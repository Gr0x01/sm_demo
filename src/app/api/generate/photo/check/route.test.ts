import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  kitchenAiConfig,
  kitchenSelections,
  buildOptionLookup,
} from "@/lib/__fixtures__/generation";
import { buildMockChain, createSupabaseMock } from "@/lib/__fixtures__/supabase-mock";

// ---------- Module mocks ----------

vi.mock("@/lib/supabase");
vi.mock("@/lib/db-queries");

import { POST } from "./route";
import { getServiceClient } from "@/lib/supabase";
import {
  getOrgBySlug,
  getFloorplan,
  getStepPhotoAiConfig,
  getStepPhotoGenerationPolicy,
  getOptionLookup,
} from "@/lib/db-queries";

// ---------- Typed mocks ----------

const mockGetServiceClient = vi.mocked(getServiceClient);
const mockGetOrgBySlug = vi.mocked(getOrgBySlug);
const mockGetFloorplan = vi.mocked(getFloorplan);
const mockGetStepPhotoAiConfig = vi.mocked(getStepPhotoAiConfig);
const mockGetStepPhotoGenerationPolicy = vi.mocked(getStepPhotoGenerationPolicy);
const mockGetOptionLookup = vi.mocked(getOptionLookup);

// ---------- Supabase mock ----------

const supabaseMock = createSupabaseMock();

function setupSupabaseMock() {
  supabaseMock.reset();
  mockGetServiceClient.mockReturnValue(supabaseMock.mock as ReturnType<typeof getServiceClient>);
}

// ---------- Helpers ----------

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3003/api/generate/photo/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockOrg = { id: "org-001", name: "SM", slug: "stonemartin" };
const mockFloorplan = { id: "fp-001", name: "Kinkade", slug: "kinkade" };

// ---------- Tests ----------

describe("POST /api/generate/photo/check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fast path (selectionsHash provided)", () => {
    it("returns 'complete' with imageUrl when hash matches completed row", async () => {
      setupSupabaseMock();
      supabaseMock.setTable("generated_images", buildMockChain({
        single: vi.fn().mockResolvedValue({
          data: { id: 42, image_path: "org-001/generated/abc123.png" },
          error: null,
        }),
      }));

      const res = await POST(makeRequest({ selectionsHash: "abc123def456" }));
      const body = await res.json();
      expect(body.status).toBe("complete");
      expect(body.imageUrl).toContain("abc123.png");
      expect(body.generatedImageId).toBe("42");
    });

    it("returns 'pending' when hash matches __pending__ row", async () => {
      setupSupabaseMock();
      supabaseMock.setTable("generated_images", buildMockChain({
        single: vi.fn().mockResolvedValue({
          data: { id: 1, image_path: "__pending__" },
          error: null,
        }),
      }));

      const res = await POST(makeRequest({ selectionsHash: "abc123def456" }));
      const body = await res.json();
      expect(body.status).toBe("pending");
      expect(body.imageUrl).toBeNull();
      expect(body.selectionsHash).toBe("abc123def456");
    });

    it("returns 'not_found' when no row for hash (PGRST116)", async () => {
      setupSupabaseMock();
      supabaseMock.setTable("generated_images", buildMockChain({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows" },
        }),
      }));

      const res = await POST(makeRequest({ selectionsHash: "nonexistent" }));
      const body = await res.json();
      expect(body.status).toBe("not_found");
    });

    it("returns 'error' on transient DB error", async () => {
      setupSupabaseMock();
      supabaseMock.setTable("generated_images", buildMockChain({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "TIMEOUT", message: "Connection timeout" },
        }),
      }));

      const res = await POST(makeRequest({ selectionsHash: "abc123def456" }));
      const body = await res.json();
      expect(body.status).toBe("error");
    });
  });

  describe("full path (derive hash from inputs)", () => {
    it("returns 'not_found' for invalid org", async () => {
      setupSupabaseMock();
      mockGetOrgBySlug.mockResolvedValue(null);

      const res = await POST(makeRequest({
        orgSlug: "nonexistent",
        floorplanSlug: "kinkade",
        stepPhotoId: "photo-001",
        selections: kitchenSelections,
      }));
      const body = await res.json();
      expect(body.status).toBe("not_found");
    });

    it("returns 'not_found' for invalid floorplan", async () => {
      setupSupabaseMock();
      mockGetOrgBySlug.mockResolvedValue(mockOrg as Awaited<ReturnType<typeof getOrgBySlug>>);
      mockGetFloorplan.mockResolvedValue(null);

      const res = await POST(makeRequest({
        orgSlug: "stonemartin",
        floorplanSlug: "nonexistent",
        stepPhotoId: "photo-001",
        selections: kitchenSelections,
      }));
      const body = await res.json();
      expect(body.status).toBe("not_found");
    });

    it("returns 'not_found' when stepPhoto belongs to different org", async () => {
      setupSupabaseMock();
      mockGetOrgBySlug.mockResolvedValue(mockOrg as Awaited<ReturnType<typeof getOrgBySlug>>);
      mockGetFloorplan.mockResolvedValue(mockFloorplan as Awaited<ReturnType<typeof getFloorplan>>);
      mockGetStepPhotoAiConfig.mockResolvedValue({ ...kitchenAiConfig, orgId: "org-OTHER" });

      const res = await POST(makeRequest({
        orgSlug: "stonemartin",
        floorplanSlug: "kinkade",
        stepPhotoId: "photo-kitchen-001",
        selections: kitchenSelections,
      }));
      const body = await res.json();
      expect(body.status).toBe("not_found");
    });

    it("derives hash and returns result for valid inputs", async () => {
      setupSupabaseMock();
      mockGetOrgBySlug.mockResolvedValue(mockOrg as Awaited<ReturnType<typeof getOrgBySlug>>);
      mockGetFloorplan.mockResolvedValue(mockFloorplan as Awaited<ReturnType<typeof getFloorplan>>);
      mockGetStepPhotoAiConfig.mockResolvedValue(kitchenAiConfig);
      mockGetStepPhotoGenerationPolicy.mockResolvedValue(null);
      mockGetOptionLookup.mockResolvedValue(buildOptionLookup());

      supabaseMock.setTable("buyer_sessions", buildMockChain({
        single: vi.fn().mockResolvedValue({
          data: { id: "session-001", org_id: "org-001", floorplan_id: "fp-001", selections: {} },
          error: null,
        }),
      }));
      supabaseMock.setTable("generated_images", buildMockChain({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "No rows" },
        }),
      }));

      const res = await POST(makeRequest({
        orgSlug: "stonemartin",
        floorplanSlug: "kinkade",
        stepPhotoId: "photo-kitchen-001",
        selections: kitchenSelections,
        sessionId: "session-001",
      }));
      const body = await res.json();
      expect(body.status).toBe("not_found");
    });
  });
});
