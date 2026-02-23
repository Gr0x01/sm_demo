import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { getOrgBySlug } from "@/lib/db-queries";
import { parseLogoType, parseHeaderStyle, parseCornerStyle } from "@/lib/branding";
import { BrandingSettings } from "@/components/admin/BrandingSettings";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const auth = await getAuthenticatedUser(orgSlug);
  if (!auth) redirect("/admin/login");

  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/admin");

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-3xl space-y-6">
        <div className="border border-slate-200 bg-white/90 backdrop-blur px-5 py-5 md:px-6 md:py-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold">Branding</p>
          <h1 className="text-3xl leading-tight tracking-tight mt-2">Settings</h1>
          <p className="text-slate-600 text-sm mt-2">
            Logo, colors, and display preferences for {org.name}.
          </p>
        </div>

        <div className="border border-slate-200 bg-white px-5 py-5 md:px-6 md:py-6 shadow-sm">
          <BrandingSettings
            orgId={auth.orgId}
            orgSlug={orgSlug}
            org={{
              name: org.name,
              logo_url: org.logo_url,
              logo_type: parseLogoType(org.logo_type),
              primary_color: org.primary_color || "#1b2d4e",
              secondary_color: org.secondary_color || "#C5A572",
              accent_color: org.accent_color || "#2767b1",
              header_style: parseHeaderStyle(org.header_style),
              corner_style: parseCornerStyle(org.corner_style),
            }}
          />
        </div>
      </div>
    </div>
  );
}
