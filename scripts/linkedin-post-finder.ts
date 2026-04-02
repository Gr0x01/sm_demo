/**
 * LinkedIn Post Finder
 * Uses ScrapingDog Google Search API to find recent LinkedIn posts
 * about topics relevant to Finch's outreach. Optionally fetches full
 * post content via ScrapingDog LinkedIn Post API.
 *
 * Usage:
 *   npx tsx scripts/linkedin-post-finder.ts [--period day|week|month] [--fetch] [--json] [--top N]
 *
 * Flags:
 *   --period   Search window (default: week)
 *   --fetch    Fetch full post content for top results
 *   --json     Output as JSON (for piping to other tools)
 *   --top N    Number of posts to fetch full content for (default: 10)
 */

import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
config({ path: ".env.local", quiet: true });

const API_KEY = process.env.SCRAPINGDOG_API_KEY;
const SEEN_FILE = join(process.cwd(), ".linkedin-seen.json");
if (!API_KEY) {
  console.error("Missing SCRAPINGDOG_API_KEY in .env.local");
  process.exit(1);
}

// --- Search queries ---

const SEARCHES = [
  `site:linkedin.com/posts "design center" ("home builder" OR "homebuilder")`,
  `site:linkedin.com/posts "design center" "selections" -"data center"`,
  `site:linkedin.com/posts ("home builder" OR "homebuilder") "upgrades" -remodel`,
  `site:linkedin.com/posts "new construction" "buyer" ("selections" OR "options" OR "upgrades")`,
  `site:linkedin.com/posts "production home" ("design" OR "sales")`,
  `site:linkedin.com/posts ("home builder" OR "homebuilder") "sales" ("buyer" OR "customer")`,
  `site:linkedin.com/posts "model home" ("builder" OR "sales")`,
  `site:linkedin.com/posts "floor plan" ("home builder" OR "homebuilder" OR "new construction")`,
  `site:linkedin.com/posts ("homebuilder" OR "home builder") ("technology" OR "software" OR "digital")`,
  `site:linkedin.com/posts "proptech" ("homebuilder" OR "home builder" OR "residential")`,
  `site:linkedin.com/posts "NAHB" ("home builder" OR "homebuilder" OR "housing starts")`,
  `site:linkedin.com/posts "Builder 100" OR "Professional Builder" OR "Builder Magazine"`,
  `site:linkedin.com/posts "Envision" ("home builder" OR "homebuilder")`,
  `site:linkedin.com/posts "Higharc" ("builder" OR "homebuilder")`,
  `site:linkedin.com/posts "Anewgo" OR "Roomored" OR "BuilderLinq"`,
];

const PERIOD_MAP: Record<string, string> = {
  day: "qdr:d",
  week: "qdr:w",
  month: "qdr:m",
};

const NOISE_PATTERNS = [
  /power\s?bi/i, /tableau/i, /dashboard builder/i, /vega dashboard/i,
  /data visualization/i, /apple industry/i, /1-mcp/i, /childfree/i,
  /garage floor/i, /hollywood/i, /innovator visa/i, /party wall surveyor/i,
  /dehumidifier/i, /remodeling academy/i, /bathroom remodel leads/i,
  /fiber internet/i, /virtual staging/i, /backyard apartment/i,
  /condemned propert/i,
];

// --- Types ---

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  date: string;
}

interface PostDetail {
  url: string;
  authorName: string;
  authorHeadline: string;
  text: string;
  reactions: number;
  comments: number;
  topComments: string[];
  date: string;
}

// --- Search ---

async function searchGoogle(query: string, tbs: string): Promise<SearchResult[]> {
  const url = new URL("https://api.scrapingdog.com/google/");
  url.searchParams.set("api_key", API_KEY!);
  url.searchParams.set("query", query);
  url.searchParams.set("results", "10");
  url.searchParams.set("country", "us");
  url.searchParams.set("tbs", tbs);

  const res = await fetch(url.toString());
  if (!res.ok) return [];

  const data = await res.json();
  return (data.organic_results || []).map((r: any) => ({
    title: r.title || "",
    link: r.link || "",
    snippet: r.snippet || "",
    date: r.date || "",
  }));
}

