# Flux 2 Architecture Watchlist

**Status**: R&D, no implementation decisions yet.
**Purpose**: Running list of architecture changes the current Flux 2 pipeline MAY need, based on what we learn in the Nest demo proving ground. Nothing here is committed; nothing here is ignored. When we've mapped enough behavior to see the shape clearly, the pipeline redesign will fall out of this list.

**Rule**: Do not implement anything on this list until cross-photo / cross-material / cross-model validation is reasonably complete on the Nest demo (kitchen + bathroom + living room + bedroom + any secondary spaces). Band-aids now will be wrong later.

## Status matrix

Quick at-a-glance view. Update as new tests run. Detailed prose for each item lives in the numbered sections below.

**Status legend**: `LOCKED` (fully validated, ready to ship) · `VALIDATED` (works in lab, blocks on cross-photo) · `PARTIAL` (works in some configs, fails in others) · `BROKEN` (confirmed failure mode) · `PENDING` (not yet tested)

**Photo legend**: NK = Nest Kitchen, NB = Nest Bathroom, NL = Nest Living Room, NBR = Nest Bedroom, VAL = Valor, SM = Stone Martin (any room). Empty = not tested. ✓ = validated. ~ = partial. ✗ = failed.

| # | Pattern / test | Status | NK | NB | NL | NBR | VAL | SM | Models tested (winner) | Prod | Linked |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **D100** painted: paint+hex (no swatch) | LOCKED | ✓ | | | | ✓ | ✓ | Max, Pro, Flex (any) | SHIPPED | D100 |
| 2 | **D101** stained: hex + "wood grain matching" | VALIDATED | ✓ | | | | | | Flex g=7 (winner) | LAB-ONLY | D101 |
| 3 | **D102** textured swatch + inline hex anchor | VALIDATED | ✓ | | | | | | Flex g=7 (winner) | LAB-ONLY | D102 |
| 4 | **D103** metallic: material-verb gate + hex | VALIDATED | ✓ | | | | | | Flex g=7 scoped (winner); Klein 9B fails | LAB-ONLY | D103 |
| 5 | Cab zone enumeration `upper, lower, corner, center` | LOCKED | ✓ | | | | | | (all) — required for multi-class reach | LAB-ONLY | D101, D103 |
| 6 | Hardware clause: combo vs all-pulls structures | VALIDATED | ✓ | | | | | | Flex scoped, all 4 finishes | LAB-ONLY | D103 |
| 7 | Symmetrized hex anchors (full-gen multi-swatch) | VALIDATED | ✓ | | | | | | Flex g=7 (3/3 clean) | LAB-ONLY | D102 |
| 8 | Range slide-in transformation (scoped) | VALIDATED | ✓ | | | | | | Flex g=7/g=8 (winners); Max ok; Klein 9B fails; Klein 4B inconclusive | LAB-ONLY | #11 |
| 9 | Range slide-in **bundled** in full-gen | BROKEN | ✗ | | | | | | Flex 2-pass split — island merge + counter drift, range unreliable | — | #11 |
| 10 | Refrigerator add-to-alcove (bundled) | VALIDATED | ✓ | | | | | | Flex g=9 + remove/install fixture pattern, fridge places 3/3 | LAB-ONLY | new |
| 11 | Tone correction: inline style trailer at Flex g=8 | PARTIAL | ~ | | | | | | Works for smaller selection sets; insufficient for bundled fullgen at g=9 (still cartoony) | LAB-ONLY | #10-b |
| 12 | Tone correction: Klein 4B refine post-pass | VALIDATED | ✓ | | | | | | Klein 4B winner over 9B; ~6-10s; required on bundled fullgen + scoped edit outputs | LAB-ONLY | #10-b |
| 12-b | Bundled fullgen pipeline: Flex g=9 + Klein 4B refine | VALIDATED | ✓ | | | | | | Total ~50s per pass; cabs stain, fixtures land via remove/install, fridge spawns, tone cool/photographic | LAB-ONLY | #10-b, #11, new |
| 12-c | Fixture clauses: "remove existing X and install {image}" pattern | VALIDATED | ✓ | | | | | | Flex g=9 — beats "swap X for {image}" by breaking pass-2 incumbent-preservation bias (per BFL expert diagnosis) | LAB-ONLY | new |
| 12-d | Drop range clause when option = photo default | VALIDATED | ✓ | | | | | | Saves a pass-2 attention slot; reduces total swatch count toward single-pass threshold | LAB-ONLY | new |
| 13 | Mixed paint+stain cabs (per-clause material verbs) | VALIDATED | ✓ | | | | | | Flex g=7 — both directions 3/3 | LAB-ONLY | D101 |
| 14 | Two-pass split with hex anchors at >7 swatches | VALIDATED | ✓ | | | | | | Flex g=7 (3/3 with symmetrized anchors) | LAB-ONLY | D102 |
| 15 | Multi-round cumulative scoped edits | VALIDATED | ✓ | | | | | | Scoped on hex-anchored full-gen base — 1 cumulative depth | LAB-ONLY | #7, #8 |
| 16 | Trailing positional modifier trap (`drawer front`) | LOCKED | ✓ | | | | | | (all) — guide rule #9 added | SHIPPED-IN-DOCS | guide rule #9 |
| 17 | BFL Flex ref limit code bug (9 → 7) | PENDING | — | — | — | — | — | — | — | NOT FIXED | #10 |
| 18 | Material-aware action clause rendering (paint/stain/metal) | BLOCKED | — | | | | | | (architecture, not lab) | NOT IMPLEMENTED | #1 |
| 19 | Klein 4B tone refine non-blocking integration | BLOCKED | — | | | | | | Pipeline integration design needed | NOT IMPLEMENTED | #10-b |

