#!/usr/bin/env node
/**
 * Download missing swatch images:
 * - Paint colors: Generate SVG color chips from PPG hex values
 * - Carpet: Download from Shaw CDN
 * - Delray hardwood: Download from Shaw CDN
 */

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SWATCHES_DIR = path.join(ROOT, "public", "swatches");

// ─── PPG Paint Colors ───────────────────────────────────────────────
const PAINT_COLORS = [
  { name: "whiskers", label: "Whiskers", hex: "#D1CCC2", ppg: "PPG1025-3" },
  { name: "delicate-white", label: "Delicate White", hex: "#F1F2EE", ppg: "PPG1001-1" },
  { name: "hurricane-haze", label: "Hurricane Haze", hex: "#BDBBAD", ppg: "PPG1032-2" },
  { name: "willow-springs", label: "Willow Springs", hex: "#E7E6E0", ppg: "PPG1007-1" },
  { name: "fog", label: "Fog", hex: "#D6D7D2", ppg: "PPG1010-2" },
  { name: "shark", label: "Shark", hex: "#DFDCD5", ppg: "PPG1006-2" },
  { name: "focus", label: "Focus", hex: "#E5E0D2", ppg: "PPG1008-1" },
  { name: "cold-foam", label: "Cold Foam", hex: "#E9E5D7", ppg: "PPG1097-1" },
  { name: "commercial-white", label: "Commercial White", hex: "#EDECE6", ppg: "PPG1025-1" },
  { name: "in-the-cloud", label: "In the Cloud", hex: "#DEDCD3", ppg: "PPG0999-1" },
  { name: "rabbits-ear", label: "Rabbits Ear", hex: "#C7C2B7", ppg: "PPG0999-2" },
  { name: "maiden-mist", label: "Maiden Mist", hex: "#B9C0C0", ppg: "PPG1039-2" },
  { name: "crushed-silk", label: "Crushed Silk", hex: "#D8CFBE", ppg: "PPG1024-3" },
  { name: "in-the-shadows", label: "In the Shadows", hex: "#656E72", ppg: "PPG1039-6" },
  { name: "dark-woods", label: "Dark Woods", hex: "#635F5A", ppg: "PPG0999-7" },
  { name: "knights-armor", label: "Knights Armor", hex: "#5C5D5D", ppg: "PPG1001-6" },
];

// ─── Shaw Carpet Colors ─────────────────────────────────────────────
const CARPET_IMAGES = [
  // Graceful Finesse (HGR23)
  { name: "graceful-finesse-soft-taupe", url: "https://img.shawinc.com/v1/HGR23_00501/MAIN?w=400&h=400&crop=true&keep=c&quality=85" },
  { name: "graceful-finesse-ecru", url: "https://img.shawinc.com/v1/HGR23_00111/MAIN?w=400&h=400&crop=true&keep=c&quality=85" },
  { name: "graceful-finesse-whisper", url: "https://img.shawinc.com/v1/HGR23_00112/MAIN?w=400&h=400&crop=true&keep=c&quality=85" },
  { name: "graceful-finesse-concrete", url: "https://img.shawinc.com/v1/HGR23_00510/MAIN?w=400&h=400&crop=true&keep=c&quality=85" },
  // Gifted Art (HFN71)
  { name: "gifted-art-sculpture", url: "https://img.shawinc.com/v1/HFN71_00115/MAIN?w=400&h=400&crop=true&keep=c&quality=85" },
  { name: "gifted-art-almond-silk", url: "https://img.shawinc.com/v1/HFN71_00101/MAIN?w=400&h=400&crop=true&keep=c&quality=85" },
  { name: "gifted-art-river-birch", url: "https://img.shawinc.com/v1/HFN71_00106/MAIN?w=400&h=400&crop=true&keep=c&quality=85" },
  { name: "gifted-art-subtle-clay", url: "https://img.shawinc.com/v1/HFN71_00114/MAIN?w=400&h=400&crop=true&keep=c&quality=85" },
  // Gifted Blend (HFN59)
  { name: "gifted-blend-sculpture", url: "https://img.shawinc.com/v1/HFN59_00115/MAIN?w=400&h=400&crop=true&keep=c&quality=85" },
  { name: "gifted-blend-river-birch", url: "https://img.shawinc.com/v1/HFN59_00106/MAIN?w=400&h=400&crop=true&keep=c&quality=85" },
  { name: "gifted-blend-subtle-clay", url: "https://img.shawinc.com/v1/HFN59_00114/MAIN?w=400&h=400&crop=true&keep=c&quality=85" },
  { name: "gifted-blend-almond-silk", url: "https://img.shawinc.com/v1/HFN59_00101/MAIN?w=400&h=400&crop=true&keep=c&quality=85" },
];

