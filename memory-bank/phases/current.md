# Current Phase: Sales Outreach + SEO

## Context

V1 product is fully shipped. SM and Demo orgs are live. Homepage, research pages, learn hub, VS comparisons, prospect demo pages — all live. See `completed.md` for the full history.

Now focused on: builder outreach (provocation-first strategy) and SEO content expansion.

## Active Workstreams

### 1. Sales Outreach (Primary Focus)

**Strategy shift (2026-03-23):** Moved from inquisitive outreach (asking about their process) to provocation-first. Lead with visualization lift data (every builder doing viz sees 20-40% more in option sales), not Toll/Pulte SEC comparisons (dismissable as luxury). Practitioner voice, not tinkerer. Prebuild prospect demo pages before reaching out. LinkedIn connection requests have no links (platform blocks them) — links go in the first DM after they accept.

**Active prospects:**
- [ ] **Doug French** (Stylecraft Homes, CEO) — 1st connection, no reply to Thursday message. Demo page live at `withfin.ch/for/stylecraft`. Send before/after kitchen screenshot + link as follow-up DM.
- [ ] **Steve Snoddy** (Davidson Homes, Director of Sales & Marketing, Arizona) — Demo page live at `withfin.ch/for/davidson` (Hidden Hills kitchen, waterfall island). Uses NoviHome (buyer CRM app) but no visualization. DM drafted, ready to send.
- [ ] Prebuild prospect demo pages for remaining top targets before reaching out

**Playbooks (updated 2026-03-23):**
- Cold call script (`cold-call-script.md`) — provocation opener, visualization lift data leads
- LinkedIn outreach playbook (`linkedin-outreach-playbook.md`) — Loom as primary, prospect demo pages, design center managers as insertion points, no links in connection requests
- Cowork contractor guide (`cowork-linkedin-research-guide.md`) — aligned with new strategy
- Trade publication pitches (`trade-publication-pitches.md`) — Pro Builder pitch sent 2026-03-16, others pending
- Research distribution targets (`research-distribution-targets.md`)
- Prospect lists: AL/GA, West Coast, National Tier 1-3

**Prospect demo page updates (2026-03-23):**
- Hero: "I put this together in about ten minutes" + speed/cost messaging ($500/mo, no 3D, no six-figure setup)
- Removed stat card row (redundant with sidebar)
- Sidebar: visualization lift data (Signature Homes +20% option sales) instead of SEC-only
- Email: `rashaad@withfin.ch` on prospect pages
- Stylecraft photo_baseline updated re: missing fridge
- Before/after compare removed globally (StepPhotoGrid + ImageLightbox) — invites pixel scrutiny, never belonged on production pages
- AVIF photo support: generate-photo.ts now converts non-standard formats (AVIF, etc.) to PNG via sharp before sending to OpenAI
- Davidson Homes prospect demo page built: `withfin.ch/for/davidson` (Hidden Hills kitchen, waterfall island, exterior cover)

### 2. SEO Strategy + Content

**Completed:** Keyword research, competitive analysis, strategy doc (`seo-strategy.md`), JSON-LD + manifest + OG images, LLM search optimization (`llms.txt`/`llms-full.txt`), anchor page (`/learn/new-construction-upgrades`), upgrade guide visual polish, builder design center pages (Pulte, Arbor, Ryan, Richmond American), visualization lift research page, `/research` and `/learn` index hubs, VS page optimization (`/vs/envision`, `/vs/pdf-option-sheets`), `/vs/eci-insearch` comparison page, `/vs/chameleon-power` comparison page, IndexNow submission script, SiteNav/SiteFooter defaults.

**Remaining:**
- [ ] Toll Brothers design center page

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
