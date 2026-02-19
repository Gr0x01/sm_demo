# Generation Reliability Playbook

## Why this exists
As we onboard more builders and room photos, the model will fail in different ways (wrong appliance geometry, wrong region edits, unchanged outputs). This playbook captures fast, repeatable fixes that can be applied on-the-fly without redesigning the whole pipeline.

## Fast triage order (always in this sequence)
1. Confirm selection payload is correct.
2. Confirm option-to-swatch mapping is correct in data.
3. Confirm prompt text actually contains the new rules (not stale output).
4. Confirm cache version was bumped after prompt/pipeline changes.
5. Only then add model-level fallback logic (second pass, mask, QA gate).

## Reusable fixes

### 1) Add explicit invariants (subcategory + option level)
- Put reusable constraints in `src/lib/generate.ts`:
  - `INVARIANT_RULES_BY_SUBCATEGORY`
  - `INVARIANT_RULES_BY_OPTION_ID`
- Use these for structural rules, not style language.
- Example: single-oven requirement, slide-in vs freestanding backguard behavior.

### 2) Add dynamic fallback invariants from option names
- If DB IDs drift or new options are added, infer critical rules from `option.name` as backup.
- Current pattern: if `range` option name contains `slide-in`, enforce no backguard + visible backsplash behind cooktop.

### 3) Remove prompt contradictions
- Do not globally force "color/texture only" when the selected option requires geometry change.
- Allow tightly scoped in-place appliance replacement:
  - Same opening/location/perspective/footprint.
  - No collateral room edits.

### 4) Always bump generation cache version when semantics change
- Cache key includes `_cacheVersion`.
- Current mechanism: `GENERATION_CACHE_VERSION` in `src/lib/generate.ts`.
- Bump when any of these change:
  - Prompt logic
  - Invariants
  - Multi-pass behavior
  - Model selection policy

### 5) Add targeted second-pass refinement when first pass is stubborn
- Pattern: run pass 1 normally, then optional pass 2 for known failure modes.
- Current implementation (kitchen slide-in range):
  - Pass 2 is masked to range region only.
  - Uses `input_fidelity: "low"` to allow geometry correction.
  - Prompt is narrow and explicit (no backguard, one oven door, preserve surroundings).
- File: `src/app/api/generate/route.ts`.

### 6) Control latency/cost with conditional fallbacks
- Do not run second pass universally.
- Gate by:
  - hero image
  - subcategory/option IDs
  - known failure signatures
- Add feature flags as needed for rollout safety.

## Current known implementation (Stone Martin demo)
- Two-pass range correction currently runs only when:
  - model is `gpt-image-1.5`
  - `heroImage` is `/rooms/kitchen-close.webp`
  - selected `range` is a slide-in option
- This is intentional and should be generalized per room over time.

## How to generalize to new rooms/builders
1. Add/verify spatial hints for the new step.
2. Identify high-risk objects (appliances, fixtures, mirrors, door geometry).
3. Add object-specific invariants (subcategory + option-level).
4. If failures persist, add a room-specific masked pass for that object.
5. Add cache version bump.
6. Capture the change in `decisions.md`.

## Verification checklist before shipping
- Prompt in admin cache output includes new rules.
- `_cacheVersion` increments and appears in saved selection metadata.
- 3-5 manual generations on the same room no longer show the failure mode.
- No major regressions in nearby surfaces/objects.
- Latency impact is acceptable for demo flow.

## Rules of thumb
- Prefer precise, localized constraints over long global prompts.
- If the model is preserving the old geometry, reduce fidelity in a masked second pass.
- If a fix works only once, it is not done until it is documented here and in `decisions.md`.

## Tips and tricks

### 1) If two goals fight each other, split ownership across passes
- Symptom: "fixing object A breaks nearby surface B" (example: slide-in range fix mutates island-front cabinetry).
- Tactic: remove object A from pass 1 selections and do object A only in pass 2.
- Why it works: pass 1 preserves broad room finish consistency; pass 2 does narrow geometry correction.

### 2) Write pass-2 prompts with both positive and negative constraints
- Positive constraints: what must exist (range clearly present, single oven door, backsplash visible).
- Negative constraints: what must never change (foreground island panel style/seams/color, below-countertop zones).
- This dual framing reduces "success by deletion" failures.

### 3) Mask sizing heuristic for kitchen-close range corrections
- Start with a rectangle covering:
  - full visible range body
  - small backsplash margin behind the cooktop
- Stop the lower boundary above island-front panels.
- If range disappears: expand upward/sideways first.
- If island front drifts: shrink downward first.

### 4) Cache hygiene during rapid reliability iteration
- Bump `GENERATION_CACHE_VERSION` on every semantic pipeline change (mask bounds, pass ownership, critical prompt constraints).
- Confirm `_cacheVersion` in admin details before judging whether a fix failed.

### 5) Keep fallback gated, not global
- Apply this pattern only where failure is reproduced (hero image + option IDs).
- Avoid global two-pass edits unless data proves the same failure across rooms.
