# Multi-Pass Generation Pipeline Architecture

**Status**: Design phase. Phase 1 R&D in progress.
**Date**: 2026-03-30
**Reviewed by**: backend-architect agent (2026-03-30)

## Phase 1 R&D Results (2026-03-30)

Test script: `scripts/test-multi-pass-pipeline.ts`
Outputs: `scripts/multi-pass-test-outputs/`

### Stain Hypothesis: CONFIRMED

1.5 with 3 structural swatches reliably applies dramatic cabinet stains (white → driftwood) that it **fails to apply** with 8+ swatches in a single pass. The perimeter cabinets show clear wood grain with the structural-only pass vs barely-tinted gray in the single pass.

**Implication:** Pro post-pass for cabinet stain refinement can be eliminated in the multi-pass architecture. That's -40s and -$0.01-0.02 per stain generation.

### Flooring in Structural: WORKS

Flooring was included in the structural pass (3 swatches total with cabinets + counter) and applied correctly. No need for a separate flooring pass.

### Fixtures Pass: WORKS (except slide-in range)

Hardware, faucet, and sink all applied correctly on the structural output. Stain cabinets preserved perfectly through the fixtures pass. Layout stable.

### Slide-In Range: STILL BROKEN

Slide-in range rendered as a freestanding range with backguard in both single-pass AND multi-pass. Fewer swatches did not fix this. The oven correction pass is still needed as a **separate conditional step** after fixtures — it's a geometry problem, not a swatch-count problem. Only fires when a slide-in range is selected.

### Specialty Pass (Flash): WORKS

Flash applied taupe subway backsplash cleanly on the fixtures output. One run had pantry food hallucination, another did not — anti-prompting needs to be stronger but the approach is sound.

### Visual Drift Across Passes: MINIMAL

Room layout, camera angle, and lighting were preserved through all 3 sequential passes. No meaningful drift. Stain cabinets from pass 1 survived passes 2 and 3 intact.

### Timing

| Run | Single pass | Multi-pass total | Delta |
|-----|------------|-----------------|-------|
| Default (onyx + driftwood island) | 40.4s | 93.8s | +53.4s |
| Stain (all driftwood) | 35.5s | 102.9s | +67.4s |

Cold multi-pass is ~2.5x slower than single-pass. But with intermediate caching, most buyer interactions skip 1-2 passes. The quality improvement (especially stain) justifies the first-gen cost.

### Updated Pass Chain (Kitchen)

```
hero → Structural (1.5, 3-5 swatches, ~38s)
     → Fixtures (1.5, 2-4 swatches, ~30s)
     → Oven correction (1.5, conditional, slide-in only, ~35s)
     → Specialty (Flash, 1 swatch, ~25s)
     → final image
```

### Stain R&D Complete (2026-03-30)

All stain tests confirm structural pass (3 swatches) consistently outperforms single pass (8 swatches):

| Test | Single pass (8 swatches) | Structural (3 swatches) | Winner |
|------|-------------------------|------------------------|--------|
| Driftwood (run 1) | Under-applied, gray/taupe | Wood grain, correct depth | Structural |
| Driftwood (run 2) | Under-applied | Correct | Structural |
| Driftwood (run 3) | Under-applied | Correct | Structural |
| Cappuccino | Under-applied | Correct | Structural |
| Sahara | Under-applied | Correct | Structural |
| Two-tone: Cappuccino perimeter + Driftwood island | Under-applied | Both colors correct, distinct | Structural |
| Two-tone: Sahara perimeter + Cappuccino island | Under-applied | Both colors correct, distinct | Structural |

**Conclusion: Pro post-pass for cabinet stain refinement is eliminated.** 1.5 with fewer swatches handles all stain colors and two-tone combinations without needing a cleanup pass.

**One concern found:** Flash specialty pass (backsplash) lightened stain cabinets back to beige in one run. Flash preservation of stain surfaces is inconsistent. Needs stronger anti-prompting or use Pro for specialty when stain is present.

### Remaining R&D

- [ ] Test slide-in range in isolation to see if ANY prompt approach fixes the geometry

## Problem

The generation pipeline has evolved reactively. Every time 1.5 drops a surface, we've added another compensatory post-pass. The result:

