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

### Pricing — Current Thinking (Pre-Launch, Subject to Change)

#### Model: Done-For-You, Per Floor Plan, No Tiers

Self-serve is dead. 380 elements per floor plan (SM Kinkade) = no builder is doing this themselves. One model: we handle all setup, they pay per floor plan per month.

**What we deliver per floor plan:**
- Option/pricing transcription from builder's sheets (often messy PDFs → structured data)
- Swatch image sourcing (cabinets, countertops, backsplash, flooring, faucets, sinks, hardware, appliances)
- Custom spatial hints per room
- Prompt descriptors per upgrade option
- AI pre-generation (~3,000 images/floor plan) for instant buyer experience
- QA review, prompt tuning, regeneration of bad outputs
- Configuration, branding, testing
- Admin dashboard for ongoing option/pricing updates
- Unlimited buyer sessions, no per-session fees

**Speed advantage:** First floor plan live in 48 hours. Then 10 plans/day after initial setup. Competitors (Zonda, Hyphen, Aareas) take 2-3 months.

**Photography:** Evaluate during sales conversation. Clean, well-lit model home photos = use them. Otherwise bake photography cost into the setup quote.

#### Price Range Under Consideration

Pricing is NOT on the landing page. Drive to conversations first, learn from early pilots.

| Price/plan/mo | 3 plans annual | Break-even homes (at 10% lift on $10K avg) | Notes |
|---|---|---|---|
| $199 | $7.2K | 8 homes | Floor price. Easy yes for any builder. Maybe too cheap for 100+ home builders. |
| $299 | $10.8K | 11 homes | Comfortable for 50+ home builders. Leaves room to grow. |
| $499 | $18K | 18 homes | Works for 100+ home builders. 50-home builders need convincing. |
| $799 | $28.8K | 29 homes | Enterprise-adjacent. Only for 200+ home builders with clear ROI. |

**Current lean:** Start conversations without a published price. Pilot first plan free. Quote based on builder size after the pilot proves value. Likely land $299-499/plan/mo for production builders, potentially higher for luxury/semi-custom with high upgrade revenue per home.

**Volume-based pricing option (not decided):**

| Builder size | Price/plan/mo | Rationale |
|---|---|---|
| Up to 100 homes/yr | $299 | Accessible, clear ROI at 50+ homes |
| 100-500 homes/yr | $499 | Delivering $100K+ in value, price matches |
| 500+ homes/yr | Custom | Too much value to leave on the table |

**Setup fees:** TBD. Could be waived entirely (baked into monthly), or charged as one-time ($1,500-2,500/plan). Waiving setup removes friction. Charging setup filters for serious buyers. Pilot program waives everything regardless.

#### Pilot Program (Replaces "Founding Partners")

Builders understand pilots. "Founding Partner" sounds like startup energy. Just make a straightforward offer.

- We set up one floor plan at no cost
- Builder uses it with real buyers for 60 days
- We measure upgrade revenue together
- If the numbers work, expand to full catalog at agreed pricing
- If they don't, walk away — no obligation

**The pitch:** "We'll set up your best-selling floor plan for free. Your buyers use it. We measure what happens. If upgrade revenue goes up, we talk about your other plans. If it doesn't, you walk away."

**Why:** First non-SM builder is worth more as a case study than revenue. Hard costs per pilot plan are minimal (~$25-50 GPU + our time).

#### Interactive Demo (Replaces Trial)
No free trial. Public demo on the landing page:
- Upload their own room photo
- Test visualization against a curated set of upgrades
- See the quality with zero commitment

**Why this beats a trial:** No signup friction, no expiration anxiety, no bad self-serve output. They see done-for-you quality on *their* photo immediately. The CTA after the demo is "Ready to set this up for your floor plans?"

#### Pricing Principles
- **No price on the landing page.** Drive to conversations. Learn from early pilots before publishing.
- **No volume discounts published.** Handle ad hoc.
- **No annual pricing yet.** Need flexibility to raise prices. Revisit at 5+ builders.
- **"Floor plan" not "plan"** everywhere — avoids confusion with pricing tiers.
- **Position as ROI, not cost.** Revenue framing, not feature lists.
- **vs Zonda:** "Zonda Envision is built for the top 50 builders in America. Finch is built for everyone else." Don't be "cheap Zonda" — be "Zonda results for builders Zonda ignores."
- **Frame setup as a deliverable, not a fee:** "Full option catalog, pre-generated images, QA'd and live in 48 hours."

### Ideal Customer Profile (ICP) — Under Refinement

The qualifier isn't homes per year — it's **upgrade revenue per year**. Two very different builders can both be ideal:

| Builder type | Homes/yr | Avg upgrades | Upgrade revenue/yr | Finch fit |
|---|---|---|---|---|
| Scrappy starter | 20 | $8-10K | $160-200K | Weak. No budget, no systems, no design process. Needs a CRM before Finch. |
| Boutique/semi-custom | 20 | $30-60K | $600K-1.2M | Strong. High upgrade revenue, design-driven buyers, willing to invest in tools. |
| Regional production | 50-200 | $8-12K | $400K-2.4M | Sweet spot. Have a selection process (even if messy). Real upgrade revenue to protect. Big enough to have someone evaluating tools. |
| Large production | 200-500 | $10-15K | $2-7.5M | Strong. Clear ROI. Can justify higher price points. |
| National (500+) | 500+ | varies | $5M+ | Probably not — they have enterprise solutions (Zonda, Hyphen). Don't chase. |

**Practical filter for qualifying builders:**
1. Do they have a selection process? (design center, design appointments, option sheets — anything structured)
2. Do buyers choose visual finishes? (not just lot premiums and structural options)
3. If yes to both → Finch customer regardless of volume

**Minimum viable customer:** ~50 homes/year production, OR any volume with $30K+ avg upgrades (luxury/semi-custom). Below 50 homes at $8-12K upgrades, the ROI is tight and the builder is likely too resource-constrained to engage.

**Open question:** Are 20-home luxury builders worth pursuing early? They have budget and pain, but they're scattered and hard to find. Production builders at 50-200 homes cluster in metro areas and attend HBA events. Easier to reach. Revisit after first 5 pilots reveal who actually converts.

### Team & Roles

Unlimited seats. No per-seat charges. Roles control access:

| Role | Can do | Typical user |
|------|--------|-------------|
| **Owner** | Billing, account settings, everything | Whoever signs the contract |
| **Admin** | Edit options/pricing, upload photos, manage floor plans | Design center manager |
| **Viewer** | Analytics, buyer activity, read-only | VP of Sales, sales agents |

Teams are small (3-5 people max). Seat-based pricing adds friction.

### ROI Math by Builder Size

Assumes 10% upgrade lift (conservative) on $10K avg upgrades = $1,000 more per home.

| Builder size | Additional revenue/yr | At $299/plan/mo (3 plans) | ROI | At $499/plan/mo (3 plans) | ROI |
|---|---|---|---|---|---|
| 20 homes | $20K | $10.8K | 1.9x | $18K | 1.1x |
| 50 homes | $50K | $10.8K | 4.6x | $18K | 2.8x |
| 100 homes | $100K | $10.8K | 9.3x | $18K | 5.6x |
| 200 homes | $200K | $10.8K | 18.5x | $18K | 11.1x |
| 500 homes | $500K | $10.8K | 46.3x | $18K | 27.8x |

At 50+ homes, even $499/plan shows nearly 3x ROI. At 100+ homes, the tool is radically underpriced at any published number. Handle large builders in conversation.

### Revenue Projections — Done-For-You Model

All builders are done-for-you. No self-serve tier. Every builder requires setup labor (~4-6 hrs/plan after tooling improvements, down from ~20 hrs for SM).

**At $299/plan/mo:**

| Builders | Avg Plans | Monthly Revenue | Annual Revenue |
|----------|-----------|-----------------|----------------|
| 5 | 3 | $4,485 | $54K |
| 10 | 4 | $11,960 | $144K |
| 20 | 4 | $23,920 | $287K |
| 50 | 5 | $74,750 | $897K |

**At $499/plan/mo:**

| Builders | Avg Plans | Monthly Revenue | Annual Revenue |
|----------|-----------|-----------------|----------------|
| 5 | 3 | $7,485 | $90K |
| 10 | 4 | $19,960 | $240K |
| 20 | 4 | $39,920 | $479K |
| 50 | 5 | $124,750 | $1.5M |

**The floor for a real business:** 20 builders × 3 plans × $199/mo = $143K/yr. Even the most conservative scenario works as a solo operation.

### Capacity & Scaling — Done-For-You

Every builder requires setup labor. The bottleneck is onboarding throughput.

**Setup time per plan (improving):**
- SM Kinkade (first ever): ~20 hrs/plan (380 elements, building all tooling from scratch)
- With current tooling + seed script: ~4-6 hrs/plan (estimated)
- With batch automation improvements: ~2-3 hrs/plan (target)

**Speed claim: 48 hours to first plan, then 10 plans/day.** This assumes dedicated focus and working tooling. Real throughput depends on how messy the builder's source materials are.

| Builders/month onboarding | Plans | Setup hrs/month | Maintenance hrs/month | Total hrs | Feasible solo? |
|---|---|---|---|---|---|
| 1 (3 plans) | 3 | 12-18 | 2-4 | 14-22 | Easily |
| 2 (6 plans) | 6 | 24-36 | 4-8 | 28-44 | Yes |
| 4 (12 plans) | 12 | 48-72 | 8-12 | 56-84 | Tight — need to prioritize |
| 6+ (18+ plans) | 18+ | 72-108 | 12-18 | 84-126 | Need help |

