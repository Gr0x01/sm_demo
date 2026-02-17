#!/usr/bin/env node
/**
 * Download remaining swatch images from Stone Martin website.
 * Categories: lighting, fans, mirrors, shower tiles, floor tiles,
 * fireplace (mantel, hearth, tile), bath hardware, door hardware,
 * shower entry, hand shower, naive shower tiles, omega shower tiles
 */

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SWATCHES_DIR = path.join(ROOT, "public", "swatches");
const BASE_URL = "https://www.stonemartinbuilders.com/media/";

// Images to download, organized by local directory
const DOWNLOADS = {
  lighting: [
    "lighting - included satin nickel whole house.png",
    "lighting - included oil rubbed bronze whole house.png",
    "lighting - included oil rubbed bronze combo.png",
    "lighting - included black whole house.png",
    "lighting - included black combo.png",
    "lighting - included brushed gold whole house.png",
    "lighting - included brushed gold combo.png",
    "lighting - designer brushed gold whole house.png",
    "lighting - designer brushed gold combo.png",
    "lighting - black whole house.png",
    "lighting - black combo.png",
    "lighting - satin nickel whole house.png",
    "lighting - satin bronze whole house.png",
    "lighting - satin bronze combo.png",
    "lighting - oil rubbed bronze whole house.png",
    "lighting - oil rubbed bronze combo.png",
    "lighting - designer black whole house.png",
    "lighting - designer black combo.png",
    "lighting - designer silver whole house.png",
    "lighting - designer oil rubbed bronze whole house.png",
    "lighting - designer satin bronze whole house.png",
    "lighting - designer satin bronze combo.png",
  ],
  fans: [
    "GREAT ROOM FAN COLOR - SINGLE LIGHT BRUSHED NICKEL.jpg",
    "GREAT ROOM FAN COLOR - SINGLE LIGHT WHITE.jpg",
    "GREAT ROOM FAN COLOR - SINGLE LIGHT BRONZE.jpg",
    "GREAT ROOM FAN COLOR - SINGLE LIGHT BLACK.jpg",
    "great room fan color - single light brushed gold.png",
    "GREAT ROOM FAN COLOR - FOUR LIGHT GOLD.jpg",
    "GREAT ROOM FAN COLOR - FOUR LIGHT BRONZE-1.jpg",
    "GREAT ROOM FAN COLOR - FOUR LIGHT BLACK.jpg",
    "GREAT ROOM FAN COLOR - FOUR LIGHT BRUSHED NICKEL.jpg",
    "GREAT ROOM FAN COLOR - FOUR LIGHT WHITE.jpg",
    "BEDROOM FAN COLOR - BRUSHED NICKEL.jpg",
    "BEDROOM FAN COLOR - WHITE.jpg",
    "BEDROOM FAN COLOR - BRONZE.jpg",
    "BEDROOM FAN COLOR - BLACK.jpg",
    "bedroom fan color - brushed gold.png",
  ],
  mirrors: [
    "SECONDARY BATH MIRRORS - STYLE 49 GUNMETAL NICKEL.jpg",
    "SECONDARY BATH MIRRORS - STYLE 49 OIL RUBBED BRONZE.jpg",
    "SECONDARY BATH MIRRORS - STYLE 897 SATIN NICKEL-Photoroom.jpg",
    "SECONDARY BATH MIRRORS - STYLE 897 WHITE-Photoroom.jpg",
    "SECONDARY BATH MIRRORS - STYLE 897 BLACK-Photoroom.jpg",
    "SECONDARY BATH MIRRORS - STYLE 897 WOOD-Photoroom.jpg",
    "SECONDARY BATH MIRRORS - STYLE 241 BLACK-Photoroom.jpg",
    "SECONDARY BATH MIRRORS - STYLE 241 SILVER-Photoroom.jpg",
    "SECONDARY BATH MIRRORS - STYLE 241 GOLD-Photoroom.jpg",
    "SECONDARY BATH MIRRORS - STYLE FC30 ROUND GOLD-Photoroom.jpg",
    "SECONDARY BATH MIRRORS - STYLE FC30 ROUND BLACK-Photoroom.jpg",
    "SECONDARY BATH MIRRORS - STYLE FC30 ROUND BRUSHED NICKEL-Photoroom.jpg",
    "SECONDARY BATH MIRRORS - STYLE FR2436 RADIUS BLACK-Photoroom.jpg",
    "SECONDARY BATH MIRRORS - STYLE FR2436 RADIUS BRUSHED NICKEL-Photoroom.jpg",
    "SECONDARY BATH MIRRORS - STYLE FR2436 RADIUS GOLD-Photoroom.jpg",
    "Arched Mirror Black-Photoroom.jpg",
    "Arched Mirror Gold-Photoroom.jpg",
    "secondary bath mirrors - style fa2638 arched brushed nickel.png",
  ],
  "shower-tile": [
    // Primary shower - Omega
    "primary shower tile - omega 13x13 - bone - khaki outline square floor.png",
    "primary shower tile - omega 13x13 - silver - concrete outline square floor.png",
    "primary shower tile - omega 13x13 - grey - taupe outline square floor.png",
    "primary shower tile - omega 13x13 - bone - khaki outline penny rd floor.png",
    "primary shower tile - omega 13x13 - silver - concrete outline penny rd flor.png",
    "primary shower tile - omega 13x13 - grey - taupe outline penny rd floor.png",
    // Primary shower - Infinity
    "PRIMARY-SHOWER-TILE---INFINITY-12X24---CALACATTA---2X2-MATCH-FLOOR.jpg",
    "PRIMARY-SHOWER-TILE---INFINITY-12X24---MARQUANT---2X2-MATCH-FLOOR.jpg",
    // Primary shower - Sphinx
    "PRIMARY-SHOWER-TILE---SPHINX-12X24---WHITE---HEXAGON-CALACATTA-FLOOR.jpg",
    "PRIMARY-SHOWER-TILE---SPHINX-12X24---GREY---HEXAGON-CALACATTA-FLOOR.jpg",
    "PRIMARY-SHOWER-TILE---SPHINX-12X24---CREAM---HEXAGON-CALACATTA-FLOOR.jpg",
    // Primary shower - Onyx
    "PRIMARY-SHOWER-TILE---ONYX-12X24-MATTE---WHITE---2X2-MATCH-FLOOR.jpg",
    "PRIMARY-SHOWER-TILE---ONYX-12X24-MATTE---IVORY---2X2-MATCH-FLOOR (2).jpg",
    "PRIMARY-SHOWER-TILE---ONYX-12X24-MATTE---DARK-GREY---2X2-MATCH-FLOOR.jpg",
    // Primary shower - Baker Blvd
    "PRIMARY-SHOWER-TILE---BAKER-BLVD-4X16-MATTE---WHITE---HEX-BLK-WHITE-FLOOR.jpg",
    "PRIMARY-SHOWER-TILE---BAKER-BLVD-4X16-MATTE---CARBON---HEX-BLK-WHITE-FLOOR.jpg",
    "PRIMARY-SHOWER-TILE---BAKER-BLVD-4X16-MATTE---WHITE---PENNY-RD-WHITE-FLOOR.jpg",
    "PRIMARY-SHOWER-TILE---BAKER-BLVD-4X16-MATTE---CARBON---PENNY-RD-CARBON-FLOR.jpg",
    // Primary shower - Naive (reuse backsplash images for tile color reference)
    // Secondary shower
    "secondary shower style tile - omega 13x13 - grey.png",
    "secondary shower style tile - omega 13x13 - silver.png",
    "secondary shower style tile - infinity 12x24 - calacatta.png",
    "secondary shower style tile - sphinx 12x24 - grey.png",
    "secondary shower style tile - baker blvd 4x16 gloss - white.png",
    // Baker penny round floor tiles
    "BAKER BLVD_PENNY ROUND_MATTE MOSAIC_WHITE.jpg",
    "BAKER-BLVD_PENNY-ROUND_MATTE-MOSAIC_WARM-GREY (1).jpg",
  ],
  "floor-tile": [
    "FLOOR-TILE-COLOR---OMEGA-13X13---BONE.jpg",
    "FLOOR-TILE-COLOR---OMEGA-13X13---SILVER.jpg",
    "Omega-Gray-Floor-Tile-1.jpg",
    "FLOOR-TILE-COLOR---INFINITY-12X24---CALACATTA.jpg",
    "FLOOR-TILE-COLOR---INFINITY-12X24---MARQUANT.jpg",
    "FLOOR-TILE-COLOR---SPHINX-12X24---WHITE.jpg",
    "FLOOR-TILE-COLOR---SPHINX-12X24---GREY.jpg",
    "FLOOR-TILE-COLOR---SPHINX-12X24---CREAM.jpg",
    "FLOOR-TILE-COLOR---ONYX-12X24-MATTE---WHITE.jpg",
    "FLOOR-TILE-COLOR---ONYX-12X24-MATTE---IVORY.jpg",
    "FLOOR-TILE-COLOR---ONYX-12X24-MATTE---DARK-GREY.jpg",
  ],
  fireplace: [
    // Mantels
    "FIREPLACE-MANTEL---FAIRFAX.jpg",
    "FIREPLACE-MANTEL---JEFFERSON.jpg",
    "FIREPLACE-MANTEL---NEWPORT.jpg",
    "FIREPLACE-MANTEL---REGENCY.jpg",
    "FIREPLACE MANTEL - PEYTON.png",
    // Mantel accents
    "FIREPLACE MANTEL ACCENT - INCLUDED PICTURE FRAME STYLE.png",
    "FIREPLACE MANTEL ACCENT - SHIPLAP STYLE.png",
    "FIREPLACE MANTEL ACCENT - DECORATIVE BOX STYLE.png",
    // Hearth
    "FIREPLACE-HEARTH---WOOD-FIREPLACE-HEARTH.jpg",
    "FIREPLACE-HEARTH---BRICK-MOUNTAIN-BROOK-IVORY.jpg",
    "FIREPLACE-HEARTH---BRICK-ROCKWELL-GREY.jpg",
    "FIREPLACE-HEARTH-PAINTED-BRICK-COLOR---DELICATE-WHITE.jpg",
    "FIREPLACE-HEARTH-PAINTED-BRICK-COLOR---COMMERCIAL-WHITE.jpg",
    // Tile surround
    "FIREPLACE TILE SURROUND - MARVEL 4X12 - CALACATTA.png",
    "FIREPLACE TILE SURROUND - MARVEL 4X12 - STATUARIO.png",
    "FIREPLACE TILE SURROUND - MARVEL 4X12 - ZEBRINO.png",
    "FIREPLACE TILE SURROUND - MARVEL 4X12 - ALLURE.png",
    "FIREPLACE TILE SURROUND - MARVEL 4X12 - STELLA.png",
    "FIREPLACE-TILE-SURROUND---SKYLINE-4X8---SUNSET-STREET.jpg",
    "FIREPLACE-TILE-SURROUND---SKYLINE-4X8---HIGHRISE-GREY.jpg",
    "FIREPLACE TILE SURROUND - SKYLINE 4X8 - BRICK LANE.jpg",
  ],
  "bath-hardware": [
    "bath hardware - tiburion - satin nickel.png",
    "bath hardware - tiburion - oil rubbed bronze.png",
    "bath hardware - tiburion - black.png",
    "bath hardware - tiburion - satin brass.png",
    "bath hardware - park presidio - satin nickel.png",
    "bath hardware - park presidio - black.png",
    "bath hardware - park presidio - satin brass.png",
    "bath hardware - miraloma park - satin nickel.png",
    "bath hardware - miraloma park - oil rubbed bronze.png",
    "bath hardware - miraloma park - black.png",
  ],
  "door-hardware": [
    "DOOR-HARDWARE---LOMBARD-LEVER---SATIN-NICKEL.jpg",
    "DOOR-HARDWARE---LOMBARD-LEVER---OIL-RUBBED-BRONZE.jpg",
    "DOOR-HARDWARE---LOMBARD-LEVER---BLACK.jpg",
    "DOOR-HARDWARE---SEA-CLIFF-LEVER---SATIN-NICKEL.jpg",
    "DOOR-HARDWARE---SEA-CLIFF-LEVER---OIL-RUBBED-BRONZE.jpg",
    "DOOR-HARDWARE---SEA-CLIFF-LEVER---BLACK.jpg",
    "DOOR-HARDWARE---TIBURON-LEVER---SATIN-NICKEL.jpg",
    "DOOR-HARDWARE---TIBURON-LEVER---OIL-RUBBED-BRONZE.jpg",
    "DOOR-HARDWARE---TIBURON-LEVER---BLACK.jpg",
    "DOOR-HARDWARE---TIBURON-LEVER---SATIN-BRASS.jpg",
    "DOOR-HARDWARE---MIRALOMA-PARK-KNOB---SATIN-NICKEL.jpg",
    "DOOR-HARDWARE---MIRALOMA-PARK-KNOB---BLACK.jpg",
    "DOOR-HARDWARE---UNION-SQUARE-KNOB---SATIN-NICKEL.jpg",
    "DOOR-HARDWARE---UNION-SQUARE-KNOB---BLACK.jpg",
  ],
  "shower-extras": [
    "WALL MOUNT HAND SHOWER - ADD BRUSHED NICKEL IN PRIMARY SHOWER-Photoroom.jpg",
    "WALL MOUNT HAND SHOWER - ADD TUSCAN BRONZE IN PRIMARY SHOWER.png",
    "WALL MOUNT HAND SHOWER - ADD MATTE BLACK IN PRIMARY SHOWER.png",
    "WALL MOUNT HAND SHOWER - ADD BRUSHED GOLD IN PRIMARY SHOWER.png",
    "primary shower - zero entry no glass door.png",
    "primary shower - zero entry with glass door.png",
  ],
};