**Hot blockers** (most important things to unstick):
- **Cross-photo validation** — almost every VALIDATED row needs to be tested on at least one non-Nest-kitchen photo before LOCKED
- **#10 fridge cab revert** — bundled fridge run regressed cabs; need to understand why fridge fits OK but cab clauses get knocked out of pass 1
- **#9 range bundled** — confirmed BROKEN, range needs its own scoped pass
- **#18 material-aware clauses** — production authoring gap. Authoring per-photo prose can't cover paint/stain/metallic on the same subcategory without runtime help.

## Open questions / candidate changes

### 1. Material-aware action clause rendering — now THREE material axes
**Learned**: Painted options need `"paint ... to hex #XXX"` (D100). Stained wood options need `"stain ... with wood grain matching hex #XXX"` (D101). Metallic hardware options need `"change ... to match {image}, <finish> finish matching hex #XXX"` (D103). Same subcategory, same authored clause string, but different verb AND different material descriptor at render time.
**Problem**: `step_photos.prompt_prose.actions[subId]` is a single string. A buyer flipping between Dove (paint) and Driftwood (stain) on the same photo needs the rendered clause to change material. Same gap exists on hardware — Grande Gold (metallic + brushed) vs Sedona Black (metallic + matte) vs a hypothetical plastic/resin option would all need different material phrases.
**Third axis added 2026-04-13**: D103 confirms hardware is a third material axis. The gap isn't just paint-vs-stain for cabinet color — it's paint/stain/metallic/plus-potentially-more across every subcategory that has materially-different option types.
**Hardware also needs a structure variant**: combo options (pulls + knobs) need `"cabinet pulls and knobs"`; all-pulls options need `"cabinet pulls"`. That's a second authoring dimension on top of the material dimension.
**Candidate fixes** (no decision):
- Schema extension: `actions[subId] = string | { painted: string, stained: string, textured: string, metallic: string }`, runtime picks based on option's material category
- Runtime verb + suffix injection: author a placeholder template, runtime substitutes based on a `material_category` column
- New option columns: `material_category` (paint/stain/stone/wood/metal/tile/etc.) + `hardware_structure` (all-pulls / combo / knobs-only) replacing the binary `is_painted`
**Blocked on**: Validating D100/D101/D102/D103 patterns hold on at least 2-3 other photos (Valor, SM Kinkade) + across all 4 Nest rooms. Jumping on a schema change now risks locking a shape that doesn't fit what we find in bathrooms, living rooms, or on different photos.

