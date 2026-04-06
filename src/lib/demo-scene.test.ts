import { describe, it, expect } from "vitest";
import {
  isDemoSubCategoryVisible,
  filterDemoSelectionsByVisibility,
  getHiddenDemoSubCategoryIds,
} from "./demo-scene";
import type { DemoSceneAnalysis } from "./demo-scene";

describe("isDemoSubCategoryVisible", () => {
  it("returns true for unknown subcategory IDs (not mapped to a surface)", () => {
    expect(isDemoSubCategoryVisible("flooring", undefined)).toBe(true);
    expect(isDemoSubCategoryVisible("flooring", { visibleSurfaces: { backsplash: false, countertop: false, cabinets: false, island: false } })).toBe(true);
  });

  it("returns true when sceneAnalysis is undefined", () => {
    expect(isDemoSubCategoryVisible("backsplash", undefined)).toBe(true);
    expect(isDemoSubCategoryVisible("counter-top", undefined)).toBe(true);
  });

  it("returns true when visibleSurfaces is undefined", () => {
    const scene: DemoSceneAnalysis = { sceneDescription: "a kitchen" };
    expect(isDemoSubCategoryVisible("backsplash", scene)).toBe(true);
  });

  it("returns true when surface flag is true", () => {
    const scene: DemoSceneAnalysis = { visibleSurfaces: { backsplash: true, countertop: true, cabinets: true, island: true } };
    expect(isDemoSubCategoryVisible("backsplash", scene)).toBe(true);
    expect(isDemoSubCategoryVisible("counter-top", scene)).toBe(true);
    expect(isDemoSubCategoryVisible("kitchen-cabinet-color", scene)).toBe(true);
    expect(isDemoSubCategoryVisible("kitchen-island-cabinet-color", scene)).toBe(true);
  });

  it("returns false when surface flag is false", () => {
    const scene: DemoSceneAnalysis = { visibleSurfaces: { backsplash: false, countertop: false, cabinets: false, island: false } };
    expect(isDemoSubCategoryVisible("backsplash", scene)).toBe(false);
    expect(isDemoSubCategoryVisible("counter-top", scene)).toBe(false);
    expect(isDemoSubCategoryVisible("kitchen-cabinet-color", scene)).toBe(false);
    expect(isDemoSubCategoryVisible("kitchen-island-cabinet-color", scene)).toBe(false);
  });

  it("defaults to visible when surface flag is undefined (partial visibleSurfaces)", () => {
    const scene: DemoSceneAnalysis = { visibleSurfaces: { backsplash: true } };
    // countertop not specified → should default to visible
    expect(isDemoSubCategoryVisible("counter-top", scene)).toBe(true);
  });
});

describe("filterDemoSelectionsByVisibility", () => {
  const selections = {
    backsplash: "bs-white-gloss-subway",
    "counter-top": "ct-dark-granite",
    "kitchen-cabinet-color": "kitchen-cab-color-timber",
    "kitchen-island-cabinet-color": "island-cab-color-pearl",
  };

  it("returns all selections when no sceneAnalysis", () => {
    const result = filterDemoSelectionsByVisibility(selections);
    expect(Object.keys(result)).toHaveLength(4);
  });

  it("returns all selections when visibleSurfaces is undefined", () => {
    const result = filterDemoSelectionsByVisibility(selections, { sceneDescription: "kitchen" });
    expect(Object.keys(result)).toHaveLength(4);
  });

  it("filters out invisible surfaces", () => {
    const scene: DemoSceneAnalysis = {
      visibleSurfaces: { backsplash: false, countertop: true, cabinets: true, island: false },
    };
    const result = filterDemoSelectionsByVisibility(selections, scene);
    expect(result).toEqual({
      "counter-top": "ct-dark-granite",
      "kitchen-cabinet-color": "kitchen-cab-color-timber",
    });
  });

  it("does not mutate the input", () => {
    const original = { ...selections };
    filterDemoSelectionsByVisibility(selections, { visibleSurfaces: { backsplash: false } });
    expect(selections).toEqual(original);
  });
});

describe("getHiddenDemoSubCategoryIds", () => {
  it("returns empty array when no sceneAnalysis", () => {
    expect(getHiddenDemoSubCategoryIds()).toEqual([]);
  });

  it("returns hidden subcategory IDs", () => {
    const scene: DemoSceneAnalysis = {
      visibleSurfaces: { backsplash: false, countertop: true, cabinets: true, island: false },
    };
    const hidden = getHiddenDemoSubCategoryIds(scene);
    expect(hidden).toContain("backsplash");
    expect(hidden).toContain("kitchen-island-cabinet-color");
    expect(hidden).not.toContain("counter-top");
    expect(hidden).not.toContain("kitchen-cabinet-color");
  });
});