async function downloadFile(filename, destPath) {
  const url = BASE_URL + encodeURIComponent(filename).replace(/%20/g, "%20");
  try {
    let res = await fetch(url);
    if (!res.ok) {
      // Try with spaces encoded differently
      const url2 = BASE_URL + filename.replace(/ /g, "%20");
      res = await fetch(url2);
      if (!res.ok) return false;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const dir = path.dirname(destPath);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(destPath, buffer);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log("⬇️  Downloading remaining swatch images from Stone Martin\n");

  let ok = 0;
  let fail = 0;

  for (const [category, filenames] of Object.entries(DOWNLOADS)) {
    const dir = path.join(SWATCHES_DIR, category);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });

    console.log(`📁 ${category} (${filenames.length} images):`);
    for (const filename of filenames) {
      const cleanName = filename.replace(/\s/g, "-").replace(/[()]/g, "");
      const destPath = path.join(dir, cleanName);

      if (existsSync(destPath)) {
        console.log(`  ⏭️  ${cleanName}`);
        ok++;
        continue;
      }

      const success = await downloadFile(filename, destPath);
      if (success) {
        console.log(`  ✅ ${cleanName}`);
        ok++;
      } else {
        console.log(`  ❌ ${cleanName}`);
        fail++;
      }
    }
    console.log();
  }

  console.log(`\n✅ Done! ${ok} succeeded, ${fail} failed`);
}

main().catch(console.error);
