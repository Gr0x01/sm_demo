# Lab Improvements

**Status**: Planning. Roadmap lives in the "Definitely building" / "Probably next" / "Parking lot" sections below. Nothing built yet.

**Date**: 2026-04-13

## Why this doc exists

The Prompt Lab (`scripts/prompt-lab.ts`, `memory-bank/generation/prompt-lab.md`) has become the primary workspace for tuning Flux 2 prompts. Every new photo — demo, tenant, prospect — goes through the lab. RB will spend a lot of time in it going forward, so the lab is high-leverage: any improvement compounds across every future prompt we tune.

Three compounding opportunities live here:

1. **Iteration speed** — inline editing, keyboard shortcuts, fewer CLI round trips. The faster a cycle is, the more variants you try, the better the prompts get.
2. **Knowledge persistence** — the lab should get smarter every day it's used. Approved clauses become a library. Past sessions become regression fixtures.
3. **Training dataset accumulation** — every refine run already produces the ingredients for a Klein edit-LoRA training pair. Throwing them away is a silent cost.

---

## Definitely building

The near-term roadmap. Grouped by the friction they remove, not the order of operations.

### A. Iteration speed (biggest single win)

**A1. Inline prose edit + re-run in `review.html`.** Each variant's prompt block becomes a textarea that saves back to `config.json` via a local API route. A "Re-run this variant" button fires BFL without leaving the page. Cuts the loop from `edit JSON → save → CLI run → refresh` to `click → type → click`. Single biggest ergonomic unlock.

**A2. Per-run verdicts (gold / silver / reject) written directly to Supabase.** Same prompt produces great and garbage results across runs; we want to judge each run individually, not the variant as a whole. Skips the current localStorage → export → import dance. Doubles as the training-quality signal (see section D).

**A3. Swatch strip per variant.** Under each variant's prompt block, render thumbnails of the actual swatches sent to BFL, labeled `image 2 = cabinets (Dove)`, etc. Makes it obvious when the problem is a bad swatch, not the prompt.

**A4. "Unrated only" filter toggle.** Long sessions can be reviewed incrementally without re-judging already-seen runs.

### B. Judgment quality (see differences you'd otherwise miss)

**B1. Consistency score for `runs: 3+`.** Perceptual hash distance between the N runs of a single variant, shown as a number or color bar. Tells you "this prompt is reliable" vs "this prompt got lucky once." Reliability matters as much as quality for a shipped prompt, and right now you eyeball it.

### C. Knowledge persistence (the lab learns across sessions)

**C1. Approved clause library.** When you `apply` a variant, harvest its individual action clauses into a searchable store keyed by surface + photo type (kitchen with chimney hood, bathroom vanity, etc.). This is where the lab compounds — the difference between "tool I use every day" and "tool that gets smarter every day I use it."

**C2. `init --from <past-session>`.** Start a new session by copying an existing session's prose as baseline instead of always pulling from DB. Good for "this new prospect has a kitchen similar to Valor, start there."

**C3. Hero photo regression suite.** A tracked set of "golden" photos (Valor, Davidson, Alexander Scott, etc.) with known-good selections. `prompt-lab regress --change "backsplash clause: new wording"` runs the change across every hero photo and renders a grid for visual inspection. The single biggest thing that will save you from "fixed one, broke three" hell as the prompt corpus grows.

### D. Training data collection (Klein refine LoRA path)

