import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("org_id");
  const auth = await authenticateAdminRequest({ org_id: orgId ?? undefined });
  if ("error" in auth) return auth.error;

  const { supabase } = auth;

  // Get sessions with floorplan name, exclude anonymous older than 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: sessions, error }, { data: defaults }] = await Promise.all([
    supabase
      .from("buyer_sessions")
      .select("id, buyer_email, total_price, generation_count, status, updated_at, selections, floorplans(name)")
      .eq("org_id", orgId)
      .or(`buyer_email.not.is.null,updated_at.gte.${thirtyDaysAgo}`)
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("options")
      .select("slug, subcategories(slug)")
      .eq("org_id", orgId!)
      .eq("is_default", true),
  ]);

  if (error) {
    console.error("[admin/buyer-sessions] Query error:", error);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }

  // Build default map: subcategory_slug → default option_slug
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultMap = new Map((defaults ?? []).map((d: any) => [d.subcategories?.slug, d.slug]));

  const summaries = (sessions ?? []).map((s) => {
    const selections = (s.selections ?? {}) as Record<string, string>;
    const upgradeCount = Object.entries(selections).filter(
      ([subSlug, optSlug]) => defaultMap.get(subSlug) !== optSlug
    ).length;
    return {
      id: s.id,
      buyerEmail: s.buyer_email,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      floorplanName: (s as any).floorplans?.name ?? "Unknown",
      totalPrice: Number(s.total_price),
      selectionCount: upgradeCount,
      generationCount: s.generation_count,
      status: s.status,
      updatedAt: s.updated_at,
    };
  });

  return NextResponse.json(summaries);
}
