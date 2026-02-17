# Stone Martin Builders — Upgrade Picker + Kitchen Visualizer

**Client**: Stone Martin Builders (Alabama)
**Type**: Demo / Prototype — potential full product build
**Developer**: Rashaad

## What This Does

Stone Martin Builders currently gives homebuyers a **printed PDF** of upgrade options (Kinkade plan, McClain Landing Phase 7). Buyers choose $40K+ in upgrades with no visual context, no pricing feedback, and no nudges toward high-value options.

This demo replaces that with an **interactive upgrade picker with AI kitchen visualization**: browse all upgrade categories, select options with real pricing, see social proof nudges, and generate AI images showing what the kitchen looks like with those choices.

### The Problem
- Buyers choose $40K+ in home upgrades from a printed PDF
- No visual context for what combinations look like
- No real-time price tracking as they select
- No upsell intelligence or social proof
- Decision paralysis → slower sales cycle, lower upgrade revenue

### The Solution
- Interactive upgrade picker with ALL categories from the real pricing sheet
- Real pricing data from the Kinkade plan PDF
- AI-generated kitchen visualization for visual options
- Social proof nudges ("Most popular", "73% of buyers choose this") to drive upsell
- Real-time price tracker summing all selections
- Swatch images sourced from stonemartinbuilders.com/media/ where available

## Tech Stack

| Service | Purpose |
|---------|---------|
| **Next.js 16** | App framework |
| **Vercel AI SDK** | Model-agnostic LLM/image calls |
| **OpenAI (gpt-image-1)** | Image generation |
| **Supabase** | Database (image cache) + Storage (generated images) |
| **Tailwind CSS v4** | Styling |
| **Vercel** | Hosting |

## Data Source

All option names, categories, and prices come from the **real Stone Martin pricing PDF** — Kinkade plan, McClain Landing Phase 7 (valid through 2/12/2026). Swatch images come from `stonemartinbuilders.com/media/` for most visual options.

## Commands

```bash
npm run dev          # local dev
npm run build        # production build
```

## Environment Variables

```
OPENAI_API_KEY=              # For image generation (gpt-image-1)
NEXT_PUBLIC_SUPABASE_URL=    # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=   # Supabase service role (server-side only)
```

## Doc Map

| Doc | Read when... |
|-----|------------|
| `phases/current.md` | Starting work (ALWAYS) |
| `product.md` | Building user-facing features |
| `architecture.md` | Building backend/API/image pipeline |
| `decisions.md` | Understanding "why" behind choices |
