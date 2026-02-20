# Current Phase: V1 Product Build + Polish

## Context

Multi-tenant foundation is done (schema, routing, theming, caching, data layer). V1 product spec written (`v1-product.md`). Domain is `withfin.ch`. Workstreams A, B, and C complete. Now executing on multiple fronts: refining the homepage, tuning the SM demo, and building Workstream D (gallery visualization).

## Active Workstreams

### 1. Homepage Refinement
Landing page exists, iterating on copy, layout, and visuals.
- [ ] Copy and layout tweaks (ongoing)
- [ ] Before/after visual (PDF sheet vs. Finch picker)
- [ ] OG meta tags for link previews
- [ ] PostHog analytics setup
- See `landing-page.md` for design doc

### 2. Interactive Demo
Building a lighter public demo on the landing page for builder prospects.
- [ ] Demo UX and flow tweaks
- See `v1-product.md` Section 5 for gallery viz direction

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
**Depends on B + C.** Per-photo AI visualization, gallery view, thumbs up/down feedback, generation credit cap.
- [x] DB migrations: `generation_cap_per_session` on orgs, `step_photo_id`/`buyer_session_id`/`selections_fingerprint` on `generated_images`, `generation_feedback` table, `reserve_generation_credit` + `refund_generation_credit` RPCs, `generated-images` storage bucket
- [x] `StepPhoto` type on `StepConfig`, `step_photos` join in `getStepsWithConfig`, `getStepPhotoAiConfig` query
- [x] `SwatchBufferResolver` callback in `buildEditPrompt` (Supabase Storage for multi-tenant, filesystem for SM)
- [x] `/api/generate/photo` — multi-tenant per-photo generation with ownership validation, DB-based dedup (`__pending__` placeholder rows), stale lock cleanup (5 min TTL), credit reservation after generation
- [x] `/api/generate/photo/check` — multi-tenant cache check (filters `__pending__` rows)
- [x] `/api/generate/photo/feedback` — thumbs up/down with credit refund/re-reserve, session-scoped image ownership
- [x] Extended `SelectionState`/`SelectionAction` with per-photo keys, feedback, credits
- [x] UpgradePicker: per-photo generation, gallery virtual step, Visualize All (max 3 concurrent), stale detection per photo, initial cache restore for multi-tenant photos on session resume
- [x] `StepPhotoGrid` component — per-step photo cards in sidebar (hero first, stale badge, feedback, lightbox)
- [x] `GalleryView` component — full gallery grid grouped by step, Visualize All, credits meter, cap-reached state
- [x] `SidebarPanel` updated — photo grid replaces StepHero when step has photos, credits display
- [x] Credits wired: `generationCap` from org → session response → page → client → picker
- [x] Admin login Suspense fix for `useSearchParams()`
- [x] SM demo path completely unchanged (no photos → existing hero/generate flow)

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

### SM Demo (Complete — Maintenance Mode)
- [x] 5-step wizard, 350+ options, 166 swatches, AI kitchen viz
- [x] Mobile UI, contract phase locking, generation reliability hardening

## Key References

| Doc | Content |
|-----|---------|
| `v1-product.md` | V1 spec: option CRUD, floorplans, buyer save, branding, gallery viz, workstreams |
| `product-architecture.md` | Multi-tenant schema, URL structure, user roles, migration path |
| `landing-page.md` | Marketing site design doc |
| `VISION.md` | Business plan, pricing, ROI, GTM |

## Domain

`withfin.ch` — subdomain per builder: `{org-slug}.withfin.ch/{floorplan-slug}`
