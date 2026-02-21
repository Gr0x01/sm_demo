# Landing Page Design Doc

## Purpose

One-page marketing site that sells Finch to regional home builders. Builder language, revenue framing, no tech jargon. Lives in the same Next.js app as a new route.

**Target visitor**: Builder owner, VP of Sales, or division president who lands here from a conference follow-up email, LinkedIn post, builder referral, or cold outreach. They care about margin, speed, and proof. They've seen a hundred vendor pitches. Earn attention in 5 seconds or lose them.

---

## Page Structure

### 1. Hero

**Background**: White or #F8FAFC. No dark backgrounds. Let bold typography carry the visual weight.

**Headline options** (test — pick one):
- "Your buyers pick Standard because they can't picture the upgrade."
- "$8,200 more per home. Same sales team."
- "Buyers upgrade what they can see."
- "The PDF price sheet is costing you $5K per closing."

**Subtext**:
"Buyers see their kitchen before they commit. They choose more. You make more per home."

No mention of AI, no feature language, no product description. Outcome only.

**Primary CTA**: "See the Demo" — links to SM demo (or neutral branded version)

**Secondary CTA**: "Book a Walkthrough" — Calendly link, outline/ghost button style

**Below CTAs**: Qualifier line — "Built for production home builders closing 100+ homes a year."

**Trust bar**: Builder logo(s) at the bottom of the hero section. Even if it's just Stone Martin during pilot phase: "Currently in pilot with Stone Martin Builders — 500+ homes/year, Alabama."

---

### 2. Before / After

The single most persuasive visual on the page. Not optional.

**Layout**: Side-by-side comparison.
- **Left**: The PDF price sheet (actual Kinkade plan sheet, blurred or anonymized if needed). Caption: "What buyers see today."
- **Right**: Screenshot of the picker with a generated kitchen image visible. Caption: "What buyers see with Finch."

The contrast sells itself. No copy needed beyond the captions.

**CTA**: "Try It Yourself" — links to the live demo

**Framing line above the demo link**: "This demo is configured for a real builder in Alabama. Yours will feature your finishes, your pricing, your brand."

---

### 3. The ROI Case

Simple math in builder language. Bold numbers, scannable layout.

**Lead-in**:
"Here's what 5% more upgrade revenue looks like at your volume."

**The math** (large bold numbers, white background):
- Average upgrade spend today: $8-12K per home
- 5% lift across 200 homes = **$80K–$120K** additional annual revenue
- At 500 homes: **$200K–$300K**

**Closer**:
"One upgraded kitchen covers a full year. Multiply by your annual closings."

**Footnote**: "5% is conservative. Visual merchandising in retail lifts 10-30%. Home upgrades with no visual context is worse than retail."

*Note: Validate these numbers against real builder data before launch.*

---

### 4. How It Works

Four steps. Clean, numbered. Framed around what the builder gets, not what we do behind the scenes.

1. **Send us your floor plans and pricing** — we handle everything from there
2. **We build your branded tool** — your finishes, your options, your prices
3. **Your buyers see their kitchen before they commit** — selections happen visually, not from a price sheet
4. **Selections export as a priced PDF** — ready for your sales team, no re-entry

**Below the steps**: "No software to learn. No data entry. No IT."

---

### 5. Social Proof / Credibility

**Primary**: Builder proof, not personal story.

- If SM pilot data exists: "Stone Martin Builders piloted Finch across 4 communities. [Specific result if available.]"
- Builder logo + location
- If a quote exists from anyone at SM, use it with name and title

**Secondary** (smaller, below): Brief founder line if needed — keep it builder-framed:
"I went through the design appointment as a buyer. Saw the problem firsthand. Built the fix."

Two sentences max. No job title. No years of experience.

---

### 6. FAQ / Objection Handling

3-4 questions, short answers. Sits before the final CTA to clear the last objections.

**How long does setup take?**
"Most builders are live in 2-3 weeks. We handle the configuration — you just send us your floor plans and pricing."

**Do I need to change my sales process?**
"No. This fits into your existing design appointments. Your sales team doesn't need training — buyers use the tool themselves."

**What does this cost?**
"Pricing depends on your floor plan count. Most builders see ROI in the first month. We'll scope it on a call — and your first plan is free to prove it works."

**What about my existing design center software?**
"Finch works alongside your current process. It's the visual layer that makes your existing options sell better."

---

### 7. Final CTA

**Headline**: "See what this looks like with your floor plans."

**Primary CTA**: "Book a 15-Minute Walkthrough" — Calendly embed or link