Context, vision, license reality, hardware plan, and training format all live in the ["Klein refinement LoRA pipeline"](#klein-refinement-lora-pipeline) section below. This is the build work:

**D1. Supabase table `training_pairs`**:
- `id, pair_type (refine), session, variant_id, run_index, photo_id`
- `pre_refine_url, post_refine_url, swatch_url?, swatch_subcategory?`
- `refine_prompt, parent_prompt_prose (jsonb), selections (jsonb), model`
- `verdict (gold | silver | reject | unrated), training_quality (gold | silver | noise), notes, created_at`

**D2. Bucket `training-pairs/`** — fal-compatible filenames from day one: `{pair_id}_start.jpg`, `{pair_id}_end.jpg`, `{pair_id}_start2.jpg` (optional), `{pair_id}.txt`.

**D3. Auto-ingest on refine runs** in `prompt-lab run`. Non-refine runs stay in `tmp/` and never touch the DB. Keeps the table clean.

**D4. Retroactive ingest command** — walk existing `tmp/prompt-lab/*` sessions and backfill any refine pairs already on disk. Don't lose Valor, Davidson, Alexander Scott, etc.

**D5. Export command** — `prompt-lab export-training --verdict gold --target fal|ai-toolkit|runpod` → zip/folder ready to upload in the right shape per target.

### Second verdict axis (important for D)

Shipping quality ≠ training quality. A refine output that's "90% right, good enough to ship" is **noise** in a training set. We need a second axis separate from the ship/demo verdict:

- `training_quality: gold | silver | noise` — curated harder than `verdict`
- Default all unrated runs to `noise`; only promote to gold after a careful look

Without this, the training set gets polluted and the LoRA learns "mostly right is fine," which is exactly what we want to eliminate.

---

## Probably next (polish pass — bundle and knock out in one afternoon)

Individually small, collectively they turn the lab from "functional" into "fast to live in."

- **Keyboard shortcuts in `review.html`**: `j`/`k` move between runs, `g`/`s`/`r` for gold/silver/reject, `/` to search prompts, `?` cheat sheet.
- **Session cost totalizer.** Running tally in CLI and review header. "$0.32 this session, $4.80 this week." Stops "I just burned $15 on a bad variant" surprises.
- **Per-run timing breakdown.** Upload / BFL queue / poll / download as separate numbers. Spots BFL slowdowns vs our-pipeline slowdowns.
- **Failure panel in review.** BFL moderation / timeout / format errors rendered inline with a retry button, not buried in CLI logs. A failed run is currently invisible in review.
- **Crop-to-selection comparison.** Draw a rectangle on the source photo once; all variant thumbnails render that crop only. When the surface under test is 20% of the image, whole-image comparison hides the thing you're trying to see.
- **Swatch overlay on output.** A small corner inset of the reference swatch floating on each generated image, toggle on/off. "Did it actually match the swatch" becomes a single glance.
- **Source photo ghost overlay.** Slider that fades the generated image into the source. Catches unexpected structural changes (moved cabinets, warped appliances) that are hard to see side-by-side.
- **Word-level prompt diff highlight** between variants. Makes "which exact word mattered" visible without eyeballing two blocks of text.
- **File-watcher auto-reload** on `config.json` changes, so a CLI re-run refreshes the open review tab automatically.
- **"Show raw request" debug button.** Dump the exact prompt string, swatch buffers' dims/sizes, model, safety tolerance, seed (if any). For when something looks wrong and you don't know why.

---

## Parking lot (ideas worth keeping, not planning for)

Good ideas that don't clear the bar today. Review periodically; promote to "probably next" when a specific pain makes one of them urgent.

- **Cartesian variant generator.** `prompt-lab explode --axis verb=apply,cover,render --axis position=front,end` spawns every combination. Useful when you don't know what word works and are willing to burn $5 to find out.
- **Random nudge mode.** One click fires N small random variations (swap connectors, reorder clauses, compress/expand 20%) to check if the current winner is a real maximum or a lucky seed.
- **Subagent-authored variants.** `prompt-lab propose <session> --goal "shorter cabinet clause"` hands the session to `bfl-prompt-engineer` which writes new variants directly into `config.json`. Human-in-loop without JSON editing.
- **`init --like <photo-id>`.** Find the most similar past session by photo metadata and use its prose as baseline. Niche until we have enough sessions for similarity search to matter.
- **Selection presets.** Named "worst case for color bleed," "darkest cab + lightest counter," etc., per photo. Good when we need repeatable adversarial combos.
- **Auto-regression on `apply`.** Before writing new prose to DB, auto-run the hero suite and ask the user to confirm deltas look fine. Depends on C3 landing first.
- **Prose JSON split-view diff** (vs just the rendered prompt text). Catches "you forgot to change the key you meant to change" on forked variants.
- **Output image cache across sessions.** Hash `(photo + prompt + swatch set + model)` → bucket result. Cheap safety net against firing the same exact generation twice.
- **Cross-session winning patterns index.** A generated index of all approved clauses, tagged and queryable. Overlaps heavily with C1 (approved clause library) — probably just a second view on the same underlying store.

---

## Klein refinement LoRA pipeline

Context for section D above. This is the "why" behind the training data collection layer.

### Vision

Use approved lab outputs as a training set for a Klein 4B **refinement-pass LoRA**. When shipped, Klein would replace (or augment) the current Max-based refine pass with something cheaper, faster, and specialized to Finch's surfaces.

**Today Max is still better than Klein for refinement.** That's fine. The bet is:

- Data collection costs ~nothing extra since the lab already produces the pairs
- In 2–3 months we'll have hundreds of gold pairs sitting in Supabase
- When Klein quality catches up (or we want to A/B the current pipeline) the training set is already there, zero retroactive work needed

This is not a commitment to ship a Klein LoRA. It's keeping the option open at near-zero cost.

### What we are and aren't training

**In scope (refine only):**

| Input | Target | Conditioning |
|---|---|---|
| Pre-refine image (flawed Max output) | Post-refine image (corrected) | Refine prompt + optional swatch reference |

The lab already produces this exact shape when a variant has `refine` configured — `v{n}-pre-refine.jpg` and `v{n}.jpg`.

**Not in scope:**

- Full-gen multi-reference training (source photo + N swatches → rendered room). Uncharted territory in BFL docs, higher risk, and Max handles full gen fine today.
- Shipping Klein 9B. NCL license blocks commercial use. 9B is R&D-only.
- Replacing Max in the full-gen path. Klein's target slot is the second pass, nothing else.

### Model / license reality

- **Klein 4B** — Apache 2.0. Commercial-safe. This is the ship target.
- **Klein 9B** — BFL Non-Commercial License. Internal R&D only unless we negotiate a commercial license from BFL.
- **BFL hosted finetune API** — Flux 1.1 Pro only. Does not cover Klein. All Klein training happens on our infrastructure or fal.ai's hosted trainers.

### Training format (fal.ai edit LoRA, also compatible with AI-Toolkit)

```
{pair_id}_start.jpg     pre-refine (flawed output)
{pair_id}_end.jpg       post-refine (corrected)
{pair_id}_start2.jpg    swatch reference (optional; fal _start2 convention)
{pair_id}.txt           refine prompt / caption
```

- Minimum useful dataset: **10–20 pairs.** Reachable in one productive refine session.
- fal hosted training cost: `0.008 × steps × ref_multiplier`. ~$17 for 1-ref, ~$28 for 2-ref at 1K steps.
- **AI-Toolkit edit-LoRA config for Klein 4B is newer territory** than fal's path. Needs verification before a local-iteration YAML is locked in. Not a blocker for data collection — file shape is identical.

### Hardware plan

| Stage | Where | Why |
|---|---|---|
| First LoRA (end-to-end validation) | fal.ai hosted Klein 4B Base Trainer | Zero setup, ~$17, de-risks the whole pipeline |
| Ongoing 4B iteration | Local 4080 (16GB VRAM) via Ostris AI-Toolkit | Free after ~10 runs, full config control for LR/rank/steps tuning |
| 9B quality-ceiling comparisons | RunPod A100 (existing credit pile) | 4080 can't fit 9B LoRA (~24GB+). Burn-down, terminate when done. R&D only. |

**Not buying a Mac Studio / Mini for this.** Apple Silicon training via MPS is CUDA-step-child territory — AI-Toolkit, flash attention, xFormers, bitsandbytes are all CUDA-only, and Flux 2 Klein training on MPS is unverified. 4080 + RunPod covers both realistic paths. Revisit in ~6 months if Diffusers / AI-Toolkit ship first-class MPS edit LoRA support.

---

## Open questions

- Does AI-Toolkit's edit-LoRA config actually work on Klein 4B today? Need a verified working YAML before the local 4080 path is usable. (fal and RunPod paths don't block on this.)
- What's the real pre/post quality delta between Max and Klein 4B on our specific refinement tasks (oven geometry, countertop bleed)? Until we measure, "Max is better" is an assumption. A 20-pair A/B at some point would tell us.
- Does the swatch reference (`_start2`) help the LoRA, or does a pure pre→post pair train better? Worth comparing 1-ref vs 2-ref LoRAs on the same dataset once we have enough pairs.
- How many gold pairs before a Klein LoRA is worth shipping? 20 might be enough for a narrow transform. Real answer comes from the first training run.
- If we never ship a Klein refine LoRA, is any of this wasted work? **No.** Sections A/B/C pay for themselves in prompt-tuning ergonomics regardless. Section D's sunk cost is ~3 hours of build + pennies of Supabase storage.

