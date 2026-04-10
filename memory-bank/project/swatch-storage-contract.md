# Demo ↔ SM Tenant Isolation (swatch storage)

## Goal

Make Stone Martin a fully independent tenant that can be deleted, spun down, or isolated from Finch's internal demo environments (Demo org, `/try`, `/for/*` prospect pages) without breaking anything on the Finch side.

"Clean split" test: `DELETE FROM organizations WHERE slug='stonemartin'` plus removing the SM storage prefix leaves `demo.withfin.ch`, `/try`, and every `/for/*` page fully functional.

## What was wrong (2026-04-10)

RB noticed the Demo org's bathroom tiles were showing stale pre-Shaw swatch images while the backsplashes "looked fine." A full audit (`scripts/audit-tenant-bleed.ts`) across every org-scoped table and every text/jsonb column that could hold a path reference produced this picture:

### Group 1 — Path bleed (5 rows, backsplash)

5 Demo `options.swatch_url` values pointed at SM's storage path (`/swatches/{SM_ORG_ID}/backsplash/...`). A true multi-tenant isolation violation: if SM's backsplash bytes had ever changed, Demo would have silently changed too. This is why Demo backsplashes "looked fine" — they were literally serving SM's files through SM's namespace.

### Group 2 — Stale bytes, same filename (4 primary-shower rows + 1 floor-tile row)

The 2026-04-09 Shaw swatch replacement (`scripts/upload-approved-swatches.ts`) was hardcoded to `ORG_SLUG = "stonemartin"`. It wrote fresh Shaw catalog shots into `{SM_ORG_ID}/shower-tile/...` but never touched `{DEMO_ORG_ID}/shower-tile/...`. Both orgs had byte-copies of the same filenames at seed time, so SM got the Shaw bytes while Demo kept the old ones. The file paths are literal string-equal between orgs except for the `{orgId}` segment.

### Group 3 — Dead drift (4 floor-tile rows, no action needed)

For 4 of the 5 Demo floor-tile-color rows, MD5 hashing showed **byte-identical** files on both SM and Demo (omega-bone, omega-grey, omega-silver, infinity-calacatta). Both orgs have the same good seed bytes. No action needed — these just look stale because the originals were never Shaw-improvement candidates in the first place.

### What the audit ruled out

All checks are automated in `scripts/audit-tenant-bleed.ts`. Run `npx tsx scripts/audit-tenant-bleed.ts --primary demo --other stonemartin` to re-verify at any time.

| Check (automated) | Result |
|---|---|
| Demo `options.swatch_url` → SM path | **5 rows** (Group 1, now ported) |
| Demo `floorplans.cover_image_path` → SM prefix | 0 |
| Demo `step_photos.image_path` → SM prefix | 0 |
| Demo `generated_images.image_path` → SM prefix | 0 |
| Demo `pass_cache.image_path` → SM prefix | 0 |
| Demo `steps.hero_image` contains SM org_id | 0 |
| Demo `organizations.logo_url` contains SM org_id | 0 |
| Demo `steps.sections` / `spatial_hints` jsonb contains SM org_id | 0 |
| Demo `step_photos.subcategory_ids` → SM subcat ids | 0 |
| Demo `floorplans.prospect_insights` jsonb contains SM org_id | 0 |
| Reverse leak: SM `options.swatch_url` → Demo path | 0 |
| Shared row ids across orgs (options, subcategories, categories) | 0 |

Additional checks done manually, not automated:

- Runtime code referencing `SM_ORG_ID` UUID: only `src/app/robots.ts` (`BLOCKED_TENANT_SLUGS = ["stonemartin"]` — intentional SEO isolation) and test fixtures
- `/try`, `/for/*`, `demo.withfin.ch` all read options via `getCategoriesWithOptions(DEMO_ORG_ID)` — storage paths correctly scoped

The earlier draft of this doc chased a larger architectural ghost — two identity schemas, reconciler primitives, hash-based paths, lazy SM migration — based on the assumption that coupling was systemic. The audit showed the actual coupling surface is 5 rows in one column. Everything else is already clean.

