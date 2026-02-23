import { notFound } from "next/navigation";
import { getOrgBySlug, getFloorplan, getCategoriesForFloorplan, getStepsWithConfig } from "@/lib/db-queries";
import { isSubdomain } from "@/lib/subdomain";
import { DemoPageClient } from "./DemoPageClient";

export default async function DemoPage({
  params,
}: {
  params: Promise<{ orgSlug: string; floorplanSlug: string }>;
}) {
  const { orgSlug, floorplanSlug } = await params;

  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const floorplan = await getFloorplan(org.id, floorplanSlug);
  if (!floorplan) notFound();

  const [categories, steps] = await Promise.all([
    getCategoriesForFloorplan(org.id, floorplan.id),
    getStepsWithConfig(floorplan.id),
  ]);

  if (categories.length === 0 || steps.length === 0) notFound();

  const subdomain = await isSubdomain();

  // Build cover image URL from Supabase Storage if available
  const coverImageUrl = floorplan.cover_image_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/rooms/${floorplan.cover_image_path}`
    : null;

  return (
    <DemoPageClient
      orgId={org.id}
      orgSlug={orgSlug}
      isSubdomain={subdomain}
      orgName={org.name}
      orgTheme={{
        primaryColor: org.primary_color || "#1b2d4e",
        secondaryColor: org.secondary_color || "#C5A572",
        accentColor: org.accent_color || "#2767b1",
        logoUrl: org.logo_url,
      }}
      floorplanId={floorplan.id}
      floorplanSlug={floorplanSlug}
      floorplanName={floorplan.name}
      coverImageUrl={coverImageUrl}
      community={floorplan.community ?? ""}
      categories={categories}
      steps={steps}
      contractLockedIds={floorplan.contract_locked_ids}
      syncPairs={floorplan.sync_pairs as { a: string; b: string; label: string }[]}
    />
  );
}
