import { describe, it, expect } from "vitest";
import { deriveGenerationContext } from "./generate";
import {
  kitchenAiConfig,
  bedroomAiConfig,
  livingRoomAiConfig,
  kitchenSelections,
  bedroomSelectionsWithCarpet,
  bedroomSelectionsHardSurface,
  livingRoomSelectionsWithAccent,
  kitchenSlideInRangePolicy,
  defaultPolicyContext,
  buildOptionLookup,
} from "./__fixtures__/generation";

const optionLookup = buildOptionLookup();

describe("deriveGenerationContext — kitchen photo", () => {
  const ctx = () =>
    deriveGenerationContext(
      kitchenAiConfig,
      { ...kitchenSelections, "common-wall-paint": "wall-agreeable-gray", "carpet-color": "carpet-warm-beige" },
      optionLookup,
      defaultPolicyContext,
      null,
    );

  it("scopes selections to photo subcategory_ids only", () => {
    const result = ctx();
    // Kitchen photo scope: cabinets, countertops, backsplash, range, refrigerator, dishwasher
    expect(result.scopedSelections).toHaveProperty("cabinets");
    expect(result.scopedSelections).toHaveProperty("countertops");
    expect(result.scopedSelections).toHaveProperty("range");
    // Out of scope: wall-paint, carpet-color
    expect(result.scopedSelections).not.toHaveProperty("common-wall-paint");
    expect(result.scopedSelections).not.toHaveProperty("carpet-color");
  });

  it("excludes out-of-scope selections from hash", () => {
    const withExtra = deriveGenerationContext(
      kitchenAiConfig,
      { ...kitchenSelections, "carpet-color": "carpet-warm-beige" },
      optionLookup,
      defaultPolicyContext,
      null,
    );
    const withoutExtra = deriveGenerationContext(
      kitchenAiConfig,
      kitchenSelections,
      optionLookup,
      defaultPolicyContext,
      null,
    );
    // Same hash because carpet-color is scoped out
    expect(withExtra.selectionsHash).toBe(withoutExtra.selectionsHash);
  });

  it("filters spatial hints to scoped subcategories only", () => {
    const result = ctx();
    expect(result.spatialHints).toHaveProperty("cabinets");
    expect(result.spatialHints).toHaveProperty("range");
    // wall-paint is out of scope for kitchen photo
    expect(result.spatialHints).not.toHaveProperty("common-wall-paint");
  });

  it("uses photo baseline as scene description over step scene_description", () => {
    const result = ctx();
    expect(result.sceneDescription).toBe(kitchenAiConfig.photo.photoBaseline);
  });

  it("includes policy key in hash when DB policy exists", () => {
    const withPolicy = deriveGenerationContext(
      kitchenAiConfig,
      kitchenSelections,
      optionLookup,
      defaultPolicyContext,
      kitchenSlideInRangePolicy,
    );
    const withoutPolicy = deriveGenerationContext(
      kitchenAiConfig,
      kitchenSelections,
      optionLookup,
      defaultPolicyContext,
      null,
    );
    expect(withPolicy.selectionsHash).not.toBe(withoutPolicy.selectionsHash);
  });

  it("produces identical hash for same inputs (deterministic)", () => {
    const a = ctx();
    const b = ctx();
    expect(a.selectionsHash).toBe(b.selectionsHash);
  });

  it("produces different hash when selection changes", () => {
    const a = deriveGenerationContext(
      kitchenAiConfig,
      { ...kitchenSelections, cabinets: "cab-white-shaker" },
      optionLookup,
      defaultPolicyContext,
      null,
    );
    const b = deriveGenerationContext(
      kitchenAiConfig,
      { ...kitchenSelections, cabinets: "cab-espresso" },
      optionLookup,
      defaultPolicyContext,
      null,
    );
    expect(a.selectionsHash).not.toBe(b.selectionsHash);
  });

  it("produces different hash when generation rules change", () => {
    const lookupWithRules = buildOptionLookup();
    const lookupWithoutRules = buildOptionLookup();
    // Modify the cabinet subcategory's generation rules in one lookup
    const entry = lookupWithoutRules.get("cabinets:cab-white-shaker");
    if (entry) {
      lookupWithoutRules.set("cabinets:cab-white-shaker", {
        ...entry,
        subCategory: { ...entry.subCategory, generationRules: [] },
      });
    }
    const a = deriveGenerationContext(
      kitchenAiConfig,
      { ...kitchenSelections, cabinets: "cab-white-shaker" },
      lookupWithRules,
      defaultPolicyContext,
      null,
    );
    const b = deriveGenerationContext(
      kitchenAiConfig,
      { ...kitchenSelections, cabinets: "cab-white-shaker" },
      lookupWithoutRules,
      defaultPolicyContext,
      null,
    );
    expect(a.selectionsHash).not.toBe(b.selectionsHash);
  });
});

