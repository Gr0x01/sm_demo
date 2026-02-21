# Current Phase: V1 Product Build + Polish

## Context

Multi-tenant foundation is done (schema, routing, theming, caching, data layer). V1 product spec written (`v1-product.md`). Domain is `withfin.ch`. All workstreams (A–D) complete. SM fully migrated to multi-tenant. Now executing on: homepage refinement, interactive demo, and prompt tuning.

## Active Workstreams

### 1. Homepage Refinement
Landing page exists, iterating on copy, layout, and visuals.
- [ ] Copy and layout tweaks (ongoing)
- [ ] Before/after visual (PDF sheet vs. Finch picker)
- [ ] OG meta tags for link previews
- [x] PostHog analytics setup
- See `landing-page.md` for design doc

### 2. Interactive Demo ✅
Public demo on the landing page is complete.

### 3. SM Demo — Prompt Tuning
The SM demo is the sales tool. AI generation prompts need refinement for better output quality.
- [ ] Prompt tuning for kitchen visualization
- [ ] Generation reliability improvements
- See `architecture.md` and `generation-reliability-playbook.md`

### 4. V1 Workstream A: Builder Admin — Auth, RLS, Option Management ✅
**The first product workstream.** See `v1-product.md` Section 9 for full breakdown.
- [x] Admin auth: magic link + 6-digit OTP (Supabase Auth, `@supabase/ssr` PKCE flow)
- [x] Auth callback route (`/auth/callback`) with open-redirect protection
- [x] Invite flow: `POST /api/admin/invite` — pending `org_users` row + Resend email + auto-link on sign-in
- [x] `link_pending_invites` trigger (replaces hardcoded email trigger) — generic, links by email on auth.users INSERT
- [x] `get_auth_user_id_by_email` RPC for direct-linking existing auth users at invite time
- [x] `onAuthStateChange` listener in AdminSidebar — redirects to login on session expiry
- [x] Sign-out button in admin sidebar
- [x] Custom magic link email template (dark theme, OTP code prominent, magic link secondary)
- [x] RLS policies on all tables (service role bypasses for buyer-facing; user-scoped for admin)
- [x] Category/subcategory/option tree UI (CRUD, drag reorder, inline price edit)
- [x] Floorplan scoping (category junction table + `floorplan_ids` array columns on sub/opt)
- [x] AI prompt descriptor generation (Gemini Flash, name + description)
- [x] Swatch/photo upload per option (Supabase Storage)
- [x] UUID PKs on categories/subcategories/options (slug column for buyer-facing compatibility)
- [x] Security hardening: auth on all admin routes, floorplan ownership validation, verified storage deletes, 404 error semantics
- [x] ESLint flat config setup

### 5. V1 Workstream B: Floorplan & Photo Pipeline ✅
**Depends on A (admin auth).** Full floorplan/step/photo management for builders.
- [x] `step_photos` table with RLS, composite FK (org_id consistency), hero uniqueness index
- [x] `rooms` storage bucket (public read, admin upload/delete scoped by org prefix)
- [x] Floorplan CRUD (create/edit/delete, slug generation, active toggle)
- [x] Step CRUD (create/edit/delete, dnd-kit drag reorder, section subcategory assignment)
- [x] Photo upload with client-side validation (20MB, 1024x1024 min, format check)
- [x] Photo quality check (Gemini 2.5 Flash vision — pass/warn/fail with feedback)
- [x] Spatial hint AI generation (Gemini 2.5 Flash — layout description for image editing)
- [x] Hero photo toggle with atomic DB swap (`swap_hero_photo` RPC)
- [x] Photo baseline + spatial hint textarea editing with auto-save on blur
- [x] Security: path traversal protection, tenant boundary on all mutations, orphan storage cleanup
- [x] Cache invalidation extended with floorplanId/floorplanSlug tags

### 6. V1 Workstream C: Buyer Save (Email-Only) ✅
**Depends on A (admin auth).** Anonymous session persistence, email save with resume link, builder dashboard.
- [x] `buyer_sessions` table with RLS, updated_at trigger, resume token index, email index
- [x] Anonymous session creation + cookie persistence (`finch_session_{orgSlug}_{fpSlug}`)
- [x] Auto-save selections (debounced PUT with server-side price calculation)
- [x] Email save with resume token (`crypto.randomBytes(32)`) + Resend transactional email
- [x] Token-based resume (GET by token, cross-org redirect detection)
- [x] Email-based resume (rate-limited, non-enumerating 404s)
- [x] SaveSelectionsModal component (save + resume flows)
- [x] DemoPageClient session lifecycle (cookie → load → create, replaces `BUYER_ID` hack)
- [x] Admin buyer dashboard (list + detail pages, user-scoped Supabase client)
- [x] pg_cron cleanup for anonymous sessions >30 days
- [x] Security: ownership verification on all session routes, resume token not leaked in responses, input validation, generic error messages
- [x] `generation_count` column in schema (reserved for Workstream D — no app code reads/writes it)

