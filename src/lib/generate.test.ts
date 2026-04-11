import { describe, it, expect } from "vitest";
import {
  hashSelections,
  buildPromptContextSignature,
  buildSceneDescription,
  filterSpatialHints,
  buildProsePrompt,
  buildProseScopedEdit,
  validatePromptProse,
  PromptProseError,
} from "./generate";
import type { StepPhotoAiConfig } from "./generate";
import type { PromptProse } from "./step-config";
import { buildOptionLookup } from "./__fixtures__/generation";

const mockResolver = async () => ({ buffer: Buffer.from("swatch"), mediaType: "image/jpeg" });

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

  it("includes option dimensions in signature", () => {
    const sig = buildPromptContextSignature(
      { sceneDescription: null, photo: { photoBaseline: null, spatialHint: null } },
      { backsplash: "bs-subway-white" },
      optionLookup,
      ["backsplash"],
    );
    expect(sig).toContain("d:bs-subway-white:4x16");
  });

  it("dimensions change busts the signature", () => {
    const lookup1 = buildOptionLookup();
    const lookup2 = buildOptionLookup();
    const entry = lookup2.get("backsplash:bs-subway-white")!;
    lookup2.set("backsplash:bs-subway-white", {
      ...entry,
      option: { ...entry.option, dimensions: "2x8" },
    });

    const sig1 = buildPromptContextSignature(
      { sceneDescription: null, photo: { photoBaseline: null, spatialHint: null } },
      { backsplash: "bs-subway-white" },
      lookup1,
      ["backsplash"],
    );
    const sig2 = buildPromptContextSignature(
      { sceneDescription: null, photo: { photoBaseline: null, spatialHint: null } },
      { backsplash: "bs-subway-white" },
      lookup2,
      ["backsplash"],
    );
    expect(sig1).not.toBe(sig2);
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

describe("buildProsePrompt (v2)", () => {
  const optionLookup = buildOptionLookup();

  // Test clauses: lowercase start, no trailing period, 4–18 words, no
  // forbidden words, exactly one {image}. Fixture slugs and their priorities:
  //   backsplash → 1, countertops → 3, common-wall-paint → 5,
  //   cabinets → 99 (no priority match on "cabinet-color"), range → 99.
  // Final order under visual-impact sort:
  //   backsplash, countertops, common-wall-paint, cabinets, range.
  const happyProse: PromptProse = {
    version: 2,
    actions: {
      cabinets: "apply {image} to every cabinet door and drawer front along the walls",
      countertops: "apply {image} to all horizontal countertop surfaces",
      backsplash: "apply {image} to the wall between upper cabinets and countertops",
      range: "apply {image} to the range unit in the back",
      "common-wall-paint": "apply {image} to the upper walls above the cabinets",
    },
  };

  const selections: Record<string, string> = {
    cabinets: "cab-espresso",
    countertops: "ct-granite-luna",
    backsplash: "bs-subway-white",
    range: "range-slide-in-ss",
    "common-wall-paint": "wall-agreeable-gray",
  };

  it("emits lead → bulleted actions (visual-impact sort) → style trailer", async () => {
    const { prompt, swatches } = await buildProsePrompt(happyProse, selections, optionLookup, mockResolver);

    const expected = [
      "Apply the following finishes to this kitchen photo:",
      "- apply image 2 to the wall between upper cabinets and countertops",
      "- apply image 3 to all horizontal countertop surfaces",
      "- apply image 4 to the upper walls above the cabinets",
      "- apply image 5 to every cabinet door and drawer front along the walls",
      "- apply image 6 to the range unit in the back",
      "Photorealistic real estate photography, natural daylight, neutral white balance.",
    ].join("\n");

    expect(prompt).toBe(expected);
    expect(swatches).toHaveLength(5);
    // First swatch in the reference array matches the first bullet line.
    expect(swatches[0].subcategoryId).toBe("backsplash");
    expect(swatches[4].subcategoryId).toBe("range");
  });

  it("substitutes {image} with sequential indexes starting at 2", async () => {
    const minimalProse: PromptProse = {
      version: 2,
      actions: {
        countertops: "apply {image} to all perimeter countertop surfaces",
        backsplash: "apply {image} to the wall strip above the countertops",
      },
    };
    const { prompt } = await buildProsePrompt(
      minimalProse,
      { countertops: "ct-granite-luna", backsplash: "bs-subway-white" },
      optionLookup,
      mockResolver,
    );
    // backsplash priority 1, countertops priority 3 → backsplash first = image 2
    expect(prompt).toContain("- apply image 2 to the wall strip above the countertops");
    expect(prompt).toContain("- apply image 3 to all perimeter countertop surfaces");
  });

  it("throws when actions[subId] is missing for a selected subcategory", async () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to every cabinet door along the walls" },
    };
    await expect(
      buildProsePrompt(prose, { cabinets: "cab-espresso", countertops: "ct-granite-luna" }, optionLookup, mockResolver),
    ).rejects.toThrow(PromptProseError);
  });

  it("respects a custom lead override", async () => {
    const prose: PromptProse = {
      version: 2,
      lead: "Apply the following finishes to this bathroom photo:",
      actions: { cabinets: "apply {image} to every cabinet door along the walls" },
    };
    const { prompt } = await buildProsePrompt(prose, { cabinets: "cab-espresso" }, optionLookup, mockResolver);
    expect(prompt.startsWith("Apply the following finishes to this bathroom photo:")).toBe(true);
    expect(prompt).not.toContain("kitchen");
  });

  it("respects a custom style override", async () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to every cabinet door along the walls" },
      style: "Architectural editorial photography.",
    };
    const { prompt } = await buildProsePrompt(prose, { cabinets: "cab-espresso" }, optionLookup, mockResolver);
    expect(prompt).toContain("Architectural editorial photography.");
    expect(prompt).not.toContain("real estate photography");
  });

  it("appends preserve clauses as the final tail (before style)", async () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to every cabinet door along the walls" },
      preserve: [
        "Keep the pendant lights and ceiling medallions unchanged",
      ],
    };
    const { prompt } = await buildProsePrompt(prose, { cabinets: "cab-espresso" }, optionLookup, mockResolver);
    const preserveIdx = prompt.indexOf("Keep the pendant lights");
    const styleIdx = prompt.indexOf("Photorealistic");
    expect(preserveIdx).toBeGreaterThan(0);
    expect(styleIdx).toBeGreaterThan(preserveIdx);
  });

  it("suppresses preserve tail when emitPreserve is false", async () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to every cabinet door along the walls" },
      preserve: ["Keep the pendant lights unchanged"],
    };
    const { prompt } = await buildProsePrompt(
      prose,
      { cabinets: "cab-espresso" },
      optionLookup,
      mockResolver,
      { emitPreserve: false },
    );
    expect(prompt).not.toContain("pendant");
  });
});

