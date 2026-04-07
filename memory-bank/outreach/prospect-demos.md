# Prospect Demo Playbook

## Live Demos

| Builder | Slug | URL | Target | Status |
|---------|------|-----|--------|--------|
| Stylecraft Homes | stylecraft | withfin.ch/for/stylecraft | Doug French (CEO) | DM sent, no reply |
| Davidson Homes | davidson | withfin.ch/for/davidson | Steve Snoddy (Dir Sales AZ) | DM drafted |
| McKinley Homes | mckinley | withfin.ch/for/mckinley | Mary Mead (VP Sales) | Engaged — visited demo page |
| ICI Homes | ici | withfin.ch/for/ici | Janna Pettegrew (Design Center Mgr) | DM sent, no reply |
| Viera Builders | viera | withfin.ch/for/viera | Matt Sims (Area Sales Mgr) | DM drafted |
| Homes By WestBay | westbay | withfin.ch/for/westbay | Dee Crescini (VP Design) | InMail sent |
| Rocklyn Homes | rocklyn | withfin.ch/for/rocklyn | Tr Adams (VP Sales/Marketing) | Cold email (C2) |
| Kolter Homes | kolter | withfin.ch/for/kolter | Marc Friedman (SVP Sales) | Fresh |
| Neal Signature | neal | withfin.ch/for/neal | TBD | Fresh |
| Chesapeake Homes | chesapeake | withfin.ch/for/chesapeake | Kerri Woodward (President) | Live, 3 presets |
| Christopher Alan Homes | christopher-alan | withfin.ch/for/christopher-alan | Carlos Gilkey (VP Sales & Marketing), Alana Consolo (Dir Marketing, ex-Lennar) | Live, 3 presets |
| Alexander Scott Homes | alexander-scott | withfin.ch/for/alexander-scott | Cole Jolly (President) | Live, 3 presets |

## Positioning Rule

**Finch extends the design center. It never replaces it.**

Design center managers are our champions. They're the ones who'll push this internally. Never imply their role is obsolete or that the design center appointment doesn't matter.

Finch is for:
- Out-of-town buyers who can't easily visit the design center
- Busy people who need more than 2 hours to make a $20K decision
- Anyone who wants to browse, play around, and fall in love with their options on their own time
- Alleviating the stress of a high-stakes, time-pressured appointment

The result: buyers who visualize spend more, make fewer change orders, and are more satisfied with their selections. That's good for the design center team, not threatening to them.

**Never say or imply:**
- "before the appointment" / "before the meeting" — sounds like we're replacing prep
- "already knowing what they want" — sounds like the design center is just a formality
- "instead of" their existing tools — we add to what they have
- "this does the same thing" as their physical space — it doesn't, and saying so is dismissive

## Headlines (updated 2026-03-26)

Short, one-line. Reference something specific to the builder where possible. Never imply replacement.

| Builder | Headline |
|---------|----------|
| Stylecraft | Selections they can actually see. |
| Davidson | Their finishes, in their actual kitchen. |
| McKinley | More time with their options. |
| ICI | The homework. |
| Viera | More than a template. |
| WestBay | What the wishlist looks like. |
| Kolter | Your Design Studio, on every phone. |
| Neal | The Design Gallery, from home. |
| Rocklyn | More time with every buyer. |
| Chesapeake | Room by room, before they walk in. |
| Christopher Alan | Luxe Collection, room by room. |

| Alexander Scott | I used your kitchen. |
**Default fallback** (code): "Their selections, visualized."

**Hero body** must be unique per builder. No template. Rules:
- Don't repeat the floorplan name (already a label on the page)
- Be honest that selections are samples, not the builder's real catalog
- Reference something specific to THIS builder (recent event, their design center name, their process)
- Frame it as a proof of concept — "your real catalog drops in directly"
- 2-3 sentences max. The demo speaks for itself.
- See `prospect-demo-builder.md` agent for full rules + good/bad examples.

## Current Sidebar Insights (needs standardization)

**Pattern A — Builder operational stats** (WestBay, Kolter):
- Design Studio appointments: "Most of a full day per buyer"
- Homes delivered/yr: ~1,200
- Avg selections per home: "Dozens across 8+ categories"
- Design Studio incentive: "Up to $50K towards selections"

**Pattern B — Revenue math** (Neal, Rocklyn):
- Signature Homes +20% option sales
- Typical margin on upgrades: 50-100%
- Even a 10% lift on $X avg upgrades = +$Y per home
- Closing line: "At Z closings/yr, that is $W in upgrade revenue..."

**Pattern C — Mix** (McKinley, ICI, Viera): appointment time + buyer behavior stats

**Problems:** Inconsistent framing. Some are impressive (revenue math), some are trivia (appointment length). The closing line math is the strongest part but not every demo has it.

**Closing lines that violate positioning:**
- WestBay: "What if buyers walked into the Design Studio already knowing what they want?" — implies the Design Studio is a formality
- Kolter: "What if every community had a Design Studio — not just Newnan and Palm Beach?" — actually OK, extends reach

