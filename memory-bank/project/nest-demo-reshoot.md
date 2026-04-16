# Nest Demo Reshoot — nano banana interiors anchored to the Nest exterior

**Status**: Planned. Not started.
**Why**: The current Nest interiors (real photos) force us to tune for hard cases — two-pass oven correction, Calacatta marble Max-only renders, chimney-hood backsplash zones. That's valuable lab work, but it makes the *demo* feel slow and brittle instead of fast and magical. Reshoot the Nest with nano banana (Gemini 2.5 Flash Image) interiors designed from the ground up to run on Flex + Klein 9B / 4B end-to-end, with no Max fallback.

**Product thesis**: "The Finch demo is fast and clean." Hero photos and option set are chosen so every selection path is provably easy for Flex. Demo speed becomes the story.

---

## Aesthetic anchor: the Nest exterior

`/tmp/nest-exterior.png` (DB: `floorplans.cover_image_path` on Demo org `nest` floorplan).

**Style**: California coastal contemporary.
- White stucco body, warm natural wood accents (front door, second-story siding panel)
- Black-framed windows and glass-panel garage door
- Flat/low-pitched hipped roof with thin dark metal fascia
- Architectural drought landscaping (agaves, gravel beds, concrete walkway)
- Clean, modern, no traditional trim

**Interior implication**: Every room echoes the same palette. White walls, warm mid-tone wood accents, black metal hardware/window frames, flat-panel everything, natural daylight from tall black-framed windows. No traditional crown molding, no raised-panel cabinets, no ornate trim. Minimal, light, architectural.

---

## Hard exclusions (dodge every known Flux 2 failure mode)

Choose photos and options that **never** include:

- ❌ Stainless steel ovens / wall ovens (two-pass oven correction required)
- ❌ Chimney hoods (backsplash zone coverage is hard)
- ❌ Calacatta / Carrara / any patterned marble (Max-only, Flex cannot render uniform veining)
- ❌ Dark granite waterfall islands (attention-budget failure, dominant surface bleeds)
- ❌ Subway tile (activates Flux's "white tile" prior, color gets dropped)
- ❌ Tiny hex / penny mosaic floors on swatch variants (scale signal weak at Flex guidance)
- ❌ Two-tone cabinets with narrow color separation (perimeter vs island color discrimination failure on Flex)
- ❌ Ornate raised-panel or inset-frame cabinets (edge hallucination)
- ❌ Recessed wine niches / open shelving niches (spatial exclusion required, adds hint complexity)
- ❌ Waterfall-paneled peninsulas with barstools (persistent misread — see Davidson prospect demo lessons)
- ❌ Wall-mounted faucets, pot fillers, anything that requires preserving unusual plumbing geometry

**Default to**: flat-slab cabinets, slide-in gas ranges (no wall oven, no chimney hood), large-format matte porcelain, honed neutral quartz, simple rectangular layouts, tall black-framed windows as the daylight source.

---

## Per-room briefs

Each room is a single hero photo generated in nb. Prompt style is descriptive-neutral — let nb's photorealism priors do the work. Avoid over-specifying materials we'll be swapping via Flux later (cabinet color, countertop, backsplash, flooring, wall paint) — those should render in a **neutral default state** so Flux edits have somewhere to go.

### 1. Kitchen

```
Modern California coastal contemporary kitchen interior, real estate photography.
Flat-slab shaker cabinets in warm white, warm natural wood island base,
honed neutral white quartz countertops throughout perimeter and island,
plain matte white large-format porcelain backsplash behind the counter,
warm mid-tone oak wide-plank hardwood flooring, white walls, black matte
cabinet hardware (slim bar pulls). Slide-in gas range centered on the back
wall with no chimney hood — low-profile flush ceiling vent. Undercabinet
lighting, recessed ceiling cans. Tall black-framed picture window behind
the sink flooding the room with natural daylight. Wide straight-on camera
angle at counter height, centered on the island, showing full perimeter
on both sides. No pendants, no barstools blocking the island face, no
waterfall panel, no appliances other than the range. Neutral white balance,
cool-toned natural daylight, photorealistic real estate photography,
35mm lens, f/8, sharp edges, no bokeh.
```

**What this buys us**:
- No chimney hood = backsplash zone is simple geometric AND
- No wall oven = no two-pass oven correction
- Flat-slab cabs = clean hex anchor rendering
- Honed quartz (not granite/marble) = Flex renders neutrally, swatches dominate
- Large-format porcelain (not subway) = no white-tile prior
- Straight-on angle, no barstools blocking island = no waterfall misread trap

### 2. Living Room

```
Modern California coastal contemporary living room interior, real estate
photography. White walls, warm mid-tone oak wide-plank hardwood flooring,
flat recessed ceiling with simple crown-free transition. Low-profile
flat-front built-in media cabinet along one wall in warm natural wood
with matte black hardware. Simple linen sofa facing the media wall,
low rectangular wood coffee table, large woven area rug. Tall floor-to-
ceiling black-framed picture windows along one side wall flooding the
room with natural daylight. No fireplace, no mantel, no ceiling beams.
Wide camera angle at seated height showing the full back wall and the
window wall in a two-point perspective. Neutral white balance, cool-toned
natural daylight, photorealistic real estate photography, 35mm lens, f/8,
sharp edges.
```

**Swappable surfaces**: wall paint, flooring, media cabinet color, accent wall.

### 3. Primary Bathroom

```
Modern California coastal contemporary primary bathroom interior, real
estate photography. Floating flat-slab warm natural wood double vanity
with undermount rectangular white ceramic sinks, honed neutral white
quartz vanity top, large frameless rectangular wall-mounted mirror above.
Matte black faucets and hardware. Walk-in shower on the right wall with
frameless glass enclosure, large-format matte white porcelain wall tile
(no subway, no hex, no mosaic), plain rectangular linear drain. Large-
format matte porcelain flooring throughout. White walls. Tall black-framed
frosted window above the shower for natural daylight. No soaking tub,
no decorative niches, no accent tile band, no pattern. Wide camera angle
showing the vanity wall and the shower wall in a two-point perspective.
Neutral white balance, cool-toned natural daylight, photorealistic real
estate photography, 35mm lens, f/8, sharp edges.
```

**Swappable surfaces**: vanity cabinet color, vanity top, shower wall tile, floor tile, wall paint, hardware finish.

**Critical exclusions**: no soaking tub (adds surface, adds occlusion), no decorative niche (spatial exclusion), no pattern tile (Flex weakness).

### 4. Primary Bedroom

```
Modern California coastal contemporary primary bedroom interior, real
estate photography. White walls, warm mid-tone oak wide-plank hardwood
flooring, flat recessed ceiling. Low-profile platform bed with warm
natural wood headboard wall panel behind it running floor to ceiling.
Simple flat-slab wood nightstands on either side with matte black lamps.
Linen bedding, neutral throw. Tall black-framed picture window on the
left wall with sheer white curtain panel, flooding the room with natural
daylight. No ceiling fan, no decorative molding, no accent wall beyond
the headboard panel. Wide straight-on camera angle at standing height
centered on the bed, showing the headboard wall and partial window wall.
Neutral white balance, cool-toned natural daylight, photorealistic real
estate photography, 35mm lens, f/8, sharp edges.
```

**Swappable surfaces**: wall paint, flooring, headboard accent wall, nightstands (probably not — not a standard option).

---

## Shared camera / lighting conventions (lock across all 4 rooms)

So the Nest feels like one house, not four disconnected shots.

- **Camera**: wide angle (35mm equiv), at eye height or slightly below, straight-on or subtle two-point perspective. No dramatic angles, no tilted horizons.
- **Lighting**: cool-toned natural daylight, primary source always a tall black-framed window. No warm incandescent cast, no mood lighting, no moody shadows. Neutral white balance.
- **Depth of field**: f/8 equivalent. Sharp edges throughout — no bokeh, no selective focus. Flux needs sharp edges to bind surfaces.
- **Color grade**: neutral, slightly cool. Matches the exterior's white stucco + cool daylight feel.
- **Aspect ratio**: 16:9 landscape, 1536×1024 (matches existing `/try` sample kitchen dimensions so pipeline math stays consistent).
- **File format**: PNG from nb, then resized + JPEG-encoded through the existing swatch-upload pipeline for hero photo ingestion.

---

## Generation workflow

1. Generate 3-5 candidates per room in nb (iterate on prompt if needed).
2. Pick one winner per room based on: geometry cleanness, daylight direction consistency with exterior, no off-limit surfaces visible.
3. Drop each winner into the Prompt Lab as a new step_photo on the Nest floorplan. Write v2 prose specs for each, using only options from the trimmed Demo org catalog (see §Option trimming below).
4. Lab-validate on Flex + Klein/4B only. If any selection requires Max, either swap the option or cut it from the catalog.
5. Replace existing Nest interiors in DB one at a time. Keep old `_photo_hash` keys as deletable rows — re-seed demo cache after all 4 rooms ship.

---

## Option trimming

The Demo org currently has ~120 options across subcategories. Many of them are there because SM had them. Before ship, audit every subcategory and **cut any option that requires Max**:

- Any marble countertop or backsplash
- Any dark-veined granite
- Any stainless steel appliance that needs two-pass correction
- Any tiny-hex or penny mosaic tile
- Any shower wall option that's not large-format porcelain

The option set should be "everything the new Nest interiors can render cleanly on Flex." Fewer options, higher quality, faster demo. Quality over catalog size.

---

## Success criteria

- All 4 Nest rooms generate full-scene on Flex (no Max pass), end-to-end under 25 seconds per generation.
- All scoped edits run on Klein 9B or 4B, under 15 seconds per generation.
- 3-run consistency check on every option across every room — no run-to-run visual divergence beyond acceptable non-determinism.
- Pre-seed cache hit rate > 80% on expected buyer selection paths.
- Aesthetic coherence: the 4 rooms + exterior read as one house when viewed together.

---

## Out of scope (explicitly)

- **Stone Martin demo stays untouched.** Kinkade kitchen keeps its complex SM photos, its Max pipeline, its two-pass oven correction. SM is the "handles hard scenes" proof point. Nest is the "fast and clean" proof point. Two different product stories, two different demos.
- **`/try` sandbox kitchen stays untouched.** It's already optimized, cache-seeded, and shipped. Leave it.
- **Prospect demos stay untouched.** The 13 `/for/*` pages are real-builder photos. This reshoot is Nest-only.

---

## Open questions

- Do we generate the nb hero photos ourselves, or outsource to a designer who's better at nb prompt iteration?
- Does nano banana's current quality actually beat Flux's synthetic-geometry handling, or do we still hit edge softness? (User claim: "new nb is really good." Trust but verify on the first candidate.)
- Should we keep the Nest at 4 rooms, or expand/contract while we're reshooting anyway?
- Do we bump `DEMO_GENERATION_CACHE_VERSION` and fully re-seed, or start fresh and let cache grow organically?

---

## References

- `memory-bank/generation/bfl-prompting-guide.md` — Flux 2 prompting rules (applies at option-prose authoring, not nb hero generation)
- `memory-bank/generation/flux2-architecture-watchlist.md` — known Flux failure modes this reshoot dodges
- `memory-bank/project/swatch-storage-contract.md` — tenant isolation rules for swatches; applies to any new options added during trim
- `memory-bank/phases/current.md` §2 Flux 2 Generation Quality — the lab findings (D100–D103) that motivated this reshoot
