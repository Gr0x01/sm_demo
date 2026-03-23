# Current Phase: SEO + Sales Outreach

## Context

V1 product is fully shipped. Multi-tenant foundation, admin UI, buyer save, gallery visualization, branding controls — all complete. SM and Demo orgs are live. Homepage, research pages, learn hub, VS comparisons, prospect demo pages — all live. See `completed.md` for the full history.

Now focused on: SEO content expansion, Google Search Console verification, and builder outreach.

## Active Workstreams

### 1. SEO Strategy + Content (Section 21 from prior current.md)

**Completed:** Keyword research, competitive analysis, strategy doc (`seo-strategy.md`), JSON-LD + manifest + OG images, LLM search optimization (`llms.txt`/`llms-full.txt`), anchor page (`/learn/new-construction-upgrades`), upgrade guide visual polish, builder design center pages (Pulte, Arbor, Ryan, Richmond American), visualization lift research page, `/research` and `/learn` index hubs, VS page optimization (`/vs/envision`, `/vs/pdf-option-sheets`), `/vs/eci-insearch` comparison page, `/vs/chameleon-power` comparison page, IndexNow submission script, SiteNav/SiteFooter defaults.

**Remaining:**
- [x] Verify withfin.ch in Google Search Console
- [ ] Toll Brothers design center page
- [x] Add visuals to anchor page — already has 4 photos (kitchen/greatroom, bathroom vanity, kitchen detail, living room wide)

**Key insight:** Builder B2B keywords are tiny volume (<70/mo). Buyer-side content ("new construction upgrades" 170/mo, "[builder] upgrade price list" cluster ~400-500/mo) is the demand engine. Flywheel: buyer finds content → tries demo → asks builder → builder calls us.

### 2. Sales Outreach

**Strategy shift (2026-03-23):** Moved from inquisitive outreach (asking about their process) to provocation-first (leading with SEC data, prebuilt demos, and what we already know). Builders are tech-skeptical and think they know the landscape. Questions let them close the door. Provocation makes them wonder where they fall.

**Active priorities:**
- [ ] Prebuild prospect demo pages (`withfin.ch/for/[prospect]`) for top targets BEFORE reaching out
- [ ] Send trade publication pitches (Pro Builder pitch sent 2026-03-16, others pending)
- [ ] Begin cold email sequences once `heyfin.ch` warming complete (~mid-March target)

**Playbooks (updated 2026-03-23):**
- Cold call script (`cold-call-script.md`) — provocation opener, SEC data leads
- LinkedIn outreach playbook (`linkedin-outreach-playbook.md`) — Loom as primary, prospect demo pages, design center managers as insertion points
- Cowork contractor guide (`cowork-linkedin-research-guide.md`) — aligned with new strategy
- Trade publication pitches (`trade-publication-pitches.md`)
- Research distribution targets (`research-distribution-targets.md`)
- Prospect lists: AL/GA, West Coast, National Tier 1-3

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
