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

### Pricing — No Setup Fee, Flat Per-Plan Monthly

#### Model: Done-For-You, Per Floor Plan, No Tiers, No Setup Fee

One model: we handle all setup, they pay per floor plan per month. No setup fee — our onboarding is largely automated (LLM-driven catalog transcription, automated swatch scraping, prompt playbook handles 90% of tuning). Setup costs are low enough to absorb as customer acquisition cost. Removing the fee collapses the sales cycle and makes us harder for competitors to undercut.

**What we deliver per floor plan (10 room photos included):**

*Builder self-serve (admin dashboard):*
- Option/pricing updates, swatch uploads, step names/order, section assignments
- Floorplan metadata, branding — all the catalog stuff

*Finch-managed:*
- Option/pricing transcription from builder's sheets (LLM converts messy PDFs → structured data)
- Swatch image sourcing (automated scraping + manual sourcing where needed)
- Room photo pipeline (10 photos/floorplan): photo evaluation, spatial hints, baselines, prompt tuning, test generation, QA
- AI pre-generation for instant buyer experience
- Configuration, branding, testing
- Unlimited buyer sessions, no per-session fees

**Speed advantage:** First floor plan live in 48 hours. Additional plans same day after initial setup. Competitors (Zonda, Hyphen, Aareas) take 2-3 months.

**Photography:** Evaluate during sales conversation. Clean, well-lit model home photos = use them. Otherwise bake photography cost into an ad-hoc quote. Some photos will be rejected — "this bathroom has bad lighting, we need a reshoot" is part of the process.

#### Pricing Structure

Pricing is NOT on the landing page. Drive to conversations first, learn from early pilots.

**$500/mo per floor plan. Minimum 3 floor plans ($1,500/mo).**
- Each floor plan includes 10 room photos through the full pipeline.
- Monthly includes: software access, unlimited buyer visualizations, ongoing support (option/price updates, occasional photo swaps), admin dashboard for their team.
- No setup fees, no credit caps, no metering, no usage conversations. Flat rate, full experience.
- Generation costs are our problem to manage internally (pre-cache strategy, batch API).
- 12-month commitment after pilot conversion. Can add plans anytime, can't drop below 3.

**Why no setup fee:** Our setup is largely automated — LLM catalog transcription, automated scraping, prompt playbook. Hard costs per floorplan setup are ~$50-100 in generation + 2-4 hours of time. Charging $1,500-2,500 upfront slows the sales cycle and gives competitors a price surface to undercut. Speed to 20 builders matters more than $50K in setup fees (1% of a $5M exit).

**Why minimum 3 plans:** Filters out tire-kickers. Also, builders with 1 plan won't see enough impact to retain — they need coverage across their best-selling floorplans.

**Stone Martin deal:** 5 floor plans free for 1 year. They're the proof-of-concept, not a paying customer (yet). The demo sells Finch to other builders — SM's value is as a case study and reference.

**Annual costs for the builder:**

| Plans | Monthly | Annual |
|---|---|---|
| 3 (minimum) | $1,500/mo | $18,000 |
| 5 | $2,500/mo | $30,000 |
| 8 | $4,000/mo | $48,000 |
| 15 | $7,500/mo | $90,000 |

**ROI at 10% upgrade lift on $10K avg upgrades ($1,000 extra/home):**

| Builder size | Plans | Annual cost | Revenue lift | ROI |
|---|---|---|---|---|
| 50 homes/yr | 3 | $18,000 | $50,000 | **2.8x** |
| 60 homes/yr | 3 | $18,000 | $60,000 | **3.3x** |
| 100 homes/yr | 5 | $30,000 | $100,000 | **3.3x** |
| 150 homes/yr | 5 | $30,000 | $150,000 | **5.0x** |
| 200 homes/yr | 8 | $48,000 | $200,000 | **4.2x** |
| 500 homes/yr | 15 | $90,000 | $500,000 | **5.6x** |

**3x ROI breakpoint: ~55 homes/year on 3 plans at 10% lift.** At 15% lift (reasonable for visual selling vs PDFs), 40 homes/year hits 3x+. The $500/mo price point targets builders doing 50+ homes/year.

**Our margins (3 plans):**

| Item | Cost |
|---|---|
| Monthly generation COGS | ~$25-50/mo |
| Hosting/infra | ~$45/mo |
| Revenue (3 × $500/mo) | $1,500/mo |
| **Monthly margin after COGS** | **~$1,400-1,430/mo (~95%)** |

