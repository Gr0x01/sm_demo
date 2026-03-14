import { describe, it, expect } from "vitest";
import {
  normalizeSelectionRecord,
  buildDefaultOptionBySubcategory,
  reconcileClientAndSessionSelections,
} from "./selection-reconcile";
import type { Option, SubCategory } from "@/types";

describe("normalizeSelectionRecord", () => {
  it("returns empty object for null/undefined", () => {
    expect(normalizeSelectionRecord(null)).toEqual({});
    expect(normalizeSelectionRecord(undefined)).toEqual({});
  });

  it("returns empty object for non-object input", () => {
    expect(normalizeSelectionRecord("string")).toEqual({});
    expect(normalizeSelectionRecord(42)).toEqual({});
  });

  it("strips non-string values", () => {
    const result = normalizeSelectionRecord({ a: "valid", b: 42, c: null, d: true });
    expect(result).toEqual({ a: "valid" });
  });

  it("strips empty/whitespace-only string values", () => {
    const result = normalizeSelectionRecord({ a: "valid", b: "", c: "   " });
    expect(result).toEqual({ a: "valid" });
  });

  it("keeps valid string entries", () => {
    const result = normalizeSelectionRecord({ cabinets: "cab-white", countertops: "ct-granite" });
    expect(result).toEqual({ cabinets: "cab-white", countertops: "ct-granite" });
  });
});

describe("buildDefaultOptionBySubcategory", () => {
  function makeLookup(entries: { subId: string; optId: string; isDefault?: boolean; price: number }[]) {
    const map = new Map<string, { option: Option; subCategory: SubCategory }>();
    for (const e of entries) {
      map.set(`${e.subId}:${e.optId}`, {
        option: { id: e.optId, name: e.optId, price: e.price, isDefault: e.isDefault },
        subCategory: { id: e.subId, name: e.subId, categoryId: "cat", isVisual: true, options: [] },
      });
    }
    return map;
  }

  it("returns empty map for empty lookup", () => {
    const result = buildDefaultOptionBySubcategory(new Map());
    expect(result.size).toBe(0);
  });

  it("picks isDefault option over $0 option", () => {
    const lookup = makeLookup([
      { subId: "cabinets", optId: "cab-free", price: 0 },
      { subId: "cabinets", optId: "cab-default", price: 500, isDefault: true },
    ]);
    const result = buildDefaultOptionBySubcategory(lookup);
    expect(result.get("cabinets")).toBe("cab-default");
  });

  it("falls back to first $0 option when no isDefault exists", () => {
    const lookup = makeLookup([
      { subId: "cabinets", optId: "cab-free", price: 0 },
      { subId: "cabinets", optId: "cab-expensive", price: 500 },
    ]);
    const result = buildDefaultOptionBySubcategory(lookup);
    expect(result.get("cabinets")).toBe("cab-free");
  });

  it("isDefault wins even if it appears after $0 option", () => {
    const lookup = makeLookup([
      { subId: "cabinets", optId: "cab-free", price: 0 },
      { subId: "cabinets", optId: "cab-default-paid", price: 200, isDefault: true },
    ]);
    const result = buildDefaultOptionBySubcategory(lookup);
    expect(result.get("cabinets")).toBe("cab-default-paid");
  });

  it("skips malformed keys (no colon separator)", () => {
    const map = new Map<string, { option: Option; subCategory: SubCategory }>();
    map.set("malformed-key", {
      option: { id: "opt", name: "opt", price: 0, isDefault: true },
      subCategory: { id: "sub", name: "sub", categoryId: "cat", isVisual: true, options: [] },
    });
    const result = buildDefaultOptionBySubcategory(map);
    expect(result.size).toBe(0);
  });
});

describe("reconcileClientAndSessionSelections", () => {
  const defaults = new Map([["cabinets", "cab-white"], ["countertops", "ct-standard"]]);

  it("returns client value when session has no value for key", () => {
    const result = reconcileClientAndSessionSelections(
      { cabinets: "cab-espresso" },
      {},
      defaults,
    );
    expect(result.cabinets).toBe("cab-espresso");
  });

  it("returns session value when client has no value for key", () => {
    const result = reconcileClientAndSessionSelections(
      {},
      { cabinets: "cab-espresso" },
      defaults,
    );
    expect(result.cabinets).toBe("cab-espresso");
  });

  it("returns shared value when client and session agree", () => {
    const result = reconcileClientAndSessionSelections(
      { cabinets: "cab-espresso" },
      { cabinets: "cab-espresso" },
      defaults,
    );
    expect(result.cabinets).toBe("cab-espresso");
  });

  it("prefers session (non-default) when client has the default", () => {
    const result = reconcileClientAndSessionSelections(
      { cabinets: "cab-white" }, // default
      { cabinets: "cab-espresso" }, // non-default
      defaults,
    );
    expect(result.cabinets).toBe("cab-espresso");
  });

  it("prefers client (non-default) when session has the default", () => {
    const result = reconcileClientAndSessionSelections(
      { cabinets: "cab-espresso" }, // non-default
      { cabinets: "cab-white" }, // default
      defaults,
    );
    expect(result.cabinets).toBe("cab-espresso");
  });

  it("prefers client when both are non-default (ambiguous disagreement)", () => {
    const result = reconcileClientAndSessionSelections(
      { cabinets: "cab-espresso" },
      { cabinets: "cab-cherry" },
      defaults,
    );
    expect(result.cabinets).toBe("cab-espresso");
  });

  it("prefers client when no baseline exists for the subcategory", () => {
    const result = reconcileClientAndSessionSelections(
      { "unknown-sub": "opt-a" },
      { "unknown-sub": "opt-b" },
      defaults,
    );
    expect(result["unknown-sub"]).toBe("opt-a");
  });

  it("merges all unique keys from both sources", () => {
    const result = reconcileClientAndSessionSelections(
      { cabinets: "cab-white", backsplash: "bs-white" },
      { countertops: "ct-granite" },
      defaults,
    );
    expect(Object.keys(result).sort()).toEqual(["backsplash", "cabinets", "countertops"]);
  });
});
