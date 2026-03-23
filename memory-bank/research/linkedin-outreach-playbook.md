# LinkedIn Outreach Playbook

## Golden Rule

Walk through the door with a gift. The connection request should give them something to react to: a data point from SEC filings, a link to research you wrote, or a picture of their kitchen with upgraded finishes. Don't ask for their time empty-handed. Give them something first and let them come to you.

## What Works
- Leading with something specific you found, built, or know about their business
- Ending with a statement they can react to, not a question they can dodge
- Sending a Loom or prospect demo link early, not as a last resort
- Physical language: pictures, rooms, selections, revenue. Not tech language.
- Treating design center managers as your way in, not a dead end

## What Doesn't Work
- Leading with "I built a tool" or any product description
- Copy-pasting the same core sentence with name/company swaps
- "Would love to get your take" as a verbal tic on every message
- Hedging with "if you're open" or "no worries if not" on the first touch
- Using the words "AI," "tool," "platform," "software," or "solution"
- Em dashes as punctuation
- Staccato dramatic fragments for false emotional weight
- Inventing shared connections or details (don't say you're local, went to their school, etc. unless it's true)

## The Template Trap
If you can swap company names and the message still works with zero other changes, it's a template. Builders have been pitched their whole careers and they can feel the difference. Five well-researched messages that start real conversations beat twenty templates that get polite ignores.

## Copy Rules
These apply to every message, follow-up, and Loom script.
- Never say "AI." The tech is invisible. Show results, not methods.
- Never say "tool," "platform," "software," or "solution." Use physical language: "I show buyers what their selections look like in the room." Not "I built a visualization platform."
- No em dashes as punctuation. Use commas, periods, or just start a new sentence.
- No staccato fragments. Join thoughts naturally. Write like a person talking, not a copywriter building tension.
- No hedging or permission-seeking on the first touch. "Here's what I found" not "Would you be open to seeing what I found, if you have a moment, no pressure."

## Before You Reach Out: Build the Prospect Demo Page

The highest-leverage thing you can do before contacting a builder is build their prospect demo page at `withfin.ch/for/[prospect]`. This is a live, interactive page using a photo from one of their communities with real upgrade selections. It takes 10-15 minutes and completely changes the outreach.

### Why this matters
A link to their own kitchen with working upgrade selections is worth more than any message you could write. It proves you did the work, it shows the product without asking for a meeting, and it keeps working after you send it.

### How to build one
1. Find a kitchen photo from their community (website model home gallery, Zillow/Realtor.com listings, Instagram, Google Images "[Builder] [Community] interior")
2. Create a floorplan in the Demo org with `is_prospect_demo = true`
3. Set up the step with 3-4 visually obvious subcategories (countertops, cabinets, flooring, backsplash)
4. Assign options from the Demo org's existing ~120 swatches
5. Upload the kitchen photo as the step photo
6. Add `prospect_insights` if you have data on their upgrade mix
7. Set `calendly_url` and optionally `loom_url`
8. Test the page, generate a visualization, confirm it looks good

### Setup gotchas (all three have burned us)
- `step_photos.subcategory_ids` must be **slugs**, not UUIDs
- `step.sections` JSONB uses `subcategory_ids` (snake_case), query layer maps to camelCase
- `photo_baseline` is a **text description**, not a JSON object

### When to build one
- Before any LinkedIn outreach to a high-value prospect
- Before any cold call where you plan to follow up with a link
- Before any conference where you know which builders will be there

### When to skip
- Very small builders where the time doesn't justify the deal size
- Can't find a usable kitchen photo (don't use stock photos, that defeats the purpose)

## Important: LinkedIn Doesn't Allow Links in Connection Requests

LinkedIn strips or blocks URLs in connection request notes. All links (prospect demo pages, research pages, Loom videos) go in the **first DM after they accept**, not the connection request itself. This actually works in your favor because the connection request stays clean and the follow-up DM delivers real value.

## Four Angles for Connection Requests (No Links)

### 1. The Provocation (lead with visualization lift data)
Drop the pattern that every builder doing visualization sees a revenue bump and let them react. Best for VPs and division presidents who think about revenue per home.
> "Hi [Name], every builder I've found doing upgrade visualization reports 20-40% more in option sales. ECI, Roomored, different companies, same result. Curious if [Company] has looked at this."

### 2. The Observation (notice something specific, end with a statement)
Reference something real about their company. Make a statement they can agree or push back on.
> "Hi [Name], I was looking at [Company]'s [Community] photos and your standard finishes are strong. The gap between base and upgrade is subtle enough that buyers probably can't picture the difference from a price sheet. That's where most builders lose upgrade revenue."