## Proposed Sidebar Template

Same structure every time, just swap the numbers:

| Row | What it is | Example |
|-----|-----------|---------|
| 1 | Homes/yr anchor | ~1,200 homes/yr |
| 2 | Avg upgrade spend (or estimate) | ~$12K avg. upgrades per home |
| 3 | Conservative lift math | 10% lift = +$1,200 per home |
| **Closing line** | Annual revenue at scale | At 1,200 closings, that is $1.44M/yr from something that takes a week to set up. |

Source line stays: "Sources: ECI case study (Signature Homes), public SEC filings"

If we don't know their avg upgrade spend, use $10-15K as a conservative range (industry norm for production builders).

## How to Create a New Prospect Demo

### 1. Research (30 min)

- Check their website for: floor plans, design center language, communities, any existing viz tools
- Find a kitchen photo from their models (website gallery, Zillow, Realtor.com, Google Images)
- Find an exterior/community photo for the cover image
- Get target contact info (LinkedIn, Apollo)
- Write research brief → `memory-bank/prospects/{slug}.md`

### 2. Build the Config (15 min)

Create `scripts/prospect-configs/{slug}.json`:

```json
{
  "slug": "builder-slug",
  "name": "Builder Name — Floorplan Name",
  "heroHeadline": "TBD — see headline formula",
  "heroBody": "This is your [Floorplan] kitchen at [Community] with real upgrade selections wired up. Buyers pick finishes and see them in the room. Took about ten minutes.",
  "kitchenPhoto": "/path/to/kitchen.jpg",
  "exteriorPhoto": "/path/to/exterior.jpg",
  "photoBaseline": "Detailed text description of the kitchen photo...",
  "spatialHint": "Camera position and spatial layout description...",
  "subcategoryIds": ["kitchen-cabinet-color", "counter-top", "backsplash", "main-area-flooring-color", "common-wall-paint"],
  "sections": [
    { "title": "Cabinets", "subcategory_ids": ["kitchen-cabinet-color"] },
    { "title": "Countertops", "subcategory_ids": ["counter-top"] },
    { "title": "Backsplash & Flooring", "subcategory_ids": ["backsplash", "main-area-flooring-color"] },
    { "title": "Paint", "subcategory_ids": ["common-wall-paint"] }
  ],
  "insights": [
    { "label": "Homes delivered/yr", "value": "~X" },
    { "label": "Avg. upgrades per home", "value": "~$XK" },
    { "label": "Even a 10% lift", "value": "+$X per home" }
  ],
  "closingLine": "At X closings a year, that is $XM in upgrade revenue from something that takes a week to set up.",
  "presets": [
    { "label": "Standard", "selections": { ... } },
    { "label": "Mid-Range", "selections": { ... } },
    { "label": "Premium", "selections": { ... } }
  ]
}
```

**Add island cabinets** if the kitchen has a visible island with painted cabinet faces:
- Add `"kitchen-island-cabinet-color"` to subcategoryIds
- Add `{ "title": "Island Cabinets", "subcategory_ids": ["kitchen-island-cabinet-color"] }` section

### 3. Write the Photo Baseline + Spatial Hint

The photo baseline and spatial hint are the most important parts for generation quality.

- **Photo baseline**: What the camera sees. Every surface, material, appliance, fixture. Be exhaustive.
- **Spatial hint**: Where things are in relation to the camera. Left/right/center/foreground/background.

Both are plain text, not JSON.

**Spatial hints** (per-subcategory targeting) are auto-generated by the seed script based on which subcategories are present. Without these, the AI won't change subtle surfaces like backsplash. You can override individual hints in the config JSON via `spatialHints` if the kitchen layout is unusual.

### 4. Seed the Demo (5 min)

```bash
npx tsx scripts/seed-prospect-demo.ts --config scripts/prospect-configs/{slug}.json
```

This uploads photos, creates DB records, triggers generation for all 3 presets, polls for completion, and wires up the preset_variations JSONB.

### 5. Verify

- Visit `withfin.ch/for/{slug}`
- Check: hero renders, cover image loads, 3 preset cards show with generated images, picker works, Calendly CTA works
- Check mobile layout

### 6. Update This Doc

Add the new demo to the Live Demos table above.

## Gotchas (we've been burned on all of these)

- `step_photos.subcategory_ids` must be **slugs**, not UUIDs
- `step.sections` JSONB uses `subcategory_ids` (snake_case), query layer maps to camelCase
- `photo_baseline` is a **text description**, not a JSON object
- Kitchen photos should be single-pass (no generation policy) — ~30-40s. Two-pass doubles wait time and prospects bounce.
- Preset selections use slug-based keys, not UUIDs
- Always generate all 3 presets before going live — the variation gallery is the instant "aha moment"
- **Spatial hints must be set on the step** — without them, backsplash and other subtle surfaces won't change. The seed script handles this automatically now.
