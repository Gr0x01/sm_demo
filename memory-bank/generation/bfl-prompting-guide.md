# BFL Flux 2 Prompting Guide — Finch Application Notes

Sources:
- https://docs.bfl.ml/guides/prompting_guide_flux2 (Max/Pro)
- https://docs.bfl.ml/guides/prompting_guide_flux2_klein (Klein)
- https://docs.bfl.ml/flux_2/flux2_image_editing (Image Editing API)
- https://docs.bfl.ml/guides/prompting_guide_t2i_fundamentals (Core Framework)
- https://docs.bfl.ml/guides/prompting_guide_t2i_essentials (Enhancement Hierarchy)
- https://docs.bfl.ml/guides/prompting_guide_t2i_advanced (Photography & Composition)
- https://docs.bfl.ml/guides/prompting_guide_t2i_negative (Replacement Method)
- https://docs.bfl.ml/guides/prompting_summary (Quick Reference)
- Full doc index: https://docs.bfl.ml/llms.txt

## Critical Rules

1. **NO negative prompts.** Flux 2 does not support them. AI focuses on the prohibited element rather than avoiding it. Describe what you WANT, not what to avoid. The canonical fix is the **Replacement Method**: identify the unwanted element → ask "what would be there instead?" → describe the positive alternative.
2. **Word order matters.** Flux 2 pays more attention to what comes first. Lead with the most important changes, not scene context. Sequence: Main subject → Key action → Critical style → Essential context → Secondary details.
3. **30-80 words ideal, 512 tokens hard max.** Short prompts = better results. Our old 300+ word prompts with 20 "Do NOT" rules are wrong for Flux 2.
4. **Reference images carry the visual details.** The prompt describes what changes — not what the swatch looks like. Don't repeat what's in the image.
5. **Write prose, not keywords.** "A woman with short blonde hair posing against a neutral background" > "woman, blonde, short hair, neutral background". Especially critical for Klein.
6. **Disable `prompt_upsampling` for color accuracy.** Upsampling enhances prompt text which can override the visual information from swatch reference images.
7. **Iterate one variable at a time.** Don't rewrite the whole prompt between runs. Change one thing, render, measure. Also protects Finch's deterministic prompt hashing.
8. **Enhancement Hierarchy (from T2I Essentials).** After the Subject+Action+Style+Context foundation, layer enhancements in order, and make sure they **support, not overwhelm**:
   1. Visual Polish (lighting, color palette, composition)
   2. Technical Precision (camera, lens, film grain)
   3. Atmosphere & Intent (mood, narrative tone)

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

### Two builder paths

Finch has two prompt builders live at the same time. Which one runs for a
given photo depends on whether `step_photos.prompt_prose` is populated.

1. **Prose spec builder (v2, 2026-04-11)** — runs when `prompt_prose` is
   populated and covers every selected subcategory. This is the path we are
   actively authoring and the one all new photos should use. See
   `buildProsePrompt` / `buildProseScopedEdit` / `validatePromptProse` in
   `src/lib/generate.ts`.
2. **Legacy templated builder** — `buildEditPrompt` / `buildScopedEditPrompt`
   in `src/lib/generate.ts`. Runs for photos without a `prompt_prose` row. Kept
   in place so existing orgs continue to work, but net-new photos should not
   rely on it.

### Prose spec builder (v2, shipped 2026-04-11)

**Why it exists.** The previous session shipped a prose builder with a
`subject` field that narrated the base scene. That field caused hallucinated
architectural elements (filigree scrollwork in a Valor test). A deeper read
of BFL's editing docs, Klein guide, and fundamentals guide confirmed that
edit-mode prompts should describe *what changes*, not the scene — the base
image carries the scene. The v2 spec enforces that rule structurally.

**Schema** (`PromptProse` in `src/lib/step-config.ts`):
```ts
interface PromptProse {
  version: 2;
  actions: Record<subcategorySlug, string>;  // one imperative clause per surface
  lead?: string;                              // optional lead-in, defaults below
  style?: string;                             // optional trailer, defaults below
  preserve?: string[];                        // escape hatch, empty on day 1
}
```

**Defaults:**
- `lead` → `"Apply the following finishes to this kitchen photo:"`
- `style` → `"Photorealistic real estate photography, natural daylight, neutral white balance."`
- `preserve` → empty. Populate only when an empirical test shows Max
  freelancing a specific unselected surface. This was an explicit agreement
  with the user: start with the bare minimum, add only what failure justifies.

