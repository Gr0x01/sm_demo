import { describe, it, expect } from "vitest";
import { selectScopedEditModel, selectFullGenModel } from "./flux-pipeline";
import { requiresMaxRouting, MAX_ROUTING_PATTERNS } from "./step-config";
import { estimateBflCost } from "./posthog-server";
import { SCOPED_EDIT_MODEL, IMAGE_MODEL } from "./models";
import { buildOptionLookup } from "./__fixtures__/generation";
import type { Option, SubCategory } from "@/types/admin";

describe("requiresMaxRouting (step-config)", () => {
  // 2026-04-16: MAX_ROUTING_PATTERNS is empty after Demo Nest kitchen
  // migrated from combo SKUs to T-bar pull SKUs. The new swatch shape
  // matches source pull geometry, so Flex handles finish swaps cleanly
  // without Max's shape-fidelity routing.
  it("returns false for every subcategory slug while MAX_ROUTING_PATTERNS is empty", () => {
    expect(requiresMaxRouting("kitchen-cabinet-hardware")).toBe(false);
    expect(requiresMaxRouting("bath-hardware")).toBe(false);
    expect(requiresMaxRouting("kitchen-cabinet-color")).toBe(false);
    expect(requiresMaxRouting("kitchen-faucet")).toBe(false);
    expect(requiresMaxRouting("kitchen-sink")).toBe(false);
    expect(requiresMaxRouting("range")).toBe(false);
    expect(requiresMaxRouting("backsplash")).toBe(false);
  });

  it("MAX_ROUTING_PATTERNS is empty (guards against accidental re-introduction)", () => {
    expect(MAX_ROUTING_PATTERNS).toEqual([]);
  });
});

describe("estimateBflCost — array overload for hybrid runs", () => {
  it("sums per-pass costs for a hybrid Flex + Max 2-pass run", () => {
    const flexCost = estimateBflCost("flux-2-flex", 1);
    const maxCost = estimateBflCost("flux-2-max", 1);
    const hybrid = estimateBflCost(["flux-2-flex", "flux-2-max"]);
    expect(hybrid).toBeCloseTo(flexCost + maxCost, 10);
  });

  it("single-model array equals single-model single-pass cost", () => {
    expect(estimateBflCost(["flux-2-flex"])).toBeCloseTo(estimateBflCost("flux-2-flex", 1), 10);
  });

  it("scoped edit single-model path still works (back-compat)", () => {
    expect(estimateBflCost("flux-2-klein-9b")).toBeGreaterThan(0);
  });

  it("empty array returns 0", () => {
    expect(estimateBflCost([])).toBe(0);
  });
});

describe("selectScopedEditModel", () => {
  // The fixture's `bs-picket-taupe` has `scopedEditModel: "flux-2-klein-9b"` —
  // this is the per-option override case the test guards against accidental
  // removal (PR #1 over-removed it once already; PR #4 restored it).
  const optionLookup = buildOptionLookup();

  it("uses opts.model when explicitly set, ignoring the per-option override", () => {
    const model = selectScopedEditModel(
      "flux-2-max",
      optionLookup,
      "backsplash",
      "bs-picket-taupe",
    );
    expect(model).toBe("flux-2-max");
  });

  it("uses the per-option scopedEditModel when opts.model is unset", () => {
    const model = selectScopedEditModel(
      undefined,
      optionLookup,
      "backsplash",
      "bs-picket-taupe",
    );
    expect(model).toBe("flux-2-klein-9b");
  });

  it("falls back to SCOPED_EDIT_MODEL (Flex) when neither opts.model nor per-option override is set", () => {
    // bs-subway-white in the fixture has no scopedEditModel set
    const model = selectScopedEditModel(
      undefined,
      optionLookup,
      "backsplash",
      "bs-subway-white",
    );
    expect(model).toBe(SCOPED_EDIT_MODEL);
    expect(model).toBe("flux-2-flex");
  });

  it("falls back to SCOPED_EDIT_MODEL when the option is missing from optionLookup (stale selection)", () => {
    const model = selectScopedEditModel(
      undefined,
      optionLookup,
      "backsplash",
      "nonexistent-option-id",
    );
    expect(model).toBe(SCOPED_EDIT_MODEL);
  });
});

