# Cold Email Campaign Architecture

## Goal

Book meetings. Every email, LinkedIn touch, and demo page exists to get a builder on a 15-minute call where Rashaad shows them the pictures. Nothing else matters until that meeting happens.

## Campaign Status

### Batch 1: "Builder Outreach - Week 1" (activated 2026-03-24)
- **Sending from**: `rashaad@heyfin.ch` only (anton@heyfin.ch held back — only 5 days of warmup, not enough history)
- **Daily limit**: 5 emails/day
- **Schedule**: Weekdays 8am-5pm Central, 9-14 min random gap between sends
- **Sequence**: 2 emails, Email 2 fires Day 4 as reply in same thread
- **Open tracking**: OFF
- **Format**: Plain text only (text-only delivery optimization enabled)
- **Sending account signature**: "Rashaad\nFounder, Finch" — no URL (withfin.ch auto-links in plain text, hurts deliverability on warming domain)

**Batch 1 (5 leads, ready to send 2026-03-25):**

| Lead | Company | Email | Subject | Status |
|---|---|---|---|---|
| Richie Eubanks | Hughston Homes | reubanks@hughstonhomesmarketing.com | feedback on hughston's selections process | Draft Ready |
| Christopher Harris | Rockhaven Homes | charris@rockhavenga.com | feedback on rockhaven's design center | Draft Ready |
| Mary Mead | McKinley Homes | mmead@mckinleyhomes.com | suggestion for mckinley's selections process | Draft Ready |
| Mike Ruland | Traton Homes | mruland@tratonhomes.com | feedback on traton's design center | Draft Ready |
| Suzanne Mathison Smith | Lowder New Homes | smathison@lowdernewhomes.com | feedback on lowder's design center | Draft Ready |

**CSV**: archived to `_archive/outreach-c1c2c3/week1-batch1.csv`
**Personalized lines**: archived to `_archive/outreach-c1c2c3/approved-personalized-lines.md`

**Remaining leads (personalized lines pending):**
- Shelby Jagor — Piedmont Residential
- Tr Adams — Rocklyn Homes
- Daniel Holland — Holland Homes
- Doug French — Stylecraft Homes
- Steve Snoddy — Davidson Homes
- 31 Batch 2 leads (researched, not yet personalized)

**Notes:**
- Suzanne Mathison Smith (VP Sales) replaced Suzanna Edwards (VP Marketing) as primary Lowder contact
- All 5 batch 1 emails verified (not catch-all). "Email Verified" checkbox added to Notion Contacts database.
- Doug & Steve already connected on LinkedIn with demo pages sent
- Alexander Scott excluded (no valid email found). Centennial excluded (not a good fit, low volume).

## System of Record

**Instantly** owns all email: sending, deliverability, open/reply tracking, bounce handling, sequence management. Don't duplicate email state anywhere else.

**Notion** ("Contacts" database under Finch HQ) owns the unified pipeline across all channels. Single view of where every prospect stands regardless of how you reached them.

**Sync rule**: Update Notion when something meaningful happens in Instantly (reply, bounce, meeting booked). Don't mirror opens or clicks.

## The Hook

**Founder-led sales, not SaaS campaign.**

Rashaad's personal story IS the hook: he bought a home, got handed a PDF and a 4-hour design center appointment, thought there should be a better experience, hacked together a visualizer, and spent 40% more on upgrades because he could see what he was picking. Now it's a product.

The personalized line does the relevancy + "what?" moment. The template body tells the founder story. Together they hit the framework: relevancy → counterintuitive → no scrolling → leave them wanting more.

Builders already know visualization helps. They think it's expensive, slow, and tech-heavy. The founder story flips all three without ever saying so directly.

## The 2-Email Sequence

### Email 1 (Day 1)
- Plain text. No links. No images. No tracking pixels.
- Subject: per-lead custom via `{{subject}}` merge tag (e.g., "feedback on Hughston's selections process")
- Structure: personalized opener → template body (hook + objection flip + offer) → soft CTA ("Worth a look?")
- Template body (founder story):

```
I was buying a home and got handed a PDF and had a 4 hour design center appointment to pick my upgrades. I thought there should be a better experience so I hacked together a visualizer and ended up spending 40% more than planned because I could see what I was picking. Now I've turned it into a product.

$500/mo per plan, no 3D renders, set up in less than a week. Worth a look?

Rashaad
Founder, Finch
```

### Email 2 (Day 4-5)
- Reply in same thread (no subject — shows as "Re: [Email 1 subject]")
- Plain text. No links.
- Different angle from Email 1 (buyer experience, market-specific, or reference to LinkedIn if already connected)
- Permission ask CTA: "Want me to send over a quick walkthrough I put together for {{company_name}}?"

### No Email 3
If no reply after 2 emails, the prospect lives or dies on LinkedIn and cold call. Don't keep emailing.

