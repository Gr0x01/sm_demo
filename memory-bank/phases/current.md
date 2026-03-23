# Current Phase: Sales Outreach + SEO

## Context

V1 product is fully shipped. SM and Demo orgs are live. Homepage, research pages, learn hub, VS comparisons, prospect demo pages — all live. See `completed.md` for the full history.

Now focused on: builder outreach (provocation-first strategy) and SEO content expansion.

## Active Workstreams

### 1. Sales Outreach (Primary Focus)

**Strategy shift (2026-03-23):** Moved from inquisitive outreach (asking about their process) to provocation-first. Lead with visualization lift data (every builder doing viz sees 20-40% more in option sales), not Toll/Pulte SEC comparisons (dismissable as luxury). Practitioner voice, not tinkerer. Demo pages are a follow-up asset built after engagement, not pre-outreach. LinkedIn connection requests have no links (platform blocks them) — links go in the first DM after they accept.

**Cold email campaign (2026-03-23):**
- Full architecture doc: `memory-bank/project/cold-email-campaign.md`
- **Instantly**: `rashaad@heyfin.ch` + `anton@heyfin.ch` both at 100 warmup score, ready to send
- **Sequence**: 2 emails max, no links in either, plain text only. Email 2 ends with permission ask. No email 3.
- **Multi-channel**: Email + LinkedIn interleaved over ~8 days. Loom/demo page only after engagement.
- **Contact database**: Apollo (free plan, 100 export credits/mo)
- **Pipeline**: Notion "Builder Outreach" database (renamed, cleaned up, email fields added)
- **Subagent**: `lead-researcher` — deep builder research, qualification, email drafting, Notion + Instantly integration
- **First batch**: 10 leads researched and added to Notion (Hughston, Rockhaven, Alexander Scott, Centennial, Piedmont, McKinley, Traton, Lowder, Holland, Rocklyn). Emails drafted, need verification before sending.

**Active LinkedIn prospects:**
- [ ] **Doug French** (Stylecraft Homes, CEO) — 1st connection, no reply to Thursday message. Demo page live at `withfin.ch/for/stylecraft`. Send before/after kitchen screenshot + link as follow-up DM.
- [ ] **Steve Snoddy** (Davidson Homes, Director of Sales & Marketing, Arizona) — Demo page live at `withfin.ch/for/davidson` (Hidden Hills kitchen, waterfall island). Uses NoviHome (buyer CRM app) but no visualization. DM drafted, ready to send.
- [ ] **Janna Pettegrew** (ICI Homes, Design Center Manager, NCIDQ) — 1st connection accepted 2026-03-24. Demo page in progress at `withfin.ch/for/ici` (Serena kitchen at Mosaic, Daytona Beach). ICI's website says "Do your best homework BEFORE your appointment" — Finch is the homework. No reply to initial DM yet.

**Playbooks (updated 2026-03-23):**
- Cold email campaign architecture (`project/cold-email-campaign.md`) — 2-email sequence, multi-channel, no links before reply
- Cold call script (`cold-call-script.md`) — provocation opener, visualization lift data leads
- LinkedIn outreach playbook (`linkedin-outreach-playbook.md`) — Loom as primary, prospect demo pages after engagement, design center managers as insertion points, no links in connection requests
- Cowork contractor guide (`cowork-linkedin-research-guide.md`) — aligned with new strategy
- Trade publication pitches (`trade-publication-pitches.md`) — Pro Builder pitch sent 2026-03-16, others pending
- Research distribution targets (`research-distribution-targets.md`)
- Prospect lists: AL/GA, West Coast, National Tier 1-3

**Previous prospect demo page updates (2026-03-24):**
- ICI Homes prospect demo page built: `withfin.ch/for/ici` (Serena kitchen at Mosaic, Daytona Beach, exterior cover)
- `hero_headline` + `hero_body` DB columns added to floorplans — per-prospect custom hero copy, falls back to generic
- ICI hero: "You tell buyers to do their homework. This is the homework." (references ICI's own website language)
- Insights sidebar reframed for Design Center Manager audience (appointment time, buyer behavior) vs CEO revenue math
- Island cabinet color separated from perimeter cabinets (`kitchen-island-cabinet-color` subcategory)

**Previous prospect demo page updates (2026-03-23):**
- Hero: "I put this together in about ten minutes" + speed/cost messaging ($500/mo, no 3D, no six-figure setup)
- Removed stat card row (redundant with sidebar)
- Sidebar: visualization lift data (Signature Homes +20% option sales) instead of SEC-only
- Email: `rashaad@withfin.ch` on prospect pages
- Stylecraft photo_baseline updated re: missing fridge
- Before/after compare removed globally (StepPhotoGrid + ImageLightbox) — invites pixel scrutiny, never belonged on production pages
- AVIF photo support: generate-photo.ts now converts non-standard formats (AVIF, etc.) to PNG via sharp before sending to OpenAI
- Davidson Homes prospect demo page built: `withfin.ch/for/davidson` (Hidden Hills kitchen, waterfall island, exterior cover)

### 2. SEO Strategy + Content

**Completed:** Keyword research, competitive analysis, strategy doc (`seo-strategy.md`), JSON-LD + manifest + OG images, LLM search optimization (`llms.txt`/`llms-full.txt`), anchor page (`/learn/new-construction-upgrades`), upgrade guide visual polish, builder design center pages (Pulte, Arbor, Ryan, Richmond American), visualization lift research page, `/research` and `/learn` index hubs, VS page optimization (`/vs/envision`, `/vs/pdf-option-sheets`), `/vs/eci-insearch` comparison page, `/vs/chameleon-power` comparison page, IndexNow submission script, SiteNav/SiteFooter defaults, `/pricing` page ($500/mo per plan, ROI table, FAQs, JSON-LD), `/pricing/enterprise` page ("Still $500 per floor plan" — no enterprise tier messaging).

**Remaining:**
- [ ] Toll Brothers design center page

### 3. Software Listings

**Capterra (2026-03-24):** Submitted for review. Category: Home Builder. $500/mo per floor plan, free trial listed. Screenshots from SM demo (builder landing, floorplan intro, upgrade picker, selections summary). Pending Capterra team approval.

**Remaining:**
- [ ] G2 free listing — site is broken/unusable as of 2026-03-24, revisit later
- [ ] Software Advice listing

**Key insight:** Builder B2B keywords are tiny volume (<70/mo). Buyer-side content ("new construction upgrades" 170/mo, "[builder] upgrade price list" cluster ~400-500/mo) is the demand engine. Flywheel: buyer finds content → tries demo → asks builder → builder calls us.

## Key References

| Doc | Content |
|-----|---------|
| `completed.md` | All finished workstreams (V1 product, SM migration, etc.) |
| `product-architecture.md` | Multi-tenant schema, URL structure, user roles |
| `VISION.md` | Business plan, pricing, ROI, GTM |
| `seo-strategy.md` | SEO keyword research, buyer-pull flywheel, content strategy |
| `decisions.md` | Key choices and rationale |

## Domain

`withfin.ch` — subdomain per builder: `{org-slug}.withfin.ch/{floorplan-slug}`
