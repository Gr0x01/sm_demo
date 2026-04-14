-- Replace the overloaded `is_painted` flag with a `render_mode` enum that
-- directly names the prompt-substitution path each option takes. Before this
-- migration the prose builder cascaded through (is_painted, swatch_color,
-- isFixtureSubcategory) substring matching in step-config.ts to decide among
-- five dispatch patterns (D100 paint, D101 stain, D102 textured, D103
-- metallic, lab forceHex). The flag's name lied — `is_painted = true`
-- actually meant "render via hex-only path" which covered both D100 paint
-- AND D101 stain. `render_mode` is self-describing and kills the cascade.
--
-- Values:
--   hex_paint        D100 — paint (is_painted=true path): hex in prompt text, no swatch image
--   hex_stain        D101 — stained wood: hex + "wood grain" verb, no swatch image
--   swatch_metallic  D103 — hardware / faucet / sink / lighting / fan / etc.:
--                    swatch image only, NO hex anchor (hex flattens metal sheen)
--   swatch_textured  D102 — granite / tile / countertop / backsplash / floor:
--                    swatch image + inline hex anchor `image N at hex #XXX`
--   NULL             legacy prompt-descriptor-only options with no swatch data;
--                    rendered via buildEditPrompt only, not through buildProsePrompt
--
-- This project has no Supabase CLI migration runner — apply manually via MCP
-- or the Supabase SQL editor.

-- Step 1a. Backfill missing stain hex on SM laundry, powder, primary-bath,
-- and secondary-bath stain options so they can use the D101 hex_stain path.
-- The hero kitchen/island stain options already have these hex values; we
-- just copy them across the matching name.
UPDATE options o
SET swatch_color = '#6B4226'
WHERE o.swatch_color IS NULL
  AND (o.name ILIKE '%Cappucino%Stain%' OR o.slug LIKE '%cappucino%');

UPDATE options o
SET swatch_color = '#B09A7E'
WHERE o.swatch_color IS NULL
  AND (o.name ILIKE '%Driftwood%Stain%' OR o.slug LIKE '%driftwood%');

UPDATE options o
SET swatch_color = '#C4A87A'
WHERE o.swatch_color IS NULL
  AND (o.name ILIKE '%Sahara%Stain%' OR o.slug LIKE '%sahara%');

-- Step 1b. Backfill missing paint hex on `is_painted=true` options by copying
-- from a same-org same-color-name kitchen/island option that already carries
-- hex. Fixes 9 SM primary-bath-cabinet-color rows (Admiral Blue, Blue Smoke,
-- Buttercream, Fog, Onyx, Pacific Sand, Saddle, White, Willow).
--
-- The 9 Demo/SM crown/baseboard rows have `is_painted=true` but are actually
-- molding profile changes, not paint — their names don't match any kitchen
-- twin so they're untouched by this join and fall through to swatch_textured
-- in step 3d via swatch_url presence.
WITH kitchen_hex AS (
  SELECT c.org_id, o.name, MIN(o.swatch_color) AS hex
  FROM options o
  JOIN subcategories sc ON o.subcategory_id = sc.id
  JOIN categories c ON sc.category_id = c.id
  WHERE sc.slug IN ('kitchen-cabinet-color','kitchen-island-cabinet-color')
    AND o.swatch_color IS NOT NULL
  GROUP BY c.org_id, o.name
)
UPDATE options pb
SET swatch_color = kh.hex
FROM kitchen_hex kh, subcategories pbsc, categories pbc
WHERE pb.subcategory_id = pbsc.id
  AND pbsc.category_id = pbc.id
  AND pbc.org_id = kh.org_id
  AND pb.name = kh.name
  AND pb.swatch_color IS NULL
  AND pb.is_painted = TRUE;

-- Step 2. Add the column.
ALTER TABLE options
  ADD COLUMN IF NOT EXISTS render_mode TEXT
  CHECK (render_mode IN ('hex_paint', 'hex_stain', 'swatch_metallic', 'swatch_textured'));

-- Step 3. Backfill. Order matters — later UPDATEs only touch rows still NULL.

-- 3a. hex_paint: the old `is_painted = true` + hex rows.
UPDATE options
SET render_mode = 'hex_paint'
WHERE is_painted = TRUE
  AND swatch_color IS NOT NULL
  AND render_mode IS NULL;

-- 3b. hex_stain: cabinet- or vanity-family subs whose option names match
-- stain keywords AND carry a swatch_color hex. Rendered via hex + "wood
-- grain" verb; no swatch image (lab-validated 2026-04-13 on Nest kitchen,
-- see D101). `%vanity%` picks up powder-room-vanity and friends where the
-- sub slug says "vanity" not "cabinet".
UPDATE options o
SET render_mode = 'hex_stain'
FROM subcategories sc
WHERE o.subcategory_id = sc.id
  AND (sc.slug ILIKE '%cabinet%' OR sc.slug ILIKE '%vanity%')
  AND o.swatch_color IS NOT NULL
  AND o.render_mode IS NULL
  AND (
    o.name ILIKE '%stain%' OR o.name ILIKE '%wood%' OR o.name ILIKE '%oak%'
    OR o.name ILIKE '%walnut%' OR o.name ILIKE '%cherry%' OR o.name ILIKE '%maple%'
    OR o.name ILIKE '%mahog%' OR o.name ILIKE '%driftwood%' OR o.name ILIKE '%espresso%'
    OR o.name ILIKE '%cappucino%' OR o.name ILIKE '%sahara%'
  );

-- 3c. swatch_metallic: subs whose slug matches the fixture patterns (kept in
-- sync with FIXTURE_PATTERNS in src/lib/step-config.ts). Metallic finishes
-- need the swatch image to carry sheen; the bare D102 hex anchor would flatten
-- them to paint RGB.
UPDATE options o
SET render_mode = 'swatch_metallic'
FROM subcategories sc
WHERE o.subcategory_id = sc.id
  AND o.swatch_url IS NOT NULL
  AND o.render_mode IS NULL
  AND (
    sc.slug ~ '(hardware|faucet|sink|lighting|fan|refrigerator|range|dishwasher)'
  );

-- 3d. swatch_textured: anything else with a swatch URL. Rendered via image
-- reference with optional inline hex anchor (D102 pattern).
UPDATE options
SET render_mode = 'swatch_textured'
WHERE swatch_url IS NOT NULL
  AND render_mode IS NULL;

-- Step 4. Drop the old flag. No admin UI reader; only the prose builder and
-- db-query mappers consume it, and those are updated in the same PR. Keeping
-- it would let the two columns drift.
ALTER TABLE options DROP COLUMN IF EXISTS is_painted;
