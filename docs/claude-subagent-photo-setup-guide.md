# Claude Subagent Guide: Photo Architecture Specialist

This guide explains how to use the photo-architecture-specialist subagent for classifying and configuring room photos.

## Subagent Location

- `.claude/agents/photo-architecture-specialist.md`

## What This Subagent Does

- **Classifies new room photos**: Looks at the photo, identifies room type, determines which subcategories are visible
- **Configures photo scope**: Sets `subcategory_ids`, `spatial_hint`, `photo_baseline`, `remap_accent_as_wall_paint`
- **Sets generation rules**: Option-level rules, negative guards, cross-reference rules (e.g., hearth matches trim)
- **Audits existing photos**: Finds scope gaps, missing spatial hints, misconfigured rules
- **Outputs ready-to-run SQL**: Everything it recommends comes as executable SQL

It is multimodal — it looks at photos directly via the Read tool.

## Invocation Patterns

### Classify a New Photo

```text
Use the photo-architecture-specialist subagent.
Look at this photo and classify it for generation:
- Photo path: public/rooms/[builder]/[photo].webp
- Org ID: [uuid]
- Step photo ID: [uuid]
- Available subcategories for this org: [list or "query the DB"]
Output the UPDATE SQL for step_photos.
```

### Classify Multiple Photos (New Builder Onboarding)

```text
Use the photo-architecture-specialist subagent.
Classify and configure all photos for [builder name]:
- Org ID: [uuid]
- Photos: [list photo IDs/paths]
For each photo, look at it, determine scope, write spatial hint and baseline, and output SQL.
```

### Audit Existing Photos

```text
Use the photo-architecture-specialist subagent.
Audit all step_photos for org [slug]. Find:
- Photos with null or incomplete subcategory_ids
- Missing spatial hints or photo baselines
- Subcategories visible in the photo but not in scope
```

### Fix a Specific Generation Issue

```text
Use the photo-architecture-specialist subagent.
The [room] photo for [builder/floorplan] is [describe problem].
Look at the photo, check the current scope and rules, and propose fixes.
Photo ID: [uuid]
```

## What to Provide

- **Photo path or URL** — so the specialist can view it
- **Org ID** — for DB queries
- **Step photo ID** — for the UPDATE SQL target
- **Context on the problem** — if fixing an issue, describe what went wrong

The specialist will query the DB itself for subcategory lists and current configuration.

## Acceptance Criteria

- Specialist actually viewed the photo (not guessed from filename)
- Scope includes only subcategories whose surfaces are clearly visible
- Spatial hint describes layout precisely (camera angle, surface locations, what's NOT there)
- Photo baseline describes current materials as shown
- Generation rules handle default-option gotchas (see Patterns in agent definition)
- Output is executable SQL

## Related Docs

- `docs/image-architecture-runbook.md` — rule layering, DB columns, admin authoring
