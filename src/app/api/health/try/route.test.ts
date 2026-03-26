import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Module mocks ----------

const mockSingle = vi.fn();
const mockList = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => ({
    from: () => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
    }),
    storage: {
      from: () => ({
        list: mockList,
      }),
    },
  }),
}));

import { GET } from "./route";

// ---------- Tests ----------

describe("GET /api/health/try", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when all checks pass", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "0d255878-9268-468a-b9e2-95b7552b6126", slug: "demo" },
      error: null,
    });
    mockList.mockResolvedValue({ error: null });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.healthy).toBe(true);
    expect(body.checks.demo_org.ok).toBe(true);
    expect(body.checks.storage_uploads.ok).toBe(true);
    expect(body.checks.storage_generated.ok).toBe(true);
  });

  it("returns 503 when demo org is missing", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    mockList.mockResolvedValue({ error: null });

    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.healthy).toBe(false);
    expect(body.checks.demo_org.ok).toBe(false);
  });

  it("returns 503 when demo org slug doesn't match", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "0d255878-9268-468a-b9e2-95b7552b6126", slug: "wrong" },
      error: null,
    });
    mockList.mockResolvedValue({ error: null });

    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.healthy).toBe(false);
    expect(body.checks.demo_org.detail).toContain("wrong");
  });

  it("returns 503 when storage bucket is inaccessible", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "0d255878-9268-468a-b9e2-95b7552b6126", slug: "demo" },
      error: null,
    });
    // First list call (uploads) succeeds, second (generated) fails
    mockList
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "bucket not found" } });

    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.healthy).toBe(false);
    expect(body.checks.storage_uploads.ok).toBe(true);
    expect(body.checks.storage_generated.ok).toBe(false);
  });
});
