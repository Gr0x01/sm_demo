# Architecture: Stone Martin Upgrade Picker + Kitchen Visualizer

## System Overview

```
Browser (Next.js client)
  ├── Landing page (static)
  ├── Upgrade Picker (React state manages all selections)
  │     ├── Options data loaded from static TypeScript config
  │     ├── Price calculation (client-side, instant)
  │     └── Visual change detection (did a visual sub-category change?)
  ├── Kitchen Viewer
  │     └── Calls POST /api/generate when user clicks "Visualize"
  └── Upgrade Summary (room images + upgrade table + PDF download)

Server (Next.js API route)
  └── POST /api/generate
        ├── Receives: selections (visual sub-categories only)
        ├── Hashes visual selections → check Supabase cache
        ├── Cache HIT → return cached image URL instantly
        ├── Cache MISS:
        │     ├── Build prompt from promptDescriptors
        │     ├── Call gpt-image-1 via Vercel AI SDK
        │     ├── Store result in Supabase (image in Storage, metadata in table)
        │     └── Return image URL
        └── Returns: image URL + prompt used + cache_hit boolean

Supabase
  ├── Table: generated_images
  │     ├── id (uuid)
  │     ├── selections_hash (text, unique) — deterministic hash of visual selections
  │     ├── selections_json (jsonb) — the actual selections for debugging
  │     ├── image_path (text) — path in Supabase Storage
  │     ├── prompt (text) — the prompt used
  │     └── created_at (timestamptz)
  └── Storage bucket: kitchen-images
        └── {selections_hash}.png
```

Option data is static TypeScript. Selections state is client-side React. Supabase is ONLY for caching generated images.

## Cache Flow

1. User clicks "Visualize"
2. Client sends visual selections to `/api/generate`
3. Server creates deterministic hash of visual selections (sorted keys + option IDs → SHA-256)
4. Query Supabase: `SELECT image_path FROM generated_images WHERE selections_hash = ?`
5. If found → return Supabase Storage public URL (instant, ~200ms)
6. If not found → generate via gpt-image-1 (10-30s) → upload PNG to Storage → upsert cache row → return URL
7. Client receives image URL either way

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
  generatedImageUrl: string | null,
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

1. User clicks "Visualize My Kitchen" (available on steps 1-4)
2. Client sends POST to `/api/generate` with only the visual sub-category selections
3. Server looks up each selected option's `promptDescriptor`
4. Server constructs a composite prompt with layout-anchoring:
   ```
   A photorealistic interior photograph of a modern new-construction kitchen,
   shot from the living room looking toward the kitchen.
   The kitchen has an L-shaped layout with a center island, featuring:
   - {countertop promptDescriptor}
   - {cabinet style promptDescriptor} cabinets in {cabinet color promptDescriptor}
   - {backsplash promptDescriptor}
   - {flooring promptDescriptor}
   - {hardware finish promptDescriptor} cabinet hardware
   - {sink promptDescriptor}
   - {faucet promptDescriptor}
   - {appliance descriptions}
   Professional interior design photography, eye-level camera angle.
   Natural lighting from windows. High-end new construction. No people.
   ```
5. Call `experimental_generateImage` (Vercel AI SDK) with gpt-image-1
6. Return image URL to client (from cache or freshly generated)
7. Client displays in StepHero

**Image approach**: Text-to-image (not image editing). Simpler, more reliable for the demo. The prompt needs to be rich enough to produce a consistent, plausible kitchen. Each option's `promptDescriptor` is a human-written phrase tuned for AI generation quality.

**Future**: If base kitchen photos become available, can switch to image editing (send base photo + describe material swaps). The `isVisual` flag and `promptDescriptor` fields make this transition easy.

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
│   ├── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── generate/route.ts
│       └── selections/[buyerId]/route.ts
├── components/
│   ├── LandingHero.tsx
│   ├── UpgradePicker.tsx        # Main container — step wizard + two-column layout
│   ├── SidebarPanel.tsx         # Sticky sidebar: image, generate, nav, total, continue
│   ├── StepNav.tsx              # Step circles with connector lines
│   ├── StepHero.tsx             # Room photo with AI overlay, compact mode for sidebar
│   ├── StepContent.tsx          # Sections with section IDs for IntersectionObserver
│   ├── RoomSection.tsx          # Renders SwatchGrid or CompactOptionList per subcategory
│   ├── SwatchGrid.tsx           # Grid of tappable visual swatches
│   ├── CompactOptionList.tsx    # Tight single-line rows for non-visual options
│   ├── PriceTracker.tsx         # Sticky bottom bar (mobile only)
│   ├── GenerateButton.tsx
│   └── UpgradeSummary (room images grid, upgrade table, PDF via window.print).tsx
├── lib/
│   ├── options-data.ts      # All Kinkade plan options + SM website image URLs
│   ├── step-config.ts       # Step→subcategory mapping for wizard layout
│   ├── pricing.ts           # Price calculation
│   ├── generate.ts          # Prompt construction
│   └── supabase.ts          # Supabase client + cache helpers
└── types/
    └── index.ts

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

## Analytics

Deferred. Will add PostHog later — the MCP integration is available when ready.

## Performance Considerations

- Image generation: 10-30s depending on complexity
- Pre-cached combos: ~200ms (Supabase Storage CDN)
- Show skeleton/progress indicator during generation
- Guided first experience targets a pre-cached combo for instant wow
