# Completed Work

Archive of finished workstreams moved from `current.md` on 2026-03-22.

## V1 Product Build

### 1. Homepage
Full marketing landing page at `/`. Copy aligned with VISION.md (no "AI", no Zonda name). PostHog analytics, OG images, SEO hardening, lead capture (`pilot_leads` table + Resend email), llms.txt.

### 2. Interactive Demo
Public demo on the landing page.

### 3. Prompt Tuning — SM + Demo
Both orgs with full prompt tuning: photo baselines, spatial hints, subcategory scoping, scene descriptions, generation policies, flooring resolver, anti-hallucination rules.

### 4. Workstream A: Builder Admin — Auth, RLS, Option Management
Magic link + OTP auth, invite flow, RLS on all tables, category/subcategory/option tree CRUD, drag reorder, swatch upload, AI descriptor gen, UUID PKs, security hardening.

### 5. Workstream B: Floorplan & Photo Pipeline
`step_photos` table, room photo upload with quality check (Gemini Flash), spatial hint AI generation, hero toggle, photo baseline editing, cache invalidation.

### 6. Workstream C: Buyer Save (Email-Only)
Anonymous sessions, auto-save selections, email save with resume token, admin buyer dashboard, pg_cron cleanup.

### 7. Workstream D: Gallery Visualization
Per-photo AI generation, DB-based dedup, join-in-progress, retry flow, StepPhotoGrid, GalleryView, Visualize All, before/after toggle.

### 8. Floorplan Onboarding: Skeleton Steps + Duplicate
Auto-populate 5 skeleton steps on creation. Duplicate floorplan API (clones steps, sections, photos, remaps also_include_ids).

### 9. SM Multi-Tenant Migration
SM migrated from legacy single-tenant to full multi-tenant photo system. Legacy routes and dead code deleted.

### 10. SM Photo Placement Fix
Room photo → step assignments corrected for Kinkade. Spatial hints and baselines fixed.

### 11. Self-Hosted Image Generation — Evaluated, Not Viable
No open-source model replaces gpt-image-1.5. OmniGen2 tested on RunPod. Revisit when multi-reference instruction editing matures.

### 12. SM Photo Prompt/Scope Reliability Tuning
Photo scope authority, scene authority, anti-hallucination rules, flooring resolver, SM data tuning.

### 13. Per-Floorplan Pricing + Lenox Floorplan
`option_floorplan_pricing` table, buyer-facing query overlay, admin pricing UI, Lenox seeded with 55 overrides.

### 14. Lenox Room Photos — Full AI Generation Pipeline
9 Lenox photos with complete metadata, 3 generation policies, exterior cover photo.

### 15. Workstream E: Branding Controls
Org-level branding (logo, colors, header/corner style), admin UI, buyer-facing dynamic theming.

### 16. Gemini Image Generation — REVERTED
Attempted Gemini migration (D74). Hallucinated unpredictably. Reverted to OpenAI gpt-image-1.5 (D77).

### 17. Generation Rules Admin UI (D78)
Generation rules fully authorable via admin: hint dropdown, appliance checkbox, rule textareas on subcategories and options. Conditional accent-color logic.

### 18. Research Page: /research/hidden-revenue-line
SEC filings research report. Animated charts, JSON-LD, LinkedIn article with chart images published.

### 19. Test Infrastructure
Vitest suite: 129 tests in <1s. Unit → pipeline integration → route handler layers. Shared fixtures and Supabase mock.

### 20. Prospect Demo Pages
`/for/[prospectSlug]` personalized sales pages. Loom embed, single-step picker, Calendly CTA, upgrade insights sidebar, before/after toggle. First prospect: Stylecraft Homes.

### 22. Homepage CTA Restructure
Calendly-primary "Get Started" section. Form demoted to secondary. Value props reframed.

### 23. Super Footer
Columnar super footer: brand column with tagline + Calendly + LinkedIn, 4 link columns (Product, Learn, Research, Compare), bottom bar.

## Multi-Tenant Foundation
Supabase schema, UUID PKs, dynamic routing, seed script, query optimization (4 queries/page, 0 on cache hit).

## SM Demo (Fully Multi-Tenant)
5-step wizard, 350+ options, 166 swatches. Kinkade (8 photos) + Lenox (9 photos, 55 pricing overrides, 3 policies).

## Finch Demo Sandbox
"Finch Demo" org (slug: `demo`), "The Nest" floorplan. 4 room photos with full prompt tuning.

---

*Archived from `current.md` on 2026-04-08.*

### 24. Backsplash Generation Overhaul (2026-03-27)
Prompt restructured (APPLY/PRESERVE/SURFACE & PLACEMENT). SM backsplash data cleaned (6 options removed, 3 swatches replaced, dimensions added to all 25). Key findings: isolation pass produces dramatically better pattern + color than full 19-item pass; picket tiles unsolved in single pass. Flash POST-pass isolation shipped (`needs_isolation` boolean, option-driven). `generation_rules_when_not_selected` added for isolated surfaces. Boundary rule added for dark tiles. Pro vs Flash tested — identical results, stayed with Flash. 11 SM options flagged for isolation.

### 25. Partial Cache System (2026-03-28)
Diff-based scoped editing: when buyer changes one surface, find cached image differing by one subcategory → scoped edit (~32s vs 60-80s full pipeline). Leave-one-out hashes with GIN index. Depth cap at 3. Key fixes: `_promptContext` excluded from hashes, photo scoping trimmed to visible surfaces only, post-pass optionLookup key format, empty post-pass guard, appliance add/remove skips scoped edit, backsplash drift fixed (scoped edits flow through post-pass steps). Demo partial cache also ported (`computeDemoLeaveOneOutHashes`, `findDemoDiffMatch`). `selections_json` metadata keys fixed to `_` prefix.

