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
'
| 1 | **D100** painted: paint+hex (no swatch) | LOCKED | ✓ | ✓ | | ✓ | ✓ | ✓ | Max, Pro, Flex (any) | SHIPPED | D100 |
| 2 | **D101** stained: hex + "wood grain matching" | PARTIAL | ✓ full-gen / ✗ scoped | ✓ | | | | | Flex g=7 full-gen 3/3 on NK; cross-validated on NB 2026-04-14 (driftwood vanity cab in bundled bathroom fullgen landed on first try). **Scoped edit FAILS on all 3 models** (Flex, Klein 9B, Klein 4B) — none reliably hold the driftwood color from a clean white-shaker source via scoped edit. Stain scoped edits should route to full-gen path in production. | LAB-ONLY | D101 |
| 3 | **D102** textured swatch + inline hex anchor | VALIDATED | ✓ | ✓ | | ✓ | | | Flex g=7–8 (winner). Cross-validated on NB 2026-04-14 (Omega Bone floor tile in bundled bathroom fullgen). Cross-validated on NBR 2026-04-14 — all 4 carpet options (taupe, concrete, ecru, whisper) landed distinct and hex-accurate. **Carpet is now a validated D102 surface class** alongside stone/tile/quartz/flooring. Walls in Family C runs also read truer to hex than Family A — symmetrized anchor effect re-confirmed on bedroom. | LAB-ONLY | D102 |
| 4 | **D103** metallic (hardware, faucets, sinks): material-verb gate + hex | **NARROWED 2026-04-15** | ✓ (hand-authored) | ✓ | | ✗ (fans) | | | Flex g=7 scoped (winner, hand-authored); Klein 9B fails. Generalized 2026-04-13 evening from hardware-only to all metallic surfaces. Cross-validated on NB 2026-04-14 — FOUR metallic surfaces on same photo landed in single bundled fullgen. **2026-04-15 scope narrowing**: the canonical inline `<finish> finish matching hex` form is NOT authorable under Finch's current runtime (`{image}` → `image N at hex #XXXXXX` is a contiguous substitution, no slot for a gate descriptor between image and hex). Attempted 4 workarounds (leading qualifier, trailing qualifier, post-hex gate, no-metallic word) — none fix the failure mode PR #3 introduced for metallics (bronze #804A2E rendering as fire-engine red on blue cabs). **Resolution**: PR #5 reverts metallic surfaces to pre-PR-#3 swatch-only path (hex skipped in `buildProsePrompt`/`buildProseScopedEdit` for any `FIXTURE_PATTERNS` match). Swatch alone carries finish correctly, matches pre-PR-#3 validated state. Canonical D103 form deferred until per-option `metallic_finish_gate` column ships (runtime change, can splice gate phrase inline mid-substitution). **Multi-material object limitation (row 20)** still holds for fans. | LAB-ONLY | D103, #20, #25 |
| 5 | Cab zone enumeration `upper, lower, corner, center` | LOCKED | ✓ | | | | | | (all) — required for multi-class reach | LAB-ONLY | D101, D103 |
| 6 | Hardware clause: combo vs all-pulls structures | VALIDATED | ✓ | | | | | | Flex scoped, all 4 finishes | LAB-ONLY | D103 |
| 7 | Symmetrized hex anchors (full-gen multi-swatch) | VALIDATED | ✓ | ✓ | | ✓ | | | Flex g=7–8 (3/3 clean on NK). Cross-validated on NB 2026-04-14 — 5 swatches + 2 hex-text selections on same bundled pass held cleanly. Cross-validated on NBR 2026-04-14 — Family C carpet anchor variants made walls read truer to hex than Family A (no anchor), confirming attention-budget evening effect on a third room type. | LAB-ONLY | D102 |
| 8 | Range slide-in transformation (scoped) | VALIDATED | ✓ | | | | | | Flex g=7/g=8 (winners); Max ok; Klein 9B fails; Klein 4B inconclusive | LAB-ONLY | #11 |
| 9 | Range slide-in **bundled** in full-gen | WORKAROUND SHIPPED | ✓ | | | | | | Bundled pass can't hold the range geometry on its own, but production solves this via a `secondPass` policy (`kitchen-hero-slide-in-range`) — dedicated refine pass triggered when a slide-in range is selected, runs with range swatch as reference image. Validated in prod pipeline via policy resolver tests. | SHIPPED | #11 |
| 10 | Refrigerator add-to-alcove (bundled) | VALIDATED | ✓ | | | | | | Flex g=9 + remove/install fixture pattern, fridge places 3/3 | LAB-ONLY | new |
| 11 | Tone correction: inline style trailer at Flex g=8 | PARTIAL | ~ | | | | | | Works for smaller selection sets; insufficient for bundled fullgen at g=9 (still cartoony) | LAB-ONLY | #10-b |
| 12 | Tone correction: Klein 4B refine post-pass | VALIDATED | ✓ | ✓ | | | | | Klein 4B winner over 9B; ~6-10s; required on bundled fullgen + scoped edit outputs. Cross-validated on NB 2026-04-14 (~11s refine, tone landed clean). | LAB-ONLY | #10-b |
| 12-b | Bundled fullgen pipeline: Flex g=8–9 + Klein 4B refine | VALIDATED | ✓ | ✓ | | ✓ | | | Total ~35s on NB (24s Flex main + 11s K4B refine), ~50s on NK, ~20s on NBR (single Flex g=8 pass, no refine needed on simple bedroom scenes). Cross-validated on NB 2026-04-14 — 7 subcategories (mixed paint/stain/textured/metallic) landed first try. Cross-validated on NBR 2026-04-14 — 3 subcategories (carpet/wall/fan) landed cleanly on Flex g=8 with no refine pass required. Simple scenes (bedroom) can skip the K4B refine; complex scenes (kitchen, bathroom) still benefit from it. | LAB-ONLY | #10-b, #11, new |
| 12-c | Fixture clauses: "remove existing X and install {image}" pattern | VALIDATED | ✓ | | | | | | Flex g=9 — beats "swap X for {image}" by breaking pass-2 incumbent-preservation bias (per BFL expert diagnosis) | LAB-ONLY | new |
| 12-d | Drop range clause when option = photo default | VALIDATED | ✓ | | | | | | Saves a pass-2 attention slot; reduces total swatch count toward single-pass threshold | LAB-ONLY | new |
| 12-e | Backsplash layout-class change via retile verb | VALIDATED | ✓ | | | | | | Flex g=7 (1/1 first test) — `retile the wall ... with {image}, large staggered rectangular tiles in horizontal rows at hex #X`. D102 fails on layout-class changes (mosaic source → rectangular target); retile verb + layout descriptor unlocks it. Avoid `subway`/`metro` (poisoned). Re-validated 2026-04-13 evening across 4 cab combos at g=9 — Glacier 4x16 retile held alongside Dove+Driftwood, Driftwood+Onyx, Fog+Admiral, Dove+Admiral. | LAB-ONLY | D102 update |
| 12-f | Style trailer: `Soft diffused afternoon fill light, neutral interior photography` | LOCKED | ✓ | ✓ | | ✓ | | | Iterated through warm practical → cool practical → soft diffused afternoon fill. Final form: `Shot on Canon 5D Mark IV. Soft diffused afternoon fill light, neutral interior photography.` Validated across 4 NK cab combo runs at g=9, cross-validated on NB 2026-04-14, cross-validated on NBR 2026-04-14 (19 variants at g=8, consistent cool-neutral tone across walls/carpet/fan swatches). Reads consistent and neutral across 3 rooms and 3 material classes — ready to ship as production default. Important side effect: cool-neutral fill intentionally shifts warm finishes (bronze, nickel) toward cooler/darker than swatch pigment — do NOT compare output to swatch pixel values, compare to "how the swatch product would look under cool afternoon fill light." | LAB-ONLY | #11 |
| 12-g | Scoped edit model fitness for **paint** (D100 cab color) | VALIDATED | ✓ | | | | | | **Klein 4B winner** (clean Dove paint, scope preserved). Klein 9B also works. **Flex FAILS** (paint went chartreuse yellow, bled across island). Reversal of full-gen pattern: Klein is the right model for paint scoped edits, NOT Flex. | LAB-ONLY | new |
| 12-h | Scoped edit model fitness for **stain** (D101 cab color) | BROKEN | ✗ | | | | | | All 3 models fail (Flex too-light wood, Klein 9B blonde oak, Klein 4B olive-grey). Stained cab scoped edits are unreliable across the model space. **Production must route stain selections to full-gen path**, not the diff-cache scoped edit path. | LAB-ONLY | D101 |
| 12-i | Scoped edit model fitness for **counter-top** (D102 textured) | PARTIAL | ✓ Flex / ✗ K9B | | | | | | Flex g=7 3/3 (calacatta, steel grey, dallas white) with `change every horizontal countertop surface to match {image} at hex #X` + style trailer. `horizontal` qualifier load-bearing (keeps edit off vertical edges). **Klein 9B BROKEN 2026-04-13**: leaks counter material onto backsplash across all 3 swatches, `horizontal` qualifier does not contain it. Counters are Flex-only. | LAB-ONLY | D102 |
| 12-j | Scoped edit model fitness for **flooring** (D102 textured) | VALIDATED | ✓ | | | | | | Both Flex g=7 and Klein 9B land 3/3 (cinnamon walnut, wild dunes, toasted taupe) with `change all visible flooring throughout the room to match {image} at hex #X` + style trailer. Klein 9B is ~6-10s vs Flex ~18s. First surface where Klein 9B is production-viable for scoped edits. | LAB-ONLY | D102 |
| 12-k | Scoped edit builder appends `prose.style` trailer | VALIDATED | ✓ | | | | | | 2026-04-13 — `buildProseScopedEdit` extended to append the style trailer (previously ignored). Scoped edits now get the same Canon 5D soft diffused afternoon fill light style as full-gen. Tested on counters + floors. | LAB-ONLY | #12-f |
| 12-l | Scoped edit model fitness for **hardware** (D103 metallic) | PARTIAL | ✓ Flex / ~ Klein | | | | | | Klein 4B + 9B both land the right finish across gold/black/nickel but are "pretty close, not good enough" — geometry/sharpness/shine fall short of Flex. Hardware stays Flex-only. Klein is the fast-preview tier, Flex is production. | LAB-ONLY | D103 |
| 12-m | **Policy: Flex is the scoped-edit default; per-option overrides preserved** | LOCKED | ✓ | | | | | | 2026-04-13 — Flex is the default for new options because it works across every surface class tested. **2026-04-14 update**: original framing said "retire the per-option override," but the override capability is real value — Demo org has historically used Klein 9B for hex mosaic backsplash and Max for marble shower tile. PR #1 changed the default from per-option to Flex but the `options.scoped_edit_model` column + admin form + runtime read are preserved. Admins can override on any option that needs it; if no override is set, the runtime falls back to Flex. The pre-2026-04-14 hardcoded range/oven Max exception is gone (data-driven via the column instead). | LAB-ONLY | #12-g,h,i,j,l |
| 12-n | **Policy: bundled-fullgen validation covers scoped** | LOCKED | ✓ | | | | | | 2026-04-13 — surfaces that land correctly inside a multi-surface Flex full-gen don't need separate scoped-edit tests on the same model. Rationale: scoped edit is a strictly smaller prompt (single clause) with the same model, same style trailer, same D100/D102/D103 pattern — if the full clause survives swatch cross-talk in a crowded prompt, it survives alone. **Exception**: stained cabs (12-h) — scoped failed despite full-gen working. Material-specific divergence is the only reason to run an isolated scoped test. | LAB-ONLY | #12-g,h,l, #13 |
| 12-o | **Marble/pattern shower tile → Max, not Flex** | VALIDATED | | ✓ | | | | | 2026-04-14 — Calacatta 12x24 marble shower wall tile requires Max for consistent rendering. Flex produced squashed/non-uniform tiles at any aspect-ratio descriptor tried (explicit 12x24, 2:1, "twice as wide as tall"). Max handles terse clauses and produces uniform tiles across all wall faces. Tradeoff: Max is ~35-45s bundled vs Flex ~22s. Policy: if a selected tile option is marble/patterned (swatch has veining), route the fullgen to Max. Plain tiles (Omega Bone, Onyx White) still work on Flex. Validated at 3/3 consistency on Nest bathroom bundled fullgen. | LAB-ONLY | new |
| 12-p | **Calacatta winning clause** | LOCKED | | ✓ | | | | | `apply {image} to the walls inside the shower in a staggered horizontal pattern, consistent 12x24 tile module on every face` — the "consistent ... tile module on every face" trade phrase is load-bearing: it locks uniform sizing across the different wall faces of the shower stall which was the dominant failure mode earlier. "Staggered horizontal pattern" gives running-bond layout without poisoning orientation. No veining/marble words needed — swatch carries pattern. Max scoped ~30s, Max bundled ~42s. Tile clause is the ONLY action that needs Max; other surfaces are D100/D102/D103 as normal. | LAB-ONLY | D102, #12-e |
| 12-q | Counter-veining bleed side effect on bundled tile | PARTIAL | | ~ | | | | | 2026-04-14 — when Calacatta marble tile is in the bundled prompt, the vanity quartz counter picks up light marble veining even though it wasn't targeted. Minor cosmetic leak, not structural. Hypothesis: Flex/Max are pattern-matching "marble" cross-scene. Future fix candidates: explicit preserve clause for counter, or sequenced 2-pass (tile first, then other surfaces). User approved 3/3 consistency despite the bleed — not a shipping blocker. | LAB-ONLY | #12-o,p |
| 13 | Mixed paint+stain cabs (per-clause material verbs) | **SHIPPED 2026-04-15** | ✓ | ✓ | | ✓ | | | Flex g=7 — both directions 3/3 on NK. Re-validated 2026-04-13 evening across 4 NK cab combos at g=9. Cross-validated on NB 2026-04-14 and NBR 2026-04-14. **Runtime delivery shipped in PR #5**: `actions[subId] = string | { paint, stain }` schema lets a single subcategory carry both verb forms; `pickActionTemplate` helper in `src/lib/generate.ts` dispatches by the selected option's `renderMode` (PR #6 / D104). Solves the mixed paint+stain kitchen cabinet catalog problem that was previously lab-only. Validator accepts both forms. D101 stain verb carve-out allows `wood grain matching` in clauses leading with `stain`. Admin UI treats object form as read-only (SQL-authored) pending per-material pickers. Covers **half** of Open Question #1 (material axis); verb axis and per-option metallic finish gate still BLOCKED. | SHIPPED | D101, #18, #23 |
| 14 | Two-pass split with hex anchors at >7 swatches | VALIDATED | ✓ | | | | | | Flex g=7 (3/3 with symmetrized anchors) | LAB-ONLY | D102 |
| 15 | Multi-round cumulative scoped edits | VALIDATED | ✓ | | | | | | Scoped on hex-anchored full-gen base — 1 cumulative depth | LAB-ONLY | #7, #8 |
| 16 | Trailing positional modifier trap (`drawer front`) | LOCKED | ✓ | | | | | | (all) — guide rule #9 added | SHIPPED-IN-DOCS | guide rule #9 |
| 17 | BFL Flex ref limit code bug (9 → 7) | FIXED 2026-04-14 | — | — | — | — | — | — | — | SHIPPED in PR #1 | #10 |
| 18 | Material-aware action clause rendering (paint/stain/metal) | **PARTIAL 2026-04-15** | — | | | | | | paint+stain axis shipped in PR #5 (`{paint, stain}` action clause object, runtime dispatch via `pickActionTemplate`). Verb axis (recolor vs object-replace, row 23) still BLOCKED — no runtime mechanism to route different SKU families. Per-option metallic finish gate (canonical D103 inline form) still BLOCKED — needs `metallic_finish_gate` column + runtime substitution change. See also row 13 (half-shipped), row 4 (narrowed scope). | PARTIAL | #1, #13, #23 |
| 19 | Klein 4B tone refine non-blocking integration | BLOCKED | — | | | | | | Pipeline integration design needed | NOT IMPLEMENTED | #10-b |
| 20 | **Multi-material object pattern gap (ceiling fans, similar)** | BROKEN | | | | ✗ | | | 2026-04-14 NBR sweep — D103 material-verb gate does NOT transfer to objects with >1 material class (fan housing + blades + light kit + chains). All 4 fan options (black/bronze/nickel/white) tested on Family A (baseline) AND Family B (D103 gate) produced visually indistinguishable results per finish pair. The D103 gate can't bind correctly when a fan has 4 possible material targets; it picks wrong or spreads. No validated pattern exists for "change a multi-material object to a different SKU." Row 12-c's fixture install pattern (`remove existing X and install {image}`) requires a swatch image — fans have swatches but they're poisoned (see row 21). Next test candidates: (a) fan swatches cropped to housing-only close-ups + D102 bare pattern, (b) hex-only no-swatch path with per-component finish descriptors, (c) Max-only scoped edit pass after full-gen with fan clause removed. None tested yet. | LAB-ONLY | #4, #21, #18 |
| 21 | **Swatch contamination: text overlays + multi-component product photos** | BROKEN | | | | ✗ | | | 2026-04-14 NBR sweep — Demo org fan swatches are product photos with (a) text overlays naming blade color options ("Fan Blade Colors: Midnight Black and American Walnut"), (b) walnut blades visible on 3 of 4 fans because the physical product is reversible. BFL reads text in images semantically — the "American Walnut" text overlay is pulling walnut/brass tones into the nickel and bronze fan renders regardless of clause text. Same failure mode likely on any option catalog where the swatches are marketing product photos instead of cropped material close-ups. Mirrors the SM Shaw re-sourcing initiative (73 of 163 swatches replaced 2026-04-09). Production blocker for multi-material option renders. Fix: swatch re-sourcing sweep for Demo org option catalogs (fans, lighting, possibly others). Not a Flux pipeline bug — a data-quality bug. | LAB-ONLY | #20, SM Shaw re-sourcing |
| 22 | **Baseboard profile differentiation at standard room framing** | BROKEN (removed) | | | | ✗ | | | 2026-04-14 NBR sweep — attempted to differentiate 5" / 7" / 1x6 craftsman baseboard profiles via clause text. All variants rendered identical. Three converging failure reasons: (1) pixel budget — baseboards occupy 8-12 vertical pixels at room-framing distance, 5"→7" height delta is 2-3 pixels, below Flex resolution, (2) wrong verb family — `paint` is a recolor verb and can't express profile replacement, and we didn't have swatch images to use the object-install pattern from row 12-c, (3) incumbent preservation bias on small peripheral surfaces. Also tested `reinstall ... taller baseboard` (expert override): scene-wide drift from the new verb + no visible profile delta. **Resolution (2026-04-14): baseboard subcategory removed from Nest demo entirely.** Not tractable via prompt engineering alone. Would require (a) swatch images per profile AND (b) a closer-framed photo where the wall-floor junction occupies 60+ vertical pixels AND (c) an object-install clause pattern. Generalizable rule: subcategories whose visual delta is subpixel or near-pixel at the test photo's framing are not viable targets for prompt-engineering-based differentiation — they belong in price-only UX or need a dedicated closeup crop. | REMOVED FROM DEMO | #18, #20 |
| 23 | **Verb-axis distinction: recolor vs object-replace** | VALIDATED (as framing) | ✓ | ✓ | | ✓ | | | 2026-04-14 NBR sweep surfaced a missing architecture axis: subcategories bifurcate along a verb axis, not just a material axis. **Recolor verbs** (`paint`, `stain`, `change to match`) apply when options are color/finish variants of one physical product — cabinets, wall paint, baseboards-if-same-profile, counters. **Object-replace verbs** (`change`, `replace`, `remove-and-install`) apply when options are different physical SKUs — ceiling fans, faucets, ranges, refrigerators, possibly baseboards-if-profile-matters. The two axes are orthogonal: a metallic fixture can be object-replace (D103 swap) while a painted trim piece is recolor (D100). Today the prose authoring treats all subcategories the same way — one clause string per subcategory — which works for recolor but underfits object-replace. Production authoring gap: no runtime mechanism to route based on verb axis. See Open Question #1 update. | LAB-ONLY | #1, #18 |
| 24 | **Hardware → Max full-gen routing** | **VALIDATED + SHIPPED 2026-04-15** | ✓ | | | | | | NK hardware sweep 2026-04-15: tested 5 clause variants × 5 guidance levels (g=6–10) × 5 hardware finish options on Flex. **Flex shape-fidelity gap is absolute on small metallic objects** — installs its generic rectilinear bar-pull prior regardless of Seaver arched eyebrow, Sedona hourglass-tapered, or Stanton rectilinear swatch. Guidance does not help; clause rewording does not help; verb family (remove/install vs change/match) does not help. Klein 9B matches Flex's failure. Klein 4B matches AND drifts cabinet color onto unrelated surfaces (reproducible teal shift on Admiral Blue cabs). Pro renders decent hardware BUT unreliably restructures unrelated surfaces (added drawer fronts to an island that was a flat slab in pass 1; drifted upper cabs to dark brown wood on sedona-combo variant). **Max is the only model that reads the swatch reference image faithfully, differentiates knobs vs pulls across door/drawer placement, AND preserves everything else.** Shipped in PR #5 as runtime routing: `selectFullGenModel` pure helper + `hasHardwareRoutingTrigger` single-source-of-truth oracle (called by both `deriveGenerationContext` at cache-key layer and pipeline layer so they can't diverge). Routing fires only when a `MAX_ROUTING_PATTERNS` slug has a real swatch (skips `-none` / builder-standard defaults). Single-pass ≤7 swatches → whole pass on Max. 2-pass split forced → pass 1 Flex + pass 2 Max (hardware always lives in pass 2 per `FIXTURE_PATTERNS`). Cost impact: ~$0.11/kitchen vs $0.08 pre-PR-#5 (+37%), ~45s Max vs 18s Flex (2.5x slower) — acceptable for hardware-selecting renders. | SHIPPED | #4, #25, D103 |
| 25 | **Flex shape-fidelity gap on small metallic objects** | BROKEN (model workaround shipped) | ✗ | | | | | | Lab-confirmed 2026-04-15 — Flex's training-data prior for "cabinet bar pull" is a generic straight rectilinear bar, and that prior overrides swatch reference images for objects small enough that the surface area < ~2% of the frame. Arched/curved/hourglass/ornate profiles all collapse to the generic bar. Guidance 6–10 inclusive does not change behavior. Clause rewording (remove/install, change/match, leading qualifier, trailing qualifier, no-gate) does not change behavior. Workaround: route to Max (row 24). Future mitigation candidates (untested): (a) swatch cropping / dedicated close-up swatches, (b) Max-only scoped-edit post-pass after Flex full-gen with hardware clause removed, (c) Klein 9B/4B validated for paint scoped edits but fails hardware shape. Do NOT use Klein 4B for hardware — drifts cab color. Do NOT use Pro — restructures unrelated surfaces between runs (confirms pre-existing `Pro is rejected (changes cabinet geometry between runs)` warning from 2026-04-13). | MODEL WORKAROUND | #4, #24 |
| 26 | **Pass-1 intermediate caching in the lab** | VALIDATED 2026-04-15 | — | — | — | — | — | — | `fluxGenerate` returns `pass1ImageBuffer` when it 2-passes; lab saves it as `${variant.id}-${runIndex}-pass1.jpg`. New `Variant.baseImage` + `Variant.selectionsReplace` fields let future variants run pass-2-only experiments on the cached pass 1 at ~$0.04 each instead of re-billing the structural pass. Shipped in PR #5 along with a pre-warm swatch cache bug fix (was using global selections vs per-variant effective selections, caused per-variant swatch lookup failures when `selectionsReplace` was set). Used tonight to iterate on 12+ hardware clause variants without re-rendering pass 1 every time. | LAB ONLY | #24 |
| 27 | **D102 hex-word activates Flex mosaic prior on floor-tile** | **SHIPPED 2026-04-18** | | ✓ | | | | | Flex-scoped. Lab on Nest bathroom: `image N at hex #XXXXXX` anchor made Calacatta 12x24, Omega Grey 13x13, Silver 13x13, and Onyx Matte 12x24 all render as hex-mosaic floor regardless of swatch layout. Dropping the literal word `hex` (→ `image N at #XXXXXX`) fixed all 4 tiles. Narrowed via new `isFloorTileSubcategory(subId)` helper — only slugs containing `floor-tile` take the `at #` branch; counters, backsplashes, fireplace tile, showers keep the full `at hex #` form that's known to work. Two hex-anchor substitution sites in `src/lib/generate.ts` updated; 2 new tests guard both branches. First attempt was a global runtime change that RB flagged as over-scoped — narrowing pattern now codified (`feedback_scope_runtime_changes_before_editing.md`). | SHIPPED | D102 |
| 28 | **Floor-tile scoped containment via geometry anchor** | **SHIPPED 2026-04-18** | | ✓ | | | | | Flex-scoped. Nest bath shipped `change the main bathroom floor tile to match {image}` 2026-04-17 — word `tile` + shared visual class pulled shower wall tile along with floor swap on Omega Grey (non-marble). New clause `change the horizontal bathroom floor under the tub and vanity to match {image}` names two fixed landmarks outside the shower to implicitly exclude it without naming it (naming shower reactivates the class). Validated contained swap on both Omega Grey (was bleeding) and Calacatta (regression check). `under the <landmark>` geometry pattern is reusable for any scoped edit whose target shares a visual class with an adjacent surface. | SHIPPED | D102, #12-o |
| 29 | **`bath-hardware` needs hex anchor — narrow D103 skip to cabinet-hardware** | **SHIPPED 2026-04-18** | | ✓ | | | | | Flex-scoped + bundled. D103 hex-skip was matched by substring `"hardware"` which swept `bath-hardware` (wall-mounted towel bars, TP holders) along with cabinet pulls. Lab on Tiburon Satin Nickel against matte-black Nano Banana source: scoped with hex anchor rendered clean silver (no anchor rendered black). Bundled with hex anchor also rendered silver; bundled without failed silver→black. New helper `isCabinetHardwareSubcategory(subId) = subId.includes("cabinet-hardware")` narrows the skip to `kitchen-cabinet-hardware` + `bathroom-cabinet-hardware` only. D103 bronze-distortion rule was only ever validated on cabinet pulls; narrowing restores hex attention binding for wall-accessory metallics. | SHIPPED | D103, #4 |
| 30 | **Faucet spec descriptors (`widespread`, `centerset`) block silver swaps** | **SHIPPED 2026-04-18** | | ✓ | | | | | Flex scoped + bundled. Original bath-faucets clause `replace both widespread vanity sink faucets with {image}` failed to render Holliston Brushed Nickel silver against matte-black source — 0/N across all earlier bundled attempts. Dropping `widespread` (removing the spec descriptor) made silver land cleanly on all 3 verbs in scoped isolation (change/apply/replace). Shipped with `apply {image} to both vanity sink faucets` because in bundled context `apply` produced clearly reflective metallic cab-hardware sheen vs `change` rendering flat-looking pulls. Generalizes: descriptors naming the installed fixture's spec (`widespread`/`centerset`/etc.) are swatch-authority violations and anchor the current finish, blocking the swatch override. Same class as `hex` in #27, `framed` potentially, and the "don't describe the source" rule on photo baselines. | SHIPPED | D103, guide rule |
| 31 | **Clause testing methodology** | **LOCKED 2026-04-18** | — | — | — | — | — | — | RB-standard matrix for testing a single clause's wording: sweep `change` / `replace` / `apply` (3 non-material verbs) and toggle any suspect descriptor (`widespread`, `framed`, `large-format`, `hex`, etc.) on/off. Minimum 3 variants for verb-only, 6 for verb + descriptor toggle. Test in same path as the production failure (scoped vs bundled — results aren't comparable across paths). Keep current production clause as baseline for direct comparison. Codified as `reference_clause_testing_methodology.md` in private memory. Applied to faucet test (row 30) and future clause debug work. | DOCS | #30 |

