# Finch SEO Strategy

**Last updated**: 2026-03-22
**Status**: Baseline fixes shipped (d855860). Strategy defined. Buyer-pull flywheel is the core play.

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

### Phase 1: Technical Fixes ✅ (shipped d855860, 2026-03-21)

- [x] JSON-LD Organization schema on root layout (moved from landing page, all pages inherit)
- [x] JSON-LD FAQPage schema on homepage (already existed)
- [x] JSON-LD Article schema on research page (already existed)
- [x] JSON-LD SoftwareApplication on homepage (already existed)
- [x] JSON-LD FAQPage on /vs/envision (already existed)
- [x] Favicon (`icon.png`) + apple-touch-icon (`apple-icon.png`) (already existed)
- [x] Web manifest (`manifest.ts`)
- [x] Page-specific OG image for homepage (updated with headline copy)
- [x] Page-specific OG image for research page (new, was using generic fallback)
- [x] Verify withfin.ch in Google Search Console

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


### Phase 3: B2B Comparison Pages (ongoing, low effort)

Target: "builder design center" / "design center software" / "upgrade visualization"

**Goal**: When a builder actively searches for design center software, Finch shows up.

- [ ] `/vs/chameleon-power` — Chameleon Power/BuilderVision is the closest visual competitor (swatch-based point-and-click vs. our AI photo generation). They rank in SERPs.
- [ ] `/vs/design-center-software` — Category overview comparing ECI Insearch, Hyphen HomeSight, Constellation, and Finch's approach. Target "home builder design center software" (10/mo) and "builder design center" (70/mo).
- [ ] Optimize existing `/vs/envision` for "anewgo alternative" / "envision alternative" queries

**Why Phase 3 not Phase 2**: These are low-volume, high-intent pages. Worth having, but they won't drive the flywheel. Build them as outreach collateral — link to them in cold emails when a builder mentions they're evaluating Envision or Chameleon.

### Phase 4: LLM Search Optimization ✅ (2026-03-22)

- [x] Test AI search results for key queries — **zero visibility** across all queries. Finch3D dominates "Finch" + architecture. No competitors investing in content either.
- [x] `llms.txt` rewritten: disambiguates from Finch3D, adds product category/competitive landscape, comparison tables, research findings, link to llms-full.txt
- [x] `llms-full.txt` created: extended version with full comparison tables (vs Envision, vs PDF sheets), SEC research data, all FAQs, detailed competitive landscape
- [x] Structure content for AI citation: enhanced Organization JSON-LD (`alternateName`, `knowsAbout`), added WebPage JSON-LD to /vs/pdf-option-sheets, verified existing Article/FAQPage/SoftwareApplication schemas
- [x] SEC research report NOT cited by AI models yet — domain is too new, no backlinks. Will improve as domain ages and content compounds.
- [x] `/for/` prospect pages kept OUT of robots.txt — personalized sales collateral, not public marketing content
- [x] Explicit AI bot rules in robots.txt: GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended all explicitly allowed on marketing pages
- [x] Visible "Updated March 2026" timestamps on /vs/envision and /vs/pdf-option-sheets (AI models show recency bias, content >3 months old drops citations)
- [x] `dateModified` added to JSON-LD on homepage (SoftwareApplication), /vs/envision (FAQPage), /vs/pdf-option-sheets (WebPage)
- [x] Homepage SoftwareApplication JSON-LD enhanced: `alternateName`, `applicationSubCategory: "Design Center Software"`, more specific description
- [x] **Not yet addressed** (offsite work): YouTube presence (16% of AI citations), third-party mentions/reviews for multi-source consensus, Reddit/forum participation. These are outreach tasks, not technical fixes.

---

## Competitive Content Gaps (Tavily Research)

### What competitors are NOT doing
- **No one publishes "upgrade visualization" content** — the phrase returns zero dedicated results
- **No competitor creates buyer-facing educational content** about upgrades
- **No competitor has original research** (our SEC report is unique)
- **No competitor has interactive demos** embedded in content
- **Industry publications** (HousingWire, Builder Innovator, Zonda/BLDR) cover builder tech but have zero coverage of AI upgrade visualization as a category

