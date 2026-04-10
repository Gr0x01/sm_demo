# Architecture: Finch — Upgrade Visualization for Home Builders

## System Overview

```
Browser (Next.js client)
  ├── / — Finch landing page (static, server component)
  ├── /for/[prospectSlug] — Prospect demo page (single-step picker + Loom + Calendly)
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
  │     └── Cache MISS → claim __pending__ slot → upload photo → dispatch Inngest event → return 202
  ├── POST /api/try/check — demo cache check (complete/pending/not_found/error)
  ├── POST /api/try/validate-photo — Gemini scene analysis (kitchen detection, surface visibility)
  ├── GET  /api/health/try — health check: demo org + storage buckets. Vercel Cron hits /cron variant hourly, emails hello@withfin.ch on failure.
  ├── GET  /api/cron/instantly-sync — polls Instantly API every 15 min for replies/bounces, syncs to Notion CRM (Contact status + Interaction rows). Cursor-based, idempotent.
  ├── POST /api/pilot-interest — persist lead to pilot_leads + notify hello@withfin.ch (upsert on email+source)
  ├── POST /api/inngest — Inngest serve endpoint (GET/POST/PUT)
  └── Inngest background functions (src/inngest/functions/):
        ├── generate-photo — partial cache fast path OR full pipeline:
        │     Diff cache check is merged into the generate step (saves a step transition).
        │     Fast path: generate (diff check → scoped-edit-needed) → scoped-edit → save-image → track (~7-11s)
        │       Leave-one-out hash overlap query (GIN-indexed) finds cached image
        │       differing by 1 subcategory. Klein 9B scoped edit changes only that surface.
        │       Depth capped at 3 to bound quality degradation.
        │     Full pipeline: generate (diff check miss → BFL Max) → refine (conditional) → save-image → track (~35-46s)
        │       BFL Flux 2 Max via async polling API. Hero photo + up to 7 swatch references.
        │       Two-pass split when >7 swatches: structural surfaces first, fixtures second.
        │       heroImagePath passed via event payload (no re-fetch inside step).
        │     Each step gets its own 120s Vercel function invocation.
        │     Steps pass images via Supabase Storage (not b64 in step output —
        │       Inngest has a step output size limit that b64 images exceed).
        │     Config: retries: 2, concurrency: { limit: 5 }
        └── generate-demo — same merged-step pattern as generate-photo
              Diff cache check merged into generate step (discriminated union return).
              Uses buildEditPrompt (same prompt pipeline as generate-photo)
              Reads swatches from local public/ dir, photos from demo-uploads bucket
              Config: retries: 2, concurrency: { limit: 3 }

Supabase
  ├── Tables: organizations, floorplans, categories,
  │           subcategories (+ generation_hint, generation_rules, generation_rules_when_not_selected, is_appliance),
  │           options (+ generation_rules), steps, step_sections, step_ai_config
  ├── Table: step_photos (multiple photos per step, hero flag, quality check, spatial hints)
  ├── Table: generated_images (cache — step_id, model, step_photo_id, buyer_session_id, selections_fingerprint,
  │           scoped_edit_depth INTEGER, leave_one_out_hashes TEXT[] — partial cache support)
  ├── Table: step_photo_generation_policies (internal-only per-photo prompt/second-pass policy JSON)
  ├── Table: option_floorplan_pricing (per-floorplan price overrides, composite PK: option_id + floorplan_id)
  ├── Table: pilot_leads (name, company, email, phone, source — UNIQUE on email+source, service-role only)
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

**Prospect demo pages** (`/for/[prospectSlug]`):
- Personalized sales pages for outreach. Each prospect is a floorplan in the Demo org with `is_prospect_demo = true`.
- URL: `withfin.ch/for/stylecraft` — the `/for/` prefix avoids collision with org slugs.
- DB columns on `floorplans`: `loom_url`, `calendly_url`, `is_prospect_demo`, `hero_headline`, `hero_body`, `preset_variations`.
- Prospect floorplans filtered from Demo org landing page (`getFloorplansForOrg` uses `.neq("is_prospect_demo", true)`).
- Page layout: SiteNav, hero (cover image + personal greeting), optional Loom embed, **VariationGallery** (pre-generated images in `bg-slate-50` band), single-step UpgradePicker (`hideWizardControls`), Calendly CTA, SiteFooter.
- `preset_variations` JSONB on floorplans: `[{ label, selections (slug-based), imagePath }]`. Server-side resolves imagePath → public URL and computes price. Tapping a card remounts picker with those selections via React key.
- `hideWizardControls` prop on UpgradePicker: hides Finish/Save/Next Step/Clear buttons, hides internal header (prospect pages use SiteNav), suppresses gallery virtual step, removes mobile PriceTracker navigation.
- `MobileStickyFooter` component: reusable sticky bottom bar with expandable preview drawer + two-column action buttons. Used by both `/try` and `/for/` pages.
- Session: auto-creates anonymous buyer session on mount (cookie: `finch_prospect_{slug}`). Required for generation.
- URL validation: `loom_url` must start with `https://www.loom.com/`, `calendly_url` must start with `https://calendly.com/`.
- Setup: grab prospect's room photo from their website, upload to Demo org, create single-step floorplan with kitchen subcategories (slugs, not UUIDs), set spatial hints, photo baseline (natural language description), and per-subcategory spatial hints on the step.
- PostHog events: `prospect_page_viewed` (with `has_presets`), `prospect_variation_selected`, `prospect_loom_loaded`, `prospect_calendly_clicked`.

