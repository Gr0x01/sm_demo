import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Module mocks ----------

const { mockInngestSend, mockCookieGet } = vi.hoisted(() => ({
  mockInngestSend: vi.fn(),
  mockCookieGet: vi.fn(),
}));

/**
 * The generate route calls .from("generated_images") 4 times in sequence:
 *   1. select (count) — generation cap check
 *   2. select (single) — cache check
 *   3. delete — stale cleanup
 *   4. insert — claim slot
 * We use a call-counting mock so each .from() call gets the right behavior.
 */
let fromCallIndex: number;
let fromBehaviors: Array<Record<string, unknown>>;
const mockUpload = vi.fn().mockResolvedValue({ error: null });

const supabaseMock = {
  from: (table: string) => {
    if (table === "generated_images") {
      const behavior = fromBehaviors[fromCallIndex] ?? {};
      fromCallIndex++;
      return makeMockChain(behavior);
    }
    return makeMockChain({});
  },
  storage: {
    from: () => ({
      upload: mockUpload,
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${path}` } }),
    }),
  },
};

function makeMockChain(overrides: Record<string, unknown>) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => supabaseMock,
}));
vi.mock("@/inngest/client", () => ({
  inngest: { send: mockInngestSend },
}));
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: mockCookieGet }),
}));

import { POST } from "./route";

// ---------- Helpers ----------

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3003/api/try/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validSelections = {
  backsplash: "bs-white-gloss-subway",
  "counter-top": "ct-dark-granite",
  "kitchen-cabinet-color": "kitchen-cab-color-timber",
};

const validBody = {
  photoBase64: "dGVzdA==",
  photoHash: "abc123def456",
  selections: validSelections,
  sceneAnalysis: {
    visibleSurfaces: { backsplash: true, countertop: true, cabinets: true, island: false },
  },
};

function setupSession(sessionId = "session-42") {
  mockCookieGet.mockImplementation((name: string) =>
    name === "finch_demo_session" ? { value: sessionId } : undefined
  );
}

/** Count query resolves to { count: N } (the final .eq() in the chain resolves) */
function countBehavior(count: number) {
  // The chain is: .select().eq().neq().eq().eq() — last .eq() must resolve to { count }
  const terminal = vi.fn().mockResolvedValue({ count, error: null });
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        neq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: terminal,
          }),
        }),
      }),
    }),
  };
}

/** Cache check resolves via .select().eq().neq().single() */
function cacheBehavior(data: { image_path: string } | null, errorCode?: string) {
  return {
    single: vi.fn().mockResolvedValue({
      data,
      error: errorCode ? { code: errorCode } : null,
    }),
  };
}

/** Stale cleanup — just chains */
function deleteBehavior() {
  return {};
}

/** Insert claim slot */
function insertBehavior(errorCode?: string) {
  return {
    insert: vi.fn().mockResolvedValue({
      error: errorCode ? { code: errorCode, message: "error" } : null,
    }),
  };
}

function setupHappyPath() {
  setupSession();
  mockInngestSend.mockResolvedValue({ ids: ["evt-001"] });
  fromBehaviors = [
    countBehavior(0),           // 1. under generation cap
    cacheBehavior(null, "PGRST116"), // 2. cache miss
    deleteBehavior(),           // 3. stale cleanup
    insertBehavior(),           // 4. claim succeeds
  ];
}

// ---------- Tests ----------

describe("POST /api/try/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromCallIndex = 0;
    fromBehaviors = [];
    mockUpload.mockResolvedValue({ error: null });
  });

  // --- Input validation ---

  it("returns 400 when session cookie is missing", async () => {
    mockCookieGet.mockReturnValue(undefined);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("session");
  });

  it("returns 400 when photoBase64 is missing", async () => {
    setupSession();
    const res = await POST(makeRequest({ ...validBody, photoBase64: undefined }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("photo");
  });

  it("returns 400 when photoHash is missing", async () => {
    setupSession();
    const res = await POST(makeRequest({ ...validBody, photoHash: undefined }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("photo hash");
  });

  it("returns 400 when selections is missing", async () => {
    setupSession();
    const res = await POST(makeRequest({ ...validBody, selections: undefined }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("selections");
  });

  it("returns 400 for unknown selection keys", async () => {
    setupSession();
    const res = await POST(makeRequest({
      ...validBody,
      selections: { ...validSelections, "fake-surface": "some-option" },
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("fake-surface");
  });

  it("returns 400 for unknown option IDs", async () => {
    setupSession();
    const res = await POST(makeRequest({
      ...validBody,
      selections: { backsplash: "not-a-real-option" },
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("not-a-real-option");
  });

  it("returns 400 when no selected surfaces are visible", async () => {
    setupSession();
    const res = await POST(makeRequest({
      ...validBody,
      selections: { "island-cabinet-color": "island-cab-color-pearl" },
      sceneAnalysis: {
        visibleSurfaces: { backsplash: false, countertop: false, cabinets: false, island: false },
      },
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("visible");
  });

  // --- Generation cap ---

  it("returns 429 when generation cap is reached", async () => {
    setupSession();
    fromBehaviors = [
      countBehavior(5), // at the limit
    ];
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("limit");
  });

  // --- Cache hit ---

  it("returns cached image on cache hit", async () => {
    setupSession();
    fromBehaviors = [
      countBehavior(2),
      cacheBehavior({ image_path: "demo/generated/kitchen-cached.png" }),
    ];
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cacheHit).toBe(true);
    expect(body.imageUrl).toContain("kitchen-cached.png");
  });

  // --- Happy path ---

  it("returns 202 and dispatches Inngest event on success", async () => {
    setupHappyPath();

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(202);

    const body = await res.json();
    expect(body.combinedHash).toBeDefined();
    expect(typeof body.combinedHash).toBe("string");

    expect(mockInngestSend).toHaveBeenCalledOnce();
    const sentEvent = mockInngestSend.mock.calls[0][0] as { name: string; data: Record<string, unknown> };
    expect(sentEvent.name).toBe("demo/generate.requested");
    expect(sentEvent.data.photoHash).toBe("abc123def456");
    expect(sentEvent.data.sessionId).toBe("session-42");
    expect(sentEvent.data.combinedHash).toBe(body.combinedHash);
    expect(sentEvent.data.effectiveSelections).toBeDefined();
  });

  it("uploads photo to storage before dispatching", async () => {
    setupHappyPath();
    await POST(makeRequest(validBody));
    expect(mockUpload).toHaveBeenCalledOnce();
  });

  // --- Upload failure ---

  it("returns 503 and cleans up pending slot when photo upload fails", async () => {
    setupSession();
    mockUpload.mockResolvedValueOnce({ error: { message: "storage down" } });
    fromBehaviors = [
      countBehavior(0),
      cacheBehavior(null, "PGRST116"),
      deleteBehavior(),
      insertBehavior(), // claim succeeds
      {}, // cleanup delete after upload failure
    ];
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(503);
    expect(mockInngestSend).not.toHaveBeenCalled();
    // Verify cleanup happened (5th .from call = delete pending slot)
    expect(fromCallIndex).toBe(5);
  });

  // --- Duplicate hash (already in progress) ---

  it("returns 429 when generation is already in progress (duplicate hash)", async () => {
    setupSession();
    fromBehaviors = [
      countBehavior(0),
      cacheBehavior(null, "PGRST116"),
      deleteBehavior(),
      insertBehavior("23505"), // unique constraint violation
    ];
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.combinedHash).toBeDefined();
  });

  // --- Inngest failure ---

  it("returns 503 and cleans up pending slot when Inngest send fails", async () => {
    setupSession();
    mockInngestSend.mockRejectedValueOnce(new Error("Inngest down"));
    fromBehaviors = [
      countBehavior(0),
      cacheBehavior(null, "PGRST116"),
      deleteBehavior(),
      insertBehavior(), // claim succeeds
      {}, // cleanup delete after Inngest failure
    ];
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(503);
    // Verify 5 .from("generated_images") calls (4 normal + 1 cleanup)
    expect(fromCallIndex).toBe(5);
  });
});
