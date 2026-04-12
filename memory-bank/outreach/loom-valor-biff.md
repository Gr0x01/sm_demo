# Loom — Biff Driver / Valor Communities

**Target**: Biff Driver, Division VP Sales & Marketing, Valor Communities (Atlanta Division)
**Based in**: McDonough, GA
**Email**: biff.driver@valorcommunities.com
**LinkedIn**: linkedin.com/in/biff-driver/
**Demo page**: `withfin.ch/for/valor`
**Kitchen**: Rosemary III
**Length**: ~35-40 seconds
**Close**: Selections sheet ask (Option A)

## Context — this Loom is fulfillment, not a pitch

Biff replied **"That would be Great! Thank you"** on 2026-04-08 to the C3 permission-ask offering a short video of his Rosemary III kitchen with different finishes. **This Loom is the deliverable he asked for.** Tone is matter-of-fact delivery, not cold approach.

**Who Biff is:**
- Joined Valor May 2025 as Division VP S&M. Hired specifically to run the Atlanta expansion.
- Previously Division VP Sales at **D.R. Horton Atlanta East** (Mar 2023–Dec 2024), then Director of Sales & Marketing at **DRB Homes GA/AL** (Dec 2020–Mar 2023).
- National builder background. Has seen corporate viz tooling, now at a private builder without it. "National builder background = understands the gap."
- Not in Huntsville. Based in McDonough GA, Atlanta metro.

**Why Valor cares (the real hook):**
- **April 2025: Valor launched South Metro Atlanta as a brand-new market** with 6 new communities, plus Gulf Shores AL opening simultaneously
- 9 more Alabama communities launched Q1 2025
- 7 additional communities in development through 2025–2026
- 79 employees, ~$5.6M revenue, private/family-owned
- **No visualization tools currently**
- Physical design center concept, low tech level

The angle that couldn't apply to any other builder: Biff is personally responsible for standing up a brand-new Atlanta market with no existing design center infrastructure. That's the operational problem Finch solves for him.

## Script

> Hey Biff, Rashaad here. Here's that Rosemary III video I mentioned.
>
> I grabbed a photo from your site and wanted to show you the different options that could be applied visually. White cabinets, granite counters.
>
> Watch. Island to Admiral Blue. Quartz on the counters. Herringbone backsplash.
>
> Same kitchen, same photo, different selections.
>
> Here's the thing. You just opened South Metro Atlanta. When you're standing up a new market with new communities, setting up full design centers takes time and a lot of money. But we know that when clients can see their options together, they spend money and are happier about it.

I know this because I built Finch for my wife while we were picking upgrades for our house. We got a pdf and a good luck and originally planned to spend $4200, but ended up spending $7800. And this is for an investment property.
>
> Send me your Rosemary III selections sheet and I'll have it built with your real options and pricing by end of week.

~130 words. 35–40 seconds with 2-second holds on each swatch change.

## Shot Plan

Don't rip through it. The wow moment is watching the kitchen change, not your voice. Hold on each generated image for ~2 seconds before clicking the next swatch.

- **0:00** — Browser on `withfin.ch/for/valor`. Base Rosemary III photo visible, no selections. Webcam bubble top-right.
- **0:03** — "Hey Biff, Rashaad here. Here's that Rosemary III video I mentioned." Cursor lazy on the base photo.
- **0:08** — "This is the base photo from your site. White cabinets, granite counters."
- **0:12** — "Watch. Island to Admiral Blue." Click. **Hold 2 sec.**
- **0:17** — "Quartz on the counters." Click. **Hold 2 sec.**
- **0:22** — "Herringbone backsplash." Click. **Hold 2 sec.**
- **0:27** — "Same kitchen, same photo, different selections." Cursor idle on the finished room.
- **0:30** — "Here's the thing. You just opened South Metro Atlanta..." Deliver over the upgraded image, don't click.
- **0:38** — Deliver the close. Cursor idle.
- **0:42** — Stop recording.

Target total: 40 seconds. If you come in at 35, perfect. If you're hitting 55, you're over-explaining.

## Pre-Record Checklist

- [ ] **Pre-warm the cache** — open `/for/valor`, click through Standard → Mid-Range → Premium, let each one finish. Close the tab. The Mid-Range preset matches the three swatches in the script (Admiral Blue island + Quartz Lace White + Herringbone). Source: `scripts/prospect-configs/valor.json:47-55`.
- [ ] Sanity-check that the base photo shows **white cabinets + granite counters** (Standard preset). If the page loads into a different state, click back to Standard before recording.
- [ ] Close Slack, mail, and any notification sources
- [ ] Hide browser bookmarks bar, clear tabs except the prospect page
- [ ] Webcam framing checked (top-right, not blocking the swatch tray)
- [ ] Mic test in Loom
- [ ] Say "Rosemary III" and "South Metro Atlanta" out loud a couple times before you hit record

## Copy Rules (don't break these on camera)

- No "AI," "tool," "platform," "software," "solution"
- No "pilot" or "trial"
- No "before the appointment" framing
- Don't mention D.R. Horton or DRB on camera. Save it for the follow-up call. The Loom is fulfillment, not pedigree flex.
- Physical language only: photo, kitchen, cabinets, counters, backsplash, selections
- Say Biff's name + "Rosemary III" + "South Metro Atlanta". Three pattern-interrupt anchors.

## Email Reply (delivery message)

Reply to Biff's 2026-04-08 "That would be Great!" email. Keep it short, the video does the work.

> Hey Biff, here's that Rosemary III video: [Loom link]
>
> If you send over your Rosemary III selections sheet, I'll swap in your real options and pricing and have it built by end of week.
>
> Rashaad

## Follow-Up If He Sends a Selections Sheet

Overwrite the existing `/for/valor` page with Valor's real catalog and pricing. Use `scripts/seed-prospect-demo.ts`. Turnaround: end of week as promised. Update the Notion contact status and log an interaction.

## Notion References

- Biff Driver (contact): https://www.notion.so/329a1245135781a58205c92bb45f2aef
- Valor Communities (company, primary): https://www.notion.so/31ea124513578194b010e5ec902a018d
- Original interaction (his "That would be Great!" reply, 2026-04-08): https://www.notion.so/33ba1245135781f0b409f272e19a2d2c
- Scott Dudley (company research notes): https://www.notion.so/31ea12451357819bb3f8c2eed7d5233e
