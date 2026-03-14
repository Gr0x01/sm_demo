import { describe, it, expect } from "vitest";
import { getPhotoScopedIds, normalizePrimaryAccentAsWallPaint } from "./photo-scope";

describe("getPhotoScopedIds", () => {
  it("returns Set from explicit subcategory IDs", () => {
    const result = getPhotoScopedIds(["cabinets", "countertops"], []);
    expect(result).toBeInstanceOf(Set);
    expect(result).toEqual(new Set(["cabinets", "countertops"]));
  });

  it("returns Set from fallback section IDs when ids is null", () => {
    const result = getPhotoScopedIds(null, ["wall-paint", "flooring"]);
    expect(result).toEqual(new Set(["wall-paint", "flooring"]));
  });

  it("returns Set from fallback section IDs when ids is empty array", () => {
    const result = getPhotoScopedIds([], ["wall-paint"]);
    expect(result).toEqual(new Set(["wall-paint"]));
  });

  it("returns null when both ids and fallback are empty/missing", () => {
    expect(getPhotoScopedIds(null, [])).toBeNull();
    expect(getPhotoScopedIds(null, undefined)).toBeNull();
    expect(getPhotoScopedIds([], [])).toBeNull();
    expect(getPhotoScopedIds(undefined, undefined)).toBeNull();
  });

  it("prefers explicit ids over fallback when both provided", () => {
    const result = getPhotoScopedIds(["cabinets"], ["wall-paint", "flooring"]);
    expect(result).toEqual(new Set(["cabinets"]));
  });

  it("deduplicates IDs", () => {
    const result = getPhotoScopedIds(["cabinets", "cabinets", "countertops"], []);
    expect(result!.size).toBe(2);
  });
});

describe("normalizePrimaryAccentAsWallPaint", () => {
  it("returns selections unchanged when remapAccentAsWallPaint is false", () => {
    const selections = { "accent-color": "accent-navy", "common-wall-paint": "wall-gray" };
    const result = normalizePrimaryAccentAsWallPaint(selections, false);
    expect(result).toBe(selections); // same reference, not copied
  });

  it("returns selections unchanged when no accent-color key exists", () => {
    const selections = { "common-wall-paint": "wall-gray" };
    const result = normalizePrimaryAccentAsWallPaint(selections, true);
    expect(result).toBe(selections);
  });

  it("returns selections unchanged when accent option doesn't start with 'accent-'", () => {
    const selections = { "accent-color": "custom-navy", "common-wall-paint": "wall-gray" };
    const result = normalizePrimaryAccentAsWallPaint(selections, true);
    expect(result).toBe(selections);
  });

  it("remaps accent-color to common-wall-paint with wall- prefix", () => {
    const selections = { "accent-color": "accent-navy", "common-wall-paint": "wall-gray" };
    const result = normalizePrimaryAccentAsWallPaint(selections, true);
    expect(result["common-wall-paint"]).toBe("wall-navy");
    expect(result["accent-color"]).toBeUndefined();
  });

  it("does not mutate the original selections object", () => {
    const selections = { "accent-color": "accent-navy", "common-wall-paint": "wall-gray" };
    const original = { ...selections };
    normalizePrimaryAccentAsWallPaint(selections, true);
    expect(selections).toEqual(original);
  });
});