## What shipped (2026-04-10)

### 1. Byte port: `scripts/port-sm-swatches-to-demo.ts`

One idempotent script, 10 files, three groups:

- **Backsplash (5)** — download from `{SM}/backsplash/*`, upload to `{DEMO}/backsplash/*`, UPDATE 5 `options.swatch_url` rows.
- **Primary-shower (4)** — download SM's Shaw-updated bytes, overwrite Demo's file in place at the same filename. No URL changes.
- **Floor-tile-color (1)** — same pattern, for `onyx-white` only (the one file that differed between tenants).

Re-running is a no-op: backsplash URL lookup returns zero Demo rows with SM URLs, and the byte overwrites converge.

### 2. Regression guard: tightened CHECK constraint

```sql
ALTER TABLE options ADD CONSTRAINT options_swatch_url_contains_org_id CHECK (
  swatch_url IS NULL
  OR swatch_url !~* 'supabase\.(co|in)/storage/'
  OR swatch_url ~ ('/storage/v1/object/(public|sign)/swatches/' || org_id::text || '/')
);
```

- First clause: NULL swatch_urls are allowed (e.g., appliance rows without a swatch).
- Second clause: external CDN URLs (manufacturer catalogs) pass through. Case-insensitive regex catches uppercase-host bypass (`HTTPS://SUPABASE.CO/...`).
- Third clause: any Supabase-hosted URL must have the row's own `org_id` in the exact bucket-prefix segment `/storage/v1/object/(public|sign)/swatches/{org_id}/`. Anchoring to the bucket prefix closes a hole where org_id could appear elsewhere in the path (e.g., nested under another org, or embedded in a filename).

Test matrix run on apply (all pass): correct Demo URL, Demo URL with `?t=` cache-buster, uppercase-host SM URL, nested-orgs-in-path SM URL, org_id-in-filename-only SM URL, external Shaw CDN URL, NULL. Both `public` and `sign` (signed URL) shapes are allowed.

**Migration file: `supabase/migrations/20260410_options_swatch_url_tenant_isolation.sql`.** This project has no Supabase CLI migration runner — the migration has been applied directly to production, and the file is version-controlled so it can be re-applied to any fresh Supabase project from scratch.

**Scope**: the constraint covers `options.swatch_url` only. Other path-bearing columns (`floorplans.cover_image_path`, `step_photos.image_path`, `generated_images.image_path`, `organizations.logo_url`) are not under a CHECK constraint today. They rely on the audit script for verification. If a future bug introduces cross-tenant references in any of those columns, the audit script catches it on the next run — but nothing prevents the write at commit time. Worth adding mirror constraints the next time any of those columns are touched; deferred for now because the audit coverage is sufficient pre-revenue.

### 3. Dead code purge

Audit surfaced several sources of "looks SM-themed but isn't actually used at runtime" confusion:

- `public/swatches/` — 367 files, no runtime importer (was V1 seed source for the original SM demo before the Supabase Storage migration).
- `public/rooms/` — 11 files, only referenced by the `steps` constant in `src/lib/step-config.ts`.
- `src/lib/options-data.ts` — 1667 lines, no importers.
- `src/lib/step-config.ts` `steps` constant — V1 SM step wizard config. All importers (13 files) use `import type` only; the exported value was unreferenced. Types kept, constant removed.
- `MEMORY.md` claim that `/try` reads swatches from `public/swatches/` — stale. `/try` uses `getOptionLookup(DEMO_ORG_ID)` like every other Demo-org surface.

After purge: `npm test` passes (179 tests), `npm run build` passes.

### 4. Cache bust

Updated swatch URLs (Group 1) are cached by Next.js `unstable_cache` under tag `categories:{DEMO_ORG_ID}`. An internal cache-bust endpoint was added at `POST /api/internal/bust-cache/[orgSlug]`, CRON_SECRET-authed:

```bash
curl -X POST https://withfin.ch/api/internal/bust-cache/demo \
  -H "Authorization: Bearer $CRON_SECRET"
```

