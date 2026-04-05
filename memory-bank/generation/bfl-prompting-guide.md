# BFL Flux 2 Prompting Guide — Finch Application Notes

Sources:
- https://docs.bfl.ml/guides/prompting_guide_flux2 (Max/Pro)
- https://docs.bfl.ml/guides/prompting_guide_flux2_klein (Klein)
- https://docs.bfl.ml/flux_2/flux2_image_editing (Image Editing API)
- https://docs.bfl.ml/guides/prompting_guide_t2i_negative (No Negative Prompts)
- https://docs.bfl.ml/guides/prompting_guide_t2i_advanced (Advanced Techniques)
- https://docs.bfl.ml/guides/prompting_summary (Quick Reference)
- Full doc index: https://docs.bfl.ml/llms.txt

## Critical Rules

1. **NO negative prompts.** Flux 2 does not support them. AI focuses on the prohibited element rather than avoiding it. Describe what you WANT, not what to avoid.
2. **Word order matters.** Flux 2 pays more attention to what comes first. Lead with the most important changes, not scene context. Sequence: Main subject → Key action → Critical style → Essential context → Secondary details.
3. **30-80 words ideal.** Short prompts = better results. Our old 300+ word prompts with 20 "Do NOT" rules are wrong for Flux 2.
4. **Reference images carry the visual details.** The prompt describes what changes — not what the swatch looks like. Don't repeat what's in the image.
5. **Write prose, not keywords.** "A woman with short blonde hair posing against a neutral background" > "woman, blonde, short hair, neutral background". Especially critical for Klein.
6. **Disable `prompt_upsampling` for color accuracy.** Upsampling enhances prompt text which can override the visual information from swatch reference images.

## Model Specs

| Model | Max Refs | Speed | Cost | Use |
|-------|----------|-------|------|-----|
| Max | 8 (hero + 7) | <15s | ~$0.07/MP | Full generation |
| Pro | 8 (hero + 7) | <10s | ~$0.03/MP | Production scale |
| Klein 9B | 4 (hero + 3) | Sub-second | $0.015+$0.002/MP | Scoped edits |
| Klein 4B | 4 (hero + 3) | Sub-second | $0.014+$0.001/MP | High-volume |
| Flex | 8 (hero + 7) | Higher | $0.06/MP | Fine-grained control |

**Limits:** Min 64x64px, max 4MP, output dimensions must be multiples of 16. Images >4MP auto-resized. Signed result URLs expire in 10 minutes.

## Prompt Structure (Flux 2 Max — Full Generation)

Framework: **Subject + Action + Style + Context**

For our use case (room editing with swatches):
1. **What to change** — the actual edits, listed first (most important)
2. **How references map** — which swatch applies where ("apply image 2 to the countertops")
3. **Scene context** — brief spatial grounding at the END (SCENE/PHOTO_LAYOUT)
4. **Style** — "photorealistic, natural lighting, shot on [camera]"

### Reference Images

- Use "image 1" for base photo, "image 2" for first swatch, etc.
- Clearly describe each image's role: "Apply the material from image 3 to the backsplash"
- Don't just say "swatch #1" — say what it's for and where it goes
- Natural language works: the model understands input images contextually
- Separate elements into individual images (better than collage method)

### Hex Color Codes

- Pair hex codes with specific objects: `"the vase color is #FF5733"`
- Use "color" or "hex" keyword before the code for best results
- Vague references like "use #FF0000 somewhere" produce inconsistent results
- Gradients: "gradient, starting with color #02eb3c and finishing with color #edfa3c"
- **Caution with metallic finishes**: Hex codes describe flat color. Hardware, faucets, sinks are metallic/reflective — swatch image is more authoritative than hex for these. Consider omitting hex for metal surfaces.

### Camera References for Photorealism

