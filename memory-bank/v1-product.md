# Finch V1 Product Spec

The SM demo proved the concept. The multi-tenant DB is in place. V1 is the product that builders actually use day-to-day: they manage their own options, buyers pick upgrades and save selections, and the visualization experience is better than the linear step wizard.

---

## 1. Builder Admin: Option Management

Builders need to add, edit, organize, and delete upgrade options without calling us. This is the core self-serve surface.

### Option CRUD

Each option has:
- **Name** (required)
- **Description** (optional — rich text or plain, for options where a photo isn't available)
- **Price** (required, decimal — $0 means "included in base")
- **Photo/swatch** (optional — upload image or provide URL)
- **Swatch color** (optional hex fallback when no photo)
- **Prompt descriptor** (optional — AI-generated from name+description if blank, builder can edit)
- **Nudge text** (optional — social proof like "Most popular")
- **Is default** (boolean — pre-selected $0 option)
- **Sort order** (drag to reorder)

### Organization: Categories → Subcategories → Options

Keep the three-level hierarchy. Builder manages it as a tree:
- **Add/rename/delete/reorder** categories (CABINETS, COUNTERTOPS, etc.)
- **Add/rename/delete/reorder** subcategories within a category
- **Add/edit/delete/reorder** options within a subcategory
- Inline price editing (spreadsheet feel — click a price, type, tab to next)

### Scoping: Which Floorplans? Which Rooms?

Not every option applies to every floorplan or every room. Two scoping mechanisms:

**Floorplan scoping (implemented):**
- By default, an option applies to ALL active floorplans for that org
- Builder can restrict an option (or subcategory, or category) to specific floorplans
- Use case: "The Kinkade has a fireplace, the McClain doesn't — fireplace options only apply to Kinkade"
- Implementation: `category_floorplan_scope` junction table for categories + `floorplan_ids` uuid array columns on subcategories and options (simpler than 3 junction tables; empty array = all floorplans)
- Filtering: categories use junction table check, subcategories/options filter by `floorplan_ids` array (empty = show everywhere)
- Scope API validates floorplan_ids belong to the org before writing

**Room/step scoping:**
- Subcategories are assigned to steps (rooms) via `step_sections` — this already exists
- A subcategory like "Kitchen Cabinet Color" lives in the Kitchen step
- A subcategory like "Cabinet Style Whole House" might appear in multiple steps
- Builder configures this in the floorplan step editor (see Section 2)

### Bulk Operations

- **CSV import (V1.1)**: Upload a spreadsheet of options (name, price, category, subcategory). We parse, preview, builder confirms. Good for initial load from pricing PDFs.
- **Bulk price update**: Select multiple options → apply % increase or flat adjustment. Builders update pricing sheets quarterly.


## 2. Floorplan & Photo Management

### Adding a Floorplan

Builder creates a floorplan with:
- **Name** (required — "Kinkade", "The Sycamore")
- **Community** (optional — "McClain Landing Phase 7")
- **Price sheet label** (optional — "Valid through 3/15/2026")
- **Active toggle** (hide from buyers without deleting)

### Step/Room Configuration

Each floorplan has steps (rooms). Builder can:
- **Add/remove/reorder steps** (Kitchen, Primary Bath, Secondary Spaces, etc.)
- **Name each step** ("Design Your Kitchen")
- **Assign subcategories** to each step (drag from available pool into step sections)
- **Group subcategories** into sections within a step ("Surfaces", "Fixtures", "Appliances")

### Photo Upload

Each step can have one or more room photos. For each photo:
- **Upload** (drag-and-drop or file picker)
- **Label** ("Kitchen wide shot", "Kitchen detail — island")
- **Set as hero** (the main photo shown in the step)

**Photo requirements enforced on upload:**
- Minimum resolution: 1024x1024 (AI generation minimum)
- Max file size: 20MB
- Accepted formats: JPG, PNG, WebP

### Automated Photo Quality Check

On upload, we run the photo through a vision model (Gemini Flash, current generation) that evaluates:
- **Lighting**: Is the room well-lit? Flag dark/shadowy photos
- **Resolution/clarity**: Is it sharp enough for AI editing? Flag blurry shots
- **Framing**: Is it a reasonable interior shot? Flag extreme angles, partial rooms, obstructions
- **Content**: Does it look like the room type the builder labeled it as?

**Output**: Pass/warn/fail with specific feedback.
- **Pass**: "Good to go. Well-lit, clear, good framing."
- **Warn**: "Usable, but the right side is dark — AI results may be inconsistent in that area. Consider retaking with more light." Builder can proceed anyway.
- **Fail**: "Resolution too low for AI generation. Please upload a higher-resolution photo." Block upload.

The checker does NOT block warns — it flags and lets the builder decide. Only hard fails (resolution, format) are blocked.

### AI Configuration (Per Photo)

For each room photo, the system needs metadata for good AI generation. V1 approach: **we handle this during onboarding for Pro builders, builders on Starter get AI-assisted defaults.**

- **Spatial hints**: Text describing the room layout ("Range in cutout between upper/lower cabinets, fridge in alcove on right, sink under window")
- **Photo baseline**: What materials are already visible in the photo (so the AI knows what to change vs. keep)
- **High-impact subcategories**: Which options send swatch images to the AI vs. text-only descriptions

For Starter (self-serve):
- Auto-generate spatial hints from photo using vision model ("Describe the layout of this kitchen photo for an image editing AI")
- Builder reviews and edits
- High-impact defaults based on category (countertops, cabinet color, backsplash always send swatches)
- Text helper model for descriptors/hints uses a Gemini thinking-class model (exact model can change without changing product behavior).

---

## 3. Buyer Experience

### How Buyers Access the Tool

Builder shares a link: `{org-slug}.withfin.ch/{floorplan-slug}`

Subdomain-per-org routing. Each builder gets their own subdomain — feels like their own tool, not a shared platform.

No login required to browse and select options. The tool works anonymously.

### Saving Selections

When a buyer wants to save their progress:
1. **"Save My Selections"** button prompts for email
2. On submit, we save immediately to a buyer session keyed by that email + floorplan/org (no verification step)
3. We send a **resume link** to that email for convenience
4. Buyer can close the browser and return later via the resume link (or by entering the same email in the tool)
5. Subsequent visits: "Welcome back" with their saved selections restored

**No passwords.** No buyer auth account in V1. Buyers aren't power users — they visit 2-5 times total. Passwords are friction.

### What the Builder Sees

Builder dashboard shows saved buyer sessions:
- Buyer email (or "Anonymous" if not saved)
- Floorplan
- Selections summary (top-line: total price, number of upgrades selected)
- Last active timestamp
- Any generated images

**Builder can view** a buyer's selections in read-only mode — sees exactly what the buyer sees, including any generated visualizations.

**Builder cannot edit** buyer selections. The buyer owns their picks. Builder can message/call the buyer to discuss.

### Session Lifecycle

```
Anonymous browsing → picks options → prompted to save
  ↓ enters email
Selections saved immediately under that email
  ↓
Buyer returns via resume link or enters same email → selections restored
  ↓
Buyer "submits" / "I'm done" → builder gets notified
  ↓
Design center appointment — builder has full context
```

### Buyer Notifications

- **Save confirmation email**: "Your selections are saved. Here's your link to come back."
- **Builder notification**: When a buyer saves or submits, builder admin gets an email/dashboard notification with a link to view that buyer's session.

---

## 4. Branding

### Philosophy: Minimal on Our End

We're not building a white-label website builder. Builders get enough customization to feel like it's "theirs" without us maintaining a theme engine.

### What Builders Can Customize

- **Logo** (upload, displayed in header)
- **Primary color** (hex — used for buttons, active states, accents)
- **Secondary color** (hex — used for hover states, secondary buttons)
- **Accent color** (hex — used sparingly for highlights)
- **Corner style** (sharp or rounded — toggle). Default: sharp. Some builders may want rounded.
- **Header background** (light or dark — toggle). Affects logo display and nav contrast.

### What We Control

- **Typography**: System font stack. No custom font uploads. Keeps things fast and consistent.
- **Layout**: Fixed. Step wizard, sidebar, swatch grids. Builders don't rearrange components.
- **Spacing, sizing**: Fixed. We maintain visual quality by not letting builders break the layout.
- **Footer**: "Powered by Finch" with link. Always present. (Removable at premium tier if we ever want that lever.)

### Implementation

Already partially built: org table has `primary_color`, `secondary_color`, `accent_color`, `logo_url`. CSS custom properties apply them. Add:
- `corner_style` enum ('sharp' | 'rounded') on organizations table
- `header_style` enum ('light' | 'dark') on organizations table
- Conditional Tailwind class application based on org settings

Keep the branding surface small. Every option we add is an option we maintain.

---

## 5. Visualization Experience: The Gallery Rethink

### Problem with Current Linear Flow

The SM demo is a 5-step wizard. You pick options step by step, and there's one "Visualize My Kitchen" button that generates a single kitchen image from all visual selections.

This was fine for a demo. For a real product:
- Buyers want to see their selections in **multiple room photos** (kitchen wide, kitchen detail, bathroom, etc.)
- The linear wizard forces you to pick everything before seeing anything
- One image isn't enough — buyers want to see the countertop in the kitchen AND the bathroom vanity in the bathroom

### V1 Approach: Hybrid — Pick Options, Then Visualize Any Room

**Selection flow** stays step-based (it's a good way to organize 100+ options). But visualization becomes a **separate, on-demand action per photo**.

#### How It Works

1. Buyer goes through steps picking options (same as now — step wizard, swatch grids, price tracker)
2. Each step that has room photos shows a thumbnail gallery of available photos
3. Buyer can tap any photo thumbnail to "Visualize" it with their current selections
4. The AI generates that specific photo with the relevant selections applied
5. Generated images appear in a **gallery** accessible from any step
6. **Final step: "Review & Visualize"** — shows all room photos as a grid. Buyer can generate any they haven't yet, or regenerate ones where they've changed selections since.

#### Key UX Details

- **"Visualize" button per photo**, not per step. A kitchen step might have 2 photos (wide + detail). Buyer can generate either or both.
- **Visual indicator** when selections have changed since last generation (stale badge). Buyer sees "Your countertop selection changed — regenerate?"
- **Generated images persist** in gallery. Buyer builds up a collection of visualized rooms as they go.
- **Progress isn't blocked** by generation. Buyer can keep picking options while images generate in background.
- **Gallery view**: Accessible from sidebar or as final step. Grid of all room photos — base photo with "Visualize" overlay if not yet generated, generated image if done. Click to enlarge.
- **Thumbs up/down on generated images**. Thumbs down removes the image and frees up a generation credit to retry. Thumbs up keeps it. This gives us a quality signal per photo/selection combo — over time we learn which spatial hints and prompt descriptors produce good results and which need tuning. Builder admin can see thumbs-down rate per room photo as an early warning that a photo or its AI config needs work.

#### Generation Strategy & Cost Control

Each AI generation costs ~$0.04-0.15. Buyers generating every photo with every selection change would burn through credits fast.

**Controls:**
- **Per-buyer generation cap**: e.g., 20 generations per session. After that: "You've used your visualization credits. Save your selections to continue." (Soft cap — builder can configure.)
- **Stale detection**: Only re-generate a photo if visual selections relevant to that photo have changed. If the buyer changed a bathroom option, the kitchen image is still valid.
- **Smart batching**: If buyer hits "Visualize All" on the final step, we batch all pending photos into parallel requests. Fast, but expensive. Show the cost to the builder in their dashboard ("This session used 8 generations").
- **Pre-cache where possible**: Common combinations (default selections, most popular picks) are pre-generated. Buyer gets instant results for popular combos, generation only for unique picks.

#### What "Visualize All" Looks Like

Final review step:
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Kitchen     │  │  Kitchen     │  │  Primary     │
│  (wide)      │  │  (detail)    │  │  Bath        │
│  [Generated] │  │  [Generate]  │  │  [Generate]  │
└─────────────┘  └─────────────┘  └─────────────┘
┌─────────────┐  ┌─────────────┐
│  Secondary   │  │  Powder      │
│  Bath        │  │  Room        │
│  [Generate]  │  │  [Generate]  │
└─────────────┘  └─────────────┘

        [ Visualize All Remaining ]
```

Buyer taps individual photos or "Visualize All" to batch generate everything.

---

## 6. What's NOT in V1

Keeping scope tight. These are explicitly deferred:

- **CSV/spreadsheet bulk import** — V1 is manual entry + AI-assisted descriptors. Bulk import is V1.1.
- **Shared upgrade catalog** — Each builder enters their own options. Shared catalog is a scale play.
- **CRM integration** — Buyer sessions are visible in dashboard, but no Salesforce/Lasso push.
- **PDF export** — Keep `window.print()` for now. Proper styled PDF is nice-to-have.
- **Analytics dashboard** — Basic session counts in builder dashboard. Deep analytics (most viewed options, conversion funnel) is V2.
- **Custom step wizard layouts** — Fixed layout. Builders can't rearrange components.
- **Builder-selectable AI models** — V1 uses fixed internal model choices (Gemini Pro, current generation for generation, Gemini Flash, current generation for checks, Gemini thinking model for text helpers). Builders do not choose models.
- **Buyer accounts beyond email capture** — No password auth, no social login, no buyer profiles.
- **Real-time collaboration** — Buyer and designer can't co-browse simultaneously.

---

## 7. Data Model Changes for V1

### New Tables

```sql
-- Saved buyer sessions (replaces anonymous buyer_sessions)
buyer_selections (
  id uuid PK,
  org_id uuid FK,
  floorplan_id uuid FK,
  buyer_email text,        -- provided by buyer at save time (not verified in V1)
  resume_token text UNIQUE, -- opaque token for one-click resume email links
  selections jsonb,        -- {subcategory_slug: option_id, ...}
  quantities jsonb,        -- {subcategory_slug: quantity, ...}
  total_price decimal(10,2),
  generation_count int DEFAULT 0,  -- number of generations used in this session
  status text DEFAULT 'in_progress',  -- in_progress | submitted
  submitted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)

-- Floorplan scoping (implemented — simpler than original 3-table spec)
category_floorplan_scope (
  category_id uuid FK → categories ON DELETE CASCADE,
  floorplan_id uuid FK → floorplans ON DELETE CASCADE,
  PRIMARY KEY (category_id, floorplan_id)
)
-- If no rows for a category → applies to all floorplans

-- Subcategories and options use floorplan_ids array columns instead of junction tables:
-- subcategories.floorplan_ids uuid[] DEFAULT '{}'  -- empty = all floorplans
-- options.floorplan_ids uuid[] DEFAULT '{}'         -- empty = all floorplans
-- This is simpler and sufficient for V1. Can migrate to junction tables if needed.
```

### Modified Tables

```sql
-- organizations: add branding fields
ALTER TABLE organizations ADD COLUMN corner_style text DEFAULT 'sharp';  -- 'sharp' | 'rounded'
ALTER TABLE organizations ADD COLUMN header_style text DEFAULT 'light';  -- 'light' | 'dark'
ALTER TABLE organizations ADD COLUMN generation_cap_per_session int DEFAULT 20;

-- steps: support multiple photos per step
-- Move hero_image_url to a new step_photos table
step_photos (
  id uuid PK,
  step_id uuid FK → steps,
  org_id uuid FK,
  image_url text,          -- Supabase Storage path
  label text,              -- "Kitchen wide shot"
  is_hero boolean DEFAULT false,
  sort_order int,
  check_result text,       -- pass | warn | fail
  check_feedback text,     -- human-readable explanation
  check_raw_response jsonb, -- full model response for debugging
  checked_at timestamptz,
  spatial_hint text,       -- builder-editable AI hint
  photo_baseline text      -- what exists in base photo
)

-- generated_images: link to step_photos instead of just steps
ALTER TABLE generated_images ADD COLUMN step_photo_id uuid FK → step_photos;
ALTER TABLE generated_images ADD COLUMN selections_fingerprint text; -- for stale detection
ALTER TABLE generated_images ADD COLUMN feedback_vote smallint; -- -1 thumbs down, +1 thumbs up
ALTER TABLE generated_images ADD COLUMN feedback_at timestamptz;
ALTER TABLE generated_images ADD COLUMN credit_refunded boolean DEFAULT false;
ALTER TABLE generated_images ADD COLUMN generation_cost_usd decimal(10,4);
```

---

## 8. Builder Admin Routes

```
/admin/{org-slug}
  /options                  — Category/subcategory/option tree editor
  /options/import           — CSV import (V1.1)
  /floorplans               — List floorplans, add new
  /floorplans/{id}          — Edit floorplan: steps, photos, sections
  /floorplans/{id}/photos   — Photo upload + quality check
  /buyers                   — Saved buyer sessions list
  /buyers/{id}              — View a buyer's selections (read-only)
  /settings                 — Branding (logo, colors, corner style)
```

---

## 9. Implementation Workstreams

### Workstream A: Builder Admin — Auth, RLS, Option Management ✅ COMPLETE
**The unlock: builders stop calling us to change a price.**

1. ✅ Admin auth (Supabase Auth email/password, `org_users` join table, `@supabase/ssr` for SSR+browser)
2. ✅ RLS policies on all tables (service role bypasses for buyer-facing; user-scoped for admin)
3. ✅ Category/subcategory/option tree UI (CRUD, drag reorder via dnd-kit, inline price edit)
4. ✅ Floorplan scoping (category junction table + `floorplan_ids` array columns on sub/opt + scope popover UI)
5. ✅ AI prompt descriptor generation (Gemini Flash, name + description → visual phrase)
6. ✅ Swatch/photo upload per option (Supabase Storage, org-scoped paths)
7. ✅ UUID PKs on categories/subcategories/options (slug column for buyer-facing, `UNIQUE(org_id, slug)`)
8. ✅ Security: auth on all admin API routes, floorplan org validation, verified storage deletes, 404 error semantics

**Key design decision**: Buyer-facing types (`Option.id`, `SubCategory.id`, `Category.id`) hold the **slug** — queries select `slug` and map to `id` field. Admin types hold **UUID** `id` + `slug`. Zero changes to buyer-facing code, selection state, generation logic, invariant rules, or step configs.

### Workstream B: Floorplan & Photo Pipeline
**The unlock: builders add their own rooms without us.**

1. `step_photos` table (multiple photos per step, replaces single `hero_image_url`)
2. Floorplan CRUD UI (add/edit/delete floorplans)
3. Step editor (add/remove/reorder steps, assign subcategories to sections)
4. Photo upload flow (drag-drop to Supabase Storage)
5. Automated photo quality checker (Gemini Flash, current generation vision call on upload, results stored on `step_photos`)
6. Spatial hint auto-generation (vision model → builder reviews/edits)

**Depends on:** Admin auth from Workstream A (shared). `step_photos` migration is independent.

### Workstream C: Buyer Save (Email-Only)
**The unlock: buyers come back, builders see who's shopping.**

1. `buyer_sessions` table (replaces `buyer_selections`; includes `generation_count` column reserved for Workstream D)
2. "Save My Selections" UI (email prompt → immediate save, no verification gate)
3. Resume flow (email resume link token OR re-enter email in tool)
4. Builder dashboard: buyer sessions list (email, floorplan, total, last active)
5. Builder notifications (email on buyer save/submit — deferred to post-C polish)

Note: `generation_count` column exists in the schema but is not read or written by Workstream C code. All counter updates and cap enforcement are in Workstream D.

**Depends on:** Session save/resume backend is independent. Builder-facing dashboard pages depend on admin auth + RLS from A.

### Workstream D: Gallery Visualization
**The unlock: buyers see every room, not just the kitchen.**

1. `step_photos` model integration (from Workstream B)
2. Per-photo "Visualize" button (replaces per-step generate)
3. Generation pipeline update (route accepts step_photo_id, scopes selections to relevant subcategories)
4. Thumbs up/down UI + feedback storage on `generated_images`
5. Stale detection (badge when visual selections changed since last gen via `selections_fingerprint`)
6. Gallery view (final step grid of all room photos)
7. "Visualize All" batch generation
8. Per-session generation cap (configurable by builder) — includes `generation_count` updates + cap enforcement using `organizations.generation_cap_per_session`

**Depends on:** `step_photos` from Workstream B, `buyer_sessions` table from Workstream C (provides the `generation_count` column).

### Workstream E: Branding
**The unlock: each builder's tool looks like theirs.**

1. `corner_style` + `header_style` columns on organizations
2. Branding settings page in admin (logo upload, color pickers, toggles)
3. Conditional CSS application (sharp vs rounded, light vs dark header)

**Depends on:** Admin auth from Workstream A. Otherwise standalone and small.

### Dependency Graph

```
A: Admin Auth + RLS ──────┬──→ A: Option CRUD
                          ├──→ B: Floorplan & Photo Pipeline
                          ├──→ C: Builder dashboard for buyer sessions
                          └──→ E: Branding

B: step_photos migration ───┬──→ D: Gallery Visualization
                            │
C: Buyer save backend ──────┘

C: Buyer save backend can run in parallel with A/B
```

### Build Order

| Phase | Workstream | Why |
|---|---|---|
| **1** | A (auth + RLS + option CRUD) | Foundation. Everything else needs admin auth and RLS. |
| **2** | B + C backend in parallel | B gives builders photo management. C backend gives buyers save/resume + cap tracking. |
| **3** | D + C dashboard surfaces | D needs `step_photos` + cap/session tracking. C dashboard pages need A auth/RLS. |
| **4** | E (branding) | Small, can slot in anywhere. Low priority vs. the others. |

---

## Open Questions

1. **Resume UX**: Should resume be link-only, email lookup-only, or support both from day one?
2. **Generation cap defaults**: What's a reasonable per-session cap? 10? 20? Should builders be able to adjust?
3. **Photo checker thresholds**: What should hard-fail vs warn thresholds be for Flash outputs?
4. **Text helper model**: Which Gemini thinking model should we standardize on for descriptors + spatial hints?
5. **"Visualize All" UX**: Do we show a cost estimate to the buyer? ("Generating 5 images...") Or is it invisible? Buyers shouldn't think about credits — but builders need cost visibility.
6. **Buyer session expiry**: How long do saved selections persist? Forever? 90 days? Tied to the builder's subscription?
