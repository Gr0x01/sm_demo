"use client";

import type { StepConfig } from "@/lib/step-config";

interface StepHeroProps {
  step: StepConfig;
  generatedImageUrl: string | null;
  isGenerating: boolean;
}

export function StepHero({ step, generatedImageUrl, isGenerating }: StepHeroProps) {
  if (step.heroVariant === "none") {
    return (
      <div className="w-full bg-[var(--color-navy)] px-6 py-8">
        <h2 className="text-white text-xl font-bold">{step.name}</h2>
        <p className="text-white/60 text-sm mt-1">{step.subtitle}</p>
      </div>
    );
  }

  if (step.heroVariant === "split" && Array.isArray(step.heroImage)) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {step.heroImage.map((img, i) => (
          <div key={i} className="relative aspect-[4/3] overflow-hidden bg-gray-100">
            <img src={img} alt="" className="w-full h-full object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
              <p className="text-white text-sm font-semibold">
                {i === 0 ? "Vanity" : "Shower"}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (step.heroVariant === "compact") {
    const img = typeof step.heroImage === "string" ? step.heroImage : step.heroImage[0];
    return (
      <div className="relative w-full aspect-[21/9] max-h-[28vh] overflow-hidden bg-gray-100">
        <img src={img} alt={step.name} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-5 py-3">
          <p className="text-white text-lg font-bold">{step.name}</p>
          <p className="text-white/70 text-xs">{step.subtitle}</p>
        </div>
      </div>
    );
  }

  // "full" variant — same as current RoomHero with AI generation support
  const img = typeof step.heroImage === "string" ? step.heroImage : step.heroImage[0];
  return (
    <div className="relative w-full aspect-[16/9] max-h-[45vh] overflow-hidden bg-gray-100">
      {isGenerating && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium text-[var(--color-navy)]">
            Generating your kitchen...
          </p>
          <p className="text-xs text-gray-400 mt-1">
            This takes 10-30 seconds
          </p>
        </div>
      )}

      <img
        src={generatedImageUrl || img}
        alt={step.name}
        className="w-full h-full object-cover"
      />

      {!generatedImageUrl && !isGenerating && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-5 py-4">
          <p className="text-white text-lg font-bold">{step.name}</p>
          <p className="text-white/70 text-sm">{step.subtitle}</p>
        </div>
      )}
    </div>
  );
}
