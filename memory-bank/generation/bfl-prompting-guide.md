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
4. **Reference images carry visual details — but color needs a text anchor when multiple swatch surfaces compete.** For single-surface edits the swatch is authoritative. For multi-surface full gens where other surfaces are hex-anchored (painted or stained), every textured-swatch clause also needs an inline hex anchor (`"at hex #XXX"`) to prevent attention-budget cross-wire. See D100, D101, D102 and the Swatch Authority Rule section below.
5. **Write prose, not keywords.** "A woman with short blonde hair posing against a neutral background" > "woman, blonde, short hair, neutral background". Especially critical for Klein.
6. **Disable `prompt_upsampling` for color accuracy.** Upsampling enhances prompt text which can override the visual information from swatch reference images.
7. **Iterate one variable at a time.** Don't rewrite the whole prompt between runs. Change one thing, render, measure. Also protects Finch's deterministic prompt hashing.
8. **Enhancement Hierarchy (from T2I Essentials).** After the Subject+Action+Style+Context foundation, layer enhancements in order, and make sure they **support, not overwhelm**:
   1. Visual Polish (lighting, color palette, composition)
   2. Technical Precision (camera, lens, film grain)
   3. Atmosphere & Intent (mood, narrative tone)
9. **Avoid trailing positional modifiers on action targets.** `"cabinet door and drawer front"` reads to BFL as "the front face of the drawer," not "the drawer's front panel." BFL will render only the front face and leave the casing unchanged. Use `"cabinet door and drawer"` instead. Pattern: any noun that ends a clause and doubles as a positional word (front, back, top, bottom, side) should be dropped or rephrased.

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

**Klein preserves everything by default.** No *long* preservation lists needed. However, to explicitly protect unchanged elements from bleed, the official BFL fallback phrase is appended.

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

## BFL Agent Skills Setup

BFL provides an official, installable skills package for AI agents (like Cursor, Windsurf, or Claude Code) that encodes procedural knowledge about FLUX prompting and API integration. This package (`black-forest-labs/skills`) includes:
- **`flux-best-practices`**: Teaches the core formula (Subject+Action+Style+Context+Lighting+Technical), the ban on negative prompts, lighting vocabulary, and model selection.
- **`bfl-api`**: Teaches polling mechanisms, rate limits, and endpoint structure.

**Installation for Finch Agents:**
When utilizing the `bfl-prompt-engineer` subagent, the agent can be equipped with these skills.
- **Cursor/Windsurf**: `npx skills add black-forest-labs/skills`
- **Claude Code**:
  ```bash
  /plugin marketplace add black-forest-labs/skills
  /plugin install flux-best-practices@bfl-skills
  ```

**Interaction with Finch Rules:**
The official BFL skills handle the *foundational* capabilities (writing flowing prose, omitting negative prompts, structuring API calls). However, the agent must *still* read this `bfl-prompting-guide.md` file because it contains our **Finch-specific rules**:
1. The **v2 Schema constraints** (no scene blocking, required `{image}` tokens).
2. The **Swatch Authority Rule** (never write material/color words; let the swatch drive appearance).
3. **Spatial Hint logic** (preventing bleed between adjacent surfaces).

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
  mergedClauses?: Array<{                     // same-swatch collapse handler
    when: string[];                           // subcategory slugs, ≥2
    clause: string;                           // unified clause for the merged case
  }>;
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
3. If the option has a non-empty `dimensions` field, append it as a
   parenthetical after the substitution: `apply image 2 to every cabinet
   pull (thin 5-inch bar pull, small relative to cabinet face)`. This is
   the BFL-documented exception to swatch authority — the swatch image
   cannot carry scale signal for small objects whose correct size depends
   on a larger surface they don't contain, so `dimensions` supplies it.
4. Assemble: `lead` → bulleted action lines → `preserve` tail (if populated)
   → `style` trailer. Join with `\n`.

**Dimensions authoring rules** (same as legacy v1, recap):
- Relative scale, not absolute units. "thin 5-inch bar pull, small
  relative to cabinet face" — not "4 inches wide". BFL has no internal
  concept of inches.
