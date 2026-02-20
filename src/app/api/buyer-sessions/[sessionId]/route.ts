import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { SESSION_COLUMNS, mapRowToPublicSession } from "@/lib/buyer-session";
import { calculateTotal } from "@/lib/pricing";
import { getCategoriesForFloorplan } from "@/lib/db-queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const orgId = req.nextUrl.searchParams.get("org_id");
  const floorplanId = req.nextUrl.searchParams.get("floorplan_id");

  if (!orgId || !floorplanId) {
    return NextResponse.json({ error: "Missing org_id or floorplan_id" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data: row } = await supabase
    .from("buyer_sessions")
    .select(SESSION_COLUMNS)
    .eq("id", sessionId)
    .single();

  if (!row || row.org_id !== orgId || row.floorplan_id !== floorplanId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch generation cap from org
  const { data: org } = await supabase
    .from("organizations")
    .select("generation_cap_per_session")
    .eq("id", orgId)
    .single();

  const session = mapRowToPublicSession(row);
  return NextResponse.json({
    ...session,
    generationCap: org?.generation_cap_per_session ?? 20,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { org_id, floorplan_id, selections, quantities } = body;

  if (!org_id || !floorplan_id) {
    return NextResponse.json({ error: "Missing org_id or floorplan_id" }, { status: 400 });
  }

  // Basic shape validation
  if (selections && typeof selections !== "object") {
    return NextResponse.json({ error: "Invalid selections format" }, { status: 400 });
  }
  if (quantities && typeof quantities !== "object") {
    return NextResponse.json({ error: "Invalid quantities format" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Verify ownership
  const { data: row } = await supabase
    .from("buyer_sessions")
    .select("id, org_id, floorplan_id")
    .eq("id", sessionId)
    .single();

  if (!row || row.org_id !== org_id || row.floorplan_id !== floorplan_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Server-side price calculation (floorplan-scoped categories)
  const categories = await getCategoriesForFloorplan(org_id, floorplan_id);
  const totalPrice = calculateTotal(selections ?? {}, quantities ?? {}, categories);

  const { error } = await supabase
    .from("buyer_sessions")
    .update({
      selections: selections ?? {},
      quantities: quantities ?? {},
      total_price: totalPrice,
    })
    .eq("id", sessionId);

  if (error) {
    console.error("[buyer-sessions] Update error:", error);
    return NextResponse.json({ error: "Failed to save selections" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
