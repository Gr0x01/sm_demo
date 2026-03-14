import { describe, it, expect } from "vitest";
import { resolvePhotoGenerationPolicy } from "./photo-generation-policy";
import type { ResolvePhotoGenerationPolicyInput } from "./photo-generation-policy";
import type { StepPhotoGenerationPolicyRecord } from "./db-queries";

const baseInput: ResolvePhotoGenerationPolicyInput = {
  orgSlug: "stonemartin",
  floorplanSlug: "kinkade",
  stepSlug: "design-your-kitchen",
  stepPhotoId: "photo-001",
  imagePath: "org/rooms/kitchen.webp",
  modelName: "gpt-image-1.5",
  selections: { range: "range-slide-in-ss", cabinets: "cab-white" },
};

describe("resolvePhotoGenerationPolicy", () => {
  it("returns policyKey 'none' when no DB policy", () => {
    const result = resolvePhotoGenerationPolicy(baseInput, null);
    expect(result.policyKey).toBe("none");
    expect(result.secondPass).toBeUndefined();
    expect(result.promptOverrides).toBeUndefined();
  });

  it("returns policyKey 'none' when DB policy is inactive", () => {
    const policy: StepPhotoGenerationPolicyRecord = {
      policyKey: "kitchen-hero",
      isActive: false,
      policyJson: {},
    };
    const result = resolvePhotoGenerationPolicy(baseInput, policy);
    expect(result.policyKey).toBe("none");
  });

  it("returns promptOverrides from DB policy", () => {
    const policy: StepPhotoGenerationPolicyRecord = {
      policyKey: "kitchen-hero",
      isActive: true,
      policyJson: {
        promptOverrides: {
          invariantRulesAlways: ["Keep countertop overhang"],
          invariantRulesWhenSelected: { range: ["Flush range fit"] },
        },
      },
    };
    const result = resolvePhotoGenerationPolicy(baseInput, policy);
    expect(result.promptOverrides?.invariantRulesAlways).toEqual(["Keep countertop overhang"]);
    expect(result.promptOverrides?.invariantRulesWhenSelected?.range).toEqual(["Flush range fit"]);
  });

  it("returns secondPass when model matches and subcategory is selected", () => {
    const policy: StepPhotoGenerationPolicyRecord = {
      policyKey: "kitchen-hero",
      isActive: true,
      policyJson: {
        secondPass: {
          reason: "Range refinement",
          prompt: "Refine the range",
          whenSelected: { subId: "range", optionIds: ["range-slide-in-ss"] },
        },
      },
    };
    const result = resolvePhotoGenerationPolicy(baseInput, policy);
    expect(result.secondPass).toBeDefined();
    expect(result.secondPass!.reason).toBe("Range refinement");
    expect(result.secondPass!.prompt).toBe("Refine the range");
  });

  it("skips secondPass when model not in allowed list", () => {
    const policy: StepPhotoGenerationPolicyRecord = {
      policyKey: "kitchen-hero",
      isActive: true,
      policyJson: {
        secondPass: {
          reason: "Range refinement",
          prompt: "Refine the range",
          models: ["gemini-3-pro"],
        },
      },
    };
    const result = resolvePhotoGenerationPolicy(baseInput, policy);
    expect(result.secondPass).toBeUndefined();
  });

  it("fires secondPass when no model restriction", () => {
    const policy: StepPhotoGenerationPolicyRecord = {
      policyKey: "kitchen-hero",
      isActive: true,
      policyJson: {
        secondPass: {
          reason: "Range refinement",
          prompt: "Refine the range",
        },
      },
    };
    const result = resolvePhotoGenerationPolicy(baseInput, policy);
    expect(result.secondPass).toBeDefined();
  });

  it("skips secondPass when whenSelected subcategory not in selections", () => {
    const policy: StepPhotoGenerationPolicyRecord = {
      policyKey: "kitchen-hero",
      isActive: true,
      policyJson: {
        secondPass: {
          reason: "Range refinement",
          prompt: "Refine the range",
          whenSelected: { subId: "dishwasher" }, // dishwasher not in baseInput.selections
        },
      },
    };
    const result = resolvePhotoGenerationPolicy(baseInput, policy);
    expect(result.secondPass).toBeUndefined();
  });

  it("skips secondPass when optionIds don't match selected option", () => {
    const policy: StepPhotoGenerationPolicyRecord = {
      policyKey: "kitchen-hero",
      isActive: true,
      policyJson: {
        secondPass: {
          reason: "Range refinement",
          prompt: "Refine the range",
          whenSelected: { subId: "range", optionIds: ["range-freestanding-black"] },
        },
      },
    };
    const result = resolvePhotoGenerationPolicy(baseInput, policy);
    expect(result.secondPass).toBeUndefined();
  });

  it("fires secondPass when whenSelected has no optionIds filter (any option)", () => {
    const policy: StepPhotoGenerationPolicyRecord = {
      policyKey: "kitchen-hero",
      isActive: true,
      policyJson: {
        secondPass: {
          reason: "Range refinement",
          prompt: "Refine the range",
          whenSelected: { subId: "range" },
        },
      },
    };
    const result = resolvePhotoGenerationPolicy(baseInput, policy);
    expect(result.secondPass).toBeDefined();
  });

  it("defaults inputFidelity to 'low'", () => {
    const policy: StepPhotoGenerationPolicyRecord = {
      policyKey: "kitchen-hero",
      isActive: true,
      policyJson: {
        secondPass: {
          reason: "Refinement",
          prompt: "Refine",
        },
      },
    };
    const result = resolvePhotoGenerationPolicy(baseInput, policy);
    expect(result.secondPass!.inputFidelity).toBe("low");
  });

  it("respects inputFidelity 'high' when set", () => {
    const policy: StepPhotoGenerationPolicyRecord = {
      policyKey: "kitchen-hero",
      isActive: true,
      policyJson: {
        secondPass: {
          reason: "Refinement",
          prompt: "Refine",
          inputFidelity: "high",
        },
      },
    };
    const result = resolvePhotoGenerationPolicy(baseInput, policy);
    expect(result.secondPass!.inputFidelity).toBe("high");
  });

  it("uses DB policyKey value", () => {
    const policy: StepPhotoGenerationPolicyRecord = {
      policyKey: "custom-key-name",
      isActive: true,
      policyJson: {},
    };
    const result = resolvePhotoGenerationPolicy(baseInput, policy);
    expect(result.policyKey).toBe("custom-key-name");
  });
});