**Microcopy below button**: "We'll use your actual floor plans. 15 minutes. No commitment."

**Secondary CTA**: "Send me the one-pager" — lightweight email capture for builders who need to loop in their VP or design center manager before committing. PDF one-pager with the ROI case + demo link.

---

## Visual Approach

| Element | Spec |
|---------|------|
| Backgrounds | White (#FFFFFF) and light gray (#F1F5F9) alternating |
| Text | Headlines: #0F172A, Body: #334155, Secondary: #64748B |
| Borders | #E2E8F0 on cards and dividers |
| Accent color | Defined in Tailwind config — blue frontrunner, keep swappable |
| Font | Inter |
| Corners | Sharp — no border-radius anywhere |
| Shadows | Subtle — 0 1px 3px rgba(0,0,0,0.08) on cards |
| Images | Real screenshots and generated kitchen images only, no stock |
| Layout | Single page scroll, no navigation |
| Mobile | Responsive — builders forward links from their phones |

**Section background pattern**:
1. Hero — white
2. Before/After — #F1F5F9
3. ROI Case — white
4. How It Works — #F1F5F9
5. Social Proof — white
6. FAQ — #F1F5F9
7. Final CTA — white

---

## Messaging Principles

- **Builder language**: "upgrade revenue", "design appointment", "model home", "floorplan", "closings"
- **Revenue framing**: they don't care about AI, they care about money
- **Short**: every word earns its spot
- **Specific**: dollar figures, home counts, timeframes — never vague
- **No "AI" in headlines or hero** — bury it in how-it-works if at all
- **No startup energy** — no "we're passionate", no "revolutionary", no exclamation marks
- **Decisive tone** — state facts, don't hedge. "Buyers upgrade what they can see." Not "We believe that visual tools can help buyers make better decisions."

---

## Technical Implementation

- New route in the Next.js app — `/` when product launches
- SM demo moves to `/{org-slug}/{floorplan-slug}` pattern per product-architecture.md
- Pure static page — no database, just Tailwind
- PostHog event tracking:
  - `hero_cta_click` — "See the Demo" button
  - `hero_walkthrough_click` — "Book a Walkthrough" button
  - `demo_link_click` — "Try It Yourself" in before/after section
  - `bottom_cta_click` — final CTA interaction
  - `onepager_request` — secondary CTA email capture
  - `scroll_depth` — 25%, 50%, 75%, 100% markers
  - `time_on_page` — engagement depth
- UTM parameter support on all inbound links (`utm_source`, `utm_medium`, `utm_campaign`)
- Set up PostHog dashboard before launch — day-one data
- OG meta tags for link previews (screenshot of generated kitchen)
- Placeholder product name until branding is finalized

---

## Distribution Context

| Channel | Visitor mindset | What matters most on the page |
|---------|----------------|-------------------------------|
| Conference follow-up | Warm — saw the demo live | ROI section + demo link to revisit the wow moment |
| LinkedIn | Curious — clicked from a post about upgrade revenue | Hero headline + before/after visual |
| Builder referral | Trusting but no context | Full page needs to stand alone — social proof anchors the referral |
| Cold outreach | Skeptical — didn't ask for this | Hero must earn attention in 5 seconds — proof and specifics matter most |
| Mobile forward | Skimming — builder sent this to their VP | Clean mobile layout, bold numbers, clear CTA |

---

## Alignment Checks

- **Brand guardian**: Light backgrounds, sharp corners, monochrome + one accent, bold typography as hero, product UI as proof. No navy blocks, no colored sections, no AI buzzwords.
- **Service model**: Matches setup service (Model A) from product-architecture.md — "we do everything, you get the tool"
- **Two-path strategy**: Landing page sells the setup service now; self-serve isn't mentioned
- **ROI framing**: Grounded in real SM demo data ($8-12K average upgrades, 200-home builder scale)
- **Growth channels**: Page works for all five distribution paths (conference, LinkedIn, referral, outreach, mobile forward)

---

## Open Items

- [ ] Final product/company name (Finch pending LLC)
- [ ] Domain
- [ ] Stone Martin permission to use their name/logo as social proof
- [ ] Real screenshot assets — pick the best generated kitchen image
- [ ] Before/after visual — photograph or screenshot the actual PDF price sheet
- [ ] Contact info (email, phone) once LLC is registered
- [ ] Calendly vs simple contact form vs both
- [ ] One-pager PDF for secondary CTA
- [ ] Validate ROI math against additional builder data points
- [ ] Neutral branded demo or SM demo with framing wrapper
- [ ] PostHog dashboard setup
- [ ] UTM link templates for each distribution channel