describe("buildProsePrompt (v2) — mergedClauses", () => {
  // Helper: build a tiny lookup with explicit swatch URLs per option so we
  // can control merge detection without touching the main fixture.
  function makeMergeLookup(
    entries: { subId: string; optId: string; swatchUrl: string }[],
  ): Map<string, { option: import("@/types").Option; subCategory: import("@/types").SubCategory }> {
    const map = new Map();
    for (const { subId, optId, swatchUrl } of entries) {
      map.set(`${subId}:${optId}`, {
        option: { id: optId, name: optId, price: 0, swatchUrl },
        subCategory: { id: subId, name: subId, categoryId: "cat", isVisual: true, options: [] },
      });
    }
    return map;
  }

  const mergeProse: PromptProse = {
    version: 2,
    actions: {
      "kitchen-cabinet-color": "apply {image} to every perimeter cabinet door and drawer front along the walls",
      "kitchen-island-cabinet-color": "apply {image} to the freestanding center base structure in the foreground",
    },
    mergedClauses: [
      {
        when: ["kitchen-cabinet-color", "kitchen-island-cabinet-color"],
        clause: "apply {image} to every cabinet door and drawer front throughout",
      },
    ],
  };

  it("fires when all when-subs resolve to the same swatch URL", async () => {
    const lookup = makeMergeLookup([
      { subId: "kitchen-cabinet-color", optId: "dove-a", swatchUrl: "https://storage/dove.jpg" },
      { subId: "kitchen-island-cabinet-color", optId: "dove-b", swatchUrl: "https://storage/dove.jpg" },
    ]);
    const { prompt, swatches } = await buildProsePrompt(
      mergeProse,
      { "kitchen-cabinet-color": "dove-a", "kitchen-island-cabinet-color": "dove-b" },
      lookup,
      mockResolver,
    );
    expect(prompt).toContain("- apply image 2 to every cabinet door and drawer front throughout");
    expect(prompt).not.toContain("perimeter cabinet door");
    expect(prompt).not.toContain("freestanding center base structure");
    expect(swatches).toHaveLength(1);
    expect(swatches[0].subcategoryId).toBe("kitchen-cabinet-color");
  });

  it("does NOT fire when swatch URLs differ", async () => {
    const lookup = makeMergeLookup([
      { subId: "kitchen-cabinet-color", optId: "dove", swatchUrl: "https://storage/dove.jpg" },
      { subId: "kitchen-island-cabinet-color", optId: "blue", swatchUrl: "https://storage/blue.jpg" },
    ]);
    const { prompt, swatches } = await buildProsePrompt(
      mergeProse,
      { "kitchen-cabinet-color": "dove", "kitchen-island-cabinet-color": "blue" },
      lookup,
      mockResolver,
    );
    expect(prompt).toContain("- apply image 2 to every perimeter cabinet door and drawer front along the walls");
    expect(prompt).toContain("- apply image 3 to the freestanding center base structure in the foreground");
    expect(prompt).not.toContain("throughout");
    expect(swatches).toHaveLength(2);
  });

  it("does NOT fire when only one when-sub is selected", async () => {
    const lookup = makeMergeLookup([
      { subId: "kitchen-cabinet-color", optId: "dove", swatchUrl: "https://storage/dove.jpg" },
    ]);
    const { prompt, swatches } = await buildProsePrompt(
      mergeProse,
      { "kitchen-cabinet-color": "dove" },
      lookup,
      mockResolver,
    );
    expect(prompt).toContain("perimeter cabinet door");
    expect(prompt).not.toContain("throughout");
    expect(swatches).toHaveLength(1);
  });

  it("sorts merged entry by the first when-slug's visual-impact priority", async () => {
    const lookup = makeMergeLookup([
      { subId: "kitchen-cabinet-color", optId: "dove-a", swatchUrl: "https://storage/dove.jpg" },
      { subId: "kitchen-island-cabinet-color", optId: "dove-b", swatchUrl: "https://storage/dove.jpg" },
      { subId: "counter-top", optId: "stone", swatchUrl: "https://storage/stone.jpg" },
    ]);
    const proseWithCounter: PromptProse = {
      version: 2,
      actions: {
        "kitchen-cabinet-color": "apply {image} to every perimeter cabinet door and drawer front along the walls",
        "kitchen-island-cabinet-color": "apply {image} to the freestanding center base structure in the foreground",
        "counter-top": "apply {image} to all horizontal countertop surfaces",
      },
      mergedClauses: [
        {
          when: ["kitchen-cabinet-color", "kitchen-island-cabinet-color"],
          clause: "apply {image} to every cabinet door and drawer front throughout",
        },
      ],
    };
    const { prompt } = await buildProsePrompt(
      proseWithCounter,
      {
        "kitchen-cabinet-color": "dove-a",
        "kitchen-island-cabinet-color": "dove-b",
        "counter-top": "stone",
      },
      lookup,
      mockResolver,
    );
    // Cabinets priority 0 (merged), counter priority 3. Merged line first.
    const mergedIdx = prompt.indexOf("throughout");
    const counterIdx = prompt.indexOf("countertop surfaces");
    expect(mergedIdx).toBeGreaterThan(0);
    expect(counterIdx).toBeGreaterThan(mergedIdx);
  });

  it("dedupes the swatch reference array so the merged clause uses one image index", async () => {
    const lookup = makeMergeLookup([
      { subId: "kitchen-cabinet-color", optId: "dove-a", swatchUrl: "https://storage/dove.jpg" },
      { subId: "kitchen-island-cabinet-color", optId: "dove-b", swatchUrl: "https://storage/dove.jpg" },
      { subId: "counter-top", optId: "stone", swatchUrl: "https://storage/stone.jpg" },
    ]);
    const proseWithCounter: PromptProse = {
      version: 2,
      actions: {
        "kitchen-cabinet-color": "apply {image} to every perimeter cabinet door and drawer front along the walls",
        "kitchen-island-cabinet-color": "apply {image} to the freestanding center base structure in the foreground",
        "counter-top": "apply {image} to all horizontal countertop surfaces",
      },
      mergedClauses: [
        {
          when: ["kitchen-cabinet-color", "kitchen-island-cabinet-color"],
          clause: "apply {image} to every cabinet door and drawer front throughout",
        },
      ],
    };
    const { prompt, swatches } = await buildProsePrompt(
      proseWithCounter,
      {
        "kitchen-cabinet-color": "dove-a",
        "kitchen-island-cabinet-color": "dove-b",
        "counter-top": "stone",
      },
      lookup,
      mockResolver,
    );
    // Two bullets total: merged (image 2) + counter (image 3)
    expect(prompt).toContain("apply image 2 to every cabinet door and drawer front throughout");
    expect(prompt).toContain("apply image 3 to all horizontal countertop surfaces");
    expect(swatches).toHaveLength(2);
  });
});