### 2. Hex anchor injection for textured swatch surfaces
**Learned (D102)**: When a prompt has multiple textured-swatch surfaces AND other surfaces are hex-anchored (paints, stains), every textured clause needs an inline hex anchor ("at hex #XXX" or "matching hex #XXX") to prevent attention-budget cross-wire where swatches bind to the wrong target. The swatch stays in (for pattern/texture), hex is added to text (for color binding).
**Problem**: Currently only painted surfaces get hex treatment via `is_painted` + runtime substitution. Textured surfaces (stone, tile, flooring) never get hex in the clause text.
**Candidate fix**: `buildProsePrompt` auto-appends `" matching hex #XXX"` (or equivalent) to any action clause whose option has `swatch_color` AND isn't already on the `is_painted` hex-only path. Flag-gated for safe rollout.
**Subtleties**:
- The anchor goes AFTER the `{image}` token substitution, not instead of it
- Anchor position in clause may matter (tail vs parenthetical vs inline)
- May need per-material suffix: `"at hex #XXX"` vs `"matching hex #XXX"` — both worked in our tests, unclear which is preferred
- Multi-tone stones (calacatta: white base + grey veining) may not play well with a single hex anchor — needs testing
**Blocked on**: Multi-photo + multi-material validation; confirming the pattern doesn't break reverse-direction transformations (dark source → light target).

### 3. `forceHex` as a production feature, not just a lab flag
**Learned**: The lab's `forceHex` override — cloning the option lookup and flipping `isPainted=true` for listed subcategories — is essentially the mechanism we need for stained wood in production (D101). Stained cabs don't want a swatch, they want the hex + "wood grain" text descriptor.
**Problem**: Today, `buildProsePrompt`'s painted/textured split is binary (`is_painted=true` → hex, else → swatch). Stained wood is a third category that should go down the hex path but with different clause shape.
**Candidate fixes**:
- Add a `render_mode` column to `options` (`swatch` / `hex` / `hex_with_grain` or similar)
- Rename `is_painted` → `use_hex` and generalize — the mechanism is "inline hex in text, skip swatch image," which applies to paint AND stain
- Per-material routing table in runtime
**Blocked on**: Is there a material type beyond paint/stain that wants hex-only rendering? Metal hardware swatches were already noted as a candidate (see D101 trade-offs). Need to explore.

### 4. Zone enumeration as a standard pattern
**Learned**: The phrase `"upper, lower, corner, and center"` defeats BFL's visual-class grouping on Nest kitchen cabinets. Without explicit zone enumeration, Flex drops the isolated left-of-doorway cabinet corner. Zone enumeration is a general technique — the same problem likely exists on any photo with architecturally-isolated cabinet sections.
**Problem**: Today, zone enumeration is authored per-photo in the action clause text. Each photo needs to know its own zones. Authors have to identify them manually per photo.
**Candidate fixes**:
- `step_photos.spatial_hints[subId]` is already meant for this. It's currently used for backsplash (`"wall between upper cabinets and countertop"`) but not for cabinets. Could extend spatial_hints to inject zone enumerations into cab clauses automatically.
- Per-photo `cab_zones` field listing the distinct cabinet zones in the scene
- A scene-level "architectural landmarks" field that clause builders can reference
**Blocked on**: Do other photos need different zone names? Valor has a waterfall island + chimney hood — what are its zones? Need to survey.

### 5. Trailing positional word trap in action clauses
**Learned**: `"cabinet door and drawer front"` is parsed by BFL as "the front face of the drawer" — BFL renders only the front face and leaves the casing unchanged. Dropping `"front"` and using `"drawer"` alone fixes it.
**Problem**: The current validator doesn't flag trailing positional words as a risk. Any clause that ends with a word that doubles as a position (front, back, top, bottom, side) is a landmine.
**Candidate fix**: Add a lint rule in `validatePromptProse` that warns when an action clause ends with one of these words. Soft warning, not a hard error — some legitimate uses exist.
**Cost**: Small. Could ship today without affecting anything else.
**Status**: Low-risk improvement. Could add to the lab validator immediately without waiting for the larger architecture work.

### 6. Model selection per-photo or per-scenario
**Learned**: Flex g=7 was the winner on Nest kitchen for full-gen. Max is slower but more geometrically consistent. Pro changes cabinet geometry between runs (not usable). Different photos or scenarios may have different optimal models.
**Problem**: `IMAGE_MODEL` is currently a global constant. Production hardcodes Max for full-gen and Pro for scoped edits.
**Candidate fixes**:
- `step_photos.full_gen_model` column — per-photo override
- Model heuristic: if photo has >N structural surfaces AND pattern X, use Max; else Flex
- Keep the global and use per-option `scoped_edit_model` (already exists) for the targeted case
**Blocked on**: Cross-photo validation. Is Flex g=7 universally good, or only good on Nest-like layouts? Does Max perform better on Valor's waterfall complexity? Need data.