#### Pilot Program

- We set up one floor plan at no cost
- Builder uses it with real buyers for 60 days
- We measure upgrade revenue together
- If the numbers work, convert to 3+ plans at $500/mo each (12-month commitment)
- If they don't, walk away — no obligation

**The pitch:** "One floorplan free for 60 days. After that, $500 per floorplan per month, minimum three. No setup fees, no usage caps, unlimited buyer visualizations. I handle everything."

**Why:** Pilot removes all price objections and shifts the conversation to results. Hard costs per pilot are ~$100-200 (our customer acquisition cost — absurdly cheap for B2B SaaS). After 60 days of proven lift, $500/plan is a rounding error to them.

**Conversion psychology:** Don't negotiate price before the pilot. Don't negotiate price during the pilot. After the pilot, the builder has data — the conversation is "here are your results, here's the price," not "what price would make you comfortable."

#### Interactive Demo (Replaces Trial)
No free trial. Public demo on the landing page:
- Upload their own room photo
- Test visualization against a curated set of upgrades
- See the quality with zero commitment

**Why this beats a trial:** No signup friction, no expiration anxiety, no bad self-serve output. They see done-for-you quality on *their* photo immediately. The CTA after the demo is "Ready to set this up for your floor plans?"

#### Pricing Defense — How to Hold $500/plan

Builders negotiate everything. Every builder will push on price. Tactics:

- **Never quote per-plan pricing first.** Quote the package: "$1,500/month for your catalog." Sounds different than "$500 × 3."
- **Anchor on ROI, not cost.** "At 60 homes a year, even a 10% lift means $60K in extra revenue. The tool costs $18K. Where do you cut?" You're selling $60K for $18K.
- **The pilot solves price objections.** Don't argue about price before they've seen results. After a successful pilot, $500/plan is obvious.
- **Never give volume discounts unprompted.** If they ask for 5+ plans, maybe $450 — but only with all 5 upfront and annual terms. They give something to get something.
- **"Case study" is not currency.** Every early builder will offer their name for a discount. The pilot is already free — that's the investment. Case study discussion comes after results, not before.
- **Walk away power.** A builder who sees proven lift and won't pay $6K/year was never your customer. You only need 20.
- **Don't set a floor.** If builder 1 pays $300, builder 2 hears about it at HBA events. $300 becomes your price. The pilot is the pressure release valve — free trial without cutting actual pricing.

#### Pricing Principles
- **No price on the landing page.** Drive to conversations. Learn from early pilots before publishing.
- **No volume discounts published.** Handle ad hoc — and only in exchange for commitment (more plans, annual terms).
- **No annual pricing yet.** Need flexibility to raise prices. Revisit at 5+ builders.
- **"Floor plan" not "plan"** everywhere — avoids confusion with pricing tiers.
- **Position as ROI, not cost.** Revenue framing, not feature lists.
- **vs Zonda:** "Zonda Envision is built for the top 50 builders in America. Finch is built for everyone else." Don't be "cheap Zonda" — be "Zonda results for builders Zonda ignores."
- **Competitive moat is density, not price.** Every builder you sign is one a competitor can't. Speed to 20 builders matters more than maximizing per-builder revenue.

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

### Revenue Projections

All builders are done-for-you at $500/plan/mo. Setup is largely automated — no setup fee.

| Builders | Avg Plans | MRR | ARR |
|----------|-----------|-----|-----|
| 5 | 3 | $7,500 | $90K |
| 10 | 4 | $20,000 | $240K |
| 15 | 5 | $37,500 | $450K |
| **20** | **5** | **$50,000** | **$600K** |
| 30 | 5 | $75,000 | $900K |

**Exit target: 20 builders × ~5 plans avg = $600K ARR.** At 8-10x revenue multiple = **$5M exit.** Achievable in 2-3 years at ~1-2 new builders/month.

### Capacity & Scaling

Setup is largely automated. The bottleneck is no longer labor — it's sales velocity.

**Setup time per plan (actual, improving):**
- SM Kinkade (first ever): ~20 hrs/plan (380 elements, building all tooling from scratch)
- Lenox (second plan, on a plane): ~2 hrs (LLM did 90%, prompt playbook handled tuning)
- Target for new builders: ~2-4 hrs/plan (depends on how messy source materials are)

