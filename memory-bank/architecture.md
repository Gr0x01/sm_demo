# Architecture: Finch — Upgrade Visualization for Home Builders

## System Overview

```
Browser (Next.js client)
  ├── / — Finch landing page (static, server component)
  ├── /[orgSlug] — Org landing page (1 floorplan → redirect, multiple → DB-driven chooser with org branding)
  ├── /[orgSlug]/[floorplanSlug] — Upgrade Picker (per-builder demo)
  │     ├── page.tsx — async server component, fetches floorplan-scoped categories from Supabase
  │     ├── DemoPageClient.tsx — client wrapper (LandingHero → UpgradePicker → UpgradeSummary)
  │     ├── All option/step/config data passed as props from server component
  │     ├── Price calculation (client-side, instant)
  │     └── Visual change detection (did a visual sub-category change?)
  ├── /admin — Admin root (org picker or auto-redirect if single org)
  ├── /admin/login — Magic link + OTP login (Supabase Auth)
  ├── /auth/callback — PKCE code exchange for magic link redirects
  ├── /admin/[orgSlug] — Org dashboard (authenticated)
  ├── /admin/[orgSlug]/options — Category/subcategory/option tree CRUD
  ├── /admin/[orgSlug]/floorplans — Floorplan list + CRUD
  ├── /admin/[orgSlug]/floorplans/[id] — Step editor (reorder, section assignment)
  ├── /admin/[orgSlug]/floorplans/[id]/photos — Photo manager (upload, quality check, spatial hints)
  ├── /admin/[orgSlug]/buyers — Buyer session dashboard
  ├── /admin/[orgSlug]/images — Generated image cache management
  └── /api/* — API routes

Server (Next.js API routes + Inngest background functions)
  ├── POST /api/generate/photo (all tenants including SM) — orchestrator only
  │     ├── Validates ownership chain, scopes selections, computes hash
  │     ├── Cache HIT → return 200 with URL
  │     ├── Cache MISS → claim __pending__ slot → dispatch Inngest event → return 202
  │     ├── /check — cache check (complete/pending/not_found/error); poll mode + full derivation mode
  │     └── /feedback — retry flow: deletes cached row, then client regenerates
  ├── POST /api/try/generate (demo page) — orchestrator only
  │     ├── Validates demo selections, computes hash, uploads user photo
  │     ├── Cache HIT → return 200 with URL
  │     └── Cache MISS → claim __pending__ slot → dispatch Inngest event → return 202
  ├── POST /api/inngest — Inngest serve endpoint (GET/POST/PUT)
  └── Inngest background functions (src/inngest/functions/):
        ├── generate-photo — 3 steps: generate → refine (policy 2nd pass, conditional) → persist
        │     OpenAI gpt-image-1.5 via images.edit endpoint. Hero photo + swatches as input images.
        │     Each step gets its own 120s Vercel function invocation.
        │     Config: retries: 2, concurrency: { limit: 5 }
        └── generate-demo — 2 steps: generate → persist
              Config: retries: 2, concurrency: { limit: 3 }

Supabase
  ├── Tables: organizations, floorplans, categories,
  │           subcategories (+ generation_hint, generation_rules, generation_rules_when_not_selected, is_appliance),
  │           options (+ generation_rules), steps, step_sections, step_ai_config
  ├── Table: step_photos (multiple photos per step, hero flag, quality check, spatial hints)
  ├── Table: generated_images (cache — step_id, model, step_photo_id, buyer_session_id, selections_fingerprint)
  ├── Table: step_photo_generation_policies (internal-only per-photo prompt/second-pass policy JSON)
  ├── Table: option_floorplan_pricing (per-floorplan price overrides, composite PK: option_id + floorplan_id)
  ├── Table: buyer_sessions (anonymous + email-saved)
  ├── Table: buyer_selections (DEPRECATED — replaced by buyer_sessions, API route deleted)
  ├── RPC: swap_hero_photo(p_photo_id, p_step_id) — atomic hero swap
  ├── RPC: get_auth_user_id_by_email(lookup_email) — service-role-only user lookup for invite flow
  ├── Trigger: link_pending_invites — on auth.users INSERT, links pending org_users by email
  ├── Storage bucket: kitchen-images ({selections_hash}.png) — legacy SM cache + /try demo
  ├── Storage bucket: generated-images ({orgId}/{hash}.png) — all tenants including SM
  ├── Storage bucket: swatches ({orgId}/swatches/{subcatId}/{uuid}.{ext})
  └── Storage bucket: rooms ({orgId}/rooms/{stepId}/{uuid}.{ext}) — public read, admin upload
```

