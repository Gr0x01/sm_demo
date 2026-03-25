"use client";

export type ResolvedPreset = {
  label: string;
  selections: Record<string, string>;
  imageUrl: string;
  price: number;
};

interface VariationGalleryProps {
  presets: ResolvedPreset[];
  activeIndex: number | null;
  onSelect: (preset: ResolvedPreset, index: number) => void;
}

export function VariationGallery({
  presets,
  activeIndex,
  onSelect,
}: VariationGalleryProps) {
  if (presets.length === 0) return null;

  return (
    <section className="bg-slate-50 py-10 md:py-14">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400 mb-5 text-center">
          Same kitchen, different selections
        </p>
        <div className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1 md:grid md:grid-cols-3 md:overflow-visible">
          {presets.map((preset, i) => {
            const isActive = activeIndex === i;
            return (
              <button
                key={i}
                onClick={() => onSelect(preset, i)}
                className={`group relative shrink-0 w-[75vw] md:w-auto snap-start cursor-pointer transition-all ${
                  isActive
                    ? "ring-2 ring-[var(--color-navy)]"
                    : "ring-1 ring-slate-200 hover:ring-slate-400"
                }`}
              >
                <div className="relative aspect-[3/2] overflow-hidden bg-slate-100">
                  <img
                    src={preset.imageUrl}
                    alt={`${preset.label} kitchen visualization`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="px-3 py-2.5 bg-white text-left">
                  <p className="text-xs font-semibold text-slate-700">{preset.label}</p>
                  <p className="text-xs text-slate-400">
                    {preset.price === 0
                      ? "Included"
                      : `+$${preset.price.toLocaleString()} in upgrades`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
