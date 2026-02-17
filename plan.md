# UI Redesign: Room-Based Visual Upgrade Picker

## The Problem with Current UI
The current layout is a **left-panel image viewer + right-panel accordion list**. It works functionally but feels like a form, not a sales tool. The 6 real Kinkade photos are stunning and should be doing the heavy lifting — right now only 1 kitchen photo shows, and option selection is a wall of radio buttons.

## The 6 Photos — What They Show

| # | Photo | Room | Relevant Upgrade Categories |
|---|-------|------|----------------------------|
| 3 (base) | Kitchen close-up (cabinets, backsplash, island) | Kitchen | Cabinet color/style, backsplash, countertops, sink, faucet, hardware, appliances |
| 4 | Kitchen → great room (island, fireplace, flooring) | Kitchen / Great Room | Flooring, fireplace, lighting/fans, under-cabinet lighting |
| 5 | Great room wide (chandelier, island, flooring, fireplace) | Great Room | Flooring, paint, fireplace mantel/hearth, lighting |
| 7 | Primary bath vanity + shower | Primary Bath | Bath cabinet color, bath hardware, mirrors, shower tile, faucets |
| 8 | Primary bath tub + shower | Primary Bath | Shower tile, bath faucets, rain head |
| 9 | Primary bath vanity → closet | Primary Bath / Closet | Cabinet color, mirrors, door hardware, closet shelving |

## New UI Concept: "Room Tour" Visual Picker

### Layout Shift
**Replace** the 60/40 split (image left, accordions right) with a **full-width room-focused flow**:

1. **Room photo strip** at top — 6 thumbnails, one active/selected at a time
2. **Hero image** — the active room photo, large and gorgeous (full width, ~40vh)
3. **Contextual upgrade sections below the image** — only show categories relevant to the active room photo
4. **Non-visual categories** collected in a final "Other Upgrades" section at the bottom (electrical, HVAC, insulation, low voltage, siding, windows, ext finishes)

### Room → Category Mapping

**Kitchen Close-Up (photo 3)** — "Your Kitchen"
- Cabinet Style, Kitchen Cabinet Color, Island Cabinet Color
- Kitchen Cabinet Hardware
- Countertop, Countertop Edge
- Backsplash
- Kitchen Sink, Kitchen Faucet
- Appliances (dishwasher, fridge, range)

**Kitchen/Great Room (photo 4)** — "Kitchen to Great Room"
- Flooring Type, Flooring Color
- Under Cabinet Lighting
- Great Room Fan

**Great Room Wide (photo 5)** — "Great Room & Living"
- Common Wall Paint, Accent Color, Ceiling Paint, Trim Paint
- Fireplace Mantel, Fireplace Mantel Accent, Fireplace Hearth, Fireplace Tile Surround
- Lighting Package
- Wainscoting, Crown, Baseboard, Door/Window Casing, Interior Door Style

**Primary Bath Vanity (photo 7)** — "Primary Bath"
- Primary Bath Cabinet Color, Primary Bath Vanity upgrade
- Bath Cabinet Hardware
- Bath Faucets, Bath Hardware
- Primary Bath Mirrors
- Floor Tile Color

**Primary Bath Tub/Shower (photo 8)** — "Primary Shower"
- Primary Shower tile
- Rain Head, Wall Mount Hand Shower
- Primary Shower Entry (zero entry option)

**Bath/Closet (photo 9)** — "Bath & Closet"
- Secondary Bath Cabinet Color
- Secondary Bath Mirrors
- Secondary Shower Tile
- Secondary Bath Walk-In / Steel Tub
- Primary Closet Shelving, Pantry Shelving

### Option Cards: More Visual
For **visual subcategories** (cabinet colors, countertops, backsplash, flooring colors):
- Use **swatch grid** layout — small square tiles (think paint chip grid) instead of a vertical radio list
- Selected swatch gets a gold ring/checkmark overlay
- Swatch shows: color/image thumbnail, name underneath, price as small badge
- Tapping a swatch selects it immediately

For **non-visual subcategories** (yes/no upgrades, pricing-only choices):
- Keep compact list, but tighter — single-line rows, no swatch placeholder

### Priority Order (within each room)
Paint is #1 priority — it affects the whole mood. Within the Great Room section, wall paint and accent color should be prominently placed first with large, tappable color chips.

### Sticky Elements
- **Price tracker** stays sticky at bottom (unchanged)
- **Room strip** stays sticky at top when scrolling
- **"Visualize" button** floats near the room image or sticks below the room strip

### Other Upgrades Section
Everything not tied to a photo goes here, collapsed by default:
- Electrical (outlets, data, cable, 220V, garage lights)
- HVAC, Insulation
- Low Voltage (ADT, Deako, smart plugs)
- Siding (shutters)
- Windows/Ext Doors
- Ext Finishes (concrete)
- Remaining non-visual items (door hardware, blinds, address, front door handle, etc.)

## File Changes

### New/Modified Files
1. **`public/rooms/`** — Copy 6 photos from tmp with clean names:
   - `kitchen-close.webp` (photo 3)
   - `kitchen-greatroom.webp` (photo 4)
   - `greatroom-wide.webp` (photo 5)
   - `primary-bath-vanity.webp` (photo 7)
   - `primary-bath-shower.webp` (photo 8)
   - `bath-closet.webp` (photo 9)

2. **`src/lib/room-config.ts`** (new) — Room definitions mapping photo → subcategory IDs

3. **`src/components/RoomStrip.tsx`** (new) — Horizontal thumbnail strip for room navigation

4. **`src/components/RoomHero.tsx`** (new) — Full-width hero image for active room

5. **`src/components/SwatchGrid.tsx`** (new) — Grid of visual swatches for color/material selection (replaces vertical OptionCard list for visual subcategories)

6. **`src/components/UpgradePicker.tsx`** — Major rewrite: room-based layout instead of category accordion

7. **`src/components/OptionsPanel.tsx`** — Refactor to accept filtered subcategories per room instead of all categories

8. **`src/components/OptionCard.tsx`** — Minor: tighter compact mode for non-visual options

9. **`src/components/KitchenViewer.tsx`** — Replace with `RoomHero.tsx` (or repurpose)

10. **`src/components/CategoryAccordion.tsx`** — Keep for "Other Upgrades" collapsed section only

## Implementation Order
1. Copy photos + create room config
2. Build RoomStrip + RoomHero
3. Build SwatchGrid component
4. Rewire UpgradePicker to room-based layout
5. Move non-visual categories to "Other Upgrades" section
6. Polish: sticky behavior, transitions, mobile
