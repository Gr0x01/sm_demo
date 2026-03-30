# Current Phase: Sales Outreach + SEO

## Context

V1 product is fully shipped. SM and Demo orgs are live. Homepage, research pages, learn hub, VS comparisons, prospect demo pages — all live. See `completed.md` for the full history.

Now focused on: builder outreach (provocation-first strategy) and SEO content expansion.

## Active Workstreams

### 1. Sales Outreach (Primary Focus)

**Strategy shift (2026-03-23):** Moved from inquisitive outreach (asking about their process) to provocation-first. Lead with visualization lift data (every builder doing viz sees 20-40% more in option sales), not Toll/Pulte SEC comparisons (dismissable as luxury). Practitioner voice, not tinkerer. Demo pages are a follow-up asset built after engagement, not pre-outreach. LinkedIn connection requests have no links (platform blocks them) — links go in the first DM after they accept.

**Cold email campaign — LIVE (activated 2026-03-24):**
- Full architecture doc: `memory-bank/project/cold-email-campaign.md`
- **Campaign**: "Builder Outreach - Week 1" in Instantly, ACTIVE
- **Sending from**: `rashaad@heyfin.ch` only (anton@heyfin.ch held back — only 5 days warmup)
- **Daily limit**: 5/day, weekdays 8am-5pm Central, 9-14 min random gap
- **Sequence**: 2 emails, plain text, no links, no tracking. Email 2 fires Day 4 as reply thread.
- **Hook**: Founder-led sales. Rashaad's personal story (PDF + 4hr appointment → built visualizer → spent 40% more) IS the pitch. Personalized line provides relevancy + "what?" moment per the framework.
- **Subject lines**: Per-lead custom, lowercase ("feedback on [company]'s design center" / "suggestion for [company]'s selections process")
- **Batch 1 (5 leads, ready to upload 2026-03-25)**: Hughston, Rockhaven, McKinley, Traton, Lowder (Suzanne Mathison Smith, VP Sales — replaced Suzanna Edwards). All emails verified. CSV at `memory-bank/outreach/campaigns/week1-batch1.csv`. Personalized lines at `approved-personalized-lines.md`.
- **DNS**: SPF + DKIM both passing on heyfin.ch
- **Pipeline**: Notion "Contacts" database. "Email Verified" checkbox added — check before spending verification credits. "This Week" view uses hardcoded date filter (relative dates broken).

**Campaign 2 — LIVE (activated 2026-03-26):**
- **Approach**: Fully custom emails per lead (no template/spintax). Different thesis per lead. Research-backed.
- **Key change from C1**: No stacked blocks (personalization → pitch → story → CTA). Each email is one continuous thought. Email 2 is a feedback ask or pullback, not a re-pitch.
- **Batch 1 (6 leads, uploaded 2026-03-26)**: Shelby Jagor (Piedmont), Tr Adams (Rocklyn), Lindsay Klaassen (Vantage), Kellie Little (Fieldstone), Jon Ence (Ence Homes), Jason Nageli (Holmes Homes). CSV at `memory-bank/outreach/campaigns/campaign2-batch1.csv`. Full drafts at `campaign2-rewrites-draft.md`.
- **Skipped (no good email)**: Steve Snoddy (Davidson — only Mattamy email), Dan Winter (Classic — holding co email), Brian Bahr (Challenger — capital co email), Naaman Helmes (New Tradition — no email found)
- **Remaining from C1**: Holland, Stylecraft (Doug already sent one-off)
- **Next**: Find work emails for skipped leads. Monitor C1 and C2 for replies/bounces. Ramp daily volume.

**Active LinkedIn prospects:**
- [ ] **Doug French** (Stylecraft Homes, CEO) — 1st connection, no reply to Thursday message. Demo page live at `withfin.ch/for/stylecraft`. Send before/after kitchen screenshot + link as follow-up DM.
- [ ] **Steve Snoddy** (Davidson Homes, Director of Sales & Marketing, Arizona) — Demo page live at `withfin.ch/for/davidson` (Hidden Hills kitchen, waterfall island). Uses NoviHome (buyer CRM app) but no visualization. DM drafted, ready to send.
- [ ] **Janna Pettegrew** (ICI Homes, Design Center Manager, NCIDQ) — 1st connection accepted 2026-03-24. Demo page live at `withfin.ch/for/ici` (Serena kitchen at Mosaic, Daytona Beach). ICI's website says "Do your best homework BEFORE your appointment" — Finch is the homework. No reply to initial DM yet.
- [ ] **Mary Mead** (McKinley Homes, VP Sales & Marketing) — **Engaged 2026-03-25**: someone at McKinley visited demo page on desktop + mobile, hit Visualize but left before it finished (~30s gen time). Generation completed successfully. Sent LinkedIn DM with attached generated kitchen image + note about load time. First real engagement from a prospect demo page. Demo at `withfin.ch/for/mckinley`. Previous: two LinkedIn DMs sent 2026-03-10 ignored.
- [ ] **Matt Sims** (Viera Builders, Area Sales Manager, Melbourne FL) — 1st connection accepted 2026-03-25. Demo page live at `withfin.ch/for/viera` (Granada II kitchen, Reeling Park courtyard homes, exterior cover). Viera already has "Express Yourself" virtual kitchen/bath configurators (static template, not real rooms). Matt posts about consumer behavior and lifestyle selling. DM drafted, not yet sent. Hook: quartz-to-Cambria upgrade decision, where it happens in the buyer journey.
- [ ] **Dee Crescini** (Homes By WestBay, VP of Design + Division Manager South) — InMail sent 2026-03-26 with attached Key Largo II kitchen image. Asked about visualizations in their Design Studio Wishlist portal. Demo page live at `withfin.ch/for/westbay`. WestBay is Tampa Bay's largest private builder (~1,200 homes/yr, $564M). No visualization tech — wishlist is selections/pricing only.