### Corrected competitive landscape (2026-03-22)
Previous version significantly underestimated competitors. See `VISION.md` for full updated table. Key corrections:
- **ECI Insearch**: Has 3D visualization (not just workflow). Case study: +20% sales, -75% change orders.
- **Roomored/ILG**: Has photoreal 3D walkthroughs. Shea Homes flagship. Blackstone-backed ($1.79B rev parent).
- **Aareas Interactive**: Full 3D configurator, 35 years in business. Claims 70% upgrade sales increase. Actively positioning against AI.
- **Constellation/NEEZO**: Has 3D visualization via NEEZO partnership (since 2019). Not "no visualization."
- **Chameleon Power/Hyphen**: Bigger than thought. Hyphen serves 21 of top 26 builders.
- **Higharc**: Well-funded new entrant. Real-time 3D configurator. Partnered with ECI.

**Content gap still holds**: None of these competitors create buyer-facing content. None publish original research. None have interactive demos embedded in SEO content. The content strategy is unaffected by the competitive correction.

### Research content asset: "The Visualization Effect"
New research page planned: `/research/visualization-lift`. See `memory-bank/research/visualization-lift-research.md` for full data compilation.
- 3 tiers of evidence: independent studies, named builder case studies, vendor claims
- Honest framing: no independent study exists, but 10+ companies over 20+ years all point the same direction
- Companion to `/research/hidden-revenue-line` (size of revenue line → impact of visualization)
- LinkedIn article to follow, same pattern as first research piece

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

## Ongoing Maintenance

### Quarterly content freshness cycle (every ~3 months)

AI models penalize stale content. Pages updated within 2 months earn ~28% more citations; content >3 months old drops sharply. Our category has zero competition so quarterly is sufficient for now.

**Next due: June 2026**

Every cycle, do all of:

1. **Make at least one real content update per page** — refreshed stat, new FAQ, updated comparison row. Don't bump timestamps without actual changes (Google considers that deceptive).
2. **Bump visible timestamps**:
   - `/vs/envision` hero: "Updated [Month Year]"
   - `/vs/pdf-option-sheets` hero: "Updated [Month Year]"
   - `/research/hidden-revenue-line` hero already shows "March 2026" — update if content changes
3. **Bump `dateModified` in JSON-LD**:
   - `src/app/landing-full.tsx` — SoftwareApplication schema
   - `src/app/vs/envision/page.tsx` — FAQPage schema
   - `src/app/vs/pdf-option-sheets/page.tsx` — WebPage schema
   - `src/app/research/hidden-revenue-line/page.tsx` — Article schema
4. **Review `public/llms.txt` and `public/llms-full.txt`** for accuracy against current site state
5. **Check robots.txt AI bot list** — new AI crawlers appear regularly (add any new major ones)

### AI search audit (every ~6 months)

Re-run the key query tests to check if Finch is appearing:
- "home builder upgrade visualization tool"
- "design center software for home builders"
- "new construction home upgrades"
- "home builder upgrade revenue SEC filings"
- "withfin.ch" / "finch upgrade visualization"

Check Perplexity, ChatGPT, and Google AI Mode specifically. Track whether the SEC research report starts getting cited.

---

## Open Questions

1. **Google Search Console**: Is withfin.ch verified in GSC? Step 0 for everything.
2. **Builder name sensitivity**: Will builders get annoyed seeing their name on Finch content? The framing matters — "What to Expect at the Toll Brothers Design Center" is helpful, not adversarial. But worth thinking about before publishing. Could soft-launch with public builders (SEC data gives us cover) and skip private builders initially.
3. **Form design**: Should "Ask your builder" be a simple inline form or a modal? Inline is lower friction. Modal can capture more data. Test both.
4. **Content velocity**: How many builder pages before the flywheel has enough data to power outreach? Probably 5-8 (the top-volume builders) is enough to start seeing form submissions.
5. **Backlink strategy**: The SEC research report is linkable content. Pitch to HousingWire, Builder Innovator, NAHB publications?
6. **DataForSEO rank tracking**: Set up automated monitoring for target keywords? Cheap, useful for measuring progress after content goes live.
7. **Conference timing**: IBS (International Builders' Show) and PCBC — could we time content drops to coincide with these events?
