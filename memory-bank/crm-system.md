# CRM & Outreach System

## Architecture

Three Notion databases under Finch HQ, relationally linked:

**Companies** → **Contacts** → **Interactions**

Plus two external tools:
- **Instantly** — sends cold emails, tracks deliverability/opens/replies
- **Apollo** — contact lookup + email verification (not a CRM)

## Notion Databases

### Companies
One row per builder. Master prospect list.
- **Key fields**: Builder (title), Location, Volume (tier), Website, Ownership, Design Center, Existing Viz Tool, Status, Notes
- **Status flow**: Not Started → Researching → Draft Ready → Contacted → Connected → Pilot → Converted / Passed
- **Last Contacted** and **Next Follow-Up** are rollups from Interactions

### Contacts
One row per person. Linked to Company via relation.
- **Key fields**: Name (title), Contact Title, Email, Email Verified (checkbox), LinkedIn, Company (relation), Status, Channel (multi-select), Time Zone
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

## System Ownership Rules
- **Notion** owns relationship state, pipeline, notes, and interaction history
- **Instantly** owns email sending, deliverability, open/reply tracking
- **Apollo** is lookup only — find the person, get the email, move on
- Don't duplicate tracking across systems

## Campaign Pipeline
Script: `scripts/campaign3-pipeline.sh`
1. Apollo API searches each company with title hierarchy (free, no credits)
2. Apollo reveals best contact → verified email (costs credits)
3. Outputs to `/tmp/c3-success.txt` (pipe-delimited: company|name|title|email|linkedin|floorplan|subject)
4. Generate CSV: `memory-bank/outreach/campaigns/c3-instantly-upload.csv`
5. **Upload CSV manually in Instantly UI** (Add Leads button)
6. Notion Companies + Contacts updated via API separately

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
  - 10 companies removed before launch: LGI (bundled), Drees/M\|I (Envision), Highland TX (has viz), Jagoe (has viz), Lombardo (Anewgo), Christopher Alan (no selections), David Weekley (enterprise), CBH (packages only), Epcon (franchise)

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
