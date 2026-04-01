# Partial Cache Architecture

**Status**: R&D validated (2026-03-28). Architecture confirmed. Not yet implemented.

## Problem

Buyers lock in most selections then flip one surface at a time (paint, backsplash, flooring, cabinets). Every flip triggers the full generation pipeline (~60-80s). The browse-then-flip behavior is the most common interaction pattern but gets the worst performance.

## Goal

Single-surface swaps complete in ~32s instead of 60-80s.

## R&D Results (2026-03-28)

Tested scoped single-surface editing on the SM Kinkade kitchen. Generated a baseline with 1.5 (all selections), then ran scoped edits changing one surface at a time.

### Model Comparison

| Surface | Flash | 1.5 |
|---------|-------|-----|
| Countertop (calacatta → dark granite) | Clean, dramatic change | Clean, dramatic change |
| Cabinets (onyx → driftwood) | Changed, but **hallucinated a fridge** into empty alcove | Clean, no hallucination |
| Wall paint (subtle swap) | Subtle change | Subtle change |
| Flooring (subtle swap) | Barely visible | Barely visible |
| **Avg speed** | **~36s** | **~32s** |

**Decision: 1.5 is the default scoped edit model.** Better instruction following, no object hallucination, slightly faster. Flash reserved for surfaces where 1.5 can't handle the pattern (backsplash tiles, complex mosaics). Per-subcategory choice, not global.

### Lighting / Quality Degradation

Each pass through a generative model flattens shadows and reduces dynamic range. Inherent to re-generation, not fixable via prompting (tested explicit lighting preservation instructions — no meaningful difference).

**Constraint: cap scoped edit depth.** Allow chaining up to max depth (e.g., 3), then force a full pipeline regeneration to reset the base. In a browsing session of 10 swaps, one or two will take ~70s instead of ~32s.

### Subtle Swaps

Both models struggled with same-family color swaps (similar grays, similar wood tones). Dramatic swaps (white → dark granite, dark → light cabinets) worked cleanly. May be acceptable — subtle options should look subtle. Needs real-user validation.

### Test Script

`scripts/test-scoped-surface-edit.ts` — reusable for future testing.

```bash
npx tsx scripts/test-scoped-surface-edit.ts                              # full test (Flash)
npx tsx scripts/test-scoped-surface-edit.ts --model 1.5                  # use 1.5
npx tsx scripts/test-scoped-surface-edit.ts --baseline path/to/image.png # reuse baseline
npx tsx scripts/test-scoped-surface-edit.ts --surfaces walls,cabinets    # subset
```

Outputs land in `scripts/scoped-edit-test-outputs/<timestamp>/`.

## Architecture

### Diff-Based Scoped Editing

When a full hash miss occurs, find a cached image that differs by exactly one subcategory. Run a scoped edit on that image changing only the differing surface. ~32s instead of 60-80s.

### DB Changes

One column added to `generated_images`:

```sql
ALTER TABLE generated_images ADD COLUMN scoped_edit_depth INTEGER NOT NULL DEFAULT 0;
ALTER TABLE generated_images ADD COLUMN leave_one_out_hashes TEXT[];

CREATE INDEX idx_gi_photo_depth
  ON generated_images (step_photo_id, scoped_edit_depth)
  WHERE image_path != '__pending__';

CREATE INDEX idx_gi_loo_hashes
  ON generated_images USING GIN (leave_one_out_hashes)
  WHERE image_path != '__pending__';
```

No new tables. No `selections_map` column — `selections_json` already exists and carries the selection data (filter out `_`-prefixed metadata keys to get the raw selection map).

### Leave-One-Out Hash Lookup

The key insight for fast diff matching. Instead of pulling rows and diffing in JS, use pre-computed hashes and an indexed query.

**On persist:** For each subcategory in the scoped selection set, compute a hash of all selections EXCEPT that subcategory (plus cache version, prompt context, etc. — same context as the full hash). Store as `leave_one_out_hashes TEXT[]`.

Example for a kitchen with 5 scoped subcategories:
```
selections = { cabinets: A, countertop: B, backsplash: C, flooring: D, walls: E }

leave_one_out_hashes = [
  hash(countertop:B, backsplash:C, flooring:D, walls:E, _ctx...),  -- without cabinets
  hash(cabinets:A, backsplash:C, flooring:D, walls:E, _ctx...),    -- without countertop
  hash(cabinets:A, countertop:B, flooring:D, walls:E, _ctx...),    -- without backsplash
  hash(cabinets:A, countertop:B, backsplash:C, walls:E, _ctx...),  -- without flooring
  hash(cabinets:A, countertop:B, backsplash:C, flooring:D, _ctx...), -- without walls
]
```

**On lookup:** Compute the same leave-one-out hashes for the incoming request. Query:

```sql
SELECT image_path, scoped_edit_depth, selections_json
FROM generated_images
WHERE step_photo_id = $1
  AND scoped_edit_depth < $2          -- MAX_DEPTH
  AND leave_one_out_hashes && $3      -- array overlap (GIN-indexed)
  AND image_path != '__pending__'
ORDER BY scoped_edit_depth ASC
LIMIT 1
```

**Why this works:** If two selection sets share a leave-one-out hash, they differ by exactly one subcategory (the one that was "left out" of the matching hash). The full hash check (step 1) already catches identical selections, so any overlap here guarantees a single-surface diff.

