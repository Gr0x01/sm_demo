import type { BuyerSession } from "@/types";

/** Columns to SELECT for buyer_sessions queries. */
export const SESSION_COLUMNS = "id, org_id, floorplan_id, buyer_email, resume_token, selections, quantities, total_price, generation_count, status, submitted_at, created_at, updated_at";

/** Map a Supabase buyer_sessions row to the BuyerSession API shape (excludes resumeToken). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRowToPublicSession(row: any): Omit<BuyerSession, "resumeToken"> {
  return {
    id: row.id,
    orgId: row.org_id,
    floorplanId: row.floorplan_id,
    buyerEmail: row.buyer_email ?? null,
    selections: row.selections ?? {},
    quantities: row.quantities ?? {},
    totalPrice: Number(row.total_price),
    generationCount: row.generation_count,
    status: row.status,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate and normalize email. Returns lowercase trimmed email or null if invalid. */
export function validateEmail(raw: string): string | null {
  const normalized = raw.trim().toLowerCase();
  return EMAIL_RE.test(normalized) ? normalized : null;
}