describe("validatePromptProse (v2) — mergedClauses", () => {
  const optionLookup = buildOptionLookup();

  it("accepts a valid mergedClauses entry", () => {
    const prose: PromptProse = {
      version: 2,
      actions: {
        "kitchen-cabinet-color": "apply {image} to every cabinet door along the walls",
        "kitchen-island-cabinet-color": "apply {image} to the freestanding center base structure",
      },
      mergedClauses: [
        {
          when: ["kitchen-cabinet-color", "kitchen-island-cabinet-color"],
          clause: "apply {image} to every cabinet door throughout",
        },
      ],
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).not.toThrow();
  });

  it("rejects a merge with fewer than 2 when-slugs", () => {
    const prose: PromptProse = {
      version: 2,
      actions: { "kitchen-cabinet-color": "apply {image} to every cabinet door along the walls" },
      mergedClauses: [{ when: ["kitchen-cabinet-color"], clause: "apply {image} to everything" }],
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/at least 2 subcategory slugs/);
  });

  it("rejects when-slug that has no fallback in actions", () => {
    const prose: PromptProse = {
      version: 2,
      actions: { "kitchen-cabinet-color": "apply {image} to every cabinet door along the walls" },
      mergedClauses: [
        {
          when: ["kitchen-cabinet-color", "kitchen-island-cabinet-color"],
          clause: "apply {image} to every cabinet door throughout",
        },
      ],
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(
      /no fallback entry in actions/,
    );
  });

  it("rejects a subcategory appearing in two merges", () => {
    const prose: PromptProse = {
      version: 2,
      actions: {
        a: "apply {image} to surface a alone",
        b: "apply {image} to surface b alone",
        c: "apply {image} to surface c alone",
      },
      mergedClauses: [
        { when: ["a", "b"], clause: "apply {image} to surfaces a and b" },
        { when: ["b", "c"], clause: "apply {image} to surfaces b and c" },
      ],
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(
      /already appears in another mergedClauses entry/,
    );
  });

  it("rejects a merged clause with forbidden material words", () => {
    const prose: PromptProse = {
      version: 2,
      actions: {
        "kitchen-cabinet-color": "apply {image} to every cabinet door along the walls",
        "kitchen-island-cabinet-color": "apply {image} to the freestanding center base structure",
      },
      mergedClauses: [
        {
          when: ["kitchen-cabinet-color", "kitchen-island-cabinet-color"],
          clause: "apply {image} to every white cabinet door throughout",
        },
      ],
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/forbidden material/);
  });

  it("rejects a merged clause without exactly one {image} token", () => {
    const prose: PromptProse = {
      version: 2,
      actions: {
        a: "apply {image} to surface a alone",
        b: "apply {image} to surface b alone",
      },
      mergedClauses: [
        { when: ["a", "b"], clause: "apply {image} and also {image} to surfaces a and b" },
      ],
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/exactly one \{image\}/);
  });

  it("rejects when-slug outside the photo's scope when scope is enforced", () => {
    const prose: PromptProse = {
      version: 2,
      actions: {
        "kitchen-cabinet-color": "apply {image} to every cabinet door along the walls",
        "kitchen-island-cabinet-color": "apply {image} to the freestanding center base structure",
      },
      mergedClauses: [
        {
          when: ["kitchen-cabinet-color", "kitchen-island-cabinet-color"],
          clause: "apply {image} to every cabinet door throughout",
        },
      ],
    };
    // Scope only includes cabinet, not island — merge references out-of-scope slug
    expect(() =>
      validatePromptProse(prose, optionLookup, ["kitchen-cabinet-color"]),
    ).toThrow(/not in this photo's subcategory scope/);
  });
});

describe("buildProseScopedEdit (v2)", () => {
  const optionLookup = buildOptionLookup();

  it("reuses actions[subId], capitalizes, adds period", async () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to every cabinet door and drawer front along the walls" },
    };
    const { prompt, swatches } = await buildProseScopedEdit(prose, "cabinets", "cab-espresso", optionLookup, mockResolver);
    expect(prompt).toBe("Apply image 2 to every cabinet door and drawer front along the walls.");
    expect(swatches).toHaveLength(1);
    expect(swatches[0].subcategoryId).toBe("cabinets");
  });

  it("throws when actions[changedSubcategoryId] is missing", async () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to every cabinet door along the walls" },
    };
    await expect(
      buildProseScopedEdit(prose, "countertops", "ct-granite-luna", optionLookup, mockResolver),
    ).rejects.toThrow(/Missing actions/);
  });

  it("emits no lead, no style trailer, no preserve tail", async () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to every cabinet door along the walls" },
      lead: "Apply the following finishes to this kitchen photo:",
      style: "Architectural editorial photography.",
      preserve: ["Keep the pendant lights unchanged"],
    };
    const { prompt } = await buildProseScopedEdit(prose, "cabinets", "cab-espresso", optionLookup, mockResolver);
    expect(prompt).not.toContain("kitchen photo");
    expect(prompt).not.toContain("photography");
    expect(prompt).not.toContain("pendant");
  });
});

