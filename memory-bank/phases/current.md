# Current Phase: Sales Outreach + Generation Quality

## Context

V1 product is fully shipped. SM and Demo orgs are live. Homepage, research pages, learn hub, VS comparisons, prospect demo pages — all live. Flux 2 pipeline shipped and refactored. **Demo↔SM tenant isolation complete (2026-04-10)** — SM is now independently deletable; `scripts/audit-tenant-bleed.ts` is the living verifier; see `completed.md` #36 and `memory-bank/project/swatch-storage-contract.md`. See `completed.md` for the full history.

Now focused on: builder outreach (provocation-first strategy), generation quality fixes, and SEO content expansion.

## Active Workstreams

### 1. Sales Outreach (Primary Focus)

**Strategy shift (2026-03-23):** Moved from inquisitive outreach (asking about their process) to provocation-first. Lead with visualization lift data (every builder doing viz sees 20-40% more in option sales), not Toll/Pulte SEC comparisons (dismissable as luxury). Practitioner voice, not tinkerer. Demo pages are a follow-up asset built after engagement, not pre-outreach. LinkedIn connection requests have no links (platform blocks them) — links go in the first DM after they accept.

**Campaign 3 — LIVE (uploaded 2026-04-03):**
- **CSV**: `outreach/campaigns/c3-full.csv` — **93 leads, 51 companies**. All kitchen photos Playwright-verified.
- **Approach**: Permission-ask. "I put together a short video of your {{floorplan}} kitchen with different finishes. Want me to send it over?"
- **Sending from**: rashaad@heyfin.ch + anton@heyfin.ch (both warmed since mid-March)
- **Daily limit**: 10/mailbox (20 total), weekdays 8am-5pm Central
- **Settings**: Plain text, no tracking, no links, stop on reply
- **Cut builders**: See `completed.md` #31/#32 for C1/C2 results. C3 cuts documented in git history.

**Outreach automation (2026-04-01):**
- **Apollo → Instantly**: Native integration (push leads directly, skip CSV)
- **Instantly → Notion auto-sync**: Vercel Cron polls every 15 min (`/api/cron/instantly-sync`). On reply: Notion Status → "Replied" + Interaction row. On bounce: Status → "Bounced" + Interaction row. Cursor-based (Supabase `sync_cursors` table).

**LinkedIn content (started 2026-04-02):**
- Week 1 (Apr 2): POSTED — "39% wish they spent more" stat + Dennis Webb/Fulton Homes quote. Tagged @Greg Bray.
- Week 2 (Apr 8): POSTED — Houzz buyer quotes. Personal framing ("digging around to see if other folks had similar experiences"). 5 real buyer quotes from forums, no editorial close. No links, no pitch.
- Full content calendar: `outreach/linkedin-post-ideas-april-2026.md`

**LinkedIn engagement automation (built 2026-04-03):**
- **Script**: `scripts/linkedin-post-finder.ts` — ScrapingDog → LinkedIn Post API. 15 keyword searches. Noise filtering, dedup, seen-posts tracking.
- **Cowork task**: "linkedin-digest" — hourly. Drafts comments (subscription Claude), posts to Slack webhook.
- **Cost**: ~125 ScrapingDog credits/run (~3K/day, under 1M/mo plan). Drafting free (Cowork).
- **Cowork prompt**: `outreach/cowork-linkedin-digest.md`

**Active LinkedIn prospects:**
- [ ] **Doug French** (Stylecraft, CEO) — 1st connection, no reply. Demo at `withfin.ch/for/stylecraft`.
- [ ] **Steve Snoddy** (Davidson, Dir Sales AZ) — Demo at `withfin.ch/for/davidson`. DM drafted.
- [ ] **Janna Pettegrew** (ICI, Design Center Mgr) — 1st connection accepted. Demo at `withfin.ch/for/ici`. No reply to initial DM.
- [ ] **Mary Mead** (McKinley, VP Sales) — Engaged: visited demo page desktop + mobile, hit Visualize. Sent LinkedIn DM with generated image. Demo at `withfin.ch/for/mckinley`.
- [ ] **Matt Sims** (Viera, Area Sales Mgr) — 1st connection accepted. Demo at `withfin.ch/for/viera`. DM drafted, not sent.
- [ ] **Dee Crescini** (WestBay, VP Design) — InMail sent with Key Largo II kitchen image. Demo at `withfin.ch/for/westbay`.
- [ ] **Myers Barnes** (HomebuilderAI, Sales Strategist) — NOT a builder. Legendary sales trainer. Reached out first after Rashaad commented on his posts. Email sent 2026-04-03 (peer conversation, no pitch). Strategic value: distribution/amplification. Promotes Anewgo — don't challenge yet.

**Playbooks:**
- Cold call script (`outreach/cold-call-script.md`)
- LinkedIn outreach playbook (`outreach/linkedin-outreach-playbook.md`)
- Prospect demo ops (`outreach/prospect-demos.md`)
- InMail targets (`outreach/inmail-targets.md`)
- Cowork contractor guide (`outreach/cowork-research-guide.md`)

### 2. Flux 2 Generation Quality (Architecture Restructure In Progress)

**Lab sweep status** — 4/4 Nest rooms validated:

| Room | Status |
|---|---|
| Nest Kitchen | ✓ done 2026-04-14 (D101/D102/D103 locked); **re-tuned 2026-04-15** after new photo landed — scope trimmed, prose rewritten, hardware shape-fidelity gap surfaced → Max routing shipped |
| Nest Bathroom | ✓ done 2026-04-14 (bundled fullgen, 7 subs, first try) |
| Nest Bedroom | ✓ done 2026-04-14 (15 lab variants, baseboard removed from demo, 3 new findings + verb-axis architecture insight) |
| Nest Living Room | ✓ done 2026-04-15 (scope trimmed 12→3 after new photo, new `living-room-cabinet-color` subcategory seeded, prose v2 authored + lab-validated) |
| Valor / SM Kinkade | pending (non-Nest cross-check) |

**Architecture restructure (in progress 2026-04-14)** — Plan: `/Users/rb/.claude/plans/moonlit-soaring-scone.md`. Pivot decision: Demo Nest kitchen/bathroom/LR photos getting regenerated via **Nano Banana** (Gemini Flash Image) so the demo runs cleanly on Flex without Max-only workarounds. Architecture simplifies to **Flex + Klein only** as the default model lineup.

**Shipped today (2026-04-14):**
1. **PR #1** (`4b57a06`) — `IMAGE_MODEL` flux-2-max → flux-2-flex, BFL Flex ref cap fix (9→7), hardcoded range/oven Max exception removed (now data-driven via the per-option override column), PostHog cost map corrected against bfl.ai pricing. Per-option `scoped_edit_model` runtime read was also removed but later restored — see PR #4.
2. **PR #2** (`540243a`) — Canon 5D style trailer as default, `buildProseScopedEdit` falls back to default trailer (row 12-k regression fix), 5 stale `prompt_prose.style` overrides NULL'd to default.
3. **PR #3** (`b0baaa7`) — D102 hex anchor auto-injection. Runtime substitutes `{image}` → `image N at hex #XXXXXX` for any textured/metallic option with `swatch_color` set. Prose authors no longer hand-write hex anchors.
4. **PR #4** (`a2cfc92`) — Restored per-option `scoped_edit_model` override capability that PR #1 over-removed. Original PR #4 plan was "drop the column" but the column carries real value (Demo org has historically used Klein 9B for hex mosaic backsplash, Max for marble shower tile). The 36 SM Kinkade rows of historical intent are preserved. Runtime read restored, PATCH route re-accepts the field (now Zod-enum-validated), admin form is a real dropdown again. New `selectScopedEditModel` helper extracted + 4 unit tests so the regression can't happen again.

**Shipped 2026-04-15:**