**Hire when:** consistently onboarding 4+ builders/month AND maintaining 15+ active builders. That's ~$50-100K MRR depending on pricing — revenue supports the hire.

**Key scaling lever:** Invest in self-serve onboarding quality — guided setup wizard, photo quality gates, templates, good docs. Every improvement to self-serve compounds across all Essentials builders. Concierge onboarding optimization matters less when it's only 5-10 builders.


### Builder ROI — Why the Tool Pays for Itself

**Key stat**: Zonda Envision reports buyers spend **35% more on upgrades** when they can visualize their choices. Even at conservative estimates, the math is overwhelming.

**Stone Martin-sized (~500 homes/year, ~$10K avg upgrades, 15 plans on Concierge)**
Current upgrade revenue: ~$5M/year | Annual tool cost: ~$53.8K

*Regional context: In the AL/GA market, $42K in upgrades is considered extremely high. Most Stone Martin buyers spend $8-12K in upgrades. One frugal buyer (investment property, intentionally minimizing) went from $5,200 → $7,290 after using the tool — a $2,090 lift (40%) from someone actively trying NOT to spend more. Typical buyers spending $10K would likely see even larger lifts since they're already willing to spend on their home.*

| Buyer Adoption | Per-Sale Lift | Additional Revenue/Year | Annual Tool Cost | **Net Gain** | **ROI** |
|---|---|---|---|---|---|
| 50% | $2,000 (conservative) | $500K | $53.8K | **$446K** | 9.3x |
| 75% | $2,000 (conservative) | $750K | $53.8K | **$696K** | 13.9x |

**Small AL/GA builder (~50 homes/year, ~$8K avg upgrades, 3 plans on Concierge)**
Current upgrade revenue: ~$400K/year | Annual tool cost: ~$10.8K

| Buyer Adoption | Per-Sale Lift | Additional Revenue/Year | Annual Tool Cost | **Net Gain** | **ROI** |
|---|---|---|---|---|---|
| 50% | $1,200 (typical) | $30K | $10.8K | **$19.2K** | 2.8x |
| 75% | $2,000 (conservative) | $75K | $10.8K | **$64.2K** | 6.9x |

With the new pricing, small builders on 3 Concierge plans pay ~$10.8K/yr — well within ROI range even at conservative adoption. The **Founding Partner program** (3 months free) lets them see actual results before committing.

**Small builder on Essentials (~3 plans, DIY)**
Annual tool cost: ~$5.4K

| Buyer Adoption | Per-Sale Lift | Additional Revenue/Year | Annual Tool Cost | **Net Gain** | **ROI** |
|---|---|---|---|---|---|
| 50% | $1,200 (typical) | $30K | $5.4K | **$24.6K** | 5.6x |
| 75% | $2,000 (conservative) | $75K | $5.4K | **$69.6K** | 13.9x |

Essentials's lower cost makes the ROI math easy — if the builder can provide decent photos and the output quality holds up.

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
- **"That's a lot upfront"** — Try Essentials at $149/floor plan/mo, no setup fee. Or start with one Concierge floor plan ($2,500 setup + $299/mo) and prove the ROI.
- **"Only some of my buyers would use this"** — ROI tables above account for 50% adoption and the math still works.
- **"Why does setup cost $2,500?"** — Professional photography, full option catalog transcription, AI prompt tuning, 3,000+ pre-generated room images, and QA. It's a 2-3 week build-out — real work, real deliverable. Comparable to what you'd pay for a Matterport tour.
- **"What am I paying $299/mo for?"** — 24/7 platform access, instant AI visualization for every buyer session, image cache maintenance, option/pricing updates, priority support, and an admin dashboard for your team.
- **"I just want to try it"** — Try the demo on our site — upload your own photo and see it work. When you're ready, Essentials is $149/mo for one floor plan.

### Cost Structure

**Pre-generation is non-negotiable.** Each image takes ~60 seconds to generate. Buyers won't wait — the tool must feel instant. That means ~3,000 pre-cached images per plan (covers 80%+ of common combos; long-tail generates on-demand).

**The pre-cache math:**
- 3,000 images x 60 sec = **50 hours of generation per plan**
- 8 plans (Craftway-sized builder) = **400 hours** (~17 days 24/7)
- At API pricing ($0.04-0.15/image): **$120-450 per plan, $960-3,600 for 8 plans**

**Hard costs per builder onboarding (Concierge, 8 plans):**

