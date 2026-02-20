import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { org_id, floorplan_id } = body;

  if (!org_id || !floorplan_id) {
    return NextResponse.json({ error: "Missing org_id or floorplan_id" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Validate floorplan belongs to org
  const { data: fp } = await supabase
    .from("floorplans")
    .select("id")
    .eq("id", floorplan_id)
    .eq("org_id", org_id)
    .single();

  if (!fp) {
    return NextResponse.json({ error: "Floorplan not found for this org" }, { status: 400 });
  }

  const { data: session, error } = await supabase
    .from("buyer_sessions")
    .insert({ org_id, floorplan_id })
    .select("id")
    .single();

  if (error) {
    console.error("[buyer-sessions] Insert error:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  return NextResponse.json({ sessionId: session.id }, { status: 201 });
}
