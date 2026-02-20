import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { validateEmail } from "@/lib/buyer-session";

// Simple in-memory rate limiter: 5 requests per org+email per minute.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_ENTRIES = 10000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  if (rateLimitMap.size > MAX_ENTRIES) rateLimitMap.clear();

  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 5;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orgSlug = typeof (body as { orgSlug?: unknown }).orgSlug === "string"
    ? (body as { orgSlug: string }).orgSlug.trim().toLowerCase()
    : "";
  const buyerEmailRaw = typeof (body as { buyerEmail?: unknown }).buyerEmail === "string"
    ? (body as { buyerEmail: string }).buyerEmail
    : "";

  if (!orgSlug || !buyerEmailRaw) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const normalizedEmail = validateEmail(buyerEmailRaw);
  if (!normalizedEmail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 }); // non-enumerating
  }

  const rateLimitKey = `${orgSlug}:${normalizedEmail}`;
  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = getServiceClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, slug")
    .eq("slug", orgSlug)
    .single();

  if (!org?.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: row } = await supabase
    .from("buyer_sessions")
    .select("id, resume_token, organizations(slug), floorplans(slug)")
    .eq("org_id", org.id)
    .eq("buyer_email", normalizedEmail)
    .eq("status", "in_progress")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any;
  const floorplanSlug = r.floorplans?.slug as string | undefined;
  const responseOrgSlug = (r.organizations?.slug as string | undefined) ?? org.slug;

  if (!floorplanSlug) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let resumeToken = (row as { resume_token: string | null }).resume_token;
  if (!resumeToken) {
    resumeToken = crypto.randomBytes(32).toString("hex");
    const { error } = await supabase
      .from("buyer_sessions")
      .update({ resume_token: resumeToken })
      .eq("id", row.id);

    if (error) {
      return NextResponse.json({ error: "Failed to resume" }, { status: 500 });
    }
  }

  return NextResponse.json({
    orgSlug: responseOrgSlug,
    floorplanSlug,
    resumeToken,
  });
}