**Hot blockers** (most important things to unstick):
- **Cross-photo validation** — NK + NB + NBR validated 2026-04-14. D100/D102/symmetrized anchors/style trailer/pipeline cleared on 3 rooms. Still need **NL (Nest Living Room)** plus at least one non-Nest room (Valor or SM Kinkade) before graduating LAB-ONLY rows to LOCKED. Bedroom sweep surfaced 3 new findings (rows 20/21/22) and 1 architecture axis (row 23).
- **#10 fridge cab revert** — bundled fridge run regressed cabs; need to understand why fridge fits OK but cab clauses get knocked out of pass 1
- ~~**#9 range bundled**~~ — resolved: production ships `kitchen-hero-slide-in-range` secondPass policy
- **#18 material-aware clauses** — production authoring gap. Now a bigger gap: the bedroom sweep surfaced a **verb-axis dimension** (row 23) on top of the existing material axis. Paint/stain/metallic is one axis; recolor/object-replace is a second orthogonal axis. Schema migration needs to handle both. User deferred implementation until more cross-photo evidence — bedroom adds evidence but LR and a non-Nest room would solidify.
- **#21 swatch contamination** — NEW blocker. Demo org fan swatches (and likely lighting, possibly others) are marketing product photos with text overlays that poison renders. Parallel to the SM Shaw re-sourcing initiative. Production-blocking for any subcategory that inherits this data-quality issue. Needs its own sourcing sweep.
- **Demo org stale data** — Backfill 2026-04-14: bedroom (11 options: 3 baseboards, 4 fans, 4 carpets), then 16 more (5 secondary-bath cabs, 4 primary-shower tiles, 4 door-hardware, 3 fireplace mantels). Demo org now at 29 painted/D101 + 71 textured/metallic with hex set + 12 multi-material objects deliberately skipped (lighting, great-room-fan, interior-door-style — row 20 broken pattern). All textured/metallic options now produce D102/D103 hex anchors automatically via PR #3.

