# Current Phase: V1 Product Build + Polish

## Context

Multi-tenant foundation is done (schema, routing, theming, caching, data layer). V1 product spec written (`v1-product.md`). Domain is `withfin.ch`. Now executing on multiple fronts: refining the homepage, tuning the SM demo, and building Workstream A (builder admin).

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

### 4. V1 Workstream A: Builder Admin — Auth, RLS, Option Management
**The first product workstream.** See `v1-product.md` Section 9 for full breakdown.
- [x] Admin auth (Supabase Auth email/password, org-scoped via `org_users` join table)
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

### Upcoming (not started)
- **Workstream C**: Buyer save + magic link (backend is independent, dashboard needs A)
- **Workstream D**: Gallery visualization (depends on B + C)
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
