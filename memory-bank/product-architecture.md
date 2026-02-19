# Product Architecture: Multi-Tenant Upgrade Visualizer

## Context

The Stone Martin demo proved the concept. This doc plans the transition from single-tenant demo to multi-tenant product. Two service models: **setup service** (we onboard each builder) and eventually **self-serve** (builders onboard themselves).

---

## The Core Problem: Why This Can't Be Plug-and-Play (Yet)

AI visualization isn't magic — it requires careful setup:

1. **Base photos** need to be high-quality, properly framed shots of the actual model home
2. **Spatial labels** tell the AI where things are ("range sits in a cutout between cabinets", "fridge in alcove on right wall") — without these, the AI hallucinates layouts
3. **Prompt descriptors** are hand-tuned phrases for each visual option ("Calacatta Venice quartz with dramatic gray and gold veining on a white base") — generic names produce generic results
4. **Photo baselines** tell the system what's already in the photo so it doesn't re-describe unchanged options
5. **High-impact IDs** control which options send swatch images vs text-only — too many images overwhelms the model, too few loses fidelity

This setup work is the moat. It's what makes the output actually good. Self-serve is possible but requires building tooling that makes each of these steps accessible to non-technical users.

---

## Two Business Models

### Model A: Setup Service (Now)
We do everything. Builder sends us:
- Pricing PDF (or spreadsheet)
- Model home photos (we may shoot these ourselves or guide them)
- Brand assets (logo, colors)

We deliver:
- Fully configured upgrade picker at `{builder-slug}.upgradeviz.com` (or similar)
- Pre-generated key combos for instant demo
- Ongoing: update prices when they change, add new floorplans

**Revenue**: Setup fee + monthly SaaS (or per-floorplan pricing)

### Model B: Self-Serve (Future)
Builder onboards through an admin panel:
- Upload pricing data (CSV/spreadsheet import or manual entry)
- Upload base photos per room
- We provide tooling to annotate photos (spatial regions, baseline labels)
- System generates prompt descriptors from option names (AI-assisted, human-reviewed)
- Builder configures steps/wizard flow

**Revenue**: Monthly SaaS, tiered by floorplans/generations

### What Changes Between Models
| Concern | Setup Service | Self-Serve |
|---------|--------------|-----------|
| Data entry | Us (manual) | Builder (admin UI) |
| Photo shooting | Us or guided | Builder uploads |
| Spatial labeling | Us (in code/config) | Annotation tool |
| Prompt descriptors | Us (hand-tuned) | AI-generated + review |
| Photo baselines | Us (manual) | Semi-automated |
| Step/wizard config | Us (per builder) | Template + customization |
| Swatch sourcing | Us (scraping/manual) | Builder uploads or URL |

---

## Multi-Tenancy Strategy

### Single Supabase, Row-Level Security

**One Supabase project for all tenants.** Not one per builder.

Why:
- Simpler ops — one database to manage, migrate, back up
- Shared infrastructure keeps costs low at small scale
- RLS (Row-Level Security) is built for this — every table gets an `org_id` column, policies enforce isolation
- Central admin can query across all orgs
- Supabase Storage uses org-scoped prefixes: `/{org_id}/rooms/`, `/{org_id}/swatches/`, `/{org_id}/generated/`

When to reconsider:
- If a builder needs data residency guarantees (unlikely for home upgrades)
- If a single builder generates so much traffic they need isolation (cross that bridge later)
- If we hit Supabase plan limits on storage/bandwidth (upgrade plan first, split later)

### Tenant Isolation

```
All tables have: org_id (uuid, NOT NULL, FK → organizations)
RLS policies:  SELECT/INSERT/UPDATE/DELETE WHERE org_id = auth.jwt() ->> 'org_id'
Central admin: service_role key bypasses RLS for cross-org operations
```

---

## Data Model

### Current → Product Evolution

| Current (Demo) | Product |
|----------------|---------|
| Static TypeScript (`options-data.ts`) | `options` table in Supabase |
| `step-config.ts` hardcoded | `steps` + `step_sections` tables |
| Photos in `/public/rooms/` | Supabase Storage per org |
| Swatches in `/public/swatches/` | Supabase Storage per org (or shared catalog) |
| Single implicit "account" | `organizations` table |
| No floorplan concept | `floorplans` table per org |
| `generated_images` table (flat) | `generated_images` scoped by org + floorplan |