## Architecture restructure (in progress 2026-04-14)

Pivot decision: Demo Nest kitchen/bathroom/LR photos being regenerated via **Nano Banana** (Gemini Flash Image) so the demo runs cleanly on Flex without the Max-only workarounds (marble shower tile, slide-in range, oven correction). Architecture simplifies to **Flex + Klein only** as the default model lineup. Max + Pro stay as callable BFL models but are no longer defaults. Plan file: `/Users/rb/.claude/plans/moonlit-soaring-scone.md`.

**Shipped:**

1. **PR #1** (commit `4b57a06`) — Flex+Klein lineup. `IMAGE_MODEL` flux-2-max → flux-2-flex. BFL Flex ref cap 9 → 7 (row 17 fixed). Hardcoded range/oven Max exception removed from `fluxScopedEdit` (now data-driven via the per-option override column). PostHog `BFL_IMAGE_COST` corrected against bfl.ai pricing (Max $0.07, Pro $0.03, Flex $0.06, Klein 9B $0.015, Klein 4B $0.014). **Note**: PR #1 over-removed the per-option `scoped_edit_model` runtime read and admin form by mistake; PR #4 restored both — see PR #4 entry below.
2. **PR #2** (commit `540243a`) — Canon 5D style trailer as default. `DEFAULT_PROSE_STYLE` updated, exported, and folded into `DEMO_GENERATION_CACHE_VERSION` hash. `buildProseScopedEdit` now falls back to the default trailer when `prose.style` is unset (was emitting empty trailer — row 12-k regression fix). Stale `prompt_prose.style` overrides NULL'd on 5 step_photos so they all resolve to the new default. Doc drift fixed in `step-config.ts`, `PhotoManager.tsx`, `bfl-prompt-engineer.md`, `architecture.md`, `bfl-prompting-guide.md`.
3. **PR #3** (commit `b0baaa7`) — D102 hex anchor auto-injection. `ActionEntry.swatch` variant gains `swatchColor`. `resolveMerges` and `buildProsePrompt` thread the option's `swatch_color` through entry construction via `normalizeAnchorHex` (whitespace + format guard). Substitution loop renders `image N at hex #XXXXXX` instead of bare `image N` when the option has a valid hex. `buildProseScopedEdit` parallel substitution. Dev warning on divergent merge hexes. 10 new tests covering positive injection, graceful skip, painted untouched, trailing positional/enumeration content, dimensions parenthetical placement, merged clause, scoped edit parallel, prod-shape `swap X for {image} keeping…` clause, and defensive cases against malformed hex values.
4. **PR #4** — Restore per-option `scoped_edit_model` override capability. PR #1's framing was "retire the per-option override" but the column carries real value (Demo org has historically used Klein 9B for hex mosaic backsplash, Max for marble shower tile). PR #4 restores: the runtime read in `fluxScopedEdit` model selection chain (`opts.model ?? changed?.option.scopedEditModel ?? SCOPED_EDIT_MODEL`), the PATCH route write path (no longer silently dropped), and the admin form dropdown (functional Flex/Pro/Max/Klein 9B/Klein 4B picker with "Default (Flex)" as the empty value). The 36 SM Kinkade rows that had per-option overrides set are preserved. Column NOT dropped — the original migration was discarded after recognizing that an unused column is free and a one-way drop throws away historical intent for no gain.

