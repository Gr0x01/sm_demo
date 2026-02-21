import { createSupabaseServer } from "./supabase-server";
import { NextResponse } from "next/server";

/**
 * Authenticates an admin API request and returns the user-scoped supabase client + org info.
 * Returns an error response if unauthenticated or missing org_id.
 */
export async function authenticateAdminRequest(body: { org_id?: string }) {
  const supabase = await createSupabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const orgId = body.org_id;
  if (!orgId) {
    return { error: NextResponse.json({ error: "Missing org_id" }, { status: 400 }) };
  }

  // Verify membership and fetch org slug in one query
  const { data: membership } = await supabase
    .from("org_users")
    .select("role, organizations(slug)")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  if (!membership || membership.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const orgSlug = (membership.organizations as unknown as { slug: string } | null)?.slug;

  return { supabase, user, orgId, orgSlug, role: membership.role as "admin" | "viewer" };
}