**The hard part is swatch sourcing.** If the builder has a website with all their options and swatch images, scraping is automated. If swatches are scattered across manufacturer sites, that's manual hunting. Everything else — catalog transcription, prompt tuning, photo pipeline — is playbook-driven.

| Builders/month onboarding | Plans | Setup hrs/month | Maintenance hrs/month | Total hrs | Feasible solo? |
|---|---|---|---|---|---|
| 1 (3 plans) | 3 | 6-12 | 2-4 | 8-16 | Easily |
| 2 (6 plans) | 6 | 12-24 | 4-8 | 16-32 | Yes |
| 4 (12 plans) | 12 | 24-48 | 8-12 | 32-60 | Tight — need to prioritize |
| 6+ (18+ plans) | 18+ | 36-72 | 12-18 | 48-90 | Need help |

**Hire when:** consistently onboarding 3+ builders/month AND maintaining 12+ active builders. One general customer success/onboarding person. At that point MRR is ~$30-40K — easily covers a $50-60K salary. This person handles onboarding setup, option/price updates, photo pipeline QA, and builder support while you focus on selling.

### Builder ROI — Why the Tool Pays for Itself

**Key stat**: Zonda Envision reports buyers spend **35% more on upgrades** when they can visualize their choices. Even at conservative estimates, the math is overwhelming.

**Stone Martin-sized (~500 homes/year, ~$10K avg upgrades, 15 plans)**
Current upgrade revenue: ~$5M/year | Annual tool cost: $90K

*Regional context: In the AL/GA market, $42K in upgrades is considered extremely high. Most Stone Martin buyers spend $8-12K in upgrades. One frugal buyer (investment property, intentionally minimizing) went from $5,200 → $7,290 after using the tool — a $2,090 lift (40%) from someone actively trying NOT to spend more. Typical buyers spending $10K would likely see even larger lifts since they're already willing to spend on their home.*

| Buyer Adoption | Per-Sale Lift | Additional Revenue/Year | Annual Tool Cost | **Net Gain** | **ROI** |
|---|---|---|---|---|---|
| 50% | $2,000 (conservative) | $500K | $90K | **$410K** | 5.6x |
| 75% | $2,000 (conservative) | $750K | $90K | **$660K** | 8.3x |

**Small AL/GA builder (~50 homes/year, ~$8K avg upgrades, 3 plans)**
Current upgrade revenue: ~$400K/year | Annual tool cost: $18K

| Buyer Adoption | Per-Sale Lift | Additional Revenue/Year | Annual Tool Cost | **Net Gain** | **ROI** |
|---|---|---|---|---|---|
| 50% | $1,200 (typical) | $30K | $18K | **$12K** | 1.7x |
| 75% | $2,000 (conservative) | $75K | $18K | **$57K** | 4.2x |

**Mid-size builder (~100 homes/year, ~$10K avg upgrades, 5 plans)**
Current upgrade revenue: ~$1M/year | Annual tool cost: $30K

| Buyer Adoption | Per-Sale Lift | Additional Revenue/Year | Annual Tool Cost | **Net Gain** | **ROI** |
|---|---|---|---|---|---|
| 50% | $1,500 | $75K | $30K | **$45K** | 2.5x |
| 75% | $2,000 (conservative) | $150K | $30K | **$120K** | 5.0x |

**3x ROI breakpoint: ~55 homes/year on 3 plans at 10% lift.** The pilot removes the risk — builders see real results before committing. After a successful pilot, the ROI conversation closes itself.

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
- **"Only some of my buyers would use this"** — ROI tables above assume 50% adoption. At 60+ homes/year you're at 3x+ return even at that conservative number.
- **"$500/mo per plan?"** — No setup fees. Unlimited buyer visualizations, 24/7 platform access, option/pricing updates, ongoing photo support, admin dashboard. No usage caps, no per-session fees. At 60 homes/year across 3 plans, even a 10% lift = $60K extra revenue. The tool costs $18K.
- **"I just want to try it"** — Try the demo on our site — upload your own photo and see it work. When you're ready, we'll set up your best-selling floorplan free for 60 days.
- **"Can we start with just 1 plan?"** — The pilot is 1 plan, free. When you convert, minimum is 3 — builders with 1 plan don't see enough coverage to get real results. 3 plans means your buyers see it regardless of which floorplan they're buying.
- **"What about a discount for more plans?"** — Let's start with 3, see the results, and have that conversation once you're expanding. (Only offer 10%+ discounts in exchange for annual commitment + 5+ plans upfront.)

