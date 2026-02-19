# Finch: AI-Powered Home Upgrade Visualization Platform

## Vision Statement

Production home builders lose millions in upgrade revenue because buyers can't see what their choices look like. Finch replaces printed PDFs and static design centers with an interactive upgrade picker powered by AI-generated room visualizations. Buyers see their exact selections rendered in their actual floor plan — countertops, cabinets, flooring, backsplash — in real time. Builders sell more upgrades with less friction.

## The Problem

- Buyers choose $8-12K in home upgrades from **printed PDFs or physical sample boards** (AL/GA regional; coastal/luxury markets see $30-60K)
- No visual context for how material combinations look together
- No real-time price tracking as they select
- Decision paralysis slows the sales cycle and reduces upgrade revenue
- Physical design centers cost $500K-$2M+ to build and staff
- Existing digital tools (Zonda Envision) use expensive pre-rendered 3D scenes with limited flexibility

## The Solution

An interactive web-based upgrade picker with:
- **All upgrade categories** from the builder's real pricing sheet (cabinets, countertops, flooring, paint, fixtures, appliances, electrical, plumbing, trim, etc.)
- **AI-generated room visualizations** — buyers see their specific material/color selections rendered in photos of the actual floor plan
- **Real-time price tracking** summing all selections
- **Social proof nudges** ("73% of buyers choose this") to drive upsell
- **Swatch images** for every visual option
- **Pre-cached common combinations** for instant display; on-demand generation for unique combos

## Why Now

- Generative AI image quality crossed the threshold for photorealistic interior visualization in 2025
- Cost per AI-generated image dropped below $0.05 (GPT Image 1.5)
- No one is combining generative AI with the production builder upgrade workflow — this is an unoccupied niche
- Zonda Envision (the incumbent) uses traditional 3D rendering — expensive, inflexible, and slow to update

## Market

### Target Customer
- **Production home builders** doing **200-2,000 homes/year**
- Homes in the $250K-$500K range where upgrade revenue is meaningful
- Currently using physical design centers, PDFs, or basic online configurators
- Tech budget: $100K-$400K/year — can absorb $11-54K/year easily

### Market Size
- ~453,000 home building businesses in the US ($170B industry)
- **Target segment** (200+ homes/year): ~2,000-5,000 builders nationally
- **Initial focus**: Southeast US (Alabama, Georgia, Tennessee, Florida) — ~200-500 builders
- Even 10 clients at $1-2K/month = strong recurring revenue

### Key Stat
**Zonda Envision reports buyers spend 35% more on upgrades when they can visualize their choices.** In the AL/GA regional market, upgrades average $8-12K per home (not the $30-60K seen in coastal/luxury markets). Our first real test: a frugal investment-property buyer went from $5,200 → $7,290 (+$2,090, 40% lift) — and they were actively trying to minimize spend. For a builder doing 500 homes/year at $10K avg, even a conservative $2,000/sale lift = **$1M additional revenue annually**. The tool pays for itself 20x over.

## Competitive Landscape

| Competitor | Approach | AI? | Builder-Specific? | Weakness |
|------------|----------|-----|-------------------|----------|
| **Zonda Envision** | Pre-rendered 3D scenes, 225+ brands | No | Yes | Expensive, inflexible, no AI |
| **Constellation Design Studio** | ERP + option management | No | Yes | Workflow tool, no visualization |
| **Spacely AI / HomeDesigns AI** | AI room visualization | Yes | No | Consumer-focused, no builder workflow |
| **Finch (us)** | AI visualization + builder upgrade workflow | Yes | Yes | **Only player in this space** |

### Our Differentiator
We're the only product that combines:
1. **Generative AI visualization** (not pre-rendered 3D)
2. **Builder-specific upgrade workflow** (real pricing, real options, real floor plans)
3. **Social proof / upsell intelligence** built into the selection flow
4. **Affordable for mid-size builders** ($5-10K setup vs. $50K+ for enterprise solutions)

