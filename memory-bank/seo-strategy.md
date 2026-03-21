# Finch SEO Strategy

**Last updated**: 2026-03-21
**Status**: Research complete, strategy draft

## The Honest Starting Point

withfin.ch has **zero organic visibility**. No keywords ranking, no domain authority. Brand new domain.

But that's fine — neither do the competitors:
- **Anewgo**: 254 keywords, ~$482/mo traffic value. Basically just branded searches ("anewgo" = 320/mo).
- **Roomored**: Literally zero organic rankings. Shea Homes (a partner) outranks them for their own brand name.
- **ECI Insearch, Hyphen HomeSight, Chameleon Power, Constellation**: Rank for "design center software" queries but don't create content. Pure product pages.

**Nobody is investing in SEO in this space.** The field is wide open.

## What We Already Have

### Pages indexed (in sitemap)
| URL | Target | Notes |
|-----|--------|-------|
| `/` | "upgrade visualization for home builders" | Good metadata, generic OG image |
| `/try` | "try finch demo" | Good metadata |
| `/vs/envision` | "finch vs zonda envision" / "envision alternative" | Solid comparison page |
| `/vs/pdf-option-sheets` | "replace PDF option sheets" | Solid comparison page |
| `/research/hidden-revenue-line` | "home builder upgrade revenue" | Original research, strong content |
| `/demo` | "finch demo" | Sandbox demo |

### Technical SEO in place
- Metadata (title, desc, OG, Twitter, canonical) on all marketing pages
- robots.txt blocks admin/API/tenant routes
- Sitemap with priorities
- `llms.txt` for AI discovery
- Dynamic OG images on /vs/ pages
- Proper H1 hierarchy

### Technical SEO missing
- No JSON-LD structured data (Organization, FAQPage, Article)
- No favicon/manifest
- Homepage, /try, /research use generic OG image

---

## Keyword Research (DataForSEO, March 2026)

### The category problem

"Upgrade visualization" isn't a search category yet. The keywords people actually search:

#### High-intent B2B (builder decision-makers searching)
| Keyword | Vol/mo | CPC | Competition | Notes |
|---------|--------|-----|-------------|-------|
| home builder software | 480 | $11.11 | HIGH | Too broad — CRM/ERP/construction mgmt |
| interactive home design | 90 | $2.08 | MEDIUM | Vague — could mean anything |
| builder design center | 70 | $5.22 | LOW | Closest category term. Worth owning. |
| builder CRM software | 40 | $36.77 | HIGH | Wrong category entirely |
| home builder design center software | 10 | — | LOW | Exact-match but tiny volume |
| virtual design center | 10 | — | LOW | — |
| home upgrade visualization | 0 | — | — | Nobody searches this yet |

**Takeaway**: B2B keywords are low-volume because the category doesn't exist. Builders aren't googling for this — they hear about it from sales reps, conferences, and peers. SEO won't drive builder acquisition directly. That's what outreach, demos, and referrals are for.

#### Competitor branded
| Keyword | Vol/mo | CPC | Notes |
|---------|--------|-----|-------|
| anewgo | 320 | $1.80 | People search by name. /vs/envision could capture some. |
| roomored | 20 | $1.97 | Tiny. Not worth targeting. |
| envision by anewgo | 0 | — | — |
| zonda envision | 0 | — | — |

#### Buyer-side informational (people buying new homes)
| Keyword | Vol/mo | CPC | Competition | Notes |
|---------|--------|-----|-------------|-------|
| new construction home upgrades | 170 | — | LOW | Big opportunity |
| upgrades on new home construction | 170 | — | LOW | Same intent |
| new home upgrade options | 10 | — | — | — |

#### The "[builder name] upgrade price list" cluster
| Keyword | Vol/mo |
|---------|--------|
| taylor morrison design center upgrades cost | 50 |
| pulte upgrades price list | 40 |
| pulte homes upgrade price list | 40 |
| kb home upgrade price list | 40 |
| toll brothers upgrade price list | 40 |
| builder upgrades price list | 30 |
| highland homes upgrade prices | 30 |
| arbor homes upgrade costs | 30 |
| dsld homes upgrade options | 30 |
| beazer homes upgrade price list | 20 |
| lennar home upgrades | 20 |
| mattamy homes upgrade price list | 20 |
| ryan homes options price list | 20 |
| stanley martin upgrade price list | 20 |
| toll brothers upgrade costs | 20 |
| bloomfield homes upgrade options | 20 |
| **Cluster total** | **~400-500** |

**This is the most interesting finding.** Hundreds of buyers every month searching for specific builders' upgrade pricing. Currently served by Reddit threads and random blog posts. Nobody owns this.

### SERP analysis: who ranks today