5. **PR #5** (`f2351be`) — Hardware → Max routing + per-material action clauses + lab pass-1 cache. Four distinct architecture changes in one commit, all lab-driven:
   - **Hardware → Max full-gen routing.** Selections containing any `MAX_ROUTING_PATTERNS` slug with a real swatch route to Max (single-pass) or hybrid Flex pass 1 + Max pass 2 (when 2-pass split is forced). Flex was installing its generic bar-pull prior regardless of the Seaver arched eyebrow / Sedona hourglass / Stanton rectilinear swatch shapes; Max reads the reference image correctly and differentiates knobs on doors vs pulls on drawers. Klein 9B + Klein 4B fail shape fidelity; Klein 4B also drifts cabinet color onto unrelated surfaces; Pro unreliable (shifts island geometry or upper cab color across runs). Max was the only model that rendered correct hardware AND preserved everything else. `selectFullGenModel` is a pure helper; `hasHardwareRoutingTrigger` is the single-source-of-truth oracle that both `deriveGenerationContext` (cache-key layer) and `selectFullGenModel` (pipeline layer) call so the cache key and the runtime model can't diverge. `modelsUsed: string[]` plumbed through `FluxGenerateResult` → both Inngest functions → DB `model` + PostHog `cost_usd` + PostHog `model` label. `estimateBflCost([...])` array overload sums per-pass costs for hybrid flex+max runs.
   - **Per-material action clause object.** `actions[subId] = string | { paint, stain }` — runtime picks the clause based on the selected option's `is_painted` flag. Solves the mixed paint+stain kitchen cabinet catalog problem that Row 13 validated in lab. `pickActionTemplate` helper centralizes dispatch for full-gen and scoped edit. Validator accepts both forms. D101 stain verb carve-out: clauses leading with `stain` may contain `wood grain matching` (the canonical D101 phrase) without tripping the forbidden-material-word guard.
   - **Fixture hex-skip revert (narrows PR #3 scope).** PR #3 auto-injected D102 hex anchors for every swatch option with `swatch_color` set. On metallic fixtures (hardware/faucet/sink/range), this flattened the metallic finish to bright saturated paint — bronze read as fire-engine red. D102 was only lab-validated for textured stone/tile/quartz/flooring surfaces; the blanket application to metallics was overreach. `buildProsePrompt` and `buildProseScopedEdit` now skip hex injection for any subcategory matching `FIXTURE_PATTERNS`, falling back to the pre-PR-#3 swatch-only path. Textured surfaces keep the D102 anchor unchanged. This narrows Row 4 / D103 scope: the canonical `<finish> finish matching hex #XXX` inline-gate form is not authorable under Finch's current runtime substitution model (`{image}` → `image N at hex #XXXXXX` is contiguous, no slot for a gate between image and hex), so metallics render swatch-only for now. Per-option `metallic_finish_gate` column is the proper fix — deferred until cross-photo validation on Valor/SM cleared.
   - **Lab pass-1 intermediate cache + `baseImage` + `selectionsReplace`.** `FluxGenerateResult.pass1ImageBuffer` exposes the 2-pass structural intermediate. Lab saves it automatically as `${variant.id}-${runIndex}-pass1.jpg`. New variant fields: `baseImage` (load a saved file as the variant's input image — supersedes the refine-coupled `inputImageOverride`) and `selectionsReplace` (REPLACE global selections entirely vs merging). Pass-2-only experiments (e.g. "test N hardware clause variants against the same cached pass 1") now run single-pass on the cached pass 1 at ~$0.04/variant instead of re-rendering pass 1 every time. Pre-warm swatch cache bug fixed — was using global selections instead of per-variant effective selections, causing per-variant swatch lookup failures.
   - **Cache version bump v4.2 → v4.3.** Flushes the PR #3 "orange bronze hardware" rows from the prod cache. `DEMO_GENERATION_CACHE_VERSION` folds `MAX_ROUTING_PATTERNS` into its hash input so future routing pattern changes auto-invalidate.
   - **Admin UI:** per-material object clauses treated as read-only with a JSON preview (deferred per-material pickers until they're needed). Client-side string-clause validation skips object form; server-side validator catches structural issues at save time.
   - **Tests:** 249 → 283 (+34). Covers per-material schema, fixture hex-skip regression, `requiresMaxRouting`, `selectFullGenModel` routing, `estimateBflCost` array overload, and `deriveGenerationContext` hardware-routing integration.

6. **PR #6 — `render_mode` enum + routing oracle unified.** Post-PR-#5 cleanup pass targeting two frankenstein shapes in the prose pipeline. See decisions.md D104 for full rationale + backfill rules.
   - **`is_painted` flag → `render_mode` text enum** on `options` (`hex_paint | hex_stain | swatch_metallic | swatch_textured | NULL`). Column name was a lie — `is_painted=true` actually meant "render via hex-only path" which covered both D100 paint AND D101 stain. Dispatch in `buildProsePrompt` / `buildProseScopedEdit` / `resolveMerges` collapses from a 5-path `(isPainted, swatchColor, isFixtureSubcategory)` cascade into a single switch on `render_mode`. The `isFixtureSubcategory` substring guard drops out of the prose path entirely — metallic entries carry `swatchColor: null` upstream so the substitution loop is a plain truthy check.
   - **`hasHardwareRoutingTrigger` oracle** in step-config.ts. `deriveGenerationContext` (cache-key layer) and `selectFullGenModel` (pipeline layer) both delegate. PR #5 had tests at both sites; now the structural forcing function backs them up. The duplicate selection-iteration loop is gone from generate.ts.
   - **Latent data hygiene fixed inside the same migration** (because render_mode classification depends on hex presence): 12 SM stain options (laundry/powder/primary-bath/secondary-bath Cappucino/Driftwood/Sahara) got hex backfilled from slug patterns; 9 SM primary-bath paint options (Admiral Blue/Blue Smoke/Buttercream/Fog/Onyx/Pacific Sand/Saddle/White/Willow) got hex backfilled from same-name kitchen-cabinet-color twins. 9 crown/baseboard rows mis-tagged `is_painted=true` without hex are left alone — they fall through to `swatch_textured` via the catchall and render via swatch as intended (they're molding profile swaps, not paint).
   - **Final distribution**: Demo 33 hex_paint / 3 hex_stain / 46 swatch_metallic / 37 swatch_textured / 17 NULL (legacy prompt-descriptor-only). SM 54 / 15 / 147 / 269 / 127. SM hex_paint went 45 → 54 in-migration (the 9 primary-bath twin backfill).
   - **Intentionally NOT collapsed**: `FIXTURE_PATTERNS` is still separate from render_mode because the two-pass split is about ref-limit pressure, not color binding. Dual builder (`buildProsePrompt` v2 vs `buildEditPrompt` legacy) is migration state not code shape. Material-axis vs verb-axis mismatch (watchlist row 23 / Open Q #1) is a deeper design question, not a rename — still open.
   - **Files touched**: `supabase/migrations/20260415_options_render_mode.sql` (new), `src/types/index.ts` (Option.renderMode + RenderMode export), `src/lib/db-queries.ts`, `src/lib/generate.ts` (resolveRenderMode helper + dispatch switches), `src/lib/step-config.ts` (hasHardwareRoutingTrigger), `src/lib/flux-pipeline.ts` (delegates to oracle), `src/lib/generate.test.ts` + `src/lib/__fixtures__/generation.ts` (rename), `scripts/prompt-lab.ts` (forceHex sets `renderMode: "hex_stain"` on cloned lookup).
   - **Tests**: 283 → 283, `npx tsc --noEmit` clean. No new tests — existing per-material, D102 fixture-skip, and merge tests already exercise every render_mode branch through the `renderMode` field or the `resolveRenderMode` fallback.

**Lab session 2026-04-15 findings (not yet in the watchlist):**
- **Flex shape-fidelity gap on small metallic objects.** Tested across 5 clause variants, 5 guidance levels (g=6-10), and 5 different hardware options. Flex installs its generic rectilinear bar-pull prior regardless of what the swatch shows (arched eyebrow / hourglass-tapered / rectilinear / combo with knob). The prior is stronger than the swatch reference signal; guidance does not help; clause rewording does not help. Max reads the swatch correctly. Klein 9B matches Flex's failure. Klein 4B matches AND drifts cabinet color. Pro renders decent hardware BUT unreliably restructures unrelated surfaces (island geometry, upper cab color).
- **Pro's "changes cabinet geometry between runs" warning (watchlist old note) is confirmed reproducible** on hardware renders — island got extra drawer fronts added on bronze variant, upper cabs drifted to dark brown wood on sedona-combo variant.
- **The "remove existing X and install {image}" pattern (Row 12-c) is structural verb correctness, NOT a shape-fidelity fix.** Tested on Flex after the verb rewrite — rendered output was identical to the prior `change X to match` verb. Shape fidelity required the Max model switch.
- **Cost: ~$3-4 of BFL credits burned across the hardware sweep.** 40+ generations total including the iteration loops + model comparison + guidance sweep + per-finish tests. Max is ~2.5x slower than Flex (~45s vs ~18s) but ~17% more expensive per MP — acceptable tradeoff for hardware-selecting runs.

**Demo org swatch_color backfill 2026-04-14** — 16 options (5 secondary-bath cabinets, 4 primary shower tile, 4 door hardware, 3 fireplace mantel) on top of the earlier bedroom backfill (11 options). Demo org now at 29 painted/D101 + 71 textured/metallic with hex anchors active + 12 multi-material objects deliberately skipped (lighting, great-room-fan, interior-door-style — row 20 broken pattern).

**SM Kinkade + Lenox temporary disable** (`f7900a6`) — All 8 SM floorplans set `is_active=false` while SM hasn't been re-validated on Flex. Org chooser at `stonemartin.withfin.ch` already grayscales + de-clicks inactive floorplans (`/[orgSlug]/page.tsx` keys off `fp.is_active`); added a parallel 404 guard in `/[orgSlug]/[floorplanSlug]/page.tsx` so direct deep links can't bypass the gating. Re-enable by flipping `is_active=true` on the relevant rows once SM is validated.

**Still in queue:**
- **Nano Banana** — separate workstream, regenerate Nest demo source photos for kitchen/bathroom/LR
- **Phase 3 implementation** — material+verb axes schema migration. Blocked on NL + non-Nest validation. Phase 3a (draft template catalog file) was cancelled — it was design-only with no runtime caller, premature artifact. Locked recipes already live in the watchlist + bfl-prompting-guide.

Pipeline shipped and refactored (see `completed.md` #35). These quality issues remain:

**Prose spec v2 shipped 2026-04-11.** New bare-minimum per-photo prompt spec
replaces the previous prose builder that violated BFL rules with a hallucinated
`subject` field. Schema: `{ version: 2, actions, lead?, style?, preserve? }`
with forbidden-word and word-count enforcement at save time. Scoped edits now
reuse the same `actions` map. `preserve[]` is empty on day 1 — we trust Max
to leave unselected surfaces alone via the base image, add preservation
clauses only when an empirical test shows Max freelancing a specific surface.
Valor is the first photo on v2. See `memory-bank/generation/bfl-prompting-guide.md`
"Prose spec builder (v2)" section for the full rules. Builders:
`buildProsePrompt` / `buildProseScopedEdit` / `validatePromptProse` in
`src/lib/generate.ts`.

**Prompt Lab (built 2026-04-12).** Core internal CLI tool for prompt tuning.
Every new demo/tenant photo goes through the lab. Full docs: `memory-bank/generation/prompt-lab.md`.

**Prompt Lab hardening + stained wood breakthrough (2026-04-13):**

Spent a full day in the lab stress-testing on Nest kitchen. Three major outcomes:

1. **Lab was silently broken before this session.** `prompt-lab run` called `buildProsePrompt` + `generateImage` directly, bypassing `fluxGenerate`. That meant two-pass split never fired in the lab, and BFL silently truncated swatches above the ref limit (dropped the range swatch on every run). Every multi-swatch lab result from before today was invalid. Fixes shipped:
   - `prompt-lab run` now delegates to `fluxGenerate` / `fluxScopedEdit` — same path production takes
   - `bfl.ts` throws on ref truncation instead of warning (silent data loss is never right)
   - Added `maxWaitMs`, `steps`, `guidance` passthrough to `FluxGenerateOpts` / `FluxScopedEditOpts`
   - Lab default concurrency = `min(queueLength, 12)` per BFL's 24-concurrent limit (two-pass doubles request count)
   - Lab poll timeout bumped from 90s → 180s per pass
   - Added lab-only `forceHex: string[]` flag on variants — flips `isPainted=true` on a cloned option lookup so prose routes through the hex path for specific subcategories, independent of DB state
   - `show` command now previews two-pass split boundaries when they would fire in production
   - **Latent bug found, NOT fixed yet**: `MAX_REFERENCES["flux-2-flex"]` in `bfl.ts` is set to `9` but BFL API cap is `7` refs (8 total incl. hero). Not affecting current tests (we send ≤3 swatches to Flex) but needs a correction pass.

2. **Stained wood can render from hex + "wood grain" text alone (D101, 2026-04-13).** Old D100 said stained wood needs a swatch because hex can't express grain. Wrong. `"stain every upper, lower, corner, and center cabinet door and drawer with wood grain matching hex #B09A7E"` + `forceHex` rendered 3/3 clean on Flex g=7 with full visible wood grain synthesized from the hex + descriptor. Zone enumeration (`upper, lower, corner, and center`) defeats BFL's visual-class grouping that was dropping isolated left-of-doorway cab sections. Also learned: `"drawer"` not `"drawer front"` — trailing `"front"` parses as a positional modifier and BFL leaves the casing unchanged.

3. **Symmetrized hex anchors fix multi-swatch attention cross-wire (D102, 2026-04-13).** On the Nest kitchen with cabs (hex via D101) + backsplash (swatch) + counter (swatch) + floor (swatch), the counter swatch systematically failed (10% pass rate across 21 runs, 7 clause variants). Diagnostic: dark granite sometimes landed on island base or floor instead of counter — attention binding failure, not swatch comprehension. Fix: append inline hex anchor to every textured-swatch clause (`"apply {image} to every countertop surface matching hex #6B6E72"`). Symmetrizes text weight across surfaces so no single surface steals the attention budget. **Tested on Flex g=7: 3/3 clean full scene.** Higher guidance works BETTER with symmetric text anchors (g=6 was 2/3, g=5 was 0/3).

**Winning full-scene recipe for Flex 2 on Nest kitchen** (two-tone stained cabs + dark granite + dark herringbone backsplash + warm wood floor + white walls):

```
Model: flux-2-flex, steps=50, guidance=7
forceHex: [kitchen-cabinet-color, kitchen-island-cabinet-color]

- stain every upper, lower, corner, and center cabinet door and drawer with wood grain matching {image}
- change the wall surface between the upper cabinets and countertop to match {image} at hex #3D3D3D
- apply {image} to every countertop surface matching hex #6B6E72
- change all visible flooring throughout the room to match {image} at hex #9A8268
- paint every wall surface to match {image}  (runtime-substituted to hex via is_painted)
Photorealistic real estate photography, cool-toned natural daylight, neutral white balance.
```

~21s average on Flex (vs Max ~36s on same scene). Full 3/3 clean.

**Added afternoon 2026-04-13 — hardware scoped edits validated (D103):**

Continued the session on Nest kitchen testing hardware scoped edits. Five hardware options validated across four finishes (brushed gold, matte black, oil-rubbed bronze, satin nickel) + both all-pulls and combo structures. Key finding: metallic surfaces need a **material-verb gate** around the hex anchor — the D102 bare-hex pattern flattens metallic surfaces, and the guide's "omit hex for metal" guidance breaks multi-class color consistency. The fix parallels D101's stain pattern:

```
change cabinet pulls on upper, lower, corner, and center cabinets to match {image}, brushed gold finish matching hex #CCBA78
change cabinet pulls and knobs on upper, lower, corner, and center cabinets to match {image}, matte black finish matching hex #1A1A1A
```

The material descriptor ("brushed gold finish", "matte black finish") tells Flex to interpret the hex as a color waypoint on a reflective material, not as flat paint RGB. The swatch still carries the metallic texture/sheen.

Also validated this session: scoped edit path + cumulative edits (watchlist items #7 and #8 resolved). A scoped hardware swap on top of a full-gen base (driftwood cabs + symmetrized hex anchors on backsplash/counter/floor) preserved the scene correctly and applied the new hardware across all visual classes.

Other hardware-specific findings captured in D103:
- Zone enumeration (`"upper, lower, corner, and center cabinets"`) is required for scoped edit to reach multiple visual classes — same fix as stained cabs.
- Hex must be inline mid-clause, NOT in a trailing parenthetical. The `"Match image 2 exactly."` auto-suffix from `buildProseScopedEdit` binds to the nearest preceding anchor.
- "Change" verb beats "Replace" for repeated small objects (hardware across multiple cabinets). "Replace" is BFL's pattern for single large objects.
- Dimensions: single relative phrase. `"slim bar pull, small relative to cabinet face"`. Three competing scale signals ("small slim bar pull, roughly a hand's span wide") produced framing-bar-sized hardware.
- Combo options (pulls + knobs) need different clause text than all-pulls options. Production authoring gap — same material-aware rendering problem as D101.
- Trailing positional modifier trap confirmed on hardware (critical rule #9): `"drawer front"` was parsed as "the front face of the drawer" and Flex left the casing unchanged. Use `"drawer"` alone.

Also swapped the Demo org's `hw-key-grande-pulls-brushed-gold` swatch from the round Key Grande style to the squared Stanton style (uploaded to Demo org storage path via `scripts/upload-stanton.ts`). Renamed the option to "Stanton All Pulls - Brushed Gold" in DB.

**Not yet shipped:**
- Cross-photo validation (only tested on Nest kitchen). Need to verify on Valor + at least one SM Kinkade room before locking the pattern in production.
- Production runtime integration — hex-anchor injection for textured swatches should auto-apply when an option has `swatch_color` set. Currently lab-only via manual clause authoring.
- Material-aware action clauses — now THREE material axes (paint/stain/metallic per D100/D101/D103). Production authoring gap expanded. See `memory-bank/generation/flux2-architecture-watchlist.md` #1.
- Hardware combo-vs-all-pulls structure variation is a new authoring dimension on top of material — may need a `hardware_structure` column on options.
- Cross-finish hardware tests (4 of 5 options were single-run visual checks). Need 3-run consistency confirmation on each before production use.

**Paint+hex SHIPPED (2026-04-13, D100).** Runtime detection in `buildProsePrompt` — when an option has `is_painted = true` and `swatch_color`, the builder substitutes hex inline and skips the swatch reference image. Dramatically better color fidelity on painted finishes: Dove landed as white 3/3 with hex vs ~2/15 with swatches.
  - **Prose clauses authored with `{image}` always** — runtime decides swatch vs hex. No token changes at authoring time.
  - **Verb matters**: action clauses for painted subcategories MUST use "paint" verb (not "apply" or "change"). The paint+hex pattern is both parts — the runtime hex substitution AND the authored verb. Enforced by convention, not code.
  - **`is_painted` column** set on all painted options across both orgs (cabinets, islands, wall paint, baseboard, crown, trim, ceiling, accent, bath vanity).
  - **Updated prose:**
    - Valor kitchen (`step_photos.prompt_prose`) — "paint" verb on cab/island
    - Nest kitchen, living room, bathroom, bedroom (`step_photos.prompt_prose`) — "paint" verb on cab/island/wall/trim
    - `/try` sample kitchen (`SAMPLE_KITCHEN_PROSE` in `src/lib/demo-generate.ts`) — "paint" verb on cab/island. Also switched backsplash to "apply" (source photo has no existing backsplash, "change" confused Flux). Counter clause uses "resting on top of" for explicit horizontal targeting.
  - **`/try` cache invalidated** — `DEMO_GENERATION_CACHE_VERSION` is derived from the prose hash. The 200 pre-seeded combos from `seed-demo-cache.ts` are stale. Re-seed when ready (~$20).
  - Test coverage: 4 new tests in `generate.test.ts` covering full gen, scoped edit, merged clause with painted options, and fallback when `isPainted=true` but `swatchColor=null`. 234 total tests passing.
  - Docs: `decisions.md` D100, `memory-bank/generation/bfl-prompting-guide.md` (swatch authority rule updated), `feedback_paint_hex_verb.md` (reminder for future sessions).

- [ ] **Countertop scoped edit bleeds onto island face** — tried 3 hint iterations. Current hint avoids "island" but still bleeds on some combos. May need adjacency preservation clause in `buildScopedEditPrompt` or Klein 9B for countertop edits.
- [ ] **Inconsistent cabinet rendering between full gen runs** — same fog paint swatch produces visibly different results across runs. Likely Flux Max non-determinism, not a code bug. **Mostly resolved by D100 paint+hex** for painted finishes. Stained options (Driftwood) still exhibit some run-to-run variance in door profile.
- [ ] **Re-seed `/try` demo cache** — `DEMO_GENERATION_CACHE_VERSION` changed after D100. Run `npx tsx scripts/seed-demo-cache.ts`.
- [ ] **Apply paint+hex to remaining prospect demos** — the 12 other prospect demos (alexander-scott, davidson, westbay, stylecraft, mckinley, ici, viera, chesapeake, kolter, neal, rocklyn, signature) are still on the legacy builder (no v2 prose). When writing their v2 prose, use "paint" verb for painted cab/island/wall/trim actions.
- [ ] Test non-kitchen SM rooms (bedrooms, bathrooms)
- [ ] **Audit other prospect demos for loose backsplash spatial hints** — one at a time. Same failure mode as Valor (zone undercoverage or doorway bleed) likely exists on the rest. Review order: alexander-scott ✓ → davidson ✓ → westbay → stylecraft → (then mckinley, ici, viera, chesapeake, kolter, neal, rocklyn, signature). 11 of 12 had the identical generic hint `"backsplash wall between the upper cabinets and the countertop"`.

**Backsplash dimensions stripped (SHIPPED 2026-04-09):** Glacier (and any low-saturation backsplash) was rendering near-white because the `dimensions` column on every backsplash option contained material words ("wide subway tiles", "small herringbone mosaic", "beveled subway tiles"). The word "subway" specifically activated Flux's strong "subway tile → white" prior, which dominated whenever the swatch color signal was weak.
  - **Fix**: NULL `dimensions` on all 30 backsplash options across both orgs. Pure swatch authority — no text bias on tile pattern/color. Swatch image alone carries pattern, scale, and color.
  - This was a violation of the existing swatch-authority rule (`memory-bank/architecture.md`: "No color/material words in dimensions"). The DB had drifted from the rule and nobody noticed until Glacier started reading as white.
  - 8 stale cached Glacier rows in `generated_images` deleted. After cache bust, Glacier renders as the cool slate-gray it actually is.

**Prospect demo backsplash spatial hint audit (IN PROGRESS 2026-04-09):**

Per-kitchen hint pattern: always include the geometric "upper cabinets above AND countertop below" AND condition (it's what excludes doorways/openings with no uppers). Add explicit clauses for non-standard zones (chimney hood alcoves, recessed niches, etc.). No material/color/tile-format words — violates swatch authority. Workflow: look at actual photo → delegate to `bfl-prompt-engineer` → use output verbatim → DB + local config sync → clear cached gens → test.

- **Valor** ✓ SHIPPED 2026-04-09 — three zones (coffee niche left of range, cooking alcove behind range, right strip between range and fridge); arched doorway on left had to be excluded.
  - Hint: `wall areas under the upper cabinets and above the countertop — left of, behind, and right of the range`
- **Alexander Scott (Langston)** ✓ SHIPPED 2026-04-09 — chimney hood (not under-cabinet) means the backsplash extends UP to the ceiling behind the cooktop; left-side doorway opening to exclude; recessed open shelving niche to exclude.
  - Hint: `wall areas with both upper cabinets above and countertop below, plus the wall behind and above the cooktop up to the chimney hood`
- **Davidson (Hidden Hills)** ✓ SHIPPED 2026-04-09 — complex kitchen with chimney hood, wall oven column, recessed wine niche, and a waterfall seating peninsula with barstools tucked under the overhang. Fixed 3 hints + removed `kitchen-island-cabinet-color` from the floorplan.
  - backsplash: `wall areas with upper cabinets above and countertop below along the back wall, plus the wall behind and above the cooktop up to the chimney hood`
  - kitchen-cabinet-color: `upper and lower cabinet doors and drawer fronts along the left wall, the back wall on both sides of the range hood, and the right wall on both sides of the refrigerator`
  - counter-top: `horizontal slab surfaces resting on the perimeter base cabinets, plus the top slab of the freestanding center structure and the short left end of that center structure where the slab wraps from the top down to the floor as a continuous waterfall panel`
  - `kitchen-island-cabinet-color` removed from `step_photos.subcategory_ids`, `steps.sections`, and `steps.spatial_hints`. The visible island cabinet area is too small to justify a buyer selection — covered by barstools and trivially handled by defaulting to the perimeter color.

**Lessons from the prospect demo audit so far:**
- Don't dismiss spatial hint references to landmarks (e.g. "coffee niche") without verifying against the actual photo. I was wrong to call Valor's "coffee niche" hallucinated — it was real.
- Direct DB writes to `options`/`subcategories`/`steps` don't bust the Next.js `unstable_cache` (24h TTL on `categories:${orgId}` tag). Either use admin UI to trigger `invalidateOrgCache`, or warn user that change won't be visible until restart/redeploy.
- Chimney hoods need an explicit second clause for the "above upper cabinet line" wall area — the geometric AND alone under-covers because there are no uppers directly above the cooktop.
- **Barstools occluding island faces are a persistent misread trap.** In Davidson, both me and the bfl-prompt-engineer repeatedly misread the wood-grain of barstool frames + wood flooring visible between the barstool legs as "continuous waterfall slab." User had to correct us with a close-up showing "this is not granite, it's wood." Rule: when a surface is mostly occluded by foreground furniture, default to assuming the surface matches the default cabinet/wall behind the furniture, not assuming it continues the adjacent slab.
- **Don't launder opinions through subagents** — writing "Consider X" or "NOT Y" into a brief is dictating the answer, not delegating. Open briefs only. (See `feedback_dont_launder_opinions_through_subagents.md`.)
- **Waterfall islands are hard demo subjects.** The countertop selection dominates 60%+ of visible island surface, and buyer perception sours when patterned stones cover faces they expect to be cabinet panels. Consider picking non-waterfall hero photos for future prospect demos when available.

**Persist-step latency fix (SHIPPED 2026-04-09):** `persist` step was taking ~3s after every successful generation, blocking the client from seeing the image. Three causes:
  1. `persist` did a full download + re-upload of the ~1.5MB JPEG to move it from an intermediate path (`*_main.jpg`, `*_scoped.jpg`, `*_refine.jpg`) to the canonical `outputPath`. Two HTTP round trips + byte transfer just to rename a file.
  2. `captureAiEvent` was awaited with `flushAt: 1`, adding a ~300-800ms PostHog network flush to the critical path.
  3. DB upsert and PostHog flush ran sequentially inside the same step, so the client couldn't see the image until PostHog returned.
  - **Fix**: Generate/scoped-edit steps now write **directly** to `outputPath` (no intermediate path, no copy). Only refine still parks the main pass at `mainPassPath` so it can fall back via server-side `storage.move()` on failure — success path orphans `mainPassPath` in a fire-and-forget remove.
  - **Fix**: `persist` split into two steps — `save-image` (just the DB upsert) and `track` (PostHog). As soon as `save-image` completes, the polling client sees the final image URL. PostHog runs after, off the critical path.
  - Same pattern applied to `generate-demo.ts` (both full-gen and scoped-edit branches).
  - Touches `generate-photo.ts` and `generate-demo.ts` only. No schema/API/client changes. 179 tests still pass.

**Retry forces Flux 2 Max (SHIPPED 2026-04-09):** Buyer-initiated retries were hitting the partial-cache diff match and sometimes landing on a Flex/Klein/Pro scoped edit — defeating the whole point of "retry to get a better result." Now `retry: true` flows from `/api/generate/photo` → Inngest event → `generate-photo.ts`, which short-circuits `findSingleSurfaceDiffMatch` and runs full Max. `leaveOneOutHashes` still written so the new Max image seeds partial cache for future different-selection gens. Also closed a race: retry delete now clears `__pending__` rows (cancel-in-place) — previously an in-flight non-retry scoped-edit could hand back its result via 429→poll, silently breaking the guarantee. Tests assert `retry` flag propagation in both paths.

**SM swatch audit + Shaw re-sourcing (SHIPPED 2026-04-09):** Discovered that the original Feb 17 SM swatch scrape pulled many bad images from Stone Martin's CMS — labeled product boards with text watermarks ("PHOTO TO SHOW TILE COLOR NOT GROUT COLOR"), installed shower scenes instead of tile swatches, zoomed product details with only 1–2 tiles visible, duplicate files across different finishes (ORB = satin nickel), wrong-color paint chips. Our resize/compress pipeline never touched these — they were always bad, just silently tanking generation quality.
  - **Audit tool**: `scripts/audit-sm-swatches.ts` downloads every SM swatch (485 total), measures bytes/dimensions, and renders `tmp/swatch-audit.html` — a contact sheet grouped by Category → Subcategory with size flags + overlayed visual flags.
  - **Visual review**: 14 parallel `bfl-prompt-engineer` subagents reviewed all 485 swatches by reading local files and flagging problems. Results merged into `tmp/swatch-visual-review-flat.json`. **163 flagged** (106 critical + 57 concern).
  - **Brand research**: `scripts/build-swatch-replacement-batches.mjs` split flagged items by brand/product line. 10 `general-purpose` subagents researched each brand in parallel, using WebSearch/WebFetch/Playwright to find clean catalog shots. First wave hit multiple 529 overload errors from Anthropic's API — retrying in small waves of 3 avoided it.
  - **SM sources tile almost entirely from Shaw Industries**. CDN pattern: `https://img.shawinc.com/s7/is/image/ShawIndustries/{SKU}_MAIN?wid=2000`. Shaw SKU format is `TG{line}_{colorcode}`. Full Shaw inventory catalog: `memory-bank/generation/shaw-swatch-sourcing.md`.
  - **Side-by-side review UI**: `scripts/build-swatch-replacement-review.mjs` generates `tmp/swatch-replacements.html` with current vs candidate images, approve/reject buttons backed by localStorage, and an export button that downloads `swatch-decisions.json`.
  - **Upload script**: `scripts/upload-approved-swatches.ts` reads the decisions JSON, resizes each approved candidate through the same 512px + JPEG q85 pipeline as `SwatchUpload.tsx`, overwrites the existing Supabase Storage file in place, and cache-busts the DB `swatch_url`. Originals preserved in `tmp/sm-swatches/`.
  - **Shower "Penny Floor" / "Hex Floor" options represent floor choices, not wall+floor combos.** The swatch should show the floor mosaic alone. Shaw "Baker Blvd Penny Matte" (TG79F) has 5 color variants that map to all 8 penny options via color match. Shaw "Baker Blvd 2in Hex Matte Mosaic" (TG98F) covers the 2 hex options.
  - **Result**: 73 of 163 flagged swatches replaced and uploaded live (Shaw tile lines, Shaw Mariner Oak hardwood, MILEstone Onyx, Glass Warehouse Brushed Nickel mirrors, Better Home Products Park Presidio ORB 3-piece composite).
  - **Still outstanding**: 91 items without candidates (22 lighting package sheets, 10 fans with text overlays, 8 cabinet paint colors with wrong-color swatches, 9 trim profiles that are scene shots, 8 fireplace hearth/mantel scene shots, 4 wrong-product rain heads, 4 Glass Warehouse mirror Black/Gold variants, ~26 misc). These need either manual sourcing, a data model change (lighting packages split into individual fixtures), or acceptance of the current state.
  - **Key insight**: mirrors should NOT be flagged for 3/4 angle — that perspective shows frame depth and finish which are the useful signals. Head-on mirror shots are silhouettes with no useful information. The visual review rubric was wrong on mirrors.

**BFL content moderation handling (SHIPPED 2026-04-09):** BFL Flux 2 started returning `Request Moderated` on benign kitchen prompts on Apr 7 — 10 failures across Valor prospect demo and `/try` sandbox. Inputs are completely clean (kitchen photos + material swatches + "Apply image N to [surface]" prompts), so the trigger is something in BFL's classifier, not our data. BFL acknowledged the issue and requested prompt samples (shared via `temp/bfl-moderation-failures.json` generated by `scripts/dump-failed-prompts.ts`).
  - `safety_tolerance: 5` now always sent on BFL submit (was absent before — BFL default is restrictive)
  - `BflContentModerationError` caught in both Inngest functions, wrapped in `NonRetriableError` (no pointless retries) and row marked `__failed__` instantly
  - `/api/generate/photo/check` and `/api/try/check` return `status: "failed"` for `__failed__` rows
  - Client polling throws sentinel `"__UNAVAILABLE_COMBINATION__"` which triggers a full-card overlay in `StepPhotoGrid.tsx` — brand-guardian copy: "This combination isn't available. / Adjust a selection to see this room." Visualize/Retry button hidden in this state (no false promise of retry fixing a deterministic failure).
  - Transient errors (network, timeout) still show the small red badge with retry — only deterministic failures get the full overlay.
  - Diff cache queries exclude `__failed__` rows so they can't serve as scoped-edit parents.
  - Stale cleanup (5 min) clears `__failed__` rows so retries can eventually work once BFL fixes their end.

### 3. Prospect Demo Pages (Ongoing)

13 demos built (see `completed.md` #34). Infrastructure is mature — `scripts/seed-prospect-demo.ts` + JSON configs in `scripts/prospect-configs/`.

**Latest (2026-04-07):**
- **Alexander Scott Homes** demo: `withfin.ch/for/alexander-scott` (Langston kitchen, Swann's Bridge, Auburn AL). Target: Cole Jolly (President, LinkedIn connected). Founded 2023 by Warren Jolly (ex-Providence Group). 3 communities, 1,500 lots pipeline, zero viz tools.
- **Prompt fix — "natural sunlight"**: Full gen changed from "natural lighting" to "natural sunlight". Scoped edits append "Preserve natural sunlight."
- **Key lesson — simple hints work better**: Every attempt at descriptive language made generation worse. Proven /try patterns (5-15 words) consistently outperform longer hints.
- **Key lesson — don't adapt subagent output**: Use bfl-prompt-engineer output verbatim.
