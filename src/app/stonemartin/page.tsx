import Image from "next/image";
import Link from "next/link";
import { ResumeSavedDesignLink } from "./ResumeSavedDesignLink";

const SM_NAVY = "#1B2A4A";
const SM_GOLD = "#C5A572";

const floorplans = [
  { name: "The Kinkade", slug: "kinkade", image: "/floorplans/kinkade.webp", active: true },
  { name: "The Cunningham", slug: "cunningham", image: "/floorplans/cunningham.webp", active: false },
  { name: "The Filmore", slug: "filmore", image: "/floorplans/filmore.webp", active: false },
  { name: "The Overton", slug: "overton", image: "/floorplans/overton.webp", active: false },
  { name: "The Rosewood", slug: "rosewood", image: "/floorplans/rosewood.webp", active: false },
  { name: "The Sherfield", slug: "sherfield", image: "/floorplans/sherfield.webp", active: false },
  { name: "The Sutherland", slug: "sutherland", image: "/floorplans/sutherland.webp", active: false },
];

export default function StoneMartin() {
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
              const card = (
                <div className="group relative overflow-hidden border border-slate-200 bg-white">
                  <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                    <Image
                      src={fp.image}
                      alt={fp.name}
                      fill
                      className={`object-cover transition-transform duration-300 ${
                        fp.active
                          ? "group-hover:scale-[1.03]"
                          : "grayscale opacity-50"
                      }`}
                    />
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{fp.name}</p>
                    </div>
                    {fp.active && (
                      <span
                        className="shrink-0 w-2 h-2"
                        style={{ backgroundColor: SM_GOLD }}
                      />
                    )}
                  </div>
                </div>
              );

              if (fp.active) {
                return (
                  <Link
                    key={fp.slug}
                    href={`/stonemartin/${fp.slug}`}
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
