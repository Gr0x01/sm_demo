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
**Status**: Historical (Gemini-era strategy). Superseded by D41 for current OpenAI edit flow.
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

## D30: Product name — Finch
**Context**: Needed a product name. "UpgradeVision" was a working title.
**Decision**: Finch. Pending LLC registration. Short, memorable, not generic SaaS-sounding. Domain: withfin.ch

## D31: SM demo as sales tool, not the product
**Context**: Stone Martin uses BuilderLinq — they're unlikely to become a paying customer. But the demo is the most persuasive sales tool we have.
**Decision**: Keep SM demo alive and maintained. It's what we show every prospect. The product is Finch — multi-tenant, onboards multiple builders. SM demo is the proof-of-concept, not the product itself.

## D32: Builder demos as the repeatable unit
**Context**: Each builder prospect needs to see what Finch looks like with their floor plans and options.
**Decision**: Build lighter demos for each prospect — same bones as SM (step wizard, swatch grids, AI viz, price tracking) but less exhaustive data entry. SM had 350+ options and 166 scraped swatches; a prospect demo might have 50-100 options for the key visual categories. Enough to demonstrate the wow factor.

## D33: Brand subagents for Finch identity
**Context**: Building a real product needs consistent brand voice, copy, growth strategy, and legal compliance.
**Decision**: Added four specialized subagents: brand-guardian (visual identity and voice), copywriter (builder-facing copy), growth-hacker (acquisition and outreach), legal-compliance-checker (privacy, ToS, AI disclosure). These ensure consistency as we build marketing materials, landing page, and outreach.

## D34: Single Supabase project for multi-tenant
**Context**: Could use one Supabase project per builder or one shared project with RLS.
**Decision**: Single Supabase project, row-level security with `org_id` on every table. Simpler ops, shared infrastructure, central admin can query across all orgs. Split later only if a builder needs data residency or generates enough traffic to need isolation. See `product-architecture.md` for full schema.

## D35: Text PKs for categories/subcategories/options
**Context**: Migrating from static TypeScript to Supabase. Existing code uses string IDs everywhere — in `buyer_selections.selections`, `generated_images.selections_hash`, URL params, `photoBaseline` references.
**Decision**: Use text primary keys (the existing slug IDs) for categories, subcategories, and options tables. UUID PKs for organizations, floorplans, steps, step_sections, step_ai_config. Preserves all existing cache hashes and selection data without migration.

## D36: Subdomain routing for production URLs
**Context**: Builder demos need branded URLs. Options: path-based (`getfinch.app/stone-martin/kinkade`) vs subdomain (`stonemartin.getfinch.app/kinkade`).
**Decision**: Subdomains. Cleaner for builders — feels like their own tool. Proxy layer maps subdomains to Next.js path routes internally. No Next.js middleware needed.

## D37: Landing page copy — benefit-first, not personalized
**Context**: Landing hero had buyer's name ("May Baten's Upgrade Selections"). Needed something generic and compelling for demo purposes.
**Decision**: Heading: "See Your Kitchen Before You Choose". CTA: "Start the Demo". Benefit-first framing — emphasizes the AI visualization value prop. Brand guardian approved.

## D38: Org-scoped theming via CSS custom properties
**Context**: Need each builder demo to have their own brand colors and logo without component changes.
**Decision**: Store `primary_color`, `secondary_color`, `accent_color` (NOT NULL, CHECK hex format) and `logo_url` on the `organizations` table. Server component passes theme to client wrapper, which overrides `:root` CSS vars via inline `style`. Components reference `var(--color-navy)` etc. — zero hardcoded colors. Hover variant computed via `shiftHex()`.

## D39: 24-hour cross-request cache for catalog data
**Context**: Option data changes ~quarterly but every page load was hitting Supabase fresh. Traffic is ~1 visitor/day so short revalidation windows expire before the next visit.
**Decision**: Wrap all catalog queries (`getOrgBySlug`, `getFloorplan`, `getCategoriesWithOptions`, `getStepsWithConfig`) with `unstable_cache` at 24h revalidation. Cache tags allow instant invalidation when data changes. Interactive data (selections, AI generation) bypasses the cache entirely.

