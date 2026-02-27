# Image Architecture Runbook

Documents the data-driven photo scope and conditional prompt rule system (D78), including admin authoring.

## Architecture Overview

Generation rules are DB-driven and admin-editable. No code changes needed for new builders.

### Rule Layering (general → specific, all accumulate into a Set)

1. `subcategory.generation_rules` — fires when subcategory is selected. Supports conditional cross-subcategory logic in natural language (e.g., "If Accent Color is also selected, apply only to non-accent zones").
2. `subcategory.generation_rules_when_not_selected` — negative guards scoped to photo. Fires when subcategory is in scope but not selected (e.g., "wainscoting OFF = don't add paneling").
3. `option.generation_rules` — option-specific rules (e.g., "stainless steel appliances — match existing finish").
4. `step_photo_generation_policies` — per-photo overrides (internal-only, not admin-editable). Prompt invariants + optional second-pass refinement.

### Related DB Columns

**subcategories:**
- `generation_hint` — `'default'` | `'skip'` | `'always_send'` | null. Controls prompt inclusion.
- `generation_rules` — text[]. Rules injected when selected.
- `generation_rules_when_not_selected` — text[]. Negative guards when not selected.
- `is_appliance` — boolean. Marks appliance subcategories for in-place replacement allowances.

**options:**
- `generation_rules` — text[]. Rules injected when this option is selected.

**step_photos:**
- `subcategory_ids` — text[] | null. Explicit photo scope override. Null = inherit from step sections.

### Key Code Paths

- `src/lib/photo-scope.ts` — `getPhotoScopedIds()`: explicit IDs take priority, step sections are fallback.
- `src/lib/generate.ts` — `buildEditPrompt()`: assembles all rule layers into prompt. Takes `scopedSubcategoryIds` for negative-guard lookup.
- `src/app/api/generate/photo/route.ts` — orchestrator: scopes selections, computes hash, dispatches to Inngest.
- `src/inngest/functions/generate-photo.ts` — 3 steps: generate → refine → persist.

## Admin Authoring

### OptionTree UI (`src/components/admin/OptionTree.tsx`)

**Subcategory AI Rules panel** (sparkles icon toggle, collapsed by default):
- Generation hint dropdown: default / skip / always_send
- Appliance checkbox
- "Rules (when selected)" textarea → `generation_rules`
- "Rules (when NOT selected)" textarea → `generation_rules_when_not_selected`
- Local draft state + blur-save to prevent edit clobbering during typing
- Error handling: reverts text + shows red "Save failed" badge on API failure

**Option editor modal:**
- "Generation Rules" textarea in the modal body
- Saved as part of the normal Save flow (not blur-save)
- Included in dirty-check (`hasChanges`) so unsaved changes trigger discard confirmation

**Badges on subcategory rows:**
- Purple `appliance` — when `is_appliance` is true
- Emerald `rules` — when any `generation_rules` or `generation_rules_when_not_selected` are set

### API Routes

Zod schemas on both PATCH routes accept generation fields:

- `PATCH /api/admin/subcategories/[id]` — `generation_hint`, `generation_rules`, `generation_rules_when_not_selected`, `is_appliance`
- `PATCH /api/admin/options/[id]` — `generation_rules`

Admin query (`src/lib/admin-queries.ts`) fetches all generation columns in the option tree SELECT.

### Writing Good Rules

Rules are natural language instructions injected directly into the image generation prompt. Tips:

1. **Be specific about surfaces**: "Apply to ALL visible painted drywall wall surfaces" not "paint the walls".
2. **Use explicit exclusions**: "Do NOT paint tile, cabinets, mirrors, glass, trim, doors, countertops, or flooring".
3. **Express conditionals as natural language**: "If Accent Color is also selected in the edit list, apply Common Wall Paint only to non-accent zones." The AI model reads the full edit list and evaluates.
4. **Negative guards should be assertive**: "Wainscoting/paneling/shiplap are OFF. Do NOT add, extend, remove, or restyle any wall paneling."
5. **One rule per line**: Each array element is one complete instruction. Keep them self-contained.

## Migration Status

### Phase 1: Schema — DONE
- `generation_rules_when_not_selected` column added (migration `add_generation_rules_when_not_selected`).
- `generation_hint`, `generation_rules`, `is_appliance` already existed (migration `add_generation_hint_and_rules_columns`).

### Phase 2: Data Backfill — DONE
- Scope IDs backfilled for all SM + Demo photos.
- Rules populated for: `wainscoting`, `fireplace-mantel-accent`, `common-wall-paint`, `accent-color`.
- `common-wall-paint` rules updated with conditional accent-color logic (migration `fix_common_wall_paint_conditional_accent_rules`).

### Phase 3: Code Migration — DONE
- Filename guards removed from `photo-scope.ts`.
- Hardcoded slug-conditional blocks removed from `generate.ts`.
- `buildEditPrompt` reads DB-driven rules via `scopedSubcategoryIds`.
- Types, queries, hash signatures all updated.
- Cache version bumped to v24.

### Phase 4: Contract Schema — FUTURE
Only after admin API/UI no longer sends null for photo scope:
```sql
ALTER TABLE public.step_photos
  ALTER COLUMN subcategory_ids SET DEFAULT '{}'::text[],
  ALTER COLUMN subcategory_ids SET NOT NULL;
```
Also update admin API schema to disallow null `subcategory_ids`.

### Phase 5: Admin Authoring — DONE
- Admin query fetches all generation columns.
- Zod schemas accept generation fields (were previously stripped).
- OptionTree UI: AI Rules panel on subcategories, generation rules textarea on options.
- Error handling: blur-save with revert on failure, modal save with inline error display.

## Non-Goals (Unchanged)

- `normalizePrimaryAccentAsWallPaint` remains filename-based. Roadmap: data-drive via per-photo flag.
- Flooring resolver and selection reconcile behavior unchanged.
- Universal structural rules and appliance rules in `generate.ts` unchanged.

## Verification Checklist

1. **Admin UI round-trip**: Edit rules in admin → refresh page → values persist.
2. **Prompt parity**: Compare prompt output for representative selections against expected rules.
3. **Hash consistency**: Generate and generate-check derive identical `selectionsHash`.
4. **Error feedback**: Simulate API failure → verify text reverts and error badge appears.
5. **Build**: `npm run build` passes.
6. **Photo QA**: Validate known problem photos (kitchen close, bath closet, fireplace, greatroom).

## Rollback Plan

- Migrations are additive — rollback is code-only if needed.
- If prompt behavior regresses, restore previous `GENERATION_CACHE_VERSION` and redeploy prior code.
- For data rollback, maintain SQL snapshots of modified `subcategories.generation_rules*` rows before bulk updates.
