import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServiceClient } from "@/lib/supabase";
import { isSubdomain } from "@/lib/subdomain";
import {
  getOrgBySlug,
  getFloorplan,
  getCategoriesForFloorplan,
  getStepsWithConfig,
  getGeneratedImagesForSession,
} from "@/lib/db-queries";
import { SESSION_COLUMNS, mapRowToPublicSession } from "@/lib/buyer-session";
import { calculateTotal } from "@/lib/pricing";
import { buildUpgradeGroups } from "@/lib/upgrade-groups";
import { BuildSheet } from "@/components/BuildSheet";

export const dynamic = "force-dynamic";

const getSessionData = cache(async (orgSlug: string, floorplanSlug: string, token: string) => {
  const supabase = getServiceClient();
  const { data: row } = await supabase
    .from("buyer_sessions")
    .select(`${SESSION_COLUMNS}, organizations(slug), floorplans(slug)`)
    .eq("resume_token", token)
    .single();

  if (!row) return null;

  const session = mapRowToPublicSession(row);

  const org = await getOrgBySlug(orgSlug);
  if (!org || org.id !== session.orgId) return null;

  const floorplan = await getFloorplan(org.id, floorplanSlug);
  if (!floorplan || floorplan.id !== session.floorplanId) return null;

  return { session, org, floorplan };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; floorplanSlug: string; token: string }>;
}): Promise<Metadata> {
  const { orgSlug, floorplanSlug, token } = await params;
  const data = await getSessionData(orgSlug, floorplanSlug, token);

  if (!data) return {};

  const { org, floorplan } = data;
  const title = `${floorplan.name} Selections — ${org.name}`;
  const description = "Your home selections, visualized.";
  const subdomain = await isSubdomain();
  const ogPath = subdomain
    ? `/${floorplanSlug}/summary/${token}/og`
    : `/${orgSlug}/${floorplanSlug}/summary/${token}/og`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogPath,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    referrer: "no-referrer",
    robots: { index: false, follow: false },
  };
}

export default async function BuildSheetPage({
  params,
}: {
  params: Promise<{ orgSlug: string; floorplanSlug: string; token: string }>;
}) {
  const { orgSlug, floorplanSlug, token } = await params;
  const data = await getSessionData(orgSlug, floorplanSlug, token);
  if (!data) notFound();

  const { session, org, floorplan } = data;

  const [categories, steps, generatedImages] = await Promise.all([
    getCategoriesForFloorplan(org.id, floorplan.id),
    getStepsWithConfig(floorplan.id),
    getGeneratedImagesForSession(session.id),
  ]);

  // Compute upgrade groups + total on the server to avoid sending full categories to client
  const upgradeGroups = buildUpgradeGroups(session.selections, session.quantities, steps, categories);
  const total = calculateTotal(session.selections, session.quantities, categories);

  return (
    <BuildSheet
      upgradeGroups={upgradeGroups}
      total={total}
      planName={`${floorplan.name} Plan`}
      community={floorplan.community ?? ""}
      orgName={org.name}
      logoUrl={org.logo_url}
      buyerEmail={session.buyerEmail}
      steps={steps}
      generatedImages={generatedImages}
      orgTheme={{
        primaryColor: org.primary_color || "#1b2d4e",
        secondaryColor: org.secondary_color || "#C5A572",
        accentColor: org.accent_color || "#2767b1",
      }}
    />
  );
}
