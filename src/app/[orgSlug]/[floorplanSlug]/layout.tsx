import type { Metadata } from "next";
import { getOrgBySlug, getFloorplan } from "@/lib/db-queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; floorplanSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug, floorplanSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) return { title: "Demo" };
  const floorplan = await getFloorplan(org.id, floorplanSlug);
  const planName = floorplan?.name ?? "Demo";

  return {
    title: `${org.name} — ${planName} Plan Upgrade Picker`,
    description: `Visualize your ${planName} Plan upgrades with AI-powered room visualization`,
  };
}

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