### Entity Relationship

```
organizations
  ├── floorplans                    (Kinkade, McClain, etc.)
  │     ├── steps                   (Set Your Style, Design Your Kitchen, etc.)
  │     │     ├── step_sections     (Cabinets, Flooring, etc.)
  │     │     ├── step_photo        (base room photo + spatial hints + baselines)
  │     │     └── step_high_impacts (which subcategories send swatch images)
  │     └── generated_images        (cached AI outputs)
  │
  ├── categories                    (APPLIANCES, CABINETS, etc.)
  │     └── subcategories           (Cabinet Style, Kitchen Color, etc.)
  │           └── options            (Fairmont, Meridian, Oxford, etc.)
  │
  ├── swatch_images                 (uploaded or scraped)
  ├── branding                      (logo, colors, fonts)
  └── users                         (admin users for this org)
```

### Key Tables

```sql
-- Tenant
organizations (
  id uuid PK,
  name text,                        -- "Stone Martin Builders"
  slug text UNIQUE,                 -- "stone-martin" → subdomain or URL path
  logo_url text,
  primary_color text,               -- hex, for theming
  secondary_color text,
  created_at timestamptz
)

-- Floorplans (an org can have many)
floorplans (
  id uuid PK,
  org_id uuid FK → organizations,
  name text,                        -- "Kinkade"
  community text,                   -- "McClain Landing Phase 7"
  price_sheet_label text,           -- "Valid through 2/12/2026"
  is_active boolean DEFAULT true,
  created_at timestamptz
)

-- Categories (per org — different builders have different upgrade categories)
categories (
  id uuid PK,
  org_id uuid FK → organizations,
  name text,                        -- "CABINETS"
  sort_order int
)

-- Subcategories
subcategories (
  id uuid PK,
  category_id uuid FK → categories,
  org_id uuid FK → organizations,
  name text,                        -- "Kitchen Cabinet Color"
  slug text,                        -- "kitchen-cabinet-color"
  is_visual boolean DEFAULT false,
  is_additive boolean DEFAULT false,
  unit_label text,                  -- "outlet", "pack"
  max_quantity int,
  sort_order int
)

-- Options
options (
  id uuid PK,
  subcategory_id uuid FK → subcategories,
  org_id uuid FK → organizations,
  name text,                        -- "Oxford"
  price decimal(10,2),
  prompt_descriptor text,           -- "Oxford shaker-style cabinet doors..."
  swatch_url text,                  -- URL in Supabase Storage
  swatch_color text,                -- hex fallback
  nudge text,                       -- "Most popular"
  is_default boolean DEFAULT false, -- pre-selected ($0 included option)
  sort_order int
)

-- Steps (per floorplan — different floorplans may have different room layouts)
steps (
  id uuid PK,
  floorplan_id uuid FK → floorplans,
  org_id uuid FK → organizations,
  number int,
  name text,                        -- "Design Your Kitchen"
  subtitle text,
  hero_image_url text,              -- base room photo in Storage
  hero_variant text,                -- "full" | "compact" | "split" | "none"
  show_generate_button boolean,
  sort_order int
)

-- Step sections (which subcategories appear in which step, grouped)
step_sections (
  id uuid PK,
  step_id uuid FK → steps,
  title text,                       -- "Surfaces"
  subcategory_ids text[],           -- ordered array of subcategory slugs
  sort_order int
)

-- Spatial hints for AI generation (per step)
step_ai_config (
  id uuid PK,
  step_id uuid FK → steps,
  spatial_hints text,               -- "Range sits in cutout between cabinets..."
  photo_baseline jsonb,             -- {"backsplash": "bs-baker-herringbone-warm-grey", ...}
  high_impact_ids text[],           -- subcategory slugs that send swatch images
  also_include_ids text[],          -- subcategories from other steps visible in this photo
  prompt_template text              -- override default prompt pattern if needed
)

-- Generated images cache (same as now, but scoped)
generated_images (
  id uuid PK,
  org_id uuid FK → organizations,
  floorplan_id uuid FK → floorplans,
  step_id uuid FK → steps,
  selections_hash text,
  selections_json jsonb,
  image_path text,
  model text,                       -- "gpt-image-1.5", "gpt-5.2"
  prompt text,
  created_at timestamptz,
  UNIQUE(selections_hash, step_id)
)

-- Buyer sessions (optional — track selections per buyer visit)
buyer_sessions (
  id uuid PK,
  org_id uuid FK → organizations,
  floorplan_id uuid FK → floorplans,
  buyer_id text,                    -- anonymous ID or linked to CRM
  selections jsonb,
  quantities jsonb,
  total_price decimal(10,2),
  created_at timestamptz,
  updated_at timestamptz
)
```