**Live prospect demo pages:**
| Slug | Name | Prospect | Created |
|------|------|----------|---------|
| `stylecraft` | Stylecraft Homes — The 1651 | Doug French (CEO) | 2026-03-18 |
| `davidson` | Davidson Homes — Hidden Hills | Steve Snoddy (Dir. Sales & Marketing) | 2026-03-23 |
| `mckinley` | McKinley Homes — Towns at Enclave | — | 2026-03-23 |
| `ici` | ICI Homes — Serena at Mosaic | Janna Pettegrew (Design Center Manager) | 2026-03-24 |
| `viera` | Viera Builders — Granada II | Matt Sims (Area Sales Manager) | 2026-03-25 |

**Important gotchas for prospect demo setup:**
- `step_photos.subcategory_ids` must be **slugs** (e.g. `kitchen-cabinet-color`), not UUIDs. The entire selection system keys on slugs.
- `step.sections` JSONB uses `subcategory_ids` (snake_case). The query layer maps to camelCase.
- `photo_baseline` is a **text description** of what's in the photo, not a JSON object.

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
5. **Inngest function** (`generate-photo`): each step gets its own 120s Vercel invocation:
   - `generate` — parallel fetch optionLookup + hero photo + swatches (pre-warmed cache), build prompt via `buildEditPrompt`, call BFL Flux 2 Max (async: submit → poll → download). Partitions selections into structural/fixture groups; if >7 total swatches, runs two sequential Max passes (structural first, fixtures second, 55s poll timeout each). Writes JPEG **directly to `outputPath`** when no refine is planned, otherwise to `mainPassPath` so refine can read it.
   - `refine` — conditional policy second pass (e.g., slide-in range correction via Max). On success, writes refined image directly to `outputPath` and orphans `mainPassPath` in the background. On failure, promotes `mainPassPath` → `outputPath` via server-side `storage.move()` (no byte transfer).
   - `save-image` — just the DB upsert replacing `__pending__`. As soon as this step completes, the polling client sees the final image URL. No file ops in this step — the buffer was already written to `outputPath` by the upstream gen step.
   - `track` — PostHog event (off the critical path; runs after `save-image`).
   - **Scoped edit path** (partial cache): `generate` (diff check → scoped-edit-needed) → `scoped-edit` (Klein 9B, writes directly to `outputPath`, ~7-11s) → `save-image` → `track`. Skipped for appliance add/remove (`-none` option transitions). Scoped edit preserve list includes spatial hints for each preserved surface so Klein 9B knows surface boundaries.
   - Steps pass images via Supabase Storage as JPEG between invocations. Inngest step output size limit prevents b64 transfer.
   - Retries: 2 (3 total attempts). Concurrency limit: 5. No slot release on transient failure — Inngest retries with `__pending__` intact; 5-min stale cleanup handles permanent failures.
   - **Deterministic failures** (`BflContentModerationError`): caught, wrapped in `NonRetriableError` (no retries — same inputs will always fail), row updated to `__failed__` instantly so the client sees failure on the next poll instead of waiting for stale cleanup. Diff cache queries exclude `__failed__` rows so they can't serve as scoped-edit parents.
