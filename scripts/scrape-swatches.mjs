#!/usr/bin/env node
/**
 * Scrape swatch images from stonemartinbuilders.com using ScrapingDog API.
 *
 * Strategy:
 * 1. Use ScrapingDog with JS rendering to load the kitchen interior page
 * 2. Parse the rendered HTML for swatch image URLs
 * 3. Download images to /public/swatches/{category}/
 * 4. Output a mapping file for options-data.ts integration
 *
 * Usage: node scripts/scrape-swatches.mjs
 */

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SWATCHES_DIR = path.join(ROOT, "public", "swatches");

const API_KEY = process.env.SCRAPINGDOG_API_KEY || "6962f6e99e61715f47d4ac88";

const PAGES = [
  {
    url: "https://www.stonemartinbuilders.com/home-features-and-personalization/interior?tab=kitchen",
    label: "kitchen",
  },
  {
    url: "https://www.stonemartinbuilders.com/home-features-and-personalization/interior?tab=flooring",
    label: "flooring",
  },
  {
    url: "https://www.stonemartinbuilders.com/home-features-and-personalization/interior?tab=bathroom",
    label: "bathroom",
  },
];

async function scrapePage(targetUrl, label) {
  console.log(`\n🔍 Scraping ${label}: ${targetUrl}`);

  const apiUrl = new URL("https://api.scrapingdog.com/scrape");
  apiUrl.searchParams.set("api_key", API_KEY);
  apiUrl.searchParams.set("url", targetUrl);
  apiUrl.searchParams.set("dynamic", "true"); // JS rendering

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

  // Save raw HTML for debugging
  const debugDir = path.join(ROOT, "scripts", "debug");
  if (!existsSync(debugDir)) await mkdir(debugDir, { recursive: true });
  await writeFile(path.join(debugDir, `${label}.html`), html);
  console.log(`  📄 Saved debug HTML to scripts/debug/${label}.html`);

  return html;
}

