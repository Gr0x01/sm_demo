"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StepConfig, StepPhoto } from "@/lib/step-config";
import { ImageLightbox } from "./ImageLightbox";
import { LogoLoader } from "./LogoLoader";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

interface GalleryViewProps {
  steps: StepConfig[];
  generatedImageUrls: Record<string, string>;
  generatingPhotoKeys: Set<string>;
  onGeneratePhoto: (photoKey: string, stepPhotoId: string, step: StepConfig) => void;
  onRetry: (photoKey: string, stepPhotoId: string, step: StepConfig) => void;
  onGenerateAll: () => void;
  generationCredits: { used: number; total: number } | null;
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

type GalleryPhoto = NonNullable<StepConfig["photos"]>[number];

interface GalleryItem {
  step: StepConfig;
  photo: GalleryPhoto;
  generatedUrl: string | null;
  isGenerating: boolean;
  isStale: boolean;
  hasGenerated: boolean;
  displayUrl: string;
  error: string | null;
  isKitchen: boolean;
}

function isKitchenPhoto(step: StepConfig, photo: GalleryPhoto): boolean {
  const haystack = `${step.id} ${step.name} ${photo.label}`.toLowerCase();
  return haystack.includes("kitchen");
}

const SLIDESHOW_INTERVAL_MS = 4200;

/** Crossfade viewer — keeps outgoing image visible while incoming fades in on top. */
function GalleryCrossfade({
  src,
  alt,
  isGenerating,
  onClick,
}: {
  src: string;
  alt: string;
  isGenerating: boolean;
  onClick: () => void;
}) {
  const [layers, setLayers] = useState<{ src: string; key: number }[]>([{ src, key: 0 }]);
  const nextKey = useRef(1);

  useEffect(() => {
    setLayers((prev) => {
      const top = prev[prev.length - 1];
      if (top.src === src) return prev;
      const key = nextKey.current++;
      // Keep only the current top (becomes background) + new layer on top
      return [top, { src, key }];
    });
  }, [src]);

  const handleAnimationEnd = useCallback((finishedKey: number) => {
    // Once the top layer finishes fading in, drop the background layer
    setLayers((prev) => (prev.length > 1 ? prev.filter((l) => l.key === finishedKey) : prev));
  }, []);

  return (
    <div className="group relative aspect-[16/10] overflow-hidden bg-gray-100 lg:aspect-[16/9]">
      {layers.map((layer, i) => {
        const isTop = i === layers.length - 1;
        const needsAnimation = layers.length > 1 && isTop;
        return (
          <img
            key={layer.key}
            src={layer.src}
            alt={alt}
            className={`absolute inset-0 h-full w-full cursor-pointer object-cover transition-transform duration-500 group-hover:scale-[1.02] ${
              needsAnimation ? "animate-photo-crossfade" : ""
            }`}
            onClick={onClick}
            onAnimationEnd={needsAnimation ? () => handleAnimationEnd(layer.key) : undefined}
          />
        );
      })}

      {isGenerating && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm">
          <LogoLoader className="mb-2 h-auto w-10 text-[var(--color-navy)]" />
          <p className="text-xs font-medium text-[var(--color-navy)]">Visualizing...</p>
        </div>
      )}
    </div>
  );
}

