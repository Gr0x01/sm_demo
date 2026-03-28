# Partial Cache Architecture

**Status**: R&D validated (2026-03-28). Architecture confirmed. Not yet implemented.

## Problem

Buyers lock in most selections then flip one surface at a time (paint, backsplash, flooring, cabinets). Every flip triggers the full generation pipeline (~60-80s). The browse-then-flip behavior is the most common interaction pattern but gets the worst performance.

## Goal

Single-surface swaps complete in ~32s instead of 60-80s.

## R&D Results (2026-03-28)

Tested scoped single-surface editing on the SM Kinkade kitchen. Generated a baseline with 1.5 (all selections), then ran scoped edits changing one surface at a time.

### Model Comparison

Tested both Flash and 1.5 as the scoped edit model:

| Surface | Flash | 1.5 |
|---------|-------|-----|
| Countertop (calacatta → dark granite) | Clean, dramatic change | Clean, dramatic change |
| Cabinets (onyx → driftwood) | Changed, but **hallucinated a fridge** into empty alcove | Clean, no hallucination |
| Wall paint (subtle swap) | Subtle change | Subtle change |
| Flooring (subtle swap) | Barely visible | Barely visible |
| **Avg speed** | **~36s** | **~32s** |

**Decision: 1.5 is the default scoped edit model.** Better instruction following, no object hallucination, slightly faster. Flash reserved for surfaces where 1.5 can't handle the pattern (backsplash tiles, complex mosaics).

The model choice is per-subcategory, not global. Could be a `scoped_edit_model` field on the subcategory, defaulting to 1.5.

### Lighting / Quality Degradation

Each pass through a generative model flattens shadows and reduces dynamic range. This is inherent to re-generation, not fixable via prompting (tested explicit lighting preservation instructions — no meaningful difference).

**Constraint: cap scoped edit depth.** Allow chaining up to a max depth (e.g., 3), then force a full pipeline regeneration to reset the base. This bounds the cumulative flattening while keeping most swaps fast.

In the diff-based lookup: match against `generated_photos` rows where `scoped_edit_depth < MAX_DEPTH`. When depth is exceeded, run the full pipeline — this produces a fresh depth-0 image that resets the cycle. In a browsing session of 10 swaps, one or two will take ~70s instead of ~32s. Barely noticeable.

DB column: `scoped_edit_depth INTEGER DEFAULT 0` on `generated_photos`. Full pipeline results are depth 0. Each scoped edit inherits `base_depth + 1`.

### Subtle Swaps

Both models struggled with same-family color swaps (light gray → slightly warmer gray, similar wood tones). The change was barely visible. Dramatic swaps (white calacatta → dark granite, dark cabinets → light wood) worked cleanly.

This may be acceptable — if a buyer swaps between two similar options, a subtle visual change is arguably correct. Needs real-user validation.

### Test Script

`scripts/test-scoped-surface-edit.ts` — reusable for future testing.

```bash
npx tsx scripts/test-scoped-surface-edit.ts                              # full test (baseline + 4 surfaces, Flash)
npx tsx scripts/test-scoped-surface-edit.ts --model 1.5                  # use 1.5 for scoped edits
npx tsx scripts/test-scoped-surface-edit.ts --baseline path/to/image.png # reuse existing baseline
npx tsx scripts/test-scoped-surface-edit.ts --surfaces walls,cabinets    # test subset
npx tsx scripts/test-scoped-surface-edit.ts --cabinets kitchen-cab-color-alabaster  # specific alternate
```

Outputs land in `scripts/scoped-edit-test-outputs/<timestamp>/`.

## Architecture

### Approach 1: Diff-Based Scoped Editing (general case)

Handles any single-surface swap — walls, flooring, cabinets, countertop.

**How it works:**
- Store the full selection map with every cached image
- When a new request is a full cache miss, diff it against cached full-pipeline images for that step_photo
- If any cached image differs by exactly one subcategory → take that image, run a scoped 1.5 edit changing only the differing surface
- ~32s instead of 60-80s

**DB changes:**
```sql
-- On generated_photos:
selections_map JSONB       -- { "cabinet-color": "option-uuid", "countertop": "option-uuid", ... }
scoped_edit_depth INTEGER DEFAULT 0   -- 0 = full pipeline, N = Nth scoped edit in chain
```

**Diff logic:** App-side. Pull recent cached images for the step_photo where `scoped_edit_depth < MAX_DEPTH`, compare selection maps in JS. Small JSON objects, not a table scan.

