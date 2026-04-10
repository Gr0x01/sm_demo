/**
 * Cross-tenant bleed audit.
 *
 * Given two org slugs (primary + other), verify that no row belonging to the
 * primary org embeds any reference to the other org's id, storage prefix, or
 * shared resources. Exits non-zero if any bleed is found.
 *
 * Usage:
 *   npx tsx scripts/audit-tenant-bleed.ts --primary demo --other stonemartin
 *   npx tsx scripts/audit-tenant-bleed.ts --primary demo --other stonemartin --verbose
 *
 * This script is the authoritative verifier for the Demo↔SM tenant split
 * (see memory-bank/project/swatch-storage-contract.md). Extend it whenever a
 * new path-bearing column is added — do not trust a manual check.
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── CLI args ────────────────────────────────────────────────────────────────

function getArg(name: string, fallback?: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing --${name} argument`);
}
const verbose = process.argv.includes("--verbose");
const primarySlug = getArg("primary", "demo");
const otherSlug = getArg("other", "stonemartin");

// ── Types ───────────────────────────────────────────────────────────────────

interface Finding {
  check: string;
  count: number;
  rows: Array<{ id: string; label: string; value?: string }>;
}

const findings: Finding[] = [];

function recordFinding(check: string, rows: Array<{ id: string; label: string; value?: string }>) {
  findings.push({ check, count: rows.length, rows });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== TENANT BLEED AUDIT ===`);
  console.log(`Primary: ${primarySlug}`);
  console.log(`Other:   ${otherSlug}\n`);

  // Resolve org IDs
  const { data: orgs, error: orgsErr } = await s
    .from("organizations")
    .select("id, slug")
    .in("slug", [primarySlug, otherSlug]);
  if (orgsErr || !orgs) throw new Error(`Failed to load orgs: ${orgsErr?.message}`);
  const primary = orgs.find((o) => o.slug === primarySlug);
  const other = orgs.find((o) => o.slug === otherSlug);
  if (!primary) throw new Error(`Primary org not found: ${primarySlug}`);
  if (!other) throw new Error(`Other org not found: ${otherSlug}`);
  const P = primary.id;
  const O = other.id;

  // ── 1. options.swatch_url → other org path ─────────────────────────────
  {
    const { data } = await s
      .from("options")
      .select("id, name, swatch_url")
      .eq("org_id", P)
      .like("swatch_url", `%/swatches/${O}/%`);
    recordFinding(
      "options.swatch_url → other org path",
      (data || []).map((r) => ({ id: r.id, label: r.name, value: r.swatch_url || "" }))
    );
  }

  // ── 2. floorplans.cover_image_path → other org ─────────────────────────
  {
    const { data } = await s
      .from("floorplans")
      .select("id, name, cover_image_path")
      .eq("org_id", P)
      .like("cover_image_path", `${O}/%`);
    recordFinding(
      "floorplans.cover_image_path → other org",
      (data || []).map((r) => ({ id: r.id, label: r.name, value: r.cover_image_path || "" }))
    );
  }

  // ── 3. step_photos.image_path → other org ──────────────────────────────
  {
    const { data } = await s
      .from("step_photos")
      .select("id, label, image_path")
      .eq("org_id", P)
      .like("image_path", `${O}/%`);
    recordFinding(
      "step_photos.image_path → other org",
      (data || []).map((r) => ({ id: r.id, label: r.label || "", value: r.image_path || "" }))
    );
  }

  // ── 4. generated_images.image_path → other org ─────────────────────────
  {
    const { data } = await s
      .from("generated_images")
      .select("id, step_id, image_path")
      .eq("org_id", P)
      .like("image_path", `${O}/%`);
    recordFinding(
      "generated_images.image_path → other org",
      (data || []).map((r) => ({ id: r.id, label: r.step_id || "", value: r.image_path || "" }))
    );
  }

  // ── 5. pass_cache.image_path → other org ───────────────────────────────
  {
    const { data } = await s
      .from("pass_cache")
      .select("id, pass_name, image_path")
      .eq("org_id", P)
      .like("image_path", `${O}/%`);
    recordFinding(
      "pass_cache.image_path → other org",
      (data || []).map((r) => ({ id: r.id, label: r.pass_name || "", value: r.image_path || "" }))
    );
  }

  // ── 6. steps.hero_image → other org ────────────────────────────────────
  {
    const { data } = await s
      .from("steps")
      .select("id, name, hero_image")
      .eq("org_id", P)
      .like("hero_image", `%${O}%`);
    recordFinding(
      "steps.hero_image → other org id substring",
      (data || []).map((r) => ({ id: r.id, label: r.name, value: r.hero_image || "" }))
    );
  }

  // ── 7. organizations.logo_url (primary) → other org ────────────────────
  {
    const { data } = await s
      .from("organizations")
      .select("id, slug, logo_url")
      .eq("id", P)
      .like("logo_url", `%${O}%`);
    recordFinding(
      "organizations.logo_url → other org id substring",
      (data || []).map((r) => ({ id: r.id, label: r.slug, value: r.logo_url || "" }))
    );
  }

  // ── 8. steps.sections (jsonb) → other org id substring ─────────────────
  // Supabase JS doesn't support .like on a jsonb cast — pull rows and scan client-side.
  {
    const { data: rows } = await s
      .from("steps")
      .select("id, name, sections, spatial_hints")
      .eq("org_id", P);
    const hits = (rows || []).filter(
      (r: any) =>
        (r.sections && JSON.stringify(r.sections).includes(O)) ||
        (r.spatial_hints && JSON.stringify(r.spatial_hints).includes(O))
    );
    recordFinding(
      "steps.sections/spatial_hints jsonb → other org id substring",
      hits.map((r: any) => ({ id: r.id, label: r.name, value: "<jsonb contains other-org id>" }))
    );
  }

  // ── 9. step_photos.subcategory_ids → other org subcat ids ──────────────
  {
    const { data: otherSubs } = await s
      .from("subcategories")
      .select("id")
      .eq("org_id", O);
    const otherSubIds = new Set((otherSubs || []).map((r) => r.id));
    const { data: rows } = await s
      .from("step_photos")
      .select("id, label, subcategory_ids")
      .eq("org_id", P);
    const hits = (rows || []).filter((r: any) =>
      (r.subcategory_ids || []).some((id: string) => otherSubIds.has(id))
    );
    recordFinding(
      "step_photos.subcategory_ids → other org subcat ids",
      hits.map((r: any) => ({ id: r.id, label: r.label || "", value: `${r.subcategory_ids?.length || 0} subcats` }))
    );
  }

  // ── 10. floorplans.prospect_insights (jsonb) → other org ───────────────
  {
    const { data: rows } = await s
      .from("floorplans")
      .select("id, name, prospect_insights")
      .eq("org_id", P);
    const hits = (rows || []).filter(
      (r: any) => r.prospect_insights && JSON.stringify(r.prospect_insights).includes(O)
    );
    recordFinding(
      "floorplans.prospect_insights jsonb → other org id",
      hits.map((r: any) => ({ id: r.id, label: r.name, value: "<jsonb contains other-org id>" }))
    );
  }

  // ── 11. Reverse leak: other-org rows pointing at primary-org paths ─────
  {
    const { data } = await s
      .from("options")
      .select("id, name, swatch_url")
      .eq("org_id", O)
      .like("swatch_url", `%/swatches/${P}/%`);
    recordFinding(
      "REVERSE: other-org options → primary-org swatch path",
      (data || []).map((r) => ({ id: r.id, label: r.name, value: r.swatch_url || "" }))
    );
  }

  // ── 12. Shared row IDs across orgs (should be impossible) ──────────────
  {
    const [opts, subs, cats] = await Promise.all([
      s.from("options").select("id, org_id"),
      s.from("subcategories").select("id, org_id"),
      s.from("categories").select("id, org_id"),
    ]);
    const check = (label: string, rows: any[] | null) => {
      const byId = new Map<string, Set<string>>();
      for (const r of rows || []) {
        if (!byId.has(r.id)) byId.set(r.id, new Set());
        byId.get(r.id)!.add(r.org_id);
      }
      const dupes = [...byId.entries()].filter(([, orgs]) => orgs.size > 1);
      recordFinding(
        `IDs shared across orgs: ${label}`,
        dupes.map(([id, orgs]) => ({ id, label, value: `in orgs: ${[...orgs].join(", ")}` }))
      );
    };
    check("options", opts.data);
    check("subcategories", subs.data);
    check("categories", cats.data);
  }

  // ── Report ─────────────────────────────────────────────────────────────

  let totalBleed = 0;
  console.log("## RESULTS\n");
  for (const f of findings) {
    const badge = f.count === 0 ? "✓" : "✗";
    console.log(`${badge} [${f.count}] ${f.check}`);
    if (verbose || f.count > 0) {
      for (const row of f.rows.slice(0, 10)) {
        console.log(`    - ${row.label}${row.value ? ` — ${row.value.slice(0, 120)}` : ""}`);
      }
      if (f.rows.length > 10) console.log(`    ... and ${f.rows.length - 10} more`);
    }
    totalBleed += f.count;
  }

  console.log(`\n=== ${totalBleed === 0 ? "CLEAN" : "BLEED DETECTED"}: ${totalBleed} total findings ===\n`);
  if (totalBleed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