Then: **Demo org swatch_color backfill** (16 options across 4 subcategories — secondary-bath cabinets, primary shower tile, door hardware, fireplace mantel). 71 textured/metallic options now produce hex anchors automatically.

Then: **SM Kinkade + Lenox temporary disable** (commit `f7900a6`). All 8 SM floorplans set `is_active=false` while SM hasn't been re-validated on Flex. The org chooser at `stonemartin.withfin.ch` already grayscales + de-clicks inactive floorplans (`/[orgSlug]/page.tsx` keys off `fp.is_active`); a parallel 404 guard added in `/[orgSlug]/[floorplanSlug]/page.tsx` so direct deep links can't bypass the gating. Re-enable by flipping `is_active=true` on the relevant rows once SM is validated.

**Still in the queue:**

- (nothing — the architecture restructure tasks are done)

**Still blocked on validation** (NL + non-Nest cross-check):
- D101 stain scoped-edit failure routing
- D103 scope narrowing to single-material only
- Row 18 / Open Question #1 — full material+verb axes schema migration. The template catalog design lives in the watchlist locked-recipes section; an actual `src/lib/prose-templates.ts` file is not worth writing until the runtime caller is being implemented (otherwise it just becomes stale draft code).

## Locked recipes (canonical clause templates)

These are the validated clause templates by pattern. Copy-paste ready.

