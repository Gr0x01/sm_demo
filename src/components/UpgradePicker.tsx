"use client";

import { useReducer, useCallback, useMemo, useState, useEffect, useRef } from "react";
import type { SelectionState, SelectionAction, SubCategory, Category } from "@/types";
import { calculateTotal } from "@/lib/pricing";
import type { StepConfig } from "@/lib/step-config";
import { StepNav } from "./StepNav";
import { StepHero } from "./StepHero";
import { StepContent } from "./StepContent";
import { PriceTracker } from "./PriceTracker";
import { SidebarPanel } from "./SidebarPanel";
import { SyncModal } from "./SyncModal";
import { SaveSelectionsModal } from "./SaveSelectionsModal";
import { GalleryView } from "./GalleryView";
import { StepPhotoGrid } from "./StepPhotoGrid";
import { ChevronRight, Save } from "lucide-react";
import type { ContractPhase } from "@/lib/contract-phase";

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

interface UpgradePickerProps {
  onFinish: (data: { selections: Record<string, string>; quantities: Record<string, number>; generatedImageUrls: Record<string, string> }) => void;
  saveUrl?: string;
  orgId: string;
  floorplanId: string;
  initialSelections?: Record<string, string> | null;
  initialQuantities?: Record<string, number> | null;
  sessionId?: string;
  buyerEmail?: string;
  orgSlug: string;
  floorplanSlug: string;
  onSessionSaved: (email: string, resumeToken: string) => void;
  onSessionResumed: (session: { id: string; selections: Record<string, string>; quantities: Record<string, number> }) => void;
  contractPhase: ContractPhase;
  onNavigateHome: () => void;
  orgName: string;
  logoUrl: string | null;
  planName: string;
  community: string;
  categories: Category[];
  steps: StepConfig[];
  contractLockedIds: string[];
  syncPairs: { a: string; b: string; label: string }[];
  generationCap?: number;
}

function getDefaultSelectionsFromCategories(categories: Category[]): Record<string, string> {
  const selections: Record<string, string> = {};
  for (const category of categories) {
    for (const sub of category.subCategories) {
      const defaultOption = sub.options.find((o) => o.price === 0);
      if (defaultOption) {
        selections[sub.id] = defaultOption.id;
      }
    }
  }
  return selections;
}

function getVisualSubCategoryIdsFromCategories(categories: Category[]): Set<string> {
  const ids = new Set<string>();
  for (const category of categories) {
    for (const sub of category.subCategories) {
      if (sub.isVisual) ids.add(sub.id);
    }
  }
  return ids;
}

function getSyncPartnerFromPairs(
  changedSubId: string,
  syncPairs: { a: string; b: string; label: string }[]
): { partnerSubId: string; label: string } | null {
  for (const pair of syncPairs) {
    if (pair.a === changedSubId) return { partnerSubId: pair.b, label: pair.label };
    if (pair.b === changedSubId) return { partnerSubId: pair.a, label: pair.label };
  }
  return null;
}

/** Deterministic JSON string — sorted keys so key insertion order doesn't affect comparison. */
function stableStringify(obj: Record<string, string>): string {
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return JSON.stringify(sorted);
}

