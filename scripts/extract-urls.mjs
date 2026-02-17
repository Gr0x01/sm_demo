import { readFileSync } from "node:fs";

const html = readFileSync("./scripts/debug/kitchen.html", "utf8");

const patterns = [
  /CABINET[^"'\s&;\\]*\.(jpg|png|jpeg|webp)/gi,
  /BACKSPLASH[^"'\s&;\\]*\.(jpg|png|jpeg|webp)/gi,
  /FAUCET[^"'\s&;\\]*\.(jpg|png|jpeg|webp)/gi,
  /SINK[^"'\s&;\\]*\.(jpg|png|jpeg|webp)/gi,
  /COUNTER[^"'\s&;\\]*\.(jpg|png|jpeg|webp)/gi,
  /HARDWARE[^"'\s&;\\]*\.(jpg|png|jpeg|webp)/gi,
  /HOOD[^"'\s&;\\]*\.(jpg|png|jpeg|webp)/gi,
  /(DRIFTWOOD|CAPPUCINO|SAHARA|OXFORD|FAIRMONT|MERIDIAN|ONYX|WILLOW|BUTTERCREAM|ADMIRAL|FOG-PAINT|SADDLE|PACIFIC|BLUE.SMOKE)[^"'\s&;\\]*\.(jpg|png|jpeg|webp)/gi,
  /(BAKER|VESPER|NAIVE|MYTHOLOGY|GATEWAY|HERRINGBONE)[^"'\s&;\\]*\.(jpg|png|jpeg|webp)/gi,
  /(PFIRST|COLFAX|STELLEN|MONTAY|BRISLIN)[^"'\s&;\\]*\.(jpg|png|jpeg|webp)/gi,
  /(SEAVER|SEDONA|NAPLES|DOMINIQUE|STANTON|KEY.GRANDE)[^"'\s&;\\]*\.(jpg|png|jpeg|webp)/gi,
  /(GRANITE|QUARTZ|CALACATTA|LUNA.PEARL|STEEL.GREY|DALLAS.WHITE|COLONIAL|OYSTER|FANTASY|BIANCO|CARRARA)[^"'\s&;\\]*\.(jpg|png|jpeg|webp)/gi,
  /(FARMHOUSE|EGRANITE|UNDERMOUNT)[^"'\s&;\\]*\.(jpg|png|jpeg|webp)/gi,
];

const found = new Set();
for (const pat of patterns) {
  let m;
  while ((m = pat.exec(html)) !== null) {
    found.add(m[0]);
  }
}

console.log("Found image filenames:");
[...found].sort().forEach((f) => console.log("  " + f));
console.log("Total:", found.size);

// Also search for full URLs with /media/ path
const mediaPattern = /stonemartinbuilders\.com\/media\/[^"'\s\\&;]+\.(jpg|jpeg|png|webp)/gi;
const mediaUrls = new Set();
let m2;
while ((m2 = mediaPattern.exec(html)) !== null) {
  mediaUrls.add("https://www." + m2[0]);
}

// Filter to only swatch-relevant ones (exclude property photos)
const swatchKeywords = [
  "cabinet", "backsplash", "faucet", "sink", "counter", "hardware", "hood",
  "driftwood", "cappucino", "sahara", "oxford", "fairmont", "meridian",
  "onyx", "willow", "buttercream", "admiral", "fog", "saddle", "pacific",
  "smoke", "baker", "vesper", "naive", "mythology", "gateway", "herringbone",
  "pfirst", "colfax", "stellen", "montay", "brislin", "seaver", "sedona",
  "naples", "dominique", "stanton", "grande", "granite", "quartz",
  "calacatta", "luna", "steel", "dallas", "colonial", "oyster", "fantasy",
  "bianco", "carrara", "farmhouse", "egranite", "undermount", "flooring",
  "color", "style", "edge", "ogee", "bullnose",
];

console.log("\nAll /media/ URLs matching swatch keywords:");
[...mediaUrls]
  .filter((u) => swatchKeywords.some((kw) => u.toLowerCase().includes(kw)))
  .sort()
  .forEach((u) => console.log("  " + u));
