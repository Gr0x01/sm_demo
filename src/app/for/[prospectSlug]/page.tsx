import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrgBySlug, getFloorplan, getCategoriesForFloorplan, getStepsWithConfig } from "@/lib/db-queries";
import { ProspectDemoClient } from "./prospect-demo-client";

const DEMO_ORG_SLUG = "demo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ prospectSlug: string }>;
}): Promise<Metadata> {
  const { prospectSlug } = await params;
  const org = await getOrgBySlug(DEMO_ORG_SLUG);
  if (!org) return {};

  const floorplan = await getFloorplan(org.id, prospectSlug);
  if (!floorplan || !floorplan.is_prospect_demo) return {};

  return {
    title: `${floorplan.name} — Finch`,
    robots: { index: false, follow: false },
  };
}

export default async function ProspectDemoPage({
  params,
}: {
  params: Promise<{ prospectSlug: string }>;
}) {
  const { prospectSlug } = await params;

  const org = await getOrgBySlug(DEMO_ORG_SLUG);
  if (!org) notFound();

  const floorplan = await getFloorplan(org.id, prospectSlug);
  if (!floorplan || !floorplan.is_prospect_demo) notFound();

  const [categories, steps] = await Promise.all([
    getCategoriesForFloorplan(org.id, floorplan.id),
    getStepsWithConfig(floorplan.id),
  ]);

  if (categories.length === 0 || steps.length === 0) notFound();

  return (
    <ProspectDemoClient
      orgId={org.id}
      floorplanId={floorplan.id}
      floorplanSlug={prospectSlug}
      floorplanName={floorplan.name}
      categories={categories}
      steps={steps}
      loomUrl={floorplan.loom_url ?? null}
      calendlyUrl={floorplan.calendly_url ?? null}
    />
  );
}