### 7. Scoped edit path behavior with hex anchors — RESOLVED 2026-04-13
**Learned**: Hardware scoped edit testing on Nest kitchen validated the scoped edit path works on top of a hex-anchored full-gen base image. Key findings:
- **Zone enumeration is required** for scoped edit to reach multiple visual classes (same pattern as D101 for stained cabs). Without `"upper, lower, corner, and center cabinets"` in the clause, scoped edit only updates ONE visual class on two-tone kitchens.
- **Hex placement matters**: inline mid-clause works, trailing parenthetical fails. The `"Match image 2 exactly."` scoped-edit suffix binds to the nearest preceding anchor, so tail-placed hex gets interpreted as "paint this color exactly" and floods the target surface.
- **For metallic surfaces**: material-verb gate around the hex (`"brushed gold finish matching hex #XXX"`) — see D103.
- **For textured surfaces**: D102 inline hex anchor pattern applies directly.
**Resolution**: Moved to D103 and D102's Swatch Authority Rule updates.

### 8. Multi-round cumulative edit source-agnostic behavior — RESOLVED 2026-04-13
**Learned**: Hardware scoped edit test chained a full-gen (driftwood cabs + hex-anchored counter/backsplash/floor) + a scoped hardware swap on top of the resulting image. All 5 hardware options rendered correctly on the cumulatively-edited base. The hex anchor is sourced from `option.swatch_color` which is a fixed attribute of the selected option — it doesn't care about the current state of the base image, so it's source-agnostic by construction.
**Caveat**: Only tested one cumulative depth (full-gen → scoped edit). Haven't tested full-gen → scoped edit → scoped edit → etc. But the mechanism is source-agnostic so deeper chains SHOULD work.
**Resolution**: Pattern confirmed source-agnostic. Will watch for regressions as we test more photos.

### 9. Visual-impact sort order was deliberate for Flux (pre-Flux-2) and may now be wrong
**Learned**: `src/lib/visual-impact-sort.ts` puts backsplash at priority 1 (before counter at priority 3) because backsplash needed long zone enumeration to beat attention decay. That was a Max + v1-prompt-era decision. Flux 2 Flex at g=7 with symmetrized hex anchors has different attention dynamics. Counter being later in the prompt may no longer matter the same way.
**Problem**: The sort is a global code decision. Changing it affects every photo.
**Candidate fixes**:
- Per-photo sort order override in `step_photos.sort_override` JSONB
- Revisit the global default after behavior mapping
**Blocked on**: Does the sort order actually matter once hex anchors are in place? Run a test comparing current sort vs counter-first sort on the same locked recipe.

### 10-b. Tone correction — inline style trailer at g=8 (full-gen) + Klein post-pass (scoped edit)
**Learned (2026-04-13)**: Flex 2 has a warm-bias color cast at default guidance (g=7) that style trailer text doesn't fully counter. Two parallel paths were tested and both work:

**Full-gen path — inline style trailer at higher guidance:**
Bumping Flex guidance from 7 to **g=8** lets the style trailer text actually land. The style trailer:

```
Shot on Canon 5D Mark IV. Warm practical lighting, soft diffused daylight fill, cool interior photography.
```

At g=7: no visible tone effect (Flex bias dominates).
At g=8: tone corrections hold, cool interior photography aesthetic renders.
At g=9: also good, slightly stronger.
At g=10: untested on this recipe but likely over-constrains other elements.

No post-pass, no second BFL call. One full-gen at g=8 lands the tone and the content.

**Scoped edit path — Klein 4B refine pass:**
Scoped edit ignores the prose `style` trailer entirely (by design in `buildProseScopedEdit`). For tone correction on scoped edits, a Klein 4B refine pass with the same prompt:

```
Shot on Canon 5D Mark IV. Warm practical lighting, soft diffused daylight fill, cool interior photography.
```

Applied to the scoped-edit main pass output. ~6-10s per pass, cheap. Validated on the gold-hardware scoped edit — produced visibly cooler output matching the full-gen g=8 result.

**Proposed production integration:**
- Full gen (`fluxGenerate`): bump default guidance to 8 for Flex model. Lock the tone style trailer as the default `style` value in the prose spec. One pass, no architecture change.
- Scoped edit (`fluxScopedEdit`): add a non-blocking Klein 4B tone pass after the main scoped edit. Main image returns immediately; refined image swaps in ~6-10s later via client polling.

