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
| **BFL Flux 2 Max / Klein 4B** | Image generation (Max for full gen, Klein 4B for scoped edits) |
| **Supabase** | Database (multi-tenant, RLS) + Storage (swatches, generated images) + Auth (admin) |
| **Inngest** | Background job execution (generation pipeline) |
| **Tailwind CSS v4** | Styling |
| **Vitest** | Unit + integration tests |
| **Vercel** | Hosting |

## Commands

```bash
npm run dev -p 3003  # local dev (port 3003)
npm run build        # production build
npm test             # run test suite (176 tests, <1s)
npm run test:watch   # watch mode
npm run seed:new-tenant -- --org-name "Builder Name" --org-slug "slug"  # seed a new builder org
npx tsx scripts/indexnow.ts            # submit marketing URLs to IndexNow (Bing/Yandex)
npx tsx scripts/linkedin-post-finder.ts [--period day|week] [--fetch] [--json] [--top N]  # find LinkedIn posts to engage with
```

## Environment Variables

```
BFL_API_KEY=                 # BFL Flux 2 image generation (Max + Klein 4B)
GOOGLE_GENERATIVE_AI_API_KEY= # Gemini (quality check, spatial hints, AI descriptors)
OPENAI_API_KEY=              # OpenAI (seed scripts only, not used in production pipeline)
NEXT_PUBLIC_SUPABASE_URL=    # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=   # Supabase service role (server-side only)
RESEND_API_KEY=              # Transactional email (Resend)
RESEND_FROM_EMAIL=           # Email sender (e.g. "Finch <hello@withfin.ch>")
NEXT_PUBLIC_POSTHOG_KEY=     # PostHog analytics
INNGEST_SIGNING_KEY=         # Inngest (auto-injected on Vercel)
```

## Doc Map

| Doc | Read when... |
|-----|------------|
| `phases/current.md` | Starting work (ALWAYS) |
| `phases/completed.md` | Need history of what was built |
| `architecture.md` | System design, API patterns, admin, generation pipeline, business models |
| `generation/reliability-playbook.md` | Fixing image-generation failures (prompt/mask/cache tactics) |
| `VISION.md` | Business strategy, pricing, GTM, competitive landscape |
| `decisions.md` | Understanding "why" behind choices |
| `seo-strategy.md` | SEO keyword research, content strategy |
| `v1-product.md` | Historical — original V1 spec (shipped, archived) |
| `crm-system.md` | Notion CRM (Companies/Contacts/Interactions), Instantly, Apollo, outreach workflow |
| `generation/` | Image generation R&D — backsplash research, speed research, reliability playbook |
| `outreach/` | Sales playbooks, campaigns, prospect demo ops, LinkedIn/email scripts |
| `prospects/` | Individual builder research briefs (one per prospect) |
| `project/` | Active feature architecture docs (multi-pass, partial cache, etc.) |
| `research/` | Market research, prospect lists, competitive intel |
