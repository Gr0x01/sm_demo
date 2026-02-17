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
  └── Closing CTA (static)

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
page.tsx (flow state: "landing" | "picker" | "cta")
├── LandingHero
├── UpgradePicker (main container — room-based visual layout)
│   ├── Header (sticky: logo + RoomStrip)
│   │   └── RoomStrip (horizontal photo thumbnails — 6 rooms)
│   ├── RoomHero (full-width room photo, shows AI-generated image for kitchen)
│   ├── RoomSection (contextual upgrades for active room)
│   │   ├── SwatchGrid (grid of tappable visual swatches — colors, materials)
│   │   └── CompactOptionList (tight rows for non-visual/binary options)
│   ├── "Other Upgrades" collapsible section (orphan categories)
│   │   └── CategoryAccordion → SubCategoryGroup → OptionCard
│   ├── GenerateButton (kitchen view only)
│   └── PriceTracker (sticky bottom bar)
└── ClosingCTA
```

### Room-Based Layout

The UI is organized as a "room tour" — 6 real Kinkade plan photos, each mapped to relevant upgrade subcategories via `room-config.ts`. Subcategories not tied to any room go into the collapsible "Other Upgrades" section.

| Room | Photo | Key Upgrades |
|------|-------|-------------|
| Your Kitchen | kitchen-close.webp | Cabinets, countertops, backsplash, sink, faucet, appliances |
| Kitchen to Great Room | kitchen-greatroom.webp | Flooring, under-cabinet lighting, great room fan |
| Great Room & Living | greatroom-wide.webp | Paint (wall, accent, ceiling, trim), fireplace, lighting, trim |
| Primary Bath | primary-bath-vanity.webp | Bath cabinet color, vanity, faucets, hardware, mirrors, floor tile |
| Primary Shower | primary-bath-shower.webp | Shower tile, rain head, hand shower, shower entry |
| Bath & Closet | bath-closet.webp | Secondary bath, secondary shower, closet/pantry shelving |

## State Management

Single `useReducer` or `useState` in UpgradePicker.

State shape:
```typescript
{
  selections: Record<subCategoryId, optionId>,  // current picks
  generatedImageUrl: string | null,
  isGenerating: boolean,
  hasEverGenerated: boolean,
  visualSelectionsChangedSinceLastGenerate: boolean,
  error: string | null,
}
```

- Default selections: all $0 (included) options pre-selected
- Price computed as derived state: `sum of price for each selected option`

## AI Image Generation Pipeline

1. User clicks "Visualize My Kitchen"
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
7. Client displays in KitchenViewer

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
│   └── api/generate/route.ts
├── components/
│   ├── LandingHero.tsx
│   ├── UpgradePicker.tsx        # Main container — room-based layout
│   ├── RoomStrip.tsx            # Horizontal room photo thumbnails
│   ├── RoomHero.tsx             # Full-width active room photo
│   ├── RoomSection.tsx          # Renders SwatchGrid or CompactOptionList per subcategory
│   ├── SwatchGrid.tsx           # Grid of tappable visual swatches
│   ├── CompactOptionList.tsx    # Tight single-line rows for non-visual options
│   ├── CategoryAccordion.tsx    # Used for "Other Upgrades" collapsed section
│   ├── SubCategoryGroup.tsx     # Legacy — used inside CategoryAccordion
│   ├── OptionCard.tsx           # Legacy — used inside SubCategoryGroup
│   ├── PriceTracker.tsx
│   ├── GenerateButton.tsx
│   └── ClosingCTA.tsx
├── lib/
│   ├── options-data.ts      # All Kinkade plan options + SM website image URLs
│   ├── room-config.ts       # Room→subcategory mapping for visual tour layout
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
└── swatches/                # Swatch images (to be populated)
```

## Analytics

Deferred. Will add PostHog later — the MCP integration is available when ready.

## Performance Considerations

- Image generation: 10-30s depending on complexity
- Pre-cached combos: ~200ms (Supabase Storage CDN)
- Show skeleton/progress indicator during generation
- Guided first experience targets a pre-cached combo for instant wow
