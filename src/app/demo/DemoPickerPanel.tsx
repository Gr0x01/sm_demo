"use client";

import { SwatchGrid } from "@/components/SwatchGrid";
import { DEMO_SUBCATEGORIES } from "@/lib/demo-options";
import type { DemoSceneAnalysis } from "@/lib/demo-scene";

const KITCHEN_TYPE_LABELS: Record<string, string> = {
  "single-wall": "Single-wall",
  galley: "Galley",
  "l-shape": "L-shape",
  "u-shape": "U-shape",
  island: "Island",
  peninsula: "Peninsula",
  "open-concept": "Open concept",
  other: "Other",
};

const CAMERA_ANGLE_LABELS: Record<string, string> = {
  "straight-on": "Straight-on",
  angled: "Angled",
  wide: "Wide",
  "close-up": "Close-up",
  other: "Other",
};

const DISABLED_REASON_BY_SUBCATEGORY: Record<string, string> = {
  backsplash: "Backsplash is not visible in this photo.",
  "counter-top": "Countertops are not clearly visible in this photo.",
  "kitchen-cabinet-color": "Cabinet faces are not clearly visible in this photo.",
  "island-cabinet-color": "No island detected in this photo.",
};

interface DemoPickerPanelProps {
  selections: Record<string, string>;
  sceneAnalysis?: DemoSceneAnalysis;
  onSelect: (subCategoryId: string, optionId: string) => void;
}

export function DemoPickerPanel({ selections, sceneAnalysis, onSelect }: DemoPickerPanelProps) {
  const unavailableSubCategoryIds = new Set<string>();
  if (sceneAnalysis?.visibleSurfaces?.backsplash === false) unavailableSubCategoryIds.add("backsplash");
  if (sceneAnalysis?.visibleSurfaces?.countertop === false) unavailableSubCategoryIds.add("counter-top");
  if (sceneAnalysis?.visibleSurfaces?.cabinets === false) unavailableSubCategoryIds.add("kitchen-cabinet-color");
  if (sceneAnalysis?.visibleSurfaces?.island === false || sceneAnalysis?.hasIsland === false) unavailableSubCategoryIds.add("island-cabinet-color");

  const kitchenTypeLabel = sceneAnalysis?.kitchenType
    ? (KITCHEN_TYPE_LABELS[sceneAnalysis.kitchenType] ?? "Other")
    : null;
  const cameraAngleLabel = sceneAnalysis?.cameraAngle
    ? (CAMERA_ANGLE_LABELS[sceneAnalysis.cameraAngle] ?? "Other")
    : null;
  const islandLabel = typeof sceneAnalysis?.hasIsland === "boolean"
    ? (sceneAnalysis.hasIsland ? "Island detected." : "No island detected.")
    : null;

  return (
    <div className="bg-white border border-slate-200 p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400 mb-4">
        Choose your finishes
      </p>
      {(kitchenTypeLabel || cameraAngleLabel || sceneAnalysis?.visibleSurfaces) && (
        <div className="mb-4 px-3 py-2 border border-slate-200 bg-slate-50">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Photo analysis</p>
          <p className="mt-1 text-xs text-slate-700">
            {kitchenTypeLabel ? `Layout: ${kitchenTypeLabel}. ` : ""}
            {cameraAngleLabel ? `View: ${cameraAngleLabel}. ` : ""}
            {islandLabel ?? ""}
          </p>
          {unavailableSubCategoryIds.size > 0 && (
            <p className="mt-1 text-xs text-amber-700">
              Some finish groups are disabled because those surfaces are not visible in this photo.
            </p>
          )}
        </div>
      )}
      {DEMO_SUBCATEGORIES.map((sub) => (
        <SwatchGrid
          key={sub.id}
          subCategory={sub}
          selectedOptionId={selections[sub.id]}
          disabled={unavailableSubCategoryIds.has(sub.id)}
          disabledReason={DISABLED_REASON_BY_SUBCATEGORY[sub.id]}
          disableZoom
          gridClassName="grid grid-cols-3 sm:grid-cols-5 gap-3"
          onSelect={(optionId) => onSelect(sub.id, optionId)}
        />
      ))}
    </div>
  );
}
