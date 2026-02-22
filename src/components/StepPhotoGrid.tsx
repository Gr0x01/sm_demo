"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { StepConfig, StepPhoto } from "@/lib/step-config";
import { ImageLightbox } from "./ImageLightbox";
import { LogoLoader } from "./LogoLoader";
import { Expand } from "lucide-react";

interface StepPhotoGridProps {
  step: StepConfig;
  generatedImageUrls: Record<string, string>;
  generatingPhotoKeys: Set<string>;
  onGeneratePhoto: (photoKey: string, stepPhotoId: string, step: StepConfig) => void;
  onRetry: (photoKey: string, stepPhotoId: string, step: StepConfig) => void;
  errors: Record<string, string>;
  generatedWithSelections: Record<string, string>;
  getPhotoVisualSelections: (step: StepConfig, photo: StepPhoto | null, selections: Record<string, string>) => Record<string, string>;
  selections: Record<string, string>;
}

function stableStringify(obj: Record<string, string>): string {
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return JSON.stringify(sorted);
}

export function StepPhotoGrid({
  step,
  generatedImageUrls,
  generatingPhotoKeys,
  onGeneratePhoto,
  onRetry,
  errors,
  generatedWithSelections,
  getPhotoVisualSelections,
  selections,
}: StepPhotoGridProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const photos = step.photos ?? [];

  // Per-photo fingerprint helper (scoped by photo.subcategoryIds when set)
  const getFingerprint = useCallback(
    (photo: StepPhoto) => stableStringify(getPhotoVisualSelections(step, photo, selections)),
    [step, getPhotoVisualSelections, selections]
  );

  // Hero photo first, then rest
  const sortedPhotos = useMemo(() => {
    return [...photos].sort((a, b) => {
      if (a.isHero && !b.isHero) return -1;
      if (!a.isHero && b.isHero) return 1;
      return a.sortOrder - b.sortOrder;
    });
  }, [photos]);

  useEffect(() => {
    if (sortedPhotos.length === 0) {
      setActivePhotoId(null);
      return;
    }
    if (!activePhotoId || !sortedPhotos.some((p) => p.id === activePhotoId)) {
      setActivePhotoId(sortedPhotos[0].id);
    }
  }, [sortedPhotos, activePhotoId]);

  const activePhoto =
    sortedPhotos.find((p) => p.id === activePhotoId) ?? sortedPhotos[0];

  if (!sortedPhotos.length) return null;

  return (
    <>
      <div className="space-y-2.5">
        {activePhoto && (
          <PhotoViewerCard
            photo={activePhoto}
            generatedUrl={generatedImageUrls[activePhoto.id] ?? null}
            isGenerating={generatingPhotoKeys.has(activePhoto.id)}
            isStale={generatedWithSelections[activePhoto.id] !== getFingerprint(activePhoto) && !!generatedWithSelections[activePhoto.id]}
            error={errors[activePhoto.id] ?? null}
            onGenerate={() => onGeneratePhoto(activePhoto.id, activePhoto.id, step)}
            onRetry={() => onRetry(activePhoto.id, activePhoto.id, step)}
            onZoom={(src) => { setLightboxSrc(src); setLightboxPhotoId(activePhoto.id); }}
          />
        )}

        {sortedPhotos.length > 1 && <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max pr-1">
            {sortedPhotos.map((photo) => {
              const isActive = photo.id === activePhoto?.id;
              const generatedUrl = generatedImageUrls[photo.id] ?? null;
              const isGenerating = generatingPhotoKeys.has(photo.id);
              const isStale = generatedWithSelections[photo.id] !== getFingerprint(photo) && !!generatedWithSelections[photo.id];

              return (
                <button
                  key={photo.id}
                  onClick={() => setActivePhotoId(photo.id)}
                  className={`relative w-[74px] h-[54px] shrink-0 overflow-hidden border transition-all cursor-pointer ${
                    isActive
                      ? "border-[var(--color-navy)] ring-1 ring-[var(--color-navy)]"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                  title={photo.label}
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.label}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {generatedUrl && (
                    <img
                      key={generatedUrl}
                      src={generatedUrl}
                      alt={photo.label}
                      className="absolute inset-0 w-full h-full object-cover animate-photo-crossfade"
                    />
                  )}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <LogoLoader className="w-4 h-auto text-[var(--color-navy)]" />
                    </div>
                  )}
                  {isStale && generatedUrl && !isGenerating && (
                    <div className="absolute bottom-0 left-0 right-0 bg-amber-500 text-white text-[8px] font-bold text-center leading-3">
                      NEW
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>}
      </div>
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt="Generated preview"
          onClose={() => { setLightboxSrc(null); setLightboxPhotoId(null); }}
          onRetry={lightboxPhotoId && generatedImageUrls[lightboxPhotoId] ? () => onRetry(lightboxPhotoId, lightboxPhotoId, step) : undefined}
        />
      )}
    </>
  );
}

interface PhotoCardProps {
  photo: StepPhoto;
  generatedUrl: string | null;
  isGenerating: boolean;
  isStale: boolean;
  error: string | null;
  onGenerate: () => void;
  onRetry: () => void;
  onZoom: (src: string) => void;
}

function PhotoViewerCard({
  photo,
  generatedUrl,
  isGenerating,
  isStale,
  error,
  onGenerate,
  onRetry,
  onZoom,
}: PhotoCardProps) {
  const displayUrl = generatedUrl || photo.imageUrl;
  const hasGenerated = !!generatedUrl;

  return (
    <div className="relative overflow-hidden bg-gray-100 aspect-[16/10]">
      {/* Base image (always present) */}
      <img
        src={photo.imageUrl}
        alt={photo.label}
        className="absolute inset-0 w-full h-full object-cover cursor-pointer"
        onClick={() => onZoom(displayUrl)}
      />
      {/* Generated image (crossfades in over base) */}
      {generatedUrl && (
        <img
          key={generatedUrl}
          src={generatedUrl}
          alt={photo.label}
          className="absolute inset-0 w-full h-full object-cover cursor-pointer animate-photo-crossfade"
          onClick={() => onZoom(displayUrl)}
        />
      )}

      {/* Generating overlay */}
      {isGenerating && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <LogoLoader className="w-12 h-auto text-[var(--color-navy)] mb-2" />
          <p className="text-xs font-medium text-[var(--color-navy)]">Visualizing...</p>
        </div>
      )}

      {/* Stale badge */}
      {isStale && hasGenerated && !isGenerating && (
        <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 z-10">
          OUTDATED
        </div>
      )}

      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onZoom(displayUrl); }}
          className="w-6 h-6 bg-black/60 text-white flex items-center justify-center hover:bg-black/75 transition-colors cursor-pointer"
          title="View full size"
        >
          <Expand className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Photo label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 pt-4 pb-2">
        <div className="flex items-end justify-between gap-2">
          <p className="text-xs font-medium text-white truncate max-w-[52%]">{photo.label}</p>

          <div className="flex items-center gap-1 shrink-0">
            {!isGenerating && (
              <button
                onClick={(e) => { e.stopPropagation(); if (hasGenerated && !isStale) { onRetry(); } else { onGenerate(); } }}
                className="px-2 py-1 bg-[var(--color-navy)] text-white text-[10px] font-semibold hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer"
              >
                {hasGenerated && isStale ? "Update" : hasGenerated ? "Retry" : "Visualize"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && !isGenerating && (
        <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] px-1.5 py-0.5 max-w-[200px] truncate">
          {error}
        </div>
      )}
    </div>
  );
}
