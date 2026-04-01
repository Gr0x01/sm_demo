# Builder Tech Pricing Research

**Date**: 2026-03-24
**Purpose**: Understand how B2B SaaS tools in the home builder space structure pricing, to validate or refine Finch's $500/plan/month model.

---

## 1. Pricing Units Across Builder Tech

### The landscape: almost nobody publishes prices

The single most important finding is that **almost no builder tech vendor publicly discloses pricing**. Envision (Zonda), ECI Insearch, Roomored, Chameleon Power (Hyphen), Higharc, Aareas Interactive, and BuildOn/VEO all require "contact sales" or "request a demo" to get pricing. This is standard for enterprise-sold builder tools.

The exceptions that reveal their model:

**Anewgo / Rendering House** (the one vendor with transparent pricing):
- Per-elevation rendering: $300 per 3D elevation (one-time)
- Per-floor-plan: $40-$300 per floor depending on quality (2D B&W to 3D furnished)
- Per-option: $15-$75 per interactive option
- Per-community: First community free, $200 setup fee per additional community (waived with kiosk purchase)
- Monthly hosting: $0 without analytics, $50/month with unlimited storage + analytics
- Stone/brick surcharge: $5 per stone or brick color per elevation
- No monthly hosting fees for the base app

This is a **per-asset, one-time cost model** (pay per rendering created) rather than SaaS subscription. Builders pay for content creation, not ongoing access. The interactive app layer is free.

**NoviHome** (builder CRM):
- Flat-fee SaaS model, NOT per-user
- One-time setup fee + ongoing license fees
- Licenses segmented by division (not by community or home count)
- No per-closing fees
- No per-user charges
- No charge for standard integrations
- Actual dollar amounts not disclosed

**Procore** (construction management, adjacent):
- Annual fee based on Annual Construction Volume (ACV) -- the aggregate dollar value of construction work
- Essentially 0.1-0.2% of project hard costs
- Small contractors: $4,500-$10,000/year
- Mid-size to large: $25,000+/year
- Unlimited users and data
- No per-project or per-user fees

### Summary of pricing units in builder tech

| Pricing Unit | Who Uses It | Notes |
|---|---|---|
| **Per-asset (rendering/plan)** | Anewgo | One-time creation cost, no ongoing SaaS |
| **Flat fee by division** | NoviHome | SaaS subscription, segmented by org structure |
| **Annual Construction Volume** | Procore | Percentage of total build value |
| **Per-user/month** | Buildertrend, general construction SaaS | $162/user avg; $499+/mo for full platforms |
| **Flat monthly fee** | 75% of builder software buyers | Average ~$412/month for unlimited users |
| **Enterprise contract (custom)** | Envision, ECI Insearch, Roomored, Aareas, Higharc | Unknown structure, estimated $50K-$200K+/year |

### What's NOT used (and notable)
- **Per-home-closed**: No builder tech vendor publicly uses this model. Nobody wants to tie pricing to the builder's sales performance.
- **Per-community**: Only Anewgo uses community as a pricing unit, and only for setup fees ($200/community), not ongoing.
- **Per-buyer-session / per-visualization**: Nobody meters buyer usage. Unlimited access is table stakes.
- **Revenue share / percentage of uplift**: Zero examples found in builder tech. This model is emerging in broader SaaS (Gartner says 40% of enterprise SaaS will have outcome-based components by 2026) but hasn't hit homebuilding.

---

## 2. Free Tiers, Trials, and Pilots in Builder Tech

### What the market does

**Anewgo**: First community free. This is the clearest "free tier" in builder tech. Additional communities cost $200 setup. The free community is a land-and-expand play -- get them using it for one community, then charge for the rest.

**ECI Insearch**: 8-12 week implementation timeline. No public free trial. This is enterprise software -- demos, not self-serve.

**Envision / Zonda**: No public trial. Enterprise sales process.

**Roomored / ILG**: No public trial. Tied to Interior Logic Group's installation business, so pricing may be bundled with installation contracts.

**General construction SaaS**: ConstructionOnline offers 10-day full access trial with "Core Tools forever free" after. Contractor Foreman offers a free trial. Buildium offers a free trial. But these are general construction management tools, not design center / visualization.

### Builder tech trial patterns

- **Enterprise design center tools (Envision, ECI, Roomored, Aareas)**: No free trials. Demo-driven sales. Long implementation cycles (8-12 weeks). Pilots may happen but are negotiated, not self-serve.
- **Lighter tools (Anewgo, general SaaS)**: Some free tier or trial, but still primarily sales-driven.
- **Common pattern**: "1 community free" (Anewgo) or "60-day full access" (ConstructionOnline). Time-limited and feature-limited trials are rare in builder-specific tools.

