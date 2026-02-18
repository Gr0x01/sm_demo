"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { StepConfig } from "@/lib/step-config";
import { StepHero } from "./StepHero";
import { GenerateButton } from "./GenerateButton";

interface SidebarPanelProps {
  step: StepConfig;
  generatedImageUrl: string | null;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
  hasChanges: boolean;
  total: number;
  onContinue: () => void;
  onClearSelections: () => void;
  isLastStep: boolean;
  nextStepName: string;
  headerHeight: number;
}

export function SidebarPanel({
  step,
  generatedImageUrl,
  isGenerating,
  error,
  onGenerate,
  hasChanges,
  total,
  onContinue,
  onClearSelections,
  isLastStep,
  nextStepName,
  headerHeight,
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
      {/* AI Image — steps 1-4 */}
      {showImage && (
        <StepHero
          step={step}
          generatedImageUrl={step.showGenerateButton ? generatedImageUrl : null}
          isGenerating={step.showGenerateButton ? isGenerating : false}
          compact
        />
      )}

      {/* Generate button — steps 1-4 */}
      {step.showGenerateButton && (
        <div>
          <GenerateButton
            onClick={onGenerate}
            isGenerating={isGenerating}
            hasChanges={hasChanges}
            stepId={step.id}
          />
          {error && (
            <div className="mt-2 bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>
      )}

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
        <button
          onClick={onClearSelections}
          className="py-3 px-4 border border-gray-300 text-gray-500 font-semibold text-sm hover:border-gray-400 hover:text-gray-700 transition-colors duration-150 cursor-pointer active:scale-[0.98]"
        >
          Clear Options
        </button>
        {!isLastStep && (
          <button
            onClick={onContinue}
            className="flex-1 py-3 px-6 bg-[var(--color-navy)] text-white font-semibold text-sm hover:bg-[#243a5e] transition-colors duration-150 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Continue to {nextStepName} &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