| Item | API Pricing | GPU Rental |
|------|------------|------------|
| Your time (20 hrs) | — | — |
| Photography (if needed) | ~$1,000 | ~$1,000 |
| Pre-generation (8 plans x 3K) | $960-3,600 | ~$200 |
| Hosting/infra | ~$45/mo | ~$45/mo |
| **Total hard costs** | **$1,000-4,600** | **$245-1,245** |

**OpenAI Tier 5 — Batch API pricing (what we have):**
We have Tier 5 OpenAI access, which unlocks the Batch API for image generation. Batch is async (not real-time) — ideal for pre-generation, not buyer sessions.

| Model | Input | Cached Input | Output |
|-------|-------|-------------|--------|
| gpt-image-1.5 | $4.00/1M tokens | $1.00/1M tokens | $16.00/1M tokens |

Batch API is significantly cheaper than standard API for bulk pre-generation. Use standard API for on-demand buyer sessions, batch API for pre-caching.

**Option A: API-based (standard)**
- Generation: ~$0.04-0.15/image (standard, real-time)
- Works for on-demand buyer sessions (Essentials tier)
- Rate limits and 60s generation time make batch pre-gen slow

**Option A.5: API-based (batch)**
- Pre-generation via Batch API at reduced token rates
- Async — results returned within 24 hours, not real-time
- Ideal for Concierge pre-caching of 3,000 images per plan
- No rate limit pressure — submit large batches overnight

**Option B: Cloud GPU rental (recommended)**
- RTX A6000 on-demand: ~$0.49/hr (RunPod, Hyperstack)
- RTX A6000 dedicated monthly: ~$350-365/mo
- Pre-gen one floor plan (50 hrs): ~$25 on-demand
- Pre-gen 8 plans (400 hrs): ~$200 on-demand
- No hardware risk, no maintenance, cancel anytime

**Why rent beats buy:**
- New RTX A6000: $6,850-9,000 purchase price
- 24/7 rental for 2 years: ~$8,400-8,760 — roughly the same cost
- But: no depreciation, no maintenance, no upfront capital, can scale up/down
- At low volume (< 5 builders): on-demand hourly is far cheaper than dedicated
- At high volume (5+ builders onboarding regularly): dedicated monthly makes sense

**Recommended path**: Use on-demand GPU rental from day one. Spin up for batch pre-generation, shut down when done. A full floor plan pre-gen costs ~$41. Only move to dedicated monthly when onboarding cadence justifies it (~2+ plans/month). Never buy hardware.

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
6. **Buyer accounts (future)**: logged-in buyer page showing sessions across multiple builders using Finch. Design buyer auth with multi-builder in mind from the start. Not needed until market density makes cross-builder overlap likely (~year 2+).

### Pre-Generation Strategy
For each builder's floor plan portfolio:
- Identify top 5 visual subcategories (countertop, cabinet color, backsplash, flooring, cabinet style)
- Pre-generate top 8-12 options per subcategory = **~3,000 images per plan**
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

### Phase 1.5: GPU Rental Setup (Before First Non-SM Builder)
- Set up on-demand GPU rental (RunPod or Hyperstack, RTX A6000 at ~$0.49/hr)
- Pre-generation on API is ~$200-750 per plan and takes weeks of continuous generation
- On-demand GPU drops that to ~$25/plan and enables overnight batch generation
- No upfront capital — spin up when needed, shut down when done
- **Must have before onboarding any builder** — API margins don't work at scale

### Phase 3: Launch Self-Serve + Local Concierge Sales (Q3-Q4 2026)
- **Online**: Landing page with interactive demo → Essentials signups
- **In Alabama**: Knock doors, HBA events, local networking → Concierge deals
- Use founding partner results as proof: "Here's what it did for [builder]"
- Demo the actual tool (not a pitch deck) — show their competitor using it
- **2026 exit target: 5-10 Essentials + 1-2 Concierge = $25-50K Year 1**

### Phase 4: Scale Self-Serve (2027)
- Invest in self-serve onboarding quality (guided wizard, photo gates, templates)
- Expand beyond AL/GA — self-serve is geography-independent
- Attend Southeast Building Conference (SEBC), International Builders' Show (IBS)
- Concierge stays local/regional — it requires hands-on work
- Essentials scales nationally through landing page, content marketing, HBA directories
- **Target: 50+ Essentials builders + 5 Concierge = $322K/yr**

## Sales Approach

### Two Channels

**Self-serve (Essentials)** — scales without you
- Landing page demo converts to Essentials signups
- In-app $1,500 setup upsell converts DIY builders who hit friction
- Content marketing, HBA directory listings, SEO
- Geography-independent — any production builder in the US

**Local sales (Concierge)** — high-touch, high-value
- Knock doors in Alabama when you're on the ground
- HBA events, design center visits, builder meetups
- Use SM demo + founding partner results as proof
- Concierge deals are local/regional — requires coordinating photography

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