**"home builder design center software"** (our exact category):
1. ECI Solutions (Insearch)
2. Hyphen Solutions (HomeSight)
3. Constellation HomeBuilder (Design Studio Manager)
4. Studio Chateau
5. Zonda (Envision)
6-10. Chief Architect, BuildOn Technologies, Hyphen HomeSight, CPS

All product pages. No content marketing. No comparisons. No guides.

**"upgrades on new home construction"** (buyer informational):
1. Reddit
2. M/I Homes blog
3. williampitt.com (realtor)
4. warmup.com (heating company)
5-15. Random blogs, YouTube, Facebook

All listicle blogs with stock photos. Zero tools, zero interactive content, zero visualization.

---

## Strategic Questions

### Q1: Should we target builders (B2B) or buyers (B2C) with SEO?

**The tension**: Our customer is the builder. But builders don't search for our category. Buyers DO search for upgrade-related content.

**Arguments for buyer-side content**:
- Higher volume (170/mo vs 10/mo for B2B keywords)
- Lower competition (blogs, not software companies)
- Demonstrates product value to builders indirectly ("your buyers are already searching for this")
- Content can embed the interactive demo — nobody else can do this
- Buyer traffic is a selling point in builder sales conversations ("X buyers used Finch to explore upgrades last month")

**Arguments against buyer-side content**:
- Buyers aren't our customer. Traffic ≠ revenue.
- Builder decision-makers won't find us through buyer content
- Could dilute brand positioning (are we a consumer tool or a builder tool?)
- Content marketing is a long game — might not pay off for 6-12 months

**Arguments for B2B content**:
- Directly reaches decision-makers
- Comparison pages (/vs/envision) are high-intent even at low volume
- "Builder design center" (70/mo) is ownable and on-brand
- Builds authority for the category we're creating

**Working answer**: Both, but for different reasons. B2B content (comparison pages, design center category) for direct pipeline. Buyer-side content for SEO volume, product demonstration, and as a sales asset ("show this to your buyers").

### Q2: Is the "[builder] upgrade price list" cluster worth pursuing?

**The opportunity**: ~400-500 monthly searches from active home buyers. Low competition. We could create pages like "What to Expect at the Toll Brothers Design Center" that naturally lead to "see what your upgrades look like with Finch."

**The risk**:
- These are brand-name queries. Builders might not love us ranking for their competitors' names.
- Could look like we're a consumer comparison site, not a builder tool.
- Content would need to be genuinely useful, not just keyword stuffing.

**The play**: Frame it as "we studied the public builders' upgrade economics" (which we already did — the SEC research report). A guide series like "Understanding New Home Upgrades" that uses public builder data as examples. Not "Toll Brothers price list" (that's their IP) but "What upgrade categories to expect and how to think about them."

**Decision needed**: Is this worth the effort given our stage? Or should all content energy go into outreach?

### Q3: What about AI/LLM search (Perplexity, ChatGPT, Gemini)?

Traditional SEO may matter less as AI search grows. Our `llms.txt` is a start. But the real play for LLM discoverability:
- Original research (the SEC report) gets cited by AI models
- Comparison pages give AI models structured data to reference
- Being the only product in an emerging category means AI models will reference us by default once we have enough content

**TODO**: Test what Perplexity/ChatGPT/Gemini return for "home builder upgrade visualization tool" and "design center software for builders" to see current AI search landscape.

### Q4: Content vs. outreach — where does the hour go?

**Original thinking**: At pre-revenue, direct outreach is the priority. SEO is a background investment.

**Updated thinking**: The buyer-pull strategy changes this equation. Buyer-side content isn't just "SEO for brand awareness" — it's a **demand generation channel that creates inbound builder leads**. See "The Buyer-Pull Flywheel" below.

The priority hierarchy becomes:
1. **Direct outreach** (cold calls, LinkedIn, demos) — fastest path to first customer
2. **Buyer-side content** — creates inbound builder demand AND supports outreach ("47 of your buyers tried our demo last month")
3. **B2B comparison pages** — captures the few builders actively searching
4. **Technical SEO fixes** — one-time investment, do it and move on

---

## The Strategy

### The Buyer-Pull Flywheel (Core Insight)

Traditional B2B: Sell to the builder. Builder decides. Slow.

**Finch's play**: Sell to the buyer. Buyer asks their builder. Builder calls us.

**Why this works for Finch:**
- Builders don't search for upgrade visualization (the category doesn't exist in search yet)
- But **400-500 buyers/month** search for "[builder name] upgrade price list"
- And **170/mo** search for "new construction upgrades"
- Nobody serves them — it's Reddit threads and generic blog posts
- We have something nobody else can offer: an interactive demo that actually shows what upgrades look like
- **$500/mo pays for itself with one buyer's upgrade increase.** That's the line that makes the math trivial for the builder.

