# Decisions Log

## D1: On-the-fly generation first, pre-cache later
**Context**: Pre-caching all option combinations creates a combinatorial explosion. Even a modest set (10 counters x 8 cabinets x 6 floors x 3 angles) = 1,440 images.
**Decision**: Start with on-the-fly generation. Good loading UX compensates for wait time. Pre-cache popular combos only if this becomes a full product.
**Trade-off**: Users wait 10-30s per generation vs. massive upfront image generation cost and storage.

## D2: Vercel AI SDK for model abstraction
**Context**: Unsure which image model will produce best results for interior design visualization.
**Decision**: Use Vercel AI SDK so we can swap between OpenAI, Gemini, etc. without rewriting the pipeline.
**Trade-off**: Slight abstraction overhead vs. freedom to pick best model after testing.

## D3: Static option data, no database
**Context**: This is a demo. Options are known and finite.
**Decision**: Define options in TypeScript config files, not a database. Room photos in `/public/`.
**Trade-off**: Can't dynamically manage options without code changes. Fine for demo, revisit for product.

## D4: Next.js for consistency
**Context**: Rashaad's primary stack is Next.js (from Loupe).
**Decision**: Use Next.js even though this could be a simpler SPA. Familiar tools = faster shipping.

## D5: Upgrade picker first, visualizer second
**Context**: Initial concept was "options visualizer." Feedback revealed the real value is an upgrade picker that drives upsell. Visualization is the hook, not the whole product.
**Decision**: Build a complete upgrade picker with ALL categories from the pricing sheet. AI visualization is one feature within it, not the sole purpose.

## D6: Three-level data hierarchy (Category → SubCategory → Option)
**Context**: The real pricing PDF has categories like CABINETS that contain 8+ independent selection groups. A flat category model doesn't work.
**Decision**: Model data as Category → SubCategory → Option. Each SubCategory is an independent "pick one" group. This matches how the real pricing sheet works.

## D7: isVisual flag on SubCategories
**Context**: Not all options change what a kitchen looks like. Electrical outlets don't affect the image, but countertop material does.
**Decision**: Each SubCategory has an `isVisual` boolean. Only visual sub-categories trigger image regeneration. All sub-categories contribute to the price total.

## D8: Social proof nudges for upsell
**Context**: The demo needs to show Stone Martin that this tool drives higher upgrade revenue, not just looks pretty.
**Decision**: Add hardcoded social proof nudges ("Most popular", "X% choose this") to high-value options. In production these could come from real sales data.

## D9: Text-to-image generation (not image editing)
**Context**: Image editing (sending a base photo + describing swaps) preserves room layout but is complex. Text-to-image is simpler.
**Decision**: Start with text-to-image using detailed prompts. Each option has a `promptDescriptor` tuned for AI quality. Can switch to image editing later if base photos become available.

## D10: Supabase for image caching + pre-generation
**Context**: Image generation takes 10-30 seconds. For a demo, that first wait can kill the wow factor. Pre-generating popular combos and caching all results eliminates repeat waits.
**Decision**: Use Supabase (Postgres table + Storage bucket) to cache generated images keyed by a hash of the visual selections. Pre-generate 10-20 popular combos including the guided first experience. Supabase is free-tier friendly and gives CDN-backed image URLs.
**Trade-off**: Adds a dependency (Supabase) but dramatically improves UX. The cache table also gives implicit analytics on which combos are popular.

## D11: Real pricing data from Kinkade PDF
**Context**: Have actual Stone Martin pricing for the Kinkade plan at McClain Landing Phase 7.
**Decision**: Use real prices in the demo. This makes the price tracker authentic and demonstrates real business value. Prices valid through 2/12/2026.

## D12: Walk-through demo, not a pitch
**Context**: Original plan was a basic POC to pitch the concept. Realized building the real tool with full data is only marginally more effort (data entry + scraping are agent-parallelizable) and 10x more convincing.
**Decision**: Build the full option picker with all Kinkade PDF data, scraped swatch images, and ~6 pre-generated kitchen images. Walk the agent through real selections and hand her a generated output — demo the tool by using it, not by describing it.

## D13: ScrapingDog/Apify for swatch scraping
**Context**: Need swatch images from stonemartinbuilders.com/media/. Have ScrapingDog API with 700k credits and Apify available.
**Decision**: Use ScrapingDog or Apify to scrape swatch images. Avoids bot detection issues and is reliable for a one-time bulk scrape.

## D14: SHA-256 hash for image cache keys
**Context**: Initial implementation used a weak 32-bit DJB2 hash for cache keys. Code review flagged collision risk and inconsistency with architecture doc.
**Decision**: Switched to SHA-256 (truncated to 16 hex chars). Eliminates collision risk for any practical number of combinations.

## D15: Pin AI SDK versions
**Context**: `experimental_generateImage` is an experimental API. A caret-range dependency could pull a breaking update.
**Decision**: Pin `ai` and `@ai-sdk/openai` to exact versions. No `^` prefix. Prevents surprise breakage before a demo.

## D16: Layout-anchoring in image prompts
**Context**: Text-to-image produces different kitchen layouts for each generation, making material-swap comparisons confusing.
**Decision**: Anchor prompts with "L-shaped layout with center island", "shot from the living room", "eye-level camera angle". Produces more visually consistent outputs across selections.

## D17: Next.js 16 (not 15)
**Context**: `create-next-app@latest` installed Next.js 16.1.6 (current stable). Originally documented as Next.js 15.
**Decision**: Stay on Next.js 16. It's the current stable release and everything works correctly on it.

## D18: Room-based "visual tour" UI instead of category accordions
**Context**: The original UI was a 60/40 split — kitchen image left, accordion list of all categories right. Functional but felt like a form, not a sales tool. We have 6 real Kinkade plan photos showing different rooms.
**Decision**: Replaced the category-accordion layout with a room-based tour. Each photo maps to its relevant subcategories via `room-config.ts`. Users browse room-by-room, seeing the real space while choosing upgrades that affect it. Non-room categories go into a collapsed "Other Upgrades" section.
**Trade-off**: More complex component structure, but dramatically more visual and persuasive for the demo pitch.

## D19: SwatchGrid for visual options, CompactOptionList for non-visual
**Context**: The old UI used the same OptionCard component for everything — a vertical radio list. Visual options (12 cabinet colors, 17 countertops) looked like walls of text.
**Decision**: Visual subcategories with 3+ options render as a tappable swatch grid (paint-chip style). Non-visual/binary options use a compact single-line list. The `RoomSection` component decides which to use based on `isVisual` and option count.

## D20: Stone Martin logo uses currentColor
**Context**: The SM logo SVG uses `fill="currentColor"`, which means it inherits the text color of its container.
**Decision**: Keep this behavior — it adapts naturally to the navy header without needing separate light/dark variants.
