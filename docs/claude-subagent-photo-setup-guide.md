# Claude Subagent Guide: Photo Architecture Specialist

This guide explains how to run photo-scope and prompt-rule migration work through a dedicated Claude subagent.

## Subagent Location

- `.claude/agents/photo-architecture-specialist.md`

## What This Subagent Is For

Use it for:

- Auditing `step_photos.subcategory_ids` quality and gaps.
- Replacing filename-based scope heuristics with data-driven scope.
- Migrating hardcoded prompt rules into subcategory data.
- Preparing and validating safe SQL backfills and schema changes.

It is image-aware and should inspect photos directly before proposing scope/rule changes.

## Image Analysis Commands

Local file analysis (required when local photos are provided):

```bash
node scripts/analyze-local-photo.mjs <image-path>
```

Examples:

```bash
node scripts/analyze-local-photo.mjs public/rooms/kitchen-close.webp
node scripts/analyze-local-photo.mjs public/rooms/fireplace.png --out tmp/fireplace.analysis.json
```

DB/admin workflow analysis:

- Use `/api/admin/photo-check` to validate interior/clarity/framing readiness.
- Use `/api/admin/spatial-hint` to generate concise spatial layout guidance.

## Recommended Invocation Pattern

Use a direct task request that explicitly asks Claude to use this specialist:

```text
Use the photo-architecture-specialist subagent.
Audit current photo scope and hardcoded prompt rules, then produce:
1) SQL migration/backfill plan
2) code change list
3) validation checklist
for this repo.
```

For execution:

```text
Use the photo-architecture-specialist subagent.
Implement the approved image architecture migration end-to-end:
- data migrations
- code refactor
- cache version bump
- verification notes
Do not modify normalizePrimaryAccentAsWallPaint.
```

## Standard Task Templates

### Template A: Scope Backfill Only

```text
Use the photo-architecture-specialist subagent.
Backfill missing step_photos.subcategory_ids for these photos:
- <photo id or name list>
Return idempotent SQL and post-update validation queries.
```

### Template B: Prompt Rules Migration Only

```text
Use the photo-architecture-specialist subagent.
Move hardcoded conditional prompt rules in src/lib/generate.ts into DB-driven
subcategory rules using generation_rules and generation_rules_when_not_selected.
Keep appliance and universal structural rules unchanged.
```

### Template C: Full Migration

```text
Use the photo-architecture-specialist subagent.
Execute the full two-pillar migration from hardcoded image logic to data-driven architecture.
Require:
- additive schema first
- backfill second
- compatibility code third
- not-null contract last
- prompt parity verification
```

## Required Inputs to Give the Subagent

- Target org(s) and floorplan(s)
- Any fixed list of photo IDs requiring scope updates
- Whether subagent should produce SQL only or execute code changes too
- Deployment constraints (single release vs phased rollout)

## Acceptance Criteria

- No filename heuristics remain in runtime photo scope logic.
- Hardcoded subcategory-specific prompt blocks are removed from `generate.ts`.
- New negative rule column is used in prompt assembly for in-scope unselected subcategories.
- Generate and check routes still compute matching selection hashes.
- Build passes and representative image outputs show no regressions.
- Target photos were actually analyzed (local script and/or admin vision endpoints), not inferred from filename alone.

## Related Docs

- `docs/image-architecture-runbook.md`
