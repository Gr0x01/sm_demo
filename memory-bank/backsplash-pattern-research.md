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

## Most Promising Lead: Flat Tile Texture Generation
- gpt-image-1.5 CAN generate correct elongated hexagon picket tiles as a flat, head-on texture (swatch + reference as input, no room context)
- The `tile-patch/01_tile_texture.png` result nailed the shape, proportions, color, and grout lines
- The problem is only when asking the AI to render the pattern ON a backsplash in a room photo
- **Next experiment**: Two-pass system:
  1. Pass 1 (Nano Banana or gpt-image-1.5): Generate flat tile texture
  2. Composite texture onto backsplash mask with perspective warp (code, not AI)
  3. Pass 2 (gpt-image-1.5): Full room generation with pre-edited backsplash as input photo — AI handles lighting/blending/perspective naturally
- Also test: Nano Banana for the full backsplash-in-room pass (might handle geometry differently than gpt-image-1.5)

## Also Promising: Scale + Geometry + Reference Combined
- Test 11 combined sheet scale context ("11x12 sheet, 3 across, 6 rows"), geometry description, and reference photo
- Got the scale right for the first time but lost hexagonal shape (reverted to subway)
- Close — if we can get the AI to hold both signals simultaneously, this could work without a two-pass system

## Not Yet Tried
- Nano Banana (pass 1) → gpt-image-1.5 (pass 2)
- ControlNet/IP-Adapter approaches (structural conditioning)
- LoRA fine-tuning on picket tile patterns
- Tile count in prompt instead of inch dimensions

## Impact
SM has 6 picket options (Baker Blvd Picket Gloss: 3 colors × 2 orientations). These are $375 upgrade options. If we can't visualize them, buyers can't see what they're paying for. Other builders will have similar niche tile patterns. This needs a solution — Finch must handle the full range of backsplash options builders sell.
