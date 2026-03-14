import { describe, it, expect } from "vitest";
import { hashSelections, buildPromptContextSignature, buildSceneDescription, filterSpatialHints } from "./generate";
import type { StepPhotoAiConfig } from "./generate";
import { buildOptionLookup } from "./__fixtures__/generation";

describe("hashSelections", () => {
  it("produces a 16-char hex string", () => {
    const hash = hashSelections({ cabinets: "cab-white" });
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic for same input", () => {
    const a = hashSelections({ cabinets: "cab-white", countertops: "ct-granite" });
    const b = hashSelections({ cabinets: "cab-white", countertops: "ct-granite" });
    expect(a).toBe(b);
  });

  it("is order-independent (sorts keys internally)", () => {
    const a = hashSelections({ cabinets: "cab-white", countertops: "ct-granite" });
    const b = hashSelections({ countertops: "ct-granite", cabinets: "cab-white" });
    expect(a).toBe(b);
  });

  it("produces different hashes for different selections", () => {
    const a = hashSelections({ cabinets: "cab-white" });
    const b = hashSelections({ cabinets: "cab-espresso" });
    expect(a).not.toBe(b);
  });

  it("handles empty selections object", () => {
    const hash = hashSelections({});
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("buildPromptContextSignature", () => {
  const optionLookup = buildOptionLookup();

  it("includes scene description in output", () => {
    const sig = buildPromptContextSignature({
      sceneDescription: "Kitchen with island",
      photo: { photoBaseline: null, spatialHint: null },
    });
    expect(sig).toContain("scene:Kitchen with island");
  });

  it("includes photo baseline and spatial hint", () => {
    const sig = buildPromptContextSignature({
      sceneDescription: null,
      photo: { photoBaseline: "White cabinets, granite", spatialHint: "Wide angle from dining" },
    });
    expect(sig).toContain("photoBaseline:White cabinets, granite");
    expect(sig).toContain("photoSpatialHint:Wide angle from dining");
  });

  it("sorts spatial hints deterministically", () => {
    const sigA = buildPromptContextSignature({
      sceneDescription: null,
      photo: { photoBaseline: null, spatialHint: null },
      spatialHints: { cabinets: "upper and lower", countertops: "island and perimeter" },
    });
    const sigB = buildPromptContextSignature({
      sceneDescription: null,
      photo: { photoBaseline: null, spatialHint: null },
      spatialHints: { countertops: "island and perimeter", cabinets: "upper and lower" },
    });
    expect(sigA).toBe(sigB);
  });

  it("includes generation rules from selected subcategories", () => {
    const sig = buildPromptContextSignature(
      { sceneDescription: null, photo: { photoBaseline: null, spatialHint: null } },
      { cabinets: "cab-white-shaker" },
      optionLookup,
      ["cabinets"],
    );
    expect(sig).toContain("s:cabinets:");
    expect(sig).toContain("Preserve shaker panel profile");
  });

  it("includes negative-guard rules for unselected scoped subcategories", () => {
    const sig = buildPromptContextSignature(
      { sceneDescription: null, photo: { photoBaseline: null, spatialHint: null } },
      { cabinets: "cab-white-shaker" }, // range NOT selected
      optionLookup,
      ["cabinets", "range"], // range in scope
    );
    expect(sig).toContain("ns:range:");
    expect(sig).toContain("Keep existing range unchanged");
  });

  it("produces same signature regardless of spatialHints insertion order", () => {
    const hints1 = { a: "1", b: "2", c: "3" };
    const hints2 = { c: "3", a: "1", b: "2" };
    const sig1 = buildPromptContextSignature({
      sceneDescription: "test",
      photo: { photoBaseline: null, spatialHint: null },
      spatialHints: hints1,
    });
    const sig2 = buildPromptContextSignature({
      sceneDescription: "test",
      photo: { photoBaseline: null, spatialHint: null },
      spatialHints: hints2,
    });
    expect(sig1).toBe(sig2);
  });
});

describe("buildSceneDescription", () => {
  it("prefers photoBaseline over sceneDescription", () => {
    const result = buildSceneDescription({
      photo: { photoBaseline: "White cabinets, granite", spatialHint: null },
      sceneDescription: "Kitchen with island",
    } as StepPhotoAiConfig);
    expect(result).toBe("White cabinets, granite");
  });

  it("falls back to sceneDescription when no photoBaseline", () => {
    const result = buildSceneDescription({
      photo: { photoBaseline: null, spatialHint: null },
      sceneDescription: "Kitchen with island",
    } as StepPhotoAiConfig);
    expect(result).toBe("Kitchen with island");
  });

  it("returns null when both are empty/missing", () => {
    const result = buildSceneDescription({
      photo: { photoBaseline: null, spatialHint: null },
      sceneDescription: null,
    } as StepPhotoAiConfig);
    expect(result).toBeNull();
  });

  it("trims whitespace", () => {
    const result = buildSceneDescription({
      photo: { photoBaseline: "  White cabinets  ", spatialHint: null },
      sceneDescription: null,
    } as StepPhotoAiConfig);
    expect(result).toBe("White cabinets");
  });

  it("treats whitespace-only as empty", () => {
    const result = buildSceneDescription({
      photo: { photoBaseline: "   ", spatialHint: null },
      sceneDescription: "  Kitchen  ",
    } as StepPhotoAiConfig);
    expect(result).toBe("Kitchen");
  });
});

describe("filterSpatialHints", () => {
  const hints = { cabinets: "upper and lower", countertops: "island", range: "back wall" };

  it("returns all hints when allowedIds is null", () => {
    const result = filterSpatialHints(hints, null);
    expect(result).toEqual(hints);
  });

  it("returns a copy (not same reference) when allowedIds is null", () => {
    const result = filterSpatialHints(hints, null);
    expect(result).not.toBe(hints);
  });

  it("filters to only allowed IDs", () => {
    const result = filterSpatialHints(hints, new Set(["cabinets", "range"]));
    expect(result).toEqual({ cabinets: "upper and lower", range: "back wall" });
  });

  it("returns empty object when no IDs match", () => {
    const result = filterSpatialHints(hints, new Set(["nonexistent"]));
    expect(result).toEqual({});
  });
});