## Business Model

### Pricing

#### Finch Starter — $149/floor plan/mo
Builder does the setup. We provide the platform.

- Builder uploads own room photos
- On-demand AI generation (~60 second wait per image)
- **1,000 generations/floor plan/mo** (enough to build cache + serve buyers)
- Admin dashboard for option/pricing updates
- Docs + email support
- **Optional one-time setup: $500-750** — we scrape their upgrade options and swatch images from their website/suppliers and load them. Takes ~1-3 hours. Builder just adds room photos after.

**Note on Starter quality risk:** Builders uploading bad photos get bad AI output and blame the product. The optional setup is the default recommendation. Consider a photo quality gate (reject low-res/dark uploads with retake guidance). In this market, word of mouth is everything — one bad experience travels fast.

#### Finch Pro — $299/floor plan/mo
We handle everything. Buyers see instant results.

- Professional photography coordinated by us (included in setup)
- Full option/pricing transcription from builder's PDF sheets
- Swatch image sourcing across all visual categories
- Custom spatial descriptions and prompt engineering per room
- Pre-generation of ~5,000 images per floor plan (instant results for buyers)
- QA'd for 98%+ accuracy
- Priority support
- Admin dashboard for builder's team
- **Done-For-You Setup: $2,500 first floor plan, $1,500 each additional**

**Done-For-You Setup includes** (~20 hours of skilled work):
- Professional room photography coordination ($500-1,000)
- Option/pricing transcription from builder's sheets (often messy PDFs → structured data)
- Swatch image sourcing (cabinets, countertops, backsplash, flooring, faucets, sinks, hardware, appliances)
- Custom spatial hints per room (e.g., "fridge in alcove left, range in cutout, sink under window")
- Prompt descriptors per upgrade option
- AI pre-generation (~5,000 images/floor plan) via GPU batch
- QA review, prompt tuning, regeneration of bad outputs
- Configuration, branding, testing

**Frame as a deliverable, not a fee:** "Professional photography, full option catalog setup, AI prompt tuning, and 5,000+ pre-generated room images. Your tool is ready within 5-7 business days."

**New floor plans after initial setup:** $1,500 each (partially reusable swatch/photography work). Typically live within 5 business days.

#### Founding Partner Program (First 1-2 builders only)
For early adopters / case study builders. Goal is proof and testimonial, not revenue.

| | Amount |
|---|---|
| **Done-For-You Setup** | **Waived** (we eat ~$1-2K in hard costs) |
| **Floor plans included** | **3 best-selling plans** |
| **First 3 months** | **Free** |
| **After 3 months** | Standard Pro pricing: $299/floor plan/mo |
| **Want more plans?** | $299/floor plan/mo + $1,500 setup each |

**The pitch**: "I'll set up your 3 best-selling floor plans for free — professional photography, full option catalog, AI visualization, everything. You use it for 3 months. If it's not working, you walk away. No setup fee, no commitment."

**Explicitly state the value:** "Our Done-For-You Setup is normally $2,500 per floor plan. As a founding partner, we're waiving that entirely. In exchange, we'd love a testimonial and the ability to reference you as a customer."

**Why**: First non-SM builder is worth more as a case study than revenue. 3 plans keeps hard costs manageable (~$500-700 with GPU) while covering the majority of their sales volume. After 3 months of results, they'll want remaining plans added — at full price.

#### 14-Day Trial
- 1 floor plan, 50 generations
- Full functionality, no watermark
- Growth hacker recommends white-gloving every trial (spend 2 hours setting it up properly so they see Pro-quality output). Converts at 2-3x the rate of self-service trials.
- Don't over-invest in trial automation yet. First 2-3 deals are handshake deals. Trial matters at builder #5+.

