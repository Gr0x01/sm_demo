# Finch — AI-Powered Upgrade Visualization for Home Builders

**Product**: Finch — interactive upgrade picker with AI-generated room visualization
**Developer**: Rashaad
**Stage**: Pre-revenue. SM demo complete. Building product + landing page.

## What Finch Does

Home builders sell $8-12K in upgrades per home from printed PDFs. Buyers choose with no visual context. Finch replaces that with an interactive upgrade picker where buyers see AI-generated images of their selections in the actual floor plan. Builders sell more upgrades with less friction.

## Current State

### Stone Martin Demo (Complete — Keep Active)
Full working demo built on Stone Martin Builders' Kinkade plan. Real prices, 166 scraped swatch images, AI kitchen visualization. This is the proof-of-concept shown to every prospect. Lives in this repo.

**SM is NOT a target customer** — they use BuilderLinq. The demo proves the concept to builders who don't have sophisticated tools.

### Finch Product (Building Now)
- Landing page at withfin.ch
- Multi-tenant architecture for onboarding multiple builders
- Builder demos: lighter than SM (same bones, less exhaustive data entry)
- See `product-architecture.md` for the multi-tenant plan
- See `landing-page.md` for the marketing site design
- See `VISION.md` for full business plan, pricing, GTM

## Tech Stack

| Service | Purpose |
|---------|---------|
| **Next.js 16** | App framework |
| **OpenAI (gpt-image-1.5)** | Image generation (via images.edit) |
| **Supabase** | Database (multi-tenant, RLS) + Storage (swatches, generated images) + Auth (admin) |
| **Tailwind CSS v4** | Styling |
| **Vercel** | Hosting |

## Commands

```bash
npm run dev -p 3003  # local dev (port 3003)
npm run build        # production build
```

## Environment Variables

```
OPENAI_API_KEY=              # For image generation (gpt-image-1.5)
NEXT_PUBLIC_SUPABASE_URL=    # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=   # Supabase service role (server-side only)
```

## Doc Map

| Doc | Read when... |
|-----|------------|
| `phases/current.md` | Starting work (ALWAYS) |
| `product.md` | Working on the SM demo or buyer-facing UI |
| `architecture.md` | Working on SM demo backend/API/image pipeline |
| `generation-reliability-playbook.md` | Fixing image-generation failures quickly (prompt/mask/cache tactics) |
| `product-architecture.md` | Multi-tenant schema, UUID PK design, migration path |
| `v1-product.md` | V1 spec: option CRUD, floorplans, buyer save, branding, gallery viz, workstreams. Workstreams A+B complete. |
| `landing-page.md` | Building the marketing site |
| `VISION.md` | Business strategy, pricing, GTM, competitive landscape |
| `decisions.md` | Understanding "why" behind choices |
| `research/` | Builder prospect lists for sales outreach |