describe("selectFullGenModel — hardware routing", () => {
  // Build a minimal lookup with one hardware option (has swatch) and one
  // hardware option WITHOUT a swatch (builder-standard default scenario).
  // Plus a non-hardware option so we can construct realistic mixed selections.
  function buildLookup(): Map<string, { option: Option; subCategory: SubCategory }> {
    const lookup = new Map<string, { option: Option; subCategory: SubCategory }>();
    const hwSub = { id: "kitchen-cabinet-hardware", name: "Kitchen Cabinet Hardware", categoryId: "hardware", isVisual: true, options: [] } as unknown as SubCategory;
    const hwOpt = { id: "hw-bronze", name: "Bronze", price: 0, swatchUrl: "https://storage/hw-bronze.jpg", swatchColor: "#804A2E" } as Option;
    const hwNoneOpt = { id: "hw-none", name: "Builder Standard", price: 0 } as Option;
    lookup.set("kitchen-cabinet-hardware:hw-bronze", { option: hwOpt, subCategory: hwSub });
    lookup.set("kitchen-cabinet-hardware:hw-none", { option: hwNoneOpt, subCategory: hwSub });

    const cabSub = { id: "cabinets", name: "Cabinets", categoryId: "cabinets", isVisual: true, options: [] } as unknown as SubCategory;
    const cabOpt = { id: "cab-white", name: "White", price: 0, swatchUrl: "https://storage/cab-white.jpg" } as Option;
    lookup.set("cabinets:cab-white", { option: cabOpt, subCategory: cabSub });
    return lookup;
  }

  // 2026-04-16: hardware no longer triggers Max routing (MAX_ROUTING_PATTERNS = []).
  // These two tests previously asserted the routing UPGRADE; they now assert
  // that hardware-containing selections fall through to the default model on
  // both single-pass and 2-pass paths. Re-add upgrade coverage if a new
  // routing pattern is introduced.
  it("does NOT route to Max when hardware (with swatch) is selected — routing list is empty", () => {
    const result = selectFullGenModel({
      selections: { "kitchen-cabinet-hardware": "hw-bronze", cabinets: "cab-white" },
      optionLookup: buildLookup(),
      explicitModel: undefined,
    });
    expect(result.singlePassModel).toBe(IMAGE_MODEL);
    expect(result.routedForHardware).toBe(false);
  });

  it("does NOT split routing on 2-pass either when hardware is selected — both passes default model", () => {
    const result = selectFullGenModel({
      selections: { "kitchen-cabinet-hardware": "hw-bronze", cabinets: "cab-white" },
      optionLookup: buildLookup(),
      explicitModel: undefined,
    });
    expect(result.pass1Model).toBe(IMAGE_MODEL);
    expect(result.pass2Model).toBe(IMAGE_MODEL);
    expect(result.routedForHardware).toBe(false);
  });

  it("does NOT route to Max when no hardware is selected", () => {
    const result = selectFullGenModel({
      selections: { cabinets: "cab-white" },
      optionLookup: buildLookup(),
      explicitModel: undefined,
    });
    expect(result.singlePassModel).toBe(IMAGE_MODEL);
    expect(result.pass1Model).toBe(IMAGE_MODEL);
    expect(result.pass2Model).toBe(IMAGE_MODEL);
    expect(result.routedForHardware).toBe(false);
  });

  it("does NOT route to Max when hardware is selected but option has no swatchUrl (builder-standard default)", () => {
    const result = selectFullGenModel({
      selections: { "kitchen-cabinet-hardware": "hw-none", cabinets: "cab-white" },
      optionLookup: buildLookup(),
      explicitModel: undefined,
    });
    expect(result.singlePassModel).toBe(IMAGE_MODEL);
    expect(result.routedForHardware).toBe(false);
  });

  it("explicit opts.model override wins over hardware routing (lab escape hatch)", () => {
    const result = selectFullGenModel({
      selections: { "kitchen-cabinet-hardware": "hw-bronze" },
      optionLookup: buildLookup(),
      explicitModel: "flux-2-flex",
    });
    expect(result.singlePassModel).toBe("flux-2-flex");
    expect(result.pass1Model).toBe("flux-2-flex");
    expect(result.pass2Model).toBe("flux-2-flex");
    expect(result.routedForHardware).toBe(false);
  });
});