#### Pricing Principles
- **No volume discounts published.** Handle ad hoc if a 10+ plan builder asks.
- **No annual pricing yet.** Need flexibility to raise prices once we have ROI data. Revisit at 5+ builders.
- **"Floor plan" not "plan"** everywhere — avoids confusion with pricing tiers.
- **Setup fees off the pricing page.** Monthly price is the headline. Setup discussed in sales conversation.
- **Starter CTA: "Start Trial"** (self-serve, low friction). **Pro CTA: "Talk to Us"** (high-touch).
- **Position as ROI, not cost.** "Buyers who see their upgrades buy 35% more" is the headline. Not "AI-generated kitchen visualization."
- **vs Zonda:** "Zonda Envision is built for the top 50 builders in America. Finch is built for everyone else." Don't be "cheap Zonda" — be "Zonda results for builders Zonda ignores."

### Example Deals

**Stone Martin-sized (~15 floor plans, ~500 homes/year) — Pro**
- Setup: $2,500 + 14 x $1,500 = $23,500
- Monthly: 15 x $299 = $4,485/mo ($53.8K/yr)
- **Year 1 total: ~$77K**

**Lowder-sized (~10 floor plans, ~200 homes/year) — Pro**
- Setup: $2,500 + 9 x $1,500 = $16,000
- Monthly: 10 x $299 = $2,990/mo ($35.9K/yr)
- **Year 1 total: ~$52K**

**Craftway-sized (~3 floor plans on Pro, ~50 homes/year)**
- Setup: $2,500 + 2 x $1,500 = $5,500
- Monthly: 3 x $299 = $897/mo ($10.8K/yr)
- **Year 1 total: ~$16K**

**Craftway as Founding Partner (3 best-selling plans)**
- Setup: **waived**
- First 3 months: **free**
- Months 4-12: 3 x $299 = $897/mo x 9 = $8.1K
- **Year 1 total: ~$8.1K** (they pay), ~$500-700 (we eat in hard costs w/ GPU)
- **Easy yes** — zero risk, zero upfront, walk away if it doesn't work
- **Expansion**: remaining plans at $299/mo + $1,500 setup each

**Small builder trying Starter (~3 floor plans, DIY)**
- Setup: $500 (optional, we load their options)
- Monthly: 3 x $149 = $447/mo ($5.4K/yr)
- **Year 1 total: ~$5.9K**

**"Just let me try one floor plan" — Starter**
- Monthly: $149/mo ($1.8K/yr)
- **Lowest possible entry point**

### Revenue Projections — Growth Over Time

Assumes mix of Starter and Pro builders, weighted toward Pro.

| Active Builders | Avg Plans | Avg $/plan | Monthly Revenue | Annual Revenue |
|----------------|-----------|-----------|----------------|----------------|
| 2 | 4 | $250 | $2,000 | $24K |
| 3 | 5 | $250 | $3,750 | $45K |
| 5 | 5 | $260 | $6,500 | $78K |
| 8 | 6 | $270 | $12,960 | $156K |
| 10 | 6 | $275 | $16,500 | $198K |

*Plus setup fees: 5 Pro builders/yr x ~$5,500 avg = ~$27.5K additional*

### Capacity & Scaling — Solo Operator Limits

| Active Builders | Maintenance/mo | Onboard Capacity | Monthly Rev | Hours Left for Sales/Product |
|----------------|---------------|-----------------|-------------|------------------------------|
| 2 | 4-8 hrs | 2/mo | $2K | ~60 hrs |
| 3 | 6-12 hrs | 1-2/mo | $3.8K | ~50 hrs |
| 5 | 10-20 hrs | 1/mo | $6.5K | ~30 hrs |
| 8 | 16-32 hrs | Maybe 1/mo | $13K | ~20 hrs |
| 10 | 20-40 hrs | Stretched | $16.5K | ~10 hrs |

**The hire point: ~6-8 builders.** At $13K+/mo ($156K+/yr) a part-time ops person for maintenance and option updates is affordable and frees you to sell and onboard. Before that, automate what you can (admin dashboard, self-serve option edits) to stretch solo capacity.

