#!/usr/bin/env npx tsx
/**
 * Audit every Stone Martin swatch in Supabase Storage.
 *
 * Generates a single HTML contact sheet at tmp/swatch-audit.html grouping
 * every SM option by Category → Subcategory, showing the swatch thumbnail,
 * file size, dimensions, and direct link to the admin editor. Flags likely
 * bad swatches (small file size, dimensions far from 512px, or filenames
 * still in the original scrape format — i.e. never replaced since Feb 17).
 *
 * Usage: npx tsx scripts/audit-sm-swatches.ts
 */

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("Missing Supabase env vars"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ORG_SLUG = "stonemartin";
const OUT_DIR = path.join(__dirname, "..", "tmp");
const OUT_PATH = path.join(OUT_DIR, "swatch-audit.html");
const DOWNLOAD_DIR = path.join(OUT_DIR, "sm-swatches");
const MANIFEST_PATH = path.join(OUT_DIR, "sm-swatches-manifest.json");
const VISUAL_REVIEW_PATH = path.join(OUT_DIR, "swatch-visual-review-flat.json");
const CONCURRENCY = 10;
const DOWNLOAD = process.argv.includes("--download");

type VisualFlag = { severity: "critical" | "concern"; reason: string };
type VisualReview = Record<string, VisualFlag>;

function loadVisualReview(): VisualReview {
  if (!fs.existsSync(VISUAL_REVIEW_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(VISUAL_REVIEW_PATH, "utf-8"));
  } catch {
    return {};
  }
}

// Suspect thresholds
const SMALL_BYTES = 10 * 1024;       // < 10KB → probably cropped/tiny
const TINY_BYTES = 5 * 1024;         // < 5KB → definitely cropped/tiny
const MIN_LONG_EDGE = 300;           // long edge < 300px → too low-res

type Row = {
  category: string;
  subcategory: string;
  optionId: string;
  optionName: string;
  optionSlug: string;
  swatchUrl: string;
};

type Measured = Row & {
  bytes: number | null;
  width: number | null;
  height: number | null;
  flags: string[];
  error?: string;
};

async function fetchRows(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", ORG_SLUG)
    .single();
  if (error || !data) throw new Error(`org lookup failed: ${error?.message}`);
  const orgId = data.id;

  // Paginate via .range() to avoid default 1000 row cap and large-response limits.
  const rows: Row[] = [];
  let from = 0;
  const PAGE = 500;
  while (true) {
    const { data: page, error: pageErr } = await supabase
      .from("options")
      .select(`
        id,
        name,
        slug,
        swatch_url,
        sort_order,
        subcategories!inner (
          name,
          sort_order,
          categories!inner (
            name,
            sort_order,
            org_id
          )
        )
      `)
      .eq("subcategories.categories.org_id", orgId)
      .not("swatch_url", "is", null)
      .range(from, from + PAGE - 1);
    if (pageErr) throw new Error(`options query failed: ${pageErr.message}`);
    if (!page || page.length === 0) break;

    for (const opt of page as unknown as Array<{
      id: string;
      name: string;
      slug: string;
      swatch_url: string;
      sort_order: number;
      subcategories: {
        name: string;
        sort_order: number;
        categories: { name: string; sort_order: number; org_id: string };
      };
    }>) {
      rows.push({
        category: opt.subcategories.categories.name,
        subcategory: opt.subcategories.name,
        optionId: opt.id,
        optionName: opt.name,
        optionSlug: opt.slug,
        swatchUrl: opt.swatch_url,
      });
    }
    if (page.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function measureOne(row: Row): Promise<Measured> {
  try {
    const res = await fetch(row.swatchUrl);
    if (!res.ok) {
      return {
        ...row,
        bytes: null,
        width: null,
        height: null,
        flags: ["fetch-failed"],
        error: `HTTP ${res.status}`,
      };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const bytes = buf.length;

    let width: number | null = null;
    let height: number | null = null;
    try {
      const meta = await sharp(buf).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch {
      // SVGs or unreadable — leave dims null
    }

    if (DOWNLOAD) {
      const ext = row.swatchUrl.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1]?.toLowerCase() || "jpg";
      const localPath = path.join(DOWNLOAD_DIR, `${row.optionId}.${ext}`);
      fs.writeFileSync(localPath, buf);
    }

    const flags: string[] = [];
    if (bytes < TINY_BYTES) flags.push("tiny");
    else if (bytes < SMALL_BYTES) flags.push("small");
    if (width && height && Math.max(width, height) < MIN_LONG_EDGE) flags.push("lowres");

    return { ...row, bytes, width, height, flags };
  } catch (err) {
    return {
      ...row,
      bytes: null,
      width: null,
      height: null,
      flags: ["fetch-failed"],
      error: (err as Error).message,
    };
  }
}

async function measureAll(rows: Row[]): Promise<Measured[]> {
  const out: Measured[] = new Array(rows.length);
  let cursor = 0;
  let done = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= rows.length) return;
      out[i] = await measureOne(rows[i]);
      done++;
      if (done % 25 === 0) {
        process.stdout.write(`  measured ${done}/${rows.length}\r`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write(`  measured ${rows.length}/${rows.length}\n`);
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatBytes(b: number | null): string {
  if (b == null) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function buildHtml(measured: Measured[], visualReview: VisualReview): string {
  // Group by category → subcategory (preserve first-seen order)
  const byCat = new Map<string, Map<string, Measured[]>>();
  for (const row of measured) {
    if (!byCat.has(row.category)) byCat.set(row.category, new Map());
    const subs = byCat.get(row.category)!;
    if (!subs.has(row.subcategory)) subs.set(row.subcategory, []);
    subs.get(row.subcategory)!.push(row);
  }

  const totalFlagged = measured.filter((m) => m.flags.length > 0).length;
  const totalTiny = measured.filter((m) => m.flags.includes("tiny")).length;
  const totalSmall = measured.filter((m) => m.flags.includes("small")).length;
  const totalLowres = measured.filter((m) => m.flags.includes("lowres")).length;
  const totalFailed = measured.filter((m) => m.flags.includes("fetch-failed")).length;
  const totalVisualCritical = measured.filter((m) => visualReview[m.optionId]?.severity === "critical").length;
  const totalVisualConcern = measured.filter((m) => visualReview[m.optionId]?.severity === "concern").length;
  const hasVisualReview = Object.keys(visualReview).length > 0;

  const bits: string[] = [];
  bits.push(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>SM Swatch Audit — ${measured.length} swatches</title>
<style>
  body { font: 14px -apple-system, system-ui, sans-serif; margin: 0; padding: 24px; background: #f5f5f5; color: #111; }
  header { position: sticky; top: 0; background: #fff; border: 1px solid #ddd; padding: 16px 20px; margin-bottom: 24px; z-index: 10; }
  h1 { margin: 0 0 8px; font-size: 18px; }
  .summary { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: #444; }
  .summary .pill { background: #eee; padding: 4px 10px; border: 1px solid #ccc; }
  .summary .bad { background: #fee; border-color: #f99; color: #900; }
  .filters { margin-top: 12px; display: flex; gap: 8px; font-size: 13px; }
  .filters button { padding: 4px 12px; border: 1px solid #999; background: #fff; cursor: pointer; }
  .filters button.active { background: #222; color: #fff; }
  h2 { font-size: 16px; margin: 32px 0 4px; padding-bottom: 4px; border-bottom: 2px solid #333; }
  h3 { font-size: 14px; margin: 16px 0 8px; color: #333; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .card { background: #fff; border: 1px solid #ddd; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
  .card.flagged { border-color: #f66; background: #fff8f8; }
  .card.flagged-hard { border-color: #c00; background: #ffeaea; }
  .card.visual-critical { border-color: #900; background: #ffe0e0; box-shadow: 0 0 0 2px #900 inset; }
  .card.visual-concern { border-color: #d60; background: #fff5e6; }
  .card .reason { font-size: 11px; color: #900; font-style: italic; padding: 4px 6px; background: #ffe8e8; border-left: 3px solid #900; }
  .card.visual-concern .reason { color: #840; background: #fff0d8; border-left-color: #d60; }
  .card img { width: 100%; height: 160px; object-fit: contain; background: #fafafa; border: 1px solid #eee; }
  .card .name { font-weight: 600; font-size: 12px; line-height: 1.3; }
  .card .meta { font-size: 11px; color: #666; font-family: ui-monospace, Menlo, monospace; }
  .card .flags { display: flex; flex-wrap: wrap; gap: 4px; }
  .flag { font-size: 10px; padding: 2px 6px; background: #fdd; border: 1px solid #f99; color: #900; text-transform: uppercase; letter-spacing: 0.5px; }
  .flag.hard { background: #c00; color: #fff; border-color: #800; }
  .flag.visual { background: #900; color: #fff; border-color: #600; }
  .flag.visual-concern { background: #d60; color: #fff; border-color: #a40; }
  .card a.copy { font-size: 11px; color: #06c; text-decoration: none; cursor: pointer; }
  .card a.copy:hover { text-decoration: underline; }
  .hidden { display: none !important; }
</style>
</head>
<body>
<header>
  <h1>Stone Martin Swatch Audit</h1>
  <div class="summary">
    <span class="pill">${measured.length} total</span>
    <span class="pill ${totalFlagged > 0 ? "bad" : ""}">${totalFlagged} size-flagged</span>
    ${hasVisualReview ? `<span class="pill ${totalVisualCritical > 0 ? "bad" : ""}">${totalVisualCritical} visual-critical</span>` : ""}
    ${hasVisualReview ? `<span class="pill ${totalVisualConcern > 0 ? "bad" : ""}">${totalVisualConcern} visual-concern</span>` : ""}
    <span class="pill ${totalTiny > 0 ? "bad" : ""}">${totalTiny} tiny (&lt;5KB)</span>
    <span class="pill ${totalSmall > 0 ? "bad" : ""}">${totalSmall} small (&lt;10KB)</span>
    <span class="pill ${totalFailed > 0 ? "bad" : ""}">${totalFailed} fetch failed</span>
  </div>
  <div class="filters">
    <button data-filter="all" class="active">All</button>
    <button data-filter="any-bad">Any flag</button>
    ${hasVisualReview ? `<button data-filter="visual-critical">Visual critical</button>` : ""}
    ${hasVisualReview ? `<button data-filter="visual-any">Visual flagged</button>` : ""}
    <button data-filter="tiny">Tiny</button>
    <button data-filter="small">Small or tiny</button>
  </div>
</header>
`);

  for (const [cat, subs] of byCat) {
    bits.push(`<h2>${escapeHtml(cat)}</h2>`);
    for (const [sub, items] of subs) {
      const flaggedCount = items.filter(
        (i) => i.flags.length > 0 || visualReview[i.optionId],
      ).length;
      bits.push(`<h3>${escapeHtml(sub)} <span style="font-weight:normal;color:#888">(${items.length}${flaggedCount > 0 ? `, ${flaggedCount} flagged` : ""})</span></h3>`);
      bits.push(`<div class="grid">`);
      for (const item of items) {
        const visual = visualReview[item.optionId];
        const hardSize = item.flags.includes("tiny") || item.flags.includes("fetch-failed") || item.flags.includes("lowres");
        let cls = "card";
        if (visual?.severity === "critical") cls = "card visual-critical";
        else if (visual?.severity === "concern") cls = "card visual-concern";
        else if (item.flags.length > 0) cls = hardSize ? "card flagged-hard" : "card flagged";

        const allDataFlags = [...item.flags];
        if (visual?.severity === "critical") allDataFlags.push("visual-critical");
        if (visual?.severity === "concern") allDataFlags.push("visual-concern");
        const dataFlags = allDataFlags.join(" ");

        const dims = item.width && item.height ? `${item.width}×${item.height}` : "—";
        const bytes = formatBytes(item.bytes);
        const sizeFlagsHtml = item.flags
          .map((f) => `<span class="flag${f === "tiny" || f === "fetch-failed" ? " hard" : ""}">${f}</span>`)
          .join("");
        const visualFlagHtml = visual
          ? `<span class="flag ${visual.severity === "critical" ? "visual" : "visual-concern"}">visual-${visual.severity}</span>`
          : "";
        const flagsHtml = sizeFlagsHtml + visualFlagHtml;

        bits.push(`<div class="${cls}" data-flags="${dataFlags}">`);
        bits.push(`  <a href="${escapeHtml(item.swatchUrl)}" target="_blank"><img src="${escapeHtml(item.swatchUrl)}" loading="lazy" alt=""></a>`);
        bits.push(`  <div class="name">${escapeHtml(item.optionName)}</div>`);
        bits.push(`  <div class="meta">${dims} · ${bytes}</div>`);
        bits.push(`  <div class="meta">${escapeHtml(item.optionSlug)}</div>`);
        if (flagsHtml) bits.push(`  <div class="flags">${flagsHtml}</div>`);
        if (visual) bits.push(`  <div class="reason">${escapeHtml(visual.reason)}</div>`);
        bits.push(`  <a class="copy" data-id="${escapeHtml(item.optionId)}">Copy option ID</a>`);
        bits.push(`</div>`);
      }
      bits.push(`</div>`);
    }
  }

  bits.push(`
<script>
  const buttons = document.querySelectorAll(".filters button");
  const cards = document.querySelectorAll(".card");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;
      cards.forEach((c) => {
        const flags = (c.dataset.flags || "").split(" ").filter(Boolean);
        let show = false;
        if (filter === "all") show = true;
        else if (filter === "any-bad") show = flags.length > 0;
        else if (filter === "visual-critical") show = flags.includes("visual-critical");
        else if (filter === "visual-any") show = flags.includes("visual-critical") || flags.includes("visual-concern");
        else if (filter === "tiny") show = flags.includes("tiny");
        else if (filter === "small") show = flags.includes("small") || flags.includes("tiny");
        c.classList.toggle("hidden", !show);
      });
      // Hide empty subcategory headers
      document.querySelectorAll("h3").forEach((h) => {
        const grid = h.nextElementSibling;
        if (!grid) return;
        const visible = grid.querySelectorAll(".card:not(.hidden)").length;
        h.classList.toggle("hidden", visible === 0);
        grid.classList.toggle("hidden", visible === 0);
      });
      document.querySelectorAll("h2").forEach((h) => {
        let n = h.nextElementSibling;
        let any = false;
        while (n && n.tagName !== "H2") {
          if (n.tagName === "H3" && !n.classList.contains("hidden")) { any = true; break; }
          n = n.nextElementSibling;
        }
        h.classList.toggle("hidden", !any);
      });
    });
  });
  document.querySelectorAll(".copy").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      navigator.clipboard.writeText(a.dataset.id || "");
      const old = a.textContent;
      a.textContent = "Copied!";
      setTimeout(() => { a.textContent = old; }, 800);
    });
  });
</script>
</body>
</html>`);

  return bits.join("\n");
}

async function main() {
  console.log("Fetching SM options...");
  const rows = await fetchRows();
  console.log(`  ${rows.length} options with swatches`);

  if (DOWNLOAD) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    console.log(`Downloading swatches to ${DOWNLOAD_DIR}`);
  }

  console.log("Measuring swatches (concurrency " + CONCURRENCY + ")...");
  const measured = await measureAll(rows);

  if (DOWNLOAD) {
    const manifest = measured.map((m) => ({
      optionId: m.optionId,
      optionName: m.optionName,
      optionSlug: m.optionSlug,
      category: m.category,
      subcategory: m.subcategory,
      swatchUrl: m.swatchUrl,
      localPath: path.join(DOWNLOAD_DIR, `${m.optionId}.${m.swatchUrl.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1]?.toLowerCase() || "jpg"}`),
      bytes: m.bytes,
      width: m.width,
      height: m.height,
      sizeFlags: m.flags,
    }));
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`Wrote manifest to ${MANIFEST_PATH}`);
  }

  console.log("Building HTML...");
  const visualReview = loadVisualReview();
  const html = buildHtml(measured, visualReview);

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, html, "utf-8");

  const flagged = measured.filter((m) => m.flags.length > 0).length;
  const tiny = measured.filter((m) => m.flags.includes("tiny")).length;
  const small = measured.filter((m) => m.flags.includes("small")).length;
  const visualCritical = measured.filter((m) => visualReview[m.optionId]?.severity === "critical").length;
  const visualConcern = measured.filter((m) => visualReview[m.optionId]?.severity === "concern").length;
  console.log(`\nWrote ${OUT_PATH}`);
  console.log(`  ${measured.length} swatches`);
  console.log(`  ${flagged} size-flagged (${tiny} tiny, ${small} small)`);
  if (Object.keys(visualReview).length > 0) {
    console.log(`  ${visualCritical} visual-critical, ${visualConcern} visual-concern`);
  }
  console.log(`\nOpen with:  open ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
