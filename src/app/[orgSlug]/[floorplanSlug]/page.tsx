import { notFound } from "next/navigation";
import { getOrgBySlug, getFloorplan, getCategoriesWithOptions, getStepsWithConfig } from "@/lib/db-queries";
import { DemoPageClient } from "./DemoPageClient";

export default async function DemoPage({
  params,
}: {
  params: Promise<{ orgSlug: string; floorplanSlug: string }>;
}) {
  const { orgSlug, floorplanSlug } = await params;

  console.log(`[DemoPage] Loading orgSlug=${orgSlug} floorplanSlug=${floorplanSlug}`);

  const org = await getOrgBySlug(orgSlug);
  if (!org) {
    console.error(`[DemoPage] org not found for slug="${orgSlug}"`);
    notFound();
  }

  const floorplan = await getFloorplan(org.id, floorplanSlug);
  if (!floorplan) {
    console.error(`[DemoPage] floorplan not found for orgId=${org.id} slug="${floorplanSlug}"`);
    notFound();
  }

  const [categories, steps] = await Promise.all([
    getCategoriesWithOptions(org.id),
    getStepsWithConfig(floorplan.id),
  ]);

  if (categories.length === 0 || steps.length === 0) {
    console.error(`[DemoPage] empty data: categories=${categories.length} steps=${steps.length}`);
    notFound();
  }

  return (
    <DemoPageClient
      orgId={org.id}
      orgSlug={orgSlug}
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
      community={floorplan.community ?? ""}
      categories={categories}
      steps={steps}
      contractLockedIds={floorplan.contract_locked_ids}
      syncPairs={floorplan.sync_pairs as { a: string; b: string; label: string }[]}
      generationCap={org.generation_cap_per_session ?? 20}
    />
  );
}