6. **Client polling**: 202 or 429 response triggers polling `/api/generate/photo/check` every 3s. Poll exits on: `complete` (show image), `not_found` (generation failed — surface retry), `failed` (deterministic failure — surface unavailable-combination overlay), `error` (transient — keep polling), or abort (component unmounted). AbortController per photo key, all aborted on unmount.
7. On refresh: `/api/generate/photo/check` checks per-photo (full derivation mode), restores generated images + IDs
8. Retry → POST `/api/generate/photo` with `retry: true`. Deletes the row for this hash (including `__pending__` — cancel-in-place so an in-flight non-retry gen can't hand back its result via 429→poll), passes `retry: true` through to the Inngest event. `generate-photo.ts` skips `findSingleSurfaceDiffMatch` when retry is true → **always full Flux 2 Max**, never a scoped edit. `leaveOneOutHashes` still written so the new Max image can seed partial cache for future different-selection gens.
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

**Model**: BFL Flux 2. Max for full generation and default scoped edits. Per-option model override via `scoped_edit_model` column (e.g. Flex for backsplash scoped edits, Klein 9B for hex mosaic). Flex supported with `steps` and `guidance` params but not suitable for full gen (warm color cast, poor two-tone cabinet discrimination).

**Shared core**: `src/lib/flux-pipeline.ts` — `fluxGenerate` (full gen, single or two-pass) and `fluxScopedEdit` (single-surface edit). Stateless functions that take buffers in, return buffers out. Both Inngest functions delegate to these.

**Main pipeline** (buyer pages, `/for/` prospect demos):
1. Client POST → `/api/generate/photo` (validates ownership, scopes selections, resolves linked options, computes hash, claims slot)
2. Inngest `generate-photo` function: diff-cache check → `fluxGenerate` → optional second pass (oven correction) → save-image → track
3. Client polls `/api/generate/photo/check` until ready

**Demo pipeline** (`/try`):
1. Client POST → `/api/try/generate` (session cap, upload user photo)
2. Inngest `generate-demo` function: diff-cache check → `fluxGenerate` or `fluxScopedEdit` → save-image → track
3. Client polls `/api/try/check` until ready
4. DB-driven options via `getOptionLookup(DEMO_ORG_ID)` + `createSwatchResolver` — unified with `/for/` prospect demos. `demo-options.ts` deleted. `resolveLinkedOptions` called for "Match to Main" island merge. Subcategory slug: `kitchen-island-cabinet-color` (was `island-cabinet-color` in hardcoded era).

**Two-pass split**: When >7 swatches (BFL Max limit), `fluxGenerate` splits into structural (cabinets, counter, backsplash, floor, paint) → fixtures (hardware, sink, faucet, lighting, appliances) in the same Inngest step. `maxDuration=300` on Inngest route (Vercel Pro + Fluid Compute).

**Scoped edits**: Leave-one-out hash system finds cached images differing by one surface. `fluxScopedEdit` runs a targeted edit (~7-20s vs 35-55s full gen). Depth capped at 3. Model selection: `option.scoped_edit_model` override → range/oven gets Max → default Max. Flex runs at 25 steps for scoped edits (half default, sufficient for single-surface swaps).

**Prompt structure** (Flux-native, ~55-80 words):
```
Apply image 2 to all perimeter cabinets — upper, lower, and appliance-adjacent.
Apply image 3 to island base cabinet panel in the foreground.
Apply image 4 to all countertop surfaces.
Apply image 5 to backsplash wall between countertop and upper cabinets (4x16 subway tiles).
Photorealistic, neutral white balance, natural lighting.
```
No opening sentence, no rules block, no scene block. Each line is "Apply image N to [spatial hint]." Dimensions in parentheses. Paint options get hex alongside swatch (`, exact color #hex`) — keyed off `promptDescriptor` containing "painted". Swatch image is sole appearance authority.

**Scoped edit prompt** (~15-25 words): `Change [surface] to match image 2. Match image 2 exactly.`

**Linked option resolution**: Options with `linked_to_subcategory` (e.g. "Match to Main") are resolved before prompt building. Same swatch → merged into one line covering both zones. Different swatch → kept separate.

**Per-option model selection**: `scoped_edit_model` text column on options. Nullable — defaults to Max when not set. Set via admin UI dropdown (Pro/Klein 9B/Klein 4B/Max/Flex). Demo org backsplash: Flex (subway tiles) and Flex (herringbone). SM backsplash: Klein 9B (hex mosaic, herringbone).

**Cache versioning**: `GENERATION_CACHE_VERSION` (main) and `DEMO_GENERATION_CACHE_VERSION` (demo) in hash inputs. Bump when prompt semantics change.

**Key files**:
- `src/lib/flux-pipeline.ts` — shared Flux generation core
- `src/lib/generate.ts` — prompt builders (`buildEditPrompt`, `buildScopedEditPrompt`), hash functions, context derivation
- `src/lib/bfl.ts` — BFL API client (submit → poll → download)
- `src/inngest/functions/generate-photo.ts` — main pipeline orchestrator
- `src/inngest/functions/generate-demo.ts` — demo pipeline orchestrator
- `src/lib/models.ts` — `IMAGE_MODEL = "flux-2-max"`, `SCOPED_EDIT_MODEL = "flux-2-max"`

**Model history**: gpt-image-1 → Gemini → gpt-image-1.5 → gpt-image-1.5 + Gemini Flash/Pro post-passes → multi-pass pipeline → Flux 2 Max/Pro → **Flux 2 Max/Max + Flex for backsplash scoped edits** (current). OpenAI and Gemini pipelines fully removed. Flex tested for full gen (2026-04-07): good instruction following but warm orange color cast and poor two-tone cabinet discrimination. Not suitable for multi-surface full gen.

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
│   ├── landing-full.tsx            # Homepage content (server component, imported by page.tsx)
│   ├── landing-client.tsx          # Client components: RevealObserver, TrackedLink, RoiCalculator, PilotForm, FaqItem
│   ├── layout.tsx                  # Root layout — Finch branding
│   ├── globals.css
│   ├── vs/
│   │   ├── envision/page.tsx       # /vs/envision comparison page
│   │   └── pdf-option-sheets/page.tsx # /vs/pdf-option-sheets comparison page
│   ├── research/
│   │   └── hidden-revenue-line/
│   │       ├── page.tsx            # SEC filings research report (server component)
│   │       └── chart-client.tsx    # Animated bar charts + page tracker (client component)
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
├── components/
│   ├── SiteNav.tsx            # Shared marketing nav (sticky, mobile hamburger, configurable links + CTA)
│   └── SiteFooter.tsx         # Shared marketing footer (Home, Try It, Pilot, Research, Contact)
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
│   ├── generate.ts          # Prompt construction, buildPromptContextSignature, hashSelections, deriveGenerationContext (shared by generation + check routes)
│   ├── models.ts            # IMAGE_MODEL (gpt-image-1.5), VISION_MODEL (gemini-3-flash-preview)
│   ├── photo-generation-policy.ts # Internal per-photo policy resolver (DB-backed + fallback)
│   └── __fixtures__/
│       ├── generation.ts    # Test fixtures: aiConfig, optionLookup, selections, policies (SM Kinkade patterns)
│       └── supabase-mock.ts # Shared chainable Supabase client mock for route tests
├── inngest/
│   ├── client.ts              # Inngest client singleton + typed event schemas
│   └── functions/
│       ├── generate-photo.ts  # Background photo generation (generate → refine? → save-image → track)
│       └── generate-demo.ts   # Background demo generation (generate → scoped-edit? → save-image → track)
└── types/
    └── index.ts             # Buyer types (slug-based id) + Admin types (UUID id + slug)

scripts/
├── apollo-to-notion.ts      # Apollo CSV → Notion Contacts (dedup, campaign tagging)
├── audit-sm-kinkade.ts      # SM data validation/audit
├── batch-generate.ts        # Batch AI generation (configurable, for 2-pass photos exceeding Vercel timeout)
├── indexnow.ts              # Submit marketing URLs to IndexNow (Bing/Yandex)
├── linkedin-post-finder.ts  # LinkedIn post discovery via ScrapingDog (Cowork automation)
├── resize-swatches.ts       # Swatch image resizing utility
├── seed-demo-cache.ts       # Pre-seed /try demo cache (re-run when DEMO_GENERATION_CACHE_VERSION bumps)
├── seed-new-tenant.ts       # Seed a new builder org with starter structure (9 cats, 15 subcats, 15 defaults, 5 steps)
├── seed-prospect-demo.ts    # Seed prospect demo from JSON config (upload photos, create DB records, generate presets)
└── prospect-configs/        # Per-prospect JSON configs for seed-prospect-demo.ts

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

## Tenant Isolation

**Invariant**: Every org is independently deletable. Dropping any org's rows + its storage prefix leaves every other org fully functional. SM is a real builder tenant; Demo is Finch's internal sandbox (shared by `/try`, `/for/*` prospect pages, and `demo.withfin.ch`). Neither references the other.

**Enforcement (DB level)**:
- `options_swatch_url_contains_org_id` CHECK constraint: any Supabase-hosted `swatch_url` must contain the row's own `org_id` in the exact `/storage/v1/object/(public|sign)/swatches/{org_id}/` segment. Case-insensitive host match. NULL and external CDN URLs pass through. Migration: `supabase/migrations/20260410_options_swatch_url_tenant_isolation.sql`.
- `UNIQUE(org_id, slug)` on categories/subcategories/options prevents id collisions across orgs.
- Supabase Storage bucket RLS on `swatches`: INSERT/UPDATE/DELETE gated by `storage.foldername(name)[1] IN (SELECT org_id FROM org_users WHERE user_id = auth.uid() AND role = 'admin')`. An admin can only write to their own org's prefix, regardless of client-side `orgId` prop.

**Enforcement (runtime)**:
- `scripts/audit-tenant-bleed.ts` — 14 automated checks across every path-bearing text/jsonb column (options, floorplans, step_photos, generated_images, pass_cache, steps, organizations, step_photos.subcategory_ids, steps.sections/spatial_hints jsonb, floorplans.prospect_insights jsonb) plus reverse leaks and cross-org id sharing. Parameterized: `--primary <slug> --other <slug>`. Exits non-zero on any finding. Run before any tenant split operation.
- `scripts/port-sm-swatches-to-demo.ts` — the one-shot port that eliminated pre-existing SM↔Demo coupling (see `completed.md` #36). Kept as reference pattern for future tenant splits.
- `POST /api/internal/bust-cache/[orgSlug]` — CRON_SECRET-authed endpoint that calls `invalidateOrgCache` for any org slug. One call busts every Next.js `unstable_cache` tag for that org (`categories:*`, `floorplans:*`, `org:*`, `admin:categories:*`, `admin:floorplans:*`, `admin:steps-all:*`). Used after any direct-DB mutation that needs to be visible on `/try`, `/for/*`, or `{org}.withfin.ch`.

**Deferred hardening** (not blocking tenant isolation — documented in `memory-bank/project/swatch-storage-contract.md`):
- CHECK constraints on `floorplans.cover_image_path`, `step_photos.image_path`, `generated_images.image_path`, `organizations.logo_url` — audit script covers them, no write-time guard yet
- `DELETE /api/admin/options/[id]` leaks storage bytes on row delete
- `SwatchUpload.tsx` persists `?t=${Date.now()}` cache-buster in the DB row (should be render-only)
- Row-owned hashed identity model for swatches (`{orgId}/swatches/{optionId}-{hash}.{ext}`)

## Analytics

**PostHog** — product analytics + LLM observability.

**Client-side**: `posthog-js` initialized in `PostHogProvider.tsx`. Reverse proxy at `/ingest` via edge API route (`src/app/ingest/[[...path]]/route.ts`) — streams request bodies to PostHog, avoids ad blockers. Previous approach (Next.js `afterFiles` rewrites) silently dropped large POST bodies on Vercel, breaking session recordings. Manual `$pageview` capture, `$pageleave` enabled. `useTrack()` hook for client components (auto-attaches orgSlug, floorplanSlug, sessionId). Buyer sessions identified via `posthog.identify()`.

**Server-side**: `posthog-node` singleton in `src/lib/posthog-server.ts`. `flushAt: 1, flushInterval: 0` for serverless (immediate flush).

**LLM Analytics**: All AI calls emit `$ai_generation` events with PostHog's standard `$ai_*` properties (`$ai_provider`, `$ai_model`, `$ai_latency`, `$ai_input_tokens`, `$ai_output_tokens`, `$ai_input_cost_usd`, `$ai_output_cost_usd`, `$ai_total_cost_usd`, `$ai_is_error`). Custom Finch properties (orgSlug, route, second_pass, etc.) are spread alongside.
- `captureAiEvent()` — success events (6 call sites: generate-photo, generate-demo, validate-photo, spatial-hint, photo-check, generate-descriptor)
- `captureAiError()` — failure events with `$ai_is_error: true`, `$ai_error: message`, zero cost. Inngest functions capture + re-throw (preserves retries). API routes capture in existing catch blocks.
- Cost split: OpenAI image gen = all output cost (flat per-image). Gemini = independently computed input/output from token counts.
- Org grouping: `groups: { org: orgSlug }` matches client-side `posthog.group()`.

## Performance Considerations

- Image generation: 10-30s depending on complexity
- Pre-cached combos: ~200ms (Supabase Storage CDN)
- Show skeleton/progress indicator during generation
- Guided first experience targets a pre-cached combo for instant wow

## Why Setup Is the Moat

AI visualization isn't plug-and-play. Each builder needs:
1. **Base photos** — high-quality, properly framed shots of the actual model home
2. **Spatial labels** — tell the AI where things are (without these, layouts hallucinate)
3. **Prompt descriptors** — hand-tuned phrases per visual option (generic names → generic results)
4. **Photo baselines** — what's already in the photo so the AI doesn't re-describe it
5. **Swatch targeting** — which options send images vs text-only (too many overwhelms the model)

This setup work is what makes output actually good. Self-serve requires tooling for each step.

## Two Business Models

### Model A: Setup Service (Now)
Builder sends pricing PDF + model home photos + brand assets. We deliver a fully configured picker. Revenue: setup fee + monthly SaaS.

### Model B: Self-Serve (Future)
Builder onboards through admin panel: upload pricing data, upload photos, system generates descriptors (AI-assisted, human-reviewed). Revenue: monthly SaaS, tiered by floorplans/generations.

## Open Questions

- **Photo shooting service**: Offer to shoot model homes, or provide a shot guide?
- **Swatch sourcing at scale**: Manufacturer CDNs, builder uploads, or shared catalog?
- **CRM integration**: Which CRMs do regional builders use? (BuilderLinq, Lasso, custom)
- **Analytics depth**: Beyond "most popular upgrades" — price sensitivity signals from viewed-but-not-selected?