### 26. Pro Post-Pass for Cabinet Stain (2026-03-29)
1.5 under-applied dramatic cabinet stains with 11 swatches. Solution: Gemini Pro post-pass after main 1.5 pass. Linked option resolution (`linked_to_subcategory`): "Match to Main" copies swatch, merges into single prompt line when same swatch (strips exclusion rules). Stain detection via `generationRules` marker. Pro absorbs Flash backsplash isolation when both needed. 18 stain options got generation rules. Spatial hints updated for wall cabinets. Conflicting exclusion rules fixed for "Match to Main".

### 27. Pipeline Optimization (2026-03-29)
I/O parallelization across all generation steps. PNG → JPEG switch (quality 90, ~10x smaller). 211 old PNG cache rows deleted, 461 orphaned storage files cleaned. Adaptive polling (1.5s × 10, then 3s). Route DB query parallelization (6 sequential → 2 parallel rounds). Merged diff-cache check into generate step. `heroImagePath` passed through Inngest event to skip redundant DB query. Total: ~3-4s off common single-pass case.

### 28. Prompt Rule Restoration (2026-03-29)
Fridge displaced from alcove after v28→v34 prompt restructure removed anti-cabinetry and appliance position rules. Restored both to `RULES:` block. Policy changed from directive to defensive for fridge positioning.

### 29. Linked Option + Prompt Fixes (2026-03-29)
Spatial hint exclusion stripping on merge (regex strips `. NOT...` clauses). Exclusion rule stripping replicated in Inngest function (re-fetches fresh optionLookup from DB). Subtle color enforcement rule added. Flash post-pass preservation strengthened.

### 30. Multi-Pass Generation Pipeline (2026-03-30, SUPERSEDED by Flux 2)
Purpose-built sequential passes (3-6 swatches each) to solve 1.5 degradation at 12+ swatches. `pass_cache` table, `useMultiPass` feature flag, `pass-definitions.ts`. Pass chain: hero → Structural → Fixtures → Oven → Specialty → final. 4-layer cache hierarchy. Full SM rollout across all 17 photos (9 Lenox, 8 Kinkade). Flash scoped edits for multi-pass (1.5 destroyed herringbone). Key lessons: photo baselines must describe what ISN'T there, step-level spatial hints shared across photos, lighting hints must not suggest fixtures. **Entirely replaced by Flux 2 single-pass architecture (2026-04-06).**

### 31. Cold Email Campaign C1 (2026-03-24, 0 replies)
2-email sequence, plain text, no links, no tracking. Founder-led sales (Rashaad's personal story). 5 leads: Hughston, Rockhaven, McKinley, Traton, Lowder. Sending from rashaad@heyfin.ch, 5/day. Result: 0 replies. Approach was too template-feeling despite personalized lines.

### 32. Cold Email Campaign C2 (2026-03-26, 0 replies)
Fully custom emails per lead, different thesis per lead. 6 leads: Piedmont, Rocklyn, Vantage, Fieldstone, Ence, Holmes. Each email one continuous thought, no stacked blocks. Email 2 was feedback ask/pullback. Result: 0 replies — long custom emails still read as cold outreach.

### 33. /try Demo Cache Pre-Seeding (2026-04-02)
200 sample kitchen combos pre-generated via `seed-demo-cache.ts`. Sample kitchen pre-sized to 1536x1024, deterministic hash `a6aeb46b36635226` via FileReader. Layer 1: 125 combos (cab×island×counter, default backsplash). Layer 2: 75 combos (5 popular pairs × 5 counters × 3 specialty backsplashes). Speed badge: "Instant — cached" on cache hits, "Saved for the next buyer" on cold gen. ~$20 one-time.

### 34. Prospect Demo Pages — Build-Out (2026-03-23 → 2026-04-07)
Built 13 prospect demos: Stylecraft, Davidson, McKinley, ICI, Viera, WestBay, Rocklyn, Kolter, Signature, Neal, Chesapeake, Christopher Alan, Alexander Scott. Reusable `seed-prospect-demo.ts` script with JSON configs. Island cabinet two-tone as key "aha moment". Pre-generated variation galleries (3 presets each). `hero_headline` + `hero_body` DB columns. Upgrade insights sidebar. MobileStickyFooter. Demo loading overlay. $500/mo pricing removed from all hero copy. Headlines standardized (never "before the appointment"). Spatial hints backfilled on all demos. `dimensions` field on options (swatch-authority rule). prospect-demo-builder agent created.

### 35. Flux 2 Migration + Pipeline Refactor (2026-04-05 → 2026-04-06)
Replaced entire OpenAI 1.5 + Gemini Flash pipeline with BFL Flux 2. Full gen: Max (~35-55s, ~$0.09). Scoped edits: Pro default (~15-25s, ~$0.03) with per-option model override via `scoped_edit_model` column (Klein 9B for hex mosaic). Two-pass split when >7 swatches. Oven correction as Max post-pass. Flux-native prompts: "Apply image N to [surface]" (~55-80 words full gen, ~15-25 words scoped). Shared `flux-pipeline.ts` core. Eliminated: Flash isolation, Pro cabinet post-pass, multi-pass pipeline, `pass_cache` table, `collectInvariantRules`, `buildSceneBlock`, `needs_isolation` boolean, all OpenAI/Gemini image gen code. `/try` migrated to DB-driven options (`demo-options.ts` deleted). `resolveLinkedOptions` added to demo pipeline. Spatial hints shortened (24 steps, 30-80 → 5-20 words).