**Data flow**: All option/step/AI-config data lives in Supabase. The server component in `page.tsx` fetches floorplan-scoped categories via `getCategoriesForFloorplan(orgId, floorplanId)` in `src/lib/db-queries.ts` and passes to client components as props. Per-floorplan pricing overrides are fetched in parallel from `option_floorplan_pricing` and applied as `overrideMap.get(opt.id) ?? opt.price`. Org-wide `getCategoriesWithOptions` is used only by admin and prompt-building (needs all options). API routes also fetch from DB. Static TypeScript files (`options-data.ts`, `step-config.ts`) remain as seed source but are no longer imported at runtime.

**Caching**: Query functions use `unstable_cache` (24h revalidation) for cross-request caching + React `cache()` for request-scoped dedup. First visitor hits DB (4 queries), subsequent visitors get cached results. Cache tags (`org:{slug}`, `categories:{orgId}`, `steps:{floorplanId}`) allow on-demand invalidation.

**Theming**: Org colors (`primary_color`, `secondary_color`, `accent_color`) and `logo_url` stored in `organizations` table. Server component passes theme to `DemoPageClient`, which sets CSS custom properties (`--color-navy`, `--color-navy-hover`, `--color-accent`, `--color-secondary`) via inline style on the wrapper div. All components use CSS vars — no hardcoded brand colors.

## URL & Multi-Tenant Strategy

**Internal routing** (Next.js paths):
- `/` → Finch product landing page (CTA links to `/demo`)
- `/[orgSlug]` → org landing (single floorplan → redirect, multiple → chooser)
- `/[orgSlug]/[floorplanSlug]` → builder demo (e.g. `/stonemartin/kinkade`)
- `/admin` → static route, not caught by dynamic segments
- `/api/*` → static routes, unaffected

**Production URLs** (decided: subdomains):
- `getfinch.app` → Finch landing page
- `stonemartin.getfinch.app/kinkade` → builder demo
- Proxy maps subdomains → path-based routes internally
- No Next.js middleware — subdomain resolution at proxy layer

**Buyer access model**: Open page, no auth required. Anonymous session created on first visit, persisted via cookie (`finch_session_{orgSlug}_{fpSlug}`). Selections auto-saved to `buyer_sessions` table. Optional email save generates resume token + sends link via Resend. Token resume supports cross-org redirect detection.

## Cache Flow

### All Tenants (per-photo, including SM)
1. User clicks "Visualize" on a photo card → POST `/api/generate/photo`
2. Hash includes `_stepPhotoId` + `_model` + `_cacheVersion` for global uniqueness
3. Cache hit → returns 200 with URL + `cacheHit: true`
4. Cache miss → claim `__pending__` slot (DB dedup, 5 min stale TTL) → dispatch `photo/generate.requested` to Inngest → return **202** with `selectionsHash`
5. **Inngest function** (`generate-photo`): 3 steps, each gets its own 120s Vercel invocation:
   - `generate` — load hero photo + swatches from Supabase Storage, build prompt via `buildEditPrompt`, call OpenAI `images.edit` (gpt-image-1.5, quality: high, 1536x1024, input_fidelity: high)
   - `refine` — conditional policy second pass (e.g., slide-in range correction), only when policy requires it
   - `persist` — upload to Storage, upsert cache row replacing `__pending__`, PostHog event
   - Retries: 2 (3 total attempts). Concurrency limit: 5. No slot release on failure — Inngest retries with `__pending__` intact; 5-min stale cleanup handles permanent failures.