## D40: Step labels derived from step.name, not hardcoded slug maps
**Context**: `GenerateButton`, `PriceTracker`, `StepHero` each had hardcoded slug→label maps (`"design-your-kitchen"` → `"Kitchen"`). Breaks for new builders with different step slugs.
**Decision**: Derive labels from `step.name` (DB field). Pattern: `"Visualize My ${name}"`. Removes all three duplicate maps. Trade-off: labels like "Visualize My Design Your Kitchen" read slightly awkwardly — may add a `short_label` column later.

## D41: Individual swatch attachments with deterministic mapping
**Context**: Reliability issues showed up when material intent was ambiguous (wrong range style, wrong cabinet region, swapped fixture orientation). One root cause was weak swatch/item correspondence in the prompt.
**Decision**: Keep swatches as individual image attachments (not collage boards). Build the upgrade list in deterministic order and explicitly map each line item to `swatch #N` in the prompt. If a swatch file is missing, keep the item as text-only rather than silently dropping it.
**Trade-off**: Slightly longer prompts, but much stronger instruction grounding and fewer wrong-surface edits.

## D42: Global fixed-geometry invariants for kitchen object stability
**Context**: Common regressions included extra cabinet panels, island color bleeding to perimeter cabinets, sink/faucet flips, and refrigerator/range movement.
**Decision**: Add reusable hard constraints to prompt generation:
- Global: preserve object counts, cabinet geometry, and layout; under-edit instead of moving objects.
- Subcategory-specific invariants: cabinet vs island boundaries, sink/faucet orientation lock, dishwasher slot lock, refrigerator alcove lock, and range cutout/type lock.
Apply these invariants whenever the corresponding subcategory is in the current visual selection set.

## D43: Reduce prompt noise by not force-sending unchanged kitchen selections
**Context**: Force-sending unchanged selections can trigger unnecessary edits and amplify hallucinations.
**Decision**: Remove `kitchen-island-cabinet-color` and `range` from `ALWAYS_SEND`. Only include them when they differ from photo baseline/default (or are otherwise explicitly changed).
**Trade-off**: Fewer "reminder" instructions for unchanged features, but better edit precision and less collateral drift.

## D44: Prompt-semantic cache versioning in generation hash
**Context**: Prompt and pipeline fixes were being deployed correctly, but users still saw old bad outputs because cache keys only included selections + model.
**Decision**: Add `_cacheVersion` to generation/check hash inputs and bump it whenever prompt semantics or generation behavior changes. Implemented via `GENERATION_CACHE_VERSION` in `src/lib/generate.ts`, used by both `/api/generate` and `/api/generate/check`.
**Trade-off**: Old cached rows are bypassed after each bump (higher temporary generation cost), but fixes become immediately visible and debuggable.

## D45: Conditional two-pass masked refinement for stubborn geometry failures
**Context**: Some appliance failures persisted even with stronger prompt constraints (example: slide-in range still rendering with freestanding backguard).
**Decision**: Keep normal full-room edit as pass 1, then run a targeted pass 2 only for known failure cases. Pass 2 uses a localized mask + narrow object-only prompt + lower input fidelity to permit geometry correction while preserving surroundings.
**Current scope**: Slide-in range correction on `/rooms/kitchen-close.webp` when `range` is a slide-in option.
**Trade-off**: Higher latency/cost when fallback triggers, but significantly better reliability on high-impact visual correctness issues.

## D46: Isolate slide-in range edits from global finish pass to stop island-front drift
**Context**: On `/rooms/kitchen-close.webp`, slide-in range correction and island-front cabinet fidelity were competing. A broad pass-2 mask could stabilize the range but mutate island panel geometry; a narrow mask could preserve island fronts but sometimes drop or weaken the range.
**Decision**: For the slide-in range fallback path, remove `range` from pass 1 selections and handle it only in pass 2 with a dedicated range-region mask and explicit "do not alter foreground island cabinetry" constraints.
**Implementation notes**:
- Route logic computes `primaryPassSelections` and excludes `range` only when slide-in fallback is active.
- Pass 2 prompt includes both positive constraints (range remains clearly present, single-oven, no backguard) and negative constraints (no edits to island-front cabinetry / below island countertop plane).
- Cache version was bumped so stale pre-fix outputs are never reused for diagnosis.
**Trade-off**: Adds complexity and one extra generation pass for this specific case, but removes the "either oven or island-front correctness" failure mode.

