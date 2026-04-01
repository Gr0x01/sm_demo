# Backsplash Pattern Generation Research (2026-03-27)

## Problem
AI image generation models cannot reliably reproduce unusual tile patterns (elongated hexagon picket tiles) on kitchen backsplashes. Common patterns (subway, herringbone, square) work fine. This is a critical blocker — if Finch can't handle the full range of backsplash options builders sell, the product doesn't work.

## What Works
- **Subway tiles** (4x16, 3x12): All models handle these well
- **Herringbone mosaic** (2x6): Works in isolation with generation rules
- **Square tiles** (6x6): Works fine
- **Beveled tiles**: Works fine
- **Isolation pass**: Single backsplash-only generation produces better color and pattern than full 19-item pass. Proven approach for common patterns.

## What Doesn't Work — Picket Tiles (Elongated Hexagon)

### Test Tile
Baker Blvd Picket Gloss Taupe — 2x4 inch elongated hexagon tiles on 11x12 inch sheet (3 across, 6 rows). HQ swatch + installed reference photo sourced and uploaded to storage.

### Approaches Tested (all failed for picket)

**1. Prompt-only (gpt-image-1.5)**
- Low-res SM swatch → produced subway tiles
- HQ closeup swatch → still not picket
- HQ swatch + reference photo → partially hexagonal but too large
- HQ swatch + reference + 2x4" dimensions → same, too large
- Explicit geometry description ("pointed hexagonal ends, interlocking staggered rows") → shape OK-ish, still too big
- Swatch scale context ("11x12 sheet with 18 tiles, each 2x4") → fixed scale but lost shape (reverted to subway)
- **Core issue**: gpt-image-1.5 can't hold both correct shape AND correct scale simultaneously for unusual patterns

**2. Masked inpainting (Gemini mask + gpt-image-1.5)**
- Generated B&W backsplash mask with Gemini Pro image model
- Sent masked room + swatch + reference to OpenAI
- Result: similar to swatch+reference without mask. No improvement.

**3. Texture composite (sharp tiling + gpt-image-1.5 refinement)**
- Tiled swatch texture onto masked backsplash area with sharp
- Sent composite to OpenAI for lighting/shadow pass
- Result: tile shape preserved but flat, no perspective. AI refinement pass didn't fix it convincingly.
- **Note**: Layered compositing approach was already tested and shelved (D88) — different generations have different lighting, creating seams.

**4. FLUX Pro v1 Fill (fal.ai, mask-based)**
- Standard guidance: horizontal linear tiles, not picket
- High guidance (10): hexagonal outlines visible but tiles way too large, distorted room
- **Worst overall room preservation** of any approach

**5. Multi-model (fal.ai)**
- Ideogram v3/edit: stacked stone look, not picket
- Reve/edit: elongated shapes, decent attempt but not clean
- Bria fibo-edit: endpoint not found
- Seedream v4: needs different API format, not tested

**6. Dimension strategies tested**
- "1.5x4 inch picket tiles" → AI interprets as small rectangular subway
- "elongated hexagon picket, vertical layout" → closer but not exact
- No dimensions (swatch only) → defaults to herringbone
- "1.5x4 inch elongated hexagon tiles" → still rectangular
- Sheet scale context → fixes size, loses shape
- Tile count ("8-10 across, 3-4 rows") → not tested yet

## Key Findings
1. **Shape vs scale tradeoff**: AI models can approximate the hexagonal shape OR get the tile count right, but not both simultaneously
2. **Reference photos help with shape** but don't solve scale
3. **Masking doesn't improve pattern quality** — it just constrains the edit area
4. **Texture compositing preserves shape** but lacks perspective/lighting realism
5. **No model tested can produce clean elongated hexagon tiles** at realistic backsplash scale
6. **This is not just a prompt problem** — it's a fundamental model limitation for niche geometric patterns

## Nano Banana (Gemini) Test Results (2026-03-28)

