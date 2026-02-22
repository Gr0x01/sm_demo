"use client";

import { useReducer, useCallback, useMemo, useState, useEffect, useRef } from "react";
import type { SelectionState, SelectionAction, SubCategory, Category } from "@/types";
import { calculateTotal } from "@/lib/pricing";
import type { StepConfig, StepPhoto } from "@/lib/step-config";
import { useTrack } from "@/hooks/useTrack";
import { StepNav } from "./StepNav";
import { StepContent } from "./StepContent";
import { PriceTracker } from "./PriceTracker";
import { SidebarPanel } from "./SidebarPanel";
import { SyncModal } from "./SyncModal";
import { SaveSelectionsModal } from "./SaveSelectionsModal";
import { GalleryView } from "./GalleryView";
import { StepPhotoGrid } from "./StepPhotoGrid";
import type { ContractPhase } from "@/lib/contract-phase";
import { resolveScopedFlooringSelections, shouldForceSendFlooringSubcategory } from "@/lib/flooring-selection";
import { getEffectivePhotoScopedIds } from "@/lib/photo-scope";


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
      const defaultOption = sub.options.find((o) => o.isDefault) ?? sub.options.find((o) => o.price === 0);
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
  const track = useTrack({ orgSlug, floorplanSlug, sessionId });

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

  /** Filter allSelections to only visual, non-skip, changed-from-baseline entries within allowedIds. */
  const filterVisualSelections = useCallback(
    (allowedIds: Set<string>, allSelections: Record<string, string>, baseline: Record<string, string>): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const [subId, optId] of Object.entries(allSelections)) {
        const sub = subCategoryMap.get(subId);
        const hint = sub?.generationHint;
        const forceInclude = shouldForceSendFlooringSubcategory(subId);
        const baselineId = baseline[subId] ?? defaultSelections[subId];
        if (
          visualSubCategoryIds.has(subId) &&
          allowedIds.has(subId) &&
          (forceInclude || hint !== 'skip') &&
          (forceInclude || hint === 'always_send' || optId !== baselineId)
        ) {
          result[subId] = optId;
        }
      }
      return result;
    },
    [visualSubCategoryIds, defaultSelections, subCategoryMap]
  );

  /** Step-level visual selections (all step sections + alsoIncludeIds). */
  const getStepVisualSelections = useCallback(
    (step: StepConfig, allSelections: Record<string, string>): Record<string, string> => {
      const allowedIds = new Set([
        ...step.sections.flatMap((sec) => sec.subCategoryIds),
        ...(step.alsoIncludeIds ?? []),
      ]);
      return filterVisualSelections(allowedIds, allSelections, step.photoBaseline ?? {});
    },
    [filterVisualSelections]
  );

  /** Per-photo scoped selections: when present, photo.subcategoryIds is the complete scope. */
  const getPhotoVisualSelections = useCallback(
    (step: StepConfig, photo: StepPhoto | null, allSelections: Record<string, string>): Record<string, string> => {
      const flooringContextText = [
        photo?.photoBaseline ?? "",
        photo?.spatialHint ?? "",
        step.name ?? "",
      ].join("\n");
      const effectivePhotoScope = getEffectivePhotoScopedIds(photo?.subcategoryIds, {
        stepSlug: step.id,
        imagePath: photo?.imagePath ?? null,
      });
      if (effectivePhotoScope) {
        return resolveScopedFlooringSelections(
          filterVisualSelections(effectivePhotoScope, allSelections, step.photoBaseline ?? {}),
          flooringContextText,
        );
      }
      return resolveScopedFlooringSelections(
        getStepVisualSelections(step, allSelections),
        flooringContextText,
      );
    },
    [filterVisualSelections, getStepVisualSelections]
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
      case "CLEAR_SELECTIONS":
        return {
          ...state,
          selections: defaultSelections,
          quantities: {},
          generatedWithSelections: {},
        };
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
    generatingPhotoKeys: new Set<string>(),
    hasEverGenerated: false,
    generatedWithSelections: {},
    generatedImageIds: {},
    generationCredits: null,
    errors: {},
  }));

  const allStepsRef = useRef(steps);

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
    const idx = allStepsRef.current.findIndex((s) => s.id === stepId);
    const step = allStepsRef.current[idx];
    if (step) track("step_viewed", { stepName: step.name, stepIndex: idx });
  }, [track]);

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
      if (s && allStepsRef.current.some((step) => step.id === s)) {
        setActiveStepIdRaw(s);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);
  const headerRef = useRef<HTMLElement>(null);
  const pollAbortControllersRef = useRef(new Set<AbortController>());
  const cacheHydrateRunRef = useRef(0);
  const cacheHydrateInFlightRef = useRef(new Set<string>());

  // Abort all in-flight polling on unmount
  useEffect(() => () => {
    for (const c of pollAbortControllersRef.current) c.abort();
  }, []);
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

          // Multi-tenant: check cache per photo (using per-photo scoped selections)
          if (step.photos?.length && orgSlug && floorplanSlug) {
            for (const photo of step.photos) {
              try {
                const photoSelections = getPhotoVisualSelections(step, photo, mergedSelections);
                const checkRes = await fetch("/api/generate/photo/check", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    orgSlug,
                    floorplanSlug,
                    stepPhotoId: photo.id,
                    selections: photoSelections,
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
                      selectionsSnapshot: stableStringify(photoSelections),
                      generatedImageId: generatedImageId ?? null,
                    });
                  }
                }
              } catch {
                // Non-critical
              }
            }
            continue;
          }
        }
      }
      hasLoadedRef.current = true;
    }

    loadAndCheckCache();
  }, [initialSelections, initialQuantities, steps, defaultSelections, getStepVisualSelections, getPhotoVisualSelections, orgSlug, floorplanSlug]);

  // On selection changes, auto-switch to any already-cached image for the new fingerprint
  // so users don't sit on an "OUTDATED" badge when a matching cached render exists.
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (!orgSlug || !floorplanSlug) return;

    const runId = ++cacheHydrateRunRef.current;
    const timer = setTimeout(() => {
      const modelParam = new URLSearchParams(window.location.search).get("model");

      void (async () => {
        for (const step of steps) {
          if (!step.showGenerateButton || !step.photos?.length) continue;

          for (const photo of step.photos) {
            if (cacheHydrateRunRef.current !== runId) return;
            if (state.generatingPhotoKeys.has(photo.id)) continue;

            const previousSnapshot = state.generatedWithSelections[photo.id];
            if (!previousSnapshot) continue; // only hydrate stale-existing images

            const photoSelections = getPhotoVisualSelections(step, photo, state.selections);
            const nextSnapshot = stableStringify(photoSelections);
            if (previousSnapshot === nextSnapshot) continue;

            const inFlightKey = `${photo.id}:${nextSnapshot}`;
            if (cacheHydrateInFlightRef.current.has(inFlightKey)) continue;
            cacheHydrateInFlightRef.current.add(inFlightKey);

            try {
              const checkRes = await fetch("/api/generate/photo/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orgSlug,
                  floorplanSlug,
                  stepPhotoId: photo.id,
                  selections: photoSelections,
                  ...(modelParam ? { model: modelParam } : {}),
                }),
              });
              if (!checkRes.ok) continue;

              const { status, imageUrl, generatedImageId } = await checkRes.json() as {
                status?: string;
                imageUrl?: string | null;
                generatedImageId?: string | null;
              };

              if (cacheHydrateRunRef.current !== runId) return;
              if (status === "complete" && imageUrl) {
                dispatch({
                  type: "PHOTO_GENERATION_COMPLETE",
                  photoKey: photo.id,
                  imageUrl,
                  selectionsSnapshot: nextSnapshot,
                  generatedImageId: generatedImageId ?? null,
                });
              }
            } catch {
              // Non-critical
            } finally {
              cacheHydrateInFlightRef.current.delete(inFlightKey);
            }
          }
        }
      })();
    }, 250);

    return () => clearTimeout(timer);
  }, [
    steps,
    state.selections,
    state.generatedWithSelections,
    state.generatingPhotoKeys,
    getPhotoVisualSelections,
    orgSlug,
    floorplanSlug,
  ]);

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
    name: "Your Home",
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
  allStepsRef.current = allSteps;

  const activeStep = allSteps.find((s) => s.id === activeStepId) || allSteps[0];
  const activeStepIndex = allSteps.findIndex((s) => s.id === activeStepId);
  const safeActiveStepIndex = activeStepIndex >= 0 ? activeStepIndex : 0;

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
      track("option_selected", { subCategoryId, optionId });

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
    [state.selections, syncPairs, subCategoryMap, track]
  );

  const handleSetQuantity = useCallback(
    (subCategoryId: string, quantity: number, addOptionId: string, noUpgradeOptionId: string) => {
      dispatch({ type: "SET_QUANTITY", subCategoryId, quantity, addOptionId, noUpgradeOptionId });
    },
    []
  );

  const handleGeneratePhoto = useCallback(async (photoKey: string, stepPhotoId: string, step: StepConfig, opts?: { retry?: boolean }) => {
    if (state.generatingPhotoKeys.has(photoKey)) return;
    dispatch({ type: "START_GENERATING_PHOTO", photoKey });
    track("generation_started", { stepName: step.name, photoKey });

    const photo = step.photos?.find(p => p.id === stepPhotoId) ?? null;
    const visualSelections = getPhotoVisualSelections(step, photo, state.selections);
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
          ...(opts?.retry ? { retry: true } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "cap_reached") {
          dispatch({ type: "SET_CREDITS", used: data.creditsUsed, total: data.creditsTotal });
          dispatch({ type: "PHOTO_GENERATION_ERROR", photoKey, error: "No visualizations remaining" });
          return;
        }
        // If generation is already in progress (e.g. triggered from another step),
        // poll the check endpoint until the result is ready instead of erroring out
        if (res.status === 429 && data.selectionsHash) {
          const abort = new AbortController();
          pollAbortControllersRef.current.add(abort);
          const pollInterval = 3000;
          const maxPolls = 50; // ~2.5 min, above maxDuration of 120s
          let consecutiveFailures = 0;
          let exitReason: "complete" | "not_found" | "timeout" | "aborted" = "timeout";
          try {
            for (let poll = 0; poll < maxPolls; poll++) {
              await new Promise(r => setTimeout(r, pollInterval));
              if (abort.signal.aborted) { exitReason = "aborted"; break; }
              try {
                const checkRes = await fetch("/api/generate/photo/check", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ selectionsHash: data.selectionsHash }),
                  signal: abort.signal,
                });
                const checkData = await checkRes.json();
                if (checkData.status === "complete" && checkData.imageUrl) {
                  consecutiveFailures = 0;
                  exitReason = "complete";
                  dispatch({
                    type: "PHOTO_GENERATION_COMPLETE",
                    photoKey,
                    imageUrl: checkData.imageUrl,
                    selectionsSnapshot,
                    generatedImageId: checkData.generatedImageId,
                  });
                  track("generation_completed", { stepName: step.name, cacheHit: true, joinedInProgress: true });
                  return;
                }
                if (checkData.status === "not_found") {
                  consecutiveFailures = 0;
                  exitReason = "not_found";
                  break;
                }
                if (checkData.status === "pending") {
                  consecutiveFailures = 0;
                  // keep polling
                } else {
                  // status === "error" — transient backend issue, keep polling but track
                  consecutiveFailures++;
                  if (consecutiveFailures >= 5) {
                    throw new Error("Network error while waiting for visualization");
                  }
                }
              } catch (pollErr) {
                if (abort.signal.aborted) { exitReason = "aborted"; break; }
                consecutiveFailures++;
                if (consecutiveFailures >= 5) {
                  throw new Error("Network error while waiting for visualization");
                }
              }
            }
          } finally {
            pollAbortControllersRef.current.delete(abort);
          }
          if (exitReason === "aborted") {
            dispatch({ type: "PHOTO_GENERATION_ERROR", photoKey, error: "" });
            return;
          }
          if (exitReason === "not_found") {
            throw new Error("Visualization failed \u2014 tap to retry");
          }
          // timeout — generation may still be running server-side
          throw new Error("Still processing \u2014 try refreshing");
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

      track("generation_completed", { stepName: step.name, cacheHit: !!data.cacheHit, creditsUsed: data.creditsUsed });

      if (data.creditsUsed !== undefined) {
        dispatch({ type: "SET_CREDITS", used: data.creditsUsed, total: data.creditsTotal });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      dispatch({ type: "PHOTO_GENERATION_ERROR", photoKey, error: message });
      track("generation_failed", { stepName: step.name, error: message });
    }
  }, [state.selections, state.generatingPhotoKeys, orgSlug, floorplanSlug, sessionId, getPhotoVisualSelections, track]);

  const handleGenerateAll = useCallback(async () => {
    // Collect all photos across all steps that need generation
    const pending: { photoKey: string; stepPhotoId: string; step: StepConfig }[] = [];
    for (const step of steps) {
      if (!step.photos?.length) continue;
      for (const photo of step.photos) {
        const fingerprint = stableStringify(getPhotoVisualSelections(step, photo, state.selections));
        const existing = state.generatedWithSelections[photo.id];
        if (existing !== fingerprint && !state.generatingPhotoKeys.has(photo.id)) {
          pending.push({ photoKey: photo.id, stepPhotoId: photo.id, step });
        }
      }
    }

    // Fire with max 20 concurrent
    const concurrency = 20;
    let i = 0;
    async function runNext(): Promise<void> {
      while (i < pending.length) {
        const item = pending[i++];
        await handleGeneratePhoto(item.photoKey, item.stepPhotoId, item.step);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, () => runNext()));
  }, [steps, state.selections, state.generatedWithSelections, state.generatingPhotoKeys, getPhotoVisualSelections, handleGeneratePhoto]);

  const handleRetry = useCallback(async (photoKey: string, stepPhotoId: string, step: StepConfig) => {
    // Refund credit for the old image, then regenerate
    const generatedImageId = state.generatedImageIds[photoKey];
    if (generatedImageId && sessionId) {
      dispatch({ type: "REMOVE_GENERATED_IMAGE", photoKey });
      try {
        await fetch("/api/generate/photo/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generatedImageId, vote: -1, sessionId, orgSlug }),
        });
      } catch {
        // Best-effort refund
      }
    }
    await handleGeneratePhoto(photoKey, stepPhotoId, step, { retry: true });
  }, [state.generatedImageIds, sessionId, orgSlug, handleGeneratePhoto]);

  const handleClearSelections = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTIONS" });
  }, []);

  const handleContinue = useCallback(() => {
    if (activeStepIndex < allSteps.length - 1) {
      setActiveStepId(allSteps[activeStepIndex + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeStepIndex, allSteps, setActiveStepId]);

  const handleBack = useCallback(() => {
    if (activeStepIndex > 0) {
      setActiveStepId(allSteps[activeStepIndex - 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeStepIndex, allSteps, setActiveStepId]);

  const handleFinish = useCallback(() => {
    onFinish({
      selections: state.selections,
      quantities: state.quantities,
      generatedImageUrls: state.generatedImageUrls,
    });
  }, [onFinish, state.selections, state.quantities, state.generatedImageUrls]);

  const isLastStep = activeStepIndex >= allSteps.length - 1;

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
          <div className="w-12 sm:w-32 lg:w-auto shrink-0 flex items-center">
            <button
              onClick={onNavigateHome}
              className="cursor-pointer hover:opacity-70 transition-opacity"
            >
              {logoUrl && <img src={logoUrl} alt={orgName} className="h-6 sm:h-5" />}
            </button>
          </div>

          {/* Step nav — center */}
          <div className="flex-1 min-w-0 flex items-center justify-center">
            <StepNav
              steps={allSteps}
              activeStepId={activeStepId}
              completionMap={completionMap}
              onSelectStep={setActiveStepId}
            />
          </div>

          {/* Right spacer on mobile + actions on desktop/tablet */}
          <div className="w-12 sm:w-32 lg:w-auto shrink-0 flex items-center justify-end">
            {sessionId && (
              <button
                onClick={() => setShowSaveModal(true)}
                className="sm:hidden px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] transition-colors cursor-pointer"
              >
                Save
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2">
              {sessionId && (
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="px-2.5 md:px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-600 hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] transition-colors cursor-pointer"
                >
                  Save
                </button>
              )}
              <button
                onClick={handleFinish}
                className="px-2.5 md:px-3 py-1.5 text-sm font-semibold bg-[var(--color-navy)] text-white hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
              >
                Finish
              </button>
            </div>
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
                total={total}
                onContinue={handleContinue}
                onClearSelections={handleClearSelections}
                isLastStep={isLastStep}
                headerHeight={headerHeight}
                onFinish={handleFinish}
                photos={activeStep.photos}
                generatedImageUrls={state.generatedImageUrls}
                generatingPhotoKeys={state.generatingPhotoKeys}
                onGeneratePhoto={handleGeneratePhoto}
                onRetry={handleRetry}
                generationCredits={state.generationCredits}
                errors={state.errors}
                generatedWithSelections={state.generatedWithSelections}
                getPhotoVisualSelections={getPhotoVisualSelections}
                selections={state.selections}
              />
            </div>
          )}

          {/* Right Column — scrollable options or gallery */}
          <div className="flex-1 min-w-0 pb-36 lg:pb-5">
            {activeStep.id === "__gallery" ? (
              <GalleryView
                steps={steps}
                generatedImageUrls={state.generatedImageUrls}
                generatingPhotoKeys={state.generatingPhotoKeys}
                onGeneratePhoto={handleGeneratePhoto}
                onRetry={handleRetry}
                onGenerateAll={handleGenerateAll}
                generationCredits={state.generationCredits}
                errors={state.errors}
                generatedWithSelections={state.generatedWithSelections}
                getPhotoVisualSelections={getPhotoVisualSelections}
                selections={state.selections}
              />
            ) : (
              <>
                {/* Mobile-only: photo grid for steps with photos */}
                {activeStep.photos?.length && (
                  <div className="lg:hidden mb-5">
                    <StepPhotoGrid
                      step={activeStep}
                      generatedImageUrls={state.generatedImageUrls}
                      generatingPhotoKeys={state.generatingPhotoKeys}
                      onGeneratePhoto={handleGeneratePhoto}
                      onRetry={handleRetry}
                      errors={state.errors}
                      generatedWithSelections={state.generatedWithSelections}
                      getPhotoVisualSelections={getPhotoVisualSelections}
                      selections={state.selections}
                    />
                    {state.generationCredits && state.generationCredits.used >= state.generationCredits.total * 0.75 && (
                      <div className="text-xs text-gray-500 text-center mt-2">
                        {state.generationCredits.total - state.generationCredits.used}/{state.generationCredits.total} visualizations remaining
                      </div>
                    )}
                  </div>
                )}

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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Price Tracker — mobile only */}
      <div className="lg:hidden">
        <PriceTracker
          total={total}
          stepName={activeStep.name}
          showGenerateButton={!!activeStep.showGenerateButton}
          error={state.errors[activeStep.id] ?? null}
          previewImageUrl={activePreviewImageUrl}
          previewTitle={activeStep.name}
          previewSummary={activeSelectionSummary}
          showNavigation
          onBack={safeActiveStepIndex > 0 ? handleBack : undefined}
          onPrimaryAction={isLastStep ? handleFinish : handleContinue}
          primaryActionLabel={isLastStep ? "Finish" : "Continue"}
          backDisabled={safeActiveStepIndex === 0}
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