## D47: Anonymous sessions replace BUYER_ID hack
**Context**: SM demo used a hardcoded `BUYER_ID = "may-baten"` constant and a `buyer_selections` table. This doesn't scale to multi-tenant — every visitor would share the same row.
**Decision**: Replace with anonymous `buyer_sessions` rows. Each visitor gets a unique session, stored in a cookie scoped to `/{orgSlug}/{floorplanSlug}`. No auth required for buyers. SM demo now uses the same flow as all V1 builders.
**Trade-off**: More complex session lifecycle (cookie read → load → create) but works for all orgs identically.

## D48: Server-side price calculation for buyer sessions
**Context**: Auto-save could trust the client-sent total price, or compute it server-side.
**Decision**: Server computes `total_price` from `selections + quantities + categories` via the existing `calculateTotal` function. Client still computes locally for instant display, but the DB value is authoritative. Uses `getCategoriesForFloorplan` (floorplan-scoped) for accuracy.
**Trade-off**: One extra query per save (cached categories), but ensures admin dashboard reports are accurate and not client-manipulable.

## D49: Resume token architecture — no session merging
**Context**: When a buyer saves their email, they could get a merged session (combining anonymous + any previous email-linked session) or keep separate sessions.
**Decision**: No merging. Each `save-email` call attaches the email + a new `crypto.randomBytes(32).toString('hex')` token to the current session only. Multiple saves from the same email create independent sessions. Resume-by-email returns the most recently updated session.
**Trade-off**: Simpler logic, no data loss from merge conflicts. Slightly more DB rows. Admin dashboard shows all sessions.

## D50: generation_count deferred to Workstream D
**Status**: SUPERSEDED by D70. Column dropped — generation caps removed entirely.

## D51: Resend for transactional email
**Context**: Need to send resume links to buyers. Options: Resend, SendGrid, SES, Postmark.
**Decision**: Resend. Simple API, good DX, generous free tier (100 emails/day). Lazy-initialized client singleton to avoid build-time failures when `RESEND_API_KEY` is not set. Fire-and-forget — save succeeds even if email delivery fails.
**Trade-off**: External dependency, but email is table-stakes for buyer persistence.

## D52: Magic link + OTP instead of email/password for admin auth
**Context**: Building admin auth for builder onboarding. Email/password adds friction (password management, reset flows). Solo developer — no need for complex auth.
**Decision**: Supabase `signInWithOtp` with PKCE flow. Login page shows email input → sends magic link + 6-digit OTP code. After sending, shows OTP code input (works from any browser) with magic link as secondary option (same-browser only due to PKCE `code_verifier` cookie). Custom dark-themed email template with OTP prominent.
**Trade-off**: Requires email delivery (slight latency), but zero password UX, no reset flows, and OTP fallback eliminates the same-browser PKCE limitation.

## D53: Invite flow with pending org_users rows
**Context**: Original admin setup used a hardcoded DB trigger mapping `gr0x01@pm.me` → Stone Martin org. Doesn't scale to multiple builders.
**Decision**: Invite flow via `POST /api/admin/invite`. Inserts `org_users` row with `user_id=NULL`, `invited_email`, `invited_at`. Generic `link_pending_invites` trigger on `auth.users` INSERT matches by email and links the user. If invitee already has an auth account, `get_auth_user_id_by_email` RPC links them directly at invite time (no trigger needed). Invite email sent via Resend.
**Trade-off**: Slightly more complex than hardcoded trigger, but scales to any number of builders and provides audit trail.

## D55: Session-scoped feedback, not cache deletion
**Status**: SUPERSEDED by D70. `generation_feedback` table dropped. Retry flow now simply deletes the cached `generated_images` row and regenerates.

## D56: Atomic credit reservation via Postgres RPC
**Status**: SUPERSEDED by D70. `reserve_generation_credit` and `refund_generation_credit` RPCs dropped. No per-session credit tracking.

## D57: DB-based dedup via __pending__ placeholder rows
**Context**: In-memory `Set<string>` for duplicate prevention only works on a single serverless instance. Concurrent requests on different instances can generate duplicates.
**Decision**: Insert a placeholder row (`image_path = "__pending__"`) into `generated_images` before generating. Postgres `UNIQUE(selections_hash)` prevents duplicates across instances. On success, upsert replaces placeholder. On failure, placeholder is cleaned up. Stale placeholders (>5 min, safely above `maxDuration: 120s`) are cleaned up before claiming.
**Trade-off**: Extra DB round-trip per generation, but eliminates cross-instance duplicate work.

