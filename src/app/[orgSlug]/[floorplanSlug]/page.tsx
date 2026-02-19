import { notFound } from "next/navigation";
import { getOrgBySlug, getFloorplan, getCategoriesWithOptions, getStepsWithConfig } from "@/lib/db-queries";
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
    getCategoriesWithOptions(org.id),
    getStepsWithConfig(floorplan.id),
  ]);

  if (categories.length === 0 || steps.length === 0) notFound();

  return (
    <DemoPageClient
      orgId={org.id}
      orgName={org.name}
      floorplanName={floorplan.name}
      community={floorplan.community ?? ""}
      categories={categories}
      steps={steps}
      contractLockedIds={floorplan.contract_locked_ids}
      syncPairs={floorplan.sync_pairs as { a: string; b: string; label: string }[]}
    />
  );
}