### 7. V1 Workstream D: Gallery Visualization ✅
**Depends on B + C.** Per-photo AI visualization, gallery view, retry flow, generation credit cap.
- [x] DB migrations: `generation_cap_per_session` on orgs, `step_photo_id`/`buyer_session_id`/`selections_fingerprint` on `generated_images`, `generation_feedback` table, `reserve_generation_credit` + `refund_generation_credit` RPCs, `generated-images` storage bucket
- [x] `StepPhoto` type on `StepConfig`, `step_photos` join in `getStepsWithConfig`, `getStepPhotoAiConfig` query
- [x] `SwatchBufferResolver` callback in `buildEditPrompt` (Supabase Storage for all tenants)
- [x] `/api/generate/photo` — multi-tenant per-photo generation with ownership validation, DB-based dedup (`__pending__` placeholder rows), stale lock cleanup (5 min TTL), credit reservation after generation, SVG swatch filtering (JPEG/PNG/WebP only)
- [x] `/api/generate/photo/check` — multi-tenant per-photo cache check
- [x] Internal per-photo policy layer (DB-backed `step_photo_generation_policies` with code fallback): prompt invariant overrides + optional policy-driven pass-2 refinement
- [x] Prompt context wiring completed: `step_photos.spatial_hint` now included in generation prompt context; cache hash includes prompt-context signature (`scene_description`, `photo_baseline`, `spatial_hint`, `spatial_hints`)
- [x] `/api/generate/photo/feedback` — used by retry flow: refunds credit, deletes cached row, then regenerates
- [x] Extended `SelectionState`/`SelectionAction` with per-photo keys, credits
- [x] UpgradePicker: per-photo generation, gallery virtual step, Visualize All (max 3 concurrent), stale detection per photo, initial cache restore for multi-tenant photos on session resume
- [x] Replaced thumbs up/down with retry button in `ImageLightbox` (overlay on bottom gradient bar) — feedback was vanity data with no actionable use
- [x] `StepPhotoGrid` component — per-step photo cards in sidebar (hero first, stale badge, lightbox)
- [x] `GalleryView` component — full gallery grid grouped by step, Visualize All, credits meter, cap-reached state
- [x] `SidebarPanel` updated — photo grid replaces StepHero when step has photos, credits display
- [x] Credits wired: `generationCap` from org → session response → page → client → picker
- [x] Admin login Suspense fix for `useSearchParams()`

### 8. Floorplan Onboarding: Skeleton Steps + Duplicate ✅
- [x] Auto-populate 5 skeleton steps on floorplan creation (Set Your Style, Design Your Kitchen, Primary Bath, Secondary Spaces, Finishing Touches)
- [x] Duplicate floorplan API (`POST /api/admin/floorplans/[id]/duplicate`) — clones steps, sections, photos (storage copy), remaps `also_include_ids`
- [x] Duplicate button in FloorplanList UI (Copy icon between edit/delete, global busy guard)

### 9. SM Multi-Tenant Migration ✅
Migrated Stone Martin from legacy single-tenant generation to full multi-tenant photo system.
- [x] Migration script (`scripts/migrate-sm-storage.ts`): uploads room photos + swatches to Supabase Storage, creates `step_photos` rows, updates `swatch_url` to Storage URLs, sets generation cap to 100
- [x] Deleted legacy routes: `/api/generate/route.ts`, `/api/generate/check/route.ts`
- [x] Deleted `GenerateButton.tsx` (dead code)
- [x] Cleaned UpgradePicker: removed `handleGenerate`, SM cache checks, added mobile `StepPhotoGrid`
- [x] Cleaned SidebarPanel: removed `onGenerate` prop and legacy hero generate button
- [x] Cleaned PriceTracker: removed `onGenerate`, `isGenerating`, `hasChanges`, `hasGeneratedPreview` props
- [x] Cleaned generate.ts: removed filesystem swatch fallback, dead helpers (`solidColorPng`, `crc32`, `extractHexFromSvg`)
- [x] Restored reliability path: slide-in range second-pass refinement reintroduced via internal per-photo policy (Stone Martin kitchen-close)

### Upcoming (not started)
- **Workstream E**: Branding controls (depends on A, small)

## What's Done

### Multi-Tenant Foundation (Complete)
- [x] Supabase schema: organizations, floorplans, categories/subcategories/options
- [x] UUID PKs on categories/subcategories/options with `slug` column + `UNIQUE(org_id, slug)`
- [x] Dynamic routing: `/{org-slug}/{floorplan-slug}` (will become subdomain routing)
- [x] Seed script (slug-based upsert with UUID FK lookup maps), data-fetching layer, org-scoped theming, caching
- [x] Query optimization (4 queries/page, 0 on cache hit)
- [x] V1 product spec (`v1-product.md`)

### SM Demo (Fully Multi-Tenant)
- [x] 5-step wizard, 350+ options, 166 swatches, AI kitchen viz
- [x] Mobile UI, contract phase locking, generation reliability hardening
- [x] Now uses multi-tenant `/api/generate/photo` path (same as all builders)

## Key References

| Doc | Content |
|-----|---------|
| `v1-product.md` | V1 spec: option CRUD, floorplans, buyer save, branding, gallery viz, workstreams |
| `product-architecture.md` | Multi-tenant schema, URL structure, user roles, migration path |
| `landing-page.md` | Marketing site design doc |
| `VISION.md` | Business plan, pricing, ROI, GTM |

## Domain

`withfin.ch` — subdomain per builder: `{org-slug}.withfin.ch/{floorplan-slug}`
