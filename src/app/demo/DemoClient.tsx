"use client";

import { useState, useCallback, useEffect } from "react";
import { DemoUploader } from "./DemoUploader";
import { SiteNav } from "@/components/SiteNav";
import { DemoPickerPanel } from "./DemoPickerPanel";
import { DemoViewer } from "./DemoViewer";
import { GenerationCounter } from "./GenerationCounter";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";
import { filterDemoSelectionsByVisibility } from "@/lib/demo-scene";

type DemoPhase = "upload" | "picking" | "generating" | "result";

interface UploadedPhoto {
  dataUrl: string;
  hash: string;
  sceneAnalysis?: DemoSceneAnalysis;
}

// Cookie helpers
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days = 30) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/demo; SameSite=Lax`;
}

// sessionStorage keys
const SS_PHOTO = "finch_demo_photo";
const SS_SELECTIONS = "finch_demo_selections";
const SS_GENERATED = "finch_demo_generated_url";

export function DemoClient() {
  const [phase, setPhase] = useState<DemoPhase>("upload");
  const [uploadedPhoto, setUploadedPhoto] = useState<UploadedPhoto | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationsUsed, setGenerationsUsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

  const handleSelectionChange = useCallback((subCategoryId: string, optionId: string) => {
    setSelections((prev) => {
      const next = { ...prev, [subCategoryId]: optionId };
      sessionStorage.setItem(SS_SELECTIONS, JSON.stringify(next));
      return next;
    });
    // If we were viewing a result, go back to picking
    if (generatedImageUrl) {
      sessionStorage.removeItem(SS_GENERATED);
      setPhase("picking");
    }
  }, [generatedImageUrl]);

  const handleGenerate = useCallback(async () => {
    if (!uploadedPhoto || isGenerating) return;
    if (generationsUsed >= 5) return;

    setError(null);
    setIsGenerating(true);
    setPhase("generating");

    try {
      // Check cache first
      const checkRes = await fetch("/api/demo/check", {
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

      // Generate
      const genRes = await fetch("/api/demo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoBase64: uploadedPhoto.dataUrl.split(",")[1],
          photoHash: uploadedPhoto.hash,
          selections,
          sceneAnalysis: uploadedPhoto.sceneAnalysis,
        }),
      });

      if (!genRes.ok) {
        const errData = await genRes.json().catch(() => ({}));
        throw new Error(errData.error || "Generation failed");
      }

      const genData = await genRes.json();
      setGeneratedImageUrl(genData.imageUrl);
      sessionStorage.setItem(SS_GENERATED, genData.imageUrl);
      setPhase("result");

      // Increment counter (only if not a cache hit)
      if (!genData.cacheHit) {
        const newCount = generationsUsed + 1;
        setGenerationsUsed(newCount);
        setCookie("finch_demo_gens", String(newCount));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("picking");
    } finally {
      setIsGenerating(false);
    }
  }, [uploadedPhoto, selections, isGenerating, generationsUsed]);

  const handleReset = useCallback(() => {
    setUploadedPhoto(null);
    setSelections({});
    setGeneratedImageUrl(null);
    setPhase("upload");
    setError(null);
    sessionStorage.removeItem(SS_PHOTO);
    sessionStorage.removeItem(SS_SELECTIONS);
    sessionStorage.removeItem(SS_GENERATED);
  }, []);

  const selectedCount = Object.keys(selections).length;
  const atCap = generationsUsed >= 5;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SiteNav cta={{ label: "Book a Walkthrough", href: "mailto:hello@finchweb.io?subject=Demo Walkthrough" }} />

      {phase === "upload" ? (
        <main className="flex-1 px-4 md:px-6 py-6 md:py-8 max-w-2xl mx-auto w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl leading-tight tracking-[-0.02em] text-slate-900 mb-3">
              See your kitchen transformed
            </h1>
            <p className="text-lg text-slate-500">
              Upload a kitchen photo, pick your finishes, and watch AI bring it to life.
            </p>
          </div>
          <DemoUploader onPhotoAccepted={handlePhotoAccepted} />
        </main>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left: fixed viewer + controls */}
          <div className="lg:w-[58%] xl:w-[62%] lg:h-[calc(100vh-56px)] lg:sticky lg:top-14 flex flex-col bg-slate-100 border-r border-slate-200">
            <div className="flex-1 min-h-0 p-4 md:p-6 flex flex-col">
              <div className="flex-1 min-h-0">
                <DemoViewer
                  uploadedPhotoUrl={uploadedPhoto?.dataUrl ?? null}
                  generatedImageUrl={generatedImageUrl}
                  isGenerating={isGenerating}
                  phase={phase}
                />
              </div>

              {/* Controls below viewer */}
              <div className="mt-4 space-y-3">
                {error && (
                  <div className="px-4 py-3 bg-red-50 border border-red-200 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={selectedCount < 1 || isGenerating || atCap}
                  className="w-full py-3.5 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isGenerating
                    ? "Generating..."
                    : atCap
                      ? "Generation limit reached"
                      : "Visualize My Kitchen"}
                </button>

                <div className="flex items-center justify-between">
                  <GenerationCounter used={generationsUsed} max={5} />
                  <button
                    onClick={handleReset}
                    className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Upload a different photo
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: scrollable picker */}
          <div className="lg:flex-1 lg:h-[calc(100vh-56px)] lg:overflow-y-auto p-4 md:p-6">
            <DemoPickerPanel
              selections={selections}
              sceneAnalysis={uploadedPhoto?.sceneAnalysis}
              onSelect={handleSelectionChange}
            />

            {/* CTA Banner */}
            {(phase === "result" || atCap) && (
              <div className="mt-6 px-6 py-6 bg-white border border-slate-200 text-center">
                {atCap ? (
                  <>
                    <p className="text-lg font-semibold text-slate-900 mb-2">
                      Want more? Let&apos;s build it for your floor plans.
                    </p>
                    <p className="text-sm text-slate-500 mb-4">
                      We&apos;ll configure Finch with your actual options, pricing, and room photos.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-slate-900 mb-2">
                      Imagine this for every buyer, every floor plan.
                    </p>
                    <p className="text-sm text-slate-500 mb-4">
                      15 minutes. We&apos;ll show you how it works with your plans.
                    </p>
                  </>
                )}
                <a
                  href="mailto:hello@finchweb.io?subject=Finch Demo Interest"
                  className="inline-block px-8 py-3 bg-slate-900 text-white text-sm font-semibold uppercase tracking-wider hover:bg-slate-800 transition-colors"
                >
                  Book a Walkthrough
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