- No material/color words — those are the swatch's job. Scale words
  (thin, small, narrow, wide, large) and count words (dozens of tiny
  rectangular pieces) are allowed.
- Kept short. The parenthetical is a scale supplement, not a second
  description of the object.

**Scoped edits reuse the same `actions` map.** `buildProseScopedEdit` takes
the action clause for the changed subcategory, capitalizes the first letter,
appends a period, and sends it with the swatch as `image 2`. If the option
has `dimensions`, it is appended as a parenthetical before the terminal
period, same as full-gen. No lead, no style trailer. To protect unchanged surfaces from bleed, the BFL official fallback phrase is appended: "Maintain all other aspects of the original image."

**Rule the v2 spec enforces structurally:** you cannot author prompts that
narrate the base scene, reference unchanged surfaces, or describe the swatch
in text. The validator rejects any of those at save time. The only way to
author is "imperative surface description with an `{image}` token."

**Same-swatch collapse (mergedClauses, shipped 2026-04-11).** When two
subcategories resolve to the *same `swatch_url`*, BFL receives two
byte-identical `input_image_N` images and dedupes them into one visual class
— causing the later clause in the prompt to be silently ignored. This
reproduced on Valor's Standard preset where the buyer picked Dove for both
`kitchen-cabinet-color` and `kitchen-island-cabinet-color`: Max painted
perimeter cabinets Dove but left the island base at its original base-photo
color. The Mid-Range and Premium presets (different island color) worked
fine. The fix is `mergedClauses`, a new optional field on `PromptProse`:

```ts
mergedClauses: [
  {
    when: ["kitchen-cabinet-color", "kitchen-island-cabinet-color"],
    clause: "apply {image} to every cabinet door and drawer front throughout the kitchen"
  }
]
```

The builder resolves merges as phase 1 of assembly. For each entry, it
checks if every subcategory in `when` is currently selected AND they all
resolve to the same `swatch_url`. If yes → the `when` subcategories are
removed from the working selections and a single synthetic entry takes
their place with the `clause` as its template and one shared swatch. If no
→ each subcategory runs its own action clause as normal. Zero regression on
the different-color case, correct output on the same-color case.

Detection by `swatch_url` equality is the correct criterion because it
maps directly to what BFL sees: two options pointing at the same storage
path produce byte-identical input images. Options with the same hex but
different swatch files do not trigger the collapse and do not need merging.

The merged clause follows the same validation rules as any action clause:
4–18 words, lowercase start, no trailing period, exactly one `{image}`, no
forbidden words. Plus merge-specific rules: every `when` slug must have a
fallback entry in `actions`, every `when` slug must be in the photo's
subcategory scope, and no subcategory can appear in more than one merge.

Scoped edits (`buildProseScopedEdit`) do NOT consult `mergedClauses` —
single-surface changes are always one swatch, never a collapse case, and
pull directly from `actions[subId]`.

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

### Swatch Authority Rule (revised 2026-04-13)

**TL;DR** — the old "no text alongside swatches" rule was too strict. Four patterns now coexist, picked based on material:

| Material | Pattern | Swatch sent? | Hex in text? |
|---|---|---|---|
| **Painted** (D100) | `"paint X to hex #XXX"` | No | Yes |
| **Stained wood** (D101) | `"stain X with wood grain matching hex #XXX"` | No | Yes |
| **Textured** (stone, tile, flooring) (D102) | `"apply {image} to X matching hex #XXX"` | **Yes** | **Yes** |
| **Metallic** (hardware, faucets, sinks, range, fridge) (D103) | `"change X to match {image}, <finish> finish matching hex #XXX"` | **Yes** | **Yes (gated by material verb)** |

**Rules that still hold:**
- **No `promptDescriptor`** — BFL treats long descriptive text as higher authority and overrides swatches on single-material claims. Descriptive material/color words are still forbidden.
- **`dimensions` is still the scale-signal exception** — installed scale using relative terms (not absolute inches).
- **No material/color/pattern words in action clauses** — let the swatch (or the hex) carry the appearance. The hex is a color *anchor*, not a descriptor.