### 3. The Practitioner (you work with builders on this)
You work with builders on upgrade visualization, stated directly without hedging. Best for CEOs and presidents at mid-size builders.
> "Hi [Name], I work with builders on upgrade visualization. Buyers pick from a sheet, can't picture how it comes together, and default to base. Your homes in [location] caught my eye."

### 4. The Proof Point (use when you have traction)
Reference real results from real builders. Don't use this until you have actual data to cite.
> "Hi [Name], I set this up for a builder in Alabama and their buyers started spending more on upgrades once they could see selections in the room. I think [Company] would see something similar given your option mix."

## After They Accept: The Gift (Links Go Here)

This is where the prospect demo page, research link, or Loom goes. Send within 24 hours of acceptance, don't wait for them to message you first.

**If you have a prospect demo page ready:**
> "Hey [Name], I grabbed a photo from your [Community] model and set up a page where you can pick different countertops, cabinets, and flooring and see them in the kitchen: withfin.ch/for/[prospect]"

**If you have a Loom ready:**
> "Hey [Name], I grabbed a photo from your [Community] model and ran it through what I've been working on with builders. Easier to show than explain: [Loom link]"

**If you have neither (send the research):**
> "Hey [Name], I put together all the data I could find on what happens when builders add upgrade visualization. Every company in the space reports 20-40% more in option sales: withfin.ch/research/visualization-lift"

## The Loom Play (Primary Outreach Mechanism)

The Loom is the primary way you show what Finch does, not a follow-up reserved for high-value prospects. A 60-second video using their actual community photos gets attention that a text message from a stranger never will.

### When to send the Loom
- **Best case**: Connection request with provocation or gift, then Loom within 24 hours of acceptance. Don't wait for a reply.
- **Second best**: Include the Loom link in the connection request itself (if under 300 chars with the link).
- **Backup**: Text-based follow-up only when you can't find a usable kitchen photo for Loom or prospect demo page.

### The process (10-15 min per prospect)

1. **Grab a room photo** from their community:
   - Their website (model home gallery, virtual tour screenshots)
   - Zillow/Realtor.com listings for their communities
   - Their Instagram or Facebook (model home walkthroughs)
   - Google Images "[Builder] [Community Name] interior"

2. **Run it through Finch.** Use the Demo org or the prospect demo page if you already built one. Pick 3-4 upgrades that are visually obvious: countertops, cabinets, flooring, backsplash. Generate the before and after.

3. **Record a 60-90 second Loom.** Structure:
   - "Hey [Name], I grabbed this photo from your [Community/Model] and wanted to show you something."
   - Show the base room photo. "This is what your buyers see today."
   - Click through 2-3 upgrade selections. Show the generated result. "And this is what it looks like when they pick [quartz counters / shaker cabinets / herringbone tile]."
   - "Imagine your buyers seeing this before they commit. That's what I've been working on with builders. Thought you'd want to see it with your actual homes."

4. **Send the Loom link** as the follow-up message on LinkedIn. Keep the text short. The video does the work.

### The message

> "Hey [Name], I grabbed a photo from your [Community] model and ran it through what I've been working on with builders. Easier to show than explain: [Loom link]"

Keep the text short because the video does all the work.

### Why this works
- Can't be templated because it uses THEIR photos, so they know you put in the work
- Shows the product without asking them to take a meeting first
- Video gets 3-5x the engagement of text on LinkedIn
- They see the before (price sheet world) and the after (their room with real selections) in 60 seconds
- Even if they don't reply, they watched it, and you're no longer a stranger next time

### Loom tips
- Don't over-produce it. Screen share with your face in the corner is fine. Casual over polished.
- Keep it under 90 seconds. They'll watch 60 seconds from a stranger. They won't watch 3 minutes.
- Say their name and their community name. That's the pattern interrupt that signals "this is for me, not a blast."
- End with a statement, not a hard ask. "Thought you'd want to see it" not "Let's book a call."
- Use physical language in the narration. "See their selections in the room" not "leverage our visualization platform."

## Pre-Message Checklist (90 seconds)
Before writing each message, find ONE specific thing:
- [ ] A community name from their website
- [ ] A design center photo from their Instagram
- [ ] A floor plan name
- [ ] A quote from a press release
- [ ] A recent LinkedIn post or award
- [ ] Their Zillow listing showing standard vs. upgrade finishes
- [ ] A kitchen photo you can use for a Loom or prospect demo page

That one detail is the difference between "this person looked at my company" and "this is a LinkedIn pitch."

## Who to Target (priority order)
1. **VP/Director of Sales & Marketing** -- owns the upgrade revenue number, can champion and buy
2. **VP of Design / Design Studio Director** -- owns the selection experience at a senior level
3. **Design Center/Studio Manager** -- feels the pain daily, uses the current process, champions internally, gives warm intros to decision-makers. Not the buyer, but your best insertion point.
4. **President/CEO** -- decision-maker, but only if the company is small enough that they're hands-on
5. **Region/Division President** -- owns P&L for their market, cares about revenue per home

