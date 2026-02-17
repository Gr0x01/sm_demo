"use client";

import { useReducer, useCallback, useMemo, useState, useEffect, useRef } from "react";
import type { SelectionState, SelectionAction, SubCategory } from "@/types";
import { categories, getDefaultSelections, getVisualSubCategoryIds } from "@/lib/options-data";
import { calculateTotal } from "@/lib/pricing";
import { steps } from "@/lib/step-config";
import { StepNav } from "./StepNav";
import { StepHero } from "./StepHero";
import { StepContent } from "./StepContent";
import { PriceTracker } from "./PriceTracker";
import { GenerateButton } from "./GenerateButton";
import { SidebarPanel } from "./SidebarPanel";
import { SyncModal } from "./SyncModal";
import { getSyncPartner } from "@/lib/sync-pairs";

const visualSubCategoryIds = getVisualSubCategoryIds();

// Build a lookup: subCategoryId → SubCategory object
const subCategoryMap = new Map<string, SubCategory>();
for (const cat of categories) {
  for (const sub of cat.subCategories) {
    subCategoryMap.set(sub.id, sub);
  }
}

function reducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case "SELECT_OPTION": {
      const newSelections = {
        ...state.selections,
        [action.subCategoryId]: action.optionId,
      };
      const isVisualChange = visualSubCategoryIds.has(action.subCategoryId);
      return {
        ...state,
        selections: newSelections,
        visualSelectionsChangedSinceLastGenerate: isVisualChange
          ? true
          : state.visualSelectionsChangedSinceLastGenerate,
      };
    }
    case "SET_QUANTITY": {
      const newQuantities = { ...state.quantities, [action.subCategoryId]: action.quantity };
      const newSelections = {
        ...state.selections,
        [action.subCategoryId]: action.quantity > 0 ? action.addOptionId : action.noUpgradeOptionId,
      };
      return { ...state, selections: newSelections, quantities: newQuantities };
    }
    case "LOAD_SELECTIONS": {
      return {
        ...state,
        selections: { ...state.selections, ...action.selections },
        quantities: { ...action.quantities },
      };
    }
    case "START_GENERATING":
      return { ...state, isGenerating: true, error: null };
    case "GENERATION_COMPLETE":
      return {
        ...state,
        isGenerating: false,
        generatedImageUrl: action.imageUrl,
        hasEverGenerated: true,
        visualSelectionsChangedSinceLastGenerate: false,
      };
    case "GENERATION_ERROR":
      return { ...state, isGenerating: false, error: action.error };
    default:
      return state;
  }
}

function getInitialState(): SelectionState {
  return {
    selections: getDefaultSelections(),
    quantities: {},
    generatedImageUrl: null,
    isGenerating: false,
    hasEverGenerated: false,
    visualSelectionsChangedSinceLastGenerate: true,
    error: null,
  };
}

// Check if a step has any non-zero-price selections
function stepHasUpgrades(
  step: typeof steps[number],
  selections: Record<string, string>,
  quantities: Record<string, number>
): boolean {
  for (const section of step.sections) {
    for (const subId of section.subCategoryIds) {
      const sub = subCategoryMap.get(subId);
      if (!sub) continue;
      const selectedId = selections[subId];
      if (!selectedId) continue;
      const option = sub.options.find((o) => o.id === selectedId);
      if (option && option.price > 0) {
        const qty = sub.isAdditive ? (quantities[subId] || 0) : 1;
        if (qty > 0) return true;
      }
    }
  }
  return false;
}