6. **Client polling**: 202 or 429 response triggers polling `/api/generate/photo/check` every 3s. Poll exits on: `complete` (show image), `not_found` (generation failed — surface retry), `error` (transient — keep polling), or abort (component unmounted). AbortController per photo key, all aborted on unmount.
7. On refresh: `/api/generate/photo/check` checks per-photo (full derivation mode), restores generated images + IDs
8. Retry → deletes cached row via feedback route, then regenerates fresh
9. "Visualize All" fires up to 20 concurrent

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
│   │   │   ├── StepPhotoGrid (per-photo cards with generate/retry/stale)
│   │   │   │   OR StepHero (display-only for steps without photos)
│   │   │   ├── Section quick-nav (IntersectionObserver-tracked active section)
│   │   │   ├── Running total
│   │   │   └── Continue button
│   │   └── Right Column (flex-1, scrollable)
│   │       └── StepContent (sections → RoomSection per subcategory)
│   │           ├── SwatchGrid (visual swatch grids)
│   │           └── CompactOptionList (non-visual option rows)
│   ├── Mobile Fallback (<lg)
│   │   ├── StepPhotoGrid (inline, above options)
│   │   ├── StepContent
│   │   ├── Continue button
│   │   └── PriceTracker (sticky bottom bar)
│   ├── PriceTracker (mobile-only sticky bottom bar)
│   └── GalleryView (virtual final step: all photos across steps, Visualize All)
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
  selections: Record<subCategoryId, optionId>,     // current picks
  quantities: Record<subCategoryId, number>,        // for additive options
  generatedImageUrls: Record<string, string>,       // photoKey → URL
  generatingPhotoKeys: Set<string>,                 // photos currently generating
  hasEverGenerated: boolean,
  generatedWithSelections: Record<string, string>,  // key → selections fingerprint (stale detection)
  generatedImageIds: Record<string, string>,        // key → generated_image DB id (for retry)
  errors: Record<string, string>,
}
```

- Default selections: `is_default` DB column (authoritative), fallback to first $0 option
- Price computed as derived state: `sum of price for each selected option`
- Selections auto-saved to Supabase per session (debounced 1s)
- Multi-tenant photos use `photoKey` (= `stepPhoto.id`), SM uses `stepId`

## AI Image Generation Pipeline

1. User clicks "Visualize" on a photo card (available on steps with `step_photos`)
2. Client sends POST to `/api/generate/photo` with orgSlug, floorplanSlug, stepPhotoId, selections, sessionId
3. Route validates ownership, scopes selections, computes hash, claims `__pending__` slot
4. Route dispatches `photo/generate.requested` event to Inngest, returns 202
5. Inngest `generate-photo` function runs in background (3 steps, each up to 120s):
   - Downloads hero photo + swatches from Supabase Storage, builds prompt via `buildEditPrompt`
   - Calls OpenAI `images.edit` (gpt-image-1.5, quality: high, 1536x1024, input_fidelity: high)
   - Optional policy second pass (e.g., slide-in range correction)
   - Uploads final image to `generated-images` bucket, upserts cache row
6. Client polls `/api/generate/photo/check` every 3s until result is ready
7. Client displays in StepPhotoGrid (per-photo cards with retry via ImageLightbox)

**Image approach**: OpenAI `gpt-image-1.5` via `images.edit` endpoint. Sends base room photo + individually attached swatch images (via `openai.toFile()`). Prompt lines explicitly map each item to `swatch #N` in deterministic order. Config: `quality: "high"`, `size: "1536x1024"`, `input_fidelity: "high"`. Typical generation time: 45-90s per pass.

**Prompt strategy**: "Surgical precision" pattern with object invariants — deterministic swatch mapping, subcategory + option-level fixed-geometry rules, and explicit in-place replacement allowances for selected appliances. Base rules are global; tenant/photo-specific constraints are layered via per-photo policy overrides (DB-backed, internal-only), including optional second-pass refinements.

**Generation rule layering** (from general to specific, all accumulate into a Set):
1. `subcategory.generation_rules` — fires when subcategory is selected (e.g., "apply Common Wall Paint to all drywall zones"). Supports conditional cross-subcategory logic in natural language (e.g., "If Accent Color is also selected, apply only to non-accent zones").
2. `subcategory.generation_rules_when_not_selected` — negative guards scoped to photo (e.g., "wainscoting OFF = don't add paneling"). Fires for any photo where the subcategory is in scope but not selected.
3. `option.generation_rules` — option-specific rules (e.g., "stainless steel appliances — match existing finish").
4. `step_photo_generation_policies` — per-photo overrides (internal-only, not admin-editable). Prompt invariants + optional second-pass refinement.

All rule fields are admin-editable via the OptionTree AI Rules UI. Conditional cross-subcategory interaction (e.g., wall paint vs accent color) is expressed as natural language in rule text — the AI model evaluates by reading the edit list, no code branches needed.