### Cost Structure

**Self-hosted generation is not viable** (see D64). No open-source model can handle our pipeline (10-15 simultaneous swatch references, precise multi-surface editing, layout preservation). Gemini was tested and reverted (D77) — faster/cheaper but hallucinated unpredictably. gpt-image-1.5 is the only model that works reliably. All cost math is API-based.

**Pre-generation is non-negotiable.** Each image takes ~60 seconds to generate. Buyers won't wait — the tool must feel instant. Pre-cache common combos; long-tail generates on-demand.

**Generation costs (gpt-image-1.5, medium quality — D80):**
- ~$0.05/image (standard API, medium quality, real-time) — used for on-demand buyer sessions
- Batch API available (Tier 5) at ~50% discount, async (24hr turnaround) — use for all pre-generation

**Pre-cache math (per floorplan, 10 photos):**

Not every combo needs pre-caching. Full combinatorial is absurd (e.g. 12 cabinets × 13 island × 17 counter × 16 floor × 13 paint = 548K for one kitchen photo). Smart strategy: single-category sweeps (hold others at default) + popular multi-combos.

- Kitchen photo (5 visual categories): ~150-200 images (71 sweeps + ~80-130 popular combos)
- Bedroom photo (paint + flooring): ~30 images
- Bathroom photo (cabinets + counter + flooring): ~45 images
- Average across 10 photos: **~500-1,000 images per floorplan**

Typical builders have fewer options than SM (6-8 per category vs 12-17), so numbers skew toward the low end.

| Pre-cache depth | Images/plan | Standard ($0.05) | Batch (~$0.025) |
|---|---|---|---|
| Conservative (sweeps only) | ~500 | $25 | ~$13 |
| Moderate (sweeps + top combos) | ~1,000 | $50 | ~$25 |
| Aggressive (deep combo coverage) | ~2,000 | $100 | ~$50 |

**Hard costs per builder onboarding (3 plans, moderate pre-cache):**

| Item | Cost |
|------|------|
| Your time (catalog + photo pipeline) | ~2-4 hrs/plan |
| Pre-generation (3 plans × ~1K images, batch at ~$0.025) | ~$75 |
| Photography (if needed — ad hoc) | ~$500-1,000 |
| **Total hard costs (excl. time)** | **~$75-1,075** |

No setup fee means these are absorbed as customer acquisition cost. At $1,500/mo revenue, payback is month 1.