### Implication for Finch
The "1 floorplan free for 60 days" pilot structure is **more generous than what enterprise competitors offer** (they offer nothing) while being **similar to what lighter tools offer** (Anewgo's 1 community free). This positions Finch well -- low risk for the builder, high confidence from Finch that the product works.

---

## 3. Per-Seat vs Per-Unit vs Per-Usage in B2B SaaS (General)

### 2025 benchmark data (from Monetizely study of 100+ companies)

**Per-user (seat-based)**: Still dominant but declining
- 57% of SaaS companies use per-user pricing as primary model (down from 64% in 2024)
- Median per-user price: $45/month across all segments
- Highest adoption in HR Tech (78%) and Project Management (81%)
- Lowest in API/infrastructure tools

**Usage-based**: Growing fast
- 43% of companies now use usage-based approaches (+8pp YoY)
- Companies report 18-23% higher net revenue retention
- 34% faster land-and-expand motion
- But: harder to forecast, harder for buyers to budget

**Hybrid models**: The dominant trend
- 61% of companies employ some form of hybrid pricing (up from 49% in 2024)
- Most common hybrid: Platform fee + per-user (41% of hybrid implementations)
- Also: per-user + usage overages (33%), tiered flat-rate + usage (26%)

**Outcome-based**: Emerging but early
- Only 9% of companies have fully implemented outcome-based models
- 47% are actively exploring or piloting
- Gartner forecasts 40% of enterprise SaaS will include outcome-based components by 2026
- Companies see 40% longer sales cycles but 65% higher contract values
- Outcome pricing can capture 25%+ of value created (vs 5% for traditional models)

**Credit-based**: Surging (especially AI tools)
- 79 companies in PricingSaaS 500 Index now offer credit models, up from 35 at end of 2024 (126% YoY increase)

### The key question: what's your "natural unit"?

The research suggests choosing a pricing metric that:
1. **Scales with the value the customer receives** -- if they get more value, they pay more
2. **Is predictable for the buyer** -- they can budget for it
3. **Is hard to game** -- the customer can't reduce their bill without reducing their usage of the thing that creates value

For Finch, "per floor plan" satisfies all three:
- More plans = more buyer touchpoints = more upgrade revenue (scales with value)
- Fixed monthly per plan = predictable budgeting (no surprises)
- Builders can't "game" plan count -- they need coverage on their active floorplans

---

## 4. Regional Builder Technology Budgets

### What the data says

**Higharc 2024 Homebuilder Survey**: 55% of home builders plan to invest more revenue in technology. 88% agree technology is critical to productivity and success. But no specific dollar amounts or percentages of revenue allocated.

**Industry benchmarks for construction software spending**:
- Small builders: $100-$500/month for core software (ERP, project management)
- Mid-size builders (50-200 homes/year): $400-$2,000/month across their software stack
- Enterprise builders: $25,000-$100,000+/year for major platforms (Procore, ECI, Constellation)

**Constellation HomeBuilder Systems ROI analysis**: A 200-home/year builder saves $363,625 over 5 years ($72,725/year) from integrated software. This suggests the total technology budget for a builder of this size is well above $72K/year if the ROI is positive.

**Design center software specifically**: No published data on what builders spend specifically on design center technology vs. other software. However, the Finch VISION.md estimate of $100K-$400K/year total tech budget for 200-2,000 home/year builders is reasonable given:
- Buildertrend alone costs $6K-$12K/year
- Enterprise ERP (MarkSystems, Constellation) likely $25K-$100K/year
- Add CRM, design center, marketing tools, and $100K+ total is easy to hit

**Flat monthly fee benchmark**: 75% of home builder software buyers pay a flat monthly fee averaging ~$412/month for their primary software. This is for general construction management, not design center tools. Design center platforms (Envision, ECI, Roomored) are typically add-on contracts on top of this.

### What price points work for regional builders (50-500 homes/year)?

Based on the data:
- **$400-$500/month** is well-established as a comfortable price point for builder software
- **$1,500-$4,000/month** ($18K-$48K/year) for a specialized tool is within range for builders doing 100+ homes/year
- **$500/plan/month** at a 3-plan minimum ($1,500/month, $18K/year) sits right at the top of the "comfortable" range and below the enterprise tier
- The ROI math matters more than the absolute number -- if you can show $50K+ in upgrade revenue lift, $18K/year is easy to justify

---

## 5. Community-Based vs Plan-Based Pricing

### Precedent in builder tech

**Community-based pricing**:
- Anewgo charges per community ($200 setup fee per additional community, first free)
- Anewgo Marketplace listings: $10/month per community for non-Anewgo content users
- Procore's ACV model is loosely community-adjacent (more projects/communities = higher construction volume = higher price)
- No other vendor explicitly prices "per community"

**Plan/floorplan-based pricing**:
- Anewgo charges per rendering (each elevation/floor plan is a separate asset purchase)
- No vendor explicitly uses "per floorplan per month" as their pricing unit
- This makes Finch's model **novel in the space**

### Why per-plan is better than per-community for Finch

**Per-community issues**:
- A community can have 3-15+ floorplans. Pricing per community either undercharges (builder with 15 plans pays the same as one with 3) or requires tiered pricing within communities (complexity)
- Community lifecycles vary -- communities open and close. Builders would want to swap communities without paying for both
- Doesn't scale linearly with Finch's actual cost (which is per-floorplan: photos, prompts, generation, caching)

**Per-plan advantages**:
- Aligns with Finch's actual cost structure (each plan requires photo setup, prompt tuning, caching)
- Aligns with value delivered (each plan reaches a set of buyers)
- Builders intuitively understand "I'm buying visualization for this floorplan"
- Easy to expand: "add your new plan for $500/month" vs. negotiating community-level contracts
- Community-agnostic: same plan can be used in multiple communities without pricing confusion

### The Anewgo precedent is informative

Anewgo's "first community free" works because their marginal cost per additional community is low (it's just hosting/config). Their real cost is in rendering creation, which they charge per-asset.

