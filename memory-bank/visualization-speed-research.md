# Visualization Speed Research (2026-03-26)

## Problem

AI generation (gpt-image-1.5) costs $0.20/image and takes 30-45 seconds. This is the core bottleneck for buyer experience and unit economics at scale.

## Approaches Evaluated

### 1. FLUX.2 Flex Edit (fal.ai) — TESTED, NOT VIABLE

**What it is**: Black Forest Labs' FLUX.2 image editing model, hosted on fal.ai. Accepts multiple input images + text prompt for multi-reference editing.

**Test setup**: Demo org kitchen photo + 6 swatch reference images (cabinets, island, countertop, backsplash, flooring, wall paint). Same photo/swatches sent to both models.

**Results**:

| Metric | OpenAI gpt-image-1.5 | FLUX.2 Flex Edit |
|--------|----------------------|------------------|
| Speed | 44.6s | 42.4s |
| Cost | $0.20 | $0.377 |
| Cabinet color accuracy | Correct (light silver gray) | Wrong (dark charcoal) |
| Backsplash | Matched swatch | Solid gray, missed pattern |

**Why it failed**: FLUX.2 takes a flat `image_urls` array — no way to bind swatch #3 to "countertop." The model guesses which swatch applies where. OpenAI's `images.edit` accepts ordered swatch references that the prompt maps explicitly (`swatch #1 → cabinets`).

**Verdict**: Same speed, 2x cost, worse quality. Not viable. See D87.

**Artifacts**: `scripts/test-flux2.ts`, `.flux-test-output/`

### 2. OpenAI Streaming Previews (`partial_images`) — FREE WIN, NOT YET BUILT

**What it is**: OpenAI supports `partial_images: 3` on `images.edit`. Returns progressive base64 previews via SSE during the 30-45s generation.

**Benefit**: Users see something in 5-10 seconds. No extra cost. Same final output.

**Challenge**: Our Inngest background function architecture doesn't stream to the client. Would need a preview channel (Supabase Realtime or polling endpoint).

**Status**: Not implemented. Low effort, high UX impact. Build when speed becomes a user complaint.

### 3. Pre-generate Popular Combos — ALREADY DOING THIS

The preset variation gallery on `/for/` pages already pre-generates 3 combos per prospect demo (~$0.60 total). This is the right pattern — instant "aha moment" on page load.

Could extend to: batch-generate top 20-30 most common selection combos per room during off-peak hours using existing `scripts/batch-generate.ts`.

### 4. Predictive Generation — TOO EXPENSIVE WITHOUT PILOT

Start generating when selections look complete, before buyer clicks "Visualize." At $0.20/generation, speculative generations during browsing would burn money fast. Revisit only with paying builders where usage patterns are predictable.

### 5. 2.5D/3D Texture Swap Pipeline — PoC PLANNED

**The idea**: Extract 3D geometry from room photo during admin setup, then do instant texture swaps in the browser at runtime. Zero cost per swap.

**One-time setup per photo (admin side)**:
1. Depth Anything V3 → depth map (~5-10s GPU)
2. Grounded SAM 2 → surface segmentation masks (~15-20s)
3. Plane fitting → simple meshes per surface (~2-3s)
4. Camera estimation from depth/vanishing points (~1-2s)
5. Admin review/correction in web UI (~2-5 min)
6. Swatch → tileable texture conversion (one-time per option)

**Runtime per swap (buyer side)**:
- Three.js swaps texture on mesh → under 100ms, $0
- Users can click through 50 options in 30 seconds

**Hybrid model**:
- Texture swap for browsing/exploring (instant, free)
- AI generation for "final render" when buyer settles (30-45s, $0.20)
- One generation instead of 3-4 during exploration

**Appliance handling**: Base image variants, not texture changes. "Fridge vs no fridge" or "standing stove vs slide-in range" → swap the background photo layer. Same meshes, same masks, different base.

**Quality expectations**:
- Flat surfaces (floor, backsplash, walls): Very good
- Cabinets: Decent but no recessed panel shadows or depth detail
- Lighting: Requires intrinsic image decomposition (separate color from shading)
- Edges: Some depth-bleeding artifacts

**Key technology**:
- Depth Anything V3 (Nov 2025) — best edge sharpness for indoor scenes
- Grounded SAM 2 — text-prompted segmentation ("kitchen cabinets", "countertop")
- DepthPro (Apple) — metric depth + camera intrinsics prediction
- Three.js — browser-side rendering with texture projection
- Material Palette (CVPR 2024) — extract PBR from photos for lighting-correct swaps
- Intrinsic image decomposition (SIGGRAPH Asia 2024) — separate albedo from shading

**What exists**: Every piece is available (open-source or cheap API). Nobody has assembled them into this pipeline for room material visualization. Wizart.ai is closest but does server-side rendering at $0.148/request, not client-side real-time.

**Status**: PoC planned. Need to validate visual quality before committing to full build.

## Competitive Landscape (AI Adoption in Viz)

### Envision/Zonda (Primary Competitor)
- **AI adoption**: Zero public mention. Investing in operational plumbing (Measured Options Module for pricing, API infrastructure for ERP integration).
- **Most likely first AI move**: AI-generated PBR textures from swatch photos (6-12 months). Makes their texture creation pipeline cheaper, doesn't change pricing.
- **Realistic near-term threat**: Hybrid AI preview + 3D (12-18 months). Fast AI previews for browsing, premium 3D for exploration.
- **Big threat**: Photo-to-editable-3D-room (3-5 years). When AI can reconstruct precise room geometry from photos with editable materials, everything changes. Not 2026 or 2027.

### Other Competitors
- **Anewgo**: Most AI-forward — uses AI for marketing content/descriptions, NOT for room visualization. Cloud rendering engine for real-time viz is traditional 3D.
- **Roomored (Interior Logic Group)**: Proprietary 3D modeling. No AI detected. May be in maintenance mode.
- **ECI Insearch**: Selection management workflow, no photorealistic viz, no AI.
- **Outhouse**: Interactive floor plans (20+ years). No AI in product.
- **Wizart.ai**: Closest to our approach — photo-based wall/floor material visualization. But server-side, $0.148/request, focused on flooring/material retailers not builders.

### Key Finding
Nobody in the builder viz space is shipping AI-powered visualization. Finch has a clear window. The biggest risk is Envision wrapping an AI preview layer around their existing 3D product, but they'd have to build the AI pipeline from scratch and it's outside their current investment direction.

## 3DGS / NeRF — Not Relevant

Gaussian splatting produces great virtual tours but you **cannot edit materials** in a splat. It captures what exists. Texture-GS (CVPR paper) is researching disentangled texture editing but is 2-3 years from production. Not a threat to Finch and not a tool we'd use.

## Summary of Actions

| Action | Status | Impact | Effort |
|--------|--------|--------|--------|
| Stay on gpt-image-1.5 | Current | Baseline | — |
| FLUX.2 alternative | Tested, rejected (D87) | None | Done |
| Streaming previews | Not started | Better perceived speed | Low |
| Pre-generate combos | Already doing (preset variations) | Instant "aha" | Low |
| Predictive generation | Deferred (too expensive) | — | — |
| 2.5D texture swap PoC | Planned (D88) | Instant browsing + $0 cost | High (4-6 weeks) |