**Runtime substitution rules — READ THIS**:
- `{image}` is the **only** token the runtime substitutes. Dispatch is on `options.render_mode` (D104): `hex_paint` and `hex_stain` → becomes `hex #XXXXXX` and no swatch image is sent. `swatch_metallic` → becomes `image N` with no inline hex anchor (metallic finish lives in the swatch). `swatch_textured` → becomes `image N at hex #XXXXXX` (D102 anchor) when `swatch_color` is set, otherwise `image N`.
- `#XXXXXX` in the templates below is a **literal placeholder for hand-authoring** — the runtime does NOT substitute it. When you use a template like `change <target> to match {image} at hex #XXXXXX` for a D102 inline hex anchor, you must hand-write the actual hex into the prose clause at authoring time. This is the root of the material-axis authoring gap (row 1 / row 18): a single prose clause can't carry per-option hex without schema changes.
- D100 painted options render their hex via `{image}` substitution — the clause `paint <target> to match {image}` becomes `paint <target> to match hex #F5F5F0` at runtime for a white trim option.
- D102 inline hex anchors are now AUTO-INJECTED by the runtime when an option has `swatch_color` set (PR #3 shipped 2026-04-14, commit `b0baaa7`). Authors no longer write `at hex #X` into prose clauses by hand — they author `to match {image}` and the substitution loop renders `to match image N at hex #XXXXXX` for textured/metallic options. The "literal placeholder" warning above only applies to the legacy hand-authored form which is no longer needed.

### D100 — Painted surface (no swatch image)
Full-gen AND scoped edit, any model:
```
paint <spatial target> to hex #XXXXXX
```
- No swatch image sent; hex rendered inline in clause text
- Routed via `option.render_mode = "hex_paint"` + `swatch_color` → hex path in `buildProsePrompt`/`buildProseScopedEdit` (D104)
- Works everywhere tested: Nest kitchen cabs + walls, Nest bathroom vanity cabs + walls

### D101 — Stained wood (no swatch image)
Full-gen on Flex g=7–9 (scoped edit is BROKEN per row 12-h):
```
stain <spatial target> with wood grain matching hex #XXXXXX
```
- Same hex path as D100 — `render_mode = "hex_stain"` + `swatch_color` set, but the clause uses `stain...wood grain` verb structure (D104)
- Zone enumeration often required: `"upper, lower, corner, and center cabinet doors and drawers"`
- Cross-validated on Nest bathroom (driftwood vanity cab, 2026-04-14)

### D102 — Textured swatch with inline hex anchor
Full-gen on Flex g=7–9 AND scoped edit on Flex:
```
change <spatial target> to match {image} at hex #XXXXXX
```
Common variants by surface:
- **Counter**: `change every horizontal countertop surface to match {image} at hex #XXXXXX` (the `horizontal` qualifier is load-bearing — keeps edit off vertical edges)
- **Flooring**: `change all visible flooring throughout the room to match {image} at hex #XXXXXX`
- **Bathroom floor/tile (if actual floor visible)**: `change the bathroom floor to match {image} at hex #XXXXXX`

**Layout-class change (backsplash, subway-to-rectangular, etc.) → retile verb** instead of `change`:
```
retile the wall between the upper cabinets and countertop with {image}, large staggered rectangular tiles in horizontal rows at hex #XXXXXX
```
- Avoid `subway` and `metro` — poisoned words in Flex priors
- Safe layout vocab: `staggered rectangular tiles`, `horizontal rows`, `running bond`, `large flat tiles`, `brick-pattern tiles`

### D103 — Metallic fixtures with finish gate
Full-gen on Flex, scoped edit on Flex:
```
change <spatial target> to match {image}, <finish> finish matching hex #XXXXXX
```
- `<finish>` values validated: `brushed gold`, `matte black`, `oil-rubbed bronze`, `satin nickel`, `brushed nickel`, `gunmetal nickel`
- Material-verb gate (`<finish> finish matching hex`) is load-bearing. Bare hex without gate flattens metallic sheen. No hex at all breaks color consistency on multi-class scenes.
- Hex goes inline mid-clause, NOT trailing parenthetical (scoped-edit `"Match image 2 exactly"` suffix binds to nearest preceding anchor — hex at tail gets reinterpreted as flood color).
- Structural variants: `cabinet pulls and knobs` for combo options, `cabinet pulls` for all-pulls. Don't use `drawer front` (positional modifier trap).
- Cross-validated on Nest bathroom: brushed nickel faucets + satin nickel towel ring + oil-rubbed bronze vanity pulls + gunmetal mirror frames, all four metallic types on same photo landed in one bundled fullgen.

### 12-p — Marble shower wall tile (Max required)
Scoped edit AND bundled full-gen on **Max only**:
```
apply {image} to the walls inside the shower in a staggered horizontal pattern, consistent 12x24 tile module on every face
```
- **Max required**: Flex produces non-uniform tile sizing across shower wall faces at any aspect-ratio descriptor. Max handles terse clauses and produces uniform tiles 3/3 times.
- **Load-bearing**: `consistent ... tile module on every face` — trade phrase that locks uniform sizing across the different wall faces of the shower stall.
- **No veining/marble text**: swatch carries pattern. Adding "marble veining" in text didn't help.
- **No "only"**: forbidden word. Use positive spatial phrasing.
- **Side effect**: vanity counter picks up light marble veining when Calacatta is in the bundle (row 12-q, non-blocker).
- **Plain tiles** (Omega Bone matte, Onyx White matte) still work on Flex with D102 pattern.

## Style trailer (locked)

```
Shot on Canon 5D Mark IV. Soft diffused afternoon fill light, neutral interior photography.
```

- Used as the inline `style` field on prose v2 spec for full-gen
- Used as the Klein 4B refine prompt on scoped edit outputs (where the style field is now ALSO respected as of 2026-04-13 via row 12-k — `buildProseScopedEdit` appends the style trailer)
- Iterated through `warm practical lighting` (too warm) → `cool practical lighting` (still off) → `soft diffused afternoon fill light` (locked). Validated on NK bundled fullgen, 4 cab combos at g=9, cross-validated on NB bathroom bundled 2026-04-14.

## Forbidden words and poisoned priors

The BFL Flux prompting guide has a forbidden word list. Don't paraphrase it from memory — delegate prompt work to `bfl-prompt-engineer` which knows the current list. Known bans as of 2026-04-14:

| Word / phrase | Why |
|---|---|
| `only` | Flips attention in bad ways; use positive spatial phrasing instead |
| `not` / `NOT X` exclusion | Negative framing; affirmative enumeration only |
| `keep` as preservation verb | Triggers unintended model behavior; use positive type declarations: `"A color change only — X remain as they appear in image 1"` |
| `island` | Use `freestanding center structure` or similar |
| `subway` | Flux Flex prior = white; overrides everything |
| `metro` | Same family as subway, likely poisoned |
| Material/color/tile-format words (`marble`, `glossy`, `white`, `tile`) | Swatch is the sole appearance authority — these override the swatch |

**Positive preservation pattern** (use instead of "keep"):
```
A <attribute> change only — <surface> remain as they appear in image 1
```
- Type declaration bounds the operation linguistically without any preservation verb
- Positional anchor (`remain as they appear in image 1`) names which reference image owns the geometry

## Per-material model routing (validated)

| Material class | Full-gen model | Scoped edit model | Notes |
|---|---|---|---|
| Paint (D100) | Flex g=7–9 | Flex (policy 12-m) | Hex path, no swatch |
| Stain (D101) | Flex g=7–9 | **BROKEN on all models** — route to full-gen | Hex path, no swatch |
| Textured stone/quartz (D102) | Flex g=7–9 | Flex (policy 12-m) | Swatch + hex anchor text |
| Metallic (D103) | Flex g=7–9 | Flex (policy 12-m) | Swatch + `<finish>` gate |
| Plain matte tile | Flex g=7–9 | Flex (policy 12-m) | D102 pattern |
| **Marble / patterned stone tile** | **Max** | **Max** | 12-o/p — Flex can't produce uniform tile sizing |

Klein 4B / 9B / Flex / Pro / Max tested extensively 2026-04-13–14. Klein models are sanity-pass quality for scoped edits (leak surfaces, soften edges) except floors where Klein 9B is on par with Flex. Pro is rejected (changes cabinet geometry between runs). Max is slower but required for patterned-tile use cases.

## Open questions / candidate changes

### 1. Material-aware action clause rendering — now TWO orthogonal axes (material + verb)
**Status update (2026-04-15, D104)**: The material axis is now partially encoded via the `options.render_mode` enum (`hex_paint | hex_stain | swatch_metallic | swatch_textured`) — PR #6 replaced the misnamed `is_painted` flag. Runtime dispatch in `buildProsePrompt` / `buildProseScopedEdit` / `resolveMerges` now switches on `render_mode` instead of cascading through `(is_painted, swatch_color, isFixtureSubcategory)`. This covers the substitution layer (hex-path vs swatch-path, anchor-injection vs swatch-only) and makes the metallic fixture skip structural instead of a substring-match guard. **It does NOT cover the verb axis** (recolor vs object-replace) or hardware structure (combo vs all-pulls). Those still need the changes below.

**Learned**: Painted options need `"paint ... to hex #XXX"` (D100). Stained wood options need `"stain ... with wood grain matching hex #XXX"` (D101). Metallic hardware options need `"change ... to match {image}, <finish> finish matching hex #XXX"` (D103). Same subcategory, same authored clause string, but different verb AND different material descriptor at render time.

**Problem**: `step_photos.prompt_prose.actions[subId]` is a single string. A buyer flipping between Dove (paint) and Driftwood (stain) on the same photo needs the rendered clause to change material.

**Axis 1 — material** (paint / stain / metallic / textured / tile / etc.): discovered 2026-04-13 across D100/D101/D102/D103 lab work.

**Axis 2 — verb** (recolor / object-replace): added 2026-04-14 from NBR fan sweep (row 23). Subcategories split along whether their options are color variants of one product (recolor: `paint`, `stain`, `change to match`) or different physical SKUs (object-replace: `change`, `replace`, `remove-and-install {image}`). A metallic fixture can be object-replace while a painted trim piece is recolor — the two axes are orthogonal, and a production schema needs to encode both.

**Hardware also needs a structure variant** (third sub-dimension on material): combo options (pulls + knobs) need `"cabinet pulls and knobs"`; all-pulls options need `"cabinet pulls"`. That's a second authoring dimension on top of the material dimension.

**Candidate fixes** (no decision):
- Schema extension: `actions[subId] = string | { painted: string, stained: string, textured: string, metallic: string }`, runtime picks based on option's material category. **Does not cover the verb axis.**
- New option columns: `material_category` (paint/stain/stone/wood/metal/tile/etc.) + `verb_mode` (recolor/object-replace) + `hardware_structure` (all-pulls / combo / knobs-only, for metallic-replace options) replacing the binary `is_painted`. Runtime builds the clause from per-option metadata + a per-subcategory template.
- Template DSL: author per-subcategory templates with named slots (`{material_verb} the <target> to match {image} <material_descriptor> matching hex #<option_hex>`), runtime fills from option metadata. More powerful, more complex.

**Blocked on**: Validating D100/D101/D102/D103 patterns hold on at least 2-3 other photos (Valor, SM Kinkade) + NL. Three Nest rooms validated, one more plus a non-Nest cross-check before schema migration. Jumping on a schema change now risks locking a shape that doesn't fit what we find in LR or on different photos.

### 2. Hex anchor injection for textured swatch surfaces — SHIPPED 2026-04-14 (PR #3), narrowed 2026-04-15 (PR #5 fixture skip), structurally cleaned 2026-04-15 (PR #6 / D104)
**Current state**: Runtime auto-injects `image N at hex #XXX` for every `render_mode = "swatch_textured"` option carrying `swatch_color`. Metallic surfaces (`swatch_metallic`) are excluded structurally via the enum — PR #3 originally applied hex to every swatch option, PR #5 narrowed via substring-matching on `FIXTURE_PATTERNS`, PR #6 made the skip structural so the substring guard dropped out of `buildProsePrompt` entirely. Substitution resolves at the `ActionEntry` construction site — metallic entries get `swatchColor: null` upstream and the substitution loop is a plain truthy check.

**Remaining open questions** (not blocking):
- Multi-tone stones (calacatta: white base + grey veining) may not play well with a single hex anchor — validated on some textured surfaces but not calacatta specifically
- Reverse-direction transformations (dark source → light target) not systematically tested
- Anchor-phrase variant (`"at hex"` vs `"matching hex"`) — both work, picked `"at hex"` for consistency

### 3. `forceHex` as a production feature, not just a lab flag — RESOLVED 2026-04-15 (D104)
**Resolved via**: `options.render_mode` enum shipped in PR #6. The lab's `forceHex` override was the dry-run of this production shape. Stain now has a first-class slot (`hex_stain`) alongside paint (`hex_paint`), and metallic (`swatch_metallic`) vs textured (`swatch_textured`) are explicit instead of inferred from substring patterns. Lab's `forceHex` flag still exists and now sets `renderMode: "hex_stain"` on a cloned lookup so per-material clauses still pick the stain key — it remains useful for testing a surface under the hex path before committing its DB `render_mode`.

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

- **Nest kitchen** (cabs + counter + backsplash + floor + walls): D100/D101/D102/D103 + symmetrized anchors + style trailer validated on Flex g=7–9
- **Nest bathroom** (vanity cabs + floor tile + shower tile + metallic fixtures + paint): validated 2026-04-14 as bundled fullgen, 7 subcategories first try. Marble tile routed to Max (row 12-o).
- **Nest bedroom** (carpet + wall paint + fan): validated 2026-04-14 across 15 variants on Flex g=8. D100 walls cross-validated on 4 non-default hex values, D102 carpet cross-validated on all 4 options, D103 fan **failed** (multi-material object gap, row 20), baseboard subcategory removed from demo entirely (row 22). Fan swatch contamination surfaced (row 21).
- **Nest living room**: untested. Next target.
- **Scoped edit / cumulative edit behavior**: validated on NK (row 15). Untested on NB, NBR.
- **Cross-photo validation (Valor, SM Kinkade)**: untested. At least one non-Nest room required before graduating LAB-ONLY rows to LOCKED.
- **Cross-model validation (Max, Pro)**: partial (we know Pro drifts cab geometry; Max confirmed for marble/pattern tile row 12-o; Max/Pro untested on bedroom). Flex g=7–9 is the proven workhorse.

## How to use this document

When we find something that looks like it'll affect architecture:
1. Add it to the list as an **Open question** with what we learned, what it implies, candidate fixes, and what's blocking a decision
2. Do NOT implement anything until cross-photo validation is reasonably complete
3. When a question has enough data to resolve, move it to a "Resolved" section with the decision and migrate the decision into `memory-bank/decisions.md` as a new D-entry

Items currently on this list are **not** ready to implement. The list is a parking lot, not a backlog.