**The funnel:**
1. Buyer searches "Pulte upgrades" or "new construction upgrades worth it"
2. Lands on Finch content — genuinely useful guide with embedded interactive demo
3. Tries the demo, gets excited about seeing their selections visualized
4. CTA: **"Your builder could have this ready for your floorplan in days. Ask them about Finch."**
5. Optional form: "Which builder are you working with?" → captures buyer lead + builder name
6. Builder gets buyer requests → googles Finch → sees the product
7. We also track which builders generate the most buyer interest
8. Cold outreach to those builders: **"47 of your buyers tried our upgrade visualizer last month. Want us to set it up with your actual floorplans? $500/mo. Pays for itself with one sale."**

**What makes this defensible:**
- Competitors (Anewgo, Roomored, ECI) don't create buyer content — they sell B2B only
- We already have the interactive demo, the SEC research, and the content infrastructure
- Every buyer who tries the demo becomes a data point for builder outreach
- The content compounds — once it ranks, it generates leads on autopilot

**The killer cold email:**
> "Last month, 47 people searched for [Builder Name] upgrade options and ended up on our site. They tried our upgrade visualizer and spent an average of 4 minutes picking finishes for kitchens and bathrooms.
>
> They're your buyers, actively trying to see what their upgrades look like.
>
> Finch could have your actual floorplans live in days. $500/month per plan — pays for itself if one buyer upgrades $1,000 more than they would have.
>
> Want to see what it looks like with your floorplans?"

That email has data, specificity, and a trivial ROI case. Way stronger than "hi, we make upgrade visualization software."

### Phase 1: Technical Fixes (1 afternoon)

Quick wins that improve existing pages:

- [ ] JSON-LD Organization schema on root layout
- [ ] JSON-LD FAQPage schema on homepage (already has FAQ content)
- [ ] JSON-LD Article schema on research page
- [ ] Favicon + apple-touch-icon + manifest.json
- [ ] Page-specific OG images for homepage and research page
- [ ] Verify withfin.ch in Google Search Console (if not already)

### Phase 2: Buyer-Side Content (the demand engine)

**This is the primary SEO investment.** Not a "nice to have later" — this is the content that feeds the buyer-pull flywheel.

#### 2a: The Anchor Page

`/learn/new-construction-upgrades` — **"The Complete Guide to New Home Upgrades"**

Target keywords: "new construction home upgrades" (170/mo), "new home upgrade options" (10/mo), "new construction upgrades worth it", "what upgrades to get in new construction home"

Content structure:
- What upgrade categories exist (cabinets, counters, flooring, paint, fixtures, appliances, etc.)
- What to expect at the design center appointment
- Which upgrades have the best ROI (use SEC data from our research)
- How to think about structural vs. cosmetic upgrades
- **Embedded interactive demo**: "See what granite vs quartz looks like in a real kitchen"
- **CTA**: "Your builder could have this for your floorplan. Ask them about Finch — or tell us which builder you're working with."
- Link to the SEC research report for credibility

This one page could rank for dozens of long-tail queries. It's genuinely useful content that happens to demonstrate the product.

#### 2b: Builder-Specific Upgrade Guides

`/learn/upgrades/[builder-slug]` — "What to Expect at the [Builder] Design Center"

Target: The "[builder name] upgrade price list" cluster (~400-500/mo total)

| Page | Target keyword | Vol |
|------|---------------|-----|
| `/learn/upgrades/toll-brothers` | toll brothers upgrade price list | 40 |
| `/learn/upgrades/pulte` | pulte upgrades price list | 40 |
| `/learn/upgrades/kb-home` | kb home upgrade price list | 40 |
| `/learn/upgrades/taylor-morrison` | taylor morrison design center upgrades cost | 50 |
| `/learn/upgrades/lennar` | lennar home upgrades | 20 |
| `/learn/upgrades/ryan-homes` | ryan homes options price list | 20 |
| `/learn/upgrades/beazer` | beazer homes upgrade price list | 20 |
| `/learn/upgrades/highland-homes` | highland homes upgrade prices | 30 |

