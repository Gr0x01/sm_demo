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
- **Key finding — picket tiles unsolved**: Elongated hexagon picket tiles fail across ALL models and approaches tested. Shape vs scale tradeoff: AI gets shape right at wrong scale, or scale right with wrong shape. Never both.
- **Approaches tested for picket** (all failed): prompt-only variations (7 tests), masked inpainting (Gemini mask + OpenAI), texture composite (tiled swatch + AI refinement), FLUX Pro v1 Fill (fal.ai), Ideogram v3/edit, Reve/edit, tile patch generation (flat texture worked but composite didn't).
- **Flat tile texture generation works**: gpt-image-1.5 CAN generate correct picket hexagons as a flat texture (no room context). The tile-patch approach (generate flat → composite → blend) is the most promising direction.
- **Next**: Two-pass system — Nano Banana (pass 1) then gpt-image-1.5 (pass 2). Also test combining tile scale context + geometry description + reference photo in the standard pipeline.
- **Full research**: `memory-bank/backsplash-pattern-research.md`, test scripts in `scripts/test-backsplash-*.ts`

**Previous prospect demo page updates (2026-03-23):**
- Hero: "I put this together in about ten minutes" + speed/cost messaging ($500/mo, no 3D, no six-figure setup)
- Removed stat card row (redundant with sidebar)
- Sidebar: visualization lift data (Signature Homes +20% option sales) instead of SEC-only
- Email: `rashaad@withfin.ch` on prospect pages
- Stylecraft photo_baseline updated re: missing fridge
- Before/after compare removed globally (StepPhotoGrid + ImageLightbox) — invites pixel scrutiny, never belonged on production pages
- AVIF photo support: generate-photo.ts now converts non-standard formats (AVIF, etc.) to PNG via sharp before sending to OpenAI
- Davidson Homes prospect demo page built: `withfin.ch/for/davidson` (Hidden Hills kitchen, waterfall island, exterior cover)

### 2. SEO Strategy + Content

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
