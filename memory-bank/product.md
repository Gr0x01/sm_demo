# Product: Stone Martin Upgrade Picker + Kitchen Visualizer

## Core Concept

This is NOT just a visualization tool — it's an **upgrade selection tool** that uses AI visualization as its differentiator. Every category from the Stone Martin pricing sheet is represented. Visual options generate a kitchen image. Non-visual options still track price. Social proof nudges drive upsell.

## User Flow (Builder Demo)

```
1. Land on page → see hook: "Your buyers choose $40K in upgrades from a printed sheet"
2. Click "See It In Action"
3. See room tour: 6 real Kinkade photos as thumbnails, kitchen shown first
4. Each room shows a gorgeous hero photo + contextual upgrade options below
5. Visual options (cabinet colors, countertops, backsplash) shown as tappable swatch grids
6. Non-visual options shown as compact radio lists
7. Price tracker updates in real time across all rooms
8. On kitchen view: "Visualize My Kitchen" button generates AI image
9. Browse rooms by tapping photo thumbnails (sticky in header)
10. "Other Upgrades" section (collapsed) for electrical, security, etc.
11. After engaging, click "Finish" → CTA: "Want this for your buyers? Let's talk."
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