Finch's cost structure is similar -- the real cost is per-floorplan (photos, prompts, generation). The community is just a container. Pricing per-plan is the natural unit.

---

## Key Takeaways for Finch Pricing

1. **Per-plan/month is a defensible and novel pricing unit.** No competitor uses it. It aligns with Finch's cost structure and value delivery. It's simple to understand and expand.

2. **$500/plan/month is in the right range.** It sits above commodity builder software (~$400/month flat) and well below enterprise design center platforms ($50K-$200K+/year). For a 3-plan minimum ($18K/year), it's accessible to builders doing 50+ homes/year.

3. **No setup fee is a competitive advantage.** Enterprise competitors have 8-12 week implementations with significant upfront costs. Anewgo charges per-rendering. Finch's "we handle everything, no setup fee" is genuinely differentiated.

4. **The 1-plan free pilot mirrors Anewgo's "first community free" model** and is more generous than what enterprise competitors offer (nothing). This is the right approach for early-stage sales.

5. **Nobody in builder tech does outcome-based or revenue-share pricing.** This is an opportunity for differentiation but also a risk -- builders are used to flat fees, and outcome-based models have 40% longer sales cycles. Keep it simple for now.

6. **Unlimited buyer sessions/visualizations is table stakes.** No competitor meters buyer access. Don't introduce usage caps.

7. **The biggest competitor on pricing is "do nothing."** Most regional builders spend $0 on design center visualization technology. The ROI case -- not the price comparison to competitors -- is what closes the deal.

---

## Sources

- [Anewgo App Pricing (Rendering House)](https://products.renderinghouse.com/app-pricing/)
- [Anewgo Marketplace](https://anewgo.com/anewgo-marketplace/)
- [Anewgo Price Estimates](https://anewgo.com/price-estimates/)
- [NoviHome Pricing](https://www.novihome.com/pricing)
- [Zonda Envision](https://zondahome.com/digital-solutions/envision/)
- [ECI Insearch](https://www.ecisolutions.com/products/insearch/)
- [Chameleon Power / Hyphen Solutions](https://info.hyphensolutions.com/products/chameleon-power/)
- [Chameleon Power BuilderVision](https://chameleonpower.com/buildervision.aspx)
- [Roomored](https://roomored.com/)
- [Higharc](https://www.higharc.com)
- [Aareas Interactive Virtual Design Center](https://aareas.com/virtual-design-center/)
- [Procore Pricing](https://www.procore.com/pricing)
- [Procore Pricing Analysis (Perimattic)](https://perimattic.com/cost-of-procore-construction-software/)
- [Procore Pricing Analysis (Projul)](https://projul.com/blog/procore-pricing-analysis-2026/)
- [SaaS Pricing Benchmark Study 2025 (Monetizely)](https://www.getmonetizely.com/articles/saas-pricing-benchmark-study-2025-key-insights-from-100-companies-analyzed)
- [B2B SaaS Pricing Strategies 2025 (SaaStock)](https://www.saastock.com/blog/saas-pricing-models-insights-from-industry-leaders/)
- [SaaS Pricing Trends Report 2025 (Maxio)](https://www.maxio.com/resources/2025-saas-pricing-trends-report)
- [State of B2B SaaS 2025 (ProductLed)](https://productled.com/blog/state-of-b2b-saas-2025-report)
- [Outcome-Based Pricing (Monetizely)](https://www.getmonetizely.com/articles/outcome-based-pricing-tying-saas-prices-to-customer-success)
- [SaaS Pricing Strategy Guide 2026 (NxCode)](https://www.nxcode.io/resources/news/saas-pricing-strategy-guide-2026)
- [Constellation HomeBuilder ROI Analysis](https://www.constellationhb.com/blog/2018/07/home-builder-analysis-home-building-software-roi/)
- [Higharc 2024 Homebuilder Survey](https://www.higharc.com/blog/key-takeaways-from-higharcs-2024-homebuilder-outlook-survey)
- [Software Advice: Home Builder Software Pricing](https://www.softwareadvice.com/construction/homebuilder-software-comparison/)
- [Zonda Envision Expansion (PR Newswire)](https://www.prweb.com/releases/zonda-expands-investment-into-the-envision-new-home-design-center-platform-with-new-upgrades-302232536.html)
- [ECI Insearch Features](https://www.ecisolutions.com/products/insearch/features/)
