# Room Generation Playbook

How to set up, tune, and troubleshoot AI-generated room photos in the Finch pipeline.

## 1. Pipeline Overview

Two pipelines exist. Multi-pass is the new approach (feature-flagged). Legacy single-pass is the default.

### Multi-Pass Pipeline (recommended for kitchens)

```
Structural (OpenAI 1.5, ~38s)
  Cabinets, countertop, flooring, paint — 3-6 swatches
    │
    ▼
Fixtures (OpenAI 1.5, ~37s)
  Hardware, sink, faucet, lighting, range — 2-5 swatches
    │
    ▼
Oven (OpenAI 1.5, conditional)
  Slide-in range geometry correction. Only fires for slide-in options.
    │
    ▼
Specialty (Gemini Flash, ~30s)
  Backsplash tile. Always Flash, never 1.5.
    │
    ▼
Persist: upload final JPEG → Supabase Storage, upsert generated_images row
```

### Legacy Single-Pass Pipeline (default)

```
Main Pass (OpenAI 1.5)
  Hero photo + all swatches → edited room image
  ~35-45s
    │
    ▼
Oven/Refine (1.5, conditional) → Pro Post-Pass (Gemini Pro, conditional)
  → Flash Post-Pass (Gemini Flash, conditional) → Persist
```

**Key files:**
- `src/lib/generate.ts` — `buildEditPrompt`, `deriveGenerationContext`, linked option resolution
- `src/lib/pass-definitions.ts` — multi-pass subcategory classification
- `src/inngest/functions/generate-photo-multipass.ts` — multi-pass pipeline
- `src/inngest/functions/generate-photo.ts` — legacy single-pass pipeline
- `src/lib/photo-generation-policy.ts` — policy resolution (DB-backed + option-driven)
- `src/lib/models.ts` — centralized model constants

---

## 1b. Multi-Pass Pipeline

Feature-flagged alternative to the single-pass pipeline. Splits generation into sequential passes with fewer swatches per pass. Better quality for kitchens and complex rooms.

```
Structural (1.5, ~38s)   cabinets, countertop, flooring, paint
     ↓
Fixtures (1.5, ~37s)     hardware, sink, faucet, lighting, range
     ↓
Oven (1.5, conditional)  slide-in range geometry correction
     ↓
Specialty (Flash, ~30s)  backsplash (always Flash, never 1.5)
     ↓
Persist
```

**Key files:**
- `src/lib/pass-definitions.ts` — `derivePassDefinitions` classifies subcategories into pass groups
- `src/inngest/functions/generate-photo-multipass.ts` — pipeline orchestration
- `memory-bank/project/multi-pass-pipeline-architecture.md` — full architecture doc

### Enabling Multi-Pass on a Photo

1. **Set `useMultiPass: true`** in the photo's `step_photo_generation_policies` JSONB:
   ```sql
   UPDATE step_photo_generation_policies
   SET policy_json = policy_json || '{"useMultiPass": true}'::jsonb
   WHERE step_photo_id = '<photo-id>'
   ```

2. **Verify subcategory flags are correct:**
   - `is_appliance = true` on appliance subcategories (range, refrigerator, dishwasher). Hardware, sink, faucet, lighting are classified by slug pattern, not this flag.
   - `needsIsolation` on backsplash options that need tile pattern isolation (herringbone, picket, etc.). Even without this flag, backsplash always routes to specialty by slug.

3. **Verify slug naming:**
   Pass classification uses slug patterns. These must be present in the subcategory slug:
   - Fixtures: `hardware`, `faucet`, `sink`, `lighting`, `fan`, `refrigerator`, `range`, `dishwasher`
   - Specialty: `backsplash`
   - Everything else → structural

4. **Check `-none` options exist** for appliances that may not be selected (e.g. `refrigerator-none`). These are excluded from pass definitions so negative guard rules fire correctly.

5. **Test locally** with Inngest dev. Watch the terminal for `[multipass]` log lines confirming pass-structural → pass-fixtures → pass-specialty → persist.

### When to Use Multi-Pass vs Single-Pass

| Room | Recommendation | Why |
|------|---------------|-----|
| Kitchen (10+ subcategories) | Multi-pass | Too many swatches for single pass. Stain cabinets need fewer swatches to apply correctly. |
| Bathroom (7-12 subcategories) | Test both | May benefit from structural + specialty split if shower tile needs isolation. |
| Bedroom/living (5-8 subcategories) | Single-pass | Low swatch count, 1.5 handles fine in one pass. |

