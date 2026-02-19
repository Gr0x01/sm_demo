"use client";

import { useCallback, useState, useEffect, useRef } from "react";

interface DemoViewerProps {
  uploadedPhotoUrl: string | null;
  generatedImageUrl: string | null;
  isGenerating: boolean;
  phase: "upload" | "picking" | "generating" | "result";
}

/** Staged messages shown during generation — one at a time, clean fades */
const WAIT_STAGES: { label: string; headline: string; body: string }[] = [
  {
    label: "Generating",
    headline: "Analyzing your photo and applying selections.",
    body: "",
  },
  {
    label: "First Look",
    headline: "This wait happens once.",
    body: "In production, your top finish combinations are pre-generated. Buyers see results in under a second.",
  },
  {
    label: "The Numbers",
    headline: "Buyers upgrade what they can see.",
    body: "Visualization drives 15-40% higher upgrade spend. On 200 closings a year, that is six figures in revenue your price sheet never captured.",
  },
  {
    label: "How It Works",
    headline: "Your floor plans. Your pricing. Your brand.",
    body: "Send us your plans and upgrade catalog. We build a branded buyer experience and deliver priced selection exports. No platform to learn.",
  },
  {
    label: "First Test",
    headline: "40% upgrade lift from a buyer trying to spend less.",
    body: "Our first real-world test: a buyer actively minimizing spend still chose $2,090 more in upgrades after seeing their selections visualized.",
  },
];

/** Timing: first stage is short (confirmation), then ~12s each */
const STAGE_DURATIONS = [5000, 12000, 12000, 12000, 30000];

export function DemoViewer({
  uploadedPhotoUrl,
  generatedImageUrl,
  isGenerating,
  phase,
}: DemoViewerProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [stageFading, setStageFading] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stage cycling during generation
  useEffect(() => {
    if (!isGenerating) {
      setStageIndex(0);
      setStageFading(false);
      return;
    }

    // Animate overlay in
    requestAnimationFrame(() => setOverlayVisible(true));

    function advanceStage(current: number) {
      if (current >= WAIT_STAGES.length - 1) return;

      timerRef.current = setTimeout(() => {
        setStageFading(true);
        setTimeout(() => {
          const next = current + 1;
          setStageIndex(next);
          setStageFading(false);
          advanceStage(next);
        }, 400); // fade-out duration
      }, STAGE_DURATIONS[current]);
    }

    advanceStage(0);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isGenerating]);

  // Fade overlay out when generation completes
  useEffect(() => {
    if (!isGenerating && overlayVisible) {
      // Small delay to let the image load beneath
      const t = setTimeout(() => setOverlayVisible(false), 100);
      return () => clearTimeout(t);
    }
  }, [isGenerating, overlayVisible]);

  const displayUrl = generatedImageUrl || uploadedPhotoUrl;
  const stage = WAIT_STAGES[stageIndex];

  const handleDownload = useCallback(async () => {
    if (!generatedImageUrl) return;
    try {
      const res = await fetch(generatedImageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "finch-kitchen-visualization.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(generatedImageUrl, "_blank");
    }
  }, [generatedImageUrl]);

  return (
    <div className="relative bg-slate-100 border border-slate-200 overflow-hidden aspect-[3/2]">
      {displayUrl ? (
        <img
          src={displayUrl}
          alt={phase === "result" ? "AI-generated kitchen visualization" : "Uploaded kitchen photo"}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-sm text-slate-400">No photo uploaded</p>
        </div>
      )}

      {/* Generating overlay — staged messaging */}
      {(isGenerating || overlayVisible) && (
        <div
          className="absolute inset-0 bg-white/75 backdrop-blur-sm flex flex-col items-center justify-center px-8 transition-opacity duration-400"
          style={{ opacity: isGenerating ? 1 : 0 }}
        >
          {/* Label */}
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mb-5">
            Generating your visualization
          </p>

          {/* Progress bar — smooth shimmer, not a spinner */}
          <div className="w-48 h-0.5 bg-slate-200 overflow-hidden mb-6">
            <div className="h-full w-1/3 bg-slate-500 animate-[progress-slide_2s_ease-in-out_infinite]" />
          </div>

          {/* Staged message */}
          <div
            className="text-center max-w-md transition-opacity duration-400"
            style={{ opacity: stageFading ? 0 : 1 }}
          >
            {stage.label !== "Generating" && (
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
                {stage.label}
              </p>
            )}
            <p className="text-sm font-medium text-slate-800 leading-snug">
              {stage.headline}
            </p>
            {stage.body && (
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {stage.body}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Labels */}
      {phase === "result" && generatedImageUrl && !isGenerating && (
        <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 border border-slate-200 text-[11px] uppercase tracking-[0.16em] text-slate-700">
          AI Visualization
        </div>
      )}
      {phase === "picking" && !generatedImageUrl && (
        <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 border border-slate-200 text-[11px] uppercase tracking-[0.16em] text-slate-700">
          Your photo
        </div>
      )}

      {/* Download button */}
      {phase === "result" && generatedImageUrl && !isGenerating && (
        <button
          onClick={handleDownload}
          className="absolute bottom-3 right-3 px-3 py-1.5 bg-white/90 border border-slate-200 text-xs font-medium text-slate-700 hover:bg-white transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download
        </button>
      )}
    </div>
  );
}
