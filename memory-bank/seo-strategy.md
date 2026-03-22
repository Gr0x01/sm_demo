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
| `/research` | research hub | Index page linking to all research articles |
| `/research/hidden-revenue-line` | "home builder upgrade revenue" | Original research, strong content |
| `/research/visualization-lift` | "upgrade visualization impact" | Sales asset, not SEO traffic play |
| `/learn/new-construction-upgrades` | "new construction upgrades" (170/mo) | Buyer-facing anchor page |
| `/demo` | "finch demo" | Sandbox demo |

### Technical SEO in place
- Metadata (title, desc, OG, Twitter, canonical) on all marketing pages
- robots.txt blocks admin/API/tenant routes, allows AI bots on marketing pages
- Sitemap with priorities (all marketing + research pages)
- `llms.txt` + `llms-full.txt` for AI discovery
- Dynamic OG images on /vs/, /research/, homepage, /learn/ pages
- Proper H1 hierarchy
- JSON-LD: Organization (root layout), Article (research pages), SoftwareApplication (homepage), FAQPage (homepage, /vs/envision), WebPage (/vs/pdf-option-sheets)
- Favicon + apple-touch-icon + web manifest
- Visible "Updated" timestamps on /vs/ pages for AI freshness signals

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

#### Buyer-side: "new construction upgrades" cluster
| Keyword | Vol/mo | CPC | Competition | Notes |
|---------|--------|-----|-------------|-------|
| new construction home upgrades | 170 | — | LOW | Big opportunity |
| upgrades on new home construction | 170 | — | LOW | Same intent |
| upgrades when building a new home | 170 | — | LOW | Same intent |
| new construction upgrades that add value | 20 | — | LOW | |
| new construction upgrades to avoid | 20 | — | LOW | |
| average cost of new construction upgrades | 10 | — | — | |
| best new construction upgrades | 10 | — | — | |
| new home upgrade options | 10 | — | — | |
| **Cluster total** | **~580+** |

#### Buyer-side: "[builder name] design center" cluster (BIGGEST — found in round 2)
| Keyword | Vol/mo |
|---------|--------|
| homes design center | 720 |
| pulte homes design center | 590 |
| arbor homes design center | 170 |
| richmond american home design center | 70 |
| ryan homes design center | 50 |
| pulte design center price list | 40 |
| home builder design center | 30 |
| lennar home design center | 30 |
| new home design center | 20 |
| pulte home design studio | 20 |
| new construction design center | 10 |
| design center appointment for new home | 10 |
| new home design center tips | 10 |
| new home design center checklist | 10 |
| **Cluster total** | **~1,780+** |

**This is the biggest finding.** Nearly 1,800 monthly searches from buyers preparing for or researching their design center appointment. "Pulte homes design center" alone is 590/mo. Currently served by builder's own pages (if they have them) and generic blog posts. Nobody owns the cross-builder "what to expect at the design center" content.

#### Buyer-side: "[builder name] upgrade price list" cluster
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

#### Combined buyer-side opportunity: ~2,700+ monthly searches
All LOW competition. All served by generic blog posts, Reddit, or builder's own sparse pages. Nobody owns the cross-builder educational content.

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

**This is the primary SEO investment.** Combined buyer-side opportunity: ~2,700+ monthly searches, all LOW competition. This feeds the buyer-pull flywheel.

**Build order**: Anchor page first (hub), then builder-specific pages (templated), then research page (sales asset, lowest urgency).

~~**"Ask Your Builder" form**~~ — Cut. A buyer typing their builder's name into a form isn't warm outreach. The demo itself is the conversion event. If buyers try the demo and love it, that's the data point. PostHog already tracks demo starts from content pages — that's the signal we need for builder outreach.

#### 2a: The Anchor Page ✅ (2026-03-22)

`/learn/new-construction-upgrades` — **"The Complete Guide to New Construction Upgrades"**

Target keywords: "new construction home upgrades" (170/mo), "upgrades when building a new home" (170/mo), "new construction upgrades that add value" (20/mo), "best new construction upgrades" (10/mo)

