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
