import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { SESSION_COLUMNS, mapRowToPublicSession } from "@/lib/buyer-session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = getServiceClient();

  const { data: row } = await supabase
    .from("buyer_sessions")
    .select(`${SESSION_COLUMNS}, organizations(slug), floorplans(slug)`)
    .eq("resume_token", token)
    .single();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any;
  return NextResponse.json({
    ...mapRowToPublicSession(row),
    orgSlug: r.organizations?.slug ?? null,
    floorplanSlug: r.floorplans?.slug ?? null,
  });
}