**Action clause rules** (enforced at save time by `validatePromptProse`):
- Lowercase start, no trailing period — clauses are joined into bullet lines
  by the builder.
- 4–18 words per clause (medium band per the fundamentals guide).
- Exactly one `{image}` token per clause.
- Forbidden: negative framing (`not`, `no`, `never`, `only`, `avoid`,
  `except`, `without`, `don't`), the standalone word `island` (describe
  positionally), any material/color/pattern word (swatch is sole authority),
  any hex color code.
- `lead` ≤ 12 words, `style` ≤ 20 words, `preserve[i]` ≤ 18 words.

**Builder pipeline** (`buildProsePrompt`):
1. Sort selected actions by visual-impact priority (`visual-impact-sort.ts`).
2. For each, resolve the swatch into the reference array and substitute
   `{image}` → `image N` where N starts at 2 (base photo is image 1).
3. Assemble: `lead` → bulleted action lines → `preserve` tail (if populated)
   → `style` trailer. Join with `\n`.

**Scoped edits reuse the same `actions` map.** `buildProseScopedEdit` takes
the action clause for the changed subcategory, capitalizes the first letter,
appends a period, and sends it with the swatch as `image 2`. No lead, no
style trailer, no preserve tail — Klein/Flex preserve unchanged surfaces by
default.

**Rule the v2 spec enforces structurally:** you cannot author prompts that
narrate the base scene, reference unchanged surfaces, or describe the swatch
in text. The validator rejects any of those at save time. The only way to
author is "imperative surface description with an `{image}` token."