// ─── Shaw Delray Hardwood ───────────────────────────────────────────
const HARDWOOD_IMAGES = [
  { name: "delray-lowtide", url: "https://img.shawinc.com/v1/HW493_17051/MAIN?w=400&h=400&crop=true&keep=c&quality=85" },
  { name: "delray-windsurf", url: "https://img.shawinc.com/v1/HW493_05034/MAIN?w=400&h=400&crop=true&keep=c&quality=85" },
  { name: "delray-bayfront", url: "https://img.shawinc.com/v1/HW493_00493/MAIN?w=400&h=400&crop=true&keep=c&quality=85" },
  { name: "delray-crescent-beach", url: "https://img.shawinc.com/v1/HW493_01023/MAIN?w=400&h=400&crop=true&keep=c&quality=85" },
];

// ─── Generate paint swatch SVG ──────────────────────────────────────
function generatePaintSvg(hex, label) {
  // Determine text color based on luminance
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textColor = luminance > 0.5 ? "#333333" : "#FFFFFF";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="${hex}" rx="8"/>
  <rect x="0" y="310" width="400" height="90" fill="white" rx="0"/>
  <rect x="0" y="310" width="400" height="1" fill="#E5E7EB"/>
  <text x="200" y="348" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#1F2937">${label}</text>
  <text x="200" y="375" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#6B7280">${hex.toUpperCase()}</text>
</svg>`;
}

// ─── Download helper ────────────────────────────────────────────────
async function downloadImage(url, destPath) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`  ❌ Failed: ${url} (${res.status})`);
      return false;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(destPath, buffer);
    return true;
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
    return false;
  }
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log("🎨 Downloading missing swatch images\n");

  // Ensure directories
  for (const dir of ["paint", "carpet", "flooring"]) {
    const p = path.join(SWATCHES_DIR, dir);
    if (!existsSync(p)) await mkdir(p, { recursive: true });
  }

  let ok = 0;
  let fail = 0;

  // 1. Generate paint swatches
  console.log("🖌️  Generating paint color swatches...");
  for (const color of PAINT_COLORS) {
    const svg = generatePaintSvg(color.hex, color.label);
    const dest = path.join(SWATCHES_DIR, "paint", `${color.name}.svg`);
    await writeFile(dest, svg);
    console.log(`  ✅ paint/${color.name}.svg`);
    ok++;
  }

  // 2. Download carpet swatches
  console.log("\n🧶 Downloading carpet swatches from Shaw...");
  for (const carpet of CARPET_IMAGES) {
    const dest = path.join(SWATCHES_DIR, "carpet", `${carpet.name}.jpg`);
    if (existsSync(dest)) {
      console.log(`  ⏭️  Already exists: ${carpet.name}.jpg`);
      ok++;
      continue;
    }
    const success = await downloadImage(carpet.url, dest);
    if (success) {
      console.log(`  ✅ carpet/${carpet.name}.jpg`);
      ok++;
    } else {
      fail++;
    }
  }

  // 3. Download Delray hardwood swatches
  console.log("\n🪵 Downloading Delray hardwood swatches from Shaw...");
  for (const hw of HARDWOOD_IMAGES) {
    const dest = path.join(SWATCHES_DIR, "flooring", `${hw.name}.jpg`);
    if (existsSync(dest)) {
      console.log(`  ⏭️  Already exists: ${hw.name}.jpg`);
      ok++;
      continue;
    }
    const success = await downloadImage(hw.url, dest);
    if (success) {
      console.log(`  ✅ flooring/${hw.name}.jpg`);
      ok++;
    } else {
      fail++;
    }
  }

  console.log(`\n✅ Done! ${ok} succeeded, ${fail} failed`);
  console.log("📁 Next: Update options-data.ts with swatchUrl entries and set isVisual: true");
}

main().catch(console.error);
