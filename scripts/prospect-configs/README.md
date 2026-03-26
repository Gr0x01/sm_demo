# Prospect Demo Config Files

Each JSON file seeds a `/for/[slug]` demo page in the Demo org.

## Usage

```bash
# Seed DB records + upload photos (no generation)
npx tsx scripts/seed-prospect-demo.ts --config scripts/prospect-configs/westbay.json

# Seed + generate preset images (requires local dev server + Inngest running)
npx tsx scripts/seed-prospect-demo.ts --config scripts/prospect-configs/westbay.json --generate

# Re-run just the presets (if generation failed or you want new presets)
npx tsx scripts/seed-prospect-demo.ts --config scripts/prospect-configs/westbay.json --presets-only --generate
```

## Prerequisites

1. Local dev server running: `npm run dev -- -p 3003`
2. Inngest dev server running: `npx inngest-cli@latest dev`
3. Kitchen + exterior photos downloaded to the paths in your config
4. `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

## Creating a new config

1. Research the builder (website, design center, communities, kitchen photos)
2. Download a kitchen photo and exterior photo
3. Copy an existing config and update:

```json
{
  "slug": "builder-slug",
  "name": "Builder Name — Floorplan Name",
  "heroHeadline": "One line that references something specific to them.",
  "heroBody": "What this demo is, no pricing, no $500.",
  "kitchenPhoto": "/tmp/builder-kitchen.jpg",
  "exteriorPhoto": "/tmp/builder-exterior.jpg",
  "photoBaseline": "Detailed text description of the kitchen photo as-is...",
  "spatialHint": "Camera position and layout description for AI generation...",
  "subcategoryIds": ["kitchen-cabinet-color", "counter-top", ...],
  "sections": [
    { "title": "Cabinets", "subcategory_ids": ["kitchen-cabinet-color"] }
  ],
  "insights": [
    { "label": "Metric name", "value": "Metric value" }
  ],
  "closingLine": "Question that reframes the insight.",
  "presets": [
    {
      "label": "Standard",
      "selections": { "kitchen-cabinet-color": "option-slug", ... }
    }
  ]
}
```

## After building a demo

1. Update `memory-bank/outreach/inmail-targets.md` — mark the demo as DONE
2. Update `memory-bank/phases/current.md` — log what was built
3. Create `memory-bank/research/prospect-{slug}.md` — research brief with company overview, contact, design center info, demo setup details, InMail angle

## Key gotchas

- **subcategoryIds and section subcategory_ids must be slugs**, not UUIDs
- **photoBaseline** is a text description of the photo, not JSON
- **Presets use option slugs** from the Demo org's shared option set (~120 options across ~15 subcategories)
- **Photos upload to the `rooms` bucket** in Supabase storage (not `swatches`)
- **Don't put $500 or pricing in heroBody** — removed from all demos
- **Always run against localhost** with Inngest dev server — production Inngest may not pick up events reliably from CLI

## Available subcategories in Demo org

| Slug | Name | Options |
|------|------|---------|
| kitchen-cabinet-color | Kitchen Cabinet Color | 5 (driftwood, admiral blue, white, fog, onyx) |
| kitchen-island-cabinet-color | Kitchen Island Cabinet Color | 5 (driftwood, match, onyx, white, admiral blue) |
| counter-top | Counter Top | 5 (granite dallas white, granite steel grey, quartz lace white, quartz calacatta duolina, quartz calacatta venice) |
| backsplash | Backsplash | 5 (baker white gloss, baker taupe, baker carbon, naive white, baker herringbone white) |
| main-area-flooring-color | Main Area Flooring Color | 5 (polaris toasted taupe, polaris wild dunes, delray lowtide, delray windsurf, polaris cinnamon walnut) |
| common-wall-paint | Common Wall Paint Color | 5 (fog, delicate white, whiskers, hurricane haze, cold foam) |
