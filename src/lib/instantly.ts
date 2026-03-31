const BASE = "https://api.instantly.ai/api/v2";

function headers(): HeadersInit {
  const key = process.env.INSTANTLY_API_KEY;
  if (!key) throw new Error("Missing INSTANTLY_API_KEY");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export interface InstantlyEmail {
  id: string;
  timestamp_created: string;
  from_address_email: string;
  lead: string;
  subject: string;
  body: { text?: string; html?: string };
  campaign_id: string;
}

export interface InstantlyLead {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
}

/**
 * Fetch reply emails received since a given ISO timestamp.
 * Paginates automatically. Returns all replies sorted ascending.
 */
export async function fetchRepliesSince(
  since: string
): Promise<InstantlyEmail[]> {
  const all: InstantlyEmail[] = [];
  let startingAfter: string | undefined;

  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({
      email_type: "received",
      min_timestamp_created: since,
      sort_order: "asc",
      limit: "100",
    });
    if (startingAfter) params.set("starting_after", startingAfter);

    const res = await fetch(`${BASE}/emails?${params}`, {
      headers: headers(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Instantly emails API ${res.status}: ${text}`);
    }

    const data = await res.json();
    const items: InstantlyEmail[] = data.items ?? [];
    all.push(...items);

    if (!data.next_starting_after || items.length < 100) break;
    startingAfter = data.next_starting_after;
  }

  return all;
}

/**
 * Fetch bounced leads. Returns leads + last ID for cursor pagination.
 */
export async function fetchBouncedLeads(
  startingAfter?: string
): Promise<{ leads: InstantlyLead[]; nextCursor: string | null }> {
  const body: Record<string, unknown> = {
    filter: "FILTER_VAL_BOUNCED",
    limit: 100,
  };
  if (startingAfter) body.starting_after = startingAfter;

  const res = await fetch(`${BASE}/leads/list`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly leads API ${res.status}: ${text}`);
  }

  const data = await res.json();
  const leads: InstantlyLead[] = data.items ?? [];

  return { leads, nextCursor: data.next_starting_after ?? null };
}
