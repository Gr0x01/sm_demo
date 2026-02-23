"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { StepConfig, StepPhoto } from "@/lib/step-config";
import { StepHero } from "./StepHero";
import { StepPhotoGrid } from "./StepPhotoGrid";

function ClearButton({ onClear }: { onClear: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    if (confirming) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setConfirming(false);
      onClear();
    } else {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 3000);
    }
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <button
      onClick={handleClick}
      className={`py-3 px-4 border font-semibold text-sm transition-colors duration-150 cursor-pointer active:scale-[0.98] ${
        confirming
          ? "border-red-400 text-red-600 hover:border-red-500 hover:text-red-700"
          : "border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700"
      }`}
    >
      {confirming ? "Are you sure?" : "Clear"}
    </button>
  );
}

interface SidebarPanelProps {
  step: StepConfig;
  total: number;
  onContinue: () => void;
  onClearSelections: () => void;
  isLastStep: boolean;
  headerHeight: number;
  onFinish: () => void;
  photos?: StepPhoto[];
  generatedImageUrls?: Record<string, string>;
  generatingPhotoKeys?: Set<string>;
  onGeneratePhoto?: (photoKey: string, stepPhotoId: string, step: StepConfig) => void;
  onRetry?: (photoKey: string, stepPhotoId: string, step: StepConfig) => void;
  errors?: Record<string, string>;
  generatedWithSelections?: Record<string, string>;
  getPhotoVisualSelections?: (step: StepConfig, photo: StepPhoto | null, selections: Record<string, string>) => Record<string, string>;
  selections?: Record<string, string>;
}

export function SidebarPanel({
  step,
  total,
  onContinue,
  onClearSelections,
  isLastStep,
  headerHeight,
  onFinish,
  photos,
  generatedImageUrls,
  generatingPhotoKeys,
  onGeneratePhoto,
  onRetry,
  errors,
  generatedWithSelections,
  getPhotoVisualSelections,
  selections,
}: SidebarPanelProps) {
  const [activeSectionTitle, setActiveSectionTitle] = useState<string>(
    step.sections[0]?.title ?? ""
  );
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [pricePulse, setPricePulse] = useState(false);
  const prevTotal = useRef(total);

  // Price pulse animation
  useEffect(() => {
    if (total !== prevTotal.current) {
      prevTotal.current = total;
      setPricePulse(true);
      const timer = setTimeout(() => setPricePulse(false), 400);
      return () => clearTimeout(timer);
    }
  }, [total]);

  // Track active section via IntersectionObserver
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const sectionElements = step.sections
      .map((s) => {
        const id = `section-${s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        return document.getElementById(id);
      })
      .filter((el): el is HTMLElement => el !== null);

    if (sectionElements.length === 0) return;

    const topOffset = headerHeight + 20;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          const title = visible[0].target.getAttribute("data-section-title");
          if (title) setActiveSectionTitle(title);
        }
      },
      {
        rootMargin: `-${topOffset}px 0px -50% 0px`,
        threshold: 0,
      }
    );

    for (const el of sectionElements) {
      observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [step.sections, headerHeight]);

  // Reset active section when step changes
  useEffect(() => {
    setActiveSectionTitle(step.sections[0]?.title ?? "");
  }, [step.id, step.sections]);

  const scrollToSection = useCallback((title: string) => {
    const id = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const showImage = step.heroVariant !== "none";
  const hasPhotos = !!photos?.length && !!onGeneratePhoto && !!onRetry && !!generatedImageUrls && !!generatingPhotoKeys && !!errors && !!generatedWithSelections && !!getPhotoVisualSelections && !!selections;

  return (
    <div
      className="flex flex-col gap-3 w-[340px] shrink-0"
      style={{
        position: "sticky",
        top: headerHeight + 16,
        maxHeight: `calc(100vh - ${headerHeight + 32}px)`,
        overflowY: "auto",
      }}
    >
      {/* Per-photo grid (multi-tenant) — replaces StepHero + GenerateButton */}
      {hasPhotos ? (
        <>
          <StepPhotoGrid
            step={step}
            generatedImageUrls={generatedImageUrls}
            generatingPhotoKeys={generatingPhotoKeys}
            onGeneratePhoto={onGeneratePhoto}
            onRetry={onRetry}
            errors={errors}
            generatedWithSelections={generatedWithSelections}
            getPhotoVisualSelections={getPhotoVisualSelections}
            selections={selections}
          />
        </>
      ) : showImage ? (
        <StepHero
          key={step.id}
          step={step}
          generatedImageUrl={null}
          isGenerating={false}
          compact
        />
      ) : null}

      {/* Section quick-nav */}
      <nav className="border-t border-gray-200 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
          Sections
        </p>
        <ul className="space-y-0.5">
          {step.sections.map((section) => {
            const isActive = section.title === activeSectionTitle;
            return (
              <li key={section.title}>
                <button
                  onClick={() => scrollToSection(section.title)}
                  className={`w-full text-left text-sm px-2.5 py-1.5 transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[var(--color-navy)]/10 text-[var(--color-navy)] font-semibold"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {section.title}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Total */}
      <div className="border-t border-gray-200 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Total Upgrades</span>
          <span className={`text-lg font-bold text-[var(--color-navy)] ${pricePulse ? "animate-price-pulse" : ""}`}>
            {total === 0 ? "Base Package" : `+$${total.toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <ClearButton onClear={onClearSelections} />
        {isLastStep ? (
          <button
            onClick={onFinish}
            className="flex-1 py-3 px-6 bg-[var(--color-navy)] text-white font-semibold text-sm hover:bg-[var(--color-navy-hover)] transition-colors duration-150 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Finish &rarr;
          </button>
        ) : (
          <button
            onClick={onContinue}
            className="flex-1 py-3 px-6 bg-[var(--color-navy)] text-white font-semibold text-sm hover:bg-[var(--color-navy-hover)] transition-colors duration-150 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Next Step &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