**Key scaling lever:** Every hour shaved off the 20-hour Pro onboarding doubles capacity ceiling. Invest product time in reducing onboarding — templates, auto-transcription, photo validation — before anything else.


### Builder ROI — Why the Tool Pays for Itself

**Key stat**: Zonda Envision reports buyers spend **35% more on upgrades** when they can visualize their choices. Even at conservative estimates, the math is overwhelming.

**Stone Martin-sized (~500 homes/year, ~$10K avg upgrades, 15 plans on Pro)**
Current upgrade revenue: ~$5M/year | Annual tool cost: ~$53.8K

*Regional context: In the AL/GA market, $42K in upgrades is considered extremely high. Most Stone Martin buyers spend $8-12K in upgrades. One frugal buyer (investment property, intentionally minimizing) went from $5,200 → $7,290 after using the tool — a $2,090 lift (40%) from someone actively trying NOT to spend more. Typical buyers spending $10K would likely see even larger lifts since they're already willing to spend on their home.*

| Buyer Adoption | Per-Sale Lift | Additional Revenue/Year | Annual Tool Cost | **Net Gain** | **ROI** |
|---|---|---|---|---|---|
| 50% | $2,000 (conservative) | $500K | $53.8K | **$446K** | 9.3x |
| 75% | $2,000 (conservative) | $750K | $53.8K | **$696K** | 13.9x |

**Small AL/GA builder (~50 homes/year, ~$8K avg upgrades, 3 plans on Pro)**
Current upgrade revenue: ~$400K/year | Annual tool cost: ~$10.8K

| Buyer Adoption | Per-Sale Lift | Additional Revenue/Year | Annual Tool Cost | **Net Gain** | **ROI** |
|---|---|---|---|---|---|
| 50% | $1,200 (typical) | $30K | $10.8K | **$19.2K** | 2.8x |
| 75% | $2,000 (conservative) | $75K | $10.8K | **$64.2K** | 6.9x |

With the new pricing, small builders on 3 Pro plans pay ~$10.8K/yr — well within ROI range even at conservative adoption. The **Founding Partner program** (3 months free) lets them see actual results before committing.

**Small builder on Starter (~3 plans, DIY)**
Annual tool cost: ~$5.4K

| Buyer Adoption | Per-Sale Lift | Additional Revenue/Year | Annual Tool Cost | **Net Gain** | **ROI** |
|---|---|---|---|---|---|
| 50% | $1,200 (typical) | $30K | $5.4K | **$24.6K** | 5.6x |
| 75% | $2,000 (conservative) | $75K | $5.4K | **$69.6K** | 13.9x |

Starter's lower cost makes the ROI math easy — if the builder can provide decent photos and the output quality holds up.

### Beyond Revenue — The Full Value Case

The ROI tables only capture upgrade revenue lift. The tool changes the entire selection experience:

**For buyers:**
- Browse options at home, on their own time, no appointment pressure
- Both partners see it together — no "my husband needs to see it first"
- Actually see what combinations look like in their kitchen before committing
- More time with options = more confidence = willingness to spend more
- Fewer regrets and change orders — they saw it before they committed

**For the builder's team:**
- Buyers show up to design center with selections already made — designer confirms, not hand-holds
- 3-hour design appointments become 1-hour confirmations
- At 50 homes/yr, that's ~100 hours/yr of designer time saved
- Fewer change orders = fewer delays in construction schedule
- The tool works 24/7 — buyers engage evenings and weekends when they're actually making decisions

**The pitch isn't just "you'll sell more upgrades."** It's: your buyers will be happier with what they chose, your team spends less time hand-holding, and they spend more. The before-and-after is a buyer flipping through a PDF in a design center vs. sitting on their couch with their spouse seeing their actual kitchen with the options they're choosing.

