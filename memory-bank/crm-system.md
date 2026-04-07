# CRM & Outreach System

## Architecture

Three Notion databases under Finch HQ, relationally linked:

**Companies** → **Contacts** → **Interactions**

Plus two external tools:
- **Instantly** — sends cold emails, tracks deliverability/opens/replies
- **Apollo** — contact lookup + email verification (not a CRM)

Plus automation:
- **Scheduled Claude Code trigger** — daily at 4am JST, tags overdue follow-ups in Notion
- **Claude Code (conversational)** — logs interactions, sets follow-ups, updates contacts when you tell it what you did

## Notion Databases

### Companies
One row per builder. Master prospect list.
- **Key fields**: Builder (title), Location, Volume (tier), Website, Ownership, Design Center, Existing Viz Tool, Status, Notes
- **Status flow**: Not Started → Researching → Draft Ready → Contacted → Connected → Pilot → Converted / Passed
- **Last Contacted** and **Next Follow-Up** are rollups from Interactions

### Contacts
One row per person. Linked to Company via relation.
- **Key fields**: Name (title), Contact Title, Email, Email Verified (checkbox), LinkedIn, Company (relation), Status, Channel (multi-select), Time Zone, **Next Action** (select), **Next Follow-Up** (date)
- **Next Action values**: Send Connect, Send InMail, Send Cold Email, Record Loom, Build Demo Page, Check for Reply, Follow Up DM
- **Status flow**: Not Started → Draft Ready → Email Sent → DM Sent → Replied → Call Scheduled → Meeting Done → Pilot Proposed → Pilot Active → Closed Won / Not Interested / No Response
- **Contact targeting hierarchy**: Digital Sales Manager > VP Sales > Design Center Manager > Marketing > CEO

### Interactions
One row per touchpoint. Activity log / timeline.
- **Key fields**: Summary (title), Date, Channel, Direction (Outbound/Inbound), Contact (relation), Company (relation), Notes
- Create one for every meaningful event: reply received, Loom sent, call made, meeting held
- Don't log email opens or sends — Instantly tracks those

## Key Views
- Contacts > **Follow-Up Queue**: active statuses sorted by Next Follow-Up
- Contacts > **This Week**: follow-ups due this week
- Contacts > **Stale**: untouched 2+ weeks
- Contacts > **Outreach**: Not Started, sorted by Volume
- Companies > **Active Pipeline**: Contacted + Connected + Pilot
- Companies > **Pipeline Board**: kanban by status

## Outreach Follow-Up Automation

### Daily Trigger (4am JST / 7pm UTC)
Scheduled Claude Code remote agent (`trig_01MwNmpGSRgM8eDjyNnxPmUh`). Runs daily:
1. Queries Contacts where Next Follow-Up ≤ today AND Next Action is set
2. Prepends `[DUE TODAY]` to Notes so they surface in Notion views
3. Auto-closes contacts overdue 3+ days with "Check for Reply" → sets Status to "No Response", clears Next Action
4. Cleans up `[DUE TODAY]` tags when follow-up date has been pushed forward (action already taken)
- Manage at: https://claude.ai/code/scheduled/trig_01MwNmpGSRgM8eDjyNnxPmUh

### Conversational Workflow (Claude Code)
When Rashaad says what he did, Claude handles all CRM updates:

| You say | Claude does |
|---------|-------------|
| "I sent connects to Carlos, Mike, and Ian" | Creates 3 Interactions (LinkedIn, Outbound), sets Next Follow-Up = +3 days, Next Action = "Send InMail" |
| "I sent the InMail to Carlos with the Loom" | Creates Interaction, sets Next Follow-Up = +7 days, Next Action = "Check for Reply" |
| "Carlos replied" | Creates Interaction (Inbound), sets Status = "Replied", clears Next Action |
| "What's due today?" | Queries Notion, reports who's due and what action |
| "Build a demo for Chesapeake" | Launches prospect-demo-builder agent |

### InMail Outreach Sequence
1. **Day 0**: Send LinkedIn connect request with honest note ("I build upgrade visualization tools for home builders. Y'all came up in my research — would love to connect.")
2. **Day 3**: Send InMail with custom Loom walkthrough of their demo page + link. "Hey, I made this for you."
3. **Day 10**: If no response, move on. Come back in 60-90 days.

If they accept the connect before Day 3, DM the Loom instead — save the InMail credit.