### How Caching Works with Multi-Pass

4-layer cache hierarchy:
1. **Full hash match** — identical selections → serve cached final image (instant)
2. **Scoped +1 edit** — one surface changed on a cached final image (~32s). Skipped for specialty surfaces (backsplash falls through to Layer 3 so Flash handles it).
3. **Intermediate pass cache** — `pass_cache` table stores each pass's output. Changing backsplash? Structural + fixtures cached, only specialty re-runs from cached fixtures output (~30s).
4. **Full cold generation** — all passes from hero photo (fallback)

### Pass Classification Gotchas

- **Countertop edge** — classified as structural but not visible in photos. Should be excluded from photo scope (not pass classification).
- **Island cabinet color** — usually merged into perimeter cabinet entry by `resolveLinkedOptions` when same color. When different, both appear in structural pass.
- **Slide-in range** — goes to fixtures pass first (gets placed), then oven correction pass fixes geometry. Only fires when option slug contains `slide-in`.

---

## 2. Room Setup Checklist

When adding a new room photo to the pipeline:

1. **Upload hero photo** to Supabase Storage (`rooms/` bucket)
2. **Set `subcategory_ids`** — ONLY subcategories whose surfaces are clearly visible in the photo (see [Photo Scoping Rules](#3-photo-scoping-rules))
3. **Write `photo_baseline`** — factual description of what's in the base photo (see [Photo Baseline Guide](#5-photo-baseline-guide))
4. **Write `spatial_hint`** — camera angle, room layout, zone positions (see [Spatial Hints Guide](#4-spatial-hints-guide))
5. **Set step-level `spatial_hints`** — per-subcategory WHERE instructions
6. **Set `remap_accent_as_wall_paint`** — `true` for rooms where accent color applies (primary bed/bath)
7. **Add generation policies** if the photo has position-sensitive objects or zone boundaries (see [Generation Policy Patterns](#7-generation-policy-patterns))
8. **Verify `generation_rules`** on relevant subcategories — both `when_selected` and `when_not_selected`
9. **Verify option-level flags** — `needsIsolation` on tiles, `dimensions` on backsplash/tile, "wood STAIN" in generation_rules on stain options
10. **Test 3-5 generations** with varied selections. Check for hallucination, wrong placement, zone bleed.
11. **Bump `GENERATION_CACHE_VERSION`** in `src/lib/generate.ts`

---

## 3. Photo Scoping Rules

**This is the single highest-impact quality lever.** Over-scoping (including invisible subcategories) causes hallucination and degrades swatch accuracy. Under-scoping misses surfaces the buyer expects to see changed.

### Include
- Subcategories whose surfaces are **clearly visible** in the photo
- Surfaces visible through doorways IF you want the AI to edit them (and have spatial hints to target them)

### Exclude
- Subcategories not visible in the photo, even if they're in the step's sections
- Structural upgrades that don't have a visible surface (trash can cabinet, under-cabinet lighting, light rail, glass cabinet door) unless clearly visible
- Appliances not visible in the frame

### Red Flags
- **>15 subcategories on a single photo** — almost certainly over-scoped. Review each one.
- **Invisible appliances in scope** — the model will hallucinate them into existence
- **"Structural" subcategories** with no visible surface — model invents geometry

### Room-Type Starting Points
| Room Type | Typical Sub Count | Notes |
|-----------|------------------|-------|
| Bedrooms | 5-8 | Paint, flooring, trim, fan, door |
| Bathrooms | 7-12 | Vanity, cabinets, tile, fixtures, mirrors |
| Kitchens | 10-15 | Cabinets, counters, backsplash, appliances, paint, flooring |
| Living/Great Rooms | 8-13 | Paint, flooring, fireplace, trim, wainscoting |
| Multi-Zone | varies | Sum of visible items across zones; needs boundary rules |

### Proven Example: Kitchen-Close Scoping Fix
Kitchen-close had 19 subcategories including 6 not visible (dishwasher, trash can, light rail, glass cabinet door, under-cabinet lighting, cabinet style whole house). Model hallucinated a dishwasher and degraded swatch accuracy. Trimmed to 13 visible subcategories. Hallucination eliminated, swatch matching improved dramatically.

---

## 4. Spatial Hints Guide

Three levels of spatial hints, each serving a different purpose:

### Per-Photo `spatial_hint` (on step_photos)
Describes the camera angle and room layout. Helps the model understand the physical space.

Good example:
> "Open living room viewed from the left side toward the back-right corner. Vaulted ceiling with exposed white beams; ceiling fan hangs from the peak. The BACK WALL has two zones: smooth painted drywall on the lower-left, fireplace on the right. A window is on the RIGHT WALL beside the fireplace corner."

Bad example:
> "Living room with fireplace"

### Per-Subcategory `spatial_hints` (on steps, JSON map)
Maps subcategory_id to WHERE in the photo to apply that surface. This is the "apply to" text that appears in the prompt.

Good examples:
- `"backsplash"` → `"the narrow strip of wall between upper cabinets and countertop on the back wall"`
- `"kitchen-cabinet-color"` → `"all perimeter cabinet doors and drawer fronts along the walls — both upper and lower rows. NOT the island."`
- `"floor-tile-color"` → `"bathroom floor tile throughout the bathroom zone"`

Bad example:
- `"common-wall-paint"` → `"walls"` (too vague — model doesn't know which walls)

### Exclusion Clauses
Use ". NOT the island" or " — NOT the perimeter" to restrict placement. These are automatically stripped by `resolveLinkedOptions` when a "Match to Main" option merges zones.

### Step-Level `scene_description` (on steps)
Optional overall scene context. Less important than photo-level hints but helps frame the room type.

---

## 5. Photo Baseline Guide

The `photo_baseline` field on `step_photos` describes what's actually in the base photo. The model uses this to understand what to preserve vs. change.

### What to Include
- **Surfaces and materials**: "white shaker cabinets, gray granite counters, subway tile backsplash"
- **Fixtures and appliances**: "stainless freestanding range, undermount sink"
- **Room structure**: "vaulted ceiling with beams, two windows on the left wall"
- **Visible adjacent rooms**: "doorway on the right leads to en-suite bathroom; through it, a vanity and tile floor are visible"
- **Negative facts**: "No TV, media wall, or built-ins in this photo" (prevents hallucination)
- **Flooring zones**: "LVP in the kitchen, carpet visible in the hallway through the doorway"

### What NOT to Include
- Style preferences or desired outcomes (this isn't a generation prompt)
- Color names that might conflict with swatch authority
- Instructions (those go in generation_rules and policies)

### Critical Pattern: Negative Facts
The model tends to hallucinate common room objects. If something is NOT in the photo but commonly expected, say so explicitly:
- "This room has no TV, media wall, built-ins, or cabinetry and none should be added."
- "No toilet is visible in this photo."
- "No shower or tub visible through this doorway."

---

## 6. Generation Rules Guide

Three levels of rules, all contributing to the `SURFACE & PLACEMENT RULES` block in the prompt:

### Subcategory `generation_rules` (when selected)
Always included when the subcategory appears in selections. Use for surface-specific constraints.

Examples:
- Backsplash: boundary rules, tile pattern matching from swatch
- Cabinet color: perimeter-only or island-only restriction
- Sink/faucet: position lock ("keep in exact same cutout position")
- Wall paint: zone rules when accent color is also selected

### Subcategory `generation_rules_when_not_selected` (negative guards)
Included when the subcategory is in the photo's scope but NOT in the buyer's selections. Critical for preventing hallucination.

Must-have negative guards:
- **Wainscoting**: "Do NOT add any wainscoting, paneling, shiplap..."
- **Crown molding**: "If no crown molding, do NOT add any"
- **Backsplash**: "Preserve the existing backsplash exactly as shown"
- **Fireplace mantel accent**: "Keep fireplace wall detailing unchanged"

### Option `generation_rules` (per-option)
Override rules for specific options. Common patterns:
- **Stain marker**: "This selection is a wood STAIN, not a paint. Reproduce grain texture." (triggers Pro post-pass)
- **Freestanding range**: "Include raised backguard"
- **Slide-in range**: "NO raised backguard, backsplash visible behind cooktop"
- **Brick hearth**: "Match mortar color, brick size, and laying pattern from swatch"
- **Painted brick**: "Brick mortar lines must remain visible under paint coat"

### Swatch Authority Rule
The swatch image is the ONLY appearance authority. Never send option names or text descriptors alongside swatches — the model treats text as higher authority and overrides the swatch.

The `dimensions` field is the one exception: pure measurements (e.g. "4x16", "2x6 inch herringbone mosaic") that supplement the swatch for scale context. No color or material words in dimensions.

**Dimensions must describe installed appearance**, not product specs:
- Good: "2x4 inch elongated hexagon picket tiles. On an 18-inch backsplash you should see 8+ rows."
- Bad: "8 tiles on 11x12 sheet"

---

## 7. Generation Policy Patterns

`step_photo_generation_policies` — JSON records attached to specific photos for photo-specific behavior that can't be expressed through subcategory/option rules alone.

### When to Create a Policy
- Photo has position-sensitive objects (fireplace, appliance alcoves)
- Photo shows multiple zones (kitchen + living room, bathroom + closet)
- Photo needs structural override (wainscoting style change from base photo)
- Photo needs a conditional second pass (slide-in range geometry)

### Pattern: Position Lock
```json
{
  "promptOverrides": {
    "invariantRulesAlways": [
      "FIREPLACE POSITION LOCK: The fireplace is on the right portion of the BACK WALL. Do NOT relocate, mirror, or redraw it."
    ]
  }
}
```

### Pattern: Conditional Position Lock (when selected / when not selected)
```json
{
  "promptOverrides": {
    "invariantRulesWhenSelected": {
      "refrigerator": ["Place the refrigerator in the empty wall opening to the left of the pantry door."]
    },
    "invariantRulesWhenNotSelected": {
      "refrigerator": ["Keep the refrigerator opening empty. Never convert it into cabinetry."]
    }
  }
}
```

### Pattern: Zone Boundary
```json
{
  "promptOverrides": {
    "invariantRulesAlways": [
      "Do NOT add any kitchen structures in the great-room area: no islands, cabinets, countertops, appliances.",
      "Kitchen edits are allowed ONLY on existing kitchen elements in the background."
    ]
  }
}
```

### Pattern: Second Pass (geometry correction)
```json
{
  "secondPass": {
    "reason": "slide_in_range",
    "prompt": "Correct ONLY the range geometry: no backguard, backsplash visible behind cooktop, one oven door.",
    "inputFidelity": "low",
    "whenSelected": {
      "subId": "range",
      "optionIds": ["range-ge-gas-slide-in", "range-ge-gas-slide-in-convection"]
    }
  }
}
```

### Pattern: Flash Post-Pass (policy-driven isolation)
```json
{
  "flashPostPass": {
    "reason": "backsplash tile isolation",
    "model": "gemini-3.1-flash-image-preview",
    "isolateSubcategories": ["backsplash"]
  }
}
```
Note: most isolation is option-driven (`needsIsolation` flag), not policy-driven. Use policy-driven only when ALL options in a subcategory need isolation.

---

## 8. Post-Pass Reference

| Post-Pass | Trigger Mechanism | Model | Fires When | Interaction |
|-----------|------------------|-------|------------|-------------|
| Oven/Refine | Policy `secondPass` | gpt-image-1.5 | `whenSelected` matches | Runs after main pass. Skipped on scoped edits. |
| Flash | Option `needsIsolation` flag | gemini-3.1-flash-image-preview | Any selected option has flag | Excluded from main pass. Suppressed when Pro fires. |
| Pro | "wood STAIN" in option rules | gemini-3-pro-image-preview | Any selected option has stain marker | Stays in main pass. Absorbs Flash subs when both needed. |

**Option-driven triggers are automatic.** Set the flag or marker on the option data, and the pipeline detects it in `deriveGenerationContext`. No code changes needed.

**Pro absorbs Flash:** When both stain and isolation are needed, Pro handles everything (cabinets + backsplash). Flash is suppressed. Pro handles the combined task better than splitting across models.

**Scoped edits flow through post-passes:** After the scoped edit, the same Flash/Pro post-pass logic runs on top. This prevents backsplash drift on single-surface changes.

---

## 9. Known Failure Modes

### 1. Phantom Objects
**Symptoms**: Dishwasher appears in a photo with no dishwasher. TV/media wall added. Extra cabinetry fills empty spaces.
**Cause**: Invisible subcategory in scope, or missing anti-hallucination baseline.
**Fix**: Remove invisible subcategories from `subcategory_ids`. Add negative facts to `photo_baseline`.

### 2. Surface Bleed
**Symptoms**: Backsplash tile extends below countertop onto cabinet faces. Kitchen flooring bleeds into living room through doorway. Bathroom tile covers closet floor.
**Cause**: Missing boundary rules.
**Fix**: Add boundary rules to subcategory `generation_rules`. Add flooring boundary rules (conditional, baked into prompt). Add zone boundary policies for multi-zone photos.

### 3. Pattern/Texture Loss
**Symptoms**: Backsplash pattern doesn't match swatch (wrong tile size, layout, or shape). Especially common with herringbone, picket, and mosaic tiles.
**Cause**: Too many swatches dilute attention to any single pattern. The main pass (11+ swatches) can't faithfully reproduce complex tile patterns.
**Fix**: Set `needsIsolation = true` on the option. Pipeline will run a dedicated Flash/Pro post-pass with just that swatch.

### 4. Color Under-Application
**Symptoms**: Wood stain appears too light (Driftwood renders near-white). Color change barely visible.
**Cause**: 11+ swatches dilute model's attention to dramatic color changes. "Subtle color enforcement" rule helps with near-matches but not with stains.
**Fix**: Add "wood STAIN" marker to option `generation_rules`. Pipeline triggers Pro post-pass focused on cabinet surfaces only.

### 5. Spatial Displacement
**Symptoms**: Refrigerator placed next to range instead of in alcove. Sink moved. Fireplace migrates to different wall.
**Cause**: Missing position lock rules. Model freely rearranges when adding/changing objects.
**Fix**: Add position lock in generation policy (`invariantRulesWhenSelected`/`invariantRulesWhenNotSelected`). Add anti-cabinetry rule.

### 6. Near-Identical Color Skipped
**Symptoms**: Buttercream selected but white stays white. Warm gray selected but cool gray unchanged.
**Cause**: Model decides existing surface is "close enough" and skips the edit.
**Fix**: Already baked into prompt: "Apply every swatch even when the existing surface appears to already be a similar color."

### 7. Layout Mutation
**Symptoms**: Room rearranged, cabinets added, windows moved, ceiling height changed.
**Cause**: Model over-interprets edit instructions and modifies layout.
**Fix**: Already baked into prompt: "If an edit is difficult, under-edit the finish rather than changing layout, geometry, or object position."

### 8. Scoped Edit Degradation
**Symptoms**: Quality drops after 3+ chained edits. Appliance add/remove causes spatial displacement.
**Cause**: Compounding artifacts from chained edits. Scoped edits designed for surface swaps, not structural changes.
**Fix**: Depth cap at 3 (built into pipeline). Appliance add/remove (option slug ending in `-none`) automatically skips scoped edit and falls through to full pipeline.

### 11. Scoped Edit Preserve-List Contradiction
**Symptoms**: Hardware placed on island side panel. Fixture added where none existed. Object type appears in wrong location during scoped edit.
**Cause**: `buildScopedEditPrompt` catch-all preserve line ("All appliances, fixtures, hardware, and lighting") contradicts the change instruction when hardware/fixture/lighting IS the thing being changed. Model sees "change hardware" + "preserve hardware" and misinterprets placement.
**Fix**: Catch-all preserve line now dynamically excludes the type being changed (`generate.ts` line ~370). When hardware is the changed subcategory, preserve line omits "hardware."

### 9. Wainscoting/Panel Spreading
**Symptoms**: Wainscoting appears on walls where it shouldn't. Panel style changes to a different pattern.
**Cause**: Missing placement instructions. Missing negative guard when not selected.
**Fix**: Specific wall placement instructions in generation policy. `generationRulesWhenNotSelected`: "Do NOT add any wainscoting, paneling, shiplap."

### 10. Fireplace Position Drift
**Symptoms**: Fireplace moves to a different wall or changes proportion.
**Cause**: Model's default behavior relocates focal points.
**Fix**: Position lock policy with exact wall identification: "The fireplace is on the right portion of the BACK WALL. Do NOT relocate, mirror, or redraw."

---

## 10. Room-Type Guidance

### Kitchens
Highest complexity. Expect all three post-pass types.
- **Backsplash isolation**: set `needsIsolation` on complex tile options (picket, herringbone, mosaic)
- **Cabinet stain**: add "wood STAIN" marker to stain options
- **Range**: policy-driven second pass for slide-in geometry
- **Island vs perimeter**: separate subcategories with exclusion rules. "Match to Main" linked option for same-color.
- **Fridge alcove**: position lock policy (when selected AND when not selected)
- Typical visible subs: 10-15

### Bathrooms
Fixture positions matter. Zone boundaries critical for combo photos.
- **Vanity/tub/shower position**: note positions in baseline and spatial hint. Consider position lock policy if fixtures are close together.
- **Cabinet stain**: same "wood STAIN" marker pattern as kitchen (already set on SM bath cabinet options)
- **Multi-fixture photos**: describe which fixtures are visible, which are NOT ("no toilet visible in this photo")
- **Floor tile**: confine to bathroom zone in spatial hints
- **remap_accent_as_wall_paint**: `true` when accent color applies in this room
- Typical visible subs: 7-12

### Bedrooms
Simplest rooms. Flooring type is the main complexity.
- **Carpet vs hard surface**: conditional flooring resolved by `resolveScopedFlooringSelections`
- **Accent vs wall paint**: `remap_accent_as_wall_paint = true` for primary bedroom/bath
- **Bathroom through doorway**: scope bathroom surfaces only if visible AND you want them edited. Add flooring boundary rules.
- **Negative facts**: "Do not add bathroom fixtures or structures into this bedroom view."
- Typical visible subs: 5-8

### Living/Great Rooms
Fireplace and wainscoting are the main challenges.
- **Fireplace position lock**: always add a policy. Specify exact wall.
- **Wainscoting placement**: specify exact walls. Negative guard when not selected.
- **Multi-zone views**: if kitchen is visible, scope kitchen subs but add zone boundary policy
- **Fireplace components**: surround, hearth, mantel, mantel accent are all separate subcategories with different surfaces
- Typical visible subs: 8-13

### Multi-Zone Photos
Most dangerous for hallucination. Treat as a high-risk setup.
- **Zone boundary policy required**: "Do NOT add [zone A] structures in [zone B]"
- **Per-zone spatial hints**: each subcategory's hint should specify which zone it targets
- **Flooring boundaries**: different zones may have different flooring. Explicit boundary rules needed.
- **Examples**: Bath & Closet (bath/closet/bedroom zones), Great Room (living/kitchen zones), Primary Bedroom with bathroom doorway

---

## 11. Audit Checklist

For any existing room photo, verify:

- [ ] **Scoping**: `subcategory_ids` only includes subcategories whose surfaces are clearly visible
- [ ] **Baseline**: `photo_baseline` is accurate, includes negative facts for absent-but-expected objects
- [ ] **Photo spatial hint**: `spatial_hint` describes camera angle, zone layout, key landmarks
- [ ] **Sub spatial hints**: per-subcategory `spatial_hints` exist for all scoped subcategories
- [ ] **Accent remapping**: `remap_accent_as_wall_paint` is correct
- [ ] **Negative guards**: `generationRulesWhenNotSelected` on hallucination-prone subs (wainscoting, crown, backsplash, fireplace accent)
- [ ] **Stain markers**: all stain options have "wood STAIN" in `generation_rules`
- [ ] **Isolation flags**: complex tile options have `needsIsolation = true`
- [ ] **Dimensions**: tile/plank options have `dimensions` describing installed appearance
- [ ] **Position locks**: appliance alcoves, fireplace, fixtures have position-lock policies
- [ ] **Zone boundaries**: multi-zone photos have boundary policies
- [ ] **Flooring boundaries**: doorway/multi-room views have flooring boundary rules
- [ ] **Test generations**: 3-5 varied selections produce correct results

---

## Quick Triage Order

When debugging a bad generation:

1. Check selection payload is correct
2. Check option-to-swatch mapping is correct
3. Check `subcategory_ids` — is an invisible sub causing hallucination?
4. Check prompt text includes expected rules (not stale cache)
5. Check cache version was bumped after last change
6. Check spatial hints are specific enough
7. Check for missing negative guards
8. Only then consider adding post-pass logic or model-level fixes

---

## Cache Hygiene

- Bump `GENERATION_CACHE_VERSION` in `src/lib/generate.ts` on every semantic pipeline change
- Confirm `_cacheVersion` in saved metadata before judging whether a fix worked
- Demo pipeline has separate `DEMO_GENERATION_CACHE_VERSION` in `src/lib/demo-generate.ts`
- After DB changes to generation_rules/spatial_hints/policies: `unstable_cache` has 5-minute revalidation for steps. In dev, nuke `.next` directory. In prod, bust via revalidate tags on admin save.