describe("validatePromptProse (v2)", () => {
  const optionLookup = buildOptionLookup();

  it("accepts a well-formed prose object", () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to every cabinet door along the walls" },
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).not.toThrow();
  });

  it("rejects wrong version", () => {
    const prose = { version: 1, actions: {} } as unknown as PromptProse;
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/version must be 2/);
  });

  it("rejects empty actions object", () => {
    const prose = { version: 2, actions: {} } as unknown as PromptProse;
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/at least one entry/);
  });

  it("rejects missing action coverage for required sub IDs", () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to every cabinet door along the walls" },
    };
    expect(() => validatePromptProse(prose, optionLookup, ["cabinets", "countertops"])).toThrow(/missing an entry.*countertops/);
  });

  it("rejects action clause with multiple {image} tokens", () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} and also apply {image} along the walls" },
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/exactly one \{image\}/);
  });

  it("rejects action clause with zero {image} tokens", () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply finishes to every cabinet door along the walls" },
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/exactly one \{image\}/);
  });

  it("rejects too-short action clauses", () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image}" },
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/4–18 words/);
  });

  it("rejects too-long action clauses", () => {
    const prose: PromptProse = {
      version: 2,
      actions: {
        cabinets: "apply {image} to every single cabinet door and drawer front along the back and left and right walls of the entire kitchen area",
      },
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/4–18 words/);
  });

  it("rejects action clauses starting with a capital letter", () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "Apply {image} to every cabinet door along the walls" },
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/start lowercase/);
  });

  it("rejects action clauses ending with a period", () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to every cabinet door along the walls." },
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/must not end with a period/);
  });

  it("rejects negative words in action clauses", () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to every cabinet door but not the island" },
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/forbidden word/);
  });

  it("rejects the word 'island' in action clauses", () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to the kitchen island base structure" },
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/forbidden word "island"/);
  });

  it("rejects material/color words in action clauses", () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to every white cabinet door along the walls" },
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/forbidden material\/color word/);
  });

  it("rejects hex color codes in action clauses", () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to cabinet doors matching color #F5F5F2 exactly" },
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/hex color code/);
  });

  it("rejects lead longer than 12 words", () => {
    const prose: PromptProse = {
      version: 2,
      lead: "Apply the following finishes to this kitchen photo and also please be careful",
      actions: { cabinets: "apply {image} to every cabinet door along the walls" },
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/lead must be ≤12 words/);
  });

  it("rejects style longer than 20 words", () => {
    const prose: PromptProse = {
      version: 2,
      style: "Photorealistic real estate photography natural daylight neutral white balance shot on canon eos r5 with a wide 24 millimeter prime lens attached",
      actions: { cabinets: "apply {image} to every cabinet door along the walls" },
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/style must be ≤20 words/);
  });

  it("accepts optional lead / style / preserve when valid", () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to every cabinet door along the walls" },
      lead: "Apply the following finishes to this bathroom photo:",
      style: "Photorealistic real estate photography, natural daylight.",
      preserve: ["Keep the pendant lights and ceiling medallions unchanged"],
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).not.toThrow();
  });

  it("rejects preserve clauses longer than 18 words", () => {
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to every cabinet door along the walls" },
      preserve: [
        "Keep all of the pendant lights and ceiling medallions and crown molding and window trim unchanged throughout the entire visible area",
      ],
    };
    expect(() => validatePromptProse(prose, optionLookup, [])).toThrow(/preserve\[0\] must be ≤18 words/);
  });
});