Busts every buyer-facing and admin tag for the org: `categories:*`, `floorplans:*`, `org:*`, `admin:categories:*`, `admin:floorplans:*`, `admin:steps-all:*`. One call unfreezes `/try`, `/for/*`, and `demo.withfin.ch` simultaneously. Zero impact on SM.

### 5. Verification

- `npx tsx scripts/audit-tenant-bleed.ts --primary demo --other stonemartin` — 14 checks, expects `CLEAN: 0 total findings`. Exits non-zero on any bleed.
- Synthetic bleed test on apply: manually setting a Demo floorplan's `cover_image_path` to an SM prefix caused the audit to detect 1 finding and exit 1. Reverting made it clean again. Confirms the audit actually catches regressions, not just the state it started in.
- CHECK constraint blocks cross-tenant `options.swatch_url` writes (smoke-tested with an intentional bad insert — fails with `violates check constraint`).
- Delete-SM smoke test (not executed — see "Deferred" below): every remaining Demo row owns its own bytes under its own storage prefix. Execution requires RLS/FK discovery first.

## Deliberate trade-offs

### Permanent SM ↔ Demo byte divergence

Before this pass, SM and Demo shared some bytes under the same filenames (same seed era, same Shaw catalog). After the byte port, Demo has its own independent copy of every swatch. Future SM swatch updates (via admin UI or another Shaw audit run) will **not** propagate to Demo. This is intentional — it's the whole point of tenant isolation. If Demo needs a swatch refresh, it has to be explicit: admin UI edit or a scoped-to-Demo sourcing pass.

### SM-themed filenames in Demo storage

Demo now has files like `BACKSPLASH---BAKER-BLVD-4X12-BEVELED---WHITE-GLOSS---3RD-STAGGER-LAY.jpg` under its own storage prefix. "Baker Blvd" is SM's tile line name. Cosmetically confusing when browsing the Supabase dashboard, but correct — the file is owned by Demo, and renaming it would force a URL change and a new cache bust for no functional benefit. Accept and move on.

## What's deferred (explicitly, with justification)

### Delete-SM smoke test (run before any real SM deletion)

The "clean split" promise is that `DELETE FROM organizations WHERE slug='stonemartin' CASCADE` plus clearing SM's storage prefixes leaves Demo/`/try`/`/for/*` functional. The audit script confirms no Demo row references SM. **But** before actually running the delete, two discovery queries should run on a staging clone:

```sql
-- Enumerate FKs that cascade from organizations
SELECT conrelid::regclass, conname
FROM pg_constraint
WHERE confrelid = 'organizations'::regclass;

-- Enumerate RLS policies that literally reference the SM uuid
SELECT schemaname, tablename, policyname, qual
FROM pg_policies
WHERE qual::text LIKE '%364538bf%';
```

Also: the delete must sweep both the `swatches/{SM_ORG_ID}/*` and `rooms/{SM_ORG_ID}/*` storage prefixes, not just `swatches/`. Not a bug in what shipped — just a note for the real execution.

### CHECK constraint on other path-bearing columns

`floorplans.cover_image_path`, `step_photos.image_path`, `generated_images.image_path`, `organizations.logo_url` all hold paths/URLs and none have a tenant-isolation CHECK constraint. Adding mirror constraints is a small ask but requires thinking about the bare-path columns (which have no `supabase.co` substring to pivot on). The audit script covers all of them today. Tackle the next time any of those columns' writers are touched.

### Row-owned hashed identity (`{orgId}/swatches/{optionId}-{hash}.{ext}`)

The earlier draft proposed a full rewrite of `SwatchUpload.tsx`, three new primitives (`putSwatch`/`deleteSwatch`/`listSwatchOrphans`), a content-hash identity model, and an on-demand reconciler. It solves real problems that are **not** tenant isolation:

