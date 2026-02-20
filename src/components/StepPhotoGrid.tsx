"use client";

import { useState } from "react";
import type { StepConfig, StepPhoto } from "@/lib/step-config";
import { ImageLightbox } from "./ImageLightbox";
import { LogoLoader } from "./LogoLoader";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface StepPhotoGridProps {
  step: StepConfig;
  generatedImageUrls: Record<string, string>;
  generatingPhotoKeys: Set<string>;
  onGeneratePhoto: (photoKey: string, stepPhotoId: string, step: StepConfig) => void;
  onFeedback: (photoKey: string, vote: 1 | -1) => void;
  feedbackVotes: Record<string, 1 | -1>;
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

export function StepPhotoGrid({
  step,
  generatedImageUrls,
  generatingPhotoKeys,
  onGeneratePhoto,
  onFeedback,
  feedbackVotes,
  errors,
  generatedWithSelections,
  getPhotoVisualSelections,
  selections,
}: StepPhotoGridProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (!step.photos?.length) return null;

  const currentFingerprint = stableStringify(getPhotoVisualSelections(step, selections));

  // Hero photo first, then rest
  const sortedPhotos = [...step.photos].sort((a, b) => {
    if (a.isHero && !b.isHero) return -1;
    if (!a.isHero && b.isHero) return 1;
    return a.sortOrder - b.sortOrder;
  });

  return (
    <>
      <div className="space-y-2">
        {sortedPhotos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            generatedUrl={generatedImageUrls[photo.id] ?? null}
            isGenerating={generatingPhotoKeys.has(photo.id)}
            isStale={generatedWithSelections[photo.id] !== currentFingerprint && !!generatedWithSelections[photo.id]}
            error={errors[photo.id] ?? null}
            vote={feedbackVotes[photo.id] ?? null}
            onGenerate={() => onGeneratePhoto(photo.id, photo.id, step)}
            onFeedback={(vote) => onFeedback(photo.id, vote)}
            onZoom={(src) => setLightboxSrc(src)}
            isHero={photo.isHero}
          />
        ))}
      </div>
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt="Generated preview"
          onClose={() => setLightboxSrc(null)}
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
  vote: 1 | -1 | null;
  onGenerate: () => void;
  onFeedback: (vote: 1 | -1) => void;
  onZoom: (src: string) => void;
  isHero: boolean;
}

function PhotoCard({
  photo,
  generatedUrl,
  isGenerating,
  isStale,
  error,
  vote,
  onGenerate,
  onFeedback,
  onZoom,
  isHero,
}: PhotoCardProps) {
  const displayUrl = generatedUrl || photo.imageUrl;
  const hasGenerated = !!generatedUrl;

  return (
    <div className={`relative overflow-hidden bg-gray-100 ${isHero ? "aspect-[4/3]" : "aspect-[16/10]"}`}>
      {/* Base/generated image */}
      <img
        src={displayUrl}
        alt={photo.label}
        className="w-full h-full object-cover cursor-pointer"
        onClick={() => onZoom(displayUrl)}
      />

      {/* Generating overlay */}
      {isGenerating && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <LogoLoader className="w-12 h-auto text-[var(--color-navy)] mb-2" />
          <p className="text-xs font-medium text-[var(--color-navy)]">Visualizing...</p>
        </div>
      )}

      {/* Stale badge */}
      {isStale && hasGenerated && !isGenerating && (
        <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5">
          OUTDATED
        </div>
      )}

      {/* Photo label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 pt-4 pb-2">
        <div className="flex items-end justify-between gap-2">
          <p className="text-xs font-medium text-white truncate">{photo.label}</p>

          <div className="flex items-center gap-1 shrink-0">
            {/* Feedback buttons */}
            {hasGenerated && !isGenerating && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onFeedback(1); }}
                  className={`p-1 transition-colors cursor-pointer ${
                    vote === 1 ? "text-green-400" : "text-white/60 hover:text-green-400"
                  }`}
                  title="Looks good"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onFeedback(-1); }}
                  className={`p-1 transition-colors cursor-pointer ${
                    vote === -1 ? "text-red-400" : "text-white/60 hover:text-red-400"
                  }`}
                  title="Try again"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Visualize button */}
            {!isGenerating && (
              <button
                onClick={(e) => { e.stopPropagation(); onGenerate(); }}
                className="px-2 py-1 bg-[var(--color-navy)] text-white text-[10px] font-semibold hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer"
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
}