**Identifying the changed subcategory:** After getting the matching row, compare its leave-one-out hashes against the request's hashes in JS. The matching hash corresponds to a specific subcategory index — that's the one that changed. Then diff `selections_json` for that subcategory to find old → new option.

### Cache Lookup Flow

```
Request with selections S:

1. full_hash(S) hit → serve cached image (instant)
   - If multiple depths exist for same hash, prefer depth 0

2. full_hash miss → leave-one-out query (single indexed SQL call)
   → match found?
   → identify changed subcategory
   → pick model: Flash if backsplash, 1.5 otherwise
   → scoped edit (~32s)
   → cache result with scoped_edit_depth = base_depth + 1
   → Done

3. No match (or all candidates at max depth) → full pipeline
   → persist with scoped_edit_depth=0
   → ~60-80s
```

### Scoped Edit Prompt

The test script's hardcoded `buildScopedEditPrompt` is R&D only. The production version must consume the same policy/rules system as `buildEditPrompt`:

- `generation_rules` from subcategories and options
- `generation_rules_when_not_selected` (negative guards)
- `promptPolicyOverrides` from the DB policy system
- `spatialHints` per subcategory
- `sceneDescription` / `photoBaseline`
- Appliance rules, flooring boundary rules

The "preserve" list should be auto-generated from the option lookup (what's NOT being changed), not hardcoded per surface. This is the bulk of the implementation work.

### Model Selection Per Surface

| Surface | Model | Why |
|---------|-------|-----|
| Cabinets, countertop, walls, flooring | 1.5 | Reliable, no hallucinations, ~32s |
| Backsplash (tile patterns) | Flash | 1.5 struggles with non-standard tile geometry |

Per-subcategory decision. Could be a `scoped_edit_model` field on subcategories, or derived from existing flags. Default: 1.5.

Backsplash scoped editing (replacing existing tile in a final image) hasn't been tested yet but is likely fine — Flash already renders backsplash well regardless of what's currently on the surface. Quick validation with `--surfaces backsplash` on the test script before building.

## Inngest Function Changes

```
// Pseudocode for generate-photo.ts

// Step 0: Check full cache (already exists)

// Step 1: Leave-one-out lookup (single SQL query)
const MAX_DEPTH = 3
const diffMatch = step.run("check-diff-cache", async () => {
  // compute leave-one-out hashes for request selections
  // query generated_images with array overlap
  // identify changed subcategory from matching hash
  // prefer lowest depth
  // return { baseImage, baseDepth, changedSubcategory, useFlash } or null
})

if (diffMatch) {
  // Step 2a: Scoped edit (1.5 or Flash depending on surface)
  const result = step.run("scoped-edit", async () => {
    // build scoped prompt using policy system
    // 1.5 for most surfaces, Flash for backsplash
  })
  step.run("persist", async () => {
    // save with full_hash + scoped_edit_depth = baseDepth + 1
    // compute and store leave_one_out_hashes for this image too
  })
  return
}

// Step 2b: Full pipeline (no match or all at max depth)
const mainImage = step.run("generate-main", ...)
const refined = step.run("refine-oven", ...)
const final = step.run("post-pass", ...)
step.run("persist", ...) // scoped_edit_depth=0, leave_one_out_hashes computed
```

## Final Screen: Full-Quality Regeneration (Optional)

Scoped edits get progressively flatter. Most buyers won't notice — they're comparing options, not pixel-peeping shadows. But for buyers who want the best quality (sharing images, bringing to design center), an optional final-screen regeneration can produce depth-0 images.

**Not a requirement. A nice-to-have.**

If implemented:
1. Check route returns `scoped_edit_depth` alongside image URL
2. Client checks if any photo has `scoped_edit_depth > 0`
3. If yes → trigger full pipeline regeneration in background (main + oven + post-pass)
4. Show the scoped edit immediately, swap in depth-0 version when ready
5. Full pipeline result replaces depth>0 in cache — benefits future buyers

**Considerations:**
- Consider a separate Inngest concurrency pool for quality upgrades (avoid starving real-time generation)
- If buyer goes back and changes selections, cycle restarts

## Implementation Estimate

**Complexity: Medium. ~2-3 days focused work.**

| Task | Effort |
|------|--------|
| DB migration (1 column + indexes) | 1 hour |
| Leave-one-out hash computation + persist | 2-3 hours |
| Diff lookup query + subcategory identification | 2-3 hours |
| `buildScopedEditPrompt` using policy system | 4-6 hours (the bulk) |
| Inngest function branch (scoped vs full) | 3-4 hours |
| Depth-aware cache lookup in check route | 1-2 hours |
| Final-screen regen trigger + client changes | 3-4 hours |
| Tests | 3-4 hours |

**Risk: Low-medium.** Fallback is always "run full pipeline." Scoped edits are a fast path, not a required path. If diff lookup finds nothing, existing pipeline runs unchanged.

## Open Questions

- **Subtle swap quality**: Same-family color swaps barely show. Acceptable or needs more aggressive prompting? Real-user testing needed.
- **Per-subcategory model config**: Where to store `scoped_edit_model` — DB column on subcategories, or derive from existing flags?
- **Backfill**: Existing `generated_images` rows have no `leave_one_out_hashes`. Scoped edits only become available as new images are generated with the hashes. Could run a backfill script, but not required — cache builds organically.