Content per page:
- General info about that builder's design center process (publicly available)
- Typical upgrade categories they offer
- What SEC filings reveal about their upgrade revenue (for public builders)
- "See what these upgrades actually look like" → embedded Finch demo
- **CTA**: "Ask [Builder] about Finch" + "Which community are you building in?" form
- **NOT**: actual pricing (that's their IP and changes constantly)

**Critical framing**: These pages are helpful to buyers, not hostile to builders. We're not undercutting or criticizing. We're saying "here's what to expect, and here's a tool that helps you visualize your choices." If the builder calls us, great. If they don't, the buyer still got useful content.

**Bonus data**: The form captures which builders and communities have active buyers. That's a prospecting goldmine. "We know buyers in [Community X] are actively looking for upgrade visualization" is a surgical cold email.

**Start with**: Toll Brothers, Pulte, KB Home (highest volume + public SEC data). Add more based on traction.

#### 2c: "Ask Your Builder" Form

Simple component embedded in all buyer content pages:
- "Which builder are you working with?" (text input or dropdown of known builders)
- "Which community/floorplan?" (optional text)
- Email (optional, for "we'll let you know when it's available")
- Fires PostHog event: `buyer_builder_request` with builder name, community, source page

This form is the bridge between content traffic and builder outreach. Every submission is a warm lead — not for the buyer, but for the builder.

### Phase 3: B2B Comparison Pages (ongoing, low effort)

Target: "builder design center" / "design center software" / "upgrade visualization"

**Goal**: When a builder actively searches for design center software, Finch shows up.

- [ ] `/vs/chameleon-power` — Chameleon Power/BuilderVision is the closest visual competitor (swatch-based point-and-click vs. our AI photo generation). They rank in SERPs.
- [ ] `/vs/design-center-software` — Category overview comparing ECI Insearch, Hyphen HomeSight, Constellation, and Finch's approach. Target "home builder design center software" (10/mo) and "builder design center" (70/mo).
- [ ] Optimize existing `/vs/envision` for "anewgo alternative" / "envision alternative" queries

**Why Phase 3 not Phase 2**: These are low-volume, high-intent pages. Worth having, but they won't drive the flywheel. Build them as outreach collateral — link to them in cold emails when a builder mentions they're evaluating Envision or Chameleon.

### Phase 4: LLM Search Optimization (background)

- [ ] Test AI search results for key queries (Perplexity, ChatGPT, Gemini)
- [ ] Ensure `llms.txt` is comprehensive and up-to-date
- [ ] Structure content for AI citation (clear definitions, structured comparisons, original data)
- [ ] Monitor whether the SEC research report gets cited by AI models
- [ ] Buyer content pages should be structured for AI extraction (clear headings, factual claims, embedded tool references)

---

## Competitive Content Gaps (Tavily Research)

### What competitors are NOT doing
- **No one publishes "upgrade visualization" content** — the phrase returns zero dedicated results
- **No competitor creates buyer-facing educational content** about upgrades
- **No competitor has original research** (our SEC report is unique)
- **No competitor has interactive demos** embedded in content
- **Industry publications** (HousingWire, Builder Innovator, Zonda/BLDR) cover builder tech but have zero coverage of AI upgrade visualization as a category

### Adjacent players worth watching
| Player | What they do | Threat level |
|--------|-------------|-------------|
| ECI Insearch | Online design center, option management, pricing | Medium — workflow overlap, no visualization |
| Hyphen HomeSight + Chameleon Power | Builder platform + swatch-based visualizer | Medium — closest visual competitor |
| Chameleon Power (standalone) | Point-and-click interior/exterior visualizer | Medium — different approach (3D vs AI photos) |
| Anewgo | Marketing platform (renderings, site plans, sales app) | Low — different product entirely |
| Renoworks | AI-enhanced exterior viz for contractors | Low — renovation market, not new construction |
| HomeGPT | Consumer AI photo redesign | Low — B2C, no builder workflow |

---

## Metrics to Track

### Flywheel metrics (the ones that matter)
- **"Ask your builder" form submissions** — builder names + communities captured
- **Demo starts from content pages** (PostHog funnel: `/learn/*` → `/try` → session created)
- **Unique builders mentioned** in form submissions (prospecting pipeline)
- **Cold emails sent with buyer data** → response rate vs. generic cold emails

### SEO health (check monthly)
- **Organic impressions** (Google Search Console)
- **Ranking positions** for target keywords (DataForSEO rank tracker)
- **Organic traffic to content pages** (PostHog)
- **Pilot form submissions from organic** (PostHog attribution)

---

## Open Questions

1. **Google Search Console**: Is withfin.ch verified in GSC? Step 0 for everything.
2. **Builder name sensitivity**: Will builders get annoyed seeing their name on Finch content? The framing matters — "What to Expect at the Toll Brothers Design Center" is helpful, not adversarial. But worth thinking about before publishing. Could soft-launch with public builders (SEC data gives us cover) and skip private builders initially.
3. **Form design**: Should "Ask your builder" be a simple inline form or a modal? Inline is lower friction. Modal can capture more data. Test both.
4. **Content velocity**: How many builder pages before the flywheel has enough data to power outreach? Probably 5-8 (the top-volume builders) is enough to start seeing form submissions.
5. **Backlink strategy**: The SEC research report is linkable content. Pitch to HousingWire, Builder Innovator, NAHB publications?
6. **DataForSEO rank tracking**: Set up automated monitoring for target keywords? Cheap, useful for measuring progress after content goes live.
7. **Conference timing**: IBS (International Builders' Show) and PCBC — could we time content drops to coincide with these events?
