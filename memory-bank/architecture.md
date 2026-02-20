# Architecture: Finch — Upgrade Visualization for Home Builders

## System Overview

```
Browser (Next.js client)
  ├── / — Finch landing page (static, server component)
  ├── /[orgSlug]/[floorplanSlug] — Upgrade Picker (per-builder demo)
  │     ├── page.tsx — async server component, fetches all data from Supabase
  │     ├── DemoPageClient.tsx — client wrapper (LandingHero → UpgradePicker → UpgradeSummary)
  │     ├── All option/step/config data passed as props from server component
  │     ├── Price calculation (client-side, instant)
  │     └── Visual change detection (did a visual sub-category change?)
  ├── /admin — Admin root (redirects to org dashboard)
  ├── /admin/login — Email/password login (Supabase Auth)
  ├── /admin/[orgSlug] — Org dashboard (authenticated)
  ├── /admin/[orgSlug]/options — Category/subcategory/option tree CRUD
  ├── /admin/[orgSlug]/images — Generated image cache management
  └── /api/* — API routes

Server (Next.js API route)
  └── POST /api/generate
        ├── Receives: selections + heroImage + stepSlug (+ optional model)
        ├── Fetches spatial hints + scene description from Supabase (step_ai_config)
        ├── Builds option lookup from Supabase (categories → subcategories → options)
        ├── Hashes visual selections → check Supabase cache
        ├── Cache HIT → return cached image URL instantly
        ├── Cache MISS:
        │     ├── Build prompt + load swatch images (all selected visual items with swatches; text-only fallback if missing)
        │     ├── Call OpenAI images.edit (gpt-image-1.5) with room photo + swatch images
        │     ├── Store result in Supabase (image in Storage, metadata + step_id + model in table)
        │     └── Return image URL
        └── Returns: image URL + cache_hit boolean

Supabase
  ├── Tables: organizations, floorplans, categories, subcategories, options,
  │           steps, step_sections, step_ai_config (multi-tenant schema)
  ├── Table: step_photos (multiple photos per step, hero flag, quality check, spatial hints)
  ├── Table: generated_images (cache — now includes step_id + model columns)
  ├── Table: buyer_sessions (anonymous + email-saved buyer sessions, replaces buyer_selections)
  ├── Table: buyer_selections (DEPRECATED — replaced by buyer_sessions, kept for reference)
  ├── RPC: swap_hero_photo(p_photo_id, p_step_id) — atomic hero swap
  ├── Storage bucket: kitchen-images ({selections_hash}.png)
  ├── Storage bucket: swatches ({orgId}/swatches/{subcatId}/{uuid}.{ext})
  └── Storage bucket: rooms ({orgId}/rooms/{stepId}/{uuid}.{ext}) — public read, admin upload
```

**Data flow**: All option/step/AI-config data lives in Supabase. The server component in `page.tsx` fetches via `src/lib/db-queries.ts` and passes to client components as props. API routes also fetch from DB. Static TypeScript files (`options-data.ts`, `step-config.ts`) remain as seed source but are no longer imported at runtime.

**Caching**: Query functions use `unstable_cache` (24h revalidation) for cross-request caching + React `cache()` for request-scoped dedup. First visitor hits DB (4 queries), subsequent visitors get cached results. Cache tags (`org:{slug}`, `categories:{orgId}`, `steps:{floorplanId}`) allow on-demand invalidation.

**Theming**: Org colors (`primary_color`, `secondary_color`, `accent_color`) and `logo_url` stored in `organizations` table. Server component passes theme to `DemoPageClient`, which sets CSS custom properties (`--color-navy`, `--color-navy-hover`, `--color-accent`, `--color-secondary`) via inline style on the wrapper div. All components use CSS vars — no hardcoded brand colors.

## URL & Multi-Tenant Strategy