### Gemini 3 Pro (`gemini-3-pro-image-preview`) — v1 tests (production pipeline)
- **Subway**: Clean, correct pattern. Excellent room preservation.
- **Herringbone**: Nailed the herringbone V pattern. Great room preservation.
- **Picket A (no dims)**: Elongated hex shapes at roughly correct scale — better than 1.5 without dims.
- **Picket B (1x3 dims)**: Similar hex shapes, slightly smaller. More like squished ovals than pointed pickets.
- **Picket C (1x3 + reference photo)**: Best of v1 batch. Hex outlines visible. Still not crisp pointed-end pickets.

### Gemini 3 Pro v2 tests (corrected API: TEXT+IMAGE responseModalities)
- **A2 (swatch only)**: Hex-ish shapes, decent size. Room preservation good.
- **B2 (swatch + dims)**: Camera angle shifted slightly. Hex shapes visible but layout drifted.
- **C2 (swatch + dims + ref)**: Best overall room preservation + tile shape. Hex elongation present.
- **C3 (size context variant)**: Good room preservation, tiles visible with hex outline. Similar to C2.
- **D2 (Flash 3.1 + dims + ref)**: Comparable quality to Pro. Flash is competitive for isolation passes.

### editImage API tests (RawReferenceImage / StyleReferenceImage / SubjectReferenceImage)
- Test D (Raw + Style): Similar to generateContent approach, no improvement from typed references.
- Test E (Raw + Style + Subject): No meaningful improvement over generateContent with 3 images.

### Key Conclusions from Nano Banana Testing
1. **Gemini handles hex shapes slightly better than 1.5** — gets the outline more consistently
2. **Flash 3.1 is competitive with Pro** for backsplash isolation — similar quality, potentially faster
3. **Reference photos provide marginal improvement** — C vs A shows slightly better shape, not game-changing
4. **Dimensions help** — "1x3 elongated hexagon" gives the AI something to work with
5. **Room preservation**: 1.5 > Gemini Pro (NB occasionally shifts camera angle)
6. **editImage API**: Typed reference images (Style/Subject) don't improve results vs generic multimodal

### Flash Speed Test (3 runs, backsplash isolation)
- Model: `gemini-3.1-flash-image-preview`, 1K output, 3:2 aspect ratio
- Times: 34.2s (cold), 20.8s, 23.6s
- **Avg: ~22s warm, ~34s cold start**
- For context: 1.5 full pass is ~30-40s

## Architecture: Flash Post-Pass Isolation (2026-03-28, IMPLEMENTED)

### Decision
Use Gemini Flash as a **post-pass** (not pre-pass) for difficult surfaces. Pre-pass was tested first but 1.5 overwrites whatever the pre-pass renders — even with preservation rules, even at 2K resolution. Post-pass works because Flash is the last thing to touch the image and is good at changing one surface while preserving everything else.

### Pipeline (B ordering — tested best)
1. **Main pass (1.5, ~40s)**: Everything except isolated subcategories
2. **Second pass (1.5, ~27s, conditional)**: Slide-in range geometry fix
3. **Flash post-pass (Flash, ~30-55s, conditional)**: Isolated surface (e.g. backsplash) applied on top of everything

### Why Post-Pass Beat Pre-Pass
- **Pre-pass failed**: 1.5 overwrites pre-pass output regardless of preservation rules or resolution
- **Post-pass works**: Flash changes one surface while preserving the rest of the room
- Tested 2026-03-28 on SM Kinkade kitchen with picket backsplash + slide-in range

### Ordering Tests (2026-03-28)
| Order | Post-pass time | Total | Quality |
|-------|---------------|-------|---------|
| A: Flash BS → 1.5 oven | +58s | 98s | Good |
| **B: 1.5 oven → Flash BS** | **+82s** | **122s** | **Best — each model does its strength** |
| C: Flash combined (BS + oven) | +37s | 77s | Good — fastest option |

**Chosen: B ordering.** Each model handles what it's best at. 1.5 for geometry correction, Flash for surface replacement.

**C (combined) documented as fallback** if speed becomes an issue or models improve. One Flash pass for both backsplash + oven correction — 45s faster but oven geometry slightly less precise.

