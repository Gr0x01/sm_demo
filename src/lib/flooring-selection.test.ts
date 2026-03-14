import { describe, it, expect } from "vitest";
import { shouldForceSendFlooringSubcategory, resolveScopedFlooringSelections } from "./flooring-selection";

describe("shouldForceSendFlooringSubcategory", () => {
  it("returns true for carpet-color", () => {
    expect(shouldForceSendFlooringSubcategory("carpet-color")).toBe(true);
  });

  it("returns true for main-area-flooring-type", () => {
    expect(shouldForceSendFlooringSubcategory("main-area-flooring-type")).toBe(true);
  });

  it("returns true for main-area-flooring-color", () => {
    expect(shouldForceSendFlooringSubcategory("main-area-flooring-color")).toBe(true);
  });

  it("returns false for unrelated subcategory IDs", () => {
    expect(shouldForceSendFlooringSubcategory("cabinets")).toBe(false);
    expect(shouldForceSendFlooringSubcategory("countertops")).toBe(false);
    expect(shouldForceSendFlooringSubcategory("wall-paint")).toBe(false);
  });
});

describe("resolveScopedFlooringSelections", () => {
  const baseSelections = {
    "common-wall-paint": "wall-gray",
    "carpet-color": "carpet-warm-beige",
    "main-area-flooring-type": "floor-type-standard",
    "main-area-flooring-color": "floor-color-oak",
  };

  it("returns selections unchanged for non-bedroom context", () => {
    const result = resolveScopedFlooringSelections(baseSelections, "Modern kitchen with island");
    expect(result).toEqual(baseSelections);
  });

  it("returns unchanged when context is null", () => {
    const result = resolveScopedFlooringSelections(baseSelections, null);
    expect(result).toEqual(baseSelections);
  });

  it("returns unchanged when missing carpet selection", () => {
    const { "carpet-color": _, ...noCarpet } = baseSelections;
    const result = resolveScopedFlooringSelections(noCarpet, "Primary bedroom");
    expect(result).toEqual(noCarpet);
  });

  it("returns unchanged when missing flooring color selection", () => {
    const { "main-area-flooring-color": _, ...noColor } = baseSelections;
    const result = resolveScopedFlooringSelections(noColor, "Primary bedroom");
    expect(result).toEqual(noColor);
  });

  it("drops carpet-color in bedroom when flooring type includes 'primary'", () => {
    const selections = {
      ...baseSelections,
      "main-area-flooring-type": "floor-type-primary",
    };
    const result = resolveScopedFlooringSelections(selections, "Primary bedroom with carpet");
    expect(result["carpet-color"]).toBeUndefined();
    expect(result["main-area-flooring-color"]).toBe("floor-color-oak");
  });

  it("drops carpet-color in bedroom when carpet option is carpet-none", () => {
    const selections = {
      ...baseSelections,
      "carpet-color": "carpet-none",
    };
    const result = resolveScopedFlooringSelections(selections, "Primary bedroom");
    expect(result["carpet-color"]).toBeUndefined();
    expect(result["main-area-flooring-color"]).toBe("floor-color-oak");
  });

  it("drops main-area-flooring-color in bedroom when carpet is active", () => {
    const result = resolveScopedFlooringSelections(baseSelections, "Primary bedroom with carpet");
    expect(result["main-area-flooring-color"]).toBeUndefined();
    expect(result["carpet-color"]).toBe("carpet-warm-beige");
  });

  it("is case-insensitive for 'bedroom' detection", () => {
    const result = resolveScopedFlooringSelections(baseSelections, "Primary BEDROOM");
    // Standard flooring type = carpet active, so flooring-color should be dropped
    expect(result["carpet-color"]).toBe("carpet-warm-beige");
    expect(result["main-area-flooring-color"]).toBeUndefined();
  });

  it("drops carpet-color in bedroom when flooring type includes 'whole'", () => {
    const selections = {
      ...baseSelections,
      "main-area-flooring-type": "floor-type-whole-home",
    };
    const result = resolveScopedFlooringSelections(selections, "Primary bedroom");
    expect(result["carpet-color"]).toBeUndefined();
    expect(result["main-area-flooring-color"]).toBe("floor-color-oak");
  });

  it("does not mutate the original selections object", () => {
    const original = { ...baseSelections };
    resolveScopedFlooringSelections(baseSelections, "Primary bedroom");
    expect(baseSelections).toEqual(original);
  });
});
