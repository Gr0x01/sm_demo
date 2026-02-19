# Current Phase: Product Launch Setup

## Context

The Stone Martin demo is complete and working. It's the proof-of-concept shown to every builder prospect. Now we're building Finch as a real product — landing page, brand identity, and the foundation for onboarding multiple builders.

## Active Workstreams

### Stream A: SM Demo — Maintenance Mode
The demo is done. Keep it working. Fix bugs if they come up. Don't add features unless needed for a specific pitch.
- [x] All 5 streams (scaffold, data, swatches, UI, AI pipeline) complete
- [x] Step-based wizard, two-column sidebar, swatch grids, AI generation
- [x] 350+ options from real Kinkade pricing PDF, 166 swatch images
- [x] Contract phase locking (pre/post toggle)
- [x] Mobile UI overhaul
- [x] Generation reliability hardening documented (deterministic swatch mapping, fixed-geometry invariants, reduced prompt noise)
- [ ] Pre-generate ~6 key combos for instant demo (nice-to-have)
- [ ] Vercel deploy (when domain is ready)

### Stream B: Finch Brand & Landing Page
Build the marketing site that sells Finch to builders. See `landing-page.md` for full design doc.
- [ ] Final product name confirmation (Finch pending LLC)
- [ ] Domain setup
- [ ] Landing page build (Next.js route, pure static + Tailwind)
- [ ] Before/after visual (PDF sheet vs. Finch picker screenshot)
- [ ] ROI calculator section
- [ ] "See the Demo" CTA → links to SM demo (or neutral version)
- [ ] "Book a Walkthrough" CTA → Calendly
- [ ] OG meta tags for link previews
- [ ] PostHog analytics setup

### Stream C: Multi-Tenant Foundation
Move from single-tenant demo to a system that can host multiple builder demos. See `product-architecture.md`.
- [x] Supabase schema: organizations, floorplans, categories/subcategories/options tables
- [x] Dynamic routing: `/{org-slug}/{floorplan-slug}`
- [x] Migrate SM data from TypeScript to Supabase tables
- [x] Seed script (`scripts/seed-sm.ts`) — idempotent upsert of all SM data
- [x] Data-fetching layer (`src/lib/db-queries.ts`) — all queries for org/floorplan/categories/steps
- [x] Server component page fetches from DB, passes props to client wrapper
- [x] API routes fetch spatial hints, scene descriptions, option lookups from DB
- [x] Org-scoped theming — colors (primary, secondary, accent) + logo from DB via CSS custom properties
- [x] Cross-request caching — `unstable_cache` (24h revalidation) + React `cache()` for request dedup
- [x] Query optimization — nested PostgREST select (4 queries/page, 0 on cache hit)
- [ ] RLS policies for tenant isolation
- [ ] Builder demo template: lighter-weight version of SM demo
- [ ] Add a reusable "generation reliability checklist" to onboarding so every new builder demo gets the same prompt/invariant standards
- [ ] Deploy to Vercel with subdomain routing

### Stream D: Sales & Outreach
- [ ] Builder prospect outreach (see `research/` for lists)
- [ ] HBA event attendance (Greater Montgomery HBA, GBAHB)
- [ ] One-pager PDF for secondary CTA
- [ ] Pitch deck / walkthrough script

## What's Done (SM Demo)

Full list in `product.md` and `architecture.md`. Highlights:
- Next.js 16 app with 5-step wizard, two-column sidebar layout
- AI image generation (gpt-image-1.5 via images.edit) with Supabase caching
- All Kinkade plan options with real pricing
- 166 scraped swatch images from stonemartinbuilders.com
- URL-based navigation, cached image restoration, admin page
- Mobile UI, contract phase locking, parallel generation

## Key Decision

**Builder demos are the repeatable unit.** Each prospect gets a demo built on their floor plan and pricing data. Lighter than the SM demo (don't need 350+ options scraped from scratch), but same bones: step wizard, swatch grids, AI visualization, price tracking. The SM demo is the template.

## Blockers

- LLC registration (for Finch name, domain, contracts)
- Domain purchase
- SM permission to use their name/logo as social proof (nice-to-have, not required)