**Ongoing generation costs (our problem, not the builder's):**
- Pre-cached images are free to serve (Supabase CDN). On-demand buyer generations (long-tail combos) cost ~$0.05 each at medium quality (D80).
- No credit cap exposed to builders. Unlimited visualizations is the pitch. We manage costs internally through aggressive pre-caching (batch API) and the permanent cache — every on-demand generation becomes a cached image for future sessions.
- Typical: 3 plans × ~50 sessions/mo × ~5 on-demand gens = ~750/mo = ~$37/mo COGS. Well within $1,500/mo revenue (3 × $500).
- Early months cost more (building the long-tail cache), costs decline over time as cache fills.

## Technical Architecture

### Already Built (Stone Martin Demo)
- Next.js 16 web app with step-based wizard UI
- 5-step upgrade flow covering all categories from real pricing PDF
- AI image generation pipeline (OpenAI gpt-image-1.5 via images.edit endpoint)
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
- Single-category sweeps (hold others at default) + popular multi-combos = **~500-1,000 images per plan**
- Cost: ~$50-100/plan at batch API pricing (~$0.10/image)
- Result: **instant visualization for 80-90% of buyer selections**
- Long-tail combos generate on-demand and permanently cache — costs decline over time

Full research with 30+ builders across AL/GA, tiered by priority and organized by geography:

**[AL/GA Builder Prospect List](research/al-ga-builders.md)**

Highlights:
- **7 builders within driving distance of Montgomery** (Lowder, Goodwyn, Hughston, Holland, Alexander Scott, Trademark, Dilworth)
- **Best first target**: Lowder New Homes — Stone Martin's direct competitor, same city
- **Best timing play**: Alexander Scott Homes — brand new company, building processes now
- **Best intro play**: Centennial Homes (Birmingham) — co-founder is 2025 GBAHB president
- **30+ total prospects** across Montgomery, Birmingham, Atlanta, Huntsville, Gulf Coast
- HBA directory links for ongoing prospecting

## Exit Strategy — $5M in 2-3 Years

**Target: $5M acquisition at 8-10x ARR.** No intention of selling parts. Build to a clean exit.

**What "ready" looks like:**
- ~20 builders, ~100 floorplans, ~$50K MRR, ~$600K ARR
- Net revenue retention >100% (builders expanding plans)
- Monthly churn <5%
- 2-3 case studies with proven upgrade revenue lift
- 1 hire (customer success/onboarding)

**Who buys Finch:**
- **Strategic acquirer (best outcome):** Zonda (fills AI gap), Constellation/Hyphen (adds visualization to ERP), proptech rollup fund. They pay premium because you fill a hole in their product.
- **Financial buyer:** SaaS-focused PE fund rolling up vertical SaaS. Lower multiple but still viable at $600K+ ARR with strong margins.

**Why it's achievable solo + 1 hire:**
- ~1-2 new builders/month sustained over 2 years
- Setup is largely automated (LLM transcription, scraping, prompt playbook)
- Expansion revenue (3 → 5 → 8 plans) compounds without new sales
- If ROI holds, churn is near zero — builders don't cancel tools that make them money
- Regional density in AL/GA creates referral flywheel

**Key risks to the timeline:**
- Closing builders 1-3 takes longer than expected (sales cycle risk)
- OpenAI dependency — price increase, deprecation, or quality degradation
- Competitor with funding enters the space before you hit density
- Photo pipeline doesn't scale as smoothly for builders with messier source materials

**Mitigation:** Get to 5 paying builders as fast as possible. That gives you revenue, proof, and enough volume to invest in automation. It also makes you attractive enough to sell early at a lower number if the competitive landscape shifts.

## Go-to-Market

### Phase 1: Prove It (Now)
- Stone Martin demo as proof-of-concept (SM is NOT a target customer — they use BuilderLinq for selections already)
- Generate compelling before/after: PDF sheet vs. interactive tool with AI visualization
- Real data point: frugal buyer $5,200 → $7,290 (+$2,090, 40% lift) after using the tool — and they were trying to minimize spend

### Phase 2: First Paying Builder — Pilot → Convert (Q2 2026)
- Target builders still on PDFs/sample boards — Craftway, Lowder, Conner Brothers, etc.
- Use SM demo to show what their tool would look like, then build theirs
- Pilot: 1 floorplan free, 60 days. Convert to 3+ plans at $500/mo.
- Measure upgrade revenue impact, get testimonial / case study

### Phase 3: Regional Density Play (Q3-Q4 2026)
- **In Alabama**: Knock doors, HBA events, local networking
- **Online**: Landing page with interactive demo → inbound leads
- Use pilot results as proof: "Here's what it did for [builder]"
- Demo the actual tool (not a pitch deck) — show their competitor using it
- **2026 target: 5-8 builders = $7.5-20K MRR**

### Phase 4: Scale to Exit (2027-2028)
- Expand beyond AL/GA — HBA events, SEBC, IBS
- Hire customer success/onboarding person (~builder 10-12)
- Referrals and case studies compound — each builder makes the next easier to close
- Invest in onboarding tooling (guided setup wizard, photo quality gates, templates)
- **Target: 20 builders × 5 plans avg = $50K MRR = $600K ARR → $5M exit at 8-10x**

## Sales Approach

### Cold Email Infrastructure
- **Domain**: `heyfin.ch` — dedicated cold outreach domain, separate from `withfin.ch` to protect primary domain reputation
- **DNS**: Vercel DNS (same provider, no wildcard needed)
- **Email warming**: Mailreach.co — 2-3 weeks warming before first send, keep running during outreach
- **Cadence**: Start 5-10/day, ramp to 30-50/day max per mailbox
- **Setup**: Email hosting → SPF/DKIM/DMARC → Mailreach connection

### One Channel — Done-For-You, Relationship Sales

Every builder is done-for-you. No self-serve tier. Every deal starts with a conversation.

- **Inbound**: Landing page demo → builder reaches out → pilot → convert
- **Outbound**: HBA events, door knocking, design center visits → demo on phone → pilot → convert
- **Referral**: Existing builder tells another builder → pilot → convert

All roads lead to the pilot. The pilot leads to $500/plan/mo. Simple.

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
