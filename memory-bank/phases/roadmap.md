# Roadmap

## Phase 0: Stone Martin Demo — DONE
Full working demo: step wizard, AI visualization, real pricing, swatch images, caching.

## Phase 1: Product Launch Setup (CURRENT)
- [x] SM demo complete and working
- [x] Supabase multi-tenant schema (8 tables: orgs, floorplans, categories, subcategories, options, steps, step_sections, step_ai_config)
- [x] Migrate SM data to database (seed script, 1 org / 1 floorplan / 15 categories / 100 subcategories / 617 options / 5 steps)
- [x] Dynamic routing (`/{org-slug}/{floorplan-slug}`) — SM demo at `/stone-martin/kinkade`
- [x] All components prop-driven from DB (no static imports for data)
- [ ] Finch branding (name, LLC, domain)
- [ ] Landing page
- [ ] RLS policies for tenant isolation
- [ ] Subdomain routing (e.g. `stonemartin.getfinch.app/kinkade`)
- [ ] Deploy SM demo to Vercel

## Phase 2: First Paying Builder (Q2 2026)
- Target builders still on PDFs — Lowder, Conner Brothers, Harris Doyle, Alexander Scott
- Build their demo (lighter than SM — same bones, their floor plan + pricing)
- Use SM demo as the sales pitch, deliver their branded version
- Measure upgrade revenue impact
- Get testimonial / case study
- **Goal: 1 builder, 1-2 floor plans**

## Phase 3: Second Builder + Proof (Q3-Q4 2026)
- Use first builder's results to close second builder
- Expand first builder to more floor plans (natural upsell)
- HBA events, local networking
- **Goal: 2 builders, 2+ plans each = $46-60K Year 1**

## Phase 4: Scale (2027)
- 3-5 total builders
- Builder admin UI (manage their own options/pricing)
- Analytics dashboard (popular options, conversion tracking)
- Southeast Building Conference (SEBC), International Builders' Show (IBS)
- Consider self-hosted GPU at 3+ clients for margin improvement

## Phase 5: Self-Serve (Future)
- Builders onboard themselves through admin panel
- CSV import for pricing data
- Photo upload with guided annotation
- AI-assisted prompt descriptor generation
- Shared upgrade catalog across builders
