import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  kitchenAiConfig,
  kitchenSelections,
  buildOptionLookup,
} from "@/lib/__fixtures__/generation";
import { buildMockChain, createSupabaseMock } from "@/lib/__fixtures__/supabase-mock";

// ---------- Module mocks ----------

const { mockInngestSend } = vi.hoisted(() => ({
  mockInngestSend: vi.fn(),
}));

const supabaseMock = createSupabaseMock();

vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => supabaseMock.mock,
}));
vi.mock("@/inngest/client", () => ({
  inngest: { send: mockInngestSend },
}));
vi.mock("@/lib/db-queries");

import { POST } from "./route";
import {
  getOrgBySlug,
  getFloorplan,
  getStepPhotoAiConfig,
  getStepPhotoGenerationPolicy,
  getOptionLookup,
} from "@/lib/db-queries";

// ---------- Typed mocks ----------

const mockGetOrgBySlug = vi.mocked(getOrgBySlug);
const mockGetFloorplan = vi.mocked(getFloorplan);
const mockGetStepPhotoAiConfig = vi.mocked(getStepPhotoAiConfig);
const mockGetStepPhotoGenerationPolicy = vi.mocked(getStepPhotoGenerationPolicy);
const mockGetOptionLookup = vi.mocked(getOptionLookup);

// ---------- Helpers ----------

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3003/api/generate/photo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  orgSlug: "stonemartin",
  floorplanSlug: "kinkade",
  stepPhotoId: "photo-kitchen-001",
  selections: kitchenSelections,
  sessionId: "session-001",
};

const mockOrg = { id: "org-001", name: "Stone Martin", slug: "stonemartin" };
const mockFloorplan = { id: "fp-001", name: "Kinkade", slug: "kinkade" };

function setupDbMocks() {
  mockGetOrgBySlug.mockResolvedValue(mockOrg as Awaited<ReturnType<typeof getOrgBySlug>>);
  mockGetFloorplan.mockResolvedValue(mockFloorplan as Awaited<ReturnType<typeof getFloorplan>>);
  mockGetStepPhotoAiConfig.mockResolvedValue(kitchenAiConfig);
  mockGetStepPhotoGenerationPolicy.mockResolvedValue(null);
  mockGetOptionLookup.mockResolvedValue(buildOptionLookup());
}

function setupHappyPath() {
  setupDbMocks();
  mockInngestSend.mockResolvedValue({ ids: ["evt-001"] });

  supabaseMock.setTable("buyer_sessions", buildMockChain({
    single: vi.fn().mockResolvedValue({
      data: { id: "session-001", org_id: "org-001", floorplan_id: "fp-001", selections: {} },
      error: null,
    }),
  }));
  supabaseMock.setTable("generated_images", buildMockChain({
    single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
    insert: vi.fn().mockResolvedValue({ error: null }),
  }));
}

// ---------- Tests ----------

describe("POST /api/generate/photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.reset();
  });

  it("returns 400 when required fields missing", async () => {
    const res = await POST(makeRequest({ orgSlug: "stonemartin" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing");
  });

  it("returns 404 when org not found", async () => {
    mockGetOrgBySlug.mockResolvedValue(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(404);
  });

  it("returns 404 when floorplan not found", async () => {
    mockGetOrgBySlug.mockResolvedValue(mockOrg as Awaited<ReturnType<typeof getOrgBySlug>>);
    mockGetFloorplan.mockResolvedValue(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(404);
  });

  it("returns 404 when stepPhoto belongs to different org", async () => {
    setupDbMocks();
    mockGetStepPhotoAiConfig.mockResolvedValue({ ...kitchenAiConfig, orgId: "org-OTHER" });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(404);
  });

  it("returns 404 when session belongs to different org", async () => {
    setupDbMocks();
    supabaseMock.setTable("buyer_sessions", buildMockChain({
      single: vi.fn().mockResolvedValue({
        data: { id: "session-001", org_id: "org-OTHER", floorplan_id: "fp-001", selections: {} },
        error: null,
      }),
    }));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(404);
  });

  it("returns cached image on cache hit", async () => {
    setupDbMocks();
    supabaseMock.setTable("buyer_sessions", buildMockChain({
      single: vi.fn().mockResolvedValue({
        data: { id: "session-001", org_id: "org-001", floorplan_id: "fp-001", selections: {} },
        error: null,
      }),
    }));
    supabaseMock.setTable("generated_images", buildMockChain({
      single: vi.fn().mockResolvedValue({
        data: { id: 42, image_path: "org-001/generated/abc123.png" },
        error: null,
      }),
    }));

    const res = await POST(makeRequest(validBody));
    const body = await res.json();
    expect(body.cacheHit).toBe(true);
    expect(body.imageUrl).toContain("abc123.png");
  });

  it("returns 202 and dispatches Inngest event on success", async () => {
    setupHappyPath();

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(202);

    const body = await res.json();
    expect(body.selectionsHash).toBeDefined();
    expect(typeof body.selectionsHash).toBe("string");

    expect(mockInngestSend).toHaveBeenCalledOnce();
    const sentEvent = mockInngestSend.mock.calls[0][0] as { name: string; data: Record<string, unknown> };
    expect(sentEvent.name).toBe("photo/generate.requested");
    expect(sentEvent.data.orgId).toBe("org-001");
    expect(sentEvent.data.stepPhotoId).toBe("photo-kitchen-001");
    expect(sentEvent.data.selectionsHash).toBe(body.selectionsHash);
  });

  it("dispatches scoped selections (out-of-scope selections removed)", async () => {
    setupHappyPath();

    await POST(makeRequest({
      ...validBody,
      selections: {
        ...kitchenSelections,
        "carpet-color": "carpet-warm-beige",
      },
    }));

    const sentEvent = mockInngestSend.mock.calls[0][0] as { name: string; data: Record<string, unknown> };
    const scoped = sentEvent.data.scopedSelections as Record<string, string>;
    expect(scoped).not.toHaveProperty("carpet-color");
    expect(scoped).toHaveProperty("cabinets");
  });

  it("cleans up pending slot when Inngest send fails", async () => {
    setupHappyPath();
    mockInngestSend.mockRejectedValueOnce(new Error("Inngest down"));

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(503);
  });

  it("returns 429 when generation already in progress (duplicate hash)", async () => {
    setupDbMocks();
    supabaseMock.setTable("buyer_sessions", buildMockChain({
      single: vi.fn().mockResolvedValue({
        data: { id: "session-001", org_id: "org-001", floorplan_id: "fp-001", selections: {} },
        error: null,
      }),
    }));
    supabaseMock.setTable("generated_images", buildMockChain({
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
      insert: vi.fn().mockResolvedValue({ error: { code: "23505", message: "duplicate key" } }),
    }));

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.selectionsHash).toBeDefined();
  });

  it("deletes cached row on retry before re-checking cache", async () => {
    setupDbMocks();
    mockInngestSend.mockResolvedValue({ ids: ["evt-001"] });

    supabaseMock.setTable("buyer_sessions", buildMockChain({
      single: vi.fn().mockResolvedValue({
        data: { id: "session-001", org_id: "org-001", floorplan_id: "fp-001", selections: {} },
        error: null,
      }),
    }));

    const deleteFn = vi.fn().mockReturnThis();
    supabaseMock.setTable("generated_images", buildMockChain({
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: deleteFn,
    }));

    await POST(makeRequest({ ...validBody, retry: true }));
    expect(deleteFn).toHaveBeenCalled();
  });
});
