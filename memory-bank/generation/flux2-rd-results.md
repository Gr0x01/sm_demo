# Flux 2 R&D Results (2026-04-04)

## Summary

Tested all BFL Flux 2 models as replacements for OpenAI gpt-image-1.5 + Gemini Flash pipeline. **Flux 2 Max produces visibly better image quality than 1.5 in a single pass.** Klein 4B is a breakthrough for scoped edits — 7s at $0.017.

## Models Tested

| Model | Endpoint | Full Gen | Scoped Edit | Cost | Notes |
|-------|----------|----------|-------------|------|-------|
| **Max** | `flux-2-max` | **35-46s** | 29s | ~$0.09/img | Best quality. Use for full generation. |
| **Pro** | `flux-2-pro` | 15s | **14s** | ~$0.075/img | Fast but spatial precision issues on full gen (left/right perimeter confusion, flooring missed). Scoped edit quality is excellent. |
| **Flex** | `flux-2-flex` | 29s | 22-25s | ~$0.05-0.10/img | No advantage over Pro. Moved oven to island on post-pass — spatial awareness poor. |
| **Klein 9B** | `flux-2-klein-9b` | 18s | 15s | ~$0.02/img | Changed backsplash when only asked to change countertop. Worse than 4B on preservation. |
| **Klein 4B** | `flux-2-klein-4b` | 6s | **7-11s** | **$0.017/img** | Scoped edit champion. Better spatial precision than Pro on several tests. Full gen quality too low (blue carpet). 4B params = self-hostable on consumer GPU. |
| **Kontext Max** | `flux-kontext-max` | — | 41s | $0.08 flat | Composited swatches as image strip instead of using them as references. Does NOT understand multi-reference editing. Out. |

## Recommended Architecture

| Use case | Model | Time | Cost |
|----------|-------|------|------|
| Full generation (all surfaces) | **Max** | ~35-46s | ~$0.09 |
| Scoped edit (1 surface change) | **Klein 4B** | ~7-11s | $0.017 |
| Post-pass (oven correction) | **Max** | ~30-39s | ~$0.09 |

### vs Current Pipeline

| Scenario | Current (1.5 multi-pass) | Flux 2 |
|----------|------------------------|--------|
| Simple room (bedroom, bath) | ~75s (structural + fixtures) | **~35s** (single Max pass) |
| Kitchen full gen | ~105-115s (4 passes) | **~35-46s** (single Max pass) |
| Scoped edit (1 surface) | ~30s (1.5 scoped) | **~7-11s** (Klein 4B) |
| Worst case (stain + herringbone + slide-in) | ~115s | ~75-85s (Max + Max oven post-pass) |

## Key Findings

### What Max handles in a single pass (no isolation/post-pass needed)
- Herringbone tile patterns (needed dedicated Flash isolation pass with 1.5)
- Subway tile pattern + color changes
- Two-tone cabinet discrimination (perimeter vs island) — works ~75% of time without tuned prompt, improves with scene context
- 7 swatches simultaneously (cabs, island, counter, floor, paint, backsplash, hardware)
- Cabinet stain with visible wood grain
- Dramatic color changes (white → onyx)

### What still needs post-passes
- **Slide-in range swap** — structural geometry change, not just a finish swap. No model handles this reliably in a single pass. Needs dedicated Max post-pass (same as current oven correction pass with 1.5).

### Spatial exclusion (NEEDS WORK)
- **Problem**: Without scene context, Max applies perimeter cabinet color to island ~50% of the time. "NOT the island" is inconsistently respected.
- **Prompt tuning helps significantly**: Adding SCENE, PHOTO_LAYOUT, PHOTO_BASELINE context (from step photo DB fields) improved spatial exclusion. Combo 12 (tuned worst case) got two-tone correct.
- **Stronger exclusion language needed**: "The island is a SEPARATE selection — do not change it here" works better than "NOT the island."
- **Klein 4B has BETTER spatial precision than Pro for scoped edits** — kept edits tighter to target surface in 6/7 stress tests.
- **High-contrast perimeter edits** (e.g. Onyx) still leak to island even with good prompting — the model "completes" the dark theme. This was the one consistent failure (S1 stress test).

### Image quality
- Max output is noticeably more photorealistic than 1.5 — richer textures, more natural lighting, less "AI smoothing"
- Beadboard detail generally preserved (lost it once in combo 12 worst case)
- Cabinet door panel style (shaker) preserved well

### Self-hosting potential
- Klein 4B (4 billion params) runs on consumer GPU. fp16 = ~8GB VRAM.
- RB has a 4080 (16GB VRAM) — estimated 2-3s local inference for scoped edits at $0 cost.
- Not needed now. Future optimization after move to Montgomery. Could run on Proxmox homelab with a GPU.
- For production: BFL API (Vercel can't run local GPU). Self-hosted endpoint via Tailscale is future option.

## BFL API Notes
- **Auth**: `x-key` header (not Bearer)
- **Async polling**: POST → task ID → poll `GET /v1/get_result?id=...` every 1.5s
- **Image editing**: Instruction-based only (no mask). `input_image` (base) + `input_image_2..8` (up to 7 reference images)
- **Size**: 1536x1024 = 1.57MP. All dimensions must be multiples of 16.
- **404s on poll**: Normal — BFL returns 404 briefly before task is registered for polling
- **Signed URLs**: Result URLs expire after 10 minutes

## Test Scripts
- `scripts/test-flux2-max-kitchen.ts` — R1: initial Max test (4 combos, structural)
- `scripts/test-flux2-kitchen-r2.ts` — R2: herringbone, slide-in, Flex post-pass
- `scripts/test-flux2-kitchen-r3.ts` — R3: prompt-tuned with scene context, Max-to-Max oven post-pass
- `scripts/test-flux2-all-models.ts` — All 6 models benchmark (scoped edit + full gen)
- `scripts/test-flux2-scoped-edit.ts` — Max/Flex/Klein scoped edit comparison
- `scripts/test-flux2-stress-scoped.ts` — Klein 4B vs Pro stress test (7 surface types)
- Outputs: `scripts/flux2-test-outputs/`

## Next Steps
- [ ] **Spatial prompting overhaul** — integrate scene description, photo baseline, photo spatial hint into Flux prompt builder. This is the main gap before integration.
- [ ] Swap `IMAGE_MODEL` from `gpt-image-1.5` to Flux 2 Max (BFL API)
- [ ] Swap scoped edit model to Klein 4B
- [ ] Remove Flash isolation pass (Max handles herringbone/tile in single pass)
- [ ] Remove Pro cabinet post-pass (Max handles stain in single pass)
- [ ] Keep oven correction pass (Max-to-Max post-pass)
- [ ] Update cost tracking in PostHog
- [ ] Bump cache version (all cached images need regeneration)
- [ ] Test on non-kitchen rooms (bedrooms, bathrooms — should be single Max pass)
- [ ] Update `/try` demo pipeline