---

## URL Structure

### Buyer-Facing
```
upgradeviz.com/{org-slug}/{floorplan-slug}
  → Full upgrade picker for that floorplan

Example:
upgradeviz.com/stone-martin/kinkade
upgradeviz.com/stone-martin/mcclain
upgradeviz.com/oak-haven/sycamore
```

### Admin
```
upgradeviz.com/admin                    → Central admin (us) — all orgs
upgradeviz.com/admin/{org-slug}         → Builder admin — their org only
upgradeviz.com/admin/{org-slug}/floorplans
upgradeviz.com/admin/{org-slug}/upgrades
upgradeviz.com/admin/{org-slug}/photos
upgradeviz.com/admin/{org-slug}/analytics
```

---

## Three User Roles

### 1. Central Admin (Us)
- Create/manage organizations
- Onboard new builders (setup service path)
- Configure AI settings, spatial labels, prompt descriptors
- View all orgs, all analytics
- Access: service_role or superadmin JWT

### 2. Builder Admin (Builder's Team)
- Manage their own upgrades: add/remove options, edit prices
- Upload swatch images
- View buyer session analytics
- Cannot change AI config (setup service) or can change it (self-serve)
- Access: org-scoped JWT via Supabase Auth

### 3. Buyer (Homebuyer)
- Browse upgrade picker, make selections
- Generate AI visualizations
- Download/print summary
- No auth required (anonymous session with buyer_id cookie)

---

## What Stays the Same

The buyer-facing UI barely changes. The step wizard, swatch grids, AI generation flow, price tracker — all that works. The difference is where the data comes from:

| Now | Product |
|-----|---------|
| `import { categories } from '@/lib/options-data'` | `const { data } = await supabase.from('categories').select('*, subcategories(*, options(*))').eq('org_id', orgId)` |
| `import { steps } from '@/lib/step-config'` | `const { data } = await supabase.from('steps').select('*, step_sections(*), step_ai_config(*)').eq('floorplan_id', floorplanId)` |
| `/public/rooms/kitchen-close.webp` | `supabase.storage.from('rooms').getPublicUrl(step.hero_image_url)` |
| Hardcoded branding | `const { data: org } = await supabase.from('organizations').select('*').eq('slug', params.orgSlug)` |

The component architecture (UpgradePicker, SidebarPanel, SwatchGrid, etc.) is reusable. It just needs to accept data as props instead of importing static files.

---

## Admin UI: What We Need to Build

### Central Admin Dashboard
- List all organizations (name, slug, active floorplans, last activity)
- Create new organization (name, slug, logo, colors)
- Drill into any org → see their admin view

### Builder Admin: Upgrades Management
- **Category/SubCategory/Option CRUD** — tree view
  - Add/edit/delete categories, subcategories, options
  - Edit prices inline (spreadsheet-feel)
  - Toggle isVisual, isAdditive flags
  - Upload swatch images per option
  - Edit prompt descriptors (with AI-assist: "Generate from name" button)
  - Set nudge text
  - Mark defaults (included options)
  - Bulk import from CSV/spreadsheet
- **Floorplan Management**
  - Create floorplan (name, community)
  - Configure steps (add/remove/reorder)
  - Upload base room photos per step
  - Configure step sections (drag subcategories into sections)
