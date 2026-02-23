import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getOrgBySlug, getFloorplansForOrg } from "@/lib/db-queries";
import { parseLogoType, parseHeaderStyle, parseCornerStyle } from "@/lib/branding";
import { ResumeSavedDesignLink } from "@/components/ResumeSavedDesignLink";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function getCoverImageUrl(coverPath: string | null): string | null {
  if (coverPath) {
    return `${SUPABASE_URL}/storage/v1/object/public/rooms/${coverPath}`;
  }
  return null;
}

export default async function OrgPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const floorplans = await getFloorplansForOrg(org.id);

  const host = (await headers()).get("host") ?? "";
  const isSubdomain =
    host.endsWith(".withfin.ch") || /^[^.]+\.localhost/.test(host);

  if (floorplans.length === 0) notFound();

  // Render chooser
  const linkPrefix = isSubdomain ? "" : `/${orgSlug}`;

  const primaryColor = org.primary_color || "#1b2d4e";
  const secondaryColor = org.secondary_color || "#C5A572";
  const logoType = parseLogoType(org.logo_type);
  const headerStyle = parseHeaderStyle(org.header_style);
  const cornerStyle = parseCornerStyle(org.corner_style);

  const isDarkHeader = headerStyle === "dark";
  const radiusStyle = cornerStyle === "rounded" ? "0.5rem" : "0px";

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav
        className={`sticky top-0 z-50 border-b backdrop-blur ${isDarkHeader ? "" : "border-slate-200"}`}
        style={isDarkHeader
          ? { backgroundColor: `${primaryColor}f2`, borderColor: `${primaryColor}33` }
          : { backgroundColor: "rgba(255,255,255,0.92)" }
        }
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {org.logo_url ? (
              <img src={org.logo_url} alt={org.name} className={`h-[12px] ${isDarkHeader ? "brightness-0 invert" : ""}`} />
            ) : (
              <span className={`text-sm font-semibold tracking-[0.06em] uppercase ${isDarkHeader ? "text-white" : "text-slate-900"}`}>
                {org.name}
              </span>
            )}
            {org.logo_url && logoType !== "wordmark" && (
              <span className={`hidden md:inline text-sm font-semibold tracking-[0.06em] uppercase ${isDarkHeader ? "text-white" : "text-slate-900"}`}>
                {org.name}
              </span>
            )}
          </div>
          <div className="flex items-center">
            <ResumeSavedDesignLink
              orgSlug={orgSlug}
              className="inline-flex items-center px-4 py-2 text-xs uppercase tracking-[0.14em] border transition-colors hover:bg-white/10"
              color={secondaryColor}
            />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-12 md:pt-20 md:pb-16" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-6xl mx-auto text-center">
          <p
            className="text-[10px] uppercase tracking-[0.24em] font-semibold mb-4"
            style={{ color: secondaryColor }}
          >
            {org.name} Design Studio
          </p>
          <h1 className="text-3xl md:text-5xl lg:text-6xl leading-[1] tracking-[-0.02em] text-white mb-5">
            See every room
            <br />
            before you decide.
          </h1>
          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Pick your countertops, cabinets, flooring, and more — then see
            exactly how they look together in your home. Choose your floor plan
            below to get started.
          </p>
        </div>
      </section>

      {/* Floorplan Grid */}
      <section className="px-6 py-14 md:py-20">
        <div className="max-w-6xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-400 mb-8 text-center">
            Floor Plans
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {floorplans.map((fp) => {
              const coverUrl = getCoverImageUrl(fp.cover_image_path);

              const card = (
                <div className="group relative overflow-hidden border border-slate-200 bg-white" style={{ borderRadius: radiusStyle }}>
                  <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={fp.name}
                        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${
                          fp.is_active
                            ? "group-hover:scale-[1.03]"
                            : "grayscale opacity-50"
                        }`}
                      />
                    ) : (
                      <div className={`absolute inset-0 flex items-center justify-center ${
                        fp.is_active ? "" : "grayscale opacity-50"
                      }`}>
                        <span className="text-slate-300 text-xs uppercase tracking-wider">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{fp.name}</p>
                    </div>
                    {fp.is_active && (
                      <span
                        className="shrink-0 w-2 h-2"
                        style={{ backgroundColor: secondaryColor }}
                      />
                    )}
                  </div>
                </div>
              );

              if (fp.is_active) {
                return (
                  <Link
                    key={fp.slug}
                    href={`${linkPrefix}/${fp.slug}`}
                    className="block hover:shadow-md transition-shadow"
                  >
                    {card}
                  </Link>
                );
              }

              return (
                <div key={fp.slug} className="cursor-default">
                  {card}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-8 border-t"
        style={{ borderColor: `${primaryColor}15` }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {org.logo_url ? (
              <img src={org.logo_url} alt="" className="h-4 opacity-40" />
            ) : (
              <span className="text-xs text-slate-400">{org.name}</span>
            )}
            {org.logo_url && logoType !== "wordmark" && (
              <span className="text-xs text-slate-400">
                {org.name}
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-300 uppercase tracking-[0.14em]">
            Powered by{" "}
            <a href="https://withfin.ch" className="text-slate-500 hover:text-slate-700 transition-colors">
              Finch
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