export function UpgradePicker({ onFinish, buyerId }: { onFinish: (data: { selections: Record<string, string>; quantities: Record<string, number>; generatedImageUrl: string | null }) => void; buyerId?: string }) {
  const [state, dispatch] = useReducer(reducer, null, getInitialState);
  const [activeStepId, setActiveStepId] = useState(steps[0].id);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(120);
  const [syncPrompt, setSyncPrompt] = useState<{
    sourceSubId: string;
    targetSubId: string;
    optionName: string;
    targetOptionId: string;
    label: string;
  } | null>(null);

  // Measure header height dynamically
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      if (el) setHeaderHeight(el.offsetHeight);
    });
    ro.observe(el);

    // Initial measurement
    setHeaderHeight(el.offsetHeight);

    return () => ro.disconnect();
  }, []);

  // Set CSS variable for scroll-margin-top
  useEffect(() => {
    document.documentElement.style.setProperty("--header-height", `${headerHeight}px`);
  }, [headerHeight]);

  // Load selections from API on mount
  useEffect(() => {
    if (!buyerId) return;
    fetch(`/api/selections/${buyerId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Object.keys(data.selections).length > 0) {
          dispatch({
            type: "LOAD_SELECTIONS",
            selections: data.selections,
            quantities: data.quantities ?? {},
          });
        }
        hasLoadedRef.current = true;
      })
      .catch(() => {
        hasLoadedRef.current = true;
      });
  }, [buyerId]);

  // Auto-save selections (debounced 1s)
  useEffect(() => {
    if (!buyerId || !hasLoadedRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      fetch(`/api/selections/${buyerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selections: state.selections,
          quantities: state.quantities,
        }),
      }).catch(() => {});
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [buyerId, state.selections, state.quantities]);

  const activeStep = steps.find((s) => s.id === activeStepId) || steps[0];
  const activeStepIndex = steps.findIndex((s) => s.id === activeStepId);

  const total = useMemo(
    () => calculateTotal(state.selections, state.quantities),
    [state.selections, state.quantities]
  );

  const completionMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const step of steps) {
      map[step.id] = stepHasUpgrades(step, state.selections, state.quantities);
    }
    return map;
  }, [state.selections, state.quantities]);

  const handleSelect = useCallback(
    (subCategoryId: string, optionId: string) => {
      dispatch({ type: "SELECT_OPTION", subCategoryId, optionId });

      // Check if this subcategory has a sync partner
      const partner = getSyncPartner(subCategoryId);
      if (!partner) return;

      const sourceSub = subCategoryMap.get(subCategoryId);
      const targetSub = subCategoryMap.get(partner.partnerSubId);
      if (!sourceSub || !targetSub) return;

      const selectedOption = sourceSub.options.find((o) => o.id === optionId);
      if (!selectedOption) return;

      // Find matching option in partner by name
      const matchingOption = targetSub.options.find(
        (o) => o.name === selectedOption.name
      );
      if (!matchingOption) return;

      // Don't prompt if partner already has the same selection
      const currentPartnerSelection = state.selections[partner.partnerSubId];
      if (currentPartnerSelection === matchingOption.id) return;

      setSyncPrompt({
        sourceSubId: subCategoryId,
        targetSubId: partner.partnerSubId,
        optionName: selectedOption.name,
        targetOptionId: matchingOption.id,
        label: partner.label,
      });
    },
    [state.selections]
  );

  const handleSetQuantity = useCallback(
    (subCategoryId: string, quantity: number, addOptionId: string, noUpgradeOptionId: string) => {
      dispatch({ type: "SET_QUANTITY", subCategoryId, quantity, addOptionId, noUpgradeOptionId });
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    if (state.isGenerating) return;
    dispatch({ type: "START_GENERATING" });

    const visualSelections: Record<string, string> = {};
    for (const [subId, optId] of Object.entries(state.selections)) {
      if (visualSubCategoryIds.has(subId)) {
        visualSelections[subId] = optId;
      }
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections: visualSelections, heroImage: activeStep.heroImage }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const data = await res.json();
      dispatch({ type: "GENERATION_COMPLETE", imageUrl: data.imageUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      dispatch({ type: "GENERATION_ERROR", error: message });
    }
  }, [state.selections, state.isGenerating]);

  const handleContinue = useCallback(() => {
    if (activeStepIndex < steps.length - 1) {
      setActiveStepId(steps[activeStepIndex + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeStepIndex]);

  const isLastStep = activeStepIndex >= steps.length - 1;
  const nextStepName = isLastStep ? "" : steps[activeStepIndex + 1].name;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header
        ref={headerRef}
        className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200"
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Stone Martin Builders" className="h-5 text-[var(--color-navy)]" />
            <div>
              <h1 className="text-sm font-bold text-[var(--color-navy)]">
                Kinkade Plan
              </h1>
              <p className="text-[10px] text-gray-400">
                McClain Landing Phase 7
              </p>
            </div>
          </div>
          <button
            onClick={() => onFinish({ selections: state.selections, quantities: state.quantities, generatedImageUrl: state.generatedImageUrl })}
            className="text-xs font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-light)] transition-colors cursor-pointer"
          >
            Finish &rarr;
          </button>
        </div>

        {/* Step nav inside header for sticky behavior */}
        <div className="max-w-7xl mx-auto px-4 pb-2">
          <StepNav
            steps={steps}
            activeStepId={activeStepId}
            completionMap={completionMap}
            onSelectStep={setActiveStepId}
          />
        </div>
      </header>

      {/* Two-column layout */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="flex gap-8">
          {/* Left Sidebar — desktop only */}
          <div className="hidden lg:block">
            <SidebarPanel
              step={activeStep}
              generatedImageUrl={state.generatedImageUrl}
              isGenerating={state.isGenerating}
              error={state.error}
              onGenerate={handleGenerate}
              hasChanges={state.visualSelectionsChangedSinceLastGenerate}
              total={total}
              onContinue={handleContinue}
              isLastStep={isLastStep}
              nextStepName={nextStepName}
              headerHeight={headerHeight}
            />
          </div>

          {/* Right Column — scrollable options */}
          <div className="flex-1 min-w-0 pb-20 lg:pb-5">
            {/* Mobile-only: Hero image + generate button */}
            <div key={activeStepId} className="lg:hidden animate-fade-slide-in">
              <StepHero
                step={activeStep}
                generatedImageUrl={activeStep.showGenerateButton ? state.generatedImageUrl : null}
                isGenerating={activeStep.showGenerateButton ? state.isGenerating : false}
              />
              {activeStep.showGenerateButton && (
                <div className="mt-4">
                  <GenerateButton
                    onClick={handleGenerate}
                    isGenerating={state.isGenerating}
                    hasChanges={state.visualSelectionsChangedSinceLastGenerate}
                  />
                  {state.error && (
                    <div className="mt-3 bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                      {state.error}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step-specific upgrade options */}
            <StepContent
              step={activeStep}
              subCategoryMap={subCategoryMap}
              selections={state.selections}
              quantities={state.quantities}
              onSelect={handleSelect}
              onSetQuantity={handleSetQuantity}
            />

            {/* Mobile-only: Continue button */}
            {!isLastStep && (
              <button
                onClick={handleContinue}
                className="lg:hidden w-full mt-10 py-3.5 px-6 bg-[var(--color-navy)] text-white font-semibold text-sm hover:bg-[#243a5e] transition-colors duration-150 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                Continue to {nextStepName} &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Price Tracker — mobile only */}
      <div className="lg:hidden">
        <PriceTracker total={total} />
      </div>

      {/* Sync hardware modal */}
      {syncPrompt && (
        <SyncModal
          sourceName={subCategoryMap.get(syncPrompt.sourceSubId)?.name ?? ""}
          targetName={subCategoryMap.get(syncPrompt.targetSubId)?.name ?? ""}
          optionName={syncPrompt.optionName}
          label={syncPrompt.label}
          onSync={() => {
            dispatch({
              type: "SELECT_OPTION",
              subCategoryId: syncPrompt.targetSubId,
              optionId: syncPrompt.targetOptionId,
            });
            setSyncPrompt(null);
          }}
          onDismiss={() => setSyncPrompt(null)}
        />
      )}
    </div>
  );
}