## D58: Model passed through, not hardcoded
**Context**: OpenAI releases new models every few months. Hardcoding `"gpt-image-1.5"` means a code change to test or swap models.
**Decision**: Model name comes from request body (default: `"gpt-image-1.5"`), stored in cache hash so different models get separate cache entries. No dual API path (gpt-5.2 Responses API not implemented yet — will add when needed). Client can pass any model string.
**Trade-off**: No validation on model names — bad model string will fail at OpenAI. Acceptable since this is only used internally.

## D59: Per-step capability check, not global flag
**Context**: Some steps have `step_photos` (multi-tenant per-photo generation) and others don't.
**Decision**: Check `step.photos?.length > 0` per step rather than a global `isMultiTenant` flag. Steps without photos fall back to existing SM-style hero image display. SidebarPanel renders StepPhotoGrid or StepHero based on this check.
**Trade-off**: Mixed-mode steps within the same floorplan are possible (some photo-based, some hero-based). Fine for gradual migration.

## D60: SM migrated to full multi-tenant generation
**Context**: SM was using a legacy code path (`/api/generate`) that hardcoded `SM_ORG_SLUG`, read hero images from the filesystem, and had a slide-in range two-pass refinement. Meanwhile, the multi-tenant `/api/generate/photo` route was fully built. The only missing piece was `step_photos` rows for SM.
**Decision**: Created `scripts/migrate-sm-storage.ts` to upload SM's static assets (room photos + swatches) to Supabase Storage and create `step_photos` rows. Once SM steps have photos, UpgradePicker automatically switches to the multi-tenant path (`step.photos?.length > 0`). Deleted legacy routes, `GenerateButton.tsx`, filesystem swatch fallback in `generate.ts`. Added mobile `StepPhotoGrid` to replace the removed mobile generate button.
**Trade-off**: Slide-in range two-pass masked refinement is lost (only existed in legacy route). Text-based invariant rules remain. May need to implement pass-2 in the multi-tenant route later if results regress. SM generation cap raised to 100 (from 20) for sales demos.

## D54: Finch Demo sandbox org
**Context**: Need a safe place for prospects and testers to explore the admin without touching Stone Martin's real data.
**Decision**: Created "Finch Demo" org with slug `demo`. Owner (gr0x01@pm.me) is admin on both orgs. Login shows org picker when user has multiple orgs. Invite anyone to demo org without risk to SM data.

## D61: Internal per-photo generation policy layer (DB-backed)
**Context**: Tenant/photo-specific fixes (Stone Martin kitchen fridge alcove, slide-in range refinement) were leaking into global prompt logic. This conflicts with multi-tenant architecture and Concierge setup quality standards.
**Decision**: Add internal per-photo policy resolution for `/api/generate/photo` and `/api/generate/photo/check`.
- New table: `step_photo_generation_policies` with `policy_json` (prompt overrides + optional second-pass config).
- Resolver order: DB policy (active row) first, code fallback second.
- Policy key participates in cache hash (`_promptPolicy`).
**Trade-off**: More moving parts (policy schema + parser), but isolates tenant-specific behavior and keeps global defaults clean.

## D63: Temporary stripped-down homepage for SM prospect talks
**Context**: Stone Martin (30+ floorplans, real interest) is evaluating Finch. The full homepage (pricing tiers, ROI calc, FAQ) would scare them — looks like a big company selling enterprise SaaS. The page is for 1-2 curious SM team members who type `withfin.ch` after using `stonemartin.withfin.ch`.
**Decision**: Two-column layout: left column has short personal intro + interactive demo (auto-loaded sample kitchen via `autoSample` prop), right column is the full options picker, vertical rule divider between them. `DemoClient` gained `bare`, `autoSample`, and `headerContent` props. Full marketing homepage preserved at `src/app/landing-full.tsx` — restore by renaming to `page.tsx`.
**Copy rules learned**: Never say "AI" in customer-facing copy. Don't lecture builders about their business. Don't be condescending about their process. Tone is tinkerer/passion, not critic/salesperson. Contact email: `hello@withfin.ch`.
**Trade-off**: Temporary. Full homepage is 100% coming back for non-SM prospects.