## Move order (when we decide to build)

Rough dependency order. Not a time estimate — just "what has to land before what."

1. **D1–D4 (data layer + ingest)**. Biggest future value, zero user-facing complexity, runs in the background. Also retroactive, so building it early captures existing tmp sessions.
2. **A1 (inline edit + re-run)**. Single biggest iteration speedup. Touches review.html + a small local API route.
3. **A2–A4 (per-run verdicts, swatch strip, unrated filter)**. Natural companions to A1 — all live in the same review.html refactor.
4. **C3 (hero photo regression suite)**. Independent of A/D. Worth landing before the prompt corpus grows much further, because the longer we wait, the more regressions we'll already have shipped.
5. **B1 (consistency score)**. Cheap addition to the review UI once it exists.
6. **C1 + C2 (clause library + `init --from`)**. Needs a bit of schema thinking. Should land after A/D are stable so we're not rebuilding review.html again.
7. **D5 (export command)** + **first fal training run** ($17). Validates the whole pipeline end-to-end. Could happen any time after D1–D4 exist and a meaningful number of pairs have been judged gold.
8. **Polish pass (Probably next)**. Bundle half a day, knock out the small stuff.

## Related docs

- `memory-bank/generation/prompt-lab.md` — Lab CLI reference and workflow
- `memory-bank/generation/bfl-prompting-guide.md` — Prose spec v2 and BFL prompting rules (source of truth for what we're tuning)
- `memory-bank/architecture.md` → "AI Image Generation Pipeline" — where the current Max refine pass sits
- `memory-bank/decisions.md` D97–D100 — prose v2 + paint+hex decisions the lab validated
2