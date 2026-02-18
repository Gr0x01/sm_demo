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
import { SidebarPanel } from "./SidebarPanel";
import { SyncModal } from "./SyncModal";
import { getSyncPartner } from "@/lib/sync-pairs";
import { ChevronRight } from "lucide-react";

const visualSubCategoryIds = getVisualSubCategoryIds();

// Build a lookup: subCategoryId → SubCategory object
const subCategoryMap = new Map<string, SubCategory>();
for (const cat of categories) {
  for (const sub of cat.subCategories) {
    subCategoryMap.set(sub.id, sub);
  }
}

const defaultSelections = getDefaultSelections();

const SKIP_FOR_GENERATION = new Set([
  "fireplace-mantel",
  "fireplace-mantel-accent",
  "fireplace-hearth",
  "fireplace-tile-surround",
  "under-cabinet-lighting",
  "carpet-color",
  "bedroom-fan",
  "door-window-casing",
  "crown-options",
]);

/** Subcategories where we can't identify the photo baseline — always send whatever's selected */
const ALWAYS_SEND = new Set([
  // Paint & flooring — all options are free, can't tell what's in the photo
  "accent-color",
  "common-wall-paint",
  "ceiling-paint",
  "trim-paint",
  "door-casing-color",
  "main-area-flooring-color",
  // Bath — mostly base/bone colored, multiple free options
  "primary-bath-cabinet-color",
  "bathroom-cabinet-hardware",
  "primary-bath-mirrors",
  "floor-tile-color",
  "primary-shower",
  "primary-shower-entry",
  "bath-faucets",
  "bath-hardware",
  "secondary-bath-cabinet-color",
  "secondary-bath-mirrors",
  "secondary-shower",
]);

/** Extract the visual selections relevant to a step's generation (shared by generate + cache check). */
function getStepVisualSelections(
  step: (typeof steps)[number],
  allSelections: Record<string, string>
): Record<string, string> {
  const stepSubCategoryIds = new Set([
    ...step.sections.flatMap((sec) => sec.subCategoryIds),
    ...(step.alsoIncludeIds ?? []),
  ]);
  const baseline = step.photoBaseline ?? {};
  const defaults = getDefaultSelections();
  const result: Record<string, string> = {};
  for (const [subId, optId] of Object.entries(allSelections)) {
    // Skip if it matches what's already in the photo (photoBaseline) or the $0 default
    // Always send paint/flooring since we can't identify what's in the photo
    const baselineId = baseline[subId] ?? defaults[subId];
    const alwaysSend = ALWAYS_SEND.has(subId);
    if (
      visualSubCategoryIds.has(subId) &&
      stepSubCategoryIds.has(subId) &&
      !SKIP_FOR_GENERATION.has(subId) &&
      (alwaysSend || optId !== baselineId)
    ) {
      result[subId] = optId;
    }
  }
  return result;
}

function reducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case "SELECT_OPTION": {
      const newSelections = {
        ...state.selections,
        [action.subCategoryId]: action.optionId,
      };
      return { ...state, selections: newSelections };
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
      return { ...state, generatingStepId: action.stepId, error: null };
    case "GENERATION_COMPLETE":
      return {
        ...state,
        generatingStepId: null,
        generatedImageUrls: { ...state.generatedImageUrls, [action.stepId]: action.imageUrl },
        hasEverGenerated: true,
        generatedWithSelections: { ...state.generatedWithSelections, [action.stepId]: action.selectionsSnapshot },
      };
    case "CLEAR_SELECTIONS":
      return {
        ...state,
        selections: getDefaultSelections(),
        quantities: {},
        generatedWithSelections: {},
      };
    case "GENERATION_ERROR":
      return { ...state, generatingStepId: null, error: action.error };
    default:
      return state;
  }
}

function getInitialState(): SelectionState {
  return {
    selections: getDefaultSelections(),
    quantities: {},
    generatedImageUrls: {},
    generatingStepId: null,
    hasEverGenerated: false,
    generatedWithSelections: {},
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

export function UpgradePicker({ onFinish, buyerId }: { onFinish: (data: { selections: Record<string, string>; quantities: Record<string, number>; generatedImageUrls: Record<string, string> }) => void; buyerId?: string }) {
  const [state, dispatch] = useReducer(reducer, null, getInitialState);
  const [activeStepId, setActiveStepIdRaw] = useState(() => {
    if (typeof window === "undefined") return steps[0].id;
    const params = new URLSearchParams(window.location.search);
    const s = params.get("step");
    if (s && steps.some((step) => step.id === s)) return s;
    return steps[0].id;
  });

  // Wrap setActiveStepId to also update the URL
  const setActiveStepId = useCallback((stepId: string) => {
    setActiveStepIdRaw(stepId);
    const url = new URL(window.location.href);
    url.searchParams.set("step", stepId);
    window.history.pushState({}, "", url.toString());
  }, []);

  // Ensure step param is in URL on mount (replaceState, no extra history entry)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.get("step")) {
      url.searchParams.set("step", activeStepId);
      window.history.replaceState({}, "", url.toString());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for back/forward to update step
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const s = params.get("step");
      if (s && steps.some((step) => step.id === s)) {
        setActiveStepIdRaw(s);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
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

  // Load selections from API on mount, then check for cached generated image
  useEffect(() => {
    if (!buyerId) return;
    fetch(`/api/selections/${buyerId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        if (data && Object.keys(data.selections).length > 0) {
          dispatch({
            type: "LOAD_SELECTIONS",
            selections: data.selections,
            quantities: data.quantities ?? {},
          });

          // Check for cached generated images per step
          const modelParam = new URLSearchParams(window.location.search).get("model");
          for (const step of steps) {
            if (!step.showGenerateButton) continue;
            const stepSelections = getStepVisualSelections(step, data.selections);
            if (Object.keys(stepSelections).length === 0) continue;
            try {
              const checkRes = await fetch("/api/generate/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ selections: stepSelections, ...(modelParam ? { model: modelParam } : {}) }),
              });
              if (checkRes.ok) {
                const { imageUrl } = await checkRes.json();
                if (imageUrl) {
                  dispatch({
                    type: "GENERATION_COMPLETE",
                    stepId: step.id,
                    imageUrl,
                    selectionsSnapshot: JSON.stringify(stepSelections),
                  });
                }
              }
            } catch {
              // Non-critical
            }
          }
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
    if (state.generatingStepId) return;
    dispatch({ type: "START_GENERATING", stepId: activeStep.id });

    const visualSelections = getStepVisualSelections(activeStep, state.selections);
    const selectionsSnapshot = JSON.stringify(visualSelections);

    try {
      const modelParam = new URLSearchParams(window.location.search).get("model");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selections: visualSelections,
          heroImage: activeStep.heroImage,
          ...(modelParam ? { model: modelParam } : {}),
        }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const data = await res.json();
      dispatch({ type: "GENERATION_COMPLETE", stepId: activeStep.id, imageUrl: data.imageUrl, selectionsSnapshot });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      dispatch({ type: "GENERATION_ERROR", error: message });
    }
  }, [state.selections, state.generatingStepId, activeStep]);

  const handleClearSelections = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTIONS" });
  }, []);

  const handleContinue = useCallback(() => {
    if (activeStepIndex < steps.length - 1) {
      setActiveStepId(steps[activeStepIndex + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeStepIndex]);

  const isLastStep = activeStepIndex >= steps.length - 1;
  const nextStepName = isLastStep ? "" : steps[activeStepIndex + 1].name;
  const isGeneratingThisStep = state.generatingStepId === activeStep.id;
  const activeStepHasChanges = useMemo(() => {
    if (!activeStep.showGenerateButton) return false;
    const currentSnapshot = JSON.stringify(
      getStepVisualSelections(activeStep, state.selections)
    );
    const lastSnapshot = state.generatedWithSelections[activeStep.id];
    return currentSnapshot !== lastSnapshot;
  }, [activeStep, state.selections, state.generatedWithSelections]);

  const activeGeneratedImageUrl = state.generatedImageUrls[activeStep.id] ?? null;
  const activeBaseImageUrl =
    typeof activeStep.heroImage === "string"
      ? activeStep.heroImage
      : Array.isArray(activeStep.heroImage)
      ? activeStep.heroImage[0]
      : null;
  const activePreviewImageUrl = activeGeneratedImageUrl ?? activeBaseImageUrl;
  const activeSelectionSummary = useMemo(() => {
    const summary: string[] = [];
    for (const section of activeStep.sections) {
      for (const subId of section.subCategoryIds) {
        const sub = subCategoryMap.get(subId);
        if (!sub) continue;
        const selectedId = state.selections[subId];
        if (!selectedId) continue;
        const selectedOption = sub.options.find((o) => o.id === selectedId);
        if (!selectedOption) continue;
        if (selectedOption.name.toLowerCase().includes("no upgrade wanted")) continue;
        summary.push(`${sub.name}: ${selectedOption.name}`);
        if (summary.length >= 3) return summary;
      }
    }
    return summary;
  }, [activeStep, state.selections]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header
        ref={headerRef}
        className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 min-h-[72px] sm:min-h-[64px] flex items-center gap-2 sm:gap-4">
          {/* Logo — left */}
          <div className="flex items-center gap-2 sm:gap-3 w-16 sm:w-auto shrink-0">
            <img src="/logo.svg" alt="Stone Martin Builders" className="h-6 sm:h-5 text-[var(--color-navy)]" />
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-[var(--color-navy)]">
                Kinkade Plan
              </h1>
              <p className="text-[10px] text-gray-400">
                McClain Landing Phase 7
              </p>
            </div>
          </div>

          {/* Step nav — center */}
          <div className="flex-1 min-w-0 flex items-center justify-center">
            <StepNav
              steps={steps}
              activeStepId={activeStepId}
              completionMap={completionMap}
              onSelectStep={setActiveStepId}
            />
          </div>

          {/* Finish — right */}
          <div className="w-auto shrink-0 flex justify-end">
            <button
              onClick={() => onFinish({ selections: state.selections, quantities: state.quantities, generatedImageUrls: state.generatedImageUrls })}
              className="inline-flex items-center gap-1.5 px-1 py-1 text-sm font-semibold text-[var(--color-accent)] hover:text-[var(--color-navy)] transition-colors cursor-pointer"
            >
              Finish
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Two-column layout */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="flex gap-8">
          {/* Left Sidebar — desktop only */}
          <div className="hidden lg:block">
            <SidebarPanel
              step={activeStep}
              generatedImageUrl={state.generatedImageUrls[activeStep.id] ?? null}
              isGenerating={isGeneratingThisStep}
              error={state.error}
              onGenerate={handleGenerate}
              hasChanges={activeStepHasChanges}
              total={total}
              onContinue={handleContinue}
              onClearSelections={handleClearSelections}
              isLastStep={isLastStep}
              nextStepName={nextStepName}
              headerHeight={headerHeight}
            />
          </div>

          {/* Right Column — scrollable options */}
          <div className="flex-1 min-w-0 pb-20 lg:pb-5">
            {/* Step-specific upgrade options */}
            <StepContent
              key={activeStepId}
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
                Next Step &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Price Tracker — mobile only */}
      <div className="lg:hidden">
        <PriceTracker
          total={total}
          onGenerate={handleGenerate}
          isGenerating={isGeneratingThisStep}
          hasChanges={activeStepHasChanges}
          stepId={activeStep.id}
          showGenerateButton={!!activeStep.showGenerateButton}
          error={state.error}
          hasGeneratedPreview={!!activeGeneratedImageUrl}
          previewImageUrl={activePreviewImageUrl}
          previewTitle={activeStep.name}
          previewSummary={activeSelectionSummary}
        />
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