export function GalleryView({
  steps,
  generatedImageUrls,
  generatingPhotoKeys,
  onGeneratePhoto,
  onRetry,
  onGenerateAll,
  generationCredits,
  errors,
  generatedWithSelections,
  getPhotoVisualSelections,
  selections,
}: GalleryViewProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxContext, setLightboxContext] = useState<{ photoId: string; step: StepConfig } | null>(null);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const stepsWithPhotos = steps.filter(s => s.photos?.length);

  const isAnyGenerating = generatingPhotoKeys.size > 0;
  const capReached = generationCredits ? generationCredits.used >= generationCredits.total : false;

  const galleryItems: GalleryItem[] = useMemo(() => {
    const items = stepsWithPhotos.flatMap((step) => {
      return step.photos!.map((photo) => {
        const fingerprint = stableStringify(getPhotoVisualSelections(step, photo, selections));
        const generatedUrl = generatedImageUrls[photo.id] ?? null;
        const isGenerating = generatingPhotoKeys.has(photo.id);
        const isStale =
          generatedWithSelections[photo.id] !== fingerprint && !!generatedWithSelections[photo.id];
        const hasGenerated = !!generatedUrl;

        return {
          step,
          photo,
          generatedUrl,
          isGenerating,
          isStale,
          hasGenerated,
          displayUrl: generatedUrl || photo.imageUrl,
          error: errors[photo.id] ?? null,
          isKitchen: isKitchenPhoto(step, photo),
        };
      });
    });

    return items.sort((a, b) => {
      if (a.step.number !== b.step.number) return a.step.number - b.step.number;
      if (a.photo.sortOrder !== b.photo.sortOrder) return a.photo.sortOrder - b.photo.sortOrder;
      return a.photo.label.localeCompare(b.photo.label);
    });
  }, [
    stepsWithPhotos,
    getPhotoVisualSelections,
    selections,
    generatedImageUrls,
    generatingPhotoKeys,
    generatedWithSelections,
    errors,
  ]);

  // Derive pending count from galleryItems (stale or never-generated, not currently generating)
  const pendingCount = galleryItems.filter(
    (item) => (item.isStale || !item.hasGenerated) && !item.isGenerating
  ).length;

  const preferredItem =
    galleryItems.find((item) => item.isKitchen && item.hasGenerated && !item.isGenerating) ||
    galleryItems.find((item) => item.isKitchen) ||
    galleryItems.find((item) => item.hasGenerated && !item.isGenerating) ||
    galleryItems[0] ||
    null;

  useEffect(() => {
    if (!galleryItems.length) {
      setActivePhotoId(null);
      return;
    }
    if (activePhotoId && galleryItems.some((item) => item.photo.id === activePhotoId)) return;
    setActivePhotoId(preferredItem?.photo.id ?? galleryItems[0].photo.id);
  }, [galleryItems, activePhotoId, preferredItem]);

  const activeItem =
    galleryItems.find((item) => item.photo.id === activePhotoId) || preferredItem || null;
  const canAnimate = galleryItems.length > 1;

  const shiftActivePhoto = useCallback(
    (direction: 1 | -1) => {
      setActivePhotoId((currentId) => {
        if (!galleryItems.length) return null;
        const currentIndex = galleryItems.findIndex((item) => item.photo.id === currentId);
        const baseIndex = currentIndex >= 0 ? currentIndex : 0;
        const nextIndex = (baseIndex + direction + galleryItems.length) % galleryItems.length;
        return galleryItems[nextIndex].photo.id;
      });
    },
    [galleryItems]
  );

  useEffect(() => {
    if (!canAnimate && isAutoPlaying) {
      setIsAutoPlaying(false);
    }
  }, [canAnimate, isAutoPlaying]);

  useEffect(() => {
    if (!isAutoPlaying || !canAnimate) return;
    const timer = window.setInterval(() => {
      shiftActivePhoto(1);
    }, SLIDESHOW_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isAutoPlaying, canAnimate, shiftActivePhoto]);

  return (
    <div className="space-y-8">
      {/* Header with Visualize All + Credits */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-navy)]">Photo Gallery</h2>
          <p className="text-sm text-gray-500 mt-0.5">Review AI visualizations across all rooms</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Credits meter */}
          {generationCredits && generationCredits.used >= generationCredits.total * 0.75 && (
            <div className="text-sm text-gray-500">
              <span className="font-semibold text-[var(--color-navy)]">
                {generationCredits.total - generationCredits.used}
              </span>
              /{generationCredits.total} remaining
            </div>
          )}

          {/* Visualize All button */}
          {pendingCount > 0 && (
            <button
              onClick={onGenerateAll}
              disabled={isAnyGenerating || capReached}
              className={`inline-flex items-center px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                isAnyGenerating || capReached
                  ? "border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "border border-gray-300 text-gray-600 hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"
              }`}
            >
              Visualize All ({pendingCount})
            </button>
          )}
        </div>
      </div>

      {/* Cap reached message */}
      {capReached && (
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          You&apos;ve used all {generationCredits?.total} visualizations for this session. Your current images are still available.
        </div>
      )}

      {activeItem && (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="order-2 border border-slate-200 bg-white lg:order-1">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Scenes
              </span>
              {canAnimate && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => shiftActivePhoto(-1)}
                    className="inline-flex h-6 w-6 items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    aria-label="Previous scene"
                    title="Previous scene"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAutoPlaying((value) => !value)}
                    className="inline-flex h-6 w-6 items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    aria-label={isAutoPlaying ? "Pause slideshow" : "Play slideshow"}
                    title={isAutoPlaying ? "Pause slideshow" : "Play slideshow"}
                  >
                    {isAutoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftActivePhoto(1)}
                    className="inline-flex h-6 w-6 items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    aria-label="Next scene"
                    title="Next scene"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div className="max-h-[64vh] overflow-y-auto">
              {galleryItems.map((item) => {
                const isActive = item.photo.id === activeItem.photo.id;
                const hasIssue = !!item.error && !item.isGenerating;

                return (
                  <button
                    key={item.photo.id}
                    onClick={() => {
                      setActivePhotoId(item.photo.id);
                      setIsAutoPlaying(false);
                    }}
                    className={`flex w-full items-center gap-3 border-l-2 px-2.5 py-2 text-left transition-colors cursor-pointer ${
                      isActive
                        ? "border-l-[var(--color-navy)] bg-slate-50"
                        : "border-l-transparent hover:bg-slate-50"
                    }`}
                  >
                    <div className="relative h-[56px] w-[74px] shrink-0 overflow-hidden bg-slate-100">
                      <img
                        src={item.photo.imageUrl}
                        alt={item.photo.label}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      {item.generatedUrl && (
                        <img
                          key={item.generatedUrl}
                          src={item.generatedUrl}
                          alt={item.photo.label}
                          className="absolute inset-0 h-full w-full object-cover animate-photo-crossfade"
                        />
                      )}
                      {item.isGenerating && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/75">
                          <LogoLoader className="h-auto w-4 text-[var(--color-navy)]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.photo.label}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {item.step.name}
                      </p>
                      <p
                        className={`truncate text-[11px] ${
                          item.isGenerating
                            ? "text-[var(--color-navy)]"
                            : hasIssue
                              ? "text-red-600"
                              : item.isStale && item.hasGenerated
                                ? "text-amber-700"
                                : "text-slate-400"
                        }`}
                      >
                        {item.isGenerating
                          ? "Visualizing..."
                          : hasIssue
                            ? item.error
                            : item.isStale && item.hasGenerated
                              ? "Outdated"
                              : "Ready"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="order-1 border border-slate-200 bg-white lg:order-2">
            <GalleryCrossfade
              src={activeItem.displayUrl}
              alt={activeItem.photo.label}
              isGenerating={activeItem.isGenerating}
              onClick={() => {
                setLightboxSrc(activeItem.displayUrl);
                setLightboxContext({ photoId: activeItem.photo.id, step: activeItem.step });
              }}
            />

            <div className="border-t border-slate-200 bg-white px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-baseline gap-3">
                  <p className="truncate text-base font-semibold text-slate-900">
                    {activeItem.photo.label}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {activeItem.step.name}
                  </p>
                </div>

                {!activeItem.isGenerating && (
                  <button
                    onClick={() => {
                      if (activeItem.hasGenerated && !activeItem.isStale) {
                        onRetry(activeItem.photo.id, activeItem.photo.id, activeItem.step);
                      } else {
                        onGeneratePhoto(activeItem.photo.id, activeItem.photo.id, activeItem.step);
                      }
                    }}
                    disabled={capReached}
                    className={`shrink-0 px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                      capReached
                        ? "border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "border border-gray-300 text-gray-600 hover:border-[var(--color-navy)] hover:text-[var(--color-navy)]"
                    }`}
                  >
                    {activeItem.hasGenerated && activeItem.isStale
                      ? "Update"
                      : activeItem.hasGenerated
                        ? "Retry"
                        : "Visualize"}
                  </button>
                )}
              </div>
              {(activeItem.isStale && activeItem.hasGenerated) || (activeItem.error && !activeItem.isGenerating) ? (
                <p className="mt-1 truncate text-[11px] text-slate-500">
                  {activeItem.isStale && activeItem.hasGenerated ? "Outdated" : ""}
                  {activeItem.error && !activeItem.isGenerating
                    ? `${activeItem.isStale && activeItem.hasGenerated ? " · " : ""}${activeItem.error}`
                    : ""}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      )}

      {stepsWithPhotos.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No photos available</p>
          <p className="text-sm mt-1">Photos will appear here once they&apos;re uploaded to your floorplan steps.</p>
        </div>
      )}

      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt="Gallery image"
          onClose={() => { setLightboxSrc(null); setLightboxContext(null); }}
          onRetry={lightboxContext && generatedImageUrls[lightboxContext.photoId] ? () => onRetry(lightboxContext.photoId, lightboxContext.photoId, lightboxContext.step) : undefined}
        />
      )}
    </div>
  );
}