Specific cameras and lenses produce more authentic results than "photorealistic":
- `"Shot on Canon 5D Mark IV, 24-70mm at 35mm, natural lighting"`
- `"Shot on Sony A7IV, clean sharp, high dynamic range"`
- `"Shot on Kodak Portra 400, natural grain, organic colors"` (film stock)
- f-number: f/1.4 = blurred background, f/8 = everything sharp
- Focal length: 24mm = wide scene, 85mm = compressed/zoomed

### Spatial Layering for Interiors

Structure with depth planes for better results:
- Foreground: "island in center foreground"
- Middle ground: "perimeter cabinets along the back wall"
- Background: "window light filtering through on the left"

### Lighting Control

Describe photographically for best results:
- Source: "large north-facing window light, soft even illumination"
- Quality: "soft, diffused natural light" not "good lighting"
- Direction: "key light at 45 degrees from the left"
- Golden hour: "warm and soft atmospheric quality"
- Practical lighting: "visible light sources in scene for realism"

### JSON Structured Prompting (Optional)

BFL supports JSON for complex multi-element scenes:

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

Use JSON for: production workflows, automation, complex scenes, independent element iteration. Use natural language for: quick iterations, simple scenes, creative flexibility.

## Prompt Structure (Flux 2 Klein — Scoped Edits)

Klein is for targeted single-surface changes. Key principle: **reference images carry visual details, prompt describes what changes.**

**Klein preserves everything by default.** No preservation lists needed.

**Target: 15-25 words.** Write descriptive prose, not keywords.

### Effective Patterns

| Edit Type | Pattern |
|-----------|---------|
| Material swap | "Change the countertop material to match image 2" |
| Color change | "Change the cabinet color to match image 2" |
| Object swap | "Replace the freestanding range with a slide-in range matching image 2" |
| Add element | "Add a refrigerator matching image 2 in the alcove on the right wall" |
| Style transfer | "Reskin this into a realistic mountain vista" |

### What to Avoid (Klein)

- Long preservation lists ("keep X, keep Y, keep Z...") — Klein preserves by default
- Describing what the swatch looks like — the image carries that info
- Vague instructions ("make it better", "improve the lighting", "fix the image")
- Negative prompts
- Keyword lists — write prose

### Klein Preservation Behavior

- Preserves what's NOT mentioned in the prompt
- To protect specific elements: "maintain all other aspects of the original image"
- **Verb choice matters**: "transform" signals complete change. Use targeted verbs: "change the cabinet color", "replace the range"
- For composition stability: "Change the [X] while keeping the exact same position, scale, and pose"

### Klein Spatial Hints

When the changed surface is adjacent to a preserved one, include spatial location to prevent bleed:
- "Backsplash (wall between upper cabinets and countertop)" instead of just "Backsplash"
- "Countertop spans the perimeter cabinets and island"

## Prompting Without Negative Prompts

**Strategy:**
1. Identify the unwanted element
2. Ask: "What would be there instead?"
3. Describe the positive alternative

**Common conversions:**
| Instead of | Write |
|-----------|-------|
| "no people" | "empty", "deserted", "solitary" |
| "no text" | "clean surfaces", "unmarked" |
| "street with no cars" | "quiet pedestrian walkway" |
| "room with no furniture" | "spacious empty room with polished floors" |
| "not dark" | "brightly lit", "sun-drenched" |

**Finch-specific conversions:**
| Instead of | Write |
|-----------|-------|
| "Do NOT bleed onto adjacent surfaces" | "Each finish stays within its surface boundary" |
| "Do NOT add extra cabinetry" | "Preserve existing cabinet layout" |
| "Do NOT change appliance position" | "Keep each appliance in its current location" |
| "Do NOT extend tile below countertop" | "Tile occupies only the wall between countertop and upper cabinets" |
| "Do NOT add new light fixtures" | "Preserve existing fixture count and positions" |
| "Do NOT apply to the island" | "Apply only to perimeter wall cabinets" |

**Escalation when positive framing still fails:**
1. Be more specific about desired content
2. Front-load the positive description (word order matters)
3. Add descriptive detail strengthening the alternative
4. Use environmental context to naturalize the positive element