describe("analyzeProseCoverage (v2)", () => {
  const optionLookup = buildOptionLookup();

  it("returns present=false for null prose", async () => {
    const { analyzeProseCoverage } = await import("./flux-pipeline");
    const result = analyzeProseCoverage(null, { cabinets: "cab-espresso" }, optionLookup);
    expect(result).toEqual({ present: false, missing: [] });
  });

  it("returns present=true, missing=[] when fully covered", async () => {
    const { analyzeProseCoverage } = await import("./flux-pipeline");
    const prose: PromptProse = {
      version: 2,
      actions: {
        cabinets: "apply {image} to every cabinet door along the walls",
        countertops: "apply {image} to all perimeter countertop surfaces",
      },
    };
    const result = analyzeProseCoverage(
      prose,
      { cabinets: "cab-espresso", countertops: "ct-granite-luna" },
      optionLookup,
    );
    expect(result).toEqual({ present: true, missing: [] });
  });

  it("returns missing subIds when prose is incomplete", async () => {
    const { analyzeProseCoverage } = await import("./flux-pipeline");
    const prose: PromptProse = {
      version: 2,
      actions: { cabinets: "apply {image} to every cabinet door along the walls" },
    };
    const result = analyzeProseCoverage(
      prose,
      { cabinets: "cab-espresso", countertops: "ct-granite-luna", backsplash: "bs-subway-white" },
      optionLookup,
    );
    expect(result.present).toBe(true);
    expect(result.missing).toEqual(expect.arrayContaining(["countertops", "backsplash"]));
  });

  it("ignores -none selections when computing missing", async () => {
    const { analyzeProseCoverage } = await import("./flux-pipeline");
    const prose: PromptProse = {
      version: 2,
      actions: { "common-wall-paint": "apply {image} to the upper walls above the cabinets" },
    };
    const result = analyzeProseCoverage(
      prose,
      { "common-wall-paint": "wall-agreeable-gray", "carpet-color": "carpet-none" },
      optionLookup,
    );
    expect(result.missing).toEqual([]);
  });

  it("ignores subs with no swatchUrl/swatchColor/promptDescriptor", async () => {
    const { analyzeProseCoverage } = await import("./flux-pipeline");
    const prose: PromptProse = {
      version: 2,
      actions: { "common-wall-paint": "apply {image} to the upper walls above the cabinets" },
    };
    // dishwasher has no swatchUrl/swatchColor/promptDescriptor in fixture
    const result = analyzeProseCoverage(
      prose,
      { "common-wall-paint": "wall-agreeable-gray", dishwasher: "dw-ss-standard" },
      optionLookup,
    );
    expect(result.missing).toEqual([]);
  });
});