This is the cross-builder hub that all `/learn/design-center/` pages link back to.

- [x] 8 sections: hero, stat bar, upgrade categories (8), structural vs cosmetic, SEC data + research link, design center appointment tips (6), demo CTA, final buyer-pull CTA
- [x] Article JSON-LD, OG image, canonical URL, meta/OG/Twitter tags
- [x] PostHog `learn_page_viewed` tracking, TrackedLink on all CTAs
- [x] Contextual Finch mention in design center tip #6 ("try it right now")
- [x] Buyer-pull CTA hierarchy: "Try It Live" primary, "Get Started" secondary
- [x] SiteNav defaults centralized (Try It, Upgrade Guide, Research, Get Started CTA) — all marketing pages share same nav
- [x] SiteFooter "Upgrade Guide" link added
- [x] robots.ts `/learn/` allowed, sitemap priority 0.8, llms.txt + llms-full.txt updated
- [x] Brand guardian + growth hacker review: decorative colon fixed, AI slop cleaned, keyword added to H2, builder placeholder removed (add back when first builder page ships)
- **Still TODO**: FAQ section with FAQPage JSON-LD (featured snippets), add visuals (demo screenshot or before/after), backlinks from /research and /vs/ pages, scroll depth tracking

#### 2b: Builder-Specific Design Center Pages (HIGHEST VOLUME — 1,780+/mo)

`/learn/design-center/[builder-slug]` — "The [Builder] Design Center: What to Expect"

This is the biggest keyword cluster we found. Buyers preparing for their design center appointment are actively searching for what to expect. "Pulte homes design center" alone is 590/mo.

| Page | Primary keyword | Vol | Secondary keywords |
|------|----------------|-----|--------------------|
| `/learn/design-center/pulte` | pulte homes design center | 590 | pulte design center price list (40), pulte home design studio (20) |
| `/learn/design-center/arbor-homes` | arbor homes design center | 170 | arbor homes upgrade costs (30) |
| `/learn/design-center/richmond-american` | richmond american home design center | 70 | richmond american upgrade price list (10) |
| `/learn/design-center/ryan-homes` | ryan homes design center | 50 | ryan homes upgrade price list (20) |
| `/learn/design-center/taylor-morrison` | taylor morrison design center upgrades cost | 50 | |
| `/learn/design-center/kb-home` | (from price list cluster) | — | kb home upgrade price list (40) |
| `/learn/design-center/toll-brothers` | (from price list cluster) | — | toll brothers upgrade price list (40), toll brothers upgrade costs (20) |
| `/learn/design-center/lennar` | lennar home design center | 30 | lennar home upgrades (20) |