**Validation gap:**
- Inline g=8 is only tested on ONE full-gen recipe (Nest kitchen, driftwood merged cabs). Needs cross-recipe and cross-photo validation before shipping.
- Klein 4B post-pass is tested on one scoped edit (Grande Gold hardware). Needs validation on other scoped edit types (color changes, material swaps).
- The tone style trailer itself is tuned to the Nest kitchen aesthetic. Other rooms (bathroom, living room, bedroom) may need different wording.
- g=8 is the current pick; g=9 was also good. The production default should be whichever is more robust across the validation sweep.

### 11. Slide-in range transformation needs its own Flex scoped-edit pass
**Learned (2026-04-13)**: The Nest kitchen has a freestanding range with a raised backguard as the source. Two slide-in range options (GE slide-in, GE slide-in convection) are available as upgrades. Transformation requires removing the backguard AND extending the backsplash into the newly-exposed wall area — a structural change, not just a color/material swap.

**Isolated test**: Flex scoped edit on range alone, clause `"change the range to a slide-in style matching {image}, cooktop flush with countertop, backsplash continues behind the range"` — **worked perfectly** on both g=7 and g=8. Klein 9B did NOT transform (preserved freestanding). Klein 4B was inconclusive.

**Bundled test**: Same range clause included in a full-gen with all other surfaces (cabs, backsplash, counter, floor, hardware, sink, faucet, range). 3 runs. Multiple failures:
- Island merge failed 2/3 (rendered dark grey instead of driftwood)
- Counter drifted 2/3 (white / dark grey instead of steel grey granite)
- Range transformation hard to confirm in any run due to microwave occlusion — likely didn't fire reliably
- Two-pass split fired (9+ swatches), but the range ended up in pass 2 with 4 fixtures competing for attention

**Conclusion**: The range slide-in transformation is **not safely bundled** into a multi-surface full-gen. The structural change (remove backguard + extend backsplash) needs clause attention that the two-pass fixture pass can't give when 4 clauses compete.

**Proposed production pattern** (possibility, not validated):
- Main full-gen runs as normal (multi-surface, all clauses).
- AFTER the main pass completes, check if the selected range is a slide-in variant (or similar structural-transformation option).
- If yes: run a **Flex scoped edit refine pass** on the range specifically, using the same clause that worked in isolation.
- Main image saved first; refine updates it. Could be blocking (total +20s latency) or non-blocking (user sees main first, swap to refined).

**Why Flex, not Max**: Flex scoped edit is ~18-20s vs Max ~30s. Per user feedback, Flex handles the transformation cleanly. Max is overkill. Existing oven-correction refine pass in `generate-photo.ts` uses Max hardcoded — this finding suggests Flex should replace it for the range case.

**Why not Klein**: Klein 9B did not transform the range (preserved freestanding backguard). Klein 4B was visually inconclusive. Structural transformations exceed Klein's targeted-edit capacity.

**Validation gap**: Only tested on Nest kitchen source. Range transformation behavior may differ on photos with different range cutout geometry, different surrounding cabinetry, or different backsplash patterns.

### 10. BFL Flex reference limit is wrong in code
**Found**: `src/lib/bfl.ts` has `MAX_REFERENCES["flux-2-flex"]: 9`. BFL docs say Flex supports up to 8 images total (hero + 7 refs) via the API, matching Max and Pro. Code says 9 refs, would allow payloads BFL would silently truncate.
**Fix**: Change to 7.
**Cost**: 1 line.
**Blocked on**: Nothing. Could ship as its own small commit any time.

## What we're actively exploring

- Nest kitchen (cabs + counter + backsplash + floor + walls): D101 + D102 patterns locked on Flex g=7
- Nest bathroom: untested
- Nest living room: untested
- Nest bedroom: untested
- Scoped edit / cumulative edit behavior: untested
- Cross-photo validation (Valor, SM Kinkade): untested
- Cross-model validation (Max, Pro): partial (we know Pro drifts cab geometry; Max is slower but untested on new patterns)

## How to use this document

When we find something that looks like it'll affect architecture:
1. Add it to the list as an **Open question** with what we learned, what it implies, candidate fixes, and what's blocking a decision
2. Do NOT implement anything until cross-photo validation is reasonably complete
3. When a question has enough data to resolve, move it to a "Resolved" section with the decision and migrate the decision into `memory-bank/decisions.md` as a new D-entry

Items currently on this list are **not** ready to implement. The list is a parking lot, not a backlog.
