"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { loadSamplePhoto } from "./DemoUploader";
import { SiteNav } from "@/components/SiteNav";
import { DemoPickerPanel } from "./DemoPickerPanel";
import { DemoViewer } from "./DemoViewer";
import { GenerationCounter } from "./GenerationCounter";
import { MobileStickyFooter } from "@/components/MobileStickyFooter";
import { SiteFooter } from "@/components/SiteFooter";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";
import { filterDemoSelectionsByVisibility } from "@/lib/demo-scene";
import { useTrack } from "@/hooks/useTrack";

const CALENDLY_URL = "https://calendly.com/finch-rashaad/finch-demo";

/** Preload an image so the browser has it cached before we swap src */
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // Don't block on error
    img.src = url;
  });
}

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
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

// sessionStorage keys
const SS_PHOTO = "finch_demo_photo";
const SS_SELECTIONS = "finch_demo_selections";
const SS_GENERATED = "finch_demo_generated_url";
const SS_HISTORY = "finch_demo_history";

export function DemoClient({ bare = false, headerContent }: { bare?: boolean; headerContent?: React.ReactNode }) {
  const track = useTrack();
  const [phase, setPhase] = useState<DemoPhase>("picking");
  const [uploadedPhoto, setUploadedPhoto] = useState<UploadedPhoto | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationsUsed, setGenerationsUsed] = useState(0);
  const [generationHistory, setGenerationHistory] = useState<GenerationEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastCacheHit, setLastCacheHit] = useState<boolean | undefined>(undefined);
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

  // Auto-load sample kitchen on mount (no existing session)
  useEffect(() => {
    if (uploadedPhoto) return;
    if (sessionStorage.getItem(SS_PHOTO)) return;
    loadSamplePhoto().then((photo) => {
      handlePhotoAccepted(photo);
    }).catch(() => {
      // Silently fail
    });
  }, []);

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
    const isDeselect = selectionsRef.current[subCategoryId] === optionId;
    setSelections((prev) => {
      if (isDeselect) {
        const { [subCategoryId]: _, ...rest } = prev;
        sessionStorage.setItem(SS_SELECTIONS, JSON.stringify(rest));
        return rest;
      }
      const next = { ...prev, [subCategoryId]: optionId };
      sessionStorage.setItem(SS_SELECTIONS, JSON.stringify(next));
      return next;
    });
    if (isDeselect) {
      track("demo_selection_deselected", { subCategoryId });
    } else {
      const current = selectionsRef.current;
      const isNew = !(subCategoryId in current);
      track("demo_selection_changed", { subCategoryId, selectedCount: Object.keys(current).length + (isNew ? 1 : 0) });
    }
    // If we were viewing a result, go back to picking
    if (generatedImageUrl) {
      sessionStorage.removeItem(SS_GENERATED);
      setLastCacheHit(undefined);
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
      if (checkData.status === "complete" && checkData.imageUrl) {
        await preloadImage(checkData.imageUrl);
        setGeneratedImageUrl(checkData.imageUrl);
        sessionStorage.setItem(SS_GENERATED, checkData.imageUrl);
        setLastCacheHit(true);
        setPhase("result");
        setIsGenerating(false);
        track("demo_generation_completed", { cacheHit: true, generationsUsed });
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
        await preloadImage(genData.imageUrl);
        setGeneratedImageUrl(genData.imageUrl);
        sessionStorage.setItem(SS_GENERATED, genData.imageUrl);
        setLastCacheHit(true);
        setPhase("result");
        track("demo_generation_completed", { cacheHit: true, generationsUsed });
        return;
      }

      // 202 or 429 — poll /check until result is ready
      if ((genRes.status === 202 || genRes.status === 429) && (genData.combinedHash || genData.imageUrl === undefined)) {
        const maxPolls = 50; // ~2.5 min worst case
        let imageUrl: string | null = null;

        for (let i = 0; i < maxPolls; i++) {
          // Adaptive polling: 1.5s for the first 10 polls, then 3s after
          await new Promise((r) => setTimeout(r, i < 10 ? 1500 : 3000));

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
          if (pollData.status === "complete" && pollData.imageUrl) {
            imageUrl = pollData.imageUrl;
            break;
          }
          if (pollData.status === "not_found") {
            // Generation failed permanently — stop polling early
            throw new Error("Generation failed — please try again");
          }
          // "pending" or "error" — keep polling
        }

        if (!imageUrl) {
          throw new Error("Generation timed out — please try again");
        }

        await preloadImage(imageUrl);
        setGeneratedImageUrl(imageUrl);
        sessionStorage.setItem(SS_GENERATED, imageUrl);
        setLastCacheHit(false);
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
    setLastCacheHit(undefined);
    setPhase("result");
    setError(null);
  }, [generationHistory]);

  const selectedCount = Object.keys(selections).length;
  const atCap = generationsUsed >= 5;
  const mobilePreviewImageUrl = generatedImageUrl ?? uploadedPhoto?.dataUrl ?? null;

  return (
    <div className={`${bare ? "" : "min-h-screen "}bg-slate-50 flex flex-col`} style={{ "--color-accent": "#0f172a", "--color-navy": "#0f172a" } as React.CSSProperties}>
      {!bare && (
        <SiteNav
          links={[
            { label: "How It Works", href: "/#how" },
            { label: "Research", href: "/research" },
          ]}
          cta={{ label: "Book a Walkthrough", href: CALENDLY_URL }}
        />
      )}

      <main className={`flex-1 px-3 md:px-5 lg:px-6 pb-28 sm:pb-32 ${bare ? "py-0 lg:pb-0" : "py-4 md:py-6 lg:pb-6"}`}>
        <div className={`mx-auto w-full ${bare ? "max-w-7xl" : "max-w-[1660px]"}`}>
          <div className={`grid grid-cols-1 ${bare ? "lg:grid-cols-[minmax(0,1.45fr)_1px_minmax(360px,1fr)]" : "lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)] gap-4 md:gap-6"}`}>
            {/* Left: sticky viewer + controls */}
            <section className={`lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-72px-1.5rem)] lg:self-start demo-enter demo-enter-delay-1 ${bare ? "lg:pr-5 pt-4 md:pt-6" : ""} ${headerContent ? "lg:overflow-y-auto" : "lg:overflow-hidden"}`}>
              {headerContent}
              <div className={`flex flex-col gap-4 ${bare ? "" : "h-full p-3 md:p-4 bg-white border border-slate-200"}`}>
                <div className="flex-1 min-h-0">
                  {uploadedPhoto ? (
                    <DemoViewer
                      uploadedPhotoUrl={uploadedPhoto?.dataUrl ?? null}
                      generatedImageUrl={generatedImageUrl}
                      isGenerating={isGenerating}
                      phase={phase}
                      cacheHit={lastCacheHit}
                    />
                  ) : (
                    <div className="h-full min-h-[400px] sm:min-h-[480px] md:min-h-[560px] border border-slate-200 bg-slate-50 flex items-center justify-center">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Loading kitchen...
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

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                        <GenerationCounter used={generationsUsed} max={5} onRecall={handleRecallGeneration} />
                        {atCap ? (
                          <a
                            href={CALENDLY_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => track("demo_cta_clicked", { trigger: "cap_generate_button" })}
                            className="w-full sm:w-auto sm:min-w-[260px] py-3.5 px-6 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors text-center"
                          >
                            Book a Walkthrough
                          </a>
                        ) : (
                          <button
                            onClick={handleGenerate}
                            disabled={selectedCount < 1 || isGenerating}
                            className="w-full sm:w-auto sm:min-w-[260px] py-3.5 px-6 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isGenerating ? "Generating..." : "Visualize My Kitchen"}
                          </button>
                        )}
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
              {/* Cap banner — above picker at highest-intent moment */}
              {!bare && atCap && (
                <div className="mb-4 md:mb-5 px-5 md:px-6 py-6 border border-slate-200 bg-white text-center">
                  <p className="text-2xl md:text-3xl leading-tight tracking-[-0.02em] text-slate-900 mb-3">
                    Your version uses your floor plans, your options, your pricing.
                  </p>
                  <p className="text-base text-slate-500 mb-6 max-w-lg mx-auto">
                    We build your first community at no cost. Pick a time and we&apos;ll walk through yours.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={CALENDLY_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track("demo_cta_clicked", { trigger: "cap_interstitial" })}
                      className="inline-block px-8 py-3 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
                    >
                      Book a Walkthrough
                    </a>
                    <a
                      href="/#get-started"
                      onClick={() => track("demo_cta_clicked", { trigger: "cap_form_link" })}
                      className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      or send us your details
                    </a>
                  </div>
                  <a
                    href="/research"
                    onClick={() => track("demo_cta_clicked", { trigger: "cap_research_link" })}
                    className="inline-block mt-4 text-xs uppercase tracking-[0.16em] text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    Read the research
                  </a>
                </div>
              )}

              <DemoPickerPanel
                selections={selections}
                sceneAnalysis={uploadedPhoto?.sceneAnalysis}
                onSelect={handleSelectionChange}
              />

              {/* Post-result banner — below picker, only before cap */}
              {!bare && phase === "result" && !atCap && (
                <div className="mt-4 md:mt-5 px-5 md:px-6 py-6 border border-slate-200 bg-white text-center">
                  <p className="text-lg font-semibold text-slate-900 mb-2">
                    Your buyers would see this with your floor plans and your pricing.
                  </p>
                  <p className="text-sm text-slate-500 mb-4">
                    We set up your first community at no cost. Live in under a week.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={CALENDLY_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track("demo_cta_clicked", { trigger: "result_banner" })}
                      className="inline-block px-8 py-3 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
                    >
                      Book a Walkthrough
                    </a>
                    <a
                      href="/#get-started"
                      onClick={() => track("demo_cta_clicked", { trigger: "result_form_link" })}
                      className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      or send us your details
                    </a>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {!bare && <SiteFooter />}

      {uploadedPhoto && (
        <MobileStickyFooter
          previewImageUrl={mobilePreviewImageUrl}
          previewLabel={generatedImageUrl ? "Current visualization" : "Sample kitchen"}
          statusContent={
            <GenerationCounter used={generationsUsed} max={5} onRecall={handleRecallGeneration} />
          }
          primaryAction={atCap ? {
            label: "Book a Walkthrough",
            href: CALENDLY_URL,
            onClick: () => track("demo_cta_clicked", { trigger: "cap_mobile_button" }),
          } : {
            label: isGenerating ? "Generating..." : "Visualize",
            onClick: handleGenerate,
            disabled: selectedCount < 1 || isGenerating,
          }}
          error={error}
        />
      )}
    </div>
  );
}
