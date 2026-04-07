# Current Phase: Sales Outreach + Generation Quality

## Context

V1 product is fully shipped. SM and Demo orgs are live. Homepage, research pages, learn hub, VS comparisons, prospect demo pages — all live. Flux 2 pipeline shipped and refactored. See `completed.md` for the full history.

Now focused on: builder outreach (provocation-first strategy), generation quality fixes, and SEO content expansion.

## Active Workstreams

### 1. Sales Outreach (Primary Focus)

**Strategy shift (2026-03-23):** Moved from inquisitive outreach (asking about their process) to provocation-first. Lead with visualization lift data (every builder doing viz sees 20-40% more in option sales), not Toll/Pulte SEC comparisons (dismissable as luxury). Practitioner voice, not tinkerer. Demo pages are a follow-up asset built after engagement, not pre-outreach. LinkedIn connection requests have no links (platform blocks them) — links go in the first DM after they accept.

**Campaign 3 — LIVE (uploaded 2026-04-03):**
- **CSV**: `outreach/campaigns/c3-full.csv` — **93 leads, 51 companies**. All kitchen photos Playwright-verified.
- **Approach**: Permission-ask. "I put together a short video of your {{floorplan}} kitchen with different finishes. Want me to send it over?"
- **Sending from**: rashaad@heyfin.ch + anton@heyfin.ch (both warmed since mid-March)
- **Daily limit**: 10/mailbox (20 total), weekdays 8am-5pm Central
- **Settings**: Plain text, no tracking, no links, stop on reply
- **Cut builders**: See `completed.md` #31/#32 for C1/C2 results. C3 cuts documented in git history.

**Outreach automation (2026-04-01):**
- **Apollo → Instantly**: Native integration (push leads directly, skip CSV)
- **Instantly → Notion auto-sync**: Vercel Cron polls every 15 min (`/api/cron/instantly-sync`). On reply: Notion Status → "Replied" + Interaction row. On bounce: Status → "Bounced" + Interaction row. Cursor-based (Supabase `sync_cursors` table).

**LinkedIn content (started 2026-04-02):**
- Week 1 (Apr 2): POSTED — "39% wish they spent more" stat + Dennis Webb/Fulton Homes quote. Tagged @Greg Bray.
- Week 2 (Apr 7-9): PLANNED — Houzz buyer quotes ("I am becoming depressed and all the excitement is gone").
- Full content calendar: `outreach/linkedin-post-ideas-april-2026.md`

**LinkedIn engagement automation (built 2026-04-03):**
- **Script**: `scripts/linkedin-post-finder.ts` — ScrapingDog → LinkedIn Post API. 15 keyword searches. Noise filtering, dedup, seen-posts tracking.
- **Cowork task**: "linkedin-digest" — hourly. Drafts comments (subscription Claude), posts to Slack webhook.
- **Cost**: ~125 ScrapingDog credits/run (~3K/day, under 1M/mo plan). Drafting free (Cowork).
- **Cowork prompt**: `outreach/cowork-linkedin-digest.md`

**Active LinkedIn prospects:**
- [ ] **Doug French** (Stylecraft, CEO) — 1st connection, no reply. Demo at `withfin.ch/for/stylecraft`.
- [ ] **Steve Snoddy** (Davidson, Dir Sales AZ) — Demo at `withfin.ch/for/davidson`. DM drafted.
- [ ] **Janna Pettegrew** (ICI, Design Center Mgr) — 1st connection accepted. Demo at `withfin.ch/for/ici`. No reply to initial DM.
- [ ] **Mary Mead** (McKinley, VP Sales) — Engaged: visited demo page desktop + mobile, hit Visualize. Sent LinkedIn DM with generated image. Demo at `withfin.ch/for/mckinley`.
- [ ] **Matt Sims** (Viera, Area Sales Mgr) — 1st connection accepted. Demo at `withfin.ch/for/viera`. DM drafted, not sent.
- [ ] **Dee Crescini** (WestBay, VP Design) — InMail sent with Key Largo II kitchen image. Demo at `withfin.ch/for/westbay`.
- [ ] **Myers Barnes** (HomebuilderAI, Sales Strategist) — NOT a builder. Legendary sales trainer. Reached out first after Rashaad commented on his posts. Email sent 2026-04-03 (peer conversation, no pitch). Strategic value: distribution/amplification. Promotes Anewgo — don't challenge yet.

**Playbooks:**
- Cold call script (`outreach/cold-call-script.md`)
- LinkedIn outreach playbook (`outreach/linkedin-outreach-playbook.md`)
- Prospect demo ops (`outreach/prospect-demos.md`)
- InMail targets (`outreach/inmail-targets.md`)
- Cowork contractor guide (`outreach/cowork-research-guide.md`)

### 2. Flux 2 Generation Quality (Open Issues)

Pipeline shipped and refactored (see `completed.md` #35). These quality issues remain:

- [ ] **Countertop scoped edit bleeds onto island face** — tried 3 hint iterations. Current hint avoids "island" but still bleeds on some combos. May need adjacency preservation clause in `buildScopedEditPrompt` or Klein 9B for countertop edits.
- [ ] **Inconsistent cabinet rendering between full gen runs** — same fog paint swatch produces visibly different results across runs. Likely Flux Max non-determinism, not a code bug.
- [ ] **Re-seed `/try` demo cache** — run `npx tsx scripts/seed-demo-cache.ts` after deploy
- [ ] Test non-kitchen SM rooms (bedrooms, bathrooms)

### 3. Prospect Demo Pages (Ongoing)

13 demos built (see `completed.md` #34). Infrastructure is mature — `scripts/seed-prospect-demo.ts` + JSON configs in `scripts/prospect-configs/`.

**Latest (2026-04-07):**
- **Alexander Scott Homes** demo: `withfin.ch/for/alexander-scott` (Langston kitchen, Swann's Bridge, Auburn AL). Target: Cole Jolly (President, LinkedIn connected). Founded 2023 by Warren Jolly (ex-Providence Group). 3 communities, 1,500 lots pipeline, zero viz tools.
- **Prompt fix — "natural sunlight"**: Full gen changed from "natural lighting" to "natural sunlight". Scoped edits append "Preserve natural sunlight."
- **Key lesson — simple hints work better**: Every attempt at descriptive language made generation worse. Proven /try patterns (5-15 words) consistently outperform longer hints.
- **Key lesson — don't adapt subagent output**: Use bfl-prompt-engineer output verbatim.