## API Parameters (Editing Mode)

| Parameter | Required | Notes |
|-----------|----------|-------|
| `prompt` | Yes | Up to 32K tokens |
| `input_image` | Yes | Base64 or URL, up to 20MB/20MP, min 64x64, max 4MP |
| `input_image_2`–`8` | No | Additional refs (Max: 7, Klein: 3) |
| `width`/`height` | No | Multiples of 16, defaults to input size |
| `seed` | No | Integer for reproducibility |
| `prompt_upsampling` | No | Boolean. **Disable for swatch color accuracy.** Not available on Klein. |
| `output_format` | No | "jpeg" or "png", default "jpeg" |
| `safety_tolerance` | No | 0-6, default 2 |
| `guidance` | Flex only | 1.5-10, default 4.5 |
| `steps` | Flex only | Max 50, default 50 |

**Polling:** POST to endpoint → get task ID + polling URL → GET every 0.5s → download on "Ready" status. Result URLs expire in 10 minutes.

## Implications for Finch Prompt Pipeline

### Current Architecture (post-rewrite)

**`buildBflEditPrompt` (Max — full generation):**
- Leads with edit list (what changes), not scene context
- Each edit: surface name + location + "apply image N" (one line)
- Scene context as brief spatial grounding at the END (2-3 lines)
- Camera reference for photorealism
- NO "Do NOT" rules — all converted to positive instructions
- Target: 50-80 words for simple rooms, up to 120 for complex kitchens

**`buildBflScopedEditPrompt` (Klein �� scoped edits):**
- "Change ONLY the [surface] to match image 2. Match image 2 exactly. Color #HEX." + location + dimensions
- Only includes generation rules for the changed surface itself (no cross-surface rules)
- No preserve list, no scene block (Klein preserves by default)
- Target: 15-25 words

**Two-pass split prompt ordering (>7 swatches):**
- Pass 1 (structural): Cabinets first (highest visual impact), then countertop, backsplash, flooring, paint
- Pass 2 (fixtures): Range first (structural change), then hardware, faucet, sink, lighting

### Swatch Authority Rule
Swatch images = SOLE appearance authority. Never send option names/descriptors (`promptDescriptor`) alongside swatches — BFL treats text as higher authority and overrides the swatch. `dimensions` is the one exception: pure measurements only, no color/material words. Dimensions must describe installed appearance ("12+ rows on 18-inch backsplash" not "8 tiles on 11x12 sheet").

**Hex color codes ARE safe alongside swatches.** Unlike text descriptors, hex codes reinforce the swatch rather than overriding it. Use `color #HEX` as a nudge for color consistency. Full gen: `(use image N, color #HEX)`. Klein: `Match image 2 exactly. Color #HEX.`

### Spatial Hint Rules (Learned 2026-04-05)

BFL interprets spatial hints literally. Three critical lessons:

1. **No negations in spatial hints.** `"perimeter cabinets (not the island)"` → BFL ignores the parenthetical negation and may apply to the island anyway. Use purely positive location descriptions.

2. **"Wall cabinets" ≠ all perimeter cabinets.** BFL reads "wall" literally as upper wall-mounted cabinets. Lower base cabinets get grouped with the island visually. Explicitly say "upper and lower cabinet doors and drawers along the perimeter walls, including base cabinets below the countertop."

3. **Separate adjacent zones explicitly.** When two subcategories cover visually similar surfaces (e.g., perimeter cabinets vs island cabinets), each spatial hint must describe its zone positively AND distinctly. E.g., island: "island base cabinet panel in the foreground, separate from perimeter cabinets."

### Open Questions

- Should we try JSON structured prompts for the full generation case?
- How much scene context does Max actually need? R&D showed it helps with spatial separation — but less may be more.
- Klein 9B only supports 4 total images — this limits scoped edits to hero + 3 swatches. Currently we send hero + 1 changed swatch, but could we send hero + changed + 2 adjacent-surface swatches for bleed prevention?
