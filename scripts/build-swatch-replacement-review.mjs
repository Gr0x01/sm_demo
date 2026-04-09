#!/usr/bin/env node
/**
 * Build a side-by-side review HTML comparing each flagged SM swatch with the
 * candidate replacement the research subagents found.
 *
 * Reads:
 *   tmp/sm-swatches-manifest.json        — full SM catalog
 *   tmp/swatch-visual-review-flat.json   — flag reasons
 *   tmp/swatch-replacement-batches/*-results.json  — per-batch replacement candidates
 *   tmp/sm-swatches/{optionId}.jpg       — current bad swatches (local copies)
 *   tmp/swatch-replacements/{optionId}.jpg — candidate replacements (local copies)
 *
 * Writes:
 *   tmp/swatch-replacements.html
 */
import fs from "fs";
import path from "path";

const __dirname = new URL(".", import.meta.url).pathname;
const ROOT = path.join(__dirname, "..");
const MANIFEST = path.join(ROOT, "tmp", "sm-swatches-manifest.json");
const REVIEW = path.join(ROOT, "tmp", "swatch-visual-review-flat.json");
const RESULTS_DIR = path.join(ROOT, "tmp", "swatch-replacement-batches");
const CURRENT_DIR = path.join(ROOT, "tmp", "sm-swatches");
const REPLACEMENTS_DIR = path.join(ROOT, "tmp", "swatch-replacements");
const OUT_PATH = path.join(ROOT, "tmp", "swatch-replacements.html");

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const review = JSON.parse(fs.readFileSync(REVIEW, "utf8"));

// Load all results files ({brand}-results.json)
const candidates = {}; // optionId -> { brand, sourceUrl, notes, tilesVisible, status }
for (const file of fs.readdirSync(RESULTS_DIR)) {
  if (!file.endsWith("-results.json")) continue;
  const brand = file.replace(/-results\.json$/, "");
  const parsed = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), "utf8"));
  // Handle both bare arrays and {composites: [...]} wrappers
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.composites)
      ? parsed.composites
      : [];
  for (const r of rows) {
    if (!r.optionId) continue;
    // Later files override earlier ones — composites should override wall-only
    candidates[r.optionId] = { ...r, brand };
  }
}

// Build lookup for SM items that were flagged
const flagged = manifest
  .filter((m) => review[m.optionId])
  .map((m) => {
    const visual = review[m.optionId];
    const candidate = candidates[m.optionId] || null;
    return { ...m, visual, candidate };
  });

// Group by category → subcategory (preserve manifest order which is cat/sub/option sort_order)
const byCat = new Map();
for (const row of flagged) {
  if (!byCat.has(row.category)) byCat.set(row.category, new Map());
  const subs = byCat.get(row.category);
  if (!subs.has(row.subcategory)) subs.set(row.subcategory, []);
  subs.get(row.subcategory).push(row);
}

// Paths in the HTML are relative to tmp/, so we reference them as ./sm-swatches/... / ./swatch-replacements/...
function currentRel(optionId) {
  // The sm-swatches file might be any extension (most are .jpg). Check what's there.
  for (const ext of ["jpg", "jpeg", "png", "webp", "svg"]) {
    const p = path.join(CURRENT_DIR, `${optionId}.${ext}`);
    if (fs.existsSync(p)) return `./sm-swatches/${optionId}.${ext}`;
  }
  return null;
}

