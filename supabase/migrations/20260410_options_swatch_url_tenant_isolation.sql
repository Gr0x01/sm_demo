-- Tenant isolation guard for options.swatch_url
--
-- Ensures any Supabase-hosted swatch URL contains the row's own org_id in the
-- bucket-prefix segment. Blocks cross-tenant path writes at the DB level.
--
-- Allowed URL shapes:
--   * NULL (option has no visible swatch — appliance rows, etc.)
--   * External manufacturer CDN URLs (not Supabase-hosted)
--   * Supabase public URL: https://<project>.supabase.co/storage/v1/object/public/swatches/{org_id}/...
--   * Supabase signed URL: https://<project>.supabase.co/storage/v1/object/sign/swatches/{org_id}/...
--
-- Rejected URL shapes:
--   * Any Supabase storage URL where the {org_id} segment after /swatches/ doesn't match the row's org_id
--   * Case-insensitive host (catches HTTPS://SUPABASE.CO bypass)
--   * org_id appearing only in filename but not in the bucket-prefix position
--
-- Applied 2026-04-10 as part of the Demo↔SM tenant isolation pass.
-- See memory-bank/project/swatch-storage-contract.md.
--
-- This project has no Supabase CLI migration runner — apply manually on any
-- fresh database via `psql` or the Supabase SQL editor.

ALTER TABLE options
  DROP CONSTRAINT IF EXISTS options_swatch_url_contains_org_id;

ALTER TABLE options
  ADD CONSTRAINT options_swatch_url_contains_org_id CHECK (
    swatch_url IS NULL
    OR swatch_url !~* 'supabase\.(co|in)/storage/'
    OR swatch_url ~ ('/storage/v1/object/(public|sign)/swatches/' || org_id::text || '/')
  );
