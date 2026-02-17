"use client";

import { useReducer, useCallback, useMemo, useState } from "react";
import type { SelectionState, SelectionAction, SubCategory } from "@/types";
import { categories, getDefaultSelections, getVisualSubCategoryIds } from "@/lib/options-data";
import { calculateTotal } from "@/lib/pricing";
import { rooms, getOrphanSubCategoryIds } from "@/lib/room-config";
import { RoomStrip } from "./RoomStrip";
import { RoomHero } from "./RoomHero";
import { RoomSection } from "./RoomSection";
import { PriceTracker } from "./PriceTracker";
import { GenerateButton } from "./GenerateButton";
import { CategoryAccordion } from "./CategoryAccordion";

const visualSubCategoryIds = getVisualSubCategoryIds();

// Build a lookup: subCategoryId → SubCategory object
const subCategoryMap = new Map<string, SubCategory>();
for (const cat of categories) {
  for (const sub of cat.subCategories) {
    subCategoryMap.set(sub.id, sub);
  }
}

// Get all subCategory IDs for orphan detection
const allSubCategoryIds = Array.from(subCategoryMap.keys());
const orphanIds = getOrphanSubCategoryIds(allSubCategoryIds);

// Group orphan subcategories by their parent category
const orphanCategories = categories
  .map((cat) => ({
    ...cat,
    subCategories: cat.subCategories.filter((sub) => orphanIds.includes(sub.id)),
  }))
  .filter((cat) => cat.subCategories.length > 0);

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
    generatedImageUrl: null,
    isGenerating: false,
    hasEverGenerated: false,
    visualSelectionsChangedSinceLastGenerate: true,
    error: null,
  };
}

function getCategoryTotal(
  subCategories: SubCategory[],
  selections: Record<string, string>
): number {
  let total = 0;
  for (const sub of subCategories) {
    const selectedId = selections[sub.id];
    if (selectedId) {
      const option = sub.options.find((o) => o.id === selectedId);
      if (option) total += option.price;
    }
  }
  return total;
}

export function UpgradePicker({ onFinish }: { onFinish: () => void }) {
  const [state, dispatch] = useReducer(reducer, null, getInitialState);
  const [activeRoomId, setActiveRoomId] = useState(rooms[0].id);
  const [showOtherUpgrades, setShowOtherUpgrades] = useState(false);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0];

  const total = useMemo(
    () => calculateTotal(state.selections),
    [state.selections]
  );

  // Get subcategories for active room
  const roomSubCategories = useMemo(() => {
    return activeRoom.subCategoryIds
      .map((id) => subCategoryMap.get(id))
      .filter((sub): sub is SubCategory => sub !== undefined);
  }, [activeRoomId]);

  const handleSelect = useCallback(
    (subCategoryId: string, optionId: string) => {
      dispatch({ type: "SELECT_OPTION", subCategoryId, optionId });
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
        body: JSON.stringify({ selections: visualSelections }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const data = await res.json();
      dispatch({ type: "GENERATION_COMPLETE", imageUrl: data.imageUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      dispatch({ type: "GENERATION_ERROR", error: message });
    }
  }, [state.selections, state.isGenerating]);

  const orphanTotal = useMemo(() => {
    let t = 0;
    for (const cat of orphanCategories) {
      t += getCategoryTotal(cat.subCategories, state.selections);
    }
    return t;
  }, [state.selections]);

  return (
    <div className="min-h-screen bg-[var(--color-warm-white)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
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
            onClick={onFinish}
            className="text-xs font-medium text-[var(--color-gold)] hover:text-[var(--color-gold-light)] transition-colors cursor-pointer"
          >
            Finish &rarr;
          </button>
        </div>

        {/* Room strip inside header for sticky behavior */}
        <div className="max-w-4xl mx-auto px-4 pb-2">
          <RoomStrip
            rooms={rooms}
            activeRoomId={activeRoomId}
            onSelectRoom={setActiveRoomId}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-5 pb-20">
        {/* Room Hero Image */}
        <RoomHero
          room={activeRoom}
          generatedImageUrl={activeRoom.id === "kitchen-close" ? state.generatedImageUrl : null}
          isGenerating={activeRoom.id === "kitchen-close" ? state.isGenerating : false}
        />

        {/* Generate button — only on kitchen view */}
        {activeRoom.id === "kitchen-close" && (
          <div className="mt-4">
            <GenerateButton
              onClick={handleGenerate}
              isGenerating={state.isGenerating}
              hasChanges={state.visualSelectionsChangedSinceLastGenerate}
            />
            {state.error && (
              <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            )}
          </div>
        )}

        {/* Room-specific upgrade options */}
        <RoomSection
          subCategories={roomSubCategories}
          selections={state.selections}
          onSelect={handleSelect}
        />

        {/* Other Upgrades (orphan categories) */}
        {orphanCategories.length > 0 && (
          <div className="mt-10">
            <button
              onClick={() => setShowOtherUpgrades(!showOtherUpgrades)}
              className="w-full flex items-center justify-between py-3 px-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[var(--color-navy)]">
                  Other Upgrades
                </span>
                <span className="text-[10px] text-gray-400">
                  Electrical, security, doors & more
                </span>
              </div>
              <div className="flex items-center gap-3">
                {orphanTotal > 0 && (
                  <span className="text-xs font-medium text-[var(--color-gold)]">
                    +${orphanTotal.toLocaleString()}
                  </span>
                )}
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${showOtherUpgrades ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {showOtherUpgrades && (
              <div className="mt-2 space-y-2">
                {orphanCategories.map((category) => (
                  <CategoryAccordion
                    key={category.id}
                    category={category}
                    selections={state.selections}
                    onSelect={handleSelect}
                    categoryTotal={getCategoryTotal(category.subCategories, state.selections)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Price Tracker */}
      <PriceTracker total={total} />
    </div>
  );
}
