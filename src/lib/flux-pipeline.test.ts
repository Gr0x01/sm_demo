import { describe, it, expect } from "vitest";
import { selectScopedEditModel } from "./flux-pipeline";
import { SCOPED_EDIT_MODEL } from "./models";
import { buildOptionLookup } from "./__fixtures__/generation";

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