**Cache semantic versioning**: Generation hash includes `_cacheVersion` so prompt/pipeline changes do not serve stale outputs. Bump `GENERATION_CACHE_VERSION` whenever generation semantics change.
Generation hash also includes policy and prompt context inputs (`_promptPolicy`, `_promptContext`) so changes to per-photo hint/baseline/scene/policy invalidate stale cache entries.

**Reliability playbook**: See `generation-reliability-playbook.md` for the operational checklist and reusable tactics when onboarding new rooms/builders.

**Model history**: Started with gpt-image-1 (OpenAI) text-to-image → Gemini multimodal (base photo + swatches) → `gemini-3-pro-image-preview` (perspective issues, inconsistent output format) → **OpenAI `gpt-image-1.5`** via `images.edit` endpoint (good quality, expensive, slow) → Gemini `gemini-3-pro-image-preview` (faster/cheaper but unpredictable hallucinations — reverted D77) → **OpenAI `gpt-image-1.5`** (current — reliable output, ~60-120s per pass). `@google/genai` kept as devDependency for test scripts.

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
│   ├── [orgSlug]/
│   │   ├── page.tsx               # Org landing — redirect (1 fp) or chooser (multiple)
│   │   └── [floorplanSlug]/
│   │       ├── page.tsx           # Server component — fetches floorplan-scoped data
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
│       │   ├── pricing-overrides/route.ts  # GET/PUT/DELETE per-floorplan price overrides
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
│       │   └── photo/
│       │       ├── route.ts        # POST — orchestrator: validate, claim slot, dispatch Inngest, return 202
│       │       ├── check/route.ts  # POST — multi-tenant per-photo cache check
│       │       └── feedback/route.ts # POST — retry flow: cache row delete for regeneration
│       ├── try/
│       │   ├── generate/route.ts   # POST — demo orchestrator: validate, claim, dispatch Inngest, return 202
│       │   └── check/route.ts      # POST — demo cache check
│       ├── inngest/route.ts        # Inngest serve endpoint (GET/POST/PUT, maxDuration=120)
│       └── ... (selections/[buyerId] endpoint deleted — was deprecated)
├── components/
│   ├── LandingHero.tsx
│   ├── UpgradePicker.tsx        # Main container — all data via props (no static imports)
│   ├── SidebarPanel.tsx         # Sticky sidebar: photo grid or hero, nav, total, continue
│   ├── StepNav.tsx              # Step circles with connector lines
│   ├── StepHero.tsx             # Room photo with AI overlay, compact mode for sidebar
│   ├── StepContent.tsx          # Sections with section IDs for IntersectionObserver
│   ├── RoomSection.tsx          # Renders SwatchGrid or CompactOptionList per subcategory
│   ├── SwatchGrid.tsx           # Grid of tappable visual swatches
│   ├── CompactOptionList.tsx    # Tight single-line rows for non-visual options
│   ├── PriceTracker.tsx         # Sticky bottom bar (mobile only)
│   ├── StepPhotoGrid.tsx        # Per-step photo cards (multi-tenant sidebar, lightbox on click)
│   ├── ImageLightbox.tsx        # Full-screen lightbox with retry button (overlay gradient bar)
│   ├── GalleryView.tsx          # Full gallery grid with Visualize All
│   ├── UpgradeSummary.tsx       # Room images grid, upgrade table, PDF via window.print
│   ├── SaveSelectionsModal.tsx # Email save + resume-by-email modal
│   └── ResumeSavedDesignLink.tsx # Resume design modal (used by org landing page)
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
│   ├── generate.ts          # Prompt construction, buildPromptContextSignature, hashSelections (shared by generation + check routes)
│   ├── models.ts            # IMAGE_MODEL (gpt-image-1.5), VISION_MODEL (gemini-3-flash-preview)
│   └── photo-generation-policy.ts # Internal per-photo policy resolver (DB-backed + fallback)
├── inngest/
│   ├── client.ts              # Inngest client singleton + typed event schemas
│   └── functions/
│       ├── generate-photo.ts  # Background photo generation (3 steps: generate → refine → persist)
│       └── generate-demo.ts   # Background demo generation (2 steps: generate → persist)
└── types/
    └── index.ts             # Buyer types (slug-based id) + Admin types (UUID id + slug)

