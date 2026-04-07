# Klein 4B Fine-Tuning — Future R&D Path

**Status**: Not started. Collecting training data passively via normal usage.
**Decision date**: Revisit when we have 200+ curated generation pairs (few months of real usage).

## Why Klein 4B

- Apache 2.0 — fully commercial, no BFL license fee, no per-image cost beyond compute
- 4B params but punches well above its weight on focused tasks
- Already using Klein 9B for scoped edits (hex mosaic) — 4B is the same family
- Removes single-vendor dependency on BFL API
- At scale: ~$0.004/image (cloud on-demand) vs $0.03-0.09 BFL API

## The Task

Train a LoRA to specialize Klein 4B at: "given a room photo + swatch reference images, apply those materials to specified surfaces." The model learns the *application pattern*, not individual materials. Swatches are still runtime inputs.

## Training Data

- ~200 curated pairs needed (across surface types, rooms, lighting)
- **Source**: Our own BFL Max generations — best ones, human-curated
- Pairs = original room photo + swatch images → generated room with materials applied
- Being collected passively through normal usage (/try, SM, prospect demos, builders)
- **Future**: Add a quality flag to `generated_images` table. Good results → training set automatically.

## Fine-Tuning Method

- **LoRA** (Low-Rank Adaptation) — 10-200MB adapter, 1-3 hours training on consumer GPU
- **Tools**: SimpleTuner (best Flux 2 Klein support), HuggingFace Diffusers, Ostris AI Toolkit
- **Training format**: Edit LoRA with paired `_start` / `_end` images + captions describing the transformation
- **Approach**: Broad LoRA (mix of cabinets, countertops, backsplash, flooring) over per-surface LoRAs. Teaches general "apply swatch to surface" task.

## Hardware

| Setup | Cost | Speed | Notes |
|-------|------|-------|-------|
| Cloud RTX 4090 (training) | ~$0.40/hr, 1-3 hrs | — | Sufficient for Klein 4B LoRA |
| Cloud RTX 4090 (inference) | ~$0.40/hr | ~15-30s base, ~2s distilled | On-demand, cold starts |
| Cloud A100 (inference) | ~$1.50/hr | ~5-10s base | Faster, pricier |
| Own RTX 4090 in homelab | ~$1,600 upfront + ~$15/mo elec | ~15-30s base | Best long-term if volume grows |

RB's homelab (MS01, i9-12900H) has no discrete GPU currently. Would need to add one or use cloud.

## Limitations vs BFL API

- **Quality ceiling**: 4B can't match 32B Max on multi-surface full gen. Fine-tuning narrows gap for specific task but doesn't eliminate it.
- **Multi-ref limit**: Klein 4B supports 4-5 reference images. Finch kitchen sends 4-7 swatches. Tight ceiling — may need two-pass for full kitchens.
- **Base model speed**: Fine-tunable base needs 50 steps (~15-30s). The fast distilled version (4 steps, ~2s) isn't designed for LoRA inference.
- **No prompt upsampling**: Must write detailed prompts (Finch already does this).

## Possible Use Cases (ordered by risk/reward)

1. **Fast draft preview** (no fine-tuning needed): Klein 4B distilled as 2-second rough preview while Max runs in background. Solves "McKinley bounced before gen finished" problem. Lowest risk, highest immediate value.
2. **Scoped edits**: Single-surface changes are a lower quality bar. Fine-tuned 4B could replace Pro/9B for scoped edits.
3. **Full generation replacement**: Highest risk. Only worth attempting after strong scoped edit results.

## When to Pull the Trigger

- 200+ curated pairs in the training set
- Clear understanding of where Klein 4B slots in (draft preview vs scoped edits vs full gen)
- Either: volume hits 5K-10K+ images/month, or BFL becomes unreliable/expensive, or we want sub-second previews as a product feature
