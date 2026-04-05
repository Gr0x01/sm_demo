import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildMockChain, createSupabaseMock } from "@/lib/__fixtures__/supabase-mock";

// ---------- Module mocks ----------

const supabaseMock = createSupabaseMock();

vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => supabaseMock.mock,
}));

import { POST } from "./route";

// ---------- Helpers ----------

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3003/api/try/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  photoHash: "abc123def456",
  selections: {
    backsplash: "bs-white-gloss-subway",
    "counter-top": "ct-dark-granite",
    "kitchen-cabinet-color": "kitchen-cab-color-timber",
  },
  sceneAnalysis: {
    visibleSurfaces: { backsplash: true, countertop: true, cabinets: true, island: false },
  },
};

// ---------- Tests ----------

/** Set up mock to return a completed row — so if validation is skipped, the
 *  test fails by returning "complete" instead of "not_found". This prevents
 *  false positives where tests pass via the DB-miss fallback. */
function setupCompletedRow() {
  supabaseMock.setTable("generated_images", buildMockChain({
    single: vi.fn().mockResolvedValue({
      data: { image_path: "demo/generated/trap.png" },
      error: null,
    }),
  }));
}

describe("POST /api/try/check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.reset();
  });

  it("returns not_found when photoHash is missing", async () => {
    setupCompletedRow();
    const res = await POST(makeRequest({ selections: validBody.selections }));
    const body = await res.json();
    expect(body.status).toBe("not_found");
    expect(body.imageUrl).toBeNull();
  });

  it("returns not_found when selections is missing", async () => {
    setupCompletedRow();
    const res = await POST(makeRequest({ photoHash: "abc" }));
    const body = await res.json();
    expect(body.status).toBe("not_found");
  });

  it("returns not_found when no visible surfaces in selections", async () => {
    setupCompletedRow();
    const res = await POST(makeRequest({
      photoHash: "abc",
      selections: { "island-cabinet-color": "island-cab-color-pearl" },
      sceneAnalysis: { visibleSurfaces: { island: false, cabinets: false } },
    }));
    const body = await res.json();
    expect(body.status).toBe("not_found");
  });

  it("returns not_found when no DB row exists (PGRST116)", async () => {
    supabaseMock.setTable("generated_images", buildMockChain({
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
    }));
    const res = await POST(makeRequest(validBody));
    const body = await res.json();
    expect(body.status).toBe("not_found");
    expect(body.imageUrl).toBeNull();
  });

  it("returns pending when image_path is __pending__", async () => {
    supabaseMock.setTable("generated_images", buildMockChain({
      single: vi.fn().mockResolvedValue({
        data: { image_path: "__pending__" },
        error: null,
      }),
    }));
    const res = await POST(makeRequest(validBody));
    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(body.imageUrl).toBeNull();
  });

  it("returns complete with imageUrl when generation is done", async () => {
    supabaseMock.setTable("generated_images", buildMockChain({
      single: vi.fn().mockResolvedValue({
        data: { image_path: "demo/generated/kitchen-abc.png" },
        error: null,
      }),
    }));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("complete");
    expect(body.imageUrl).toContain("kitchen-abc.png");
  });

  it("returns error on transient DB error (not PGRST116)", async () => {
    supabaseMock.setTable("generated_images", buildMockChain({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST500", message: "internal error" },
      }),
    }));
    const res = await POST(makeRequest(validBody));
    const body = await res.json();
    expect(body.status).toBe("error");
    expect(body.imageUrl).toBeNull();
  });

  it("returns error on thrown exception", async () => {
    // Send malformed JSON to trigger catch
    const req = new Request("http://localhost:3003/api/try/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json{",
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.status).toBe("error");
  });
});
