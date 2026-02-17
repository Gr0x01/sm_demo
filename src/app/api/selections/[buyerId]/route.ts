import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ buyerId: string }> }
) {
  const { buyerId } = await params;
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("buyer_selections")
    .select("buyer_name, plan_name, community, selections, quantities")
    .eq("id", buyerId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
  }

  return NextResponse.json({
    buyerName: data.buyer_name,
    planName: data.plan_name,
    community: data.community,
    selections: data.selections ?? {},
    quantities: data.quantities ?? {},
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ buyerId: string }> }
) {
  const { buyerId } = await params;
  const body = await req.json();
  const { selections, quantities } = body;

  const supabase = getServiceClient();

  const { error } = await supabase
    .from("buyer_selections")
    .update({
      selections: selections ?? {},
      quantities: quantities ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", buyerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