**Painted surfaces — hex WITHOUT swatch (D100):**
For solid-paint cabinet/island options (`is_painted=true`), send hex code in the prompt with the verb "paint" and do NOT send a swatch image. Swatches for painted finishes are photographed color chips with lighting artifacts (cool cast, shadows) that confuse BFL — Dove (#F5F5F2) consistently rendered as grey when using its swatch. Hex is unambiguous.
- Use: `"paint every perimeter cabinet door and drawer front on every wall to hex #F5F5F2"`
- Tested on Valor kitchen: 3/3 runs with hex produced correct white perimeter + dark island separation. 0/15 runs with swatches produced correct white.

**Stained wood — hex WITHOUT swatch (D101, 2026-04-13):**
Stained wood options render correctly from hex + `"wood grain matching"` text descriptor, without a swatch image. The "stain" verb activates BFL's material-aware scope resolution and filters out non-wood surfaces (e.g., white shaker cabs) unless the scope is explicit. Use:
- `"stain every upper, lower, corner, and center cabinet door and drawer with wood grain matching hex #B09A7E"`
- Zone enumeration (`"upper, lower, corner, and center"`) defeats BFL's visual-class grouping and catches isolated cabinet sections
- Use `"drawer"` NOT `"drawer front"` — trailing `"front"` is parsed as a positional modifier and BFL leaves the casing white
- Tested on Nest kitchen Flex g=7: 3/3 clean on driftwood stain, full wood grain rendered synthetically from the hex
- Supersedes the earlier D100 note that said "stained wood still needs a swatch"

**Textured swatch surfaces — swatch PLUS inline hex anchor (D102, 2026-04-13):**
When a prompt has multiple textured swatch surfaces AND other surfaces are using hex-anchored clauses (painted or stained), every textured-swatch clause must also carry an inline hex anchor — otherwise the hex-anchored surfaces steal the attention budget and the swatch surfaces cross-wire between each other. Each surface needs symmetric text weight.

Pattern:
```
- change the wall surface between the upper cabinets and countertop to match {image} at hex #3D3D3D
- apply {image} to every countertop surface matching hex #6B6E72
- change all visible flooring throughout the room to match {image} at hex #9A8268
```

The swatch reference image is still sent (via `input_image_N`). The hex is a text **anchor** for color binding, not a replacement for the swatch. Swatch still drives pattern/texture; hex locks the color and target binding.

- Tested on Nest kitchen Flex g=7 with driftwood cabs (hex) + steel grey granite counter + carbon herringbone backsplash + warm wood floor: 3/3 clean full scene. Previous 7 clause variants without hex anchors averaged ~10% pass rate on counter alone.
- Also tested lower guidance (g=5, g=6) with and without hex anchors — hex anchors + g=7 won. Higher guidance works BETTER with symmetrized text signals.
- **Validation gap**: tested on one photo. Needs cross-photo validation before ship. Suspected-fragile cases: multi-tone stones (calacatta averages multiple colors into one hex), reverse-direction transformations (dark source → light target).
- **Production integration path**: runtime auto-append `" matching hex #XXX"` to every action clause whose option has `swatch_color` AND isn't already painted/stained via is_painted+forceHex. Gated for safe rollout.

**D102 layout-class change failure (2026-04-13 evening) and the retile fix**:
The D102 "match {image} at hex" pattern works for *same-layout* swaps but fails when the swatch has a different structural layout than the source surface. Tested with `bs-baker-4x16-glacier` (4x16 staggered subway layout swatch) on the Nest kitchen (which has a herringbone mosaic backsplash in the source photo). Result: glacier color landed correctly, but the herringbone layout was preserved from the source. Tested at g=7, g=8, g=9 — no guidance level fixed it. Flex has an incumbent-preservation bias on tile geometry.

**Fix — retile verb + explicit layout descriptor in the action clause**:
```
retile the wall between the upper cabinets and countertop with {image}, large staggered rectangular tiles in horizontal rows at hex #D4E4EC
```

The verb `"retile"` signals layout replacement (spawn pattern, not transform). The explicit layout phrase `"large staggered rectangular tiles in horizontal rows"` describes the target geometry. Hex anchor still locks the color. Validated 1/1 on first test.

**Safe layout vocabulary**: `staggered rectangular tiles`, `horizontal rows`, `running bond`, `offset rows`, `large flat tiles`, `brick-pattern tiles`, `horizontal courses`.

**Poisoned words for backsplash clauses**:
- **`subway`** — triggers Flex's "subway tile = white" prior and overrides the swatch color entirely. Confirmed in earlier session testing.
- **`metro`** — untested but likely same family as subway. Avoid until proven safe.

**When to use D102 vs the retile pattern**:
- Same-layout swap (mosaic source → mosaic target, brick source → brick target, etc.): use D102 `"change/match"` clause.
- Layout-class change (mosaic source → rectangular target, herringbone source → subway-style target, etc.): use the retile verb + explicit layout descriptor.
- The DB option should carry a flag (or the swatch upload pipeline should detect) when the option's layout differs from the photo's source layout, and route to the right clause pattern.

**Metallic surfaces — swatch PLUS material-verb-gated hex (D103, 2026-04-13):**
Applies to ALL metallic surfaces, not just cabinet hardware: pulls/knobs, faucets, sinks, range/microhood front, refrigerator front. They are reflective — flat hex color kills the metallic sheen. But omitting hex entirely breaks color consistency on multi-class scenes (perimeter pulls default to dark finishes pulled from scene neighbors; faucet swap fails entirely on bundled fullgens because pass-2 incumbent-preservation bias keeps the source faucet). The fix is a **material-verb gate** — wrap the hex in a phrase that tells Flex "this color is on a reflective material type":

Pattern:
```
change cabinet pulls on upper, lower, corner, and center cabinets to match {image}, brushed gold finish matching hex #CCBA78
change cabinet pulls and knobs on upper, lower, corner, and center cabinets to match {image}, matte black finish matching hex #1A1A1A
change cabinet pulls and knobs on upper, lower, corner, and center cabinets to match {image}, oil-rubbed bronze finish matching hex #804A2E
change cabinet pulls and knobs on upper, lower, corner, and center cabinets to match {image}, satin nickel finish matching hex #C0BDBA
```

Critical rules for metallic hardware clauses:
- **Material descriptor immediately before the hex**: "brushed gold finish", "matte black finish", etc. This gates the hex — Flex reads it as a color waypoint on a reflective material, not as flat paint RGB.
- **Hex is inline mid-clause, NOT in a trailing parenthetical.** The scoped-edit auto-suffix `"Match image 2 exactly."` binds to the nearest preceding anchor. Trailing-parenthetical hex + this suffix = Flex paints the whole containing surface the hex color (mustard-gold doors, etc.). Keep the hex out of the clause tail.
- **Zone enumeration required** for scoped edit multi-class reach: `"upper, lower, corner, and center cabinets"`. Without this, scoped edit only updates one visual class on two-tone kitchens (e.g. hits the island but skips the perimeter). Same zone-enumeration pattern as D101 for stained cabs.
- **"Change" verb, not "Replace"**: BFL's docs use "Replace X with..." for single large objects (a range swap). For repeated small objects across multiple cabinets, "change" gives Flex more shape-interpretation room. "Replace" over-prescribes.
- **Dimensions: single relative phrase.** `"slim bar pull, small relative to cabinet face"` — not three competing scale signals like `"small slim bar pull, roughly a hand's span wide"`. Three competing scale anchors produce framing-rail-sized hardware; one phrase renders correctly.
- **Combo options need different clauses**: options with both pulls and knobs (e.g. Seaver, Sedona Combo) use `"cabinet pulls and knobs"`. All-pulls options use `"cabinet pulls"`. The clause reflects the hardware structure.
- **Trailing positional modifier trap**: `"drawer front"` is parsed as "the front face of the drawer" — Flex renders only the front face and leaves the casing unchanged. Use `"drawer"` alone. See critical rule #9.
- Tested on Nest kitchen across 5 hardware options (brushed gold, matte black all-pulls, matte black combo, oil-rubbed bronze combo, satin nickel combo) via Flex g=7 scoped edit on a cumulative base. Grande Gold had the most iterations (3/3 on the final clause). Other 4 were single-run visual checks and passed.
- Works in concert with D102 — scoped edit hardware changes compose correctly on top of a hex-anchored full-gen base image. Scoped edit + cumulative edit path validated.

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
