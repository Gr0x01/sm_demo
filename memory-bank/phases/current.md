# Current Phase: Walk-Through Demo Build

## Strategy
Build the real tool — not a pitch deck. Walk the agent through actual Kinkade plan selections with real prices, scraped swatch images, and pre-generated kitchen visualizations. Hand her a generated kitchen image of her choices.

## Parallel Workstreams

### Stream A: Scaffold + UI Shell — DONE
- [x] Initialize Next.js 16 project with Tailwind v4
- [x] Install deps (Vercel AI SDK, OpenAI provider, Supabase client)
- [x] Set up env variables
- [x] Create folder structure per architecture.md
- [x] Define TypeScript types (Category, SubCategory, Option)
- [x] Landing page with hook + "See It In Action" button
- [x] Page flow state (landing → picker → cta)
- [x] Closing CTA

### Stream B: Full Options Data (from Kinkade PDF) — DONE
- [x] Transcribe ALL categories/subcategories/options from Kinkade PDF
- [x] Real prices for every option (15 categories, ~50 subcategories, 350+ options)
- [x] promptDescriptors for visual options (14 visual subcategories)
- [x] isVisual flags on each subcategory
- [x] Social proof nudges on ~15 high-value options
- [x] Default selections (all $0 "included" options)

### Stream C: Swatch Image Scraping — NOT STARTED
- [ ] Scrape stonemartinbuilders.com/media/ for swatch images
- [ ] Tools: ScrapingDog API (700k credits) or Apify
- [ ] Targets: cabinet styles, cabinet colors, hardware, faucets, appliances
- [ ] Stock images for: countertops, backsplash, flooring, sinks
- [ ] Store in /public/swatches/ with consistent naming
- [ ] Map swatchUrl in options-data.ts

### Stream D: Upgrade Picker UI — DONE (room-based redesign)
- [x] **Room-based visual tour layout** (replaced category accordion approach — see D18)
- [x] RoomStrip (horizontal room photo thumbnails, sticky in header)
- [x] RoomHero (full-width room photo for active room)
- [x] SwatchGrid (tappable visual swatch grids for colors/materials)
- [x] CompactOptionList (tight rows for non-visual options)
- [x] RoomSection (decides SwatchGrid vs CompactOptionList per subcategory)
- [x] Room→subcategory mapping via room-config.ts (6 rooms, 49 subcategories)
- [x] "Other Upgrades" collapsible section for non-room categories (~51 subcategories)
- [x] PriceTracker sticky bar (sums ALL selections, real-time, centered max-w-4xl)
- [x] Default selections pre-loaded
- [x] Visual change detection
- [x] GenerateButton (enabled when visual selections changed, kitchen view only)
- [x] Stone Martin logo in header
- [x] Code reviewed — all bugs and issues fixed
- [ ] Polish: transitions, mobile responsiveness, room strip scroll behavior
- [ ] GuidedNudge overlay ("Try upgrading the countertop")

### Stream E: AI Image Pipeline — DONE
- [x] POST /api/generate route
- [x] Prompt construction from promptDescriptors (with layout-anchoring)
- [x] Vercel AI SDK integration (gpt-image-1, pinned version)
- [x] Supabase cache (SHA-256 hash → lookup → upsert)
- [x] RoomHero shows generated image (kitchen view only)
- [x] Input validation, rate limiting, double-click guard
- [x] Error state with user-facing message
- [x] Base64 fallback on upload failure

### Stream F: Pre-generation + Polish — NOT STARTED
- [ ] Pick ~6 key combos for the walk-through
- [ ] Pre-generate via gpt-image-1 (or best model after testing)
- [ ] Cache in Supabase for instant display
- [x] Stone Martin branding (logo added, navy/gold theme)
- [ ] Mobile responsive
- [ ] Error handling polish
- [ ] Vercel deploy

## What's Done
- Full scaffold: Next.js 16.1.6, Tailwind v4, TypeScript, App Router
- **Room-based visual tour UI** with 6 real Kinkade plan photos
- New components: RoomStrip, RoomHero, RoomSection, SwatchGrid, CompactOptionList
- Room config mapping 49 subcategories to 6 rooms; ~51 orphans in "Other Upgrades"
- Deleted dead components: KitchenViewer.tsx, OptionsPanel.tsx
- Full options data from Kinkade PDF (all 15 categories)
- Image generation pipeline with cache, validation, rate limiting
- Code reviewed — all critical/medium issues fixed
- `npm run build` passes clean
- Stone Martin logo saved as `public/logo.svg`
- 6 room photos in `public/rooms/`

## What's Next
1. **Polish pass** — mobile responsiveness, room strip auto-scroll, transitions
2. **Swatch images** — scrape SM website for real product thumbnails (Stream C)
3. **Image generation testing** — try different models, tune prompt quality
4. **Pre-generation** — cache popular combos for instant demo wow factor
5. **GuidedNudge** — first-visit overlay pointing to pre-cached countertop upgrade
6. **Deploy** — push to Vercel

## Blockers
- Need `.env.local` with real keys (OPENAI_API_KEY, Supabase vars)
- Supabase project needs `generated_images` table + public `kitchen-images` bucket
- Swatch scraping needs ScrapingDog/Apify execution

## Open Questions
1. Contact info for CTA: What email/phone for the "Let's talk" screen?
2. Which image generator performs best for kitchen interiors? (Test gpt-image-1, Gemini, etc.)
3. Should other rooms (bath, great room) also get AI visualization? Currently kitchen-only.
