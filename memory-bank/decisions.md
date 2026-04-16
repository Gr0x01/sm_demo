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

## D74: Replace OpenAI gpt-image-1.5 with Gemini gemini-3-pro-image-preview as primary image generator — REVERTED (D77)
**Context**: D73 validated Gemini as production-viable (~28% cheaper per pass, 2-3x faster, comparable quality). But Gemini has a hard 14-image input limit (1 room photo + 13 swatches max). Some SM photos have up to 23 swatches when buyer customizes everything.
**Decision**: Replace OpenAI with Gemini as the primary image generator. Auto multi-pass splitting handles photos that exceed the 13-swatch limit.
**Outcome**: Reverted in D77. Gemini hallucinated unpredictably in production — random room layout mutations that couldn't be prevented with prompt engineering. OpenAI gpt-image-1.5 restored.

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

## D76: Separate domain for cold email outreach
**Context**: Need to do cold outreach to builders. Sending cold emails from `withfin.ch` risks damaging primary domain reputation (spam complaints, bounces).
**Decision**: Registered `heyfin.ch` as dedicated cold email domain. Warming with Mailreach.co before sending. DNS on Vercel (same as primary, no Cloudflare needed — no wildcard subdomains on this domain).
**Trade-off**: Extra domain cost and setup overhead vs. protecting `withfin.ch` deliverability for transactional emails (resume links, admin invites, etc.).

## D77: Revert Gemini back to OpenAI gpt-image-1.5
**Context**: D74 migrated to Gemini `gemini-3-pro-image-preview` ("Nano Banana Pro"). While benchmarks showed faster/cheaper generation, production usage revealed unpredictable hallucinations — random room layout mutations, furniture appearing/disappearing, spatial distortions that couldn't be prevented with prompt engineering. The anti-mirror guard (966d364) and fireplace fixes (4a5a619) were attempts to patch individual failure modes, but the core issue was Gemini's inconsistency across diverse room types and selection combinations.
**Decision**: Revert to OpenAI `gpt-image-1.5` as primary image generator. Deleted `gemini-image.ts`, restored 3-step Inngest flow (generate → refine → persist), removed multi-pass swatch splitting, mirror detection, and temp storage. All model-agnostic improvements preserved (selection reconcile, photo scoping, fireplace propagation, prompt hardening, UI polish).
**Trade-off**: ~2x slower (~60-120s vs 25-41s), ~28% more expensive per pass. But reliable output — gpt-image-1.5 doesn't hallucinate room layouts. Speed is the main pain point now (~2 min for photos with second-pass policies).
**Supersedes**: D74 (Gemini as primary). D73 validation results still accurate for benchmarks but Gemini is not reliable enough for production use.
**Status of Gemini**: `@google/genai` moved to devDependencies. Test script (`scripts/test-gemini-nano-banana.ts`) retained for future re-evaluation. Revisit when Gemini image editing stabilizes.

## D78: Data-driven photo scope and conditional prompt rules
**Context**: Photo scope (`photo-scope.ts`) had 78 lines of hardcoded filename guards, and `generate.ts` had 40+ lines of slug-based conditional prompt rules. Neither worked for new builders.
**Decision**: Move both to DB-driven systems:
- `subcategories.generation_rules_when_not_selected` — catalog-level negative guards ("wainscoting OFF = don't add paneling"). Fires for any photo where the subcategory is in scope but not selected.
- `step_photos.subcategory_ids` — explicit photo scope override. Null means "inherit from step sections" (default for new builders). Only set when manually narrowing scope.
- `subcategories.generation_rules` — already existed, now populated for common-wall-paint, accent-color, wainscoting, fireplace-mantel-accent with the rules previously hardcoded.
**Scope semantics**: `getPhotoScopedIds(photo.subcategory_ids, fallbackSectionIds)` — explicit IDs take priority, step sections are fallback. New photos inherit scope automatically; admin sets explicit IDs only for unusual shots.
**Rule layering** (from general to specific): subcategory.generationRules → subcategory.generationRulesWhenNotSelected → option.generationRules → step_photo_generation_policies (per-photo overrides). All coexist; Sets deduplicate.
**Trade-off**: Slightly more DB state to maintain vs. zero code changes for new builders.
**Admin UI**: Admin API + UI now exposes `generation_rules`, `generation_rules_when_not_selected`, `generation_hint`, `is_appliance` on subcategories and `generation_rules` on options. Zod schemas updated so these fields aren't stripped. Subcategory rows have a collapsible "AI Rules" panel (sparkles icon); option editor modal has a generation rules textarea. Conditional interaction logic (e.g., wall paint vs accent color) expressed in rule text as natural language — AI evaluates by reading the edit list, no code branches. Authoring model: human or LLM writes rules during onboarding; admin UI for ongoing edits.
**Cache version**: v23 → v24.

### D79: Data-drive accent→wall remap + D78 hardening
**Context**: D78 review found 10 issues. `normalizePrimaryAccentAsWallPaint` used filename heuristics that would break for the next builder. Hash derivation was duplicated across generate and check routes. Zod schemas lacked length constraints. OptionTree useEffect clobbered typing on save.
**Decision**:
- `step_photos.remap_accent_as_wall_paint` boolean column replaces filename heuristic. Backfilled 6 photos (4 SM Kinkade, 1 SM Lenox, 1 Demo).
- `deriveGenerationContext()` in `generate.ts` encapsulates the entire scoping→hash pipeline, used by both routes. Eliminates duplicated `buildSceneDescription` and `filterSpatialHints`.
- Zod: `.min(1).max(500)` per rule string, `.max(20)` per array on subcategory + option API routes.
- OptionTree: useEffect guards check `document.activeElement !== ref` before overwriting textarea state. Accessibility: `aria-label`, `aria-expanded`, proper `<label htmlFor>`, human-readable dropdown text.
- Dead exports removed from `step-config.ts` (`allStepSubCategoryIds`, `isInStep`, `getUnmappedSubCategoryIds`).

## D80: Switch gpt-image-1.5 from quality "high" to "medium"
**Context**: Generation times of ~70s (single pass) to ~140s (two-pass) were too slow. Investigated quality and input_fidelity parameters. A/B tested all 4 combos (high/high, medium/high, high/low, medium/low) on kitchen (8 swatches) and great room (2 swatches) using real production pipeline.
**Results**:
- `quality` is the dominant speed lever: medium is ~2x faster than high
- `input_fidelity` barely affects speed (~5-8s difference)
- Kitchen: high/high 76.5s → medium/high 39.9s (1.9x faster)
- Great room: high/high 69.9s → medium/high 36.5s (1.9x faster)
- Cost: $0.200 → $0.050 per pass (75% reduction)
- Visual quality at medium is acceptable for room visualizations
**Decision**: Switch to `quality: "medium"`, keep `input_fidelity: "high"`. Applied to both generate-photo and generate-demo Inngest functions, including second-pass refinement. Cache version bumped v24 → v25 (generation), v4 → v5 (demo) to invalidate old high-quality cache.
**Trade-off**: Slightly lower output rendering quality vs. ~2x faster generation and 75% cost reduction. Swatch matching preserved (input_fidelity stays high).
**Test script**: `scripts/test-quality-fidelity.ts` — reusable A/B test for future quality experiments.