**Authoring is the specialist's job, not the main agent's.** The main agent
owns the TypeScript type, builder, validator, admin UI, and tests. The
`bfl-prompt-engineer` specialist owns the schema shape and the action clause
content. Briefs to the specialist must instruct them to read this guide
before responding (see CLAUDE.md's BFL Flux Prompting rule).

### Legacy templated builder (`buildEditPrompt`)

Still runs for photos without a `prompt_prose` row. Kept for back-compat.
Behavior documented here for reference — prefer the prose spec for new work.

**`buildEditPrompt` (Max — full generation):**
- Opens with "Apply the following finish changes to this room photo:"
- Surface list sorted by visual impact: cabinets → backsplash → island → countertop → flooring → paint
- Each edit: surface name + spatial hint + "use image N" (no hex alongside swatches)
- Unselected surfaces with known photo colors: hex preservation at END of list ("keep at color #HEX")
- No scene block (mentions of unselected surfaces cause bleed)
- NO "Do NOT" rules
- Target: 50–80 words

**`buildScopedEditPrompt` (Klein/Flex — scoped edits):**
- "Apply image 2 to [spatial hint]. Match image 2 exactly. Preserve natural sunlight."
- Uses spatial hint as surface identifier
- No hex alongside swatches (overrides textures)
- Target: 15–25 words

**Two-pass split prompt ordering (>7 swatches):**
- Pass 1 (structural): cabinets first, then countertop, backsplash, flooring, paint
- Pass 2 (fixtures): range first, then hardware, faucet, sink, lighting

### Swatch Authority Rule
Swatch images = SOLE appearance authority. Never send text alongside swatches when a swatch image is present:
- **No `promptDescriptor`** — BFL treats text as higher authority and overrides the swatch.
- **No hex color codes alongside swatches** — hex describes flat color, which overrides textured finishes (wood stain rendered as flat paint, granite rendered as solid color). Hex is ONLY safe in fallback paths when no swatch image is available.
- **`dimensions` is the one exception**: describes installed appearance using relative scale, not absolute measurements.

**Dimensions must use relative scale, not absolute units.** BFL has no concept of inches. "0.5x2 inch mosaic" → BFL renders standard subway-sized tiles. Instead describe scale relative to the surface: "small mosaic herringbone — dozens of tiny rectangular pieces visible across the backsplash" or "4x16 subway tiles, staggered layout". The key is how many tiles are visible, not how big each tile is in inches.

### Prompt Structure Rules (Learned 2026-04-05)

**1. Visual-impact sort order.** BFL weights early words most. Sort the surface list by visual dominance, not alphabetically:
```
cabinets (0) → island (1) → countertop (2) → backsplash (3) → flooring (4) → paint (5)
```
Cabinets are the largest surface in most kitchen photos and must be listed first.

**2. Positive-only opening.** Don't use "Change ONLY the listed surfaces" — the word "ONLY" is negative-adjacent and steals the first-position attention slot. Use: "Apply the following finish changes to this room photo:"

**3. No scene block for demo pipeline.** The base photo IS the scene context. Scene descriptions that mention unselected surfaces (e.g., "island in the foreground") draw BFL's attention to those surfaces and cause bleed. Removed entirely from `/try` demo generation.

**4. Hex preservation for unselected surfaces.** When a surface is NOT selected but its current color is known (from photo analysis), add it at the END of the list: `"N. Island Base → island panel in foreground (keep at color #F5F5F2)"`. End of list = lowest attention = appropriate for preservation. Requires `defaultSurfaceColors` in scene analysis.

### Spatial Hint Rules (Learned 2026-04-05)

BFL interprets spatial hints literally. Critical lessons:

1. **No negations.** `"perimeter cabinets (not the island)"` → BFL ignores the parenthetical negation. Use purely positive location descriptions.

2. **BFL reads "wall" literally.** "Wall cabinets" = upper wall-mounted cabinets only. Lower base cabinets get skipped. Say "upper wall cabinets, lower base cabinets" explicitly.

3. **Name every zone.** Cabinets above/flanking appliances (fridge, oven) are NOT covered by "along the perimeter walls." Must explicitly say "cabinets above and flanking appliances." Current best hint: `"upper wall cabinets, lower base cabinets, and cabinets above and flanking appliances — every perimeter cabinet door and drawer"`.

4. **Separate adjacent zones.** When two subcategories cover visually similar surfaces, each hint must describe its zone positively AND distinctly. Island: `"island base cabinet panel in the foreground, separate from perimeter cabinets"`.

5. **Don't name surfaces you're NOT changing.** Countertop hint saying `"on island and perimeter"` activates the island in BFL's attention. Use `"all horizontal countertop surfaces — perimeter and center workspace"` instead.

6. **Front-load the important part.** "upper and lower" at the end of a hint gets lowest attention. Lead with the part BFL tends to skip: `"upper wall cabinets, lower base cabinets..."` not `"cabinet doors along the perimeter walls, upper and lower"`.

### BFL Limitations (Confirmed 2026-04-05)

1. **No mask support in Flux 2.** Image editing mode is instruction-based only. `input_mask` is NOT a supported parameter. FLUX.1 Fill has masks but doesn't support reference images — unusable for swatch-based editing.

2. **Visual surface grouping.** BFL groups visually similar surfaces by appearance, not architecture. All white painted panels (upper cabinets, lower cabinets, island) are one "class" to BFL. When instructed to change "cabinet color," it may change ALL instances of that visual class. Prompt-level mitigations (sort order, spatial hints, hex preservation) help significantly but can't fully prevent bleed between adjacent same-material surfaces.

### Open Questions

- ~~Should we try JSON structured prompts for the full generation case?~~
  **Answered 2026-04-11.** No. BFL's editing API docs never demonstrate JSON;
  every documented edit-mode example is natural-language prose. The JSON
  schema in the main Flux 2 guide is T2I-flavored (`scene`/`mood`/`camera`
  fields don't apply when the base image carries the scene). BFL says
  "FLUX.2 understands both formats" — meaning neither is inherently better
  for the model — so the decision reduces to authoring convenience. JSON
  would help automation but at the cost of diverging from what BFL actually
  documents for edit mode. Prose with a structured authoring object (the v2
  spec) gives us both: struct-level validation for the human author, and
  documented-format output for BFL.
- Klein 9B only supports 4 total images — this limits scoped edits to hero + 3 swatches. Currently we send hero + 1 changed swatch, but could we send hero + changed + 2 adjacent-surface swatches for bleed prevention?
- Automated `defaultSurfaceColors` extraction: Gemini can identify surface colors during validate-photo. Currently only the sample kitchen has hardcoded colors. Uploaded photos fall back to `generationRulesWhenNotSelected` text rules.
- Does the bare-minimum v2 spec (no `preserve` tail) hold up across multiple
  kitchens? Valor is the first photo authored on v2 — if Max freelances
  unselected surfaces we add preservation clauses photo-by-photo and
  document the failure mode here.
