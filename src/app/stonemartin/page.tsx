import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { ResumeSavedDesignLink } from "./ResumeSavedDesignLink";
import { getOrgBySlug, getFloorplansForOrg } from "@/lib/db-queries";

const SM_NAVY = "#1B2A4A";
const SM_GOLD = "#C5A572";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function getCoverImageUrl(coverPath: string | null): string | null {
  if (coverPath) {
    return `${SUPABASE_URL}/storage/v1/object/public/rooms/${coverPath}`;
  }
  return null;
}

// Static fallback images for existing SM floorplans (transition period)
const STATIC_COVERS: Record<string, string> = {
  kinkade: "/floorplans/kinkade.webp",
  cunningham: "/floorplans/cunningham.webp",
  filmore: "/floorplans/filmore.webp",
  overton: "/floorplans/overton.webp",
  rosewood: "/floorplans/rosewood.webp",
  sherfield: "/floorplans/sherfield.webp",
  sutherland: "/floorplans/sutherland.webp",
};

export default async function StoneMartin() {
  const org = await getOrgBySlug("stonemartin");
  const floorplans = org ? await getFloorplansForOrg(org.id) : [];

  const host = (await headers()).get("host") ?? "";
  const isSubdomain =
    host.endsWith(".withfin.ch") || /^[^.]+\.localhost/.test(host);
  const linkPrefix = isSubdomain ? "" : "/stonemartin";
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 border-b backdrop-blur"
        style={{ backgroundColor: `${SM_NAVY}f2`, borderColor: `${SM_NAVY}33` }}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="" width={28} height={15} className="brightness-0 invert" />
            <span className="text-sm font-semibold text-white tracking-[0.06em] uppercase">
              Stone Martin Builders
            </span>
          </div>
          <div className="flex items-center">
            <ResumeSavedDesignLink
              orgSlug="stonemartin"
              className="inline-flex items-center px-4 py-2 text-xs uppercase tracking-[0.14em] border transition-colors hover:bg-white/10"
              color={SM_GOLD}
            />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-12 md:pt-20 md:pb-16" style={{ backgroundColor: SM_NAVY }}>
        <div className="max-w-6xl mx-auto text-center">
          <p
            className="text-[10px] uppercase tracking-[0.24em] font-semibold mb-4"
            style={{ color: SM_GOLD }}
          >
            Stone Martin Design Studio
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
              const dbCover = getCoverImageUrl(fp.cover_image_path);
              const staticCover = STATIC_COVERS[fp.slug] ?? null;
              const imageSrc = dbCover ?? staticCover;

              const card = (
                <div className="group relative overflow-hidden border border-slate-200 bg-white">
                  <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                    {dbCover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={dbCover}
                        alt={fp.name}
                        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${
                          fp.is_active
                            ? "group-hover:scale-[1.03]"
                            : "grayscale opacity-50"
                        }`}
                      />
                    ) : imageSrc ? (
                      <Image
                        src={imageSrc}
                        alt={fp.name}
                        fill
                        className={`object-cover transition-transform duration-300 ${
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
                        style={{ backgroundColor: SM_GOLD }}
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
        style={{ borderColor: `${SM_NAVY}15` }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="" width={20} height={11} className="opacity-40" />
            <span className="text-xs text-slate-400">
              Stone Martin Builders
            </span>
          </div>
          <p className="text-[10px] text-slate-300 uppercase tracking-[0.14em]">
            Powered by{" "}
            <Link href="/" className="text-slate-500 hover:text-slate-700 transition-colors">
              Finch
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