- `DELETE /api/admin/options/[id]` drops the row and leaks storage bytes. Confirmed. Growing linearly with admin activity. Pennies in cost, confusing for future audits.
- `SwatchUpload.tsx` appends `?t=${Date.now()}` to the persisted URL, polluting `options.updated_at` diffs.
- Two identity schemas coexist (seed taxonomy paths + admin row-owned paths).
- No transactional contract between Storage and Postgres.

Moved to a separate "Storage hardening" workstream. The right lightweight version is probably: a single `writeSwatch(orgId, optionId, file)` helper shared by admin UI + seed scripts, a DELETE handler that removes bytes before the row, and a periodic orphan scanner. ~200 lines, no schema change. Tackle when any swatch-touching code is next modified.

### Admin API `swatch_url` validation

`PATCH /api/admin/options/[id]` accepts `swatch_url: z.string().nullable().optional()` with no shape validation. The CHECK constraint is the only backstop. A Zod `.refine()` that requires supabase-hosted URLs to contain the row's org_id in the right position would be belt-and-suspenders, matching the existing `step-photos` POST pattern. Defer.

### Storage bucket RLS verification

Code-review flagged that `SwatchUpload.tsx` runs client-side and trusts the `orgId` prop. The actual tenant guard is Supabase Storage RLS on the `swatches` bucket. Verify out-of-band in the Supabase dashboard that the bucket has policies restricting INSERT/UPDATE by `{auth.uid() → org_id}`. If it doesn't, this is a real gap. **Cannot be checked from code alone** — it's a dashboard config.

### SM-side drift cleanup

SM still has both identity schemas coexisting in its own storage (legacy taxonomy paths + admin-UI row-owned paths). Not a tenant-isolation concern — leave it alone.

## Files

- `scripts/port-sm-swatches-to-demo.ts` — the byte port (shipped, idempotent, `cacheControl: 60` on uploads)
- `scripts/audit-tenant-bleed.ts` — the audit (14 checks, parameterized on `--primary` / `--other` org slugs, exits non-zero on bleed)
- `supabase/migrations/20260410_options_swatch_url_tenant_isolation.sql` — the CHECK constraint (applied to prod, version-controlled)
- `src/app/api/internal/bust-cache/[orgSlug]/route.ts` — CRON_SECRET-authed cache bust for `revalidateTag` invalidation
- `src/lib/step-config.ts` — types only now, `steps` constant removed
- `src/lib/options-data.ts` — deleted
- `public/swatches/`, `public/rooms/` — deleted
- `scripts/sync-sm-to-demo-swatches.ts` — deleted (superseded by port script)

## If the same problem recurs

The CHECK constraint catches cross-tenant `options.swatch_url` writes at the DB level. The audit script catches bleed across every other column that could embed a cross-tenant reference. If a future tenant split problem shows up:

```bash
npx tsx scripts/audit-tenant-bleed.ts --primary demo --other stonemartin
```

If the audit is clean but you still see a problem, the regression is in a column or JSONB path the audit doesn't cover yet — **extend the audit script** before trying to fix the symptom. The audit script, not this doc, is the living spec. Every path-bearing column added to the schema should be added to the audit in the same commit.

## Review trail

This pass was reviewed by `backend-architect` and `code-reviewer` subagents (independently, no solution hinted). Their findings drove a second pass that fixed:

- Case-insensitive host bypass in the CHECK constraint (`HTTPS://SUPABASE.CO/...`)
- Bucket-prefix anchoring in the CHECK constraint
- Constraint committed as a migration file (was previously prod-only)
- Audit script extended from 1 column to 14 checks (doc's prior "13 checks" claim wasn't matched by the script)
- Audit script parameterized on `--primary` / `--other` org slugs (was hardcoded to SM + Demo UUIDs)
- Port script `cacheControl: 60` (was default 3600, causing stale CDN bytes on in-place overwrites)
- Port script LIKE pattern anchored to `/swatches/` bucket prefix (was substring-match)
- Port script Group 1 UPDATE is now a single atomic query (was per-row loop)
- Post-port `?t=` timestamp bump on 5 Group 2/3 rows to invalidate already-cached CDN bytes from the first run