Rules:
- Don't fake personal interest in the connect note. Be honest about why you're connecting.
- Don't reference the connect in the InMail. Each stands alone.
- Don't hit multiple channels on the same day.

## System Ownership Rules
- **Notion** owns relationship state, pipeline, notes, and interaction history
- **Instantly** owns email sending, deliverability, open/reply tracking
- **Apollo** is lookup only — find the person, get the email, move on
- **Claude Code** owns CRM automation — follow-up dates, next actions, interaction logging
- Don't duplicate tracking across systems

## Campaign Pipeline
1. Apollo API searches each company with title hierarchy (free, no credits)
2. Apollo reveals best contact → verified email (costs credits)
3. Apollo → Instantly native integration (push leads directly, skip CSV)
4. **Upload to Instantly** via native Apollo integration or manual CSV upload
5. Notion Companies + Contacts updated via `scripts/apollo-to-notion.ts` or Apollo → Notion native integration

## Apollo CSV → Notion Sync
Script: `scripts/apollo-to-notion.ts`
- Imports Apollo CSV exports into the Notion Contacts database
- Deduplicates by name (case-insensitive) and email
- Supports both Apollo export columns (`First Name`, `Last Name`, `Email`, `Title`, `Company`, `LinkedIn Url`) and custom CSV columns (`contact_first`, `contact_last`, etc.)
- Tags contacts with campaign via `--campaign` flag (multi-select)
- Sets Status to "Not Started", Channel to "Email"
- Company goes in Notes field (not the Company relation, which requires a linked page ID)
- 350ms delay between creates to avoid Notion rate limits
- Usage: `npx tsx scripts/apollo-to-notion.ts --csv <path> --campaign <tag> [--dry-run]`
- Requires `NOTION_API_KEY` in `.env.local`
- Contacts DB ID: uses env var `NOTION_DB_CONTACTS` from `.env.local`

## Instantly API Limitations — CRITICAL
**Current plan (Growth $30/mo) does NOT support adding leads to campaigns via API.**
- `POST /api/v2/leads` creates orphan leads with no campaign association. Silently ignores `campaign_id`.
- `POST /api/v2/leads/add` (bulk add to campaign) requires **Hypergrowth plan ($77.6/mo)**.
- **DO NOT use the API to add leads.** It creates orphans you have to manually delete.
- **Use CSV upload in Instantly UI instead.** Generate CSV with the pipeline script, upload via Add Leads button.
- If we upgrade to Hypergrowth later, use `/api/v2/leads/add` with `leads` array + `campaign_id`.

## Instantly Campaigns
- **C1** (Builder Outreach - Week 1): 5 leads, template-based, completed
- **C2** (Campaign 2): 6 leads, fully custom per lead, completed
- **C3** (C3 - Permission Ask): 104 leads, launched 2026-04-01
  - Campaign ID: `7126cdf0-b493-4207-b97e-69710820ca07`
  - Format: "Hey {{firstName}}, I put together a short video of your {{floorplan}} kitchen with different finishes. Want me to send it over?" + bump Day 3
  - Sending from: rashaad@heyfin.ch + anton@heyfin.ch
  - Daily limit: 10/mailbox (20 total), weekdays 8am-5pm Central
  - Open tracking: disabled. Text-only: enabled. Stop on reply: enabled.
  - All 104 out in ~5 business days
  - Leads uploaded via CSV (API doesn't support campaign association on Growth plan)
  - 10 companies removed before launch: LGI (bundled), Drees/M|I (Envision), Highland TX (has viz), Jagoe (has viz), Lombardo (Anewgo), Christopher Alan (no selections), David Weekley (enterprise), CBH (packages only), Epcon (franchise)

## API Keys
- `APOLLO_API_KEY` in `.env.local` — $59/mo plan, 2,500 credits/mo
- `INSTANTLY_API_KEY` in `.env.local` — Growth plan, API limited (no lead-to-campaign association)
- `NOTION_API_KEY` in `.env.local`

## Reply Handling Workflow
1. Check Instantly for replies
2. Create Interaction in Notion (Inbound, Email)
3. Update Contact status → "Replied"
4. Update Company status → "Contacted"
5. Build /for/ demo page (prospect-demo-builder agent)
6. Record Loom, send via email reply
7. Create Interaction: "Loom sent" (Outbound, Email)
8. Set Next Follow-Up for 2-3 days