function replacementRel(optionId) {
  const p = path.join(REPLACEMENTS_DIR, `${optionId}.jpg`);
  if (fs.existsSync(p)) return `./swatch-replacements/${optionId}.jpg`;
  return null;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const totals = {
  flagged: flagged.length,
  withCandidate: flagged.filter((r) => replacementRel(r.optionId)).length,
  needsResearch: 0,
};
totals.needsResearch = totals.flagged - totals.withCandidate;

const bits = [];
bits.push(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>SM Swatch Replacements — Side-by-Side Review</title>
<style>
  body { font: 14px -apple-system, system-ui, sans-serif; margin: 0; padding: 24px; background: #f5f5f5; color: #111; }
  header { position: sticky; top: 0; background: #fff; border: 1px solid #ddd; padding: 16px 20px; margin-bottom: 24px; z-index: 10; }
  h1 { margin: 0 0 8px; font-size: 18px; }
  .summary { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: #444; }
  .pill { background: #eee; padding: 4px 10px; border: 1px solid #ccc; }
  .pill.good { background: #e6f4ea; border-color: #4a8; color: #063; }
  .pill.bad { background: #fee; border-color: #f99; color: #900; }
  .filters { margin-top: 12px; display: flex; gap: 8px; font-size: 13px; }
  .filters button { padding: 4px 12px; border: 1px solid #999; background: #fff; cursor: pointer; }
  .filters button.active { background: #222; color: #fff; }
  h2 { font-size: 16px; margin: 32px 0 4px; padding-bottom: 4px; border-bottom: 2px solid #333; }
  h3 { font-size: 14px; margin: 16px 0 8px; color: #333; }
  .row { display: grid; grid-template-columns: 260px 24px 260px 1fr; gap: 16px; align-items: stretch; background: #fff; border: 1px solid #ddd; padding: 12px; margin-bottom: 12px; }
  .row.no-candidate { background: #fafafa; border-style: dashed; }
  .row.approved { background: #f0fbf2; border-color: #6a6; }
  .row.rejected { background: #fafafa; border-color: #aaa; opacity: 0.5; }
  .side { display: flex; flex-direction: column; gap: 6px; }
  .side .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; font-weight: 700; }
  .side.current .label { color: #900; }
  .side.replacement .label { color: #063; }
  .side img { width: 100%; aspect-ratio: 1 / 1; object-fit: contain; background: #fafafa; border: 1px solid #eee; cursor: zoom-in; }
  .side .meta { font-size: 11px; color: #777; font-family: ui-monospace, Menlo, monospace; }
  .arrow { display: flex; align-items: center; justify-content: center; font-size: 20px; color: #999; }
  .info { display: flex; flex-direction: column; gap: 6px; }
  .info .name { font-weight: 600; font-size: 13px; }
  .info .path { font-size: 11px; color: #888; font-family: ui-monospace, Menlo, monospace; }
  .info .reason { font-size: 12px; color: #900; background: #fff0f0; border-left: 3px solid #900; padding: 6px 8px; font-style: italic; }
  .info .notes { font-size: 12px; color: #063; background: #f0fbf2; border-left: 3px solid #063; padding: 6px 8px; }
  .info .source { font-size: 11px; }
  .info .source a { color: #06c; text-decoration: none; }
  .info .source a:hover { text-decoration: underline; }
  .actions { display: flex; gap: 6px; margin-top: auto; }
  .btn { padding: 4px 12px; border: 1px solid #999; background: #fff; cursor: pointer; font-size: 12px; }
  .btn.approve { border-color: #4a8; color: #063; }
  .btn.reject { border-color: #d66; color: #900; }
  .btn.active-approve { background: #4a8; color: #fff; }
  .btn.active-reject { background: #d66; color: #fff; }
  .badge { font-size: 10px; padding: 2px 6px; background: #ddd; color: #333; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; }
  .badge.critical { background: #900; color: #fff; }
  .badge.concern { background: #d60; color: #fff; }
  .badge.needs-review { background: #d60; color: #fff; }
  .badge.found { background: #4a8; color: #fff; }
  .no-candidate .arrow::before { content: "—"; }
  .hidden { display: none !important; }
  .export-bar { position: fixed; bottom: 20px; right: 20px; background: #222; color: #fff; padding: 12px 20px; border: 1px solid #000; cursor: pointer; font-size: 13px; }
  .export-bar:hover { background: #000; }
</style>
</head>
<body>
<header>
  <h1>Stone Martin Swatch Replacements — Side-by-Side Review</h1>
  <div class="summary">
    <span class="pill">${totals.flagged} flagged total</span>
    <span class="pill good">${totals.withCandidate} with candidate replacement</span>
    <span class="pill ${totals.needsResearch > 0 ? "bad" : ""}">${totals.needsResearch} still need research</span>
  </div>
  <div class="filters">
    <button data-filter="all" class="active">All</button>
    <button data-filter="with-candidate">With candidate</button>
    <button data-filter="no-candidate">No candidate</button>
    <button data-filter="unreviewed">Unreviewed</button>
    <button data-filter="approved">Approved</button>
  </div>
</header>
`);

for (const [cat, subs] of byCat) {
  bits.push(`<h2>${escapeHtml(cat)}</h2>`);
  for (const [sub, items] of subs) {
    const withCand = items.filter((i) => replacementRel(i.optionId)).length;
    bits.push(
      `<h3>${escapeHtml(sub)} <span style="font-weight:normal;color:#888">(${items.length} flagged, ${withCand} with candidate)</span></h3>`,
    );
    for (const item of items) {
      const currentUrl = currentRel(item.optionId) || "";
      const replacementUrl = replacementRel(item.optionId);
      const hasCandidate = !!replacementUrl;
      const cls = "row" + (hasCandidate ? "" : " no-candidate");
      const severityBadge = `<span class="badge ${item.visual.severity}">${item.visual.severity}</span>`;
      const statusBadge = item.candidate?.status
        ? `<span class="badge ${item.candidate.status === "found" ? "found" : "needs-review"}">${item.candidate.status}</span>`
        : "";

      bits.push(`<div class="${cls}" data-optionid="${escapeHtml(item.optionId)}" data-hascandidate="${hasCandidate}">`);
      // Current
      bits.push(`  <div class="side current">`);
      bits.push(`    <span class="label">Current</span>`);
      if (currentUrl) {
        bits.push(`    <a href="${escapeHtml(currentUrl)}" target="_blank"><img src="${escapeHtml(currentUrl)}" loading="lazy" alt=""></a>`);
      } else {
        bits.push(`    <div style="width:100%;aspect-ratio:1/1;background:#fafafa;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;color:#999;font-size:11px">no local copy</div>`);
      }
      bits.push(`    <div class="meta">${escapeHtml(item.optionSlug)}</div>`);
      bits.push(`  </div>`);
      // Arrow
      bits.push(`  <div class="arrow">${hasCandidate ? "→" : ""}</div>`);
      // Replacement
      bits.push(`  <div class="side replacement">`);
      bits.push(`    <span class="label">Candidate</span>`);
      if (replacementUrl) {
        bits.push(`    <a href="${escapeHtml(replacementUrl)}" target="_blank"><img src="${escapeHtml(replacementUrl)}" loading="lazy" alt=""></a>`);
      } else {
        bits.push(`    <div style="width:100%;aspect-ratio:1/1;background:#fafafa;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;color:#999;font-size:11px">no candidate yet</div>`);
      }
      if (item.candidate?.tilesVisible) {
        bits.push(`    <div class="meta">${item.candidate.tilesVisible} tiles visible</div>`);
      } else if (item.candidate?.planksVisible) {
        bits.push(`    <div class="meta">${item.candidate.planksVisible} planks visible</div>`);
      }
      bits.push(`  </div>`);
      // Info
      bits.push(`  <div class="info">`);
      bits.push(`    <div class="name">${escapeHtml(item.optionName)} ${severityBadge} ${statusBadge}</div>`);
      bits.push(`    <div class="reason"><strong>Why flagged:</strong> ${escapeHtml(item.visual.reason)}</div>`);
      if (item.candidate?.notes) {
        bits.push(`    <div class="notes"><strong>Research notes:</strong> ${escapeHtml(item.candidate.notes)}</div>`);
      }
      if (item.candidate?.sourceUrl) {
        bits.push(`    <div class="source"><strong>Source:</strong> <a href="${escapeHtml(item.candidate.sourceUrl)}" target="_blank">${escapeHtml(item.candidate.sourceUrl)}</a></div>`);
      }
      bits.push(`    <div class="path">${escapeHtml(item.optionId)}</div>`);
      if (hasCandidate) {
        bits.push(`    <div class="actions">`);
        bits.push(`      <button class="btn approve" data-action="approve">Approve</button>`);
        bits.push(`      <button class="btn reject" data-action="reject">Reject</button>`);
        bits.push(`    </div>`);
      }
      bits.push(`  </div>`);
      bits.push(`</div>`);
    }
  }
}

bits.push(`
<div class="export-bar" id="export-btn">Export approvals (0 / ${totals.withCandidate})</div>
<script>
  const STORAGE_KEY = "sm_swatch_decisions_v1";
  const decisions = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

  // Restore state
  document.querySelectorAll(".row").forEach((row) => {
    const id = row.dataset.optionid;
    const d = decisions[id];
    if (d === "approve") { row.classList.add("approved"); row.querySelector('[data-action="approve"]')?.classList.add("active-approve"); }
    else if (d === "reject") { row.classList.add("rejected"); row.querySelector('[data-action="reject"]')?.classList.add("active-reject"); }
  });

  function updateExportBtn() {
    const approved = Object.values(decisions).filter((v) => v === "approve").length;
    document.getElementById("export-btn").textContent = \`Export approvals (\${approved} / ${totals.withCandidate})\`;
  }
  updateExportBtn();

  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const row = btn.closest(".row");
      const id = row.dataset.optionid;
      const action = btn.dataset.action;
      if (decisions[id] === action) { delete decisions[id]; } else { decisions[id] = action; }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));

      row.classList.remove("approved", "rejected");
      row.querySelectorAll(".btn").forEach((b) => b.classList.remove("active-approve", "active-reject"));
      if (decisions[id] === "approve") { row.classList.add("approved"); row.querySelector('[data-action="approve"]').classList.add("active-approve"); }
      else if (decisions[id] === "reject") { row.classList.add("rejected"); row.querySelector('[data-action="reject"]').classList.add("active-reject"); }
      updateExportBtn();
    });
  });

  // Filters
  const buttons = document.querySelectorAll(".filters button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;
      document.querySelectorAll(".row").forEach((row) => {
        const hasCand = row.dataset.hascandidate === "true";
        const d = decisions[row.dataset.optionid];
        let show = true;
        if (filter === "with-candidate") show = hasCand;
        else if (filter === "no-candidate") show = !hasCand;
        else if (filter === "unreviewed") show = hasCand && !d;
        else if (filter === "approved") show = d === "approve";
        row.classList.toggle("hidden", !show);
      });
      document.querySelectorAll("h3").forEach((h) => {
        let n = h.nextElementSibling;
        let any = false;
        while (n && n.tagName === "DIV" && n.classList.contains("row")) {
          if (!n.classList.contains("hidden")) { any = true; break; }
          n = n.nextElementSibling;
        }
        h.classList.toggle("hidden", !any);
      });
      document.querySelectorAll("h2").forEach((h) => {
        let n = h.nextElementSibling;
        let any = false;
        while (n && n.tagName !== "H2") {
          if ((n.tagName === "H3" || n.classList.contains("row")) && !n.classList.contains("hidden")) { any = true; break; }
          n = n.nextElementSibling;
        }
        h.classList.toggle("hidden", !any);
      });
    });
  });

  // Export approvals as JSON
  document.getElementById("export-btn").addEventListener("click", () => {
    const approved = Object.entries(decisions).filter(([, v]) => v === "approve").map(([k]) => k);
    const rejected = Object.entries(decisions).filter(([, v]) => v === "reject").map(([k]) => k);
    const blob = new Blob([JSON.stringify({ approved, rejected }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "swatch-decisions.json";
    a.click();
  });
</script>
</body>
</html>`);

fs.writeFileSync(OUT_PATH, bits.join("\n"), "utf-8");
console.log(`Wrote ${OUT_PATH}`);
console.log(`  ${totals.flagged} flagged, ${totals.withCandidate} with candidate, ${totals.needsResearch} still need research`);
console.log(`\nOpen with:  open ${OUT_PATH}`);
