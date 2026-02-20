import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { SESSION_COLUMNS, mapRowToPublicSession, validateEmail } from "@/lib/buyer-session";

// Simple in-memory rate limiter: 5 requests per email per minute
// Note: resets on cold start in serverless — acceptable for current scale
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_ENTRIES = 10000;

function isRateLimited(email: string): boolean {
  const now = Date.now();

  // Prevent unbounded growth
  if (rateLimitMap.size > MAX_ENTRIES) rateLimitMap.clear();

  const entry = rateLimitMap.get(email);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 5;
}

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { org_id, floorplan_id, buyerEmail } = body;

  if (!org_id || !floorplan_id || !buyerEmail) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const normalizedEmail = validateEmail(buyerEmail);
  if (!normalizedEmail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 }); // non-enumerating
  }

  if (isRateLimited(normalizedEmail)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = getServiceClient();

  const { data: row } = await supabase
    .from("buyer_sessions")
    .select(SESSION_COLUMNS)
    .eq("org_id", org_id)
    .eq("floorplan_id", floorplan_id)
    .eq("buyer_email", normalizedEmail)
    .eq("status", "in_progress")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(mapRowToPublicSession(row));
}
