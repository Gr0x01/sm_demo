# Finch — AI-Powered Upgrade Visualization for Home Builders

**Product**: Finch — interactive upgrade picker with AI-generated room visualization
**Developer**: Rashaad
**Stage**: Pre-revenue. SM demo complete. Building product + landing page.

## What Finch Does

Home builders sell $8-12K in upgrades per home from printed PDFs. Buyers choose with no visual context. Finch replaces that with an interactive upgrade picker where buyers see AI-generated images of their selections in the actual floor plan. Builders sell more upgrades with less friction.

## Current State

### Live Sites
| URL | What it is |
|-----|-----------|
| **withfin.ch** | Finch homepage (temporary prospect mode — personal intro + interactive demo) |
| **stonemartin.withfin.ch** | Stone Martin demo — full Kinkade plan, real prices, 8 room photos, gallery viz |
| **demo.withfin.ch** | Finch Demo sandbox — "The Nest" floorplan, 4 room photos, shareable with prospects |

### Stone Martin (Complete — Keep Active)
Full working demo built on Stone Martin Builders' Kinkade plan. Real prices, 166 scraped swatch images, 8 room photos with tuned prompts/spatial hints/photo baselines. This is the proof-of-concept shown to every prospect.

**SM is NOT a target customer** — they use BuilderLinq. The demo proves the concept to builders who don't have sophisticated tools.

### Finch Demo Sandbox (Complete — Shareable)
"Finch Demo" org (slug: `demo`) with "The Nest" floorplan. 4 room photos (living room, kitchen, bathroom, bedroom) with full prompt tuning — photo baselines, spatial hints, scene descriptions, generation policies. Use this to demo Finch to prospects without exposing SM data. Admin: `gr0x01@pm.me`.

### Finch Product (Building Now)
- Landing page at withfin.ch
- Multi-tenant architecture for onboarding multiple builders
- See `product-architecture.md` for the multi-tenant plan
- See `landing-page.md` for the marketing site design
- See `VISION.md` for full business plan, pricing, GTM

## Tech Stack

| Service | Purpose |
|---------|---------|
| **Next.js 16** | App framework |
| **Google Gemini (gemini-3-pro-image-preview)** | Image generation (primary) |
| **Supabase** | Database (multi-tenant, RLS) + Storage (swatches, generated images) + Auth (admin) |
| **Tailwind CSS v4** | Styling |
| **Vercel** | Hosting |

## Commands

```bash
npm run dev -p 3003  # local dev (port 3003)
npm run build        # production build
npm run seed:new-tenant -- --org-name "Builder Name" --org-slug "slug"  # seed a new builder org
```

## Environment Variables

```
OPENAI_API_KEY=              # For image generation (kept for fallback)
GOOGLE_API_KEY=              # For Gemini image generation (gemini-3-pro-image-preview)
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