## D62: Prompt context hash includes scene/hint inputs
**Context**: Editing `scene_description`, `photo_baseline`, or `step_photos.spatial_hint` could still hit old cache entries when selections were unchanged.
**Decision**: Add `_promptContext` to generation/check hash, built from:
- `scene_description`
- `step_photos.photo_baseline`
- `step_photos.spatial_hint`
- `steps.spatial_hints` map
Also wire `step_photos.spatial_hint` into prompt context text (`PHOTO_SPATIAL_HINT`).
**Trade-off**: More cache misses after prompt-context edits (expected), but behavior now matches operator intent and avoids stale outputs during tuning.

## D64: Self-hosted image generation — evaluated, not viable yet
**Context**: Adding 2+ new SM floorplans means hundreds of batch generations. At $0.20/image (gpt-image-1.5), costs add up. Evaluated open-source models on RunPod A100 80GB to find a cheaper alternative.

**Models tested**:
1. **FLUX.1 Fill** — Mask-based inpainting. FAILED. Requires per-region masks. Our pipeline sends 10-15 simultaneous material changes with NO mask — fundamentally incompatible. With full white mask, generates entirely new images instead of editing.
2. **OmniGen2** (7B, Apache 2.0) — Maskless instruction-based editing with reference image support (`<img0>`, `<img1>` syntax). PARTIALLY WORKED. Single-surface swaps (countertops) showed 80-90% quality. But: can't reliably target "all cabinets" (changes island, ignores wall cabinets), multi-change causes scene drift (backsplash/wall/floor colors shift), and tested with only 2-3 reference images. Our real pipeline sends 10-15 swatches simultaneously — a non-starter.
3. **FLUX Kontext** — Best quality, but $999/mo commercial license. Rejected.
4. **Qwen-Image-Edit** — No reference image support. Can't use swatches.

**Key finding**: What makes gpt-image-1.5 uniquely valuable for our use case is its ability to digest 10-15+ reference swatch images in a single prompt and apply them all precisely while preserving room layout. No open-source model can do this today. This isn't a "80% quality" problem — it's a capability gap.

**Decision**: Stay on gpt-image-1.5 for now. Revisit when open-source multi-reference editing matures. OmniGen2 is brand new (Feb 2025) — this space is moving fast.

**RunPod**: Account active with ~$40 remaining credit. Pod `tq98greyvm3tel` stopped (volume with OmniGen2 weights preserved). Can resume testing when new models drop.

**Test outputs**: `scripts/omnigen2-test-outputs/` — 10 test images across two rounds of parameter tuning.