- **4-5 conditional steps** with complex branching (main → oven → pro-post-pass OR flash-post-pass → persist)
- **Each step re-fetches the same data** — `getOptionLookup(orgId)`, swatch downloads, hero image. On a 3-pass kitchen, that's 3 identical DB round-trips + 3 swatch download cycles.
- **No intermediate caching** — changing backsplash reruns the entire pipeline even though cabinets/countertops/flooring haven't changed
- **Latency compounding** — common case ~80s, worst case ~115s, prospects bounced at 30s
- **Unstable foundation** — if 1.5 degrades further, the response is "add another pass," which adds more latency and complexity

## Guiding Principles

1. **Each pass has a focused job** — 3-5 swatches max, not 12+
2. **Intermediate outputs are cached assets** — re-enter the pipeline at any pass
3. **Fetch once, use everywhere** — all DB/swatch I/O happens once at the top
4. **Photo scoping determines pass count** — kitchen-close = 3 passes, bathroom = 2, bedroom = 1
5. **Model degradation is contained** — if 1.5 gets worse at backsplash, it doesn't matter (backsplash is already isolated)

## Current Pipeline (What We're Replacing)

```
Full pipeline (kitchen worst case):
  generate (1.5, all 12 swatches, ~40s)
    → refine/oven (1.5, slide-in range, ~35s, conditional)
    → pro-post-pass (Gemini Pro, cabinets+backsplash, ~40s, conditional)
      OR flash-post-pass (Gemini Flash, backsplash only, ~22s, conditional)
    → persist

Scoped edit (single surface change):
  diff-cache check → scoped-edit (1.5, 1 swatch, ~32s)
    → flash/pro post-pass (conditional) → persist

Problems:
- Main pass gets ALL swatches → accuracy drops with count
- Post-passes are reactive (fix what main pass got wrong)
- No intermediate caching (change one surface → rerun everything)
- Each Inngest step re-fetches optionLookup, swatches, etc.
```

## Proposed Architecture

### Pass Groups

Surfaces are grouped by type. Each group is a discrete generation pass with its own model assignment and swatch set. **Pass definitions are per-photo** (derived from the photo's scoped subcategories), not per-room-type, because photo scoping already varies within a room type.

**Kitchen-close (worst case — 3 passes):**

| Pass | Name | Surfaces | Swatches | Model | Why |
|------|------|----------|----------|-------|-----|
| 1 | Structural | Cabinets (perimeter + island), countertop, flooring, wall paint | 4-6 | 1.5 | Big surfaces that define the room's palette. 1.5 handles well at this count. |
| 2 | Fixtures | Appliances (fridge, range, dishwasher), sink, faucet, cabinet pulls | 2-4 | 1.5 | Physical objects placed in/on structural surfaces. Spatial reasoning needed. |
| 3 | Specialty | Backsplash tile | 1 | Flash/Pro | Pattern/texture accuracy. 1.5 CANNOT keep backsplash on its pass — proven finding. |

**Bathroom (2 passes):**

| Pass | Name | Surfaces | Swatches | Model |
|------|------|----------|----------|-------|
| 1 | Structural | Vanity, floor tile, wall paint, cabinet color | 3-5 | 1.5 |
| 2 | Specialty | Shower tile patterns (if complex) | 1-2 | Flash/Pro |

**Bedroom / Living Room (1 pass):**

| Pass | Name | Surfaces | Swatches | Model |
|------|------|----------|----------|-------|
| 1 | Combined | Paint, flooring, fan, lighting, fireplace surround | 3-5 | 1.5 |

> **Answered (R&D)**: Flooring works fine in the structural pass. No separate pass needed.

> **Answered (R&D)**: Slide-in range correction does NOT fold into fixtures — still renders as freestanding. Stays as a separate conditional 1.5 pass after fixtures, same as today. Only fires for slide-in range selections.

> **Note on great rooms**: SM Kinkade great room has cabinets, flooring, paint, AND a fireplace. Photo scoping determines surfaces, and the pass definition is derived from what's scoped — not a rigid room-type label. A photo scoped to `[cabinet-color, flooring, wall-paint, fireplace-surround]` would use a 1-pass structural definition (4 swatches, well within 1.5's range).

### Pass Sequencing

Passes are **sequential per image** — each modifies the previous output:

```
hero photo → [Structural] → [Fixtures] → [Specialty] → final image
                 ↓               ↓             ↓
              cached           cached        cached
```

Each pass outputs a cached intermediate image keyed by a **pass-level hash** (hash of that group's selections + generation rules + context).

### Cache Hierarchy

```
Layer 1: Full hash match → serve final image instantly (0s)
  Exists today. Exact same selections → exact same image.

Layer 2: Scoped +1 edit on final image → ~32s
  Exists today. Buyer changes ONE surface → take any cached final
  image that differs by that one surface, run a scoped edit.
  THIS IS THE PRIMARY FAST PATH for most buyer interactions.
  Works regardless of which pass group the surface belongs to.

Layer 3: Intermediate pass cache → skip unchanged passes (NEW)
  When Layer 2 can't apply (depth cap, multiple changes, first gen
  after cache is warm). Instead of running all 3 passes from the
  hero, start from the latest cached intermediate.

Layer 4: Full cold generation → all passes from hero (~97s)
  Fallback when nothing is cached.
```

**Layer 2 (scoped +1) is the workhorse.** Most buyer behavior is "change one thing, see what happens." A buyer with a completed final image who changes wall paint gets a scoped edit on that final image in ~32s. No need to touch pass intermediates at all.

**Layer 3 (intermediate cache) kicks in when Layer 2 can't help:**

```
Scenario: Buyer changes 3 surfaces at once (counter + backsplash + pulls)
  - Layer 2 can't help (more than 1 surface diff)
  - Layer 3: structural_hash still matches → load cached structural output
  - Run fixtures pass (pulls changed) on structural output (~35s)
  - Run specialty pass (backsplash changed) on fixtures output (~22s)
  → Total: ~57s instead of ~97s cold

Scenario: Scoped edit depth cap hit (buyer has been flipping surfaces)
  - Layer 2 can't help (depth > 3)
  - Layer 3: check which pass intermediates are still valid
  - Maybe structural is cached, fixtures is cached, only specialty needs
    a fresh run → ~22s instead of ~97s full regen

Scenario: First generation, but a previous buyer already generated with
  the same cabinet/counter/floor/paint selections (different backsplash)
  - Layer 3: structural_hash matches → load cached structural output
  - fixtures_hash matches → load cached fixtures output
  - Only specialty pass runs (~22s)
  → First gen for THIS buyer is ~22s instead of ~97s
```

**Layer 2 vs Layer 3 quality difference:** Layer 2 takes a final image and does a scoped edit. Layer 3 builds from an intermediate via sequential passes. For the same final selections, these produce visually different images (different code paths, different model invocations). Since we upsert on `selectionsHash`, first to complete wins. This is acceptable — both should look good, and buyers never see both side-by-side.

**Layer 2 model mismatch for specialty surfaces:** Today, scoped edits always use 1.5. But specialty surfaces (backsplash) are in the specialty pass because 1.5 can't handle them. If Layer 2 fires for a backsplash change, it uses 1.5 — the wrong model. Accepted tradeoff for now (fast > perfect during browsing). Future improvement: scoped edits should respect the per-surface model assignment from pass definitions.

**What's in storage today vs what we need:**

Currently, intermediates ARE saved to storage for debugging (`{hash}_main.jpg`, `{hash}_refine.jpg`, etc.) — but they're keyed by the full selections hash. So `{fullHash}_main.jpg` is the structural output for one specific set of ALL selections. You can't query "find me a structural output matching just these cabinet + counter + floor + paint selections."

The `pass_cache` table fixes this by indexing each intermediate with a hash of **just that pass's selections**. Different buyers with different backsplash choices but the same cabinets/counter/floor/paint share the same cached structural intermediate.

### DB Schema for Intermediate Cache

**Separate `pass_cache` table** — cleaner separation, works for any number of passes without schema changes, query pattern is simple. `generated_images` stays focused on final outputs.

```sql
CREATE TABLE pass_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  step_photo_id UUID NOT NULL REFERENCES step_photos(id),
  org_id UUID NOT NULL,                -- RLS + query scoping
  pass_name TEXT NOT NULL,             -- 'structural', 'fixtures', 'specialty'
  pass_hash TEXT NOT NULL,             -- hash of this group's selections + rules + context
  upstream_hash TEXT NOT NULL,         -- hash of all previous passes (chain integrity)
  model TEXT NOT NULL,                 -- which model produced this intermediate
  pass_selections_json JSONB,          -- debugging: what selections produced this
  image_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(step_photo_id, pass_name, pass_hash, upstream_hash)
);

CREATE INDEX idx_pass_cache_lookup
  ON pass_cache (step_photo_id, pass_name, pass_hash, upstream_hash);
```

**Concurrency handling:** Two buyers generating simultaneously with the same structural selections will both run the structural pass and try to write. Use `ON CONFLICT DO NOTHING` — second write is a no-op, image already in storage. No `__pending__` claim mechanism for pass_cache (unlike `generated_images`). Duplicate intermediate generation is rare and cheap ($0.02) vs the complexity of a claim system. Accept the cost.

### Pass-Level Hash Composition

**Critical: pass-level hashes must include generation rules, not just selections.** If an admin changes a generation rule on a subcategory (e.g., adds "apply stain to drawer fronts, not just doors"), the intermediate must be invalidated. Without rules in the hash, stale intermediates would be served after admin edits.

```
structural_hash = hash(
  cabinet_sel, island_sel, counter_sel, floor_sel, paint_sel,  -- selections
  structural_rules_signature,                                    -- generation rules for structural subcats
  cache_version                                                  -- global version bump
)

fixtures_hash = hash(
  fridge_sel, range_sel, sink_sel, faucet_sel, pulls_sel,
  fixtures_rules_signature,
  cache_version
)

specialty_hash = hash(
  backsplash_sel,
  specialty_rules_signature,
  cache_version
)
```

The `rules_signature` is a per-pass variant of `buildPromptContextSignature` — includes only the rules relevant to that pass's subcategories (subcategory-level rules + option-level rules + per-photo policy overrides).

### Upstream Hash (Chain Integrity)

A specialty pass output is only valid if the structural + fixtures passes that produced its input haven't changed. The `upstream_hash` captures this:

```
structural upstream_hash = hash(hero_photo_id, cache_version)  -- no upstream pass
fixtures upstream_hash   = structural_hash
specialty upstream_hash  = hash(structural_hash, fixtures_hash)
```

This prevents serving a stale intermediate. If someone changes cabinets (structural), the structural hash changes → fixtures upstream_hash no longer matches → fixtures cache misses → everything downstream re-runs.

**Note on cache_version:** Bumping `GENERATION_CACHE_VERSION` invalidates ALL intermediate caches across ALL pass levels, not just final images. This is correct behavior (prompt/pipeline semantic changes should invalidate everything) but worth being aware of — it's a nuclear option.

### Scoped Edits (Single-Surface Changes)

Scoped edits still apply within a pass group. If a buyer changes only countertop (structural group), we can:

1. Look for a cached structural output that matches all other structural selections
2. Run a scoped 1.5 edit changing only countertop (~32s)
3. Check if fixtures + specialty caches are still valid
4. Skip or re-run downstream passes as needed

The leave-one-out hash system works within a pass group — same concept, smaller surface set.

**Appliance add/remove:** The current pipeline skips scoped edits for `-none` option transitions (e.g., no fridge → fridge) because these are geometry insertions, not surface swaps. This rule carries forward into the fixtures pass — scoped edits within fixtures are blocked for add/remove transitions. Full fixtures pass runs instead.

## I/O Optimization: Fetch Once, Use Everywhere

### The Problem

Currently, each Inngest step is a separate serverless invocation. Each one:
- Calls `getOptionLookup(orgId)` → 2 DB queries
- Creates a new swatch resolver + downloads swatches
- Downloads the previous step's intermediate image

On a 3-pass kitchen, that's 6 redundant DB queries and 3 swatch download cycles.

### Approach: Parallel Fetch Per Step

Each step already parallelizes its I/O — optionLookup fetch (~20-50ms) runs alongside the intermediate image download and swatch downloads. Re-fetching optionLookup per step costs nothing in wall-clock time because it's hidden behind slower operations (swatch downloads at ~200-500ms).

No need to serialize optionLookup into the event payload or pre-fetch into a context blob. Each step is self-contained: fetch what it needs in parallel, generate, upload result. Simple.

If I/O overhead becomes a measurable fraction of total time later, options include a swatch workspace (download all once, reference per step) or Redis. Upstash Redis account already exists (free tier, AWS US-EAST-1) — no new infrastructure to set up if we need it.

**If we need to optimize later:** The swatch workspace pattern is the right next step — plan step downloads all swatches and uploads to a predictable workspace path, subsequent steps reference that path. Eliminates redundant swatch downloads. Redis is the final escalation if Storage overhead matters.

## Pipeline Orchestration (Inngest Steps)

### Step Layout

```
Step 0: "plan"
  - Determine pass definitions from photo's scoped subcategories
  - Compute pass-level hashes (including rules signatures)
  - Check intermediate cache for each pass (query pass_cache)
  - Check Layer 2 scoped-edit eligibility (leave-one-out on generated_images)
  - Determine execution path:
    a) Layer 2 hit → scoped edit on final image (fast path)
    b) Layer 3 hit → start from cached intermediate (skip passes)
    c) Layer 4 → full cold generation
  - Output: execution plan { path, startFromPass, cachedIntermediates }

Step 1: "pass-structural" (conditional — skipped if cache hit)
  - Download hero or cached upstream intermediate
  - Build prompt for structural surfaces only (3-5 swatches)
  - Generate via 1.5
  - Upload intermediate + upsert pass_cache
  - Output: { path, durationMs }

Step 2: "pass-fixtures" (conditional — skipped if cache hit)
  - Download structural output (from step 1 or cache)
  - Build prompt for fixtures only (2-4 swatches)
  - Generate via 1.5
  - Upload intermediate + upsert pass_cache
  - Output: { path, durationMs }

Step 3: "pass-specialty" (conditional — skipped if cache hit)
  - Download fixtures output (from step 2 or cache)
  - Build prompt for specialty surfaces (1-2 swatches)
  - Generate via Flash/Pro
  - Upload intermediate + upsert pass_cache
  - Output: { path, durationMs }

Step 4: "persist"
  - Copy final intermediate to canonical output path
  - Upsert generated_images row
  - Compute leave-one-out hashes (for Layer 2 fast path)
  - PostHog event
```

### Conditional Step Execution

Using **early return in step body** — step runs, checks cache, returns cached path if hit. Costs ~0.5s Inngest step transition but no generation time. For a 3-pass kitchen where structural and fixtures are cached, that's ~1s overhead to skip to the specialty pass. Negligible.

### Inngest-Specific Notes

- **Retry semantics:** With `retries: 2`, Inngest retries from the beginning but memoized steps (already completed) replay their outputs without re-executing. If structural pass succeeds and fixtures fails, retry skips structural. The intermediate is already in Storage. This is correct behavior.
- **Step naming:** Step names are memoization keys. Use stable names (`pass-structural`, `pass-fixtures`, `pass-specialty`), not dynamic names. If you rename a step in a code deploy while functions are in-flight, the in-flight function re-executes the renamed step.
- **Concurrency limit:** Currently 5. May increase once intermediate caching reduces passes-per-function. Monitor.

### Pass Definitions: Per-Photo, Not Per-Room-Type

Pass definitions are derived from the photo's scoped subcategories, not a rigid room-type label. This handles edge cases like the SM great room (cabinets + flooring + paint + fireplace = 1 structural pass, not a kitchen-style 3-pass).

**Schema addition needed:**

```sql
ALTER TABLE step_photos ADD COLUMN room_type TEXT;
-- Values: 'kitchen', 'bathroom', 'bedroom', 'living', 'great-room', etc.
-- Used as a hint for pass definition selection, not the sole determinant.
-- The scoped subcategory list is authoritative; room_type breaks ties.
```

**Resolution logic:**
```
1. Get photo's scoped subcategory slugs
2. Check for specialty surfaces (backsplash → needs specialty pass)
3. Check for fixture surfaces (appliances, pulls, sink → needs fixtures pass)
4. Everything else → structural pass
5. room_type column breaks ambiguity if needed
```

This means pass definitions are computed at generation time from the photo's scope, not stored as static config. A photo scoped to `[cabinet-color, countertop, wall-paint]` gets 1 pass. Add `backsplash` to the scope and it gets 2 passes. No manual configuration needed.

```typescript
type PassDefinition = {
  name: string;                    // 'structural' | 'fixtures' | 'specialty'
  subcategories: string[];         // which subcategory slugs this pass handles
  model: string;                   // 'gpt-image-1.5' | Flash | Pro
};

function derivePassDefinitions(
  scopedSubcategorySlugs: string[],
  roomType?: string,
): PassDefinition[] {
  // Classify each subcategory into a pass group
  // Specialty: backsplash, shower-tile, etc. (surfaces that need isolation)
  // Fixtures: appliances, sink, faucet, pulls, fan, lighting, etc.
  // Structural: everything else (cabinets, countertop, flooring, paint, etc.)
  // Return only passes that have subcategories assigned
}
```

## Per-Model Prompt Strategy

Different models need fundamentally different prompting. This isn't just "tweak the wording" — it's a structural concern for the pipeline.

### 1.5 (OpenAI) — Structural & Fixtures Passes

1.5 is obedient but literal. Main prompting challenges:

- **Conflicting exclusion rules (cabinet/island problem)**: When perimeter cabinets and island cabinets are the same color, the prompt currently needs "apply to perimeter walls, NOT the island" on one line and potentially "apply to island" on another. The model sees "NOT the island" first and stops applying there. The linked-option merge system (`resolveLinkedOptions`) handles this today by detecting same-swatch and merging into a single line covering both zones, stripping the exclusion clauses. **In the multi-pass world, this gets simpler.** Structural pass handles all cabinets together — the prompt says "apply this swatch to all cabinet doors" when same color, or gives two separate lines with zone targeting when different. No conflicting exclusion rules because both are in the same pass with full context.

- **Swatch count is the main quality lever**: 1.5 degrades as swatch count increases. The whole point of multi-pass is keeping each pass to 3-5 swatches.

- **Layout preservation rules are critical**: Anti-cabinetry rule, appliance position rule, geometry constraints. These must be on every 1.5 pass regardless of what surfaces that pass is changing. Lesson learned from the v28→v34 prompt restructure where removing these caused fridge displacement.

### Gemini (Flash/Pro) — Specialty & Refinement Passes

Gemini models are more "creative" and need heavier guardrails. They will:

- **Add items that aren't there**: Food in the pantry, objects on countertops, decorative items on shelves. Flash is especially prone to this.
- **Embellish surfaces**: Add texture, patterns, or visual "flair" that wasn't requested.
- **Reinterpret the scene**: Subtle changes to lighting, shadows, or perspective that accumulate across passes.

**Required anti-prompting for Gemini passes:**
- "Every other pixel in the image must remain identical"
- Explicit callouts: "do not add, remove, or alter any objects, appliances, fixtures, shelves, pantry contents, doorways, alcoves"
- The preservation language needs to be MORE aggressive than 1.5 because Gemini defaults to "creative interpretation"
- Boundary rules are critical (e.g., "do NOT extend tile below the countertop") — without them, dark tiles bleed onto cabinet faces

**Implication for prompt architecture:** `buildEditPrompt` can't be one-size-fits-all. We need:
- A shared core (swatch mapping, spatial hints, dimensions)
- Per-model prompt wrappers that add the right guardrails
- Structural/fixtures passes: 1.5 wrapper (layout preservation, anti-hallucination)
- Specialty pass: Gemini wrapper (aggressive preservation, anti-creativity, boundary constraints)

### The Cabinet/Island Problem in Detail

This is a recurring prompt engineering headache worth documenting fully:

**Scenario A — Same color (e.g., both white shaker):**
- Current: `resolveLinkedOptions` detects same swatch → merges → single prompt line "apply to all cabinet doors and drawer fronts along the walls AND island cabinet doors"
- Multi-pass: Structural pass gets both cabinet subcategories. Prompt says "apply swatch #N to all cabinet surfaces (perimeter and island)". No exclusion rules needed. Cleaner.

**Scenario B — Different colors (e.g., white perimeter, driftwood island):**
- Current: Two separate lines with exclusion rules: "perimeter cabinets... NOT the island" + "island cabinets only"
- Multi-pass: Same structural pass, two lines, two swatches. The model has full context of both colors, so spatial targeting works better than when it sees 12 swatches and has to mentally juggle which goes where.

**Scenario C — Stain cabinets (dramatic color change):**
- Current: Main 1.5 pass under-applies stain → Pro post-pass refines
- Multi-pass: Structural pass has only 4-5 swatches. Hypothesis: 1.5 with fewer swatches applies stain correctly without needing a Pro cleanup. **This is a key thing to test in Phase 1.** If structural-only pass nails stain cabinets, we may not need the Pro post-pass at all.

## Cost & Latency Analysis

### Cost Per Generation

| Scenario | Current Pipeline | Multi-Pass (cold) | Multi-Pass (warm cache) |
|----------|-----------------|-------------------|------------------------|
| Kitchen (no stain, no isolation) | ~$0.02 (1 OpenAI) | ~$0.06 (3 OpenAI/Gemini) | $0.02 or less (1-2 passes) |
| Kitchen (stain + herringbone) | ~$0.05 (1 OpenAI + Pro + Flash) | ~$0.06 (3 passes) | $0.02 or less |
| Bathroom | ~$0.02 | ~$0.04 (2 passes) | $0.02 or less |
| Bedroom | ~$0.02 | ~$0.02 (1 pass) | $0.02 or less |

Cold generation costs 2-3x more. But intermediate caching means most interactions (Layer 2 scoped edit or Layer 3 partial cache) run 1-2 passes. Average cost per buyer interaction should go down, not up.

### Latency

| Scenario | Current | Multi-Pass |
|----------|---------|------------|
| Cold kitchen (first gen) | ~80-115s | ~97s (2 OpenAI + 1 Gemini) |
| Scoped +1 edit (any surface) | ~32-54s | ~32s (unchanged — Layer 2) |
| Layer 3: change backsplash only | N/A (reruns everything) | ~22s |
| Layer 3: change fixture | N/A | ~54s (fixtures + specialty) |
| Layer 3: depth cap reset | ~80-115s | ~22-57s (skip cached passes) |

**Cold first-gen is the weak point.** ~97s is worse than today's common case (~80s). Mitigation: pre-generate the structural pass for default selections. Then every buyer's first "Visualize" starts from cached structural output → fixtures + specialty = ~57s.

### Pre-Generation Synergy

With intermediate caching, pre-generation becomes much more valuable:
- Pre-gen structural pass for top 5 cabinet/counter/floor combos
- Every buyer's first gen starts from Layer 3, not Layer 4
- Pre-gen surface area expands dramatically with less compute
- Consider making pre-generation a Phase 2.5 priority

## Migration Path

### Phase 1: Validate pass grouping (R&D)

**Use a standalone test script (not Inngest, not production).** Binary questions to answer before any code changes:

1. Does 1.5 with 4-5 structural swatches produce better cabinets than 1.5 with 12 swatches?
2. Does a 3-pass sequential pipeline produce equivalent-or-better quality than 1-pass + compensatory post-passes?
3. **Does fewer swatches fix the stain problem?** If structural pass (4-5 swatches) reliably applies dramatic cabinet stains, the Pro post-pass is eliminated entirely. This is the highest-value R&D finding.
4. How much visual drift accumulates across 3 sequential passes?

Test matrix: default selections, stain cabinets (white → driftwood), different-color island, herringbone backsplash. Model on `scripts/test-scoped-surface-edit.ts` pattern.

### Phase 2+3: Feature flag + pass_cache + Inngest function — BUILT (2026-03-30)

Built in one pass. All code compiles, 187 tests pass, existing pipeline untouched.

**What shipped:**
- `pass_cache` table in Supabase (migration applied)
- `useMultiPass` feature flag on `step_photo_generation_policies` JSONB
- `src/lib/pass-definitions.ts` — `derivePassDefinitions(scopedSelections, optionLookup)` classifies subcategories into pass groups based on `isAppliance`, `needsIsolation`, and slug matching
- `src/lib/generate.ts` — `computePassHashes()` with chained upstream hashes for cache integrity
- `src/lib/db-queries.ts` — `findPassCacheHit()` + `upsertPassCache()` (ON CONFLICT DO NOTHING)
- `src/inngest/functions/generate-photo-multipass.ts` — new Inngest function alongside existing one
- Route handler computes pass definitions + pass hashes when `useMultiPass` is true
- Old `generate-photo.ts` skips when `passDefinitions` present; new function skips when absent

**Code review fixes applied:**
- Upstream hash chain propagates full chain (not just previous pass's own hash)
- Negative guards use full `scopedSubcategoryIds` (structural pass knows not to touch backsplash)
- `captureAiError` on both OpenAI and Gemini failures
- Gemini specialty pass degrades gracefully (falls back to previous output on failure)
- Cost estimation separates OpenAI and Gemini pass costs
- Linked option resolution added to Gemini specialty prompt builder
- Type casts removed (`as any` → typed access)

**Deferred from plan:**
- `computePassLeaveOneOutHashes` — within-pass scoped edits not built yet. Layer 2 scoped edits on final images still work (existing leave-one-out system).
- `room_type` column on `step_photos` — not needed yet, pass definitions derive from scoped subcategories

**Key files:**
| File | Status |
|------|--------|
| `src/lib/pass-definitions.ts` | NEW |
| `src/inngest/functions/generate-photo-multipass.ts` | NEW |
| `src/lib/generate.ts` | MODIFIED (added `computePassHashes`, `PassHashEntry`) |
| `src/lib/db-queries.ts` | MODIFIED (added pass cache queries) |
| `src/lib/photo-generation-policy.ts` | MODIFIED (added `useMultiPass`) |
| `src/inngest/client.ts` | MODIFIED (added `passDefinitions`, `passHashes` to event type) |
| `src/app/api/generate/photo/route.ts` | MODIFIED (dispatch logic) |
| `src/app/api/inngest/route.ts` | MODIFIED (registered new function) |
| `src/inngest/functions/generate-photo.ts` | MODIFIED (skip guard for multi-pass) |
| `src/lib/posthog-server.ts` | MODIFIED (added `multi_pass` event props) |

### Next: Local testing

1. Run Inngest dev + Next.js dev
2. Set `use_multi_pass: true` on SM kitchen-close step photo policy
3. Hit Visualize — verify multi-pass function fires
4. Compare output quality vs current pipeline

### Phase 4: Pre-generation for intermediates

- Pre-generate structural pass for default and popular selection combos
- Ensures first buyer interaction starts from Layer 3, not cold

### Phase 5: Upstash Redis (if needed)

- Upstash Redis available (free tier, already set up) if per-step I/O overhead becomes measurable after real-world testing

### Phase 6: Deprecate old patterns

- Remove compensatory post-pass logic (flash-post-pass, pro-post-pass — subsumed by specialty pass)
- Remove scoped-edit branching from old pipeline
- Clean up `resolvedPolicy` to use pass definitions instead of ad-hoc flags
- **Keep old code path for one deployment cycle** as revert option, then delete

## `/try` Demo Pipeline

**Keep on current single-pass pipeline.** The demo uses user-uploaded photos with no room type classification and a fixed set of 3-5 demo options. Surface count is already low enough for 1.5 to handle in a single pass. Latency matters more than perfection for a demo. Don't force it through multi-pass.

Prospect demo pages (`/for/`) are different — they're single-step kitchens backed by the full DB. They would benefit from the 3-pass kitchen pipeline and should be automatic once pass definitions are wired up (they use the same `generate-photo` Inngest function).

## Open Questions

1. **~~Flooring grouping~~**: ANSWERED — works in structural pass. No separate pass needed.

2. **~~Oven/range correction~~**: ANSWERED — does NOT fold into fixtures. Stays as separate conditional 1.5 pass after fixtures.

3. **~~Does fewer swatches fix the stain problem?~~**: ANSWERED — YES. 1.5 with 3 swatches nails driftwood stain that it under-applies with 8+. Pro post-pass can be eliminated for stain cabinets.

4. **Leave-one-out compatibility**: Keep leave-one-out hashing on `generated_images` for the final output? Yes — it powers Layer 2 (scoped +1), which is the workhorse. Orthogonal to pass-level caching.

5. **Prompt architecture**: `buildEditPrompt` works well for 1.5 passes (structural + fixtures) with no changes — just scope the subcategory IDs and selections. Specialty pass (Flash) needs a separate prompt builder with stronger anti-hallucination guardrails. Pantry food hallucination occurred in one run.

6. **resolvedPolicy evolution**: The current policy system (`flashPostPass`, `proPostPass`, `secondPass`) controls reactive post-passes. In the new world, pass definitions ARE the policy. This data model evolution is foundational — think about it early even if implemented later.