### Implementation
- Policy types: `flashPostPass` config on `ResolvedPhotoGenerationPolicy` — `{ reason, model, isolateSubcategories }`
- Only fires if at least one isolated subcategory is in the buyer's selections
- Inngest function: "flash-post-pass" step after "refine" (oven), lazy `await import("@google/genai")`
- Graceful fallback: if post-pass fails, keeps previous output
- Main pass excludes isolated subcategories from selections; they stay in scope so `generation_rules_when_not_selected` fire
- PostHog: `flash_post_pass` and `flash_post_pass_model` fields

### Activation
**Primary (option-driven):** Set `needs_isolation = true` on the option row. The pipeline scans selected options at runtime and auto-builds `flashPostPass`. No policy JSON needed.

**Override (policy-driven):** Add `flashPostPass` to step_photo_generation_policies for rare cases where ALL options in a subcategory need isolation on a specific photo (e.g. a tricky camera angle). Option flags and policy config are merged (unioned).

```json
// Policy override (rare — only when the photo angle is the problem, not the tile)
{
  "flashPostPass": {
    "reason": "photo angle always needs isolation",
    "model": "gemini-3.1-flash-image-preview",
    "isolateSubcategories": ["backsplash"]
  }
}
```

### DB Schema
- `options.needs_isolation boolean NOT NULL DEFAULT false` — per-option flag
- `ISOLATION_IMAGE_MODEL` in `src/lib/models.ts` — the model used (provider-agnostic name, not "flash")
- `generation_rules_when_not_selected` on backsplash subcategory — tells main pass to preserve the surface
- Boundary rule in backsplash `generation_rules` — constrains tile to wall between upper cabinets and countertop. Without this, dark tiles bleed below the countertop line.

### SM Options Flagged
- All 6 Baker Blvd Picket Gloss options (3 colors x 2 orientations) — `needs_isolation = true`
- All 5 Herringbone Matte Mosaic options (carbon, taupe, warm grey, glacier, white) — `needs_isolation = true`
- Subway, square, beveled — single pass (no flag)

### Prompt Findings During Live Testing (2026-03-28)
- **Boundary rule critical**: Without explicit "do NOT extend tile below the countertop line" rule, dark tiles (carbon, taupe herringbone) bled onto cabinet faces and range front. Both Flash and Pro had the same issue — it's a prompt problem, not a model problem.
- **Pro vs Flash**: Tested `gemini-3-pro-image-preview` as isolation model — identical output quality to Flash, no improvement on boundary issues. Switched back to Flash (cheaper, same results).
- **Dimensions must be in cache**: `unstable_cache` on `getCategoriesWithOptions` means DB updates to dimensions aren't picked up until dev server restart (local) or cache tag bust (prod). Direct DB updates bypass the admin API's cache invalidation.

## Previous Promising Leads

### Flat Tile Texture Generation
- gpt-image-1.5 CAN generate correct elongated hexagon picket tiles as a flat, head-on texture (swatch + reference as input, no room context)
- The `tile-patch/01_tile_texture.png` result nailed the shape, proportions, color, and grout lines
- The problem is only when asking the AI to render the pattern ON a backsplash in a room photo
- Shelved in favor of Flash pre-pass approach (simpler, no perspective warping needed)

### Scale + Geometry + Reference Combined
- Test 11 combined sheet scale context ("11x12 sheet, 3 across, 6 rows"), geometry description, and reference photo
- Got the scale right for the first time but lost hexagonal shape (reverted to subway)
- Close — if we can get the AI to hold both signals simultaneously, this could work without a two-pass system

## Not Yet Tried
- ControlNet/IP-Adapter approaches (structural conditioning)
- LoRA fine-tuning on picket tile patterns
- Tile count in prompt instead of inch dimensions

## Impact
This isn't just about SM's 6 picket options. When real builders onboard, we'll encounter tile patterns that don't render well in a single pass. The Flash pre-pass is the playbook: test the builder's backsplash options, and if any pattern is off, add a policy row. No code changes per builder.
