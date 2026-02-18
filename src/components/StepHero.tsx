"use client";

import { useState } from "react";
import type { StepConfig } from "@/lib/step-config";
import { ImageLightbox } from "./ImageLightbox";
import { LogoLoader } from "./LogoLoader";

const overlayLabels: Record<string, string> = {
  "set-your-style": "Visualizing Your Style...",
  "design-your-kitchen": "Visualizing Your Kitchen...",
  "primary-bath": "Visualizing Your Bathroom...",
  "secondary-spaces": "Visualizing Your Spaces...",
};

interface StepHeroProps {
  step: StepConfig;
  generatedImageUrl: string | null;
  isGenerating: boolean;
  compact?: boolean;
}

export function StepHero({ step, generatedImageUrl, isGenerating, compact }: StepHeroProps) {
  const [showZoom, setShowZoom] = useState(false);

  // The image to show in the lightbox — generated takes priority over room photo
  const displayedImageUrl = generatedImageUrl || (typeof step.heroImage === "string" ? step.heroImage : step.heroImage?.[0]);

  if (step.heroVariant === "none") {
    if (compact) return null;
    return (
      <div className="w-full bg-[var(--color-navy)] px-6 py-8">
        <h2 className="text-white text-xl font-bold">{step.name}</h2>
        <p className="text-white/60 text-sm mt-1">{step.subtitle}</p>
      </div>
    );
  }

  // Split variant in compact mode (sidebar)
  if (step.heroVariant === "split" && Array.isArray(step.heroImage)) {
    if (compact) {
      return (
        <>
          <div
            className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100 cursor-pointer group"
            onClick={() => !isGenerating && setShowZoom(true)}
          >
            {isGenerating && <GeneratingOverlay stepId={step.id} />}
            <img
              src={step.heroImage[0]}
              alt={step.name}
              className="w-full h-full object-cover"
            />
            {generatedImageUrl && (
              <img
                key={generatedImageUrl}
                src={generatedImageUrl}
                alt={`${step.name} — AI Generated`}
                className="absolute inset-0 w-full h-full object-cover animate-image-reveal"
              />
            )}
            <ZoomHint />
          </div>
          {showZoom && displayedImageUrl && (
            <ImageLightbox
              src={displayedImageUrl}
              alt={generatedImageUrl ? `${step.name} — AI Generated` : step.name}
              onClose={() => setShowZoom(false)}
            />
          )}
        </>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {step.heroImage.map((img, i) => (
          <div key={i} className="relative aspect-[4/3] overflow-hidden bg-gray-100">
            <img src={img} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

  if (step.heroVariant === "compact" && !compact) {
    const img = typeof step.heroImage === "string" ? step.heroImage : step.heroImage[0];
    return (
      <div className="relative w-full aspect-[21/9] max-h-[28vh] overflow-hidden bg-gray-100">
        <img src={img} alt={step.name} className="w-full h-full object-cover" />
      </div>
    );
  }

  // "full" variant (and compact variant when compact prop is true)
  const img = typeof step.heroImage === "string" ? step.heroImage : step.heroImage[0];

  if (compact) {
    return (
      <>
        <div
          className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100 cursor-pointer group"
          onClick={() => !isGenerating && setShowZoom(true)}
        >
          {isGenerating && <GeneratingOverlay stepId={step.id} />}
          <img
            src={img}
            alt={step.name}
            className="w-full h-full object-cover"
          />
          {generatedImageUrl && (
            <img
              key={generatedImageUrl}
              src={generatedImageUrl}
              alt={`${step.name} — AI Generated`}
              className="absolute inset-0 w-full h-full object-cover animate-image-reveal"
            />
          )}
          <ZoomHint />
        </div>
        {showZoom && displayedImageUrl && (
          <ImageLightbox
            src={displayedImageUrl}
            alt={generatedImageUrl ? `${step.name} — AI Generated` : step.name}
            onClose={() => setShowZoom(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        className="relative w-full aspect-[16/9] max-h-[45vh] overflow-hidden bg-gray-100 cursor-pointer group"
        onClick={() => !isGenerating && setShowZoom(true)}
      >
        {isGenerating && <GeneratingOverlay stepId={step.id} />}
        <img
          src={img}
          alt={step.name}
          className="w-full h-full object-cover"
        />
        {generatedImageUrl && (
          <img
            key={generatedImageUrl}
            src={generatedImageUrl}
            alt={`${step.name} — AI Generated`}
            className="absolute inset-0 w-full h-full object-cover animate-image-reveal"
          />
        )}
        <ZoomHint />
      </div>
      {showZoom && displayedImageUrl && (
        <ImageLightbox
          src={displayedImageUrl}
          alt={generatedImageUrl ? `${step.name} — AI Generated` : step.name}
          onClose={() => setShowZoom(false)}
        />
      )}
    </>
  );
}

/* ── Zoom hint icon — appears on hover ──────────────────────────── */
function ZoomHint() {
  return (
    <div className="absolute bottom-2 right-2 w-8 h-8 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15zM10.5 7.5v6m3-3h-6" />
      </svg>
    </div>
  );
}

function GeneratingOverlay({ stepId }: { stepId: string }) {
  const label = overlayLabels[stepId] ?? "Visualizing...";
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm overlay-enter">
      <LogoLoader className="w-16 h-auto text-[var(--color-navy)] mb-4" />
      <p className="text-sm font-medium text-[var(--color-navy)]">
        {label}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        This usually takes about a minute
      </p>
    </div>
  );
}
