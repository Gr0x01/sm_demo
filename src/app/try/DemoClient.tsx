"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { DemoUploader, loadSamplePhoto } from "./DemoUploader";
import { SiteNav } from "@/components/SiteNav";
import { DemoPickerPanel } from "./DemoPickerPanel";
import { DemoViewer } from "./DemoViewer";
import { GenerationCounter } from "./GenerationCounter";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";
import { filterDemoSelectionsByVisibility } from "@/lib/demo-scene";
import { useTrack } from "@/hooks/useTrack";

type DemoPhase = "picking" | "generating" | "result";

interface UploadedPhoto {
  dataUrl: string;
  hash: string;
  sceneAnalysis?: DemoSceneAnalysis;
}

interface GenerationEntry {
  selections: Record<string, string>;
  imageUrl: string;
}

// Cookie helpers
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days = 30) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/try; SameSite=Lax`;
}

// sessionStorage keys
const SS_PHOTO = "finch_demo_photo";
const SS_SELECTIONS = "finch_demo_selections";
const SS_GENERATED = "finch_demo_generated_url";
const SS_HISTORY = "finch_demo_history";

export function DemoClient({ bare = false, autoSample = false, headerContent }: { bare?: boolean; autoSample?: boolean; headerContent?: React.ReactNode }) {
  const track = useTrack();
  const [phase, setPhase] = useState<DemoPhase>("picking");
  const [uploadedPhoto, setUploadedPhoto] = useState<UploadedPhoto | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationsUsed, setGenerationsUsed] = useState(0);
  const [generationHistory, setGenerationHistory] = useState<GenerationEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const previewSectionRef = useRef<HTMLDivElement | null>(null);
  const selectionsRef = useRef(selections);
  selectionsRef.current = selections;

  // Restore session from sessionStorage + cookies on mount
  useEffect(() => {
    const saved = getCookie("finch_demo_gens");
    if (saved) setGenerationsUsed(parseInt(saved, 10) || 0);

    if (!getCookie("finch_demo_session")) {
      setCookie("finch_demo_session", crypto.randomUUID());
    }

    // Restore photo, selections, and last generated image
    try {
      const photoJson = sessionStorage.getItem(SS_PHOTO);
      const selectionsJson = sessionStorage.getItem(SS_SELECTIONS);
      const savedGenUrl = sessionStorage.getItem(SS_GENERATED);

      if (photoJson) {
        const photo = JSON.parse(photoJson) as UploadedPhoto;
        setUploadedPhoto(photo);

        if (selectionsJson) {
          const parsedSelections = JSON.parse(selectionsJson) as Record<string, string>;
          const sels = filterDemoSelectionsByVisibility(parsedSelections, photo.sceneAnalysis);
          setSelections(sels);
          sessionStorage.setItem(SS_SELECTIONS, JSON.stringify(sels));
        }

        const historyJson = sessionStorage.getItem(SS_HISTORY);
        if (historyJson) {
          try { setGenerationHistory(JSON.parse(historyJson)); } catch { /* ignore */ }
        }

        if (savedGenUrl) {
          setGeneratedImageUrl(savedGenUrl);
          setPhase("result");
        } else {
          setPhase("picking");
        }
      }
    } catch {
      // Corrupted sessionStorage — start fresh
    }
  }, []);

  // Auto-load sample photo when autoSample is true and no existing session
  useEffect(() => {
    if (!autoSample || uploadedPhoto) return;
    // Check if session restore already loaded a photo
    if (sessionStorage.getItem(SS_PHOTO)) return;
    loadSamplePhoto().then((photo) => {
      handlePhotoAccepted(photo);
    }).catch(() => {
      // Silently fail — they can still upload manually
    });
  }, [autoSample]);

  useEffect(() => {
    if (!uploadedPhoto) setMobilePreviewOpen(false);
  }, [uploadedPhoto]);

  const handlePhotoAccepted = useCallback((photo: UploadedPhoto) => {
    setUploadedPhoto(photo);
    setSelections((prev) => {
      const next = filterDemoSelectionsByVisibility(prev, photo.sceneAnalysis);
      sessionStorage.setItem(SS_SELECTIONS, JSON.stringify(next));
      return next;
    });
    setCookie("finch_demo_photo", photo.hash);
    sessionStorage.setItem(SS_PHOTO, JSON.stringify(photo));
    sessionStorage.removeItem(SS_GENERATED);
    setPhase("picking");
    setGeneratedImageUrl(null);
    setError(null);
    track("demo_photo_uploaded", {
      kitchenType: photo.sceneAnalysis?.kitchenType,
      hasIsland: photo.sceneAnalysis?.hasIsland,
    });
  }, [track]);

  const handleSelectionChange = useCallback((subCategoryId: string, optionId: string) => {
    setSelections((prev) => {
      const next = { ...prev, [subCategoryId]: optionId };
      sessionStorage.setItem(SS_SELECTIONS, JSON.stringify(next));
      return next;
    });
    const current = selectionsRef.current;
    const isNew = !(subCategoryId in current);
    track("demo_selection_changed", { subCategoryId, selectedCount: Object.keys(current).length + (isNew ? 1 : 0) });
    // If we were viewing a result, go back to picking
    if (generatedImageUrl) {
      sessionStorage.removeItem(SS_GENERATED);
      setPhase("picking");
    }
  }, [generatedImageUrl, track]);

  const handleGenerate = useCallback(async () => {
    if (!uploadedPhoto || isGenerating) return;
    if (generationsUsed >= 5) return;

    setError(null);
    setIsGenerating(true);
    setPhase("generating");

    try {
      // Check cache first
      const checkRes = await fetch("/api/try/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoHash: uploadedPhoto.hash,
          selections,
          sceneAnalysis: uploadedPhoto.sceneAnalysis,
        }),
      });

      const checkData = await checkRes.json();
      if (checkData.imageUrl) {
        setGeneratedImageUrl(checkData.imageUrl);
        sessionStorage.setItem(SS_GENERATED, checkData.imageUrl);
        setPhase("result");
        setIsGenerating(false);
        return;
      }

      // Generate (dispatches to Inngest, returns 202)
      const genRes = await fetch("/api/try/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoBase64: uploadedPhoto.dataUrl.split(",")[1],
          photoHash: uploadedPhoto.hash,
          selections,
          sceneAnalysis: uploadedPhoto.sceneAnalysis,
        }),
      });

      const genData = await genRes.json();

      // Cache hit — route returned 200 with imageUrl
      if (genRes.ok && genRes.status === 200 && genData.imageUrl) {
        setGeneratedImageUrl(genData.imageUrl);
        sessionStorage.setItem(SS_GENERATED, genData.imageUrl);
        setPhase("result");
        track("demo_generation_completed", { cacheHit: true, generationsUsed });
        return;
      }

      // 202 or 429 — poll /check until result is ready
      if ((genRes.status === 202 || genRes.status === 429) && (genData.combinedHash || genData.imageUrl === undefined)) {
        const pollInterval = 3000;
        const maxPolls = 50; // ~2.5 min
        let imageUrl: string | null = null;

        for (let i = 0; i < maxPolls; i++) {
          await new Promise((r) => setTimeout(r, pollInterval));

          const pollRes = await fetch("/api/try/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              photoHash: uploadedPhoto.hash,
              selections,
              sceneAnalysis: uploadedPhoto.sceneAnalysis,
            }),
          });

          const pollData = await pollRes.json();
          if (pollData.imageUrl) {
            imageUrl = pollData.imageUrl;
            break;
          }
        }

        if (!imageUrl) {
          throw new Error("Generation timed out — please try again");
        }

        setGeneratedImageUrl(imageUrl);
        sessionStorage.setItem(SS_GENERATED, imageUrl);
        setPhase("result");

        // Increment counter and save to history
        const newCount = generationsUsed + 1;
        setGenerationsUsed(newCount);
        setCookie("finch_demo_gens", String(newCount));

        const entry: GenerationEntry = { selections: { ...selections }, imageUrl };
        setGenerationHistory((prev) => {
          const next = [...prev, entry];
          sessionStorage.setItem(SS_HISTORY, JSON.stringify(next));
          return next;
        });

        if (newCount >= 5) {
          track("demo_cap_reached", { generationsUsed: newCount });
        }

        track("demo_generation_completed", { cacheHit: false, generationsUsed: newCount });
        return;
      }

      // Error response
      if (!genRes.ok) {
        throw new Error(genData.error || "Generation failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setPhase("picking");
      track("demo_generation_failed", { error: message });
    } finally {
      setIsGenerating(false);
    }
  }, [uploadedPhoto, selections, isGenerating, generationsUsed, track]);

  const handleRecallGeneration = useCallback((index: number) => {
    const entry = generationHistory[index];
    if (!entry) return;
    setSelections(entry.selections);
    sessionStorage.setItem(SS_SELECTIONS, JSON.stringify(entry.selections));
    setGeneratedImageUrl(entry.imageUrl);
    sessionStorage.setItem(SS_GENERATED, entry.imageUrl);
    setPhase("result");
    setError(null);
  }, [generationHistory]);

  const handleReset = useCallback(() => {
    setUploadedPhoto(null);
    setSelections({});
    setGeneratedImageUrl(null);
    setGenerationHistory([]);
    setPhase("picking");
    setError(null);
    sessionStorage.removeItem(SS_PHOTO);
    sessionStorage.removeItem(SS_SELECTIONS);
    sessionStorage.removeItem(SS_GENERATED);
    sessionStorage.removeItem(SS_HISTORY);
  }, []);

  const selectedCount = Object.keys(selections).length;
  const atCap = generationsUsed >= 5;
  const mobilePreviewImageUrl = generatedImageUrl ?? uploadedPhoto?.dataUrl ?? null;
  const mobilePreviewLabel = generatedImageUrl ? "Current visualization" : "Uploaded photo";
  const handleScrollToPreview = useCallback(() => {
    previewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className={`${bare ? "" : "min-h-screen "}bg-slate-50 flex flex-col`} style={{ "--color-accent": "#0f172a", "--color-navy": "#0f172a" } as React.CSSProperties}>
      {!bare && (
        <SiteNav
          links={[]}
          cta={{ label: "Book a Walkthrough", href: "mailto:hello@withfin.ch?subject=Finch Demo Interest" }}
        />
      )}

      <main className={`flex-1 px-3 md:px-5 lg:px-6 pb-28 sm:pb-32 ${bare ? "py-0 lg:pb-0" : "py-4 md:py-6 lg:pb-6"}`}>
        <div className={`mx-auto w-full ${bare ? "max-w-7xl" : "max-w-[1660px]"}`}>
          <div className={`grid grid-cols-1 ${bare ? "lg:grid-cols-[minmax(0,1.45fr)_1px_minmax(360px,1fr)]" : "lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)] gap-4 md:gap-6"}`}>
            {/* Left: sticky viewer + controls */}
            <section className={`lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-72px-1.5rem)] lg:self-start demo-enter demo-enter-delay-1 ${bare ? "lg:pr-5 pt-4 md:pt-6" : ""} ${headerContent ? "lg:overflow-y-auto" : "lg:overflow-hidden"}`}>
              {headerContent}
              <div className={`flex flex-col gap-4 ${bare ? "" : "h-full p-3 md:p-4 bg-white border border-slate-200"}`}>
                <div ref={previewSectionRef} className="flex-1 min-h-0">
                  {uploadedPhoto ? (
                    <DemoViewer
                      uploadedPhotoUrl={uploadedPhoto?.dataUrl ?? null}
                      generatedImageUrl={generatedImageUrl}
                      isGenerating={isGenerating}
                      phase={phase}
                    />
                  ) : (
                    <div className="h-full min-h-[400px] sm:min-h-[480px] md:min-h-[560px] border border-slate-200 bg-slate-50 p-4 md:p-6">
                      <div className="h-full min-h-[340px] sm:min-h-[400px] md:min-h-[500px] w-full flex items-center justify-center">
                        <div className="w-full max-w-2xl">
                          <div className="text-center mb-6">
                            <h1 className="text-2xl md:text-3xl leading-tight tracking-[-0.02em] text-slate-900 mb-2">
                              Start with your model home kitchen
                            </h1>
                            <p className="text-sm md:text-base text-slate-500">
                              Upload a photo. Pick finishes. See the room change in seconds.
                            </p>
                          </div>
                          <DemoUploader onPhotoAccepted={handlePhotoAccepted} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {uploadedPhoto && (
                  <div className="hidden lg:block pt-4 space-y-3">
                    {error && (
                      <div className="px-4 py-3 bg-red-50 border border-red-200 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <button
                        onClick={handleReset}
                        className="order-2 md:order-1 inline-flex w-full sm:w-auto items-center justify-center h-[52px] px-5 border border-slate-300 bg-white text-slate-700 text-sm font-semibold uppercase tracking-wider hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        Upload a different photo
                      </button>

                      <div className="order-1 md:order-2 flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                        <GenerationCounter used={generationsUsed} max={5} onRecall={handleRecallGeneration} />
                        <button
                          onClick={handleGenerate}
                          disabled={selectedCount < 1 || isGenerating || atCap}
                          className="w-full sm:w-auto sm:min-w-[260px] py-3.5 px-6 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isGenerating
                            ? "Generating..."
                            : atCap
                              ? "Generation limit reached"
                              : "Visualize My Kitchen"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Vertical divider (bare mode only) */}
            {bare && <div className="hidden lg:block bg-slate-200" />}

            {/* Right: scrollable picker */}
            <section className={`demo-enter demo-enter-delay-2 ${bare ? "lg:pl-5 pt-4 md:pt-6 lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-72px)] lg:overflow-y-auto" : "lg:pr-1"}`}>
              <DemoPickerPanel
                selections={selections}
                sceneAnalysis={uploadedPhoto?.sceneAnalysis}
                onSelect={handleSelectionChange}
              />

              {/* CTA Banner */}
              {!bare && (phase === "result" || atCap) && (
                <div className="mt-4 md:mt-5 px-5 md:px-6 py-6 border border-slate-200 bg-white text-center">
                  {atCap ? (
                    <>
                      <p className="text-2xl md:text-3xl leading-tight tracking-[-0.02em] text-slate-900 mb-3">
                        You&apos;ve seen what Finch can do.
                      </p>
                      <p className="text-base text-slate-500 mb-6 max-w-lg mx-auto">
                        Your version uses your floor plans, your options, your pricing. First plan is free. Live in 48 hours.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-semibold text-slate-900 mb-2">
                        Your buyers would see this instantly, with your floor plans and pricing.
                      </p>
                      <p className="text-sm text-slate-500 mb-4">
                        First plan is free. Live in 48 hours.
                      </p>
                    </>
                  )}
                  <a
                    href="mailto:hello@withfin.ch?subject=Pilot%20Interest%20%E2%80%94%20Saw%20the%20Demo"
                    onClick={() => track("demo_cta_clicked", { trigger: atCap ? "cap_interstitial" : "result_banner" })}
                    className="inline-block px-8 py-3 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
                  >
                    Start a Pilot
                  </a>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {uploadedPhoto && mobilePreviewOpen && (
        <button
          type="button"
          aria-label="Close mobile preview"
          onClick={() => setMobilePreviewOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/20"
        />
      )}

      <div className="lg:hidden fixed bottom-0 inset-x-0 z-[60] bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-6px_24px_rgba(15,23,42,0.08)]">
        {uploadedPhoto && (
          <div
            className={`overflow-hidden border-b border-slate-200/90 transition-[max-height,opacity] duration-300 ${
              mobilePreviewOpen ? "max-h-[48vh] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="px-3 pt-3 pb-2">
              {mobilePreviewImageUrl ? (
                <img
                  src={mobilePreviewImageUrl}
                  alt={mobilePreviewLabel}
                  className="w-full aspect-[16/10] object-cover border border-slate-200"
                />
              ) : null}
              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors underline"
                >
                  Upload new photo
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="px-3 pt-2 flex justify-center">
          {uploadedPhoto ? (
            <GenerationCounter used={generationsUsed} max={5} onRecall={handleRecallGeneration} />
          ) : (
            <p className="text-xs text-slate-500">Upload a model home photo to start</p>
          )}
        </div>
        <div className="px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] grid grid-cols-2 gap-2">
          {uploadedPhoto ? (
            <>
              <button
                type="button"
                onClick={() => setMobilePreviewOpen((prev) => !prev)}
                className="h-11 inline-flex items-center justify-center gap-2 border border-slate-300 bg-white text-slate-700 text-xs font-semibold uppercase tracking-wider hover:bg-slate-50 transition-colors"
                aria-expanded={mobilePreviewOpen}
                aria-label={mobilePreviewOpen ? "Hide preview" : "Show preview"}
              >
                <div className="w-6 h-6 overflow-hidden bg-slate-200 shrink-0">
                  {mobilePreviewImageUrl ? (
                    <img src={mobilePreviewImageUrl} alt={mobilePreviewLabel} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                Preview
                <svg
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform ${mobilePreviewOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={handleGenerate}
                disabled={selectedCount < 1 || isGenerating || atCap}
                className="h-11 bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating
                  ? "Generating..."
                  : atCap
                    ? "Limit Reached"
                    : "Visualize"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleScrollToPreview}
                className="h-11 border border-slate-300 bg-white text-slate-700 text-xs font-semibold uppercase tracking-wider hover:bg-slate-50 transition-colors"
              >
                Uploader
              </button>
              <button
                onClick={handleScrollToPreview}
                className="h-11 bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
              >
                Upload Photo
              </button>
            </>
          )}
        </div>
        {uploadedPhoto && error && (
          <div className="px-3 pb-2">
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