## Subject Line Strategy

Subject lines that sound like internal notes, not campaigns:
- "feedback on [Company]'s Design Center" (for builders with a Design Center)
- "suggestion for [Company]'s selections process" (for builders without a formal Design Center)
- Mixed "feedback on" and "suggestion for" so they're not identical if anyone compares notes

### Design Center Names (researched 2026-03-24)
| Builder | What they call it |
|---|---|
| Hughston Homes | No design center — "design appointment" |
| Rockhaven Homes | Design Center |
| McKinley Homes | No design center found |
| Traton Homes | Design Center (physical, Marietta GA) |
| Lowder New Homes | Design Center |
| Piedmont Residential | Design Catalog (online) |
| Rocklyn Homes | Design Center |
| Holland Homes | Design Guides (online) |
| Stylecraft Homes | Design Center |
| Davidson Homes | Design Center |

## Copy Rules

- Never say "AI," "tool," "platform," "software," or "solution"
- No em dashes as punctuation
- No staccato dramatic fragments
- Physical language: rooms, selections, pictures, revenue
- Practitioner voice — Rashaad built this, it works, he knows the numbers
- "Most folks I talk to" not "Most builders I talk to"
- If you can swap company names and it still works, rewrite it
- Binary CTAs over complex asks
- No hedging or permission-seeking
- Don't lecture builders about their business
- Signature: "Rashaad\nFounder, Finch" — no URL

## Claim Accuracy

- "I can get a working demo running for one of your floor plans in under a week" — TRUE. Kitchen demo in ~10 min, full floor plan setup (gathering upgrades, photos, etc.) takes a few days.
- Do NOT say "I can set up your full floor plan in 10 minutes" — that's only true for a single kitchen demo with existing upgrade selections
- "After that, adding more is fast" — TRUE. Once the org/options are set up, additional floor plans are quick.
- "$500/mo per plan" — TRUE. Current pricing.

## List Building: Apollo → Instantly

Apollo is the contact database. Export CSV with verified emails, import into Instantly. Apollo verification is the first gate, Instantly's built-in verification is the second.

**Email verification workflow:**
1. Check Notion "Email Verified" checkbox first — if checked, skip verification
2. Verify via Apollo or Instantly
3. Add email to Notion contact + check "Email Verified"
4. This prevents wasting verification credits on re-lookups

### ICP

The qualifier is **upgrade revenue per year**, not homes per year.

| Builder type | Homes/yr | Avg upgrades | Upgrade rev/yr | Fit |
|---|---|---|---|---|
| Scrappy starter | <20 | $8-10K | <$200K | Not ICP. No budget, no systems. |
| Boutique/semi-custom | 20+ | $30-60K | $600K-1.2M | Strong. Design-driven buyers, willing to invest. |
| **Regional production** | **50-200** | **$8-12K** | **$400K-2.4M** | **Sweet spot.** Has a selection process. Real upgrade revenue to protect. |
| Large production | 200-500 | $10-15K | $2-7.5M | Strong. Clear ROI. Higher price points. |
| National (500+) | 500+ | varies | $5M+ | Not ICP. Enterprise solutions (Zonda, Hyphen). |

### Apollo Search Criteria

- **Industry**: Residential construction, home building, real estate development
- **Company size**: 11-500 employees (proxy for 20-500 homes/yr)
- **Titles**: VP Sales, VP Marketing, VP Sales & Marketing, Director Sales, Director Marketing, Design Center Director, Design Studio Director, President, CEO (at smaller companies only)
- **Location**: Start with AL/GA (existing research), then TX, AZ, FL
- **Exclude**: Builders already on Envision/Roomored, builders acquired by nationals (D.R. Horton, Clayton/Berkshire)
- **Skip**: Purchasing, Operations, Construction, CFO, community sales reps, online sales consultants, marketing content strategists

## Multi-Channel Sequencing

Email and LinkedIn are interleaved, not separate tracks.

### Standard sequence (everyone)

| Day | Channel | Action |
|-----|---------|--------|
| 0 | LinkedIn | Profile view (passive awareness) |
| 1 | Email | Email 1: provocation, no links, plain text |
| 3 | LinkedIn | Connection request (no links) |
| 4-5 | Email | Email 2: new angle, no links, permission ask |

Total span: ~5 days of outreach. Then wait for signals.

### After engagement (they reply, accept, or click)

| Signal | Next move |
|--------|-----------|
| Reply to email (including "yes send it") | Send demo page link or research link in reply. Build demo page now if worth it — they asked for it. |
| Accept LinkedIn connection | DM within 24 hours with research link, Loom, or demo page link. |
| Open emails but no reply | LinkedIn DM after acceptance is your next shot. Don't send a 3rd email. |

## Sending Rules

