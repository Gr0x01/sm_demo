import { createSupabaseServer } from "./supabase-server";
import { getServiceClient } from "./supabase";

export interface OrgMembership {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: "admin" | "viewer";
}

/**
 * Gets the authenticated user and verifies org membership.
 * Returns null if unauthenticated or not a member of the org.
 */
export async function getAuthenticatedUser(orgSlug: string) {
  const supabase = await createSupabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Look up org by slug using service client (org may not be visible via RLS yet)
  const serviceClient = getServiceClient();
  const { data: org } = await serviceClient
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) return null;

  // Check if user has membership in this specific org
  const { data: membership } = await supabase
    .from("org_users")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", org.id)
    .single();

  if (!membership) return null;

  return {
    user,
    orgId: org.id as string,
    role: membership.role as "admin" | "viewer",
  };
}

/**
 * Gets all org memberships for the current user.
 * Used for multi-org picker and login redirect logic.
 */
export async function getUserOrgs(): Promise<OrgMembership[]> {
  const supabase = await createSupabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return [];

  // org_users RLS only returns the current user's rows
  const { data: memberships } = await supabase
    .from("org_users")
    .select("org_id, role");

  if (!memberships || memberships.length === 0) return [];

  // Fetch org details using service client (orgs may not be RLS-visible yet)
  const serviceClient = getServiceClient();
  const orgIds = memberships.map((m) => m.org_id);
  const { data: orgs } = await serviceClient
    .from("organizations")
    .select("id, name, slug")
    .in("id", orgIds);

  if (!orgs) return [];

  return memberships.map((m) => {
    const org = orgs.find((o) => o.id === m.org_id);
    return {
      orgId: m.org_id,
      orgName: org?.name ?? "Unknown",
      orgSlug: org?.slug ?? "",
      role: m.role as "admin" | "viewer",
    };
  });
}
