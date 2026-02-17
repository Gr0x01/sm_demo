#!/usr/bin/env node
/**
 * Scrape remaining swatch images from Stone Martin website.
 * Targets: bathroom tab (tiles, mirrors, hardware), trims-finishing, lighting, doors
 */

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEBUG_DIR = path.join(ROOT, "scripts", "debug");

const API_KEY = process.env.SCRAPINGDOG_API_KEY || "6962f6e99e61715f47d4ac88";

const PAGES = [
  { url: "https://www.stonemartinbuilders.com/home-features-and-personalization/interior?tab=bathroom", label: "bathroom" },
  { url: "https://www.stonemartinbuilders.com/home-features-and-personalization/interior?tab=trims-finishing", label: "trims-finishing" },
  { url: "https://www.stonemartinbuilders.com/home-features-and-personalization/interior?tab=lighting", label: "lighting" },
  { url: "https://www.stonemartinbuilders.com/home-features-and-personalization/interior?tab=doors", label: "doors" },
];

async function scrapePage(targetUrl, label) {
  console.log(`\n🔍 Scraping ${label}: ${targetUrl}`);

  const apiUrl = new URL("https://api.scrapingdog.com/scrape");
  apiUrl.searchParams.set("api_key", API_KEY);
  apiUrl.searchParams.set("url", targetUrl);
  apiUrl.searchParams.set("dynamic", "true");

  const res = await fetch(apiUrl.toString(), {
    headers: { Accept: "text/html" },
  });

  if (!res.ok) {
    console.error(`  ❌ ScrapingDog returned ${res.status} for ${label}`);
    const text = await res.text();
    console.error(`  Response: ${text.slice(0, 500)}`);
    return null;
  }

  const html = await res.text();
  console.log(`  ✅ Got ${html.length} chars of rendered HTML`);

  if (!existsSync(DEBUG_DIR)) await mkdir(DEBUG_DIR, { recursive: true });
  await writeFile(path.join(DEBUG_DIR, `${label}.html`), html);
  console.log(`  📄 Saved to scripts/debug/${label}.html`);

  return html;
}

function extractMediaFilenames(html) {
  const filenames = new Set();

  // CMS JSON embedded filenames
  const escapedRegex = /\\?"filename\\?":\\?"([^"\\]+\.(jpg|jpeg|png|webp))\\?"/gi;
  let m;
  while ((m = escapedRegex.exec(html)) !== null) {
    if (!m[1].startsWith("/")) filenames.add(m[1]);
  }

  // /media/ URL patterns
  const mediaRegex = /stonemartinbuilders\.com\/media\/([^"'\s\\&;]+\.(jpg|jpeg|png|webp))/gi;
  while ((m = mediaRegex.exec(html)) !== null) {
    filenames.add(decodeURIComponent(m[1]));
  }

  return [...filenames];
}

async function main() {
  console.log("🏗️  Stone Martin Remaining Pages Scraper");
  console.log(`   API Key: ${API_KEY.slice(0, 8)}...`);

  const allFilenames = new Set();

  for (const page of PAGES) {
    const html = await scrapePage(page.url, page.label);
    if (!html) continue;

    const filenames = extractMediaFilenames(html);
    console.log(`  📸 Found ${filenames.length} media filenames`);

    for (const f of filenames) {
      allFilenames.add(f);
    }

    // Also log all filenames for this page
    for (const f of filenames.sort()) {
      console.log(`    ${f}`);
    }
  }

  console.log(`\n📊 Total unique media filenames: ${allFilenames.size}`);

  // Save all filenames
  const outputPath = path.join(DEBUG_DIR, "remaining-filenames.json");
  await writeFile(outputPath, JSON.stringify([...allFilenames].sort(), null, 2));
  console.log(`💾 Saved to scripts/debug/remaining-filenames.json`);
}

main().catch(console.error);
