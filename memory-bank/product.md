# Product: Stone Martin Upgrade Picker + Kitchen Visualizer

## Core Concept

This is NOT just a visualization tool — it's an **upgrade selection tool** that uses AI visualization as its differentiator. Every category from the Stone Martin pricing sheet is represented. Visual options generate a kitchen image. Non-visual options still track price. Social proof nudges drive upsell.

## User Flow (Builder Demo)

```
1. Land on page → see hook: "Your buyers choose $40K in upgrades from a printed sheet"
2. Click "See It In Action"
3. 5-step wizard with sticky header (logo + step nav circles)
4. Desktop: two-column layout — sticky sidebar (AI image, generate, section nav, total, continue) + scrollable options
5. Step 1 "Set Your Style": cabinets, flooring, paint, trim, fireplace, lighting
6. Step 2 "Design Your Kitchen": countertops, backsplash, kitchen cabinets, sink, faucet, appliances
7. Step 3 "Primary Bath": vanity, mirrors, tile, shower, fixtures
8. Step 4 "Secondary Spaces": secondary bath, laundry, powder room, closets
9. Step 5 "Finishing Touches": electrical, hardware, smart home, plumbing, HVAC, exterior
10. Steps 1-4: "Visualize My Kitchen" button generates AI image from visual selections
11. Section quick-nav in sidebar highlights active section as user scrolls
12. Price total updates live in sidebar as selections change
13. Mobile: single column, hero on top, sticky price tracker at bottom
14. After engaging, click "Finish" → Upgrade Summary screen:
    - Room images grid (base photos + AI-generated image replaces kitchen if generated)
    - Paid upgrades table grouped by step (only non-$0 selections)
    - Running total
    - "Download PDF" button (window.print()) + "Back to Selections" button
```

## Data Schema

Three-level hierarchy matching the real pricing PDF:

```
Category (matches PDF: APPLIANCES, CABINETS, COUNTERTOPS, etc.)
  └── SubCategory (independent selection group — one pick per group)
       └── Option (individual choice with real price from PDF)
```

Why sub-categories? The PDF's "CABINETS" category contains ~8 independent choices:
- Cabinet Style Whole House
- Kitchen Cabinet Color
- Kitchen Island Cabinet Color
- Kitchen Cabinet Hardware
- Bathroom Cabinet Hardware
- Trash Can Cabinet
- Light Rail
- Glass Cabinet Door
- Primary Bath Vanity
- Laundry Room Cabinets
- Powder Room Vanity

Each is a separate decision. Modeling them as one flat category would be wrong.

### Key Fields

**Option**:
- `id`, `name`, `price` (real $ from PDF)
- `promptDescriptor` — human-written phrase tuned for AI image quality (e.g., "Calacatta Venice quartz countertop with dramatic gray and gold veining on a white base")
- `swatchUrl` — image thumbnail from SM website or stock source
- `nudge` — optional social proof text

**SubCategory**:
- `id`, `name`, `categoryId`
- `isVisual` — determines if changing this selection affects the AI kitchen image

## isVisual Flag

~15 sub-categories are visual (countertop material, cabinet color/style, backsplash, flooring, appliances, sink, faucet, hardware finish). The rest are non-visual but still appear in the picker and affect the price total.

Only visual sub-categories trigger image regeneration. All sub-categories contribute to the price.

## Social Proof / Upsell Strategy

Nudge types:
- "Most popular"
- "X% of buyers choose this"
- "Pairs well with Y"
- "Best value"

Applied to specific options (especially mid-to-high-tier upgrades with good margins). Hardcoded for demo; would come from real sales data in production.

Examples:
- Calacatta Quartz: "Most popular countertop upgrade"
- Oxford Cabinet Style: "Chosen by 3 out of 4 buyers"
- Under Cabinet Lighting: "Best value — transforms the kitchen feel"
- French Door Refrigerator: "Most requested appliance upgrade"

## Price Tracker

- Sums `price` field across ALL selected options (not just visual ones)
- $0 options are "Included in base"
- Shows running total: "Upgrades: +$X,XXX"
- Updates instantly on any selection change
- This is the "money moment" — builder sees the buyer gravitating toward upgrades

## Full Category Inventory (Kinkade PDF)

| Category | Sub-categories | Visual? | Price Range |
|---|---|---|---|
| APPLIANCES | Dishwasher, Refrigerator, Cooking Range | Yes | $0–$3,500 |
| CABINETS | Style, Kitchen Color, Island Color, Hardware (kitchen + bath), Trash Can, Light Rail, Glass Door, Bath Vanity, Laundry, Powder Room | Partially (kitchen ones yes) | $0–$2,300 |
| COUNTERTOPS | Counter Top Material, Edge, Kitchen Sink | Yes (material + sink) | $0–$2,450 |
| FLOORING | Backsplash, Main Area Flooring Type, Flooring Color, Primary Shower, Floor Tile, Secondary Shower, Fireplace Surround, Carpet | Partially (backsplash + main flooring yes) | $0–$13,695 |
| ELECTRICAL | Outlets, Lighting Package, Under Cabinet, Can Lights, Fans, AV, Data | Partially (lighting/under-cabinet) | $0–$1,100 |
| HARDWARE | Door Hardware, Bath Hardware, Blinds, Address Style, Front Door Handle, Bath Mirrors, ADT Deadbolt | No (except cabinet hardware under CABINETS) | $0–$1,300 |
| PLUMBING | Kitchen Faucet, Bath Faucets, Shower, Toilet, Utility Sink, Hose Bib, Gas Stub | Partially (kitchen faucet yes) | $0–$5,000 |
| PAINT | Wall Color, Ceiling, Trim, Accent, Door/Casing | No (could be future visual) | $0–$2,500 |
| TRIM | Fireplace Mantel/Hearth/Accent, Interior Door Style, Baseboard, Wainscoting, Crown, Stair Treads, Shelving, Door/Window Casing | No | $0–$3,000 |
| HVAC | Clean Air Upgrade | No | $0–$1,500 |
| INSULATION | Spray Foam | No | $0–$8,000 |
| LOW VOLTAGE | ADT, Deako Switches, Smart Plugs | No | $0–$2,350 |
| SIDING | Shutter Style | No | $0–$150 |
| WINDOWS/EXT DOORS | Front Door, Rear Door, Window Screens, Garage Keypad | No | $0–$600 |
| EXT FINISHES | Additional Concrete | No | $0–$8/sqft |

## Swatch/Reference Images

**Available from SM website** (`stonemartinbuilders.com/media/`):
- Cabinet Styles: Fairmont, Meridian, Oxford — door style photos
- Cabinet Colors: All 12 (Driftwood, Cappucino, Sahara, Admiral Blue, Fog, Onyx, White, etc.) — PNG swatches
- Cabinet Hardware: All 20+ styles x finishes — product photos
- Kitchen Faucets: All 15+ models x finishes — product photos
- Appliances: Refrigerators, dishwashers, ranges — GE product photos
- Cabinet Features: Glass doors, trash can cabinet, light rail, under-cabinet lighting

**Need stock images for**:
- Countertop materials (granite/quartz textures)
- Backsplash tiles
- Flooring (LVP/hardwood)
- Kitchen sinks

## Success Criteria (Demo)

- [ ] All upgrade categories from Kinkade PDF represented
- [ ] Real prices displayed and tracked in real time
- [ ] Social proof nudges on key options
- [ ] AI generates plausible kitchen visualization within 30s
- [ ] Guided first experience points to a pre-cached combo (instant wow)
- [ ] Works on laptop for in-person demo
- [ ] Builder sees the upsell story clearly