function dedup(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const match = r.link.match(/activity-(\d+)/);
    const key = match ? match[1] : r.link;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isOwnPost(r: SearchResult): boolean {
  return r.link.includes("/withfinch") || r.title.toLowerCase().includes("finch -");
}

function isNoise(r: SearchResult): boolean {
  const text = `${r.title} ${r.snippet}`;
  return NOISE_PATTERNS.some((p) => p.test(text));
}

function isFresh(date: string): boolean {
  const d = date.toLowerCase();
  return d.includes("hour") || d.includes("minute") || d.includes("1 day") || d.includes("2 day") || d.includes("yesterday");
}

// --- Fetch full post ---

async function fetchPost(url: string, sr: SearchResult): Promise<PostDetail | null> {
  const apiUrl = new URL("https://api.scrapingdog.com/linkedin/post");
  apiUrl.searchParams.set("api_key", API_KEY!);
  apiUrl.searchParams.set("url", url);

  const res = await fetch(apiUrl.toString());
  if (!res.ok) return null;

  const data = await res.json();
  const r = data.post_results || data;

  let text = r.text || "";
  text = text.replace(/\s{3,}/g, "\n").trim();

  const topComments = (r.comments || [])
    .slice(0, 3)
    .map((c: any) => (c.comment_text || c.text || "").replace(/\s{3,}/g, " ").trim().slice(0, 250))
    .filter(Boolean);

  return {
    url,
    authorName: r.author_name || sr.title.split("'s Post")[0].split(" - ")[0],
    authorHeadline: r.author_headline || "",
    text: text.slice(0, 2000),
    reactions: r.total_reaction_count || 0,
    comments: r.total_comment_count || 0,
    topComments,
    date: sr.date,
  };
}

// --- Seen tracking (local file) ---

function loadSeen(): Set<string> {
  try {
    if (existsSync(SEEN_FILE)) {
      const data = JSON.parse(readFileSync(SEEN_FILE, "utf-8"));
      return new Set(data.ids || []);
    }
  } catch {}
  return new Set();
}

function saveSeen(ids: Set<string>) {
  // Keep last 1000 IDs, drop older ones
  const arr = [...ids].slice(-1000);
  writeFileSync(SEEN_FILE, JSON.stringify({ ids: arr, updated: new Date().toISOString() }));
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const periodArg =
    args.find((a) => a.startsWith("--period"))?.split("=")[1] ||
    (args.includes("--period") ? args[args.indexOf("--period") + 1] : "week");
  const shouldFetch = args.includes("--fetch");
  const jsonOutput = args.includes("--json");
  const topN = args.includes("--top")
    ? parseInt(args[args.indexOf("--top") + 1]) || 10
    : 10;
  const tbs = PERIOD_MAP[periodArg] || PERIOD_MAP.week;

  if (!jsonOutput) {
    console.error(`\nSearching LinkedIn posts (past ${periodArg}) across ${SEARCHES.length} queries...\n`);
  }

  const allResults: SearchResult[] = [];

  for (let i = 0; i < SEARCHES.length; i++) {
    if (!jsonOutput) {
      const shortQuery = SEARCHES[i].replace("site:linkedin.com/posts ", "");
      process.stderr.write(`  [${i + 1}/${SEARCHES.length}] ${shortQuery.substring(0, 60)}...`);
    }

    const results = await searchGoogle(SEARCHES[i], tbs);
    allResults.push(...results);

    if (!jsonOutput) console.error(` ${results.length} results`);
    if (i < SEARCHES.length - 1) await new Promise((r) => setTimeout(r, 500));
  }

  // Dedup, filter, remove already-seen, sort fresh first
  const deduped = dedup(allResults);
  const seen = loadSeen();
  const unique = deduped
    .filter((r) => !isOwnPost(r) && !isNoise(r))
    .filter((r) => {
      const m = r.link.match(/activity-(\d+)/);
      return m ? !seen.has(m[1]) : true;
    });
  unique.sort((a, b) => (isFresh(a.date) ? 0 : 1) - (isFresh(b.date) ? 0 : 1));

  if (!shouldFetch) {
    if (jsonOutput) {
      console.log(JSON.stringify(unique, null, 2));
    } else {
      console.error(`\nFound ${unique.length} relevant posts\n`);
      const fresh = unique.filter((r) => isFresh(r.date));
      const older = unique.filter((r) => !isFresh(r.date));

      if (fresh.length > 0) {
        console.log(`--- FRESH (last 2 days) ---\n`);
        fresh.forEach(printResult);
      }
      if (older.length > 0) {
        console.log(`--- OLDER ---\n`);
        older.forEach(printResult);
      }
    }
    return;
  }

  // Fetch full posts
  const top = unique.slice(0, topN);
  if (!jsonOutput) console.error(`\nFetching full content for top ${top.length} posts...\n`);

  const posts: PostDetail[] = [];
  for (const sr of top) {
    if (!jsonOutput) process.stderr.write(`  Fetching ${sr.title.slice(0, 50)}...`);
    const detail = await fetchPost(sr.link, sr);
    if (detail && detail.text.length > 50) {
      posts.push(detail);
      if (!jsonOutput) console.error(` ✓`);
    } else {
      if (!jsonOutput) console.error(` ✗ (empty)`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  // Mark fetched posts as seen
  for (const sr of top) {
    const m = sr.link.match(/activity-(\d+)/);
    if (m) seen.add(m[1]);
  }
  saveSeen(seen);

  if (jsonOutput) {
    console.log(JSON.stringify(posts, null, 2));
  } else {
    console.log(`\nFetched ${posts.length} posts with content:\n`);
    for (const p of posts) {
      console.log(`[${p.date}] ${p.authorName} ${p.authorHeadline ? `(${p.authorHeadline.slice(0, 60)})` : ""}`);
      console.log(`  ${p.url}`);
      console.log(`  ${p.text.slice(0, 200).replace(/\n/g, " ")}...`);
      if (p.topComments.length > 0) {
        console.log(`  Top comments:`);
        p.topComments.forEach((c) => console.log(`    - ${c.slice(0, 120)}`));
      }
      console.log();
    }
  }

  if (!jsonOutput) {
    const searchCredits = SEARCHES.length * 5;
    const fetchCredits = posts.length * 5;
    console.error(`Credits used: ~${searchCredits + fetchCredits} (${SEARCHES.length} searches + ${posts.length} post fetches)`);
  }
}

function printResult(r: SearchResult) {
  console.log(`[${r.date || "unknown"}] ${r.title}`);
  console.log(`  ${r.link}`);
  if (r.snippet) console.log(`  ${r.snippet.substring(0, 150).replace(/\n/g, " ")}`);
  console.log();
}

main().catch(console.error);
