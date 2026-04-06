import { describe, it, expect } from "vitest";
import { hashDemoSelections, DEMO_GENERATION_CACHE_VERSION } from "./demo-generate";
import type { DemoSceneAnalysis } from "./demo-scene";

const baseSelections = {
  backsplash: "bs-white-gloss-subway",
  "counter-top": "ct-dark-granite",
  "kitchen-cabinet-color": "kitchen-cab-color-timber",
};

describe("hashDemoSelections", () => {
  it("returns a deterministic hash for the same inputs", () => {
    const a = hashDemoSelections("photo123", baseSelections);
    const b = hashDemoSelections("photo123", baseSelections);
    expect(a.combinedHash).toBe(b.combinedHash);
  });

  it("returns different hashes for different photo hashes", () => {
    const a = hashDemoSelections("photoA", baseSelections);
    const b = hashDemoSelections("photoB", baseSelections);
    expect(a.combinedHash).not.toBe(b.combinedHash);
  });

  it("returns different hashes for different selections", () => {
    const a = hashDemoSelections("photo123", baseSelections);
    const b = hashDemoSelections("photo123", {
      ...baseSelections,
      "counter-top": "ct-white-quartz",
    });
    expect(a.combinedHash).not.toBe(b.combinedHash);
  });

  it("hash is 16 characters hex", () => {
    const { combinedHash } = hashDemoSelections("photo123", baseSelections);
    expect(combinedHash).toMatch(/^[a-f0-9]{16}$/);
  });

  it("produces the same hash regardless of key insertion order", () => {
    const ordered = {
      backsplash: "bs-white-gloss-subway",
      "counter-top": "ct-dark-granite",
      "kitchen-cabinet-color": "kitchen-cab-color-timber",
    };
    const reversed = {
      "kitchen-cabinet-color": "kitchen-cab-color-timber",
      "counter-top": "ct-dark-granite",
      backsplash: "bs-white-gloss-subway",
    };
    const a = hashDemoSelections("photo123", ordered);
    const b = hashDemoSelections("photo123", reversed);
    expect(a.combinedHash).toBe(b.combinedHash);
  });

  it("filters out invisible surfaces based on sceneAnalysis", () => {
    const scene: DemoSceneAnalysis = {
      visibleSurfaces: { backsplash: false, countertop: true, cabinets: true, island: false },
    };
    const { effectiveSelections } = hashDemoSelections("photo123", {
      ...baseSelections,
      "kitchen-island-cabinet-color": "island-color-white",
    }, scene);

    expect(effectiveSelections).not.toHaveProperty("backsplash");
    expect(effectiveSelections).not.toHaveProperty("kitchen-island-cabinet-color");
    expect(effectiveSelections).toHaveProperty("counter-top");
    expect(effectiveSelections).toHaveProperty("kitchen-cabinet-color");
  });

  it("returns empty effectiveSelections when no surfaces visible", () => {
    const scene: DemoSceneAnalysis = {
      visibleSurfaces: { backsplash: false, countertop: false, cabinets: false, island: false },
    };
    const { effectiveSelections } = hashDemoSelections("photo123", baseSelections, scene);
    expect(Object.keys(effectiveSelections)).toHaveLength(0);
  });

  it("keeps all selections when sceneAnalysis has no visibleSurfaces", () => {
    const scene: DemoSceneAnalysis = { sceneDescription: "a kitchen" };
    const { effectiveSelections } = hashDemoSelections("photo123", baseSelections, scene);
    expect(Object.keys(effectiveSelections)).toHaveLength(3);
  });

  it("keeps all selections when sceneAnalysis is undefined", () => {
    const { effectiveSelections } = hashDemoSelections("photo123", baseSelections);
    expect(Object.keys(effectiveSelections)).toHaveLength(3);
  });
});
