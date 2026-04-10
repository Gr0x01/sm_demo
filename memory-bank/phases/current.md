# Current Phase: Sales Outreach + Generation Quality

## Context

V1 product is fully shipped. SM and Demo orgs are live. Homepage, research pages, learn hub, VS comparisons, prospect demo pages — all live. Flux 2 pipeline shipped and refactored. See `completed.md` for the full history.

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

### 2. Flux 2 Generation Quality (Open Issues)

Pipeline shipped and refactored (see `completed.md` #35). These quality issues remain:

- [ ] **Countertop scoped edit bleeds onto island face** — tried 3 hint iterations. Current hint avoids "island" but still bleeds on some combos. May need adjacency preservation clause in `buildScopedEditPrompt` or Klein 9B for countertop edits.
- [x] **Inconsistent cabinet rendering between full gen runs** — RESOLVED 2026-04-10. Not Max non-determinism — was a prompt bug. "Apply image N to X. Match image 2 exactly." on a flat paint swatch is a degenerate material-transfer instruction: the swatch has no geometry, so Flux drifted door profile/rails/stiles/hardware run-to-run. Fixed via cabinet-specific Recolor branch. See "Cabinet recolor prompt fix" below.
- [ ] **Re-seed `/try` demo cache** — run `npx tsx scripts/seed-demo-cache.ts` after deploy
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

**Cabinet recolor prompt fix (SHIPPED 2026-04-10):** Spent a session trying to record a Valor Loom for Biff Driver and every cabinet color click produced visibly different cabinet DESIGN — door profile, shaker rails, hardware all drifting run-to-run. We'd had this logged as "Max non-determinism" but it wasn't. Root cause: the full-gen and scoped-edit templates both used "Apply image N to X. Match image 2 exactly." which is a material-transfer instruction — correct for tile/stone/LVP but a degenerate case for flat paint swatches. A paint swatch has no geometry, so "match exactly" gave Flux permission to resynthesize everything else (door profile, rails, stiles, hardware, grain). BFL expert diagnosis: paint is a **recolor** of existing geometry, not a material replacement — needs a different verb entirely.
  - **New cabinet-paint branch** in `buildEditPrompt` and `buildScopedEditPrompt`. Full gen: `Recolor {surface} to the color in image N, exact color #HEX. A color change only — door profile, shaker rails, stiles, panel recesses, grain, and hardware remain as they appear in image 1.` Scoped edit: same pattern, shorter feature list (Klein/Pro preserve by default).
  - **"A color change only —"** is the positive type-declaration doing the preservation work. "Remain as they appear in image 1" is a positional anchor back to the base photo, not a preservation verb. Both constructions avoid banned words ("Keep", "Not", negative clauses).
  - **Detection is structural**, not descriptor-based: `subId.includes("cabinet-color") && !isStain`. First version gated on `prompt_descriptor.includes("painted")` which only caught Demo-org kitchen cabinets (Valor) because Demo kitchen happens to have populated descriptors. SM's entire cabinet catalog has NULL descriptors and was silently left on the broken template. Structural detection fixes that in one code change — no DB backfill needed, works for every future builder automatically.
  - **Stains stay on the material-transfer template.** Stain swatches carry wood species + hue + grain, which is a genuine material transfer. Carved out via `option.name.includes("stain")` check. If stain drift shows up later, the fix is a different pattern (grain-direction-specific), not a reuse of the cabinet-paint template.
  - **Laundry cabinets correctly excluded.** Subcategory slug is `laundry-room-cabinets` (no "cabinet-color"), so the gate can't fire. Which is right — it's an add-cabinets op, not a recolor. "Recolor the empty wall alcove" would be nonsense.
  - **Cache version bumped v2.9 → v2.11** (two bumps in one session — v2.10 for the initial Valor paint fix, v2.11 when we broadened detection to cover SM). All existing SM cabinet gens will regenerate on next click with the new template.
  - Applies to: Stone Martin kitchen/island/primary bath/secondary bath cabinets, Demo org kitchen/island/primary bath/secondary bath cabinets, every prospect demo (Valor, Davidson, Alexander Scott, ICI, etc.), and `/try`. Zero DB changes.
  - **Process lesson:** First consultation with bfl-prompt-engineer produced "Keep the existing door profile..." — shipped that, it worked on Valor, Rashaad caught that "Keep" is on the banned list when we started broadening. Re-delegated with explicit banned-word constraints; agent came back with the "A color change only — X remain as they appear in image 1" construction, which is a genuinely better pattern. Lesson: **include known banned words as explicit constraints in every bfl brief**, even if the agent "should" know — the agent's forbidden list may not match Rashaad's.

### 3. Prospect Demo Pages (Ongoing)

13 demos built (see `completed.md` #34). Infrastructure is mature — `scripts/seed-prospect-demo.ts` + JSON configs in `scripts/prospect-configs/`.

**Latest (2026-04-07):**
- **Alexander Scott Homes** demo: `withfin.ch/for/alexander-scott` (Langston kitchen, Swann's Bridge, Auburn AL). Target: Cole Jolly (President, LinkedIn connected). Founded 2023 by Warren Jolly (ex-Providence Group). 3 communities, 1,500 lots pipeline, zero viz tools.
- **Prompt fix — "natural sunlight"**: Full gen changed from "natural lighting" to "natural sunlight". Scoped edits append "Preserve natural sunlight."
- **Key lesson — simple hints work better**: Every attempt at descriptive language made generation worse. Proven /try patterns (5-15 words) consistently outperform longer hints.
- **Key lesson — don't adapt subagent output**: Use bfl-prompt-engineer output verbatim.
