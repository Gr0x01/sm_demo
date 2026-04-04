# BFL Flux 2 Prompting Guide — Finch Application Notes

Source: https://docs.bfl.ml/guides/prompting_guide_flux2 + https://docs.bfl.ml/guides/prompting_guide_flux2_klein

## Critical Rules

1. **NO negative prompts.** Flux 2 does not support them. "Do NOT" rules confuse the model. Describe what you WANT, not what to avoid.
2. **Word order matters.** Flux 2 pays more attention to what comes first. Lead with the most important changes, not scene context.
3. **30-80 words ideal.** Short prompts = better results. Our old 300+ word prompts with 20 "Do NOT" rules are wrong for Flux 2.
4. **Reference images carry the visual details.** The prompt describes what changes — not what the swatch looks like. Don't repeat what's in the image.

## Prompt Structure (Flux 2 Max — Full Generation)

Framework: **Subject + Action + Style + Context**

For our use case (room editing with swatches):
1. **What to change** — the actual edits, listed first (most important)
2. **How references map** — which swatch applies where
3. **Scene context** — brief spatial grounding (SCENE/PHOTO_LAYOUT)
4. **Style** — "photorealistic, shot on [camera], natural lighting"

### JSON Structured Prompting

BFL recommends JSON for complex multi-element scenes:

```json
{
  "scene": "overall scene description",
  "subjects": [
    {
      "description": "detailed subject description",
      "position": "where in frame",
      "color_match": "exact"
    }
  ],
  "style": "artistic style",
  "color_palette": ["#hex1", "#hex2"],
  "camera": {
    "angle": "camera angle",
    "lens": "lens type"
  }
}
```

### Hex Color Codes

- Pair hex codes with specific objects: `"the vase color is #FF5733"`
- Vague references like "use #FF0000 somewhere" produce inconsistent results
- **Caution with metallic finishes**: Hex codes describe flat color. Hardware, faucets, sinks are metallic/reflective — swatch image is more authoritative than hex for these. Consider omitting hex for metal surfaces.

### Camera References for Photorealism

Include specific camera/lens for more realistic output:
- `"Shot on Canon 5D Mark IV, 24-70mm at 35mm, natural lighting"`
- `"Shot on Sony A7IV, clean sharp, high dynamic range"`

### Multi-Reference Images

- Max supports hero + up to 7 reference images
- **Clearly describe each image's role**: "Apply the material from image 2 to the countertops"
- Don't just say "swatch #1" — say what it's for and where it goes

## Prompt Structure (Flux 2 Klein — Scoped Edits)

Klein is for targeted single-surface changes. Key principle: **reference images carry visual details, prompt describes what changes.**

### Effective Patterns

| Edit Type | Pattern |
|-----------|---------|
| Material swap | "Change the countertop material to match image 2" |
| Color change | "Change the cabinet color to match image 2" |
| Object swap | "Replace the freestanding range with a slide-in range matching image 2" |
| Add element | "Add a refrigerator matching image 2 in the alcove on the right wall" |

### What to Avoid (Klein)

- Long preservation lists ("keep X, keep Y, keep Z...") — Klein preserves by default
- Describing what the swatch looks like — the image carries that info
- Vague instructions ("make it better")
- Negative prompts

## Implications for Finch Prompt Rewrite

### Current Problems (inherited from OpenAI pipeline)

1. **20+ "Do NOT" rules per prompt** — Flux ignores/misinterprets negative instructions
2. **300+ word prompts** — way over the 30-80 word sweet spot
3. **Scene context leads** — should come after the edits (word order matters)
4. **Verbose swatch descriptions** — repeating what's in the reference image
5. **No camera references** — missing easy photorealism boost
6. **Generic "swatch #N"** — should clearly assign each reference's role

### Rewrite Plan

**`buildBflEditPrompt` (Max — full generation):**
- Lead with edit list (what changes), not scene context
- Each edit: surface name + location + "apply image N" (one line)
- Scene context as brief spatial grounding (2-3 lines, after edits)
- Camera reference for photorealism
- Hex anchors on finish surfaces only (not metals)
- NO "Do NOT" rules — convert to positive instructions where essential
- Target: 50-80 words for simple rooms, up to 120 for complex kitchens

**`buildBflScopedEditPrompt` (Klein — scoped edits):**
- "Change the [surface] to match image 2" + location hint
- Minimal preservation context (Klein preserves by default)
- Target: 20-40 words

**Two-pass split prompt ordering:**
- Pass 1 (structural): Cabinets first (highest visual impact, word order matters), then countertop, backsplash, flooring, paint
- Pass 2 (fixtures): Range first (structural change), then hardware, faucet, sink, lighting

### Open Questions

- Should we try JSON structured prompts for the full generation case?
- How much scene context does Max actually need? R&D showed it helps with spatial separation — but maybe less is more.
- Do we need `dimensions` field in the prompt at all? The swatch image shows the tile pattern. Maybe dimensions are just confusing Max.