Content per page:
- What the design center experience is like at that builder
- Typical upgrade categories they offer (cabinets, counters, flooring, etc.)
- What SEC filings reveal about their upgrade revenue (for public builders — Toll, Pulte, Lennar, KB, etc.)
- How to prepare for your appointment (checklist, budget tips)
- "See what these upgrades actually look like" → **embedded Finch demo**
- **CTA**: "Ask [Builder] about Finch" + "Which community are you building in?" form
- **NOT**: actual pricing (that's their IP and changes constantly)

**Critical framing**: Helpful to buyers, not hostile to builders. "Here's what to expect, and here's a tool that helps you visualize your choices." If the builder calls us, great. If they don't, the buyer got useful content.

**Bonus data**: The form captures which builders and communities have active buyers. That's a prospecting goldmine. "We know 47 buyers at [Builder Name] tried our visualizer last month" is a surgical cold email.

**Start with**: Pulte (590/mo — 3x anything else), Arbor Homes (170/mo), then Richmond American, Ryan Homes, Taylor Morrison. Public builders with SEC data get richer content.

#### 2c: Research — "The Visualization Effect" ✅ (2026-03-22)

`/research/visualization-lift` — **"The Visualization Effect"** — SHIPPED.

NOT an SEO traffic play (nobody searches this). Value is as:
- Sales asset for cold emails and LinkedIn
- Credibility piece that builder-specific pages and the anchor page link to
- LinkedIn article (companion to the SEC research piece)
- Honest framing of vendor case study data by credibility tier

Page structure: hero, stat bar (67% / 1-in-3 / 20-70%), the question, independent evidence (3D Cloud + NAR), named builder evidence table, vendor claims table, animated two-tone bar charts (named builder vs vendor claim), what's missing, our own data ($5,200→$7,290 n=1), the math (ROI table), sources by tier, GetStartedSection.

Also shipped: `/research` index page — hub listing all research articles as cards. All nav/footer "Research" links now point to `/research` instead of directly to hidden-revenue-line.

**Next**: LinkedIn article, update `llms.txt`/`llms-full.txt` with visualization research data.

### Phase 3: B2B Comparison Pages (ongoing, low effort)

Target: "builder design center" / "design center software" / "upgrade visualization"

**Goal**: When a builder actively searches for design center software, Finch shows up.

- [ ] `/vs/eci-insearch` — ECI Insearch is the most established design center visualization competitor. Pre-rendered 3D vs our AI photos. 8-12 week setup vs days. Named case study (Signature Homes +20% sales) we can reference honestly.
- [ ] `/vs/chameleon-power` — Chameleon Power/BuilderVision (now Hyphen). Swatch-based point-and-click vs AI photo generation. They rank in SERPs.
- [ ] `/vs/design-center-software` — Category overview comparing all players (ECI, Hyphen/Chameleon, Aareas, Roomored, Constellation, Higharc) and Finch's approach. Target "home builder design center software" (10/mo) and "builder design center" (70/mo).
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

### Research content asset: "The Visualization Effect" ✅
`/research/visualization-lift` is live. See `memory-bank/research/visualization-lift-research.md` for source data.
- 3 tiers of evidence: independent studies, named builder case studies, vendor claims
- Honest framing: no independent study exists, but 10+ companies over 20+ years all point the same direction
- Companion to `/research/hidden-revenue-line` (size of revenue line → impact of visualization)
- `/research` index page serves as hub for both pieces (and future case studies)
- LinkedIn article still TODO

---

## Metrics to Track

### Flywheel metrics (the ones that matter)
- **Demo starts from content pages** (PostHog funnel: `/learn/*` → `/try` → session created)
- **Content page → demo conversion rate** (PostHog: `learn_page_viewed` → `cta_clicked` with location `learn-upgrades-demo`)
- **Cold emails sent with buyer data** → response rate vs. generic cold emails

### SEO health (check monthly)
- **Organic impressions** (Google Search Console)
- **Ranking positions** for target keywords (DataForSEO rank tracker)
- **Organic traffic to content pages** (PostHog: `learn_page_viewed`)
- **Get Started form submissions from organic** (PostHog attribution)

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
   - `/learn/new-construction-upgrades` hero shows "March 2026" — update if content changes
3. **Bump `dateModified` in JSON-LD**:
   - `src/app/landing-full.tsx` — SoftwareApplication schema
   - `src/app/vs/envision/page.tsx` — FAQPage schema
   - `src/app/vs/pdf-option-sheets/page.tsx` — WebPage schema
   - `src/app/research/hidden-revenue-line/page.tsx` — Article schema
   - `src/app/learn/new-construction-upgrades/page.tsx` — Article schema
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
3. **Content velocity**: How many builder pages before the flywheel has enough data to power outreach? Probably 5-8 (the top-volume builders) is enough to start seeing demo traffic.
4. **Backlink strategy**: The SEC research report is linkable content. Pitch to HousingWire, Builder Innovator, NAHB publications?
5. **DataForSEO rank tracking**: Set up automated monitoring for target keywords? Cheap, useful for measuring progress after content goes live.
6. **Conference timing**: IBS (International Builders' Show) and PCBC — could we time content drops to coincide with these events?
7. **Anchor page visuals**: The learn page has zero images. For a product about visualization, this is a gap. Add demo screenshot, before/after, or embedded mini-demo.
8. **Anchor page FAQ section**: Adding 3-5 buyer FAQs with FAQPage JSON-LD would capture featured snippets. High-impact, low-effort addition.