describe("buildPromptContextSignature — prompt_prose inclusion", () => {
  it("produces different signatures when prompt_prose differs", () => {
    const base = {
      sceneDescription: null,
      photo: { photoBaseline: null, spatialHint: null, promptProse: null },
    };
    const withProse = {
      ...base,
      photo: {
        ...base.photo,
        promptProse: {
          version: 2 as const,
          actions: { cabinets: "apply {image} to every cabinet door along the walls" },
        },
      },
    };
    const sigA = buildPromptContextSignature(base);
    const sigB = buildPromptContextSignature(withProse);
    expect(sigA).not.toBe(sigB);
    expect(sigB).toContain("prose:");
    expect(sigB).toContain("every cabinet door");
  });

  it("produces same signature regardless of prose key order", () => {
    const proseA: PromptProse = {
      version: 2,
      actions: {
        a: "apply {image} surface a here and there",
        b: "apply {image} surface b here and there",
      },
    };
    const proseB: PromptProse = {
      version: 2,
      actions: {
        b: "apply {image} surface b here and there",
        a: "apply {image} surface a here and there",
      },
    };
    const sigA = buildPromptContextSignature({
      sceneDescription: null,
      photo: { photoBaseline: null, spatialHint: null, promptProse: proseA },
    });
    const sigB = buildPromptContextSignature({
      sceneDescription: null,
      photo: { photoBaseline: null, spatialHint: null, promptProse: proseB },
    });
    expect(sigA).toBe(sigB);
  });
});