## D81: PostHog LLM Analytics — manual capture over @posthog/ai SDK
**Context**: PostHog shipped an LLM Analytics dashboard. Our existing custom `ai_generation` events weren't visible because the dashboard expects `$ai_generation` events with `$ai_*` prefixed properties. PostHog's `@posthog/ai` SDK auto-instruments `chat.completions`, `responses`, `embeddings`, `audio` — but does NOT wrap `OpenAI.images.edit()`, which is our primary generation call. It also provides `withTracing()` for Vercel AI SDK, but with only 4 Gemini call sites the overhead isn't justified.
**Decision**: Manual capture with PostHog's standard schema. Renamed event to `$ai_generation`, mapped properties to `$ai_model`, `$ai_provider`, `$ai_latency` (seconds), `$ai_input/output_tokens`, `$ai_input/output/total_cost_usd`, `$ai_is_error`. Custom Finch properties spread alongside. Added `captureAiError()` for failure visibility — Inngest functions capture + re-throw, API routes capture in catch blocks. Cost split: OpenAI = all output (flat per-image), Gemini = independent input/output from tokens.
**Trade-off**: Manual instrumentation requires updating call sites vs. zero auto-capture for our primary use case (`images.edit`). Revisit `@posthog/ai` if they add image API support or if Gemini call sites multiply.

## D82: Vitest for unit + integration tests — pure functions and generation pipeline
**Context**: Zero test infrastructure existed. The generation pipeline has 15+ iterations of complex logic (scoping, flooring resolution, accent remap, hash derivation, policy resolution, selection reconciliation) that drives cache correctness and AI output quality. Bugs here are silent and costly. Need tests that catch regressions without heavy infrastructure overhead for a solo dev.
**Decision**: Vitest with 3-layer test strategy:
1. **Unit tests** (8 files): Pure functions — photo-scope, selection-reconcile, flooring-selection, generate helpers, photo-generation-policy, pricing, demo-generate (hash determinism + ordering stability), demo-scene (surface visibility filtering).
2. **Pipeline integration tests** (1 file + fixtures): `deriveGenerationContext` with realistic fixture data modeling SM Kinkade kitchen/bedroom/living room patterns. Tests scoping, flooring, accent remap, policy, negative-guard rules, hash consistency, cross-route hash parity.
3. **Route handler tests** (4 files): `/api/generate/photo` + `/api/generate/photo/check` (SM pipeline), `/api/try/generate` + `/api/try/check` (demo pipeline) with mocked Supabase + Inngest. Tests validation, ownership chain, cache hit/miss, 429 double-click guard, retry flow, Inngest dispatch, generation cap, upload error handling.
4. **Health check tests** (1 file): `/api/health/try` — demo org existence, storage bucket accessibility.
**What's NOT tested** (by design): `buildEditPrompt` (async + sharp, prompt text changes frequently), Inngest background functions (real OpenAI calls), React components (visual, admin-only), DB query functions (need test DB), `/api/try/validate-photo` (thin Gemini wrapper). No E2E tests — manual QA is sufficient at this stage.
**Trade-off**: Fixture-based tests can't catch DB query bugs or prompt drift. But they cover the logic most likely to regress (scoping + hashing), run in <1s, and require zero external dependencies. Add DB integration tests when onboarding the first paying builder.