describe("deriveGenerationContext — bedroom photo (flooring)", () => {
  it("drops carpet-color when flooring type includes 'primary'", () => {
    const result = deriveGenerationContext(
      bedroomAiConfig,
      bedroomSelectionsHardSurface,
      optionLookup,
      { ...defaultPolicyContext, stepPhotoId: "photo-bedroom-001" },
      null,
    );
    expect(result.scopedSelections).not.toHaveProperty("carpet-color");
    expect(result.scopedSelections).toHaveProperty("main-area-flooring-color");
  });

  it("drops main-area-flooring-color when carpet is active", () => {
    const result = deriveGenerationContext(
      bedroomAiConfig,
      bedroomSelectionsWithCarpet,
      optionLookup,
      { ...defaultPolicyContext, stepPhotoId: "photo-bedroom-001" },
      null,
    );
    expect(result.scopedSelections).not.toHaveProperty("main-area-flooring-color");
    expect(result.scopedSelections).toHaveProperty("carpet-color");
  });

  it("flooring resolution changes the hash", () => {
    const withCarpet = deriveGenerationContext(
      bedroomAiConfig,
      bedroomSelectionsWithCarpet,
      optionLookup,
      { ...defaultPolicyContext, stepPhotoId: "photo-bedroom-001" },
      null,
    );
    const hardSurface = deriveGenerationContext(
      bedroomAiConfig,
      bedroomSelectionsHardSurface,
      optionLookup,
      { ...defaultPolicyContext, stepPhotoId: "photo-bedroom-001" },
      null,
    );
    expect(withCarpet.selectionsHash).not.toBe(hardSurface.selectionsHash);
  });
});

describe("deriveGenerationContext — living room with accent remap", () => {
  it("remaps accent-color to common-wall-paint when flag is true", () => {
    const result = deriveGenerationContext(
      livingRoomAiConfig,
      livingRoomSelectionsWithAccent,
      optionLookup,
      { ...defaultPolicyContext, stepPhotoId: "photo-living-001" },
      null,
    );
    // accent-navy → wall-navy in common-wall-paint slot
    expect(result.scopedSelections["common-wall-paint"]).toBe("wall-navy");
    expect(result.scopedSelections["accent-color"]).toBeUndefined();
  });

  it("accent remap changes the hash vs non-remapped", () => {
    const noRemapConfig = {
      ...livingRoomAiConfig,
      photo: { ...livingRoomAiConfig.photo, remapAccentAsWallPaint: false },
    };
    const remapped = deriveGenerationContext(
      livingRoomAiConfig,
      livingRoomSelectionsWithAccent,
      optionLookup,
      { ...defaultPolicyContext, stepPhotoId: "photo-living-001" },
      null,
    );
    const notRemapped = deriveGenerationContext(
      noRemapConfig,
      livingRoomSelectionsWithAccent,
      optionLookup,
      { ...defaultPolicyContext, stepPhotoId: "photo-living-001" },
      null,
    );
    expect(remapped.selectionsHash).not.toBe(notRemapped.selectionsHash);
  });
});

describe("deriveGenerationContext — policy integration", () => {
  it("resolves secondPass when policy matches model + selection", () => {
    const result = deriveGenerationContext(
      kitchenAiConfig,
      kitchenSelections,
      optionLookup,
      defaultPolicyContext,
      kitchenSlideInRangePolicy,
    );
    expect(result.resolvedPolicy.secondPass).toBeDefined();
    expect(result.resolvedPolicy.secondPass!.reason).toBe("Slide-in range refinement");
  });

  it("skips secondPass when subcategory not selected", () => {
    const { range: _, ...noRange } = kitchenSelections;
    const result = deriveGenerationContext(
      kitchenAiConfig,
      noRange,
      optionLookup,
      defaultPolicyContext,
      kitchenSlideInRangePolicy,
    );
    expect(result.resolvedPolicy.secondPass).toBeUndefined();
  });

  it("includes promptOverrides from DB policy", () => {
    const result = deriveGenerationContext(
      kitchenAiConfig,
      kitchenSelections,
      optionLookup,
      defaultPolicyContext,
      kitchenSlideInRangePolicy,
    );
    expect(result.resolvedPolicy.promptOverrides?.invariantRulesAlways).toContain(
      "Preserve countertop overhang on both sides of range",
    );
  });

  it("policyKey is 'none' when no DB policy provided", () => {
    const result = deriveGenerationContext(
      kitchenAiConfig,
      kitchenSelections,
      optionLookup,
      defaultPolicyContext,
      null,
    );
    expect(result.resolvedPolicy.policyKey).toBe("none");
  });
});

