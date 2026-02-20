import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getOrgBySlug } from "@/lib/db-queries";
import { getServiceClient } from "@/lib/supabase";

export default async function OrgPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  // Find the first active floorplan and redirect to it
  const supabase = getServiceClient();
  const { data: floorplan } = await supabase
    .from("floorplans")
    .select("slug")
    .eq("org_id", org.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .single();

  if (!floorplan) notFound();

  // If accessed via subdomain, redirect to just /floorplanSlug (rewrite handles the rest)
  const host = (await headers()).get("host") ?? "";
  const isSubdomain =
    host.endsWith(".withfin.ch") || /^[^.]+\.localhost/.test(host);

  redirect(isSubdomain ? `/${floorplan.slug}` : `/${orgSlug}/${floorplan.slug}`);
}
