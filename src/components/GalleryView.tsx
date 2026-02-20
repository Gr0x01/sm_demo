"use client";

import { useState } from "react";
import type { StepConfig } from "@/lib/step-config";
import { ImageLightbox } from "./ImageLightbox";
import { LogoLoader } from "./LogoLoader";
import { ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";

interface GalleryViewProps {
  steps: StepConfig[];
  generatedImageUrls: Record<string, string>;
  generatingPhotoKeys: Set<string>;
  onGeneratePhoto: (photoKey: string, stepPhotoId: string, step: StepConfig) => void;
  onGenerateAll: () => void;
  onFeedback: (photoKey: string, vote: 1 | -1) => void;
  feedbackVotes: Record<string, 1 | -1>;
  generationCredits: { used: number; total: number } | null;
  errors: Record<string, string>;
  generatedWithSelections: Record<string, string>;
  getPhotoVisualSelections: (step: StepConfig, selections: Record<string, string>) => Record<string, string>;
  selections: Record<string, string>;
}

function stableStringify(obj: Record<string, string>): string {
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return JSON.stringify(sorted);
}

export function GalleryView({
  steps,
  generatedImageUrls,
  generatingPhotoKeys,
  onGeneratePhoto,
  onGenerateAll,
  onFeedback,
  feedbackVotes,
  generationCredits,
  errors,
  generatedWithSelections,
  getPhotoVisualSelections,
  selections,
}: GalleryViewProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Count pending photos (need generation or are stale)
  let pendingCount = 0;
  const stepsWithPhotos = steps.filter(s => s.photos?.length);

  for (const step of stepsWithPhotos) {
    const fingerprint = stableStringify(getPhotoVisualSelections(step, selections));
    for (const photo of step.photos!) {
      const existing = generatedWithSelections[photo.id];
      if (existing !== fingerprint && !generatingPhotoKeys.has(photo.id)) {
        pendingCount++;
      }
    }
  }

  const isAnyGenerating = generatingPhotoKeys.size > 0;
  const capReached = generationCredits ? generationCredits.used >= generationCredits.total : false;

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
          {generationCredits && (
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
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
                isAnyGenerating || capReached
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-hover)] active:scale-[0.98]"
              }`}
            >
              <Sparkles className="w-4 h-4" />
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

      {/* Step groups */}
      {stepsWithPhotos.map((step) => {
        const fingerprint = stableStringify(getPhotoVisualSelections(step, selections));

        return (
          <div key={step.id}>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
              {step.name}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {step.photos!.map((photo) => {
                const generatedUrl = generatedImageUrls[photo.id] ?? null;
                const isGenerating = generatingPhotoKeys.has(photo.id);
                const isStale = generatedWithSelections[photo.id] !== fingerprint && !!generatedWithSelections[photo.id];
                const hasGenerated = !!generatedUrl;
                const displayUrl = generatedUrl || photo.imageUrl;
                const vote = feedbackVotes[photo.id] ?? null;
                const error = errors[photo.id] ?? null;

                return (
                  <div key={photo.id} className="relative overflow-hidden bg-gray-100 aspect-[4/3] group">
                    <img
                      src={displayUrl}
                      alt={photo.label}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setLightboxSrc(displayUrl)}
                    />

                    {/* Generating overlay */}
                    {isGenerating && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                        <LogoLoader className="w-10 h-auto text-[var(--color-navy)] mb-2" />
                        <p className="text-xs font-medium text-[var(--color-navy)]">Visualizing...</p>
                      </div>
                    )}

                    {/* Stale badge */}
                    {isStale && hasGenerated && !isGenerating && (
                      <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5">
                        OUTDATED
                      </div>
                    )}

                    {/* Bottom overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 pt-6 pb-2">
                      <div className="flex items-end justify-between gap-2">
                        <p className="text-xs font-medium text-white truncate">{photo.label}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          {hasGenerated && !isGenerating && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); onFeedback(photo.id, 1); }}
                                className={`p-1 transition-colors cursor-pointer ${
                                  vote === 1 ? "text-green-400" : "text-white/60 hover:text-green-400"
                                }`}
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onFeedback(photo.id, -1); }}
                                className={`p-1 transition-colors cursor-pointer ${
                                  vote === -1 ? "text-red-400" : "text-white/60 hover:text-red-400"
                                }`}
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {!isGenerating && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onGeneratePhoto(photo.id, photo.id, step); }}
                              disabled={capReached}
                              className={`px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                                capReached
                                  ? "bg-gray-400 text-white cursor-not-allowed"
                                  : "bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-hover)]"
                              }`}
                            >
                              {hasGenerated && isStale ? "Update" : hasGenerated ? "Redo" : "Visualize"}
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
              })}
            </div>
          </div>
        );
      })}

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
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </div>
  );
}