- **Ramp**: 5/day week 1, ramp to 10-20 over 2 weeks
- **Max**: 30 cold emails/day per mailbox
- **Warmup**: Keep running (10 warmup/day alongside real sends)
- **Spacing**: 9 min minimum + 5 min random additional between sends
- **Format**: Plain text only. No HTML, no images, no attachments, no tracking pixels, no links before a reply.
- **Verification**: Every email address verified before adding to sequence. One bounce at low volume = catastrophic bounce rate.
- **DNS**: SPF + DKIM verified on heyfin.ch (both passing as of 2026-03-24). SPF record added to Vercel DNS.

## Infrastructure

| Component | Detail |
|---|---|
| **Cold domain** | `heyfin.ch` (separate from `withfin.ch` to protect primary domain) |
| **Sending mailbox 1** | `rashaad@heyfin.ch` (warming since 2026-03-11, score 100, ACTIVE for sending) |
| **Sending mailbox 2** | `anton@heyfin.ch` (warming since 2026-03-19, score 100, HELD — not enough warmup history yet) |
| **Email provider** | Google Workspace on `heyfin.ch` |
| **Sending platform** | Instantly.ai (connected via Google OAuth, API key in `.env.local`) |
| **Domain redirect** | `heyfin.ch` → `withfin.ch` (307, Vercel) |
| **DNS** | Vercel DNS (ns1/ns2.vercel-dns.com). SPF TXT record: `v=spf1 include:_spf.google.com ~all` |
| **Contact database** | Apollo (paid plan) |
| **Apollo → Instantly** | Native integration (API key linked in Instantly settings, `contacts/search` + `people/match` endpoints) |
| **Apollo → Notion** | Script: `npx tsx scripts/apollo-to-notion.ts --csv <path> --campaign <tag>`. Requires `NOTION_API_KEY` in `.env.local` (Notion internal integration "Apollo Sync"). |
| **Notion integration** | "Apollo Sync" internal integration connected to Contacts database (read/insert/update). Created at notion.so/my-integrations. |

## Instantly API Learnings (2026-03-24)

The Instantly v2 API is partially useful:
- **Works**: Creating campaigns, listing/deleting leads, listing accounts, checking warmup scores, PATCH campaign settings
- **Broken for campaign setup**: Leads created via API don't appear in campaign UI (go to workspace "All Leads" instead). Subsequences API creates separate objects, not the main sequence editor. CSV upload through the UI is the reliable path for adding leads to campaigns.
- **Useful for**: Reading analytics, monitoring campaign status, deleting orphaned leads, bulk operations

## Notion Pipeline

**Database**: "Contacts" under Finch HQ (database ID: d3d269c3b4b6450a8d871f1c406a5ca7)
**Data source**: collection://f0ddea2f-03f1-41e7-8c8e-c44e5645ce13
**Companies data source**: collection://95fee99f-d65d-48c3-9985-5d7a9df864bc

### Key properties (added 2026-03-31)
- **Campaign** (multi-select): C1, C2, C3, LinkedIn — tracks which batch a contact is part of
- **Channel** (multi-select): Email, LinkedIn, Phone, In Person, HBA Event — tracks how you reached them
- **Status** (select): Not Started → Researching → Draft Ready → Email Sent / DM Sent → Replied → Call Scheduled → Meeting Done → Pilot Proposed → Pilot Active → Closed Won / Not Interested / No Response / Not a good fit

### Views (added 2026-03-31)
- **Needs Email**: Contacts with no email, excluding "Not a good fit"
- **Active Pipeline**: Board grouped by Status, excluding dead-end statuses and duplicates
- **This Week**: Filters on `Next Follow-Up ≤ [date]` (hardcoded — update the date filter weekly)

### Sync rules
| Instantly event | Notion update |
|---|---|
| Email reply received | Status → "Replied" |
| Email bounced | Note in Notion, remove from outreach |
| Meeting booked | Status → "Call Scheduled" |
| Sequence complete, no reply | Leave as "Email Sent" — LinkedIn continues independently |

## Pipeline Workflow (2026-03-31)

**Notion is the ONLY CRM. Apollo finds contacts. Instantly sends email.**

### Adding new contacts
1. Search in Apollo → export CSV
2. Run `npx tsx scripts/apollo-to-notion.ts --csv <path> --campaign <tag> --dry-run` (preview)
3. Run without `--dry-run` to create Notion rows (auto-deduplicates by name + email)
4. Upload same CSV to Instantly campaign for email sending
5. Tag Campaign property in Notion if the script didn't (it should)

### Rules
- **NEVER create a separate Notion database for a new campaign.** Add a Campaign tag value.
- **NEVER create a contact without dedup.** The script handles this. If creating manually, search first.
- **Campaign ≠ Channel.** Campaign = which batch (C1, C2, C3). Channel = how you reached them (Email, LinkedIn).
- **Status tracks the highest-signal state across all channels.** Reply > DM Sent > Email Sent.