**Internal routing** (Next.js paths):
- `/` → Finch product landing page
- `/[orgSlug]/[floorplanSlug]` → builder demo (e.g. `/stone-martin/kinkade`)
- `/admin` → static route, not caught by dynamic segments
- `/api/*` → static routes, unaffected

**Production URLs** (decided: subdomains):
- `getfinch.app` → Finch landing page
- `stonemartin.getfinch.app/kinkade` → builder demo
- Proxy maps subdomains → path-based routes internally
- No Next.js middleware — subdomain resolution at proxy layer

**Buyer access model**: Open page, no auth required. Anonymous session created on first visit, persisted via cookie (`finch_session_{orgSlug}_{fpSlug}`). Selections auto-saved to `buyer_sessions` table. Optional email save generates resume token + sends link via Resend. Token resume supports cross-org redirect detection.

## Cache Flow

1. User clicks "Visualize"
2. Client sends step's visual selections to `/api/generate`
3. Server creates deterministic hash of visual selections (sorted keys + option IDs → SHA-256, truncated to 16 hex)
4. Query Supabase: `SELECT image_path FROM generated_images WHERE selections_hash = ?`
5. If found → return Supabase Storage public URL (instant, ~200ms)
6. If not found → generate via gpt-image-1.5 (30-45s) → upload PNG to Storage → upsert cache row → return URL
7. Client receives image URL either way
8. On page refresh: `/api/generate/check` checks cache per-step (each step's visual selections hashed independently)

## Pre-generation Strategy

- Identify 10-20 "most popular" visual combinations
- Run a script that generates these combos and populates the cache
- Include the base ($0) defaults and the most likely first upgrades (e.g., base + Calacatta quartz, base + Oxford cabinets)
- The guided first experience ("try upgrading the countertop") points at a PRE-CACHED combo so the first visualization is instant — that's the "wow" moment
- Can run pre-generation as a one-time script or as a build step

## Component Architecture

```
page.tsx (flow state: "landing" | "picker" | "summary")
├── LandingHero
├── UpgradePicker (main container — step-based wizard with two-column layout)
│   ├── Header (sticky: logo + StepNav)
│   │   └── StepNav (step circles with connector lines, 5 steps)
│   ├── Two-Column Layout (desktop lg+)
│   │   ├── SidebarPanel (sticky left, 340px)
│   │   │   ├── StepHero (compact 4:3 room photo, AI-generated image overlay)
│   │   │   ├── GenerateButton (steps 1-4)
│   │   │   ├── Section quick-nav (IntersectionObserver-tracked active section)
│   │   │   ├── Running total
│   │   │   └── Continue button
│   │   └── Right Column (flex-1, scrollable)
│   │       └── StepContent (sections → RoomSection per subcategory)
│   │           ├── SwatchGrid (visual swatch grids)
│   │           └── CompactOptionList (non-visual option rows)
│   ├── Mobile Fallback (<lg)
│   │   ├── StepHero (full-width)
│   │   ├── GenerateButton
│   │   ├── StepContent
│   │   ├── Continue button
│   │   └── PriceTracker (sticky bottom bar)
│   └── PriceTracker (mobile-only sticky bottom bar)
└── UpgradeSummary (room images grid, upgrade table, PDF via window.print)
```

### Step-Based Wizard Layout

The UI is organized as a 5-step wizard. Each step groups related upgrade subcategories into themed sections via `step-config.ts`.

| Step | Name | Hero Photo | Key Upgrades | AI Generate? |
|------|------|-----------|-------------|-------------|
| 1 | Set Your Style | greatroom-wide.webp | Cabinets, flooring, paint, trim, fireplace, lighting | Yes |
| 2 | Design Your Kitchen | kitchen-close.webp | Countertops, backsplash, kitchen cabinets, sink, faucet, appliances | Yes |
| 3 | Primary Bath | primary-bath-vanity.webp | Vanity, cabinet color, mirrors, tile, shower, fixtures | Yes |
| 4 | Secondary Spaces | bath-closet.webp | Secondary bath, laundry, powder room, closets | Yes |
| 5 | Finishing Touches | (none) | Electrical, hardware, smart home, plumbing, HVAC, exterior | No |

### Two-Column Sidebar Layout

- **Desktop (lg+)**: Sticky left sidebar (340px) with AI image, generate button, section quick-nav, total, and continue. Scrollable right column for options.
- **Mobile (<lg)**: Single column — hero image on top, options below, sticky PriceTracker at bottom.
- **Section quick-nav**: Click → `scrollIntoView()`. Active section tracked via `IntersectionObserver`.
- Header measures its own height via `ResizeObserver` and sets `--header-height` CSS var for scroll-margin-top offsets.

## State Management

Single `useReducer` in UpgradePicker.

State shape:
```typescript
{
  selections: Record<subCategoryId, optionId>,  // current picks
  quantities: Record<subCategoryId, number>,     // for additive options
  generatedImageUrls: Record<stepId, string>,    // per-step generated image URLs
  isGenerating: boolean,
  hasEverGenerated: boolean,
  visualSelectionsChangedSinceLastGenerate: boolean,
  error: string | null,
}
```

- Default selections: all $0 (included) options pre-selected
- Price computed as derived state: `sum of price for each selected option`
- Selections auto-saved to Supabase per buyerId (debounced 1s)

## AI Image Generation Pipeline

1. User clicks "Visualize" (available on steps 1-4, each step generates independently)
2. Client sends POST to `/api/generate` with step's visual selections + heroImage + stepSlug
3. Server builds edit prompt + loads swatch images for selected visual items (text-only fallback if swatch missing)
4. Server calls OpenAI `images.edit` with `gpt-image-1.5`:
   - Input: room photo + swatch images (array of files)
   - Prompt includes upgrade list + spatial placement rules + perspective-locking
   - Output: 1536x1024 PNG, quality "high"
5. Optional targeted pass-2 refine for known failure modes (masked, object-only correction)
6. Upload to Supabase Storage, upsert cache row
7. Return image URL to client
8. Client displays in StepHero (per-step, not shared)

**Image approach**: OpenAI image editing via `images.edit` endpoint. Sends base room photo + individually attached swatch images for selected visual items. Prompt lines explicitly map each item to `swatch #N` in deterministic order, so the model can bind the correct material to the correct surface.

**Prompt strategy**: "Surgical precision" pattern with object invariants — deterministic swatch mapping, subcategory + option-level fixed-geometry rules, and explicit in-place replacement allowances for selected appliances. Includes object-count/cabinet-geometry preservation plus known failure guards (sink/faucet orientation, refrigerator alcove, range cutout/type, island vs perimeter cabinet boundaries).

**`input_fidelity: "high"`**: Added to the `images.edit` call to maximize preservation of base image details (hardware, pulls, fixtures). Default is "low". Costs ~$0.04-0.06 extra per request.

**Conditional pass-2 refine**: For stubborn failures, run a second masked `images.edit` pass on the generated result with a narrow object-only prompt and `input_fidelity: "low"` (to allow geometry change in the masked region only). Current usage: slide-in range backguard correction on kitchen-close hero.

**Cache semantic versioning**: Generation hash includes `_cacheVersion` so prompt/pipeline changes do not serve stale outputs. Bump `GENERATION_CACHE_VERSION` whenever generation semantics change.

**Reliability playbook**: See `generation-reliability-playbook.md` for the operational checklist and reusable tactics when onboarding new rooms/builders.

**GPT-5.2 test path**: Add `&model=gpt-5.2` to URL to use GPT-5.2 via Responses API instead of gpt-image-1.5. Uses `image_generation` tool. Better detail preservation but different API pattern. Cache hash includes model name to prevent collisions. Admin page shows model tag on cached images.

**Model history**: Started with gpt-image-1 (OpenAI) text-to-image → Gemini multimodal (base photo + swatches) → `gemini-3-pro-image-preview` (perspective issues, inconsistent output format, Supabase upload failures with large PNGs) → **OpenAI `gpt-image-1.5`** via `images.edit` endpoint (current — best quality for demo). GPT-5.2 via Responses API tested — better detail preservation but 1.5 is good enough for demo. Production would need per-surface masking and multi-pass inpainting.

## Swatch Images

Stone Martin's website (`stonemartinbuilders.com/media/`) has high-quality product photos and swatches for most kitchen options. These serve two purposes:
1. **UI thumbnails** in the option picker
2. **Potential AI reference** if we later switch to image editing approach

Available from SM site: Cabinet styles, colors, hardware, faucets, appliances, cabinet features.
Need stock images: Countertop materials, backsplash tiles, flooring, sinks.

## File Structure

```
src/
├── app/
│   ├── page.tsx                    # Finch landing page (server component)
│   ├── layout.tsx                  # Root layout — Finch branding
│   ├── globals.css
│   ├── [orgSlug]/[floorplanSlug]/
│   │   ├── page.tsx               # Server component — fetches all data from Supabase
│   │   ├── DemoPageClient.tsx     # Client wrapper (LandingHero → picker → summary)
│   │   └── layout.tsx             # Demo layout — builder-specific metadata
│   ├── admin/
│   │   ├── page.tsx                # Admin root — redirects to org
│   │   ├── login/page.tsx          # Login page (Supabase Auth)
│   │   └── [orgSlug]/
│   │       ├── layout.tsx          # Admin layout with sidebar
│   │       ├── page.tsx            # Org dashboard
│   │       ├── options/page.tsx    # Option tree CRUD
│   │       ├── floorplans/page.tsx # Floorplan list + CRUD
│   │       ├── floorplans/[id]/page.tsx  # Step editor (dnd-kit reorder, sections)
│   │       ├── floorplans/[id]/photos/page.tsx  # Photo management per step
│   │       ├── buyers/page.tsx     # Buyer session list
│   │       ├── buyers/[id]/page.tsx # Buyer session detail (read-only)
│   │       └── images/             # Generated image management (server+client split)
│   └── api/
│       ├── admin/
│       │   ├── categories/         # POST, [id] PATCH/DELETE
│       │   ├── subcategories/      # POST, [id] PATCH/DELETE
│       │   ├── options/            # POST, [id] PATCH/DELETE
│       │   ├── floorplans/         # POST, [id] PATCH/DELETE (+ storage cleanup on delete)
│       │   ├── steps/              # POST, [id] PATCH/DELETE (sections as jsonb)
│       │   ├── step-photos/        # POST, [id] PATCH/DELETE (hero swap via RPC)
│       │   ├── photo-check/route.ts # Vision quality check (Gemini Flash, sharp resize)
│       │   ├── spatial-hint/route.ts # AI spatial layout description (Gemini Flash)
│       │   ├── reorder/route.ts    # Bulk sort_order update (categories, subcategories, options, steps, step_photos)
│       │   ├── scope/route.ts      # Floorplan scoping (GET/POST)
│       │   ├── generate-descriptor/route.ts  # AI descriptor generation
│       │   ├── images/route.ts     # Authenticated GET/DELETE for image cache
│       │   └── buyer-sessions/route.ts # GET — admin session list (authenticateAdminRequest)
│       ├── buyer-sessions/
│       │   ├── route.ts            # POST — create anonymous session
│       │   ├── [sessionId]/route.ts # GET — load by ID, PUT — auto-save (server price calc)
│       │   ├── [sessionId]/save-email/route.ts # POST — attach email + send resume link
│       │   ├── resume/[token]/route.ts # GET — token-based resume
│       │   └── resume-by-email/route.ts # POST — email-based resume (rate-limited)
│       ├── generate/
│       │   ├── route.ts            # POST — fetches AI config from DB, generates image
│       │   └── check/route.ts      # POST — cache check, validates against DB
│       └── selections/[buyerId]/route.ts  # DEPRECATED — replaced by buyer-sessions
├── components/
│   ├── LandingHero.tsx
│   ├── UpgradePicker.tsx        # Main container — all data via props (no static imports)
│   ├── SidebarPanel.tsx         # Sticky sidebar: image, generate, nav, total, continue
│   ├── StepNav.tsx              # Step circles with connector lines
│   ├── StepHero.tsx             # Room photo with AI overlay, compact mode for sidebar
│   ├── StepContent.tsx          # Sections with section IDs for IntersectionObserver
│   ├── RoomSection.tsx          # Renders SwatchGrid or CompactOptionList per subcategory
│   ├── SwatchGrid.tsx           # Grid of tappable visual swatches
│   ├── CompactOptionList.tsx    # Tight single-line rows for non-visual options
│   ├── PriceTracker.tsx         # Sticky bottom bar (mobile only)
│   ├── GenerateButton.tsx
│   ├── UpgradeSummary.tsx       # Room images grid, upgrade table, PDF via window.print
│   └── SaveSelectionsModal.tsx # Email save + resume-by-email modal
├── components/admin/
│   ├── OptionTree.tsx       # Full CRUD tree with drag reorder, inline edit, swatch upload
│   ├── SwatchUpload.tsx     # Swatch image upload to Supabase Storage
│   ├── FloorplanScopePopover.tsx  # Floorplan scope toggle UI
│   ├── AdminSidebar.tsx     # Admin navigation sidebar
│   ├── FloorplanList.tsx    # Floorplan card list with inline edit, active toggle, add form
│   ├── FloorplanEditor.tsx  # Step list with dnd-kit reorder, accordion detail, section editor
│   ├── StepSectionEditor.tsx # Section CRUD with searchable subcategory assignment
│   ├── RoomPhotoUpload.tsx  # Photo upload (20MB limit, 1024x1024 min, orphan cleanup)
│   ├── PhotoManager.tsx     # Step tabs, photo cards, quality check, spatial hints
│   └── PhotoQualityBadge.tsx # Color-coded pass/warn/fail badge with tooltip
├── lib/
│   ├── db-queries.ts        # Buyer-facing queries (slug → id mapping for buyer types)
│   ├── admin-queries.ts     # Admin queries (user-scoped, no cache, returns UUID id + slug)
│   ├── admin-auth.ts        # API route auth helper (authenticateAdminRequest)
│   ├── admin-cache.ts       # invalidateOrgCache for mutation cache busting
│   ├── auth.ts              # getAuthenticatedUser(orgSlug), getUserOrgs()
│   ├── slugify.ts           # Text → slug conversion
│   ├── supabase.ts          # Service role client + cache helpers
│   ├── supabase-server.ts   # SSR client (@supabase/ssr)
│   ├── supabase-browser.ts  # Browser client (@supabase/ssr)
│   ├── options-data.ts      # Static seed source (no longer imported at runtime)
│   ├── step-config.ts       # Static seed source (no longer imported at runtime)
│   ├── pricing.ts           # Price calculation (accepts categories as param)
│   ├── buyer-session.ts     # Session helpers (mapRowToPublicSession, validateEmail, SESSION_COLUMNS)
│   ├── email.ts             # Resend email utility (sendResumeEmail, lazy-initialized client)
│   └── generate.ts          # Prompt construction (accepts optionLookup, spatialHints, sceneDescription)
└── types/
    └── index.ts             # Buyer types (slug-based id) + Admin types (UUID id + slug)

scripts/
└── seed-sm.ts               # Seed SM data from static TS files into Supabase (idempotent)

public/
├── logo.svg                 # Stone Martin Builders logo (currentColor fill)
├── rooms/                   # 6 real Kinkade plan photos
│   ├── kitchen-close.webp
│   ├── kitchen-greatroom.webp
│   ├── greatroom-wide.webp
│   ├── primary-bath-vanity.webp
│   ├── primary-bath-shower.webp
│   └── bath-closet.webp
└── swatches/                # 166 scraped swatch images
    ├── appliances/
    ├── backsplash/
    ├── cabinets/
    ├── countertops/
    ├── electrical/
    ├── faucets/
    ├── flooring/
    └── sinks/
```

## Admin System

**Auth**: Supabase Auth email/password. `org_users` join table maps users → orgs with role (`admin`/`viewer`). Middleware refreshes tokens on `/admin/*` routes. `authenticateAdminRequest()` helper validates auth + org membership on all API routes.

**Routing**: `/admin/[orgSlug]/...` — org-scoped admin pages. Server components gate with `getAuthenticatedUser(orgSlug)`.

**CRUD API routes** (`/api/admin/{entity}`):
- `categories`, `subcategories`, `options` — POST (create with slug generation), PATCH, DELETE
- `floorplans` — POST (create with slug), PATCH, DELETE (+ storage cleanup for all step photos)
- `steps` — POST (verify floorplan ownership), PATCH (sections as jsonb full replacement), DELETE (+ storage cleanup)
- `step-photos` — POST (path validation: `{orgId}/rooms/{stepId}/`), PATCH (hero swap via `swap_hero_photo` RPC), DELETE (DB first, then storage)
- `photo-check` — POST: Gemini 2.5 Flash vision quality check (sharp resize to 1536px, pass/warn/fail)
- `spatial-hint` — POST: Gemini 2.5 Flash spatial layout description (does NOT auto-persist; client saves via PATCH)
- `reorder` — bulk sort_order update via `reorder_items` RPC (tables: categories, subcategories, options, steps, step_photos)
- `scope` — floorplan scoping (category junction table + floorplan_ids array columns)
- `generate-descriptor` — AI prompt descriptor generation (Gemini Flash)
- `images` — authenticated GET/DELETE for generated image cache (org-scoped, verified storage deletes)

**Option Tree UI** (`src/components/admin/OptionTree.tsx`): Full CRUD tree with drag reorder (dnd-kit), inline price edit, swatch upload, AI descriptor generation, floorplan scope popovers.

**Floorplan Pipeline UI**: FloorplanList (card grid) → FloorplanEditor (step list with dnd-kit, accordion detail with sections/subcategory assignment) → PhotoManager (step tabs, photo cards with quality badges, spatial hint generation, hero toggle).

**Buyer Dashboard**: `/admin/[orgSlug]/buyers` lists all buyer sessions (email, floorplan, total price, selections count, last active, status). `/admin/[orgSlug]/buyers/[id]` shows read-only session detail with selections grouped by step. Uses user-scoped Supabase client (not service role). Excludes anonymous sessions >30 days.

**Cache invalidation**: `invalidateOrgCache(orgId, opts?)` supports optional `orgSlug`, `floorplanId`, `floorplanSlug` to bust buyer-facing cache tags (`org:{slug}`, `steps:{floorplanId}`, `floorplan:{orgId}:{floorplanSlug}`, `categories:{orgId}`).

**Key design**: Categories/subcategories/options have UUID PKs + `slug` text column. Buyer-facing queries map `slug → id` (zero downstream changes). Admin uses UUID `id` + `slug`. `UNIQUE(org_id, slug)` prevents cross-org collisions. `generate_unique_slug` RPC checks slug column with 100-iteration safety cap.

## Analytics

Deferred. Will add PostHog later — the MCP integration is available when ready.

## Performance Considerations

- Image generation: 10-30s depending on complexity
- Pre-cached combos: ~200ms (Supabase Storage CDN)
- Show skeleton/progress indicator during generation
- Guided first experience targets a pre-cached combo for instant wow