describe("deriveGenerationContext — null subcategoryIds fallback", () => {
  it("falls back to step section IDs when photo has no explicit subcategoryIds", () => {
    const configWithNullIds = {
      ...kitchenAiConfig,
      photo: { ...kitchenAiConfig.photo, subcategoryIds: null },
    };
    const result = deriveGenerationContext(
      configWithNullIds,
      { ...kitchenSelections, "common-wall-paint": "wall-agreeable-gray" },
      optionLookup,
      defaultPolicyContext,
      null,
    );
    // With null subcategoryIds, scope falls back to section subcategory_ids
    // Kitchen sections: ["cabinets", "countertops", "backsplash", "range", "refrigerator", "dishwasher"]
    expect(result.scopedSelections).toHaveProperty("cabinets");
    // wall-paint is NOT in any section, so it should be scoped out
    expect(result.scopedSelections).not.toHaveProperty("common-wall-paint");
  });

  it("includes everything when both photo subcategoryIds and sections are empty", () => {
    const configNoScope = {
      ...kitchenAiConfig,
      photo: { ...kitchenAiConfig.photo, subcategoryIds: null },
      sections: [],
      alsoIncludeIds: [],
    };
    const result = deriveGenerationContext(
      configNoScope,
      { ...kitchenSelections, "common-wall-paint": "wall-agreeable-gray" },
      optionLookup,
      defaultPolicyContext,
      null,
    );
    // No scope = include everything
    expect(result.scopedSelections).toHaveProperty("common-wall-paint");
    expect(result.scopedSelections).toHaveProperty("cabinets");
  });
});

describe("deriveGenerationContext — negative-guard rules", () => {
  it("includes generationRulesWhenNotSelected for unselected appliances in scope", () => {
    // kitchenSelections has range selected but NOT refrigerator or dishwasher
    // Refrigerator has generationRulesWhenNotSelected: ["Keep existing refrigerator unchanged"]
    const result = deriveGenerationContext(
      kitchenAiConfig,
      kitchenSelections,
      optionLookup,
      defaultPolicyContext,
      null,
    );
    // The prompt context signature should include the negative-guard for refrigerator
    expect(result.promptContextSignature).toContain("ns:refrigerator:");
    expect(result.promptContextSignature).toContain("Keep existing refrigerator unchanged");
  });

  it("does not include negative-guard for selected subcategories", () => {
    // Range IS selected, so its whenNotSelected rules should NOT appear
    const result = deriveGenerationContext(
      kitchenAiConfig,
      kitchenSelections,
      optionLookup,
      defaultPolicyContext,
      null,
    );
    expect(result.promptContextSignature).not.toContain("ns:range:");
  });
});

describe("hash consistency", () => {
  it("same inputs produce same selectionsHash", () => {
    const a = deriveGenerationContext(kitchenAiConfig, kitchenSelections, optionLookup, defaultPolicyContext, null);
    const b = deriveGenerationContext(kitchenAiConfig, kitchenSelections, optionLookup, defaultPolicyContext, null);
    expect(a.selectionsHash).toBe(b.selectionsHash);
  });

  it("same inputs produce same selectionsFingerprint", () => {
    const a = deriveGenerationContext(kitchenAiConfig, kitchenSelections, optionLookup, defaultPolicyContext, null);
    const b = deriveGenerationContext(kitchenAiConfig, kitchenSelections, optionLookup, defaultPolicyContext, null);
    expect(a.selectionsFingerprint).toBe(b.selectionsFingerprint);
  });

  it("fingerprint differs from hash (fingerprint excludes internal keys)", () => {
    const result = deriveGenerationContext(
      kitchenAiConfig,
      kitchenSelections,
      optionLookup,
      defaultPolicyContext,
      null,
    );
    expect(result.selectionsFingerprint).not.toBe(result.selectionsHash);
  });

  it("generate and check routes would produce same hash for same inputs (cross-route consistency)", () => {
    // Both routes call deriveGenerationContext with identical inputs.
    // This test ensures the hash is deterministic regardless of call context.
    const generateCtx = deriveGenerationContext(
      kitchenAiConfig,
      kitchenSelections,
      optionLookup,
      defaultPolicyContext,
      null,
    );
    // Simulate check route calling with same inputs
    const checkCtx = deriveGenerationContext(
      kitchenAiConfig,
      kitchenSelections,
      optionLookup,
      defaultPolicyContext,
      null,
    );
    expect(generateCtx.selectionsHash).toBe(checkCtx.selectionsHash);
    expect(generateCtx.selectionsFingerprint).toBe(checkCtx.selectionsFingerprint);
    expect(generateCtx.promptContextSignature).toBe(checkCtx.promptContextSignature);
  });
});