**Scoped edit prompt structure:**
```
TASK: Edit this kitchen visualization. Change ONLY the [surface].

WHAT TO CHANGE:
[Surface] — apply the material/color from the attached swatch.
[dimensions if relevant]
Location: [spatial context]

DO NOT MODIFY (these must remain exactly as they currently appear):
- [list of all other surfaces]
- Room layout, camera angle, and perspective

LIGHTING: Preserve the exact lighting from the input image — shadow depth,
shadow direction, contrast, specular highlights, and ambient occlusion.

Photorealistic result.
```

**Key property:** Cache improves over time. Every full-pipeline image adds to the pool of potential bases. Later buyers have higher probability of single-surface match hits.

### Model Selection Per Surface

| Surface | Model | Why |
|---------|-------|-----|
| Cabinets, countertop, walls, flooring | 1.5 | Reliable, no hallucinations, ~32s |
| Backsplash (tile patterns) | Flash | 1.5 struggles with non-standard tile geometry |

Per-subcategory decision. Could be a `scoped_edit_model` field on subcategories, or derived from existing flags. Default: 1.5.

**Future optimization:** If backsplash scoped edit quality is poor (replacing existing tile vs painting on clean surface), add intermediate caching as a targeted layer. Don't build it upfront — validate first.
| Backsplash quality | Intermediate cache (#2) | Flash | Tile patterns need isolation + Flash handles patterns |
| Speed for any other surface | Diff-based scoped edit (#1) | 1.5 | Reliable, no hallucinations, ~32s |

They stack — approach #2 is a specialized fast path within the broader approach #1 lookup.

## Cache Lookup Flow

```
Request with selections S:

1. full_hash(S) hit → serve cached image (instant)

2. full_hash miss → diff S against cached images where scoped_edit_depth < MAX_DEPTH
   → single-subcategory match found?
   → pick model: Flash if changed surface is backsplash, 1.5 otherwise
   → scoped edit on that image (~32s)
   → cache result with scoped_edit_depth = base_depth + 1
   → Done

3. No single-surface match (or all candidates at max depth) → full pipeline
   → persist final with selections_map + scoped_edit_depth=0
   → ~60-80s
```

## Inngest Function Changes

```
// Pseudocode for generate-photo.ts

// Step 0: Check full cache (already exists)

// Step 1: Check for single-surface diff match (under max depth)
const MAX_DEPTH = 3
const diffMatch = step.run("check-diff-cache", async () => {
  // query generated_photos for this step_photo
  // WHERE scoped_edit_depth < MAX_DEPTH
  // find row where selections_map differs by exactly 1 key
  // prefer lowest depth (freshest base)
  // return { baseImage, baseDepth, changedSubcategory, useFlash } or null
})

if (diffMatch) {
  // Step 2a: Scoped edit (1.5 or Flash depending on surface)
  const result = step.run("scoped-edit", async () => {
    // 1.5 for most surfaces, Flash for isolated surfaces (backsplash)
  })
  step.run("persist", async () => {
    // save with full_hash + selections_map + scoped_edit_depth = baseDepth + 1
  })
  return
}

// Step 2b: Full pipeline (no diff match or all candidates at max depth)
const mainImage = step.run("generate-main", ...)
const refined = step.run("refine-oven", ...)
const final = step.run("post-pass", ...)
step.run("persist", ...) // full_hash + selections_map + scoped_edit_depth=0
```

## Storage Considerations

- `selections_map`: small JSONB column on existing rows, negligible.
- `scoped_edit_depth`: integer column, negligible.
- No new tables required. Everything lives on `generated_photos`.

## Final Screen: Full-Quality Regeneration

Scoped edits are depth-2 (slightly flatter shadows). During browsing that's fine — speed matters more than perfection. But the final summary/gallery screen is where the buyer sees their finished selections. These images get shared, saved, and brought to the design center.

**Pattern: preview during browsing, export at full quality.**

When the buyer reaches the final screen:
1. For each photo, check if the cached image is a scoped edit (`scoped_edit_depth > 0`)
2. If yes → trigger a full pipeline regeneration in the background for that photo's current selections
3. If no (already depth 0) → skip, it's already full quality
4. Show the scoped edit immediately while the full pipeline runs, swap in the high-quality version when it completes

This also benefits future buyers — the full pipeline result replaces the depth-2 image in the cache, so the next person with the same selections gets depth-1 quality instantly.

**UX considerations:**
- Buyers are committed by this point — a loading state is acceptable
- Could show a subtle quality indicator or shimmer while regenerating
- Multiple photos can regenerate in parallel
- If they go back and change selections, the cycle restarts (scoped edits for browsing, full pipeline on final screen)

## Open Questions

- **Subtle swap quality**: Same-family color swaps barely show. Is this acceptable or do we need more aggressive prompting for close colors? Real-user testing needed.
- **Per-subcategory model config**: Where to store `scoped_edit_model` — DB column on subcategories, or derive from existing flags (e.g., surfaces with `generation_rules` about tile patterns → Flash)?