- **Photo & AI Config** (setup service: us only; self-serve: builder too)
  - Spatial hint editor per step photo
  - Photo baseline picker (select what's already in the photo)
  - High-impact toggle per subcategory per step
  - Prompt template override
- **Analytics** (future)
  - Most viewed options
  - Most generated combos
  - Average upgrade total
  - Conversion funnel (if we add CRM integration)

---

## Migration Path: Demo → Product

### Phase 1: Database-Backed Data (Keep Single Tenant)
Move Stone Martin data from TypeScript to Supabase tables. Keep the same UI. Prove the data layer works.
- Create all tables above
- Write a migration script that reads `options-data.ts` + `step-config.ts` and inserts into Supabase
- Update the picker to fetch from Supabase instead of importing static data
- Update `/api/generate` to read step_ai_config from DB

### Phase 2: Multi-Tenant Routing
- Add `organizations` + `floorplans` tables
- Dynamic routing: `/{org-slug}/{floorplan-slug}`
- Org-scoped theming (logo, colors)
- RLS policies on all tables

### Phase 3: Central Admin
- Build the central admin dashboard
- Org CRUD, floorplan CRUD
- Ability to onboard a new builder by entering their data through the admin UI (replaces editing TypeScript)

### Phase 4: Builder Admin
- Supabase Auth for builder users
- Builder-scoped admin views
- Upgrade CRUD (prices, options, swatches)
- Analytics dashboard

### Phase 5: Self-Serve Tooling (Future)
- CSV/spreadsheet bulk import for upgrades
- Photo upload with guided annotation workflow
- AI-assisted prompt descriptor generation
- Step wizard template builder
- Onboarding flow for new builders

---

## Shared Upgrade Catalog (Future Consideration)

Many builders use the same products (GE appliances, Calacatta quartz, etc.). A shared catalog could:
- Pre-populate options with prompt descriptors already tuned
- Share swatch images across orgs
- Let builders "pick from catalog" instead of entering from scratch

Structure:
```
catalog_options (shared, no org_id)
  → builder clones into their own options table with custom pricing
  → prompt_descriptor, swatch_url inherited but overridable
```

Not needed for setup service model. Worth building when self-serve launches.

---

## Open Questions

1. **Domain strategy**: Subdomains (`stone-martin.upgradeviz.com`) vs paths (`upgradeviz.com/stone-martin`)? Paths are simpler (no wildcard DNS/SSL). Subdomains feel more premium.

2. **Pricing model**: Per-floorplan? Per-generation? Flat monthly? Need to figure out unit economics — gpt-image-1.5 costs ~$0.10-0.20 per generation.

3. **Photo shooting service**: Do we offer to shoot the model home? Or provide a shot guide ("take a photo from this angle, at this height, with these lights on")?

4. **Swatch image sourcing**: Scraping per-builder isn't scalable. Manufacturers often have product image CDNs. Or builders upload their own. Or we build a shared catalog.

5. **Offline / PDF export**: Buyers want to take their selections home. Current `window.print()` works but a proper PDF with room images + itemized pricing would be more polished.

6. **CRM integration**: Builders want buyer selections to flow into their sales pipeline. Which CRMs do regional builders use? BuilderLinq? Lasso? Custom?

7. **Analytics depth**: What do builders actually want to see? "Most popular upgrades" is obvious. "Which upgrades are viewed but not selected" (price sensitivity signals) could be valuable.

8. **Rate limiting / cost control**: Per-org generation limits? Budget caps? Alert when an org hits X generations/month?

---

## Tech Stack Changes

| Current | Product | Why |
|---------|---------|-----|
| Static TS data | Supabase DB | Dynamic, multi-tenant |
| `/public/` images | Supabase Storage | Per-org isolation, CDN |
| No auth | Supabase Auth | Builder admin login |
| Single Next.js app | Same, with dynamic routes | Keep it simple |
| No analytics | PostHog (MCP ready) | Track usage per org |
| Manual deploys | Vercel (same) | No change needed |

Framework stays Next.js. Database stays Supabase. AI stays OpenAI. The shift is from hardcoded → database-driven.