scripts/
├── seed-sm.ts               # Seed SM data from static TS files into Supabase (idempotent)
├── seed-new-tenant.ts       # Seed a new builder org with starter structure (9 cats, 15 subcats, 15 defaults, 5 steps)
├── seed-lenox.ts            # Create Lenox floorplan (duplicate Kinkade), upload 9 Lenox room photos with full AI metadata, seed 3 generation policies + 55 pricing overrides
├── migrate-sm-storage.ts    # Upload SM room photos + swatches to Storage, create step_photos
├── seed-photo-policies.ts   # Seed internal per-photo generation policies (SM Kinkade kitchen-close + greatroom)
└── sql/
    ├── 2026-02-21-step-photo-generation-policies.sql # Policy table migration
    └── 2026-02-23-option-floorplan-pricing.sql       # Per-floorplan pricing override table

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
- `categories`, `subcategories`, `options` — POST (create with slug generation), PATCH (including generation rule fields), DELETE
- `floorplans` — POST (create with slug), PATCH, DELETE (+ storage cleanup for all step photos)
- `steps` — POST (verify floorplan ownership), PATCH (sections as jsonb full replacement), DELETE (+ storage cleanup)
- `step-photos` — POST (path validation: `{orgId}/rooms/{stepId}/`), PATCH (hero swap via `swap_hero_photo` RPC), DELETE (DB first, then storage)
- `photo-check` — POST: Gemini 2.5 Flash vision quality check (sharp resize to 1536px, pass/warn/fail)
- `spatial-hint` — POST: Gemini 2.5 Flash spatial layout description (does NOT auto-persist; client saves via PATCH)
- `reorder` — bulk sort_order update via `reorder_items` RPC (tables: categories, subcategories, options, steps, step_photos)
- `scope` — floorplan scoping (category junction table + floorplan_ids array columns)
- `generate-descriptor` — AI prompt descriptor generation (Gemini Flash)
- `images` — authenticated GET/DELETE for generated image cache (org-scoped, verified storage deletes)

**Option Tree UI** (`src/components/admin/OptionTree.tsx`): Full CRUD tree with drag reorder (dnd-kit), inline price edit, swatch upload, AI descriptor generation, floorplan scope popovers. Per-floorplan pricing: dropdown selector in toolbar (visible when 2+ floorplans), override indicators (amber dot), inline edit routes to `/api/admin/pricing-overrides`, reset-to-base action. **AI Rules authoring**: Subcategory rows have a collapsible "AI Rules" panel (sparkles icon toggle) with generation hint dropdown (default/skip/always_send), appliance checkbox, and two textareas for `generation_rules` / `generation_rules_when_not_selected` — local draft state with blur-save and error feedback (revert + red badge on failure). Option editor modal includes a generation rules textarea saved as part of the normal Save flow. Badges (purple `appliance`, emerald `rules`) surface state at a glance.

**Floorplan Pipeline UI**: FloorplanList (card grid) → FloorplanEditor (step list with dnd-kit, accordion detail with sections/subcategory assignment) → PhotoManager (step tabs, photo cards with quality badges, spatial hint generation, hero toggle).

**Buyer Dashboard**: `/admin/[orgSlug]/buyers` lists all buyer sessions (email, floorplan, total price, upgrades count, status, last active). `/admin/[orgSlug]/buyers/[id]` shows read-only session detail with selections grouped by step. Uses user-scoped Supabase client (not service role). Excludes anonymous sessions >30 days.

**Cache invalidation**: `invalidateOrgCache(orgId, opts?)` supports optional `orgSlug`, `floorplanId`, `floorplanSlug` to bust buyer-facing cache tags (`org:{slug}`, `steps:{floorplanId}`, `floorplan:{orgId}:{floorplanSlug}`, `categories:{orgId}`).

**Key design**: Categories/subcategories/options have UUID PKs + `slug` text column. Buyer-facing queries map `slug → id` (zero downstream changes). Admin uses UUID `id` + `slug`. `UNIQUE(org_id, slug)` prevents cross-org collisions. `generate_unique_slug` RPC checks slug column with 100-iteration safety cap.

## Analytics

Deferred. Will add PostHog later — the MCP integration is available when ready.

## Performance Considerations

- Image generation: 10-30s depending on complexity
- Pre-cached combos: ~200ms (Supabase Storage CDN)
- Show skeleton/progress indicator during generation
- Guided first experience targets a pre-cached combo for instant wow