**Playbooks (updated 2026-03-23):**
- Cold email campaign architecture (`project/cold-email-campaign.md`) — 2-email sequence, multi-channel, no links before reply
- Cold call script (`cold-call-script.md`) — provocation opener, visualization lift data leads
- LinkedIn outreach playbook (`linkedin-outreach-playbook.md`) — Loom as primary, prospect demo pages after engagement, design center managers as insertion points, no links in connection requests
- Cowork contractor guide (`cowork-linkedin-research-guide.md`) — aligned with new strategy
- Trade publication pitches (`trade-publication-pitches.md`) — Pro Builder pitch sent 2026-03-16, others pending
- Research distribution targets (`research-distribution-targets.md`)
- Prospect lists: AL/GA, West Coast, National Tier 1-3

**Prospect demo page updates (2026-03-24):**
- McKinley Homes prospect demo page built: `withfin.ch/for/mckinley` (Mulberry Summit kitchen two-tone cabinets, Towns at Enclave exterior cover). Hero: "What if buyers could see their selections before the pre-construction meeting?" — references McKinley's own Pre-Construction Meeting process.
- ICI Homes prospect demo page built: `withfin.ch/for/ici` (Serena kitchen at Mosaic, Daytona Beach, exterior cover)
- `hero_headline` + `hero_body` DB columns added to floorplans — per-prospect custom hero copy, falls back to generic
- ICI hero: "You tell buyers to do their homework. This is the homework." (references ICI's own website language)
- Insights sidebar reframed for Design Center Manager audience (appointment time, buyer behavior) vs CEO revenue math
- **Island cabinet color added to ALL prospect demos** — `kitchen-island-cabinet-color` subcategory with generation rules distinguishing perimeter vs island cabinets. Two-tone island swap is the key "aha moment" for prospects. Generation rules use `always_send` hint.
- Generation rules on `kitchen-cabinet-color`: perimeter walls only. On `kitchen-island-cabinet-color`: island/peninsula only, with "Match to Main" logic.

**Prospect demo page updates (2026-03-25):**
- Generation loading state improved: photo card overlay now shows "Visualizations take up to 60 seconds", then rotates to "Each result is saved so the next person sees it instantly" after 6s. Triggered by McKinley mobile visit where prospect left before generation finished.
- All prospect demo kitchens are single-pass (no `step_photo_generation_policies` set). ~30-40s per generation. Intentional — second pass would double wait time and prospects may bounce.
- `/try` page fixes: session cookie path changed from `/try` to `/` (was blocking `/api/try/generate` requests — broken since Mar 13), DemoViewer image switched from `object-contain` to `object-cover` on desktop (was letterboxing generated images).
- **Pre-generated variation gallery** added to all /for/ pages. 3 pre-generated kitchen images (Standard $0 → Mid-Range ~$1,700 → Premium ~$3,325) displayed in a full-width `bg-slate-50` section between the hero and the picker. Tapping a variation loads its selections into the picker via key-based remount; sidebar photo updates via existing cache check. No generation wait — the "aha moment" is instant on page load.
  - DB: `preset_variations` JSONB column on `floorplans` — `[{ label, selections, imagePath }]` with slug-based selection keys
  - New component: `src/components/VariationGallery.tsx`
  - Server-side resolution in `/for/` page.tsx: imagePath → Supabase public URL, price via `calculateTotal`
  - UpgradePicker: header hidden when `hideWizardControls=true` (prospect pages use SiteNav), sidebar `mt-5` alignment fix
  - PostHog: `prospect_variation_selected` event on card tap, `has_presets` flag on page view
  - All 4 prospects populated: McKinley, Stylecraft, Davidson, ICI — 3 presets each, 12 total images

- **Viera Builders prospect demo page built (2026-03-25):** `withfin.ch/for/viera` (Granada II kitchen from Reeling Park Castillo collection, exterior rendering cover). U-shaped perimeter kitchen (no island) — 5 subcategories: cabinet color, countertop, backsplash, flooring, wall paint. Hero: "What if buyers saw their actual kitchen instead of a template?" — references their existing Express Yourself configurator. Insights tailored to ~350 closings/yr. 3 presets generated: Standard $0 / Mid-Range $1,500 / Premium $3,125. Research brief at `memory-bank/research/prospect-viera-builders.md`.

**Prospect demo page updates (2026-03-26):**
- **Homes By WestBay** demo built: `withfin.ch/for/westbay` (Key Largo II kitchen, Creek Ridge Preserve exterior). 6 subcategories including island cabinet two-tone. Hero: "Your buyers browse the wishlist. This shows them what it looks like." — references their existing digital wishlist portal. Insights: Design Studio day-long appointments, ~1,200 homes/yr, $50K selection incentives. 3 presets: Standard $0 / Mid-Range $1,700 / Premium $3,325. Target: Dee Crescini (VP Design + Division Manager). Research brief at `memory-bank/research/prospect-westbay.md`.
- **Rocklyn Homes** demo built: `withfin.ch/for/rocklyn` (Crofton kitchen at Riverside, Conyers GA townhome exterior). 5 subcategories (no island cabinet — same white shaker as perimeter). Hero: "What if buyers previewed their selections before the appointment?" Insights: revenue-math pattern (Signature +20%, $1K/home, $300K/yr at 300+ closings). 3 presets: Standard / Mid-Range / Premium. Target: Tr Adams (VP Sales/Marketing). Research brief at `memory-bank/research/prospect-rocklyn.md`. Config at `scripts/prospect-configs/rocklyn.json`.
- **Reusable prospect demo script**: `scripts/seed-prospect-demo.ts` — single command to upload photos, create DB records, trigger generation, poll for completion, wire up presets. Config files at `scripts/prospect-configs/`. See `scripts/prospect-configs/README.md` for usage + gotchas.
- **$500/mo pricing removed** from all prospect demo hero copy (WestBay, Viera, McKinley, ICI).
- **InMail target list**: 15 verified-active LinkedIn targets at `memory-bank/outreach/inmail-targets.md`. ScrapingDog used to verify LinkedIn activity before spending credits.
- **Kolter Homes** demo built: `withfin.ch/for/kolter` (Bahia with Bonus kitchen at Cresswind Lakewood Ranch, exterior photo). 5 subcategories (no island cabinet — waterfall quartz island, barely any cabinet face visible). Hero: "What if buyers walked into the Design Studio already informed?" — uses their "Design Studio" language, positions Finch as prep tool not replacement. Revenue-math insights sidebar ($1.5M/yr at 1,500 closings). 3 presets: Standard / Mid-Range / Premium. Targets: Marc Friedman (SVP Sales), John Manrique (SVP Marketing). Config at `scripts/prospect-configs/kolter.json`.

**Prospect demo infrastructure (2026-03-27):**
- **Headlines standardized**: All 9 demos rewritten to short, one-line headlines that extend the design center, never replace it. Positioning rule: never say "before the appointment," "already knowing," "instead of." Default fallback: "Their selections, visualized."
- **Playbook created**: `memory-bank/outreach/prospect-demos.md` — link directory, positioning rules, sidebar template, creation steps, gotchas
- **prospect-demo-builder agent**: `.claude/agents/prospect-demo-builder.md` — end-to-end demo creation (research, config, seed). Registered in CLAUDE.md.
- **Signature Homes demo built**: `withfin.ch/for/signature` (Sydney 1C kitchen at Primrose at Everlee, Birmingham AL). Tested the agent workflow. Target: Daryl Spears (President). ECI case study builder — do NOT reference their own +20% stat on their demo page.
- **Spatial hints backfilled**: All 9 prospect demos had empty `spatial_hints` on steps. Now populated with per-subcategory targeting (backsplash, cabinets, countertop, flooring, paint, island where applicable). Seed script auto-generates these from subcategory list.
- **Backsplash generation rules**: Added to Demo org backsplash subcategory — tells AI to match tile pattern/size from swatch, not just color.
- **`dimensions` field on options**: New column + full pipeline (types, queries, prompt builder, hash signature, admin UI, Zod). Provides scale context alongside swatch images — swatches can't convey size. Swatch remains sole appearance authority; dimensions are pure measurements only (no color/material words). Tested and tuned on `/try` backsplash: `4x16` (subway), `0.5x2 inch herringbone mosaic pieces`, `1-inch hexagon mosaic`. Demo prompt builder also fixed to stop sending option names/descriptors with swatches (was violating swatch-authority rule).
- **Cache issue discovered**: `unstable_cache` on `getCategoriesWithOptions` means DB changes to generation rules/descriptors aren't picked up until `.next` is nuked (dev) or cache tags are busted (prod). `/try` demo hash doesn't include dimensions — requires `DEMO_GENERATION_CACHE_VERSION` bump to invalidate.
- **`dimensions` column added to `options` table** (DDL done, not wired up). Will provide scale context alongside swatch images for tiles, planks, etc. This is a product-level feature, not just a demo fix. Implementation plan needed — touches types, queries, prompt builder, admin UI, hash signature.
- **Seed script improved**: Auto-generates spatial hints, loads `.env.local` via dotenv.
- **Cache issue discovered**: `unstable_cache` on `getCategoriesWithOptions` means DB changes to generation rules/descriptors aren't picked up until `.next` is nuked (dev) or cache tags are busted (prod).
- **Demo/buyer flow separation**: Rotating loading messages ("Visualizations take up to 60 seconds") extracted from shared `StepPhotoGrid` into `DemoGeneratingOverlay` component. Buyer pages now show clean "Visualizing..." spinner. `renderOverlay` prop threads through `UpgradePicker` → `SidebarPanel` → `StepPhotoGrid`. Only `/for/` pages pass the demo overlay.
- **/try unified onto real prompt pipeline**: `demo-prompt.ts` deleted (230 lines). `generate-demo.ts` Inngest function now calls `buildEditPrompt` from `generate.ts` instead of the old hardcoded `buildDemoPrompt`. /try now gets swatch-authority rules, color anchors, dimensions handling, and negative-guard rules automatically. Gemini scene metadata (kitchen type, camera angle, visible surfaces) folded into scene description string. Demo Inngest function kept separate (handles user-uploaded photos, no DB lookups needed). `DEMO_GENERATION_CACHE_VERSION` bumped to v8.

**Backsplash generation overhaul (2026-03-27):**
- **Prompt restructured**: Replaced "CRITICAL FIXED-GEOMETRY RULES" (contradicted tile pattern changes) with APPLY/PRESERVE/SURFACE & PLACEMENT RULES sections. Edit objective changed from "Change ONLY color/texture" (blocked pattern changes) to "Apply every listed selection, not a diff from the current state." Flooring rules now conditional (only when flooring is selected). Appliance rules inline.
- **SM backsplash data cleanup**:
  - Generation rules added to SM backsplash subcategory (match pattern + color from swatch)
  - Dimensions added to all 25 SM backsplash options (tile sizes, layout descriptions)
  - 6 options removed (wrong/missing swatch files: Mythology Santorini, Herringbone Sage, 4 Gateway Pickets)
  - 3 Naive options swapped from text-overlay .png to clean .jpg swatches
  - HQ picket swatch + installed reference photo uploaded to storage
  - `GENERATION_CACHE_VERSION` bumped v27→v28
- **Key finding — isolation works**: Single backsplash-only pass (1 swatch) produces dramatically better pattern + color than the full 19-item pass. Proven for herringbone, subway, square tiles. This is the path for a two-pass backsplash system.
- **Key finding — picket tiles unsolved in single pass**: Elongated hexagon picket tiles fail across ALL models and approaches in a single pass. Shape vs scale tradeoff. Not just an SM problem — any builder with non-standard tile patterns will hit this.
- **Nano Banana (Gemini) tested (2026-03-28)**: Flash 3.1 competitive with Pro for backsplash isolation. Hex shapes slightly better than 1.5. ~22s warm per pass. Reference photos marginal. Dimensions help.
- **Pre-pass tested and REJECTED (2026-03-28)**: 1.5 overwrites whatever the pre-pass renders — even with preservation rules, even at 2K resolution. The AI reinterprets the backsplash surface when processing multiple swatches.
- **Flash POST-pass isolation SHIPPED (2026-03-28)**: Option-driven — `needs_isolation` boolean on options table. Test a tile, it's bad, flip the flag. Pipeline auto-detects and splits into: 1.5 main (everything except isolated options) → 1.5 oven (if needed) → Flash post-pass (isolated surfaces). B ordering. Combined single-Flash-pass documented as fallback. SM picket options flagged. Admin UI toggle added. Zod schemas, hash signatures, cost tracking all wired up.
- **Key finding — dimensions must describe installed appearance**: "12+ rows on 18-inch backsplash" not "8 tiles on 11x12 sheet." AI was rendering sheet layouts. Massive quality improvement from this one change. All SM picket options updated.
- **Key finding — `generation_rules_when_not_selected` needed for isolated surfaces**: Without it, the main pass has no instruction to preserve the surface. Added to SM + Demo backsplash subcategories.
- **Key finding — boundary rule critical for dark tiles**: Without explicit "do NOT extend tile below the countertop" rule, dark herringbone/carbon tiles bled onto cabinet faces. Both Flash and Pro had the same issue. Added boundary constraint to backsplash `generation_rules` on SM + Demo.
- **Pro vs Flash tested**: `gemini-3-pro-image-preview` produced identical results to Flash for isolation passes. No improvement. Staying with Flash (cheaper).
- **SM options flagged**: 6 picket + 5 herringbone = 11 options with `needs_isolation = true`. Subway/square/beveled stay single-pass.
- **Full research**: `memory-bank/backsplash-pattern-research.md`, test scripts in `scripts/test-backsplash-*.ts`, `scripts/test-two-pass-backsplash.ts`, `scripts/test-post-pass-ordering.ts`

**Partial cache system (2026-03-28):**
- **Architecture**: Diff-based scoped editing. When a buyer changes one surface, find a cached image that differs by one subcategory and run a scoped 1.5 edit (~32s vs 60-80s full pipeline). Leave-one-out hashes stored on `generated_images` for fast GIN-indexed lookup. Depth cap at 3 prevents quality degradation from chaining.
- **DB**: `scoped_edit_depth INTEGER` + `leave_one_out_hashes TEXT[]` columns + indexes on `generated_images`. No new tables.
- **Code**: `computeLeaveOneOutHashes()`, `identifyChangedSubcategory()`, `buildScopedEditPrompt()` in `generate.ts`. Inngest function branches: `check-diff-cache` → `scoped-edit` → `persist-scoped` (fast path) or falls through to full pipeline.
- **Key fix — `_promptContext` excluded from leave-one-out hashes**: `_promptContext` contains per-selection generation rules. Including it defeated diff matching because changing any selection changed all hashes. Excluded so only selection values + stable metadata (_stepPhotoId, _model, _cacheVersion, _promptPolicy) are hashed.
- **Key fix — photo scoping critical**: SM kitchen-close had 19 subcategories scoped (full step) including 6 not visible (dishwasher, trash can, light rail, etc.). Caused dishwasher hallucination and swatch mapping confusion. Trimmed to 13 visible subcategories. **All photos must scope only to visible surfaces.**
- **Key fix — flash post-pass `optionLookup.get` key format**: Was `optionLookup.get(optId)`, should be `optionLookup.get(\`${subId}:${optId}\`)`. Caused post-pass to find nothing and send empty prompt.
- **Key fix — empty post-pass guard**: If flash post-pass builds 0 swatch lines, return null immediately instead of sending empty prompt to model.
- **Fixed — backsplash drift on scoped edits (2026-03-29)**: Scoped edits now flow through the same flash/pro post-pass steps as the full pipeline instead of returning early. Scoped edit uploads to intermediate `_scoped.jpg`, post-passes run on top. Scoped edit with isolated backsplash: ~54s (was ~32s without post-pass, but backsplash was destroyed). Persist step unified — handles both paths with `scoped_edit_depth` set correctly.
- **Key fix — appliance add/remove skips scoped edit (2026-03-29)**: Scoped edits for adding/removing appliances (e.g. `refrigerator-none` → fridge) caused spatial displacement — model placed fridge next to range instead of in its alcove. Scoped edits are designed for surface swaps, not structural additions. Now skips scoped edit when old or new option slug ends with `-none`, falls through to full pipeline. Applied to both `generate-photo.ts` and `generate-demo.ts`.
- **Prompt reverted to v26 structure**: APPLY/PRESERVE/SURFACE & PLACEMENT split reverted to single `RULES:` block. Edit instruction back to "match the selected finishes."
- **SM paint SVG swatches cleaned**: 16 SVGs in Supabase storage had white label bars at the bottom diluting the swatch anchor hex. Stripped to clean solid-color rectangles.
- **R&D test script**: `scripts/test-scoped-surface-edit.ts` — validates scoped editing across surface types. 1.5 is the default model (no hallucinations), Flash for backsplash only.
- **Architecture doc**: `memory-bank/project/partial-cache-architecture.md`
- **Key fix — Inngest step output size limit**: Steps were returning full b64 images (~3-4MB) through Inngest memoization, exceeding the step output size limit. Refactored all generation steps to upload intermediate images to Supabase Storage within each step and pass only paths/metadata between steps. Affects `generate`, `refine`, `flash-post-pass`, `scoped-edit` steps. Helper functions `uploadIntermediate()` / `downloadIntermediate()` added to the Inngest function.
- **Key fix — `@google/genai` was devDependency**: Flash post-pass import failed on Vercel (devDeps not installed in production). Moved to production dependencies.
- **API fix — `selectionsHash` in cache hit response**: `/api/generate/photo` now returns `selectionsHash` on cache hits too, so scripts can track all dispatched hashes.
- **All prospect demo presets regenerated (2026-03-28)**: All 10 demos × 3 presets = 30 images regenerated with the new pipeline (dimensions, backsplash rules, flash post-pass for herringbone). Config files created for all 10 demos in `scripts/prospect-configs/`.
- **Cache version**: v45

**Prompt rule restoration (2026-03-29):**
- **Problem**: Fridge displaced from alcove to next to range on kitchen-close photo. Model was filling alcove with extra cabinetry and placing fridge in wrong location.
- **Root cause**: Two rules were removed during the v28→v34 prompt restructure: (1) anti-cabinetry rule ("Never add extra cabinetry, built-ins, or pantry units unless explicitly selected") and (2) appliance position rule ("Keep each appliance in the same location, opening, perspective, and approximate footprint"). Without these, the model freely rearranged the kitchen layout.
- **Fix**: Restored both rules to the main `RULES:` block in `buildEditPrompt`. Cache version bumped v37→v39.
- **Also fixed**: `invariantRulesWhenSelected.refrigerator` policy changed from directive "Place the selected refrigerator in that opening" to defensive "Keep the refrigerator in its existing alcove/opening" (DB policy update on kitchen-close step photo).
- **Key lesson**: Prompt rules that constrain layout/geometry should never be removed without testing appliance placement. The model needs explicit anti-hallucination guardrails.

**Pro post-pass for cabinet stain refinement (2026-03-29):**
- **Problem**: 1.5 with 11 swatches under-applies dramatic cabinet color changes (white → wood stain). Driftwood Stain rendered near-white. Batch testing confirmed: isolated (2 swatches) = perfect, full pass (11 swatches) = unreliable.
- **Solution**: Gemini Pro post-pass after main 1.5 pass. Pro refines cabinet color depth + wood grain texture. Also handles backsplash tile isolation when both are needed (replaces Flash for combined case).
- **Pipeline**: main (1.5, all swatches) → refine/oven (1.5, conditional) → pro-post-pass (Pro, conditional) OR flash-post-pass (Flash, conditional) → persist
- **Linked option resolution**: `linked_to_subcategory` column on options. "Match to Main" copies perimeter swatch to island. When same swatch: merges into single prompt line, strips exclusion rules. When different: keeps separate with exclusion rules.
- **Stain detection**: Scans `option.generationRules` for "wood STAIN" marker. Also includes linked subcategories (e.g. island linked to perimeter stain). When Pro post-pass fires, absorbs Flash backsplash isolation too.
- **Generation rules added**: All 18 stain options (Driftwood, Cappuccino, Sahara × 6 subcategories) got "wood STAIN, not paint" rules.
- **Spatial hints updated**: "wall cabinets (upper cabinets mounted on walls)" → "all perimeter cabinet doors and drawer fronts along the walls — both upper and lower rows. NOT the island." Critical for model coverage.
- **Key finding — cabinets must stay in main pass**: Excluding them causes layout hallucinations (fridge alcove filled with cabinets, phantom fridges).
- **Key finding — Pro > Flash for combined post-pass**: Flash can't handle cabinets + backsplash together (oversized tiles, uneven application). Pro handles both.
- **Key finding — Pro combined everything (cab+bs+oven) is unreliable**: 4 tasks in one pass = ~50% miss rate. Oven stays separate.
- **Key finding — conflicting exclusion rules break "Match to Main"**: "Do NOT apply to island" + "apply identical swatch to island" contradicts. Merging into single line when same swatch fixes it.
- **Timing**: Common case (stain + freestanding range) = ~80s. Worst case (stain + slide-in + herringbone) = ~115s.
- **R&D docs**: `memory/project_cabinet_postpass_architecture.md`

**Generation pipeline optimization (2026-03-29):**
- **I/O parallelization**: All generation steps (generate, scoped-edit, flash-post-pass) now parallelize DB queries, hero/swatch downloads, and intermediate fetches via `Promise.all`. `preWarmSwatchCache` helper batch-downloads all swatches upfront; `buildEditPrompt` serves from memory cache.
- **PNG → JPEG switch**: All intermediate and final images now JPEG quality 90 (~10x smaller). `outputPath` changed from `.jpg`. Old PNG cache entries deleted from DB (211 rows) and storage (461 orphaned files). 30 preset-referenced PNGs preserved.
- **Top-level `@google/genai`**: Moved from dynamic `await import()` to static import — eliminates module load overhead per invocation.
- **Demo b64 fix**: `generate-demo.ts` now uploads to storage within the generate step and passes only the path through Inngest (was passing full b64 through step output, risking Inngest size limit).
- **Demo partial cache**: Full scoped-edit branch ported to `/try` demo pipeline. `computeDemoLeaveOneOutHashes` in `demo-generate.ts` (embeds photoHash so different users' photos never cross-match). `findDemoDiffMatch` in `db-queries.ts` (filters by `selections_json->>_photo_hash` + `_source = demo` since demo rows have no `step_photo_id`). `generate-demo.ts` Inngest function: `check-diff-cache` → `scoped-edit` → `persist-scoped` or fallback to full pipeline. Uses OpenAI 1.5 for scoped edits (not Flash — hallucination risk on unknown user-uploaded photos). Only new generations (post-deploy) eligible as diff-cache sources.
- **Key fix — `selections_json` metadata keys need `_` prefix**: Demo rows stored `session_id` and `photo_hash` without `_` prefixes. `identifyChangedSubcategory` only filters keys starting with `_`, so it treated these metadata keys as selection diffs → always returned null → scoped edit never fired. Fixed to `_session_id` and `_photo_hash` everywhere (route claim, both persist upserts, generation cap query, diff match query).
- **Result**: Flash post-pass dropped from 35-50s to ~30s. Main pass I/O overhead reduced by parallelizing aiConfig + optionLookup + hero download + swatch downloads.
- **Cache versions bumped**: `GENERATION_CACHE_VERSION` v34→v35, `DEMO_GENERATION_CACHE_VERSION` v8→v9.

**Pipeline latency reduction (2026-03-29):**
- **Route DB query parallelization**: 6 sequential queries → 2 parallel rounds. Phase 1: `getOrgBySlug` + `getStepPhotoAiConfig` + session fetch. Phase 2 (needs org.id): `getFloorplan` + `getOptionLookup` + `getStepPhotoGenerationPolicy`. Saves ~300-600ms.
- **Merged diff-cache check into generate step**: Both `generate-photo.ts` and `generate-demo.ts` now run the diff-cache DB query at the top of the `generate` step instead of as a separate Inngest step. Returns discriminated union (`type: "scoped-edit-needed"` or `type: "generated"`). Eliminates one full Inngest step transition (~0.5-1s) on every generation.
- **heroImagePath passed through Inngest event**: Route already fetches `aiConfig` — now passes `heroImagePath` through the event payload. Generate step no longer calls `getStepPhotoAiConfig` (was 2 sequential DB queries). Within the step, hero download + optionLookup + swatch pre-warm run as chained parallel promises.
- **Adaptive polling**: Client polls at 1.5s intervals for first 10 polls, then 3s. Applied to both `UpgradePicker.tsx` and `DemoClient.tsx`. Reduces average wait-after-completion from ~1.5s to ~0.75s.
- **Total estimated savings**: ~3-4s off common single-pass case.

**Linked option + prompt fixes (2026-03-29):**
- **Spatial hint exclusion stripping on merge**: `resolveLinkedOptions` now strips "NOT the island" / "NOT the perimeter" clauses from spatial hints when merging Match-to-Main selections. Previously the merged hint read "...NOT the island. AND island cabinet doors..." — model saw "NOT the island" first and stopped. Regex strips `. NOT...` / `— NOT...` to end of string.
- **Generation rule stripping in Inngest function**: `resolveLinkedOptions` in the route handler stripped "Do NOT apply it to" rules from the optionLookup, but the Inngest function re-fetches a fresh optionLookup from DB — stripping was lost. Fix: Inngest's generate step now detects merged linked subcategories (scoped but not in selections, with `linkedToSubcategory` pointing to a selected sub) and strips the exclusion rules from the fresh optionLookup. Key lesson: optionLookup is not passed through Inngest events (too large), so any mutation in the route handler must be replicated in the Inngest function.
- **Subtle color enforcement**: Prompt rule added: "Apply every swatch even when the existing surface appears to already be a similar color — small differences matter (e.g. buttercream vs pure white, warm gray vs cool gray)." Without this, 1.5 skipped near-identical color changes.
- **Flash post-pass preservation**: Strengthened flash post-pass prompt from "Do not alter anything else" to "Every other pixel in the image must remain identical" + explicit pantry contents/shelves/doorways. Flash was hallucinating food in the pantry.
- **Cache version**: v42→v45

**Previous prospect demo page updates (2026-03-23):**
- Hero: "I put this together in about ten minutes" + speed/cost messaging ($500/mo, no 3D, no six-figure setup)
- Removed stat card row (redundant with sidebar)
- Sidebar: visualization lift data (Signature Homes +20% option sales) instead of SEC-only
- Email: `rashaad@withfin.ch` on prospect pages
- Stylecraft photo_baseline updated re: missing fridge
- Before/after compare removed globally (StepPhotoGrid + ImageLightbox) — invites pixel scrutiny, never belonged on production pages
- AVIF photo support: generate-photo.ts now converts non-standard formats (AVIF, etc.) to PNG via sharp before sending to OpenAI
- Davidson Homes prospect demo page built: `withfin.ch/for/davidson` (Hidden Hills kitchen, waterfall island, exterior cover)

### 2. Multi-Pass Generation Pipeline (Active — 2026-03-30)

**Problem**: 1.5 degrades with 12+ swatches in a single pass. Built compensatory post-passes (Flash for backsplash, Pro for cabinet stain) but each adds 22-40s latency. Worst case ~115s. Architecture was reactive, not proactive.

**Solution**: Purpose-built sequential passes with intermediate caching. Each pass handles 3-6 swatches instead of 12+.

**R&D results (2026-03-30):**
- Stain hypothesis confirmed: 1.5 with 3 structural swatches reliably applies dramatic stains that it fails with 8+. Tested Driftwood, Cappuccino, Sahara, and two-tone combinations — all confirmed. Pro post-pass eliminated.
- Flooring works in structural pass.
- Slide-in range does NOT fold into fixtures — needs separate oven correction pass (same as today).
- Flash specialty pass works for backsplash but inconsistently preserves stain cabinets. Needs stronger anti-prompting.
- Test script: `scripts/test-multi-pass-pipeline.ts`, outputs in `scripts/multi-pass-test-outputs/`.

**Implementation shipped (2026-03-30):**
- `pass_cache` table in Supabase for intermediate image caching
- `useMultiPass` feature flag on `step_photo_generation_policies` JSONB — per-photo opt-in, rollback = one DB update
- `src/lib/pass-definitions.ts` — classifies subcategories into pass groups: structural (cabinets, counter, floor, paint), fixtures (hardware, sink, faucet, lighting, appliances), oven (conditional, slide-in only), specialty (backsplash, Gemini Flash)
- `src/inngest/functions/generate-photo-multipass.ts` — new Inngest function alongside existing one. Plan step checks Layer 2 (scoped +1) then Layer 3 (pass cache), then runs only needed passes.
- Pass-level hashes with chained upstream hashes for cache integrity
- Existing `generate-photo.ts` untouched — skips when `passDefinitions` present
- `/try` demo stays on single-pass pipeline

**Local testing (2026-03-30):**
- Multi-pass function fires correctly via Inngest dev. All steps complete: plan → pass-structural → pass-fixtures → pass-specialty → persist.
- Structural: ~38s (6 selections, 6 swatches). Fixtures: ~37s (5 selections, 5 swatches). In line with R&D.
- Polling timeout bumped from 50 to 80 polls (~4 min) to cover multi-pass worst case.
- Fixed: `-none` selections (e.g. `refrigerator-none`) now excluded from pass definitions — prevents hallucinating appliances.
- Fixed: Pass classification now uses slug patterns (not just `isAppliance` flag) so hardware/sink/faucet/lighting correctly route to fixtures and backsplash routes to specialty.
- Fixed: Mid-file import in `generate.ts` broke runtime — moved to top of file.

**Pass chain (kitchen):**
```
hero → Structural (1.5, cabs/counter/floor/paint, ~38s)
     → Fixtures (1.5, hardware/sink/faucet/lighting/range, ~37s)
     → Oven correction (1.5, conditional, slide-in only)
     → Specialty (Flash, backsplash, ~30s)
     → final image
```

**Cache hierarchy (4 layers):**
1. Full hash match → instant (existing)
2. Scoped +1 edit on final image → ~32s (existing, the workhorse)
3. Intermediate pass cache → skip unchanged passes (new, `pass_cache` table)
4. Full cold generation → all passes from hero (fallback)

**Currently enabled on:** SM kitchen-close step photo only (`useMultiPass: true` in policy)

**Architecture doc:** `memory-bank/project/multi-pass-pipeline-architecture.md`

**Key fix — scoped edit preserve-list contradiction (2026-03-30):** `buildScopedEditPrompt` catch-all preserve line always said "All appliances, fixtures, hardware, and lighting" even when hardware was the changed subcategory. Model saw "change hardware" + "preserve hardware" and placed hardware on island side panel. Fix: catch-all now dynamically excludes the type being changed. Applies to hardware, fixtures, appliances, and lighting scoped edits.

**Remaining:**
- [ ] More local testing — verify output quality across different selection combos
- [ ] Test pass cache hits — change one surface, verify earlier passes skip
- [ ] Test scoped +1 edits still work with multi-pass output
- [ ] Deploy to Vercel and test in production (SM kitchen-close only)
- [ ] Pre-generate structural intermediates for popular combos
- [ ] Deprecate old post-pass logic once multi-pass is proven

### 3. SEO Strategy + Content

**Completed:** Keyword research, competitive analysis, strategy doc (`seo-strategy.md`), JSON-LD + manifest + OG images, LLM search optimization (`llms.txt`/`llms-full.txt`), anchor page (`/learn/new-construction-upgrades`), upgrade guide visual polish, builder design center pages (Pulte, Arbor, Ryan, Richmond American), visualization lift research page, `/research` and `/learn` index hubs, VS page optimization (`/vs/envision`, `/vs/pdf-option-sheets`), `/vs/eci-insearch` comparison page, `/vs/chameleon-power` comparison page, IndexNow submission script, SiteNav/SiteFooter defaults, `/pricing` page ($500/mo per plan, ROI table, FAQs, JSON-LD), `/pricing/enterprise` page ("Still $500 per floor plan" — no enterprise tier messaging).

**Remaining:**
- [ ] Toll Brothers design center page

### 3. Software Listings

**Capterra (2026-03-24):** Submitted for review. Category: Home Builder. $500/mo per floor plan, free trial listed. Screenshots from SM demo (builder landing, floorplan intro, upgrade picker, selections summary). Pending Capterra team approval.

**Remaining:**
- [ ] G2 free listing — site is broken/unusable as of 2026-03-24, revisit later
- [ ] Software Advice listing

**Key insight:** Builder B2B keywords are tiny volume (<70/mo). Buyer-side content ("new construction upgrades" 170/mo, "[builder] upgrade price list" cluster ~400-500/mo) is the demand engine. Flywheel: buyer finds content → tries demo → asks builder → builder calls us.

## Key References

| Doc | Content |
|-----|---------|
| `completed.md` | All finished workstreams (V1 product, SM migration, etc.) |
| `product-architecture.md` | Multi-tenant schema, URL structure, user roles |
| `VISION.md` | Business plan, pricing, ROI, GTM |
| `seo-strategy.md` | SEO keyword research, buyer-pull flywheel, content strategy |
| `decisions.md` | Key choices and rationale |

## Domain

`withfin.ch` — subdomain per builder: `{org-slug}.withfin.ch/{floorplan-slug}`