export function UpgradePicker({
  onFinish,
  saveUrl,
  orgId,
  floorplanId,
  initialSelections,
  initialQuantities,
  sessionId,
  buyerEmail,
  orgSlug,
  floorplanSlug,
  onSessionSaved,
  onSessionResumed,
  contractPhase,
  onNavigateHome,
  orgName,
  logoUrl,
  planName,
  community,
  categories,
  steps,
  contractLockedIds,
  syncPairs,
  generationCap,
}: UpgradePickerProps) {
  const visualSubCategoryIds = useMemo(
    () => getVisualSubCategoryIdsFromCategories(categories),
    [categories]
  );

  const subCategoryMap = useMemo(() => {
    const map = new Map<string, SubCategory>();
    for (const cat of categories) {
      for (const sub of cat.subCategories) {
        map.set(sub.id, sub);
      }
    }
    return map;
  }, [categories]);

  const defaultSelections = useMemo(
    () => getDefaultSelectionsFromCategories(categories),
    [categories]
  );

  const lockedSubCategoryIds = useMemo(
    () => (contractPhase === "post-contract" ? new Set(contractLockedIds) : new Set<string>()),
    [contractPhase, contractLockedIds]
  );

  /** Extract the visual selections relevant to a step's generation (shared by generate + cache check). */
  const getStepVisualSelections = useCallback(
    (step: StepConfig, allSelections: Record<string, string>): Record<string, string> => {
      const stepSubCategoryIds = new Set([
        ...step.sections.flatMap((sec) => sec.subCategoryIds),
        ...(step.alsoIncludeIds ?? []),
      ]);
      const baseline = step.photoBaseline ?? {};
      const result: Record<string, string> = {};
      for (const [subId, optId] of Object.entries(allSelections)) {
        const baselineId = baseline[subId] ?? defaultSelections[subId];
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
    },
    [visualSubCategoryIds, defaultSelections]
  );

  function reducer(state: SelectionState, action: SelectionAction): SelectionState {
    switch (action.type) {
      case "SELECT_OPTION": {
        const newSelections = {
          ...state.selections,
          [action.subCategoryId]: action.optionId,
        };
        return { ...state, selections: newSelections, errors: {} };
      }
      case "SET_QUANTITY": {
        const newQuantities = { ...state.quantities, [action.subCategoryId]: action.quantity };
        const newSelections = {
          ...state.selections,
          [action.subCategoryId]: action.quantity > 0 ? action.addOptionId : action.noUpgradeOptionId,
        };
        return { ...state, selections: newSelections, quantities: newQuantities, errors: {} };
      }
      case "LOAD_SELECTIONS": {
        return {
          ...state,
          selections: { ...state.selections, ...action.selections },
          quantities: { ...action.quantities },
        };
      }
      case "START_GENERATING": {
        const next = new Set(state.generatingStepIds);
        next.add(action.stepId);
        const nextErrors = { ...state.errors };
        delete nextErrors[action.stepId];
        return { ...state, generatingStepIds: next, errors: nextErrors };
      }
      case "GENERATION_COMPLETE": {
        const next = new Set(state.generatingStepIds);
        next.delete(action.stepId);
        const nextImageIds = action.generatedImageId
          ? { ...state.generatedImageIds, [action.stepId]: action.generatedImageId }
          : state.generatedImageIds;
        return {
          ...state,
          generatingStepIds: next,
          generatedImageUrls: { ...state.generatedImageUrls, [action.stepId]: action.imageUrl },
          hasEverGenerated: true,
          generatedWithSelections: { ...state.generatedWithSelections, [action.stepId]: action.selectionsSnapshot },
          generatedImageIds: nextImageIds,
        };
      }
      case "CLEAR_SELECTIONS":
        return {
          ...state,
          selections: defaultSelections,
          quantities: {},
          generatedWithSelections: {},
        };
      case "GENERATION_ERROR": {
        const next = new Set(state.generatingStepIds);
        next.delete(action.stepId);
        return { ...state, generatingStepIds: next, errors: { ...state.errors, [action.stepId]: action.error } };
      }
      case "START_GENERATING_PHOTO": {
        const next = new Set(state.generatingPhotoKeys);
        next.add(action.photoKey);
        const nextErrors = { ...state.errors };
        delete nextErrors[action.photoKey];
        return { ...state, generatingPhotoKeys: next, errors: nextErrors };
      }
      case "PHOTO_GENERATION_COMPLETE": {
        const next = new Set(state.generatingPhotoKeys);
        next.delete(action.photoKey);
        return {
          ...state,
          generatingPhotoKeys: next,
          generatedImageUrls: { ...state.generatedImageUrls, [action.photoKey]: action.imageUrl },
          hasEverGenerated: true,
          generatedWithSelections: { ...state.generatedWithSelections, [action.photoKey]: action.selectionsSnapshot },
          generatedImageIds: { ...state.generatedImageIds, [action.photoKey]: action.generatedImageId },
        };
      }
      case "PHOTO_GENERATION_ERROR": {
        const next = new Set(state.generatingPhotoKeys);
        next.delete(action.photoKey);
        return { ...state, generatingPhotoKeys: next, errors: { ...state.errors, [action.photoKey]: action.error } };
      }
      case "SET_FEEDBACK":
        return { ...state, feedbackVotes: { ...state.feedbackVotes, [action.photoKey]: action.vote } };
      case "REMOVE_GENERATED_IMAGE": {
        const nextUrls = { ...state.generatedImageUrls };
        delete nextUrls[action.photoKey];
        const nextIds = { ...state.generatedImageIds };
        delete nextIds[action.photoKey];
        const nextSnaps = { ...state.generatedWithSelections };
        delete nextSnaps[action.photoKey];
        return { ...state, generatedImageUrls: nextUrls, generatedImageIds: nextIds, generatedWithSelections: nextSnaps };
      }
      case "SET_CREDITS":
        return { ...state, generationCredits: { used: action.used, total: action.total } };
      default:
        return state;
    }
  }

  const [state, dispatch] = useReducer(reducer, null, (): SelectionState => ({
    selections: defaultSelections,
    quantities: {},
    generatedImageUrls: {},
    generatingStepIds: new Set<string>(),
    generatingPhotoKeys: new Set<string>(),
    hasEverGenerated: false,
    generatedWithSelections: {},
    generatedImageIds: {},
    feedbackVotes: {},
    generationCredits: null,
    errors: {},
  }));

  const [activeStepId, setActiveStepIdRaw] = useState(() => {
    if (typeof window === "undefined") return steps[0].id;
    const params = new URLSearchParams(window.location.search);
    const s = params.get("step");
    if (s && steps.some((step) => step.id === s)) return s;
    return steps[0].id;
  });

  const setActiveStepId = useCallback((stepId: string) => {
    setActiveStepIdRaw(stepId);
    const url = new URL(window.location.href);
    url.searchParams.set("step", stepId);
    window.history.pushState({}, "", url.toString());
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.get("step")) {
      url.searchParams.set("step", activeStepId);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

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
  }, [steps]);

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

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (el) setHeaderHeight(el.offsetHeight);
    });
    ro.observe(el);
    setHeaderHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--header-height", `${headerHeight}px`);
  }, [headerHeight]);

  const [showSaveModal, setShowSaveModal] = useState(false);

  // Load initial selections from parent (session restore), then check for cached generated images
  useEffect(() => {
    if (initialSelections === undefined) return; // not ready yet
    if (hasLoadedRef.current) return;

    async function loadAndCheckCache() {
      if (initialSelections && Object.keys(initialSelections).length > 0) {
        dispatch({
          type: "LOAD_SELECTIONS",
          selections: initialSelections,
          quantities: initialQuantities ?? {},
        });

        const mergedSelections = { ...defaultSelections, ...initialSelections };
        const modelParam = new URLSearchParams(window.location.search).get("model");
        for (const step of steps) {
          if (!step.showGenerateButton) continue;
          const stepSelections = getStepVisualSelections(step, mergedSelections);
          if (Object.keys(stepSelections).length === 0) continue;

          // Multi-tenant: check cache per photo
          if (step.photos?.length && orgSlug && floorplanSlug) {
            for (const photo of step.photos) {
              try {
                const checkRes = await fetch("/api/generate/photo/check", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    orgSlug,
                    floorplanSlug,
                    stepPhotoId: photo.id,
                    selections: stepSelections,
                    ...(modelParam ? { model: modelParam } : {}),
                  }),
                });
                if (checkRes.ok) {
                  const { imageUrl, generatedImageId } = await checkRes.json();
                  if (imageUrl) {
                    dispatch({
                      type: "PHOTO_GENERATION_COMPLETE",
                      photoKey: photo.id,
                      imageUrl,
                      selectionsSnapshot: stableStringify(stepSelections),
                      generatedImageId: generatedImageId ?? null,
                    });
                  }
                }
              } catch {
                // Non-critical
              }
            }
            continue; // skip SM-style check for this step
          }

          // SM demo: check cache per step
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
                  selectionsSnapshot: stableStringify(stepSelections),
                });
              }
            }
          } catch {
            // Non-critical
          }
        }
      }
      hasLoadedRef.current = true;
    }

    loadAndCheckCache();
  }, [initialSelections, initialQuantities, steps, defaultSelections, getStepVisualSelections, orgSlug, floorplanSlug]);

  // Auto-save selections (debounced 1s)
  useEffect(() => {
    if (!saveUrl || !hasLoadedRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      fetch(saveUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          floorplan_id: floorplanId,
          selections: state.selections,
          quantities: state.quantities,
        }),
      }).catch(() => {});
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [saveUrl, orgId, floorplanId, state.selections, state.quantities]);

  // Build the gallery virtual step and the augmented steps array
  const hasAnyPhotos = useMemo(() => steps.some(s => s.photos?.length), [steps]);
  const galleryStep: StepConfig = useMemo(() => ({
    id: "__gallery",
    number: steps.length + 1,
    name: "Gallery",
    subtitle: "Review all your visualizations",
    heroImage: "",
    heroVariant: "none",
    showGenerateButton: false,
    sections: [],
  }), [steps.length]);
  const allSteps = useMemo(
    () => hasAnyPhotos ? [...steps, galleryStep] : steps,
    [steps, hasAnyPhotos, galleryStep]
  );

  const activeStep = allSteps.find((s) => s.id === activeStepId) || allSteps[0];
  const activeStepIndex = allSteps.findIndex((s) => s.id === activeStepId);

  const total = useMemo(
    () => calculateTotal(state.selections, state.quantities, categories),
    [state.selections, state.quantities, categories]
  );

  // Check if a step has any non-zero-price selections
  const stepHasUpgrades = useCallback(
    (step: StepConfig, selections: Record<string, string>, quantities: Record<string, number>): boolean => {
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
    },
    [subCategoryMap]
  );

  const completionMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const step of steps) {
      map[step.id] = stepHasUpgrades(step, state.selections, state.quantities);
    }
    return map;
  }, [steps, state.selections, state.quantities, stepHasUpgrades]);

  const handleSelect = useCallback(
    (subCategoryId: string, optionId: string) => {
      dispatch({ type: "SELECT_OPTION", subCategoryId, optionId });

      const partner = getSyncPartnerFromPairs(subCategoryId, syncPairs);
      if (!partner) return;

      const sourceSub = subCategoryMap.get(subCategoryId);
      const targetSub = subCategoryMap.get(partner.partnerSubId);
      if (!sourceSub || !targetSub) return;

      const selectedOption = sourceSub.options.find((o) => o.id === optionId);
      if (!selectedOption) return;

      const matchingOption = targetSub.options.find(
        (o) => o.name === selectedOption.name
      );
      if (!matchingOption) return;

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
    [state.selections, syncPairs, subCategoryMap]
  );

  const handleSetQuantity = useCallback(
    (subCategoryId: string, quantity: number, addOptionId: string, noUpgradeOptionId: string) => {
      dispatch({ type: "SET_QUANTITY", subCategoryId, quantity, addOptionId, noUpgradeOptionId });
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    if (state.generatingStepIds.has(activeStep.id)) return;
    dispatch({ type: "START_GENERATING", stepId: activeStep.id });

    const visualSelections = getStepVisualSelections(activeStep, state.selections);
    const selectionsSnapshot = stableStringify(visualSelections);

    try {
      const modelParam = new URLSearchParams(window.location.search).get("model");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selections: visualSelections,
          heroImage: activeStep.heroImage,
          stepSlug: activeStep.id,
          ...(modelParam ? { model: modelParam } : {}),
        }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const data = await res.json();
      dispatch({ type: "GENERATION_COMPLETE", stepId: activeStep.id, imageUrl: data.imageUrl, selectionsSnapshot });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      dispatch({ type: "GENERATION_ERROR", stepId: activeStep.id, error: message });
    }
  }, [state.selections, state.generatingStepIds, activeStep, getStepVisualSelections]);

  // --- Per-photo generation (multi-tenant) ---
  // Reuse getStepVisualSelections — same logic applies per-photo (uses parent step's photoBaseline)
  const getPhotoVisualSelections = getStepVisualSelections;

  const handleGeneratePhoto = useCallback(async (photoKey: string, stepPhotoId: string, step: StepConfig) => {
    if (state.generatingPhotoKeys.has(photoKey)) return;
    dispatch({ type: "START_GENERATING_PHOTO", photoKey });

    const visualSelections = getPhotoVisualSelections(step, state.selections);
    const selectionsSnapshot = stableStringify(visualSelections);

    try {
      const modelParam = new URLSearchParams(window.location.search).get("model");
      const res = await fetch("/api/generate/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgSlug,
          floorplanSlug,
          stepPhotoId,
          selections: visualSelections,
          sessionId,
          ...(modelParam ? { model: modelParam } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "cap_reached") {
          dispatch({ type: "SET_CREDITS", used: data.creditsUsed, total: data.creditsTotal });
          dispatch({ type: "PHOTO_GENERATION_ERROR", photoKey, error: "No visualizations remaining" });
          return;
        }
        throw new Error(data.error || "Generation failed");
      }

      dispatch({
        type: "PHOTO_GENERATION_COMPLETE",
        photoKey,
        imageUrl: data.imageUrl,
        selectionsSnapshot,
        generatedImageId: data.generatedImageId,
      });

      if (data.creditsUsed !== undefined) {
        dispatch({ type: "SET_CREDITS", used: data.creditsUsed, total: data.creditsTotal });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      dispatch({ type: "PHOTO_GENERATION_ERROR", photoKey, error: message });
    }
  }, [state.selections, state.generatingPhotoKeys, orgSlug, floorplanSlug, sessionId, getPhotoVisualSelections]);

  const handleGenerateAll = useCallback(async () => {
    // Collect all photos across all steps that need generation
    const pending: { photoKey: string; stepPhotoId: string; step: StepConfig }[] = [];
    for (const step of steps) {
      if (!step.photos?.length) continue;
      const fingerprint = stableStringify(getPhotoVisualSelections(step, state.selections));
      for (const photo of step.photos) {
        const existing = state.generatedWithSelections[photo.id];
        if (existing !== fingerprint && !state.generatingPhotoKeys.has(photo.id)) {
          pending.push({ photoKey: photo.id, stepPhotoId: photo.id, step });
        }
      }
    }

    // Fire with max 3 concurrent
    const concurrency = 3;
    let i = 0;
    async function runNext(): Promise<void> {
      while (i < pending.length) {
        const item = pending[i++];
        await handleGeneratePhoto(item.photoKey, item.stepPhotoId, item.step);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, () => runNext()));
  }, [steps, state.selections, state.generatedWithSelections, state.generatingPhotoKeys, getPhotoVisualSelections, handleGeneratePhoto]);

  const handleFeedback = useCallback(async (photoKey: string, vote: 1 | -1) => {
    const generatedImageId = state.generatedImageIds[photoKey];
    if (!generatedImageId || !sessionId) return;

    dispatch({ type: "SET_FEEDBACK", photoKey, vote });

    if (vote === -1) {
      dispatch({ type: "REMOVE_GENERATED_IMAGE", photoKey });
    }

    try {
      const res = await fetch("/api/generate/photo/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generatedImageId, vote, sessionId, orgSlug }),
      });

      if (res.ok) {
        const data = await res.json();
        dispatch({ type: "SET_CREDITS", used: data.creditsUsed, total: data.creditsTotal });
      }
    } catch {
      // Non-critical — feedback is best-effort
    }
  }, [state.generatedImageIds, sessionId, orgSlug]);

  const handleClearSelections = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTIONS" });
  }, []);

  const handleContinue = useCallback(() => {
    if (activeStepIndex < allSteps.length - 1) {
      setActiveStepId(allSteps[activeStepIndex + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeStepIndex, allSteps, setActiveStepId]);

  const isLastStep = activeStepIndex >= allSteps.length - 1;
  const nextStepName = isLastStep ? "" : allSteps[activeStepIndex + 1].name;
  const isGeneratingThisStep = state.generatingStepIds.has(activeStep.id);
  const activeStepHasChanges = useMemo(() => {
    if (!activeStep.showGenerateButton) return false;
    const currentSnapshot = stableStringify(
      getStepVisualSelections(activeStep, state.selections)
    );
    const lastSnapshot = state.generatedWithSelections[activeStep.id];
    return currentSnapshot !== lastSnapshot;
  }, [activeStep, state.selections, state.generatedWithSelections, getStepVisualSelections]);

  // When selections change to a combination we haven't generated in this session,
  // check server cache — if it's a hit, restore instantly without requiring a click.
  // Debounced (300ms) so rapid swatch clicks don't fire excessive requests.
  // While checking, suppress hasChanges so the button doesn't flash "Visualize" → "Up to Date".
  const [isCheckingCache, setIsCheckingCache] = useState(false);
  const cacheCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheCheckAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!activeStepHasChanges || !activeStep.showGenerateButton) return;
    if (state.generatingStepIds.has(activeStep.id)) return;

    const visualSelections = getStepVisualSelections(activeStep, state.selections);
    if (Object.keys(visualSelections).length === 0) return;

    const selectionsSnapshot = stableStringify(visualSelections);
    const modelParam = new URLSearchParams(window.location.search).get("model");

    // Abort any in-flight check and clear pending timer
    cacheCheckAbortRef.current?.abort();
    if (cacheCheckTimerRef.current) clearTimeout(cacheCheckTimerRef.current);

    const controller = new AbortController();
    cacheCheckAbortRef.current = controller;
    setIsCheckingCache(true);

    cacheCheckTimerRef.current = setTimeout(() => {
      fetch("/api/generate/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selections: visualSelections,
          ...(modelParam ? { model: modelParam } : {}),
        }),
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.imageUrl) {
            dispatch({
              type: "GENERATION_COMPLETE",
              stepId: activeStep.id,
              imageUrl: data.imageUrl,
              selectionsSnapshot,
            });
          }
          setIsCheckingCache(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) setIsCheckingCache(false);
        });
    }, 300);

    return () => {
      controller.abort();
      if (cacheCheckTimerRef.current) clearTimeout(cacheCheckTimerRef.current);
    };
  }, [activeStepHasChanges, activeStep, state.selections, state.generatingStepIds, getStepVisualSelections]);

  // Suppress hasChanges while cache check is in flight — prevents button flash
  const effectiveHasChanges = activeStepHasChanges && !isCheckingCache;

  // Preload all generated images so step switching is instant
  useEffect(() => {
    for (const url of Object.values(state.generatedImageUrls)) {
      if (url) {
        const img = new Image();
        img.src = url;
      }
    }
  }, [state.generatedImageUrls]);

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
  }, [activeStep, state.selections, subCategoryMap]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header
        ref={headerRef}
        className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 min-h-[72px] sm:min-h-[64px] flex items-center gap-2 sm:gap-4">
          {/* Logo — left, links back to landing */}
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 sm:gap-3 w-16 sm:w-auto shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
          >
            {logoUrl && <img src={logoUrl} alt={orgName} className="h-6 sm:h-5" />}
            <div className="hidden sm:block text-left">
              <h1 className="text-sm font-bold text-[var(--color-navy)]">
                {planName} Plan
              </h1>
              <p className="text-[10px] text-gray-400">
                {community}
              </p>
            </div>
          </button>

          {/* Step nav — center */}
          <div className="flex-1 min-w-0 flex items-center justify-center">
            <StepNav
              steps={allSteps}
              activeStepId={activeStepId}
              completionMap={completionMap}
              onSelectStep={setActiveStepId}
            />
          </div>

          {/* Save + Finish — right */}
          <div className="w-auto shrink-0 flex items-center gap-1 justify-end">
            {sessionId && (
              <button
                onClick={() => setShowSaveModal(true)}
                className="inline-flex items-center gap-1.5 px-2 py-1 text-sm text-gray-500 hover:text-[var(--color-navy)] transition-colors cursor-pointer"
                title={buyerEmail ? "Saved" : "Save My Selections"}
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">{buyerEmail ? "Saved" : "Save"}</span>
              </button>
            )}
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
          {activeStep.id !== "__gallery" && (
            <div className="hidden lg:block">
              <SidebarPanel
                step={activeStep}
                generatedImageUrl={state.generatedImageUrls[activeStep.id] ?? null}
                isGenerating={isGeneratingThisStep}
                error={state.errors[activeStep.id] ?? null}
                onGenerate={handleGenerate}
                hasChanges={effectiveHasChanges}
                total={total}
                onContinue={handleContinue}
                onClearSelections={handleClearSelections}
                isLastStep={isLastStep}
                nextStepName={nextStepName}
                headerHeight={headerHeight}
                lockedSubCategoryIds={lockedSubCategoryIds}
                onFinish={() => onFinish({ selections: state.selections, quantities: state.quantities, generatedImageUrls: state.generatedImageUrls })}
                photos={activeStep.photos}
                generatedImageUrls={state.generatedImageUrls}
                generatingPhotoKeys={state.generatingPhotoKeys}
                onGeneratePhoto={handleGeneratePhoto}
                onFeedback={handleFeedback}
                feedbackVotes={state.feedbackVotes}
                generationCredits={state.generationCredits}
                errors={state.errors}
                generatedWithSelections={state.generatedWithSelections}
                getPhotoVisualSelections={getPhotoVisualSelections}
                selections={state.selections}
              />
            </div>
          )}

          {/* Right Column — scrollable options or gallery */}
          <div className="flex-1 min-w-0 pb-20 lg:pb-5">
            {activeStep.id === "__gallery" ? (
              <GalleryView
                steps={steps}
                generatedImageUrls={state.generatedImageUrls}
                generatingPhotoKeys={state.generatingPhotoKeys}
                onGeneratePhoto={handleGeneratePhoto}
                onGenerateAll={handleGenerateAll}
                onFeedback={handleFeedback}
                feedbackVotes={state.feedbackVotes}
                generationCredits={state.generationCredits}
                errors={state.errors}
                generatedWithSelections={state.generatedWithSelections}
                getPhotoVisualSelections={getPhotoVisualSelections}
                selections={state.selections}
              />
            ) : (
              <>
                <StepContent
                  key={activeStepId}
                  step={activeStep}
                  subCategoryMap={subCategoryMap}
                  selections={state.selections}
                  quantities={state.quantities}
                  onSelect={handleSelect}
                  onSetQuantity={handleSetQuantity}
                  lockedSubCategoryIds={lockedSubCategoryIds}
                />

                {/* Mobile-only: Continue button */}
                {!isLastStep && (
                  <button
                    onClick={handleContinue}
                    className="lg:hidden w-full mt-10 py-3.5 px-6 bg-[var(--color-navy)] text-white font-semibold text-sm hover:bg-[var(--color-navy-hover)] transition-colors duration-150 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
                  >
                    Next Step &rarr;
                  </button>
                )}
              </>
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
          hasChanges={effectiveHasChanges}
          stepName={activeStep.name}
          showGenerateButton={!!activeStep.showGenerateButton}
          error={state.errors[activeStep.id] ?? null}
          hasGeneratedPreview={!!activeGeneratedImageUrl}
          previewImageUrl={activePreviewImageUrl}
          previewTitle={activeStep.name}
          previewSummary={activeSelectionSummary}
        />
      </div>

      {/* Save selections modal */}
      {showSaveModal && sessionId && (
        <SaveSelectionsModal
          sessionId={sessionId}
          orgId={orgId}
          floorplanId={floorplanId}
          onClose={() => setShowSaveModal(false)}
          onSaved={(email, resumeToken) => {
            onSessionSaved(email, resumeToken);
          }}
          onResumed={(session) => {
            onSessionResumed(session);
            dispatch({
              type: "LOAD_SELECTIONS",
              selections: session.selections,
              quantities: session.quantities,
            });
            setShowSaveModal(false);
          }}
        />
      )}

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