## Who to Skip
- Purchasing Managers (supply side, not buyer side)
- VP of Operations / Construction (build side, not sales side)
- CFO/Controller (finance brain, not experience brain)
- Community Sales Managers / New Home Sales Counselors (too junior, no authority to buy)
- Online Sales Consultants / Coordinators (feel the gap but can't act on it)
- Marketing Content Strategists / Brand Storytellers (describe the problem accurately but don't own the number)
- Anyone with < 50 LinkedIn connections or zero activity

## Deprioritize
- Builders already on Envision Options or Roomored. They feel "solved" even though they're not. Come back with case studies.
- Builders acquired by nationals (D.R. Horton, Clayton/Berkshire). Corporate procurement is slow.

## The Research to Message Process (Step by Step)

Takes 5-10 minutes per builder. The research IS the message. You're not writing copy, you're finding the one thing that makes it real.

### Step 1: Check for a Usable Kitchen Photo (2 min)
Before picking a person, check if you can find a kitchen photo from one of their communities. If you can, the whole outreach changes: you build a prospect demo page or record a Loom, and the connection request becomes a delivery mechanism for something they can actually see.

Sources:
- Their website model home gallery
- Zillow/Realtor.com listings for their communities
- Instagram or Facebook model home walkthroughs
- Google Images "[Builder] [Community Name] kitchen"

If you find a photo, build the prospect demo page at `withfin.ch/for/[prospect]` before you reach out. If you can't find one, proceed with text-based angles (Provocation, Observation, or Gift with research link).

### Step 2: Pick the Right Person (2 min)
Go to the builder's LinkedIn company page, People tab. Look for:
- VP of Sales & Marketing (ideal, owns the number AND the experience)
- Design Center/Studio Manager (feels the daily pain, champions internally)
- President/CEO (only if small builder where they're hands-on)

**Red flags to skip someone:**
- Their primary role is at a different company (contractor/agency, not full-time)
- Zero posts and < 100 connections (not active on LinkedIn)
- Title is operations, construction, purchasing, or finance
- Too junior to champion anything internally

If there's a new VP (< 1 year in role), prioritize them. New leaders want quick wins.

### Step 3: Research the Builder (3-5 min)
Check these sources for ONE specific detail:
1. **Their LinkedIn activity** -- recent posts, shared articles, awards, hiring
2. **Their website** -- community names, design center photos, buyer journey page, included features
3. **Google "[Builder Name] design center"** or "[Builder Name] design studio" -- see what comes up
4. **The contact's personal LinkedIn** -- career history, past roles, anything that reveals what they care about
5. **Awards/press** -- OBIE, Nationals, HBA, ProBuilder rankings

You're looking for ONE of these:
- A specific community name and what makes it notable
- A design center/studio detail (or the absence of one)
- A recent post they made about a specific topic
- Something from their career history that connects to design/visualization
- A campaign, award, or initiative they're proud of

### Step 4: Write the Message (2 min)
Pick the angle that fits what you found:
- **Found a kitchen photo and built a prospect demo page?** Use The Gift.
- **Found SEC-level revenue data or they're a VP?** Use The Provocation.
- **Found something specific about their communities?** Use The Observation.
- **No warm detail but you have the research link?** Use The Gift with research link.
- **Have results from another builder?** Use The Proof Point.

**Test it:** Read the message back. If you could send it to a different builder by changing the company name, it's a template. Rewrite it.

**300-character limit on LinkedIn connection notes.** Write tight. Every word earns its spot.

### Step 5: After They Accept (the follow-up sequence)

The connection request earned you the door. Now you deliver the goods. The Loom or prospect demo link comes first, not third.

#### Path A: They accepted and you have a Loom or prospect demo page ready
Send it within 24 hours. Don't wait for them to reply to the connection request. The Loom or demo link IS the follow-up.

> "Hey [Name], I grabbed a photo from your [Community] model and ran it through what I've been working on with builders. Easier to show than explain: [Loom link or withfin.ch/for/prospect link]"

If they watch the Loom or visit the page (you'll see this in analytics), follow up in 2-3 days:

> "Hey [Name], curious what you thought. The thing builders keep telling me is that once buyers see selections in the room, they stop defaulting to base. Happy to show you what this looks like with your actual options."

#### Path B: They accepted AND replied to your connection request
Have the conversation. Stay in their world. When they describe their process (sample boards, binders, PDFs, in-person-only selections), connect what they said to what you do. Use physical language.

> "That's actually what I keep hearing. Buyers pick from samples or a sheet, can't picture how it all comes together in the room, and default to base. I've been showing builders what happens when buyers see their selections in the actual room photos before they commit. Started with a builder in Alabama and it changes how much buyers spend."

Then the interest check:

> "Does that match what you're seeing, or is your process working well enough that it's not a problem?"

If they say yes or express curiosity:

> "I can show you what it looks like. Takes about 15 minutes and I can pull up real options. Would that be worth it?"

#### Path C: They accepted but didn't reply, and you don't have a Loom ready
Send the research link. This is a DM so links work.

> "Hey [Name], one thing I've been looking at. Every builder that's added upgrade visualization reports the same result, somewhere between 20 and 40% more in option sales. ECI published a case study on it, ILG has network-wide data. I wrote up all of it: withfin.ch/research/visualization-lift"

If they still don't engage after the research link, one more touch with the problem stated plainly:

> "Hey [Name], last one from me. The thing I keep hearing from builders is that buyers pick upgrades off a sheet, can't picture what the room looks like, and stick with base. I show them their selections in the actual room photos before they commit. Changes how much they spend. Happy to show you a quick example if you're curious."

## Design Center Managers: The Insertion Play

Design center managers are not the buyer, but they're often the fastest path to the buyer. They feel the pain every day. They sit across from buyers who can't picture the difference between standard and upgraded finishes. They know exactly how much revenue walks out the door.

### Why they matter
- They use the current process daily and know where it breaks
- They talk to other design center managers at HBA events and conferences
- They can walk your demo directly to their VP with a personal endorsement
- When they say "this changed everything" to leadership, it carries more weight than any outside pitch

### How to approach them
Use The Observation or The Gift. They care about the daily experience more than revenue benchmarks. Lead with what their appointment looks like, not what the SEC filings say.

> "Hi [Name], I work with builders on upgrade visualization. The thing I keep hearing from design center managers is that half the appointment is explaining what things will look like, and buyers still freeze up because they can't picture it. I've been showing builders what happens when buyers see their selections in the room before they commit. Thought you'd find it interesting."

### The warm intro ask
After they've seen the Loom or demo page and expressed interest:

> "Who on your team would I talk to about rolling this out? I'd love for them to see what you saw."

Don't ask them to "make an introduction." Ask them who the right person is and offer to reach out directly, mentioning that [their name] thought it was worth a look.

## Multiple-Choice Questions (keep conversations going)

When someone gives you a short reply or you need to keep the conversation moving, give them 2-3 options to pick from. Makes answering easy and shows you know the space.

**When they describe their process vaguely:**
> "Is it mostly handled in person at the design center, or do buyers get anything to look at online before the appointment?"

**When they say they have something already:**
> "Is it working well for you, or is it more that switching would be a hassle?"

**When they seem interested but noncommittal:**
> "Would it be more useful for me to send you a link to click through yourself, or would 15 minutes on a call be better so I can show you with your options?"

Don't stack multiple questions. One at a time. The question should feel like you're genuinely curious which bucket they fall in, not steering them toward an answer.

## Introducing What You Do (when the moment comes)

Rules:
- Lead with the problem, not the product, and ground it in a real builder relationship ("started with a builder in Alabama")
- Interest check before meeting ask ("Does that match what you're seeing?" comes before "Want me to show you?")
- End on a question, not a statement
- Physical language only (pictures, rooms, selections, revenue) and never say "AI," "tool," "platform," "software," or "solution"

### Examples: What Good Looks Like

**Bad (template, tech language):**
> "Hi [Name], I've built a tool that helps builders visualize upgrade selections. Would love to show you how it works."

**Bad (hedging, permission-seeking):**
> "Hi [Name], I've been working on something that might be interesting if you're open to it. No worries if not. Would love to get your take when you have a moment."

**Good (researched connection request with provocation):**
> "Hi Mary, every builder I've found doing upgrade visualization reports 20-40% more in option sales. ECI, Roomored, different companies, same result. With McKinley scaling across five states, curious if that's on your radar."

**Good (practitioner to a design center manager):**
> "Hi [Name], I work with builders on upgrade visualization for the design center. Buyers see their picks in the actual rooms before they commit. Saw [Company] just opened [Community] and thought it might be relevant."

**Good (follow-up after they describe their process):**
> "That makes sense. The thing I keep hearing is that the in-person appointment works fine, but buyers show up not knowing what anything looks like together. They pick a countertop and a cabinet and flooring, and they're hoping it all works. I've been showing builders what happens when buyers see those selections in the actual room photos before they commit. Started with a builder in Montgomery and it changes how much buyers spend. Worth a quick look?"

The difference: the bad ones are about you and use tech language. The good ones are about them, grounded in something specific, and give them something to react to.

## Notion Tracker
Builder Outreach database in Notion. Update status as you go. Flag Envision/Roomored builders with "USES ENVISION" or "USES ROOMORED" in notes. Track whether you've built a prospect demo page and/or recorded a Loom for each prospect.