## D65: Room photo pipeline is Finch-managed, not builder self-serve
**Context**: The admin panel has a PhotoManager component for uploading room photos, editing spatial hints/baselines, running quality checks, and toggling hero photos. Considered making this builder-facing. But the photo pipeline is the hardest part of setup — photo evaluation/rejection, masking, spatial hints, baselines, test generation, prompt tuning, iteration. Bad inputs directly tank generation quality. Builders shouldn't have to think about this.
**Decision**: Room photo pipeline is a Finch-managed service. Builders contact us to add/change room photos. Admin PhotoManager stays as internal tooling (no need to polish UX or add builder guardrails). Builders self-serve on the easy stuff: options, swatches, prices, step names, section assignments.
**Pricing impact**: Per-floorplan setup fee required (covers 10 room photos through the full pipeline). Monthly price pushed higher by ongoing photo support commitment. The real unit of setup cost is the room photo, not the floorplan — a plan with 2 photos is dramatically less work than one with 8.
**Trade-off**: Creates a service dependency (builders can't add rooms without us), but that's also a retention lever and ensures generation quality stays high. The "we handle the hard part" positioning is a feature, not a limitation.

## D66: Pricing — $1,500 setup (3 plans) + $500/mo/plan, unlimited generations
**Context**: Needed concrete pricing that (a) covers real costs, (b) targets 3x ROI for builders, (c) incentivizes starting with multiple plans. Photo pipeline is the real setup labor (D65), generation is full-cost gpt-image-1.5 at $0.20/image (D64 — no self-hosted alternative).
**Decision**:
- $1,500 setup includes 3 floor plans (10 room photos each, full pipeline)
- $500/mo per floor plan
- Additional floor plans: $1,500 setup + $500/mo
- **Unlimited buyer visualizations. No credit caps. No metering.** Flat rate, full experience. Generation costs are our problem — managed internally through pre-caching (batch API) and permanent cache.
- **Stone Martin**: 5 floor plans free for 1 year (they're the case study, not a paying customer)
**Why no cap**: Simpler pitch, no awkward conversations about credits or cache mechanics. At $1,500/mo revenue (3 plans) vs ~$150/mo generation COGS, there's plenty of margin to absorb heavy usage. Every on-demand generation becomes a permanent cached image, so costs decline naturally. Internal soft limits if truly needed — but never exposed to the builder.
**Why 3 plans bundled**: First plan is the real onboarding work (org setup, catalog transcription, photo pipeline). Plans 2-3 reuse the same option catalog — just different room photos. $1,500 for 3 nudges builders to start bigger.
**ROI math**: 3x ROI at ~60 homes/year on 3 plans (10% upgrade lift on $10K avg). At 15% lift, 40 homes/year hits 3.1x. Targets builders doing 50+ homes/year.
**Our margins**: Setup hard costs ~$300 (batch generation). Monthly COGS ~$100-150 (on-demand gen + infra). Revenue $1,500/mo (3 plans). Monthly margin ~$1,300-1,350.
**Trade-off**: $500/mo targets 50+ home builders. Smaller builders (<40 homes/yr) won't hit 3x ROI at 10% lift. Pilot program (first plan free) de-risks for everyone.

## D67: Photo-level scope/scene/hints are authoritative over step-level fallbacks
**Context**: Multi-photo steps were leaking step-level context into unrelated photos (e.g., fireplace receiving kitchen instructions, bedrooms inheriting hero-shot scene text).
**Decision**:
- If `step_photos.subcategory_ids` exists, it is the complete allowed scope for that photo (no merge with `steps.also_include_ids`).
- Scene context prioritizes `step_photos.photo_baseline`; `steps.scene_description` is fallback only when photo baseline is empty.
- `steps.spatial_hints` are filtered to the photo scope before prompt build/hash.
- Added admin editing for `step_photos.subcategory_ids` so photo scope can be tuned without SQL.
**Trade-off**: Requires more curation per photo, but eliminates cross-room contamination and makes prompts predictable.

## D68: Flooring selection is resolved deterministically per bedroom-context photo
**Context**: Bedroom photos were receiving conflicting flooring instructions (`carpet-color` + `main-area-flooring-color`) or missing carpet context, causing hard-surface outputs when carpet was expected.
**Decision**:
- Add shared resolver (`src/lib/flooring-selection.ts`) used by client fingerprinting + server generate/check:
  - In bedroom-context photos, keep exactly one effective flooring material instruction.
  - Keep hard-surface only when flooring type explicitly targets primary/whole-house hard-surface (or `carpet-none`).
  - Otherwise keep carpet and drop main-area flooring color from prompt selections.
- Force-send flooring control subcategories in picker filtering when in-scope (`carpet-color`, `main-area-flooring-type`, `main-area-flooring-color`).
- Update prompt rules to explicitly prevent doorway bleed into bathroom tile zones.
**Trade-off**: Adds domain-specific flooring logic, but removes ambiguity from model instructions and improves repeatability.

## D69: SM flooring reliability required data + code alignment
**Context**: Prompt behavior depends on both code and admin/DB config. Direct DB edits can leave stale assumptions if subcategory generation hints or per-photo baselines are misaligned.
**Decision**:
- Set `carpet-color` and `main-area-flooring-type` to `generation_hint = always_send` (SM org).
- Rewrite `set-your-style` flooring spatial hint to conditional wording (hard-surface only where selected type applies).
- Update photo-level baselines/hints/scopes for: `Fireplace`, `Bath & Closet`, `Shower`, `Vanity`, `Secondary Bedroom`, `Primary Bedroom`.
- Bump cache version across prompt-semantic changes (`v9` → `v13`) to avoid stale outputs.
**Trade-off**: More operational tuning per floorplan, but materially better floor-material correctness and less hallucinated cross-room edits.

## D70: Remove per-session generation cap — unlimited visualizations
**Context**: Pricing decision D66 set unlimited buyer visualizations with no credit caps. The `generation_cap_per_session` column, `generation_count` tracking, `generation_feedback` table, and `reserve_generation_credit`/`refund_generation_credit` RPCs were infrastructure for a cap that's no longer enforced. Generation costs roll into monthly pricing.
**Decision**: Removed all cap/credit infrastructure:
- DB: dropped `generation_cap_per_session` (organizations), `generation_count` (buyer_sessions), `generation_feedback` table, both credit RPCs
- API: removed cap checks, credit reservation, `creditsUsed`/`creditsTotal` from responses
- Client: removed credits meter, cap-reached banners, `SET_CREDITS` action, `generationCredits` state
- Feedback route simplified to just delete cached image row (no credit accounting)
- `/try` demo page's local cookie-based 5-generation cap intentionally preserved (separate mechanism)
**Supersedes**: D50, D55, D56.
**Trade-off**: No per-session usage limits. Internal monitoring via PostHog if abuse becomes a concern. Permanent cache means costs decline naturally over time.

## D71: Drop setup fee — $500/plan/mo flat, minimum 3 plans
**Context**: Original pricing (D66) was $1,500 setup (3 plans) + $500/mo/plan. After building Lenox (second floorplan), realized setup is largely automated: LLM converts PDFs to structured data, scraping handles swatches, prompt playbook handles 90% of tuning. Actual hard cost per plan setup is ~$50-100 in generation + 2-4 hrs. The setup fee was solving a problem that doesn't exist.
**Decision**:
- **Drop all setup fees.** $500/mo per floorplan, minimum 3 floorplans ($1,500/mo floor).
- 12-month commitment after pilot conversion. Can add plans anytime, can't drop below 3.
- Pilot: 1 floorplan free, 60 days. Hard cost ~$100-200 (customer acquisition cost).
- No volume discounts published. Only offer in exchange for commitment (more plans, annual terms).
**Why**: (1) Setup costs are low and automated — fee isn't needed for cost recovery. (2) Removing it collapses the sales cycle to a one-sentence pitch. (3) Makes us harder for competitors to undercut on price surface area. (4) Speed to 20 builders matters more than $50K in setup fees (1% of $5M exit target). (5) Builders negotiate everything — two numbers = two things to negotiate. One number = take it or leave it.
**Supersedes**: D66 setup fee structure. Monthly pricing unchanged.
**Trade-off**: Lose ~$50K in setup fees across 20 builders. Gain faster sales cycle, simpler pitch, competitive defensibility. Every builder signed faster is one a competitor can't sign.
**Exit framing**: Target $5M exit at 8-10x ARR. Need ~20 builders × 5 plans avg = $600K ARR. Achievable in 2-3 years at 1-2 new builders/month.

## D72: Inngest for background image generation
**Context**: Image generation ran inline in API routes (30-120s+). This blocked Vercel functions for the entire duration, hit the 120s timeout on two-pass kitchen generations, and meant client requests hung for the full generation time.
**Decision**: Move all image generation to Inngest background functions. API routes become thin orchestrators: validate → claim `__pending__` slot → dispatch event → return 202. Client polls `/check` (existing pattern). Each Inngest `step.run()` gets its own 120s Vercel function invocation, so two-pass generations (previously ~176s, exceeding 120s limit) now work on Vercel.
**Functions**: `generate-photo` (3 steps: generate → refine → persist, retries: 2, concurrency: 5), `generate-demo` (2 steps: generate → persist, retries: 2, concurrency: 3).
**Trade-off**: Adds Inngest as infrastructure dependency. Gains: no more Vercel timeout failures, client never blocks on generation, automatic retries, concurrency control, observable via Inngest dashboard.

## D74: Replace OpenAI gpt-image-1.5 with Gemini gemini-3-pro-image-preview as primary image generator
**Context**: D73 validated Gemini as production-viable (~28% cheaper per pass, 2-3x faster, comparable quality). But Gemini has a hard 14-image input limit (1 room photo + 13 swatches max). Some SM photos have up to 23 swatches when buyer customizes everything.
**Decision**: Replace OpenAI with Gemini as the primary image generator. Auto multi-pass splitting handles photos that exceed the 13-swatch limit:
- `splitSelectionsForGemini()` separates swatch-bearing vs non-swatch selections, chunks swatch-bearing into groups of ≤13
- Each batch gets its own Inngest step (`generate-1`, `generate-continuation-N`) with its own 120s timeout
- Batch assignments computed once in step 1 and serialized (not re-derived from DB between steps)
- Intermediate images stored in Supabase temp storage (not step state) to avoid Inngest's 4MB limit
- Temp files cleaned up in persist step
- Policy second pass (refine) runs after all swatch batches, unchanged
- `models` field cleared from all DB generation policies so second pass fires for any model
- `resolveImageModel()` shared by generate + check routes prevents hash mismatch
- DB upsert failures now throw (trigger Inngest retry) instead of silent log
**Cost**: 1-pass photos ~$0.144 (28% cheaper than $0.20). 2-pass photos ~$0.288 (only 2 SM photos worst case). Average generation is cheaper. Speed: 25-41s vs 60-120s.
**Supersedes**: D25 (OpenAI gpt-image-1.5 as primary). OpenAI package kept installed as fallback.
**Files changed**: `src/lib/gemini-image.ts` (new), `src/lib/models.ts`, `src/lib/posthog-server.ts`, `src/inngest/functions/generate-photo.ts`, `src/inngest/functions/generate-demo.ts`, `src/app/api/generate/photo/route.ts`, `src/app/api/generate/photo/check/route.ts`, `src/lib/demo-generate.ts`.

## D73: Gemini Nano Banana Pro validated as production-viable alternative to gpt-image-1.5
**Context**: D64 evaluated self-hosted models (FLUX, OmniGen2, Kontext, Qwen) — all failed because they can't handle 10-15 simultaneous swatch references. Needed to test Gemini 3 Pro Image ("Nano Banana Pro") using the real production pipeline, not text descriptions.

**Test script**: `scripts/test-gemini-nano-banana.ts` — uses actual `buildEditPrompt()`, production scoping, DB-backed generation policies, real SM Kinkade room photo + swatches from Supabase.

**Critical bugs found during testing**:
1. `@google/genai` SDK expects `config.imageConfig` (not `imageGenerationConfig`). Wrong key was silently ignored — aspect ratio never applied. This was the root cause of portrait/collage outputs in v2 tests.
2. Gemini needs explicit anti-collage/composition instructions in the prompt. No API parameter exists to prevent split-screen/before-after output. Added `GEMINI_OUTPUT_PREAMBLE` wrapper.

**v3 results (both bugs fixed, `imageSize: "1K"`, `aspectRatio: "3:2"`)**:

| Metric | gpt-image-1.5 | Gemini 1K | Gemini 2K |
|---|---|---|---|
| Speed | 60-120s | **25-41s** | 37-58s |
| Resolution | 1536x1024 | 1264x848 | 2528x1696 |
| Cost/image | $0.20 | ~$0.144 | ~$0.134 |
| Aspect ratio | Reliable (`size` param) | Reliable (`imageConfig`) | Reliable (`imageConfig`) |
| Max input images | ~10 | 14 | 14 |

All 5 v3 tests produced correct 3:2 landscape output at consistent quality. Full kitchen (8 swatches) completed in 41s vs 60-120s for gpt-image-1.5.

**Decision**: Gemini Nano Banana Pro is validated as a production-viable alternative. Faster, cheaper (28% savings), higher max swatch count. Quality is comparable. Next step: build a Gemini code path in the production route with model selection, and offer 2K as a premium tier.

**Key learnings**:
- Use `@google/genai` SDK directly, not Vercel AI SDK (better control, no abstraction bugs)
- `imageConfig` (not `imageGenerationConfig`) for aspect ratio/size
- `imageSize: "1K"` | `"2K"` | `"4K"` — 1K is the sweet spot for cost/speed/quality
- Prompt preamble needed: explicit "single image, no collage, preserve full field of view" instructions
- `responseModalities: ["IMAGE"]` for image-only output

**Test outputs**: `scripts/nano-banana-test-outputs/` — v3 results with prompts, swatches, and output images.

## D75: Persist and expose per-pass generation artifacts in admin
**Context**: Multi-pass generation (batch split + policy refine + range-lock) could appear opaque because only the final image was visible. Temp pass images were cleaned up, making it hard to determine whether a later pass was a no-op, fallback, or actual correction.
**Decision**:
- Persist pass outputs as debug artifacts in Supabase Storage under `generated-images/{orgId}/debug/{selectionsHash}/...`.
- Record artifact metadata in `generated_images.selections_json._debugPassArtifacts`.
- Extend `/api/admin/images` GET response to include intermediate pass URLs.
- Update admin image details UI to render an "Intermediate Passes" section.
- Keep deleting debug artifacts together with the final image on single-delete and delete-all.
**Trade-off**: Slightly higher storage footprint per generation, but materially better observability and faster root-cause analysis for geometry/edit drift issues.