function extractImageUrls(html) {
  const urls = new Set();

  // Match img src attributes
  const imgRegex = /(?:src|data-src|srcset)=["']([^"']+\.(?:jpg|jpeg|png|webp|svg)[^"']*)/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    urls.add(decodeURIComponent(match[1]));
  }

  // Match background-image URLs
  const bgRegex = /url\(["']?([^"')]+\.(?:jpg|jpeg|png|webp))["']?\)/gi;
  while ((match = bgRegex.exec(html)) !== null) {
    urls.add(decodeURIComponent(match[1]));
  }

  // Match stonemartinbuilders.com/media/ URLs in any context (including JSON)
  const mediaRegex = /stonemartinbuilders\.com\/media\/([^"'\s\\)]+)/gi;
  while ((match = mediaRegex.exec(html)) !== null) {
    urls.add(`https://www.stonemartinbuilders.com/media/${match[1]}`);
  }

  return [...urls];
}

function categorizeUrls(urls) {
  const categories = {
    cabinets: [],
    hardware: [],
    countertops: [],
    backsplash: [],
    flooring: [],
    faucets: [],
    sinks: [],
    appliances: [],
    other: [],
  };

  const keywords = {
    cabinets: ["cabinet", "driftwood", "cappucino", "cappuccino", "sahara", "fog", "onyx", "buttercream", "willow", "admiral", "saddle", "pacific-sand", "blue-smoke", "fairmont", "meridian", "oxford", "paint", "stain"],
    hardware: ["hardware", "seaver", "sedona", "naples", "dominique", "stanton", "key-grande", "pull", "knob"],
    countertops: ["counter", "granite", "quartz", "calacatta", "luna", "steel-grey", "dallas", "colonial", "oyster", "fantasy", "lace", "bianco", "carrara", "venice", "lavasa", "idillio", "duolina"],
    backsplash: ["backsplash", "baker", "vesper", "naive", "mythology", "gateway", "subway", "tile", "herringbone", "picket"],
    flooring: ["floor", "lvp", "hardwood", "polaris", "homestead", "mariner", "delray", "plank", "wood"],
    faucets: ["faucet", "pfirst", "colfax", "stellen", "montay", "brislin"],
    sinks: ["sink", "farmhouse", "egranite", "undermount"],
    appliances: ["refrigerator", "dishwasher", "range", "oven", "cooktop", "microwave", "appliance", "GE"],
  };

  for (const url of urls) {
    const lower = url.toLowerCase();
    let matched = false;
    for (const [cat, kws] of Object.entries(keywords)) {
      if (kws.some((kw) => lower.includes(kw))) {
        categories[cat].push(url);
        matched = true;
        break;
      }
    }
    if (!matched) categories.other.push(url);
  }

  return categories;
}

async function downloadImage(url, destPath) {
  try {
    // Normalize URL
    let fullUrl = url;
    if (url.startsWith("/")) {
      fullUrl = `https://www.stonemartinbuilders.com${url}`;
    }
    if (url.startsWith("/_next/image")) {
      // Extract the actual URL from Next.js image optimizer
      const match = url.match(/url=([^&]+)/);
      if (match) fullUrl = decodeURIComponent(match[1]);
    }

    const res = await fetch(fullUrl);
    if (!res.ok) {
      console.log(`    ⚠️  Failed to download: ${fullUrl} (${res.status})`);
      return false;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const dir = path.dirname(destPath);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(destPath, buffer);
    return true;
  } catch (err) {
    console.log(`    ⚠️  Error downloading ${url}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log("🏗️  Stone Martin Swatch Scraper");
  console.log(`   API Key: ${API_KEY.slice(0, 8)}...`);
  console.log(`   Output:  ${SWATCHES_DIR}`);

  // Ensure swatches directories exist
  const subdirs = ["cabinets", "hardware", "countertops", "backsplash", "flooring", "faucets", "sinks", "appliances", "other"];
  for (const sub of subdirs) {
    const dir = path.join(SWATCHES_DIR, sub);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  }

  const allCategorized = {
    cabinets: [],
    hardware: [],
    countertops: [],
    backsplash: [],
    flooring: [],
    faucets: [],
    sinks: [],
    appliances: [],
    other: [],
  };

  // Scrape each page
  for (const page of PAGES) {
    const html = await scrapePage(page.url, page.label);
    if (!html) continue;

    const urls = extractImageUrls(html);
    console.log(`  📸 Found ${urls.length} image URLs`);

    const categorized = categorizeUrls(urls);
    for (const [cat, catUrls] of Object.entries(categorized)) {
      if (catUrls.length > 0) {
        console.log(`    ${cat}: ${catUrls.length} images`);
        allCategorized[cat].push(...catUrls);
      }
    }
  }

  // Deduplicate
  for (const cat of Object.keys(allCategorized)) {
    allCategorized[cat] = [...new Set(allCategorized[cat])];
  }

  // Summary
  console.log("\n📊 Summary of found images:");
  let totalFound = 0;
  for (const [cat, urls] of Object.entries(allCategorized)) {
    if (urls.length > 0) {
      console.log(`  ${cat}: ${urls.length} unique images`);
      totalFound += urls.length;
    }
  }
  console.log(`  Total: ${totalFound} unique images\n`);

  // Save URL mapping
  const mappingPath = path.join(ROOT, "scripts", "debug", "swatch-urls.json");
  await writeFile(mappingPath, JSON.stringify(allCategorized, null, 2));
  console.log(`💾 Saved URL mapping to scripts/debug/swatch-urls.json`);

  // Download all categorized images
  console.log("\n⬇️  Downloading images...");
  let downloaded = 0;
  let failed = 0;

  for (const [cat, urls] of Object.entries(allCategorized)) {
    if (cat === "other" || urls.length === 0) continue;

    console.log(`\n  📁 ${cat}:`);
    for (const url of urls) {
      const filename = path.basename(url).replace(/[?#].*/g, "").replace(/%20/g, "-");
      const destPath = path.join(SWATCHES_DIR, cat, filename);

      if (existsSync(destPath)) {
        console.log(`    ⏭️  Already exists: ${filename}`);
        downloaded++;
        continue;
      }

      const ok = await downloadImage(url, destPath);
      if (ok) {
        console.log(`    ✅ ${filename}`);
        downloaded++;
      } else {
        failed++;
      }
    }
  }

  console.log(`\n✅ Done! Downloaded: ${downloaded}, Failed: ${failed}`);
  console.log(`📁 Images saved to: ${SWATCHES_DIR}`);
  console.log("\nNext step: Review scripts/debug/swatch-urls.json and update options-data.ts");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
