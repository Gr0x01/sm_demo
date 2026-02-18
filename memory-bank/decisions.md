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

## D21: Step-based wizard replaces room-based tour
**Context**: The room-based tour (6 photos, RoomStrip) was replaced with a 5-step wizard that groups subcategories into logical themes (style, kitchen, bath, secondary, finishing). This gives a clearer progression and works better with the sidebar layout.
**Decision**: 5 steps in `step-config.ts`. StepNav replaces RoomStrip. All subcategories mapped to steps (no "Other Upgrades" overflow).

## D22: Two-column sidebar layout
**Context**: Single-column layout put the image at top, options in a huge scrollable middle, and total/continue at the bottom. Users couldn't see visual feedback while making selections.
**Decision**: Desktop (lg+) gets a sticky left sidebar (340px) with AI image, generate button, section quick-nav (IntersectionObserver), total, and continue button. Right column scrolls with options. Mobile (<lg) falls back to single column with hero on top and sticky PriceTracker at bottom.

## D23: AI generation on all visual steps (1-4), not just kitchen
**Context**: AI generation was kitchen-only (step 2). But users pick flooring, cabinets, and paint on step 1 that also affect the kitchen visualization.
**Decision**: Enable `showGenerateButton: true` on steps 1-4. All feed the same kitchen generation endpoint — visual subcategories from any step contribute to the prompt. Step 5 (electrical/exterior) has no visual generation.

## D25: OpenAI gpt-image-1.5 for generation (via images.edit)
**Context**: Originally used gpt-image-1 (OpenAI) for text-to-image. Switched to Gemini for multimodal input. Tried Gemini 3 Pro Image Preview ("Nano Banana Pro") — it worked but had issues: inconsistent output format (PNG vs JPEG randomly), perspective shifts (generated new compositions instead of editing), and Supabase upload failures when it returned large PNGs.
**Decision**: Use OpenAI `gpt-image-1.5` via the dedicated `images.edit` endpoint. Sends room photo + swatch images as an array of files. 1536x1024, quality "high". Uses the `openai` SDK directly (not Vercel AI SDK — it doesn't wrap the edit endpoint).
**Trade-off**: OpenAI API key required + higher cost than Gemini, but dramatically better: dedicated edit API preserves perspective, consistent PNG output, better instruction following, spatial placement works with prompt hints.

## D26: Per-step generated images (not shared)
**Context**: Originally had a single `generatedImageUrl` in state — generating on any step overwrote the image from other steps.
**Decision**: Changed to `generatedImageUrls: Record<stepId, string>`. Each step's generation is stored independently. Cache restoration on refresh checks each step's selections separately via `/api/generate/check`.

## D27: highImpactIds for swatch image budgeting
**Context**: Step 1 has ~20 visual subcategories. Sending all swatch images to the AI caused Gemini 500 errors (too many images). But being too conservative (4-5 swatches) left out important visible elements like hardware, lighting, trim.
**Decision**: Each step in `step-config.ts` has a `highImpactIds` array listing subcategories that get swatch images sent to the AI (9-13 per step). Others are described in text only. Curated based on what's actually visible in each room photo — e.g., step 1 (greatroom) skips carpet (not visible in photo) but includes wainscoting, baseboard, lighting, fan.

## D24: No border-radius in UI
**Context**: The design uses sharp corners throughout for a clean, architectural feel.
**Decision**: No `rounded`, `rounded-lg`, etc. on any elements. Sharp corners everywhere.

## D28: input_fidelity "high" + surgical prompt for image preservation
**Context**: gpt-image-1.5 was losing details like cabinet pulls, flattening shaker panel door geometry, and adding extra cabinets. Long preservation lists in the prompt paradoxically drew the model's attention to those elements.
**Decision**: (1) Added `input_fidelity: "high"` to the images.edit call — OpenAI's dedicated parameter for preserving input details. (2) Rewrote prompt to "surgical precision" pattern: short, direct, "change ONLY these surfaces" framing with explicit count constraints instead of long enumeration. (3) Added one targeted line for cabinet door geometry preservation.
**Trade-off**: ~$0.04-0.06 extra per request. Worth it for demo quality.

## D29: GPT-5.2 via Responses API as test path
**Context**: gpt-image-1.5 is "almost good" but not production-quality. Tested GPT-5.2 (reasoning model) via Responses API with image_generation tool for better instruction following.
**Decision**: Added `&model=gpt-5.2` URL param to toggle. GPT-5.2 produces better detail preservation. For demo, 1.5 is sufficient. Production would need per-surface masking, multi-pass inpainting, or a fine-tuned model. Cache hash includes model name to avoid collisions between models.
