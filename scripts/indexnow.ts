/**
 * Submit all public marketing URLs to IndexNow (Bing, Yandex, etc.)
 * Usage: npx tsx scripts/indexnow.ts [--dry-run]
 */

const KEY = "12ab311da42e98306ff1e3a69c289a3b";
const HOST = "https://withfin.ch";
const KEY_LOCATION = `${HOST}/${KEY}.txt`;

const URLS = [
  `${HOST}/`,
  `${HOST}/try`,
  `${HOST}/learn`,
  `${HOST}/learn/new-construction-upgrades`,
  `${HOST}/learn/design-center/pulte`,
  `${HOST}/learn/design-center/arbor`,
  `${HOST}/learn/design-center/ryan`,
  `${HOST}/learn/design-center/richmond-american`,
  `${HOST}/research`,
  `${HOST}/research/hidden-revenue-line`,
  `${HOST}/research/visualization-lift`,
  `${HOST}/vs/envision`,
  `${HOST}/vs/pdf-option-sheets`,
  `${HOST}/demo`,
];

async function submit(dryRun: boolean) {
  const payload = {
    host: "withfin.ch",
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: URLS,
  };

  console.log(`Submitting ${URLS.length} URLs to IndexNow${dryRun ? " (dry run)" : ""}:\n`);
  for (const url of URLS) console.log(`  ${url}`);
  console.log();

  if (dryRun) {
    console.log("Payload:", JSON.stringify(payload, null, 2));
    return;
  }

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  if (res.ok || res.status === 202) {
    console.log(`Success (${res.status}). URLs submitted to IndexNow.`);
  } else {
    const body = await res.text();
    console.error(`Failed (${res.status}): ${body}`);
    process.exit(1);
  }
}

const dryRun = process.argv.includes("--dry-run");
submit(dryRun);
