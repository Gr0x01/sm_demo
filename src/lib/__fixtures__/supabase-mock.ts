/**
 * Shared Supabase mock helpers for route handler tests.
 * Creates chainable mocks that mimic the Supabase client API.
 */
import { vi } from "vitest";

export function buildMockChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  return chain;
}

export function createSupabaseMock() {
  let tableChains: Record<string, ReturnType<typeof buildMockChain>> = {};

  const mock = {
    from: (table: string) => {
      if (!tableChains[table]) tableChains[table] = buildMockChain();
      return tableChains[table];
    },
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${path}` } }),
      }),
    },
  };

  return {
    mock,
    tableChains,
    reset: () => { tableChains = {}; },
    setTable: (table: string, chain: ReturnType<typeof buildMockChain>) => {
      tableChains[table] = chain;
    },
  };
}