### Handling Objections
- **"That's a lot upfront"** — Try Starter at $149/floor plan/mo, no setup fee. Or start with one Pro floor plan ($2,500 setup + $299/mo) and prove the ROI.
- **"Only some of my buyers would use this"** — ROI tables above account for 50% adoption and the math still works.
- **"Why does setup cost $2,500?"** — Professional photography, full option catalog transcription, AI prompt tuning, 5,000+ pre-generated room images, and QA. It's a 2-3 week build-out — real work, real deliverable. Comparable to what you'd pay for a Matterport tour.
- **"What am I paying $299/mo for?"** — 24/7 platform access, instant AI visualization for every buyer session, image cache maintenance, option/pricing updates, priority support, and an admin dashboard for your team.
- **"I just want to try it"** — Starter is $149/mo for one floor plan. Upload a photo and see it work today. 14-day trial available.

### Cost Structure

**Pre-generation is non-negotiable.** Each image takes ~60 seconds to generate. Buyers won't wait — the tool must feel instant. That means ~5,000 pre-cached images per plan.

**The pre-cache math:**
- 5,000 images x 60 sec = **83 hours of generation per plan**
- 8 plans (Craftway-sized builder) = **667 hours** (~28 days 24/7)
- At API pricing ($0.04-0.15/image): **$200-750 per plan, $1,600-6,000 for 8 plans**

**Hard costs per builder onboarding:**

| Item | API Pricing | GPU Pricing |
|------|------------|-------------|
| Your time (20 hrs) | — | — |
| Photography | $500-1,000 | $500-1,000 |
| Pre-generation (8 plans x 5K) | $1,600-6,000 | ~$40 |
| Hosting/infra | ~$45/mo | ~$45/mo |
| **Total hard costs** | **$2,100-7,000** | **$540-1,040** |

**Option A: API-based**
- Generation: ~$0.04-0.15/image
- Works for first builder but margins are thin on smaller builder deals
- Rate limits and 60s generation time make batch pre-gen slow

**Option B: Self-hosted GPU**
- RTX PRO 6000 workstation: ~$10-13K one-time
- Generation cost: ~$0.001/image (electricity only)
- No rate limits — can parallelize, run overnight batches
- Break-even: basically one small builder onboarding in saved API costs

**Recommended path**: Get GPU before first non-SM builder onboarding. The pre-generation costs on API pricing eat most of the margin on smaller builder deals. A $4K setup fee with $4-6K in API generation costs is underwater. With GPU, that same deal has $3K+ margin.

## Technical Architecture

### Already Built (Stone Martin Demo)
- Next.js 16 web app with step-based wizard UI
- 5-step upgrade flow covering all categories from real pricing PDF
- AI image generation pipeline (Gemini/OpenAI via Vercel AI SDK — model-swappable)
- Supabase image cache (hash-based dedup, CDN-served)
- 166 scraped swatch images
- Real pricing data from Kinkade plan PDF
- Social proof nudges on high-value options
- Two-column sidebar layout with sticky AI image preview
- Mobile responsive

### Multi-Tenant Roadmap
The current architecture supports multi-tenant with minimal changes:
1. **Per-builder config**: pricing data, floor plans, swatch images, branding
2. **Per-builder cache**: Supabase already keys by selection hash
3. **Buyer identification**: already has buyerId-based selection persistence
4. **White-label**: swap logo, colors, builder name
5. **Admin dashboard**: manage builders, view analytics, monitor cache

### Pre-Generation Strategy
For each builder's floor plan portfolio:
- Identify top 5 visual subcategories (countertop, cabinet color, backsplash, flooring, cabinet style)
- Pre-generate top 8-12 options per subcategory = **~5,000-15,000 images per plan**
- Cost: ~$200-600/plan at API pricing, or near-zero with GPU
- Result: **instant visualization for 80-90% of buyer selections**

Full research with 30+ builders across AL/GA, tiered by priority and organized by geography:

**[AL/GA Builder Prospect List](research/al-ga-builders.md)**

Highlights:
- **7 builders within driving distance of Montgomery** (Lowder, Goodwyn, Hughston, Holland, Alexander Scott, Trademark, Dilworth)
- **Best first target**: Lowder New Homes — Stone Martin's direct competitor, same city
- **Best timing play**: Alexander Scott Homes — brand new company, building processes now
- **Best intro play**: Centennial Homes (Birmingham) — co-founder is 2025 GBAHB president
- **30+ total prospects** across Montgomery, Birmingham, Atlanta, Huntsville, Gulf Coast
- HBA directory links for ongoing prospecting

## Go-to-Market

### Phase 1: Prove It (Now)
- Stone Martin demo as proof-of-concept (SM is NOT a target customer — they use BuilderLinq for selections already)
- Generate compelling before/after: PDF sheet vs. interactive tool with AI visualization
- Real data point: frugal buyer $5,200 → $7,290 (+$2,090, 40% lift) after using the tool — and they were trying to minimize spend

### Phase 2: First Builder — Founding Partner (Q2 2026)
- Target builders still on PDFs/sample boards — Craftway, Lowder, Conner Brothers, etc.
- Use SM demo to show what their tool would look like, then build theirs
- Founding Partner deal: 3 plans, setup waived, 3 months free
- Measure upgrade revenue impact, get testimonial / case study

### Phase 3: Second Builder — First Paying Customer (Q3-Q4 2026)
- Use founding partner's results to close second builder on Starter or Pro
- Demo the actual tool (not a pitch deck) — show their competitor using it
- HBA events, local networking (Greater Montgomery HBA, GBAHB)
- **2026 exit target: 2 builders, 3+ plans each = $25-50K Year 1**

### Phase 1.5: GPU Investment (Before First Non-SM Builder)
- Acquire self-hosted GPU (RTX PRO 6000 or equivalent, ~$10-13K)
- Pre-generation on API is ~$4-6K per small builder and takes weeks of continuous generation
- GPU drops that to ~$40 and enables overnight batch generation
- **Must have before onboarding smaller builders** — API margins don't work at that price point

### Phase 4: Expand & Scale (2027)
- Expand existing builders to more plans (natural upsell)
- Onboard 3-5 total builders
- Attend Southeast Building Conference (SEBC), International Builders' Show (IBS)

## Sales Approach

### The One-Liner
**"I help builders increase upgrade revenue with an AI-powered visualizer that lets buyers see their selections before they commit. It costs a fraction of what the big platforms charge and I can have you up and running in weeks."**

### How to Work a Room (HBA Events, Meetups)
Don't pitch. Have conversations. Ask questions:
- "What's your selection process like?"
- "How do your buyers choose upgrades?"

Let them describe the pain. Then: *"That's interesting — I actually built something for that."* Show them your phone. The demo sells itself.

### Where to Be
- **Home Builders Association of Alabama** — events and meetings
- **Greater Montgomery HBA** — local events
- **Southeast Building Conference (SEBC)**
- **International Builders' Show (IBS)**

These rooms are full of regional builders doing 20-200+ homes/year who know their selection process is clunky but don't have a solution. You'd be the only person with a working product that directly impacts their upgrade revenue.

### Target in These Rooms
Not the nationals (D.R. Horton, Lennar) — they have enterprise solutions. Target the **regional builders doing 20-200 homes/year** who are using PDFs and physical sample boards. They feel the pain every day but think the fix is a $500K design center they can't afford.

## The Pitch (Alternate — For Decks/Written Materials)

**"Your buyers choose $8-12K in upgrades from a printed sheet — we let them see exactly what their kitchen looks like before they sign. In our first test, a buyer who was trying to spend as little as possible still spent 40% more after seeing it visualized. Scale that across 500 homes and you're looking at a million in additional revenue."**
