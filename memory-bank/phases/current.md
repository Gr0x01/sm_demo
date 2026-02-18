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
- [x] Page flow state (landing → picker → summary)
- [x] Upgrade Summary screen (replaced ClosingCTA with buyer-facing summary)

### Stream B: Full Options Data (from Kinkade PDF) — DONE
- [x] Transcribe ALL categories/subcategories/options from Kinkade PDF
- [x] Real prices for every option (15 categories, ~50 subcategories, 350+ options)
- [x] promptDescriptors for visual options (14 visual subcategories)
- [x] isVisual flags on each subcategory
- [x] Social proof nudges on ~15 high-value options
- [x] Default selections (all $0 "included" options)

### Stream C: Swatch Image Scraping — DONE
- [x] Scraped stonemartinbuilders.com/media/ using ScrapingDog API (JS rendering)
- [x] Downloaded 166 swatch images across 8 categories
- [x] Cabinet styles (3), cabinet colors (12), cabinet hardware (22)
- [x] Countertops (16 stones + 3 edges), backsplash (30+ tiles)
- [x] Faucets (18), sinks (8), flooring (12 LVP + hardwood), appliances (20+)
- [x] Stored in /public/swatches/{category}/ with consistent naming
- [x] Mapped 146 swatchUrl entries in options-data.ts
- [x] Build passes clean
- Note: Delray hardwood (3 colors) + Crescent Beach not on SM site — no swatches
- Note: Mythology Santorini backsplash — no exact image, used closest match

### Stream D: Upgrade Picker UI — DONE (step-based wizard + two-column sidebar)
- [x] **Step-based wizard** (5 steps replacing room-based tour — see D21)
- [x] StepNav (step circles + connector lines in header)
- [x] StepHero (room photo with AI generation overlay, compact mode for sidebar)
- [x] StepContent (sections with SwatchGrid/CompactOptionList per subcategory)
- [x] SwatchGrid (tappable visual swatch grids for colors/materials)
- [x] CompactOptionList (tight rows for non-visual options)
- [x] Step→subcategory mapping via step-config.ts (5 steps, all subcategories)
- [x] PriceTracker sticky bar (mobile only in two-column layout)
- [x] Default selections pre-loaded
- [x] Visual change detection
- [x] GenerateButton (enabled when visual selections changed)
- [x] Stone Martin logo in header
- [x] Code reviewed — all bugs and issues fixed
- [x] **Two-column sidebar layout** (see D22)
- [x] SidebarPanel with sticky image, generate button, section nav, total, continue
- [x] IntersectionObserver-based active section tracking
- [x] AI generation enabled on steps 1-4 (not just kitchen)
- [x] Mobile fallback: single column with hero on top, sticky PriceTracker
- [x] **URL-based navigation** — page & step state synced to URL search params (`?page=picker&step=design-your-kitchen`), refresh preserves state, browser back/forward works
- [x] **Cached image restoration on refresh** — `/api/generate/check` endpoint looks up cached image by selections hash; picker loads it on mount after restoring selections
- [ ] Polish: transitions, mobile responsiveness
- [ ] GuidedNudge overlay ("Try upgrading the countertop")

### Stream E: AI Image Pipeline — DONE
- [x] POST /api/generate route
- [x] Prompt construction from swatch images + text descriptions
- [x] OpenAI gpt-image-1.5 via images.edit endpoint (room photo + swatches)
- [x] highImpactIds per step — controls which swatches send images vs text-only
- [x] Spatial placement hints in prompt (fridge in alcove, range in cutout, etc.)
- [x] Perspective-locking prompt rules (edit, don't regenerate)
- [x] Supabase cache (SHA-256 hash → lookup → upsert)
- [x] Per-step generated images (each step stores independently, not shared)
- [x] Per-step cache restoration on page refresh
- [x] StepHero shows generated image (all visual steps)
- [x] Input validation, rate limiting, double-click guard
- [x] Error state with user-facing message
- [x] Base64 fallback on upload failure (with logging)
- [x] `input_fidelity: "high"` for better base image preservation
- [x] "Surgical precision" prompt pattern — concise, "change ONLY" framing, count constraints
- [x] GPT-5.2 test path via Responses API (`&model=gpt-5.2` URL param)
- [x] Model name in cache hash + admin page display

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
- **Step-based wizard UI** with 5 steps covering all upgrade categories
- **Two-column sidebar layout** — sticky left sidebar (image + generate + section nav + total) + scrollable right options column
- Components: StepNav, StepHero, StepContent, SidebarPanel, SwatchGrid, CompactOptionList, GenerateButton, PriceTracker
- Step config mapping all subcategories to 5 themed steps via step-config.ts
- AI generation enabled on steps 1-4 (all feed same kitchen generation endpoint)
- Section quick-nav in sidebar with IntersectionObserver-based highlighting
- Responsive: two-column on lg+, single-column with sticky PriceTracker on mobile
- Full options data from Kinkade PDF (all 15 categories)
- Image generation pipeline with cache, validation, rate limiting
- **166 swatch images scraped** from stonemartinbuilders.com via ScrapingDog API
- **146 swatchUrl mappings** applied to options-data.ts (all visual subcategories covered)
- Swatch images in `/public/swatches/{appliances,backsplash,cabinets,countertops,electrical,faucets,flooring,sinks}/`
- `npm run build` passes clean
- Stone Martin logo saved as `public/logo.svg`
- 6 room photos in `public/rooms/`
- Supabase selection persistence (auto-save per buyerId)
- **URL-based navigation** — page state (`?page=`) and step state (`?step=`) synced to URL via `history.pushState`, refresh and back/forward work correctly
- **Cached image restoration** — `/api/generate/check` endpoint checks Supabase cache per-step; picker restores generated images on mount
- **Admin page** (`/admin`) — view/delete all cached generated images, no auth

## What's Next
1. **Polish pass** — mobile responsiveness, transitions
2. **Pre-generation** — cache popular combos for instant demo wow factor
3. **GuidedNudge** — first-visit overlay pointing to pre-cached countertop upgrade
4. **Deploy** — push to Vercel

## Blockers
- Need `.env.local` with real keys (OPENAI_API_KEY, Supabase vars)
- Supabase project needs `generated_images` table + public `kitchen-images` bucket

## Open Questions
1. Contact info for CTA: What email/phone for the "Let's talk" screen?

## Resolved Questions
- **Best image model**: gpt-image-1.5 with `input_fidelity: "high"` is best for demo. GPT-5.2 via Responses API is slightly better but 1.5 is sufficient. Production would need per-surface masking.