## D83: Centralized SiteNav defaults — shared marketing navigation
**Context**: Every marketing page (homepage, /vs/*, /research/*, /learn/*) defined its own NAV_LINKS array passed to SiteNav. The nav was inconsistent across pages — some had "Try It" only, some had "Try It + Research", the homepage had anchor links + "Research". Adding the new `/learn/new-construction-upgrades` page meant updating 6 files. The nav should be the same everywhere except where a page has a genuine reason to differ (homepage anchor links, /try empty nav).
**Decision**: SiteNav now has DEFAULT_LINKS (Try It, Upgrade Guide, Research) and DEFAULT_CTA (Get Started → /#get-started) baked in. Pages that want the standard nav just use `<SiteNav />` with no props. Homepage overrides with `links={HOMEPAGE_NAV_LINKS}` for anchor links. `/try` passes `links={[]}` because it's the demo itself. Removed per-page NAV_LINKS from /vs/envision, /vs/pdf-option-sheets, /research/hidden-revenue-line, /research/visualization-lift, and /learn/new-construction-upgrades.
**Trade-off**: Adding a nav link now requires changing one file (SiteNav.tsx) instead of six. Pages that need custom nav still can — the props still work.

## D84: "Ask your builder" form cut — demo starts are the flywheel signal
**Context**: SEO strategy originally included an "Ask Your Builder" form on buyer content pages (builder name, community, email). The idea was to capture builder names as warm leads for outreach.
**Decision**: Cut it. A buyer typing their builder's name into a form is survey data, not a warm lead. The demo itself is the conversion event — PostHog already tracks demo starts from content pages. That's the signal for builder outreach ("47 of your buyers tried our visualizer last month").
**Trade-off**: Lose explicit builder name capture. Gain simpler pages and a more honest funnel — if the demo isn't compelling enough to make buyers talk to their builder, a form won't fix that.

## D85: PostHog proxy — edge API route over Next.js rewrites
**Context**: Session recordings showed zero `$snapshot` events in PostHog despite "Record user sessions" being enabled in dashboard settings and `/ingest/s/` requests returning 200 in the browser. Regular events (`/ingest/e/`) worked fine. Root cause: Vercel's Next.js `afterFiles` rewrites silently strip or truncate large POST request bodies. Session recording snapshots are much larger than regular event payloads, so they were dropped while events got through. The 200 was Vercel acknowledging the rewrite, not PostHog confirming receipt.
**Decision**: Replaced `afterFiles` rewrites with an edge API route at `src/app/ingest/[[...path]]/route.ts`. The route streams request bodies directly to PostHog (`us.i.posthog.com`) and static assets to `us-assets.i.posthog.com`. Edge runtime keeps latency low. `skipTrailingSlashRedirect` retained in next.config.ts (PostHog's API uses trailing slashes).
**Trade-off**: Slightly more code than rewrites, but actually works for all PostHog features including session replay. Edge functions have no cold start penalty.

## D86: Finch positioning — the step between nothing and Envision
**Context**: Reviewed Fulton Homes' live Envision Options deployment firsthand (`edc3.envisionoptions.com/RoomVisualizers?orgId=506&planId=8366055&userType=presales`). The product is polished — 3D-rendered per-floorplan kitchen scenes with real-time material swaps (cabinets, countertops, flooring, backsplash). Fulton does $86K/house in average upgrades (16% of base volume) and has a 13,000 sq ft design center. They can justify Envision's cost. Most builders can't.
**Decision**: Finch's market position is the accessible middle step: PDF price sheet → Finch → Envision/Roomored/ECI. We target builders at step 1 (nothing) who want to move to step 2. Don't pursue builders already on established visualization platforms — they feel solved and we'd be perceived as a downgrade. Fulton Homes specifically marked as Passed.
**Trade-off**: Narrows our addressable market to builders without visualization, but sharpens the pitch and avoids unwinnable deals against entrenched enterprise tools. The "nothing" segment is still huge — most regional builders (50-500 homes/yr) have no visualization at all.

## D87: FLUX.2 Flex Edit tested — not viable for Finch
**Context (2026-03-26)**: Tested FLUX.2 Flex Edit (via fal.ai) as a potential faster/cheaper alternative to gpt-image-1.5 for room visualization. Used Demo org kitchen photo with 6 swatch reference images.
**Results**:
- Speed: 42.4s (FLUX.2) vs 44.6s (OpenAI) — effectively identical, not the 4-10s that benchmarks suggested
- Cost: $0.377/generation (FLUX.2) vs $0.20/generation (OpenAI) — nearly 2x more expensive
- Quality: FLUX.2 badly missed cabinet color (rendered dark charcoal instead of light silver gray #C8CDCD). Backsplash also went solid gray instead of matching swatch. OpenAI nailed both.
- Root cause: FLUX.2 Flex Edit takes a flat `image_urls` array with no way to bind specific swatches to specific surfaces. The model has to guess which swatch goes where. OpenAI's `images.edit` with ordered swatch references is purpose-built for this.
**Decision**: Stay on gpt-image-1.5. FLUX.2 is same speed, 2x cost, worse quality. The multi-reference swatch-to-surface mapping is a fundamental limitation of the FLUX.2 API, not a prompt engineering problem.
**Artifacts**: Test script at `scripts/test-flux2.ts`, results in `.flux-test-output/`.

## D88: 2.5D texture swap PoC — exploring real-time visualization
**Context (2026-03-26)**: AI generation costs $0.20/image and takes 30-45s. At scale, speculative/predictive generation is too expensive. Explored whether a real-time texture swap approach could provide instant, zero-cost visualization for browsing — with AI generation reserved for a "final render."
**Decision**: Pursue a proof-of-concept for 2.5D/3D texture swapping pipeline:
- **One-time setup per photo** (admin side, any amount of time): Depth Anything V3 for depth map → Grounded SAM 2 for surface segmentation → plane fitting for simple meshes → camera estimation → admin review of masks
- **Runtime per swap** (buyer side): Three.js texture swap on pre-built meshes. Under 100ms, $0 cost.
- **Hybrid model**: Real-time texture swap for browsing/exploring options. AI generation (gpt-image-1.5) for photorealistic "final render" when buyer settles on selections. One $0.20 generation instead of 3-4 during exploration.
- **Appliance swaps** (fridge vs no fridge, standing vs slide-in range): Handled as base image variants, not texture changes. Same meshes, different background photo layer.
**Trade-off**: Significant implementation effort (4-6 weeks for full pipeline). Texture swaps won't match AI-generated photorealism (no recessed panel shadows, no cross-surface reflections). But instant + free + interactive may beat slow + expensive + static for the browsing phase. Quality is the key risk — the PoC needs to answer whether "good enough" is actually good enough.
**Status**: PoC built and extensively tested (2026-03-26 through 2026-03-27). Multiple segmentation approaches tried, all failed to produce buyer-facing quality:

**Segmentation approaches tested:**
1. **fal.ai SAM2** (box/point prompts): Masks bleed between surfaces. Cabinets include backsplash, countertop misses island, walls grab ceiling. Consumer GPU segmentation = "haiku quality."
2. **Grounded SAM on Replicate** (`schananas/grounded_sam`): Model is broken — tensor error on every prompt. 2023 model, not maintained.
3. **Gemini all-in-one color map** (`gemini-3-pro-image-preview`): Asked model to color-code all surfaces in one pass. Produced the best segmentation map by far — clean boundaries, correct surface identification. But still misses details (outlet on island, plants on counter, backsplash above range hood).
4. **Gemini per-surface individual masks** (`gemini-3-pro-image-preview`, 6 separate passes): Each pass focused on one surface. Per-surface masks were NOT meaningfully better than the all-in-one map. Same boundary quality issues.
5. **Gemini Flash** (`gemini-2.5-flash-image`): Refused to produce graphic masks — just desaturated the photo. `gemini-3.1-flash-image-preview` did produce a color map comparable to Pro.

**Compositing approaches tested:**
1. **Flat color through mask** (Canvas demo): Surprisingly good for a PoC. Instant color swap with luminance-preserved blending. Not photorealistic but interactive and fun.
2. **Masked inpainting** (alpha mask → OpenAI `images.edit`): Model hallucinated extra geometry (added cabinet panels that don't exist). Lighting mismatch between masked and unmasked areas.
3. **Full generation + mask extraction** (generate full room per surface change, extract pixels through mask, composite): Each individual generation looked good. But compositing multiple generations showed visible seams — different AI generations have different lighting interpretation, and the mask edges expose the boundary between them. Feathered edges helped but didn't solve it. Final composite "looks like shit" (direct quote).

**What worked:** Gemini Pro producing color-coded segmentation maps. The flat-color Canvas demo as a browsing tool. Individual per-surface AI generations in isolation.
**What didn't work:** Compositing multiple AI generations together. No masking approach (SAM2, Gemini single, Gemini multi) produced clean enough boundaries for photorealistic compositing.
**Root cause:** The seam problem isn't just mask quality — it's that each AI generation interprets the scene lighting differently. When you cut pixels from two different AI outputs and stitch them, the lighting discontinuity at the boundary is visible regardless of mask precision.

**Shelved.** The single-pass gpt-image-1.5 approach (all swatches in one generation) remains the best quality option. Pre-generated preset variations remain the best speed strategy. Revisit layered generation if/when AI models support deterministic lighting or native per-surface masking.

**Artifacts:** `scripts/texture-swap-poc/` — all scripts, masks, generations, composites.

## D89: Health check endpoint + Vercel Cron monitoring for /try
**Context (2026-03-26)**: The /try page was broken for days (cookie path bug blocked all API calls) with no alerting. Unit tests can't catch this class of bug — they mock `cookies()` and never exercise actual HTTP cookie handling.
**Decision**: Two-layer health check:
1. `GET /api/health/try` — public endpoint. Verifies demo org exists in DB, `DEMO_ORG_ID` UUID matches, `demo-uploads` and `demo-generated` storage buckets are accessible. Returns `{ healthy, checks }` with 200 or 503.
2. `GET /api/health/try/cron` — Vercel Cron-triggered (hourly). Runs same checks, sends alert email to `hello@withfin.ch` via Resend if unhealthy. Protected by `CRON_SECRET` header.
**Also fixed**: Generate route now checks storage `upload()` result and cleans up pending slot on failure (previously silently continued to Inngest). Demo test suite expanded from 0 to 47 tests covering both demo routes + pure functions.
**Trade-off**: Health check only validates infrastructure (DB, storage), not the full generation flow (would require spending $0.20 per check). Cookie-path bugs still require E2E testing to catch. But infrastructure failures are the most common silent outage mode, and this catches them within an hour.

## D90: Prompt restructure — APPLY/PRESERVE sections
**Context (2026-03-27)**: SM backsplash tiles weren't generating correctly. Root cause: "CRITICAL FIXED-GEOMETRY RULES" section told the AI to preserve geometry, directly contradicting backsplash rules that needed tile pattern changes. Edit objective ("Change ONLY color/texture") also blocked pattern changes. 20+ "don't" rules drowned out action instructions.
**Decision**: Restructured prompt into APPLY (swatch authority, targeting, dimensions, appliance rules) → PRESERVE (camera, geometry, structural details) → SURFACE & PLACEMENT RULES (DB-driven). Edit objective changed to "Apply every listed selection, not a diff from the current state." Flooring rules conditional on flooring being in selections.
**Trade-off**: More structured prompt is slightly longer but dramatically clearer for the AI. Common tile patterns (subway, herringbone, square) now generate well in isolation.

## D91: Backsplash isolation pass — two-pass for pattern tiles
**Context (2026-03-27)**: SM kitchen sends 19 items + 12 swatches in one API call. Backsplash pattern accuracy (especially color) degrades when competing with 18 other edits. Tested isolation (backsplash-only pass with 1 swatch) and it produced dramatically better results for herringbone.
**Decision**: Backsplash gets a dedicated isolation pass for pattern tiles. Common tiles that work in the full pass don't need it. Implementation pending — next step is testing Nano Banana for pass 1 then gpt-image-1.5 for pass 2.
**Trade-off**: Doubles generation time + cost for backsplash. But a bad backsplash ruins the whole image. Speed penalty is acceptable if quality is right.

## D92: Elongated hexagon picket tiles — model limitation, research ongoing
**Context (2026-03-27)**: Exhaustively tested picket tile generation across gpt-image-1.5, FLUX Pro v1, Ideogram v3, Reve, with prompt-only, masked inpainting, texture compositing, explicit geometry, scale context, and reference photos. No model can reliably produce elongated hexagon pickets at correct scale on a backsplash. Shape vs scale tradeoff: AI gets one right but not both.
**Decision**: Not solved yet. Most promising lead: AI CAN generate correct picket tiles as a flat texture (no room context). Two-pass approach (generate flat texture → composite onto room → blend) or Nano Banana pass 1 → gpt-image-1.5 pass 2 are the next experiments.
**Impact**: SM has 6 picket options at $375 each. Other builders will have similar niche patterns. Must solve this for Finch to handle the full range of backsplash options builders sell.

## D93: Partial cache — diff-based scoped editing
**Context (2026-03-28)**: Buyers lock in most selections then flip one surface at a time. Every flip triggers the full 60-80s pipeline. R&D validated that scoped single-surface edits via 1.5 work at ~32s. Flash hallucinated objects (fridge in empty alcove); 1.5 did not.
**Decision**: Diff-based partial cache. Store `leave_one_out_hashes TEXT[]` and `scoped_edit_depth INTEGER` on `generated_images`. GIN-indexed overlap query finds cached images differing by one subcategory. 1.5 scoped edit changes only that surface. Depth capped at 3 to bound quality degradation. No intermediate caching table — single approach, full pipeline as fallback.
**Key finding**: `_promptContext` must be excluded from leave-one-out hashes because it contains per-selection generation rules that change when any selection changes, defeating the diff matching.
**Trade-off**: Scoped edits have slight shadow flattening (depth 2+) and 1.5 can drift on backsplash patterns during non-backsplash edits. Optional final-screen regeneration can produce depth-0 quality when needed.

## D94: Photo scoping — only visible subcategories
**Context (2026-03-28)**: SM kitchen-close photo had 19 subcategories scoped (full step) including dishwasher, trash can, light rail, glass cabinet door — none visible in the photo. AI hallucinated a dishwasher on the island and under-applied cabinet swatches due to swatch mapping confusion with 12+ swatches.
**Decision**: `step_photos.subcategory_ids` must only include subcategories whose surfaces are actually visible in the photo. Trimmed kitchen-close from 19 to 13. All future photo setups must audit visibility.
**Trade-off**: Requires manual per-photo audit of what's visible. But the alternative (sending invisible items) reliably degrades generation quality.

## D95: Prompt structure — single RULES block
**Context (2026-03-28)**: D90 split the prompt into APPLY/PRESERVE/SURFACE & PLACEMENT RULES. Testing showed cabinet colors (driftwood) not being applied correctly with the split structure. Reverted to v26's single `RULES:` block with "Edit this room photo to match the selected finishes." Same content, single section.
**Decision**: Keep single RULES block. The split structure may have diluted swatch mapping attention. Backsplash-specific generation_rules are still included via the DB-driven rules system.
**Trade-off**: Less structured prompt, but proven to work for swatch accuracy.

## D96: Switch from OpenAI 1.5 + Gemini Flash to BFL Flux 2
**Context (2026-04-04)**: Current pipeline uses OpenAI gpt-image-1.5 for generation + Gemini Flash for backsplash isolation + Gemini Pro for cabinet stain post-pass. Multi-pass architecture (D88) adds 105-115s latency for kitchens. Tested all 6 BFL Flux 2 models as replacements.
**Decision**: Replace entire pipeline with Flux 2. Full generation = Max (single pass, 35-46s). Scoped edits = Klein 4B (7-11s, $0.017). Oven correction = Max post-pass. Eliminate Flash isolation, Pro cabinet post-pass, and multi-pass orchestration complexity.
**Key findings**:
- Max image quality is visibly better than 1.5 — richer textures, more natural lighting
- Max handles herringbone tile in single pass (needed dedicated Flash isolation with 1.5)
- Max handles stain in single pass (needed Pro post-pass with 1.5)
- Klein 4B for scoped edits: 7-11s at $0.017 vs 1.5 at 30s/$0.07 — 4x faster, 4x cheaper
- Klein 4B has better spatial precision than Pro for single-surface edits (6/7 stress tests)
- Klein 4B is self-hostable (4B params, ~8GB fp16) on RB's 4080 — future $0/edit option
- Slide-in range swap still needs dedicated post-pass (structural geometry change, no model handles it)
- Spatial exclusion ("NOT the island") needs prompt tuning — scene description + photo baseline context from DB fixes it
**Trade-off**: BFL is a smaller company than OpenAI. API could have reliability/availability issues. No mask-based inpainting on Flux 2 (instruction-only editing). Spatial exclusion requires more verbose prompts with scene context. But the quality + speed + cost improvements are too large to ignore.
**Full R&D**: `generation/flux2-rd-results.md`

## D97: v2 prose spec — bare minimum first, add only what empirical failure requires
**Context (2026-04-11)**: A previous prose builder shipped with a `subject` field that narrated the base scene. The field caused hallucinated architectural elements (filigree scrollwork appeared in a Valor test). The root issue wasn't the specific field — it was that the builder had grown features (subject, scopedEdits, context, scopedContext, per-subcategory preservation) we added speculatively, each one introducing new failure modes. Rewrote the builder from scratch starting from what BFL's editing guide actually documents.
**Decision**: Build the absolute minimum version first — `{ version, actions, lead?, style?, preserve?, mergedClauses? }` — and add nothing unless an empirical test requires it. `preserve` ships as an empty escape hatch with zero entries; populated only when a test shows Max freelancing a specific unselected surface on a specific photo. This is directly from BFL's fundamentals guide: "Start short. Add only what changes the image."
**Rationale**: Every field that exists is a field the author can misuse, the validator has to enforce, and future-me has to reason about. Features should earn their place with a before/after comparison on real BFL output, not a theoretical argument. The session that produced this decision had explicit back-and-forth where the user pushed back on a "keep hex preservation because we've always had it" framing — pre-existing-code inertia is not a justification.
**Trade-off**: First real failure will require us to add a field back (or rewrite an action clause). That's the expected cost. Compared against the alternative — shipping a builder full of speculative features that create silent regressions — the trade is worth it.
**Enforcement**: The validator rejects anything that isn't minimal (forbidden words, word budgets, structural rules). The schema is documented in `memory-bank/generation/bfl-prompting-guide.md` and in `PromptProse` in `src/lib/step-config.ts`.

## D98: mergedClauses detection by swatch_url, not hex
**Context (2026-04-11)**: BFL Flux 2 Max dedupes byte-identical `input_image_N` references into a single visual class and silently ignores the later clause. Reproduced on Valor's Standard preset: buyer picked Dove for both perimeter cabinets AND island cabinets, and Max rendered perimeter cabinets correctly but left the island base at its original base-photo color. The prompt had two clauses, one per subcategory; BFL collapsed them. Mid-Range and Premium (different island color) worked fine.
**Decision**: Detect the collapse condition by `swatch_url` equality. When two subcategories resolve to the exact same storage path, the builder collapses them into a single unified clause via an author-provided `mergedClauses` entry. Hex fallback (`swatch_color` equality) is NOT implemented.
**Rationale**: URL equality maps directly to the BFL failure mode. Same URL → same file → same bytes → same input image → BFL dedupe. Two options with the same hex but different swatch files produce different bytes, which BFL treats as distinct inputs, which means the collapse doesn't happen, which means merging would be incorrect. Detection must match the failure, not the semantics.
**Trade-off**: If an admin uploads the same Dove image twice under different filenames (same hex, different URLs), the merge won't fire and the prompt will contain two competing clauses. In that case BFL will NOT collapse (different bytes) and both clauses will run normally — so no regression, just a missed opportunity for a cleaner unified clause. Acceptable. If this becomes a real pain point we can add hex fallback later without changing the schema.
**Verification**: `scripts/dump-valor-prose-prompt.ts` exercises all three Valor presets. Standard (same swatch) → merge fires, 4 swatches, 78 words, one unified cabinet clause. Mid-Range/Premium (different swatches) → merge doesn't fire, 5 swatches, 92 words, both clauses run as before.

## D99: Scoped edits intentionally bypass mergedClauses
**Context (2026-04-11)**: `buildProseScopedEdit` is the single-surface edit path used when a buyer changes one option on an otherwise-unchanged scene. It takes the changed subcategory's action clause, capitalizes the first letter, appends a period, and sends it to BFL Klein/Flex/Pro with one swatch.
**Decision**: Scoped edits do NOT consult `mergedClauses`. They always pull directly from `actions[subId]`.
**Rationale**: The mergedClauses mechanism solves the same-swatch collapse bug, which is fundamentally a multi-reference-image problem. Scoped edits send ONE swatch reference to BFL. With one input image, there is no duplicate to dedupe, no collapse to trigger, and no merge to resolve. Adding merged-clause consultation to the scoped-edit path would be code complexity with zero correctness benefit.
**Consequence**: If the full-gen bulleted wording differs from what reads cleanly as a scoped-edit sentence, the author has to write the action clause so it works in both contexts. For Valor's island, `"apply {image} to the freestanding center base structure in the foreground"` reads cleanly as both a bullet line and a standalone sentence ("Apply image 2 to the freestanding center base structure in the foreground."). This constraint is documented in the author workflow in `bfl-prompt-engineer.md`.

## D100: Paint + hex for painted cabinet/island options, no swatch
**Context (2026-04-12)**: Prompt Lab R&D on Valor kitchen. Ran 30+ generations across 5 prompt variants testing Dove (white) perimeter + Onyx (dark) island — the hardest two-tone combo. Dove consistently rendered as grey/blue-grey regardless of prompt wording. Tested: flat text (5 variants × 3 runs), JSON structured prompts (2 variants × 3 runs), two-pass split (Max + Klein 9B), "no cabinet word" hypothesis, preserve clauses. Nothing moved the needle — Dove hit white in ~2/15 runs across all approaches.
**Root cause**: The Dove swatch is a photographed paint chip with a cool blue-grey cast from studio lighting. BFL faithfully matched the swatch — which looked grey, not white. The swatch was the problem, not the prompt.
**Discovery**: Replacing the swatch with hex `#F5F5F2` and the verb "paint" (instead of "change to match image N") produced correct white perimeter cabs in 3/3 runs. Island with hex `#1C1C1E` was also correct 3/3. Clear perimeter/island separation, stable geometry, stove surround preserved.
**Decision**: For painted cabinet/island options, send hex code in the prompt text with the verb "paint" and do NOT send a swatch reference image.
**Implementation**: `buildProsePrompt` detects painted options via the `is_painted` flag and emits `"paint [surface] to hex #XXXXXX"` instead of `"apply {image} to [surface]"`, skipping the swatch from the reference image array.
**Trade-off**: Hex for flat paint means BFL renders a mathematically precise color with no texture information. This is correct for painted shaker cabinets (smooth flat paint).
**SUPERSEDED for stained/textured (2026-04-13)**: Original D100 said "Stained/textured options still use swatches — grain pattern can't be expressed as hex." **This turned out to be wrong.** See D101 and D102 below. Stained wood can be rendered from a hex + "wood grain" text descriptor (D101), and all textured surfaces benefit from symmetrized hex anchors alongside swatches (D102). The core D100 insight — painted surfaces use hex without swatch — is still correct.
**What also came out of this R&D session**:
- "Cabinet" word avoidance hypothesis: dead. No improvement in 3 runs.
- JSON structured prompts (subjects array with position fields): BFL accepts them for editing but results were not measurably better than flat text across 6 runs.
- Two-pass split (Max full gen without island + Klein 9B scoped edit for island): Klein 9B failed to reliably apply onyx to the island face. Max as pass 2 worked but is 2× cost for marginal benefit now that paint+hex solves the color fidelity issue.
- Preserve clauses for stove surround: marginal. 2/3 vs 2/3 baseline. Not reliable enough alone.
- Prompt wording (short clause, wall-mounted emphasis, etc.): no measurable effect across 6 runs.
- The verb "paint" may help with geometry preservation by implying "apply a coating" rather than "transform this surface," but this is not isolated — it was tested alongside hex, not independently.

## D101: Stained wood rendering via "wood grain matching hex" (no swatch)
**Context (2026-04-13)**: Prompt Lab session on Nest kitchen testing stained driftwood cabinets (`kitchen-cab-color-driftwood`, swatch_color `#B09A7E`). Over 30 runs across 7 clause wordings and 3 models (Max, Pro, Flex), stained-cab swatches consistently failed 1/3 or worse on two-tone layouts. Failure mode was isolated corner cabs staying source-white even when the prose explicitly enumerated them.
**Root cause**: The "stain" verb activates BFL's material-aware scope resolution — it searches the source photo for surfaces that "look like wood" and filters out the ones that don't. White shaker perimeter cabs don't match the wood class and get excluded from the stain scope, even when geometry-naming them.
**Discovery**: Using `forceHex` mode (hex inlined, swatch omitted) with the prose `"stain every upper, lower, corner, and center cabinet door and drawer with wood grain matching {image}"` rendered **synthetic wood grain** from the hex color alone — no swatch reference image required. Landed 3/3 clean on Flex g=7, all zones captured including the isolated corner.
**Key phrases**:
- `"wood grain matching"` — prompts Flex to render wood texture synthetically from the hex
- `"upper, lower, corner, and center"` — enumerates all visual classes so BFL's scope filter can't drop one
- `"drawer"` not `"drawer front"` — trailing `"front"` gets parsed as a positional modifier, BFL renders the front face only and leaves the casing unchanged
**Decision**: Stained wood options can and should be rendered from their `swatch_color` hex + "wood grain" text descriptor, not from the swatch image. This contradicts the original D100 wording but uses the same mechanism — hex in prose, no swatch image — just with different text to unlock texture rendering.
**Implementation**: Currently implemented as a lab-only `forceHex` flag on variant config. Production integration TBD — needs schema or runtime extension so any stained option can route through the hex+descriptor path.
**Trade-off**: Color fidelity to the hex is deterministic. Grain texture is synthesized by Flex from its wood prior, not sourced from the swatch, so the exact grain pattern of a specific wood species (oak vs pine vs maple) is model-interpreted. For our use case this is acceptable and visually comparable to a swatch-sourced render.
**Model note**: Tested on Flex g=7 and confirmed. Not yet re-validated on Max.

## D102: Symmetrized hex anchors on textured swatch surfaces
**Context (2026-04-13)**: Same Nest kitchen session as D101. Counter (steel grey granite, `#6B6E72`) + backsplash (carbon herringbone, `#3D3D3D`) + floor (warm wood, `#9A8268`) + cabs (driftwood hex via D101) — a full multi-surface scene. On Flex g=7 with cabs rendering perfectly via D101, the counter swatch systematically rendered as source-white (21 runs across 7 clause variants, ~10% pass rate). Diagnostic finding: the dark granite color occasionally cross-wired to the wrong surface (island base, floor) instead of the countertop — proving the swatch was being read but the attention binding was failing between `image N` and the target surface noun in the prompt.
**Root cause**: At high guidance with one surface having a strong hex+text signal (D101 cabs) and other surfaces relying on swatch images alone, Flex's attention budget skewed heavily toward the text-anchored surface. Remaining swatches competed for leftover attention and got misrouted between similar target surfaces. The BFL expert agent framed this as a "text-dominance failure mode" under high guidance.
**Discovery**: Appending an inline hex anchor to the text of every textured-swatch action clause symmetrized the attention weight across all surfaces. Example: `"apply {image} to every countertop surface matching hex #6B6E72"` — the swatch still drives pattern/texture, the inline hex provides a text color anchor that locks the binding. Tested symmetrized anchors across all three textured surfaces (backsplash + counter + floor) on Flex g=7 and got **3/3 clean** on the full scene. Every surface rendered correctly, no cross-wire.
**Decision**: When a prose prompt has multiple textured-swatch surfaces AND the scene also contains hex-anchored surfaces (D100 paints, D101 stains), every textured-swatch clause should carry an inline hex anchor derived from its option's `swatch_color`. The swatch image still drives pattern/texture, the hex anchor locks the color and prevents attention-budget cross-wire.
**Pattern**:
```
apply {image} to every countertop surface matching hex #XXXXXX
change the wall surface between the upper cabinets and countertop to match {image} at hex #XXXXXX
change all visible flooring throughout the room to match {image} at hex #XXXXXX
```
The swatch reference image is still sent via `input_image_N`. The hex is text, not a replacement for the swatch.
**Trade-off**: Slightly flatter patterns (Flex biases toward the hex color over the swatch's full color range) in exchange for deterministic surface binding. For production, binding reliability > pattern nuance.
**Implementation**: Currently lab-only via manual clause authoring. Production path needs runtime injection — modify `buildProsePrompt` to auto-append `" matching hex #XXX"` (or similar) to every action clause whose option has `swatch_color` AND isn't already being handled via `is_painted`+forceHex. Gated behind a flag for safe rollout.
**Validation gap**: Tested on one photo (Nest kitchen), one selection combo, one model (Flex g=7 steps=50). Needs cross-validation on at least 2-3 additional photos and different selection combos before shipping to production. Specifically needs testing on multi-tone stones like calacatta marble (where the hex averages a multi-color swatch) and reverse-direction transformations (dark → light).
**Supersedes the Swatch Authority Rule partially**: The original swatch-authority rule said "No hex color codes alongside swatches — hex describes flat color, which overrides textured finishes." D102 finds the opposite: hex alongside swatches IMPROVES rendering when multiple swatch surfaces compete for attention. The original rule held for single-surface edits but fails on multi-surface full-gen.

**Layout-class change failure mode (added 2026-04-13 evening)**: D102's `"change ... to match {image} at hex #X"` pattern works for *same-layout* color/material swaps (stone counter → stone counter, wood floor → wood floor, mosaic backsplash → mosaic backsplash). It **fails for layout-class changes** — e.g., a herringbone mosaic backsplash being changed to a 4x16 staggered subway layout. The hex anchor lands the color, but Flex preserves the source's structural layout (incumbent-preservation bias on tile geometry). Tested at g=7, g=8, g=9 — no guidance level fixes it.

**Fix for layout-class changes — retile verb + explicit layout descriptor**: switch from "match" to a spawn-style verb (`retile`) and name the target layout in the clause. Same spawn-vs-transform principle as the fixture remove/install pattern. Example for the Glacier 4x16 case:
```
retile the wall between the upper cabinets and countertop with {image}, large staggered rectangular tiles in horizontal rows at hex #D4E4EC
```

Validated 1/1 on the first test (Glacier 4x16 swatch on a herringbone source photo — output rendered correctly as staggered rectangular tiles in horizontal rows in glacier blue, no herringbone preservation).

**Safe layout vocabulary for backsplash clauses**:
- Allowed: `staggered rectangular tiles`, `horizontal rows`, `running bond`, `offset rows`, `large flat tiles`, `brick-pattern tiles`, `horizontal courses`
- **Poisoned**: `subway` triggers Flex's strong "subway tile = white" prior and overrides the swatch color entirely. `metro` likely the same family — avoid until tested.

**Architecture flag**: backsplash options whose swatch layout differs from the photo's installed layout (mosaic ↔ rectangular, herringbone ↔ subway-style) should carry a `layout_class_change = true` flag in DB or be authored with the retile-verb clause from the start. Without that, full-gen on these options will silently render as "right color, wrong layout."

## D103: Metallic surfaces — material-verb gate around the hex anchor
**Scope (revised 2026-04-13 evening)**: applies to ALL metallic surfaces, not just cabinet hardware. Validated on cabinet pulls (brushed gold, matte black, oil-rubbed bronze, satin nickel), faucets (polished stainless), and sinks (polished stainless). Same pattern works whether the metal is on a small repeated object (pulls), a single fixture (faucet, sink), or presumably range/microhood/refrigerator-front when those are swap targets. Originally written for hardware; the fix transfers cleanly to any reflective metal target.

**Context (2026-04-13)**: Prompt Lab session on Nest kitchen testing cabinet hardware scoped edits on a previously-generated base image (Driftwood perimeter + Admiral Blue island + grey granite counter + dark carbon backsplash). Tested 5 hardware options across 4 finishes (brushed gold, matte black, oil-rubbed bronze, satin nickel) using `buildProseScopedEdit`. Faucet + sink validation came later in the same session via the bundled fullgen test — both also rendered as flat/wrong without the gate, then rendered correctly when the gate was added.
**Problem**: The D102 inline-hex-anchor pattern (proven for stone/tile/wood-flooring textured swatches) FAILED on metallic hardware. Hex inline gave one of two bad outcomes:
- Trailing parenthetical hex (`"... to match image 2 (hex #CCBA78, ...)`): the scoped-edit auto-suffix `"Match image 2 exactly."` bound to the nearest anchor (the hex) and Flex painted the entire containing surface (upper cabinet doors) mustard gold.
- Mid-clause bare hex (`"... to match image 2 at hex #CCBA78"`): rendered as flat matte color, killing the brushed metallic sheen. Hardware looked like flat paint, not metal.
- No hex at all: perimeter cabs defaulted to BLACK pulls (not gold) — Flex grabbed color from nearest dark scene elements (existing bronze hardware, dark backsplash, dark granite). Island pulls went oversized ("framing rail" problem).
**Discovery**: Gating the hex with a material-verb phrase — `"<finish descriptor> matching hex #XXXXXX"` — produces consistent multi-class coverage AND metallic sheen. The material phrase tells Flex "interpret this hex as a color waypoint on a reflective material," not "paint this RGB exactly." Parallel to D101's `"stain ... with wood grain matching hex"` — a material descriptor gates how Flex reads the color.
**Pattern**:
```
# Cabinet hardware (small repeated objects):
change cabinet pulls on upper, lower, corner, and center cabinets to match {image}, brushed gold finish matching hex #CCBA78
change cabinet pulls and knobs on upper, lower, corner, and center cabinets to match {image}, matte black finish matching hex #1A1A1A
change cabinet pulls and knobs on upper, lower, corner, and center cabinets to match {image}, oil-rubbed bronze finish matching hex #804A2E
change cabinet pulls and knobs on upper, lower, corner, and center cabinets to match {image}, satin nickel finish matching hex #C0BDBA

# Faucets, sinks, range/microhood, refrigerator front (single metallic fixtures):
remove the existing faucet and install {image} centered behind the sink basin, polished stainless steel finish matching hex #C8C8C8
remove the existing sink and install {image} in the same countertop cutout, polished stainless steel finish matching hex #C8C8C8
```
**Key structural elements**:
- **Hex position**: inline mid-clause, NOT in a trailing parenthetical. The scoped-edit auto-suffix binds to the nearest anchor — keeping the hex away from the tail prevents the "paint this color exactly" misread.
- **Material descriptor**: "brushed gold finish", "matte black finish", "oil-rubbed bronze finish", "satin nickel finish". Describes the reflective material type immediately before the hex anchor, gating interpretation.
- **Zone enumeration**: `"upper, lower, corner, and center cabinets"` — same pattern as stained cabs (D101), forces scoped edit to reach multiple visual classes. Without this, scoped edit only updates one cab zone on a two-tone kitchen.
- **Combo vs all-pulls**: combo options (Seaver, Sedona Combo) use `"cabinet pulls and knobs"`. All-pulls options (Sedona All Pulls, Key Grande, Stanton) use `"cabinet pulls"`. Different authored clauses for different hardware structures.
- **Dimensions (single relative phrase)**: `"slim bar pull, small relative to cabinet face"` — ONE scale phrase, not three competing signals. Previous tests with "small slim bar pull, roughly a hand's span wide" had three competing scale signals and produced framing-bar-sized hardware.
- **Verb**: "change" beats "replace" for small repeated objects. BFL's documented "Replace" pattern works for single large objects (a range swap); for repeated small objects like hardware across multiple cabinets, "change" gives Flex more shape-interpretation room from the swatch.
**Validated**: 5 hardware options × scoped edit on a cumulatively-edited base image, all 5 produced visible correct hardware in the right zones. Grande Gold was the primary test with the most detailed iteration (3/3 on the final clause). The other 4 finishes were single-run tests and passed visually.
**Implementation**: Lab-only. Production path needs:
- Schema or runtime path to author material-specific clauses (joining the same gap flagged by D101 for stain verb and D100 for paint verb — this is the third material axis)
- `dimensions` field cleanup across hardware options (bad values were stripped during testing)
- Combo-vs-all-pulls clause variants (maybe a `hardware_structure` column on options)
**Validation gap**: Tested on one photo, one base state, one model (Flex g=7). Needs cross-photo validation. Also: the other 4 finishes were single-run visual checks — need 3-run consistency confirmation before production use.
**Trade-off**: The guide says "Caution with metallic finishes: Hex codes describe flat color... Consider omitting hex for metal surfaces." D103 shows you CAN use hex for metal if you gate it with a material descriptor. Without the gate, hex flattens the metallic appearance; with the gate, the hex is a color waypoint and the swatch still carries the reflective texture.
**Companion learnings from this session**:
- Scoped edit + cumulative edit works (watchlist items #7 and #8 resolved). A scoped edit on top of a hex-anchored full-gen base preserves the scene correctly.
- The `"Match image 2 exactly."` scoped-edit suffix in `buildProseScopedEdit` aggressively binds to the nearest preceding anchor. Clause-tail content needs to be friendly to this — keep hex out of the tail.
- Trailing positional modifier trap (critical rule #9) confirmed on hardware: `"drawer front"` was being parsed as "the front face of the drawer" and rendering only the front face. Dropped to `"drawer"` alone.

## D104: `render_mode` enum replaces `is_painted` flag; routing oracle unified
**Context (2026-04-15)**: Post-PR #5 stocktake on the prose builder flagged two frankenstein-shaped code smells. First, `buildProsePrompt` + `buildProseScopedEdit` + `resolveMerges` all dispatched on a cascading `(option.isPainted, option.swatchColor, isFixtureSubcategory(subId))` check to pick among five substitution paths (D100 paint, D101 stain, D102 textured, D103 metallic, lab forceHex). The `is_painted` column name was a lie — true meant "render via hex-only path", which covered both D100 paint AND D101 stain. New readers had to relearn that each time. Second, the hardware routing check was duplicated byte-for-byte between `deriveGenerationContext` (cache-key layer) and `selectFullGenModel` (pipeline layer) — PR #5 added tests at both sites so the cache key and the runtime model couldn't diverge, but there was no structural forcing function keeping them aligned.

**Decision**:
1. Rename `options.is_painted` → `options.render_mode` (text enum: `hex_paint | hex_stain | swatch_metallic | swatch_textured | NULL`). Column name is self-describing, dispatch becomes a switch on one value instead of a three-argument cascade, and the `isFixtureSubcategory` substring check drops out of the prose path entirely — metallic entries carry `swatchColor: null` upstream so the substitution loop is a plain truthy check.
2. Extract `hasHardwareRoutingTrigger(selections, optionLookup)` into step-config.ts as the single-source-of-truth oracle. Both cache-key layer and pipeline layer delegate to it.

**Backfill rules** (see `supabase/migrations/20260415_options_render_mode.sql`):
- `hex_paint` — old `is_painted = TRUE` with `swatch_color` set
- `hex_stain` — cabinet/vanity subs with swatch_color AND name matching stain keywords (stain/wood/oak/walnut/cherry/maple/mahog/driftwood/espresso/cappucino/sahara)
- `swatch_metallic` — sub slug matches `FIXTURE_PATTERNS` (hardware/faucet/sink/lighting/fan/refrigerator/range/dishwasher)
- `swatch_textured` — catchall for remaining options with a swatch_url
- `NULL` — legacy prompt-descriptor-only options rendered via buildEditPrompt

**Migration also backfilled latent hex gaps** (same PR because the render_mode classification depends on hex presence and was blocked by missing data):
- 12 SM stain options (laundry/powder/primary-bath/secondary-bath Cappucino/Driftwood/Sahara) got hex backfilled from slug-pattern match against kitchen twins
- 9 SM primary-bath paint options (Admiral Blue/Blue Smoke/Buttercream/Fog/Onyx/Pacific Sand/Saddle/White/Willow) got hex backfilled from same-name kitchen-cabinet-color twins
- The 9 crown/baseboard rows tagged `is_painted=true` without hex are untouched — their names don't match any kitchen twin, so they fall through to `swatch_textured` in the migration which is the correct final state (they render via molding profile swatch, not paint verb)

**Final distribution after migration**:
| Org | hex_paint | hex_stain | swatch_metallic | swatch_textured | NULL |
|-----|-----------|-----------|-----------------|-----------------|------|
| demo | 33 | 3 | 46 | 37 | 17 |
| stonemartin | 54 | 15 | 147 | 269 | 127 |

**Runtime consumers updated**: `src/types/index.ts` (Option.renderMode + new RenderMode type export), `src/lib/db-queries.ts` (both mapper blocks select render_mode instead of is_painted), `src/lib/generate.ts` (`resolveRenderMode` helper + dispatch switches in buildProsePrompt/buildProseScopedEdit/resolveMerges, pickActionTemplate signature changed `isPainted: boolean` → `renderMode: RenderMode | null`), `scripts/prompt-lab.ts` (forceHex sets `renderMode: "hex_stain"` on cloned lookup so per-material clauses pick the stain key).

**`resolveRenderMode` fallback**: the helper trusts `option.renderMode` when set, falls back to swatch-shape inference (hex_paint if swatchColor only, swatch_textured if swatchUrl). This exists for test fixtures and any future legacy data without the column populated; production data always has the column set post-migration. Intentional compromise — keeps existing test fixtures terse.

**What this did NOT collapse**:
- `FIXTURE_PATTERNS` still exists in step-config.ts and is still consumed by `flux-pipeline.ts` for the two-pass structural-vs-fixture swatch count. That's a different question from rendering ("should this surface go in pass 1 or pass 2") answered by the same substring patterns, and the two concerns don't actually line up 1:1 (two-pass is about ref-limit pressure, render_mode is about color binding). Kept independent.
- Dual builder (`buildProsePrompt` v2 vs `buildEditPrompt` legacy) is migration state, not code shape — 127 SM + 17 Demo options still render via legacy because they have no prose data. Goes away when legacy is deleted or every photo gets prose, not this refactor.
- Material-axis vs verb-axis mismatch (watchlist row 23 / Open Q #1). The per-material `{paint, stain}` clause shape still doesn't compose cleanly with object-replace verbs or metallic finish gates. Deeper design question — not a rename.

**Tests**: 283 → 283 (no new tests — existing per-material, D102 fixture-skip, and merge tests exercise every render_mode branch via the `renderMode` field + `resolveRenderMode` fallback). `npx tsc --noEmit` clean.

## D105: Default options skipped from prompt (2026-04-16)

**Decision**: `buildProsePrompt` + `buildEditPrompt` skip options with `is_default=true`. Source photo already shows the default state — no transformation is needed.

**Why**: Pass-2 fixture prompts had 5 metallic swatches competing (hardware, faucet, sink, range, fridge). Hardware + range were defaults = no-ops from source, but consumed swatch slots + attention budget. Dropping them (5→3 fixtures) unblocked faucet, sink, and fridge.

**Rule**: any option that IS the photo's baseline state gets skipped. The `is_default` flag is the proxy for "matches source."

## D106: Guidance default = 8 for Flex (2026-04-16)

**Decision**: `DEFAULT_FLEX_GUIDANCE = 8` in `flux-pipeline.ts`, applied to all Flex full-gen and scoped-edit calls.

**Why**: BFL's own default (4.5) was too low for multi-surface prompts. Pass-2 fixtures consistently failed at 4.5 but landed at 8 in every lab sweep. All Nest kitchen validation (2026-04-15/16) ran at g=8.

## D107: Hex anchor narrowed to hardware-only skip (2026-04-16)

**Decision**: Metallic hex-skip narrowed from ALL `swatch_metallic` options to only subcategories containing "hardware" in the slug. Sink, faucet, fridge, range now get D102-style hex anchors.

**Why**: PR #5 blanket-skipped hex for all fixtures because hardware bronze (#804A2E) rendered as fire-engine red. But neutral hex (#C8C8C8 stainless, #CCBA78 gold) doesn't cause the same distortion. In bundled pass-2 with 3+ fixtures, hex anchors are needed for attention binding — without them, fixtures get no color guidance and fail silently.

## D108: T-bar pull hardware migration (2026-04-16)

**Decision**: Demo Nest kitchen hardware migrated from 5 combo SKUs (Seaver pull+knob, Sedona pull+knob, Stanton all-pulls) to 3 T-bar pull finish-only SKUs (Black, Gold, Stainless). Source photo already has T-bar pulls; finish swap only, no shape change.

**Why**: Flex can't reliably change hardware shape (row 25 — installs generic bar-pull prior regardless of swatch). Max CAN but combo SKUs with knob+pull in one swatch confused Max (double-install, cone misplacement). Matching source geometry eliminates the shape-fidelity requirement entirely.

## D109: Fridge install via dedicated Max secondPass (2026-04-16)

**Decision**: When a non-default refrigerator is selected, a dedicated Max pass runs AFTER the main Flex render to install the fridge in the alcove. Policy-driven via `step_photo_generation_policies` with `model: "flux-2-max"` override.

**Why**: Fridge installs are heavy geometry-adds that fail in bundled Flex pass-2 (attention starvation from competing fixtures). Fridge works on Flex scoped-edit (single surface, full attention) and on Max dedicated pass. The secondPass architecture already existed (was used for range); re-purposed for fridge with model override.

## D110: Allowed action clause verbs (2026-04-16)

**Decision**: Action clauses in `step_photos.prompt_prose.actions` must lead with one of: `change`, `replace`, `apply`, `paint`, `stain`. The verb `remove existing X and install` is banned.

**Why**: "Remove existing" produced duplicate-fixture-on-island failures (faucet appeared on island + back wall simultaneously in 2/6 Max bundled runs). Doesn't fix shape fidelity (tested: identical output to `change X to match`). Every clause rewrite away from "remove" was a quality improvement.
