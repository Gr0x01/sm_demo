#!/usr/bin/env tsx
/**
 * Generate Nest demo hero room photos via Gemini 2.5 Flash Image (nano banana).
 *
 * Usage:
 *   npx tsx scripts/generate-nest-room.ts <room> [count]
 *   npx tsx scripts/generate-nest-room.ts kitchen 4
 *
 * Outputs PNG candidates to tmp/nest-<room>-candidates/candidate-<n>.png
 */

import { config } from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

config({ path: ".env.local" });

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  console.error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  process.exit(1);
}

const PROMPTS: Record<string, string> = {
  bedroom: `Spacious modern craftsman PRIMARY MASTER bedroom suite, real estate photography. Large generous master bedroom with high ceilings and wide proportions — at least 16 feet wide and 18 feet deep, vaulted or 10-foot ceilings. Completely EMPTY room — NO bed, NO nightstands, NO furniture of any kind.

Layout:
- Plain warm off-white painted BACK wall (no feature wall, no wood paneling, just clean painted wall).
- TALL BLACK-FRAMED PICTURE WINDOW ON THE LEFT WALL flooding the room with cool natural daylight.
- WIDE CASED OPENING (no door, just a tall flat-cased rectangular doorway opening framed with simple craftsman casing) on the RIGHT wall leading clearly into the ENSUITE PRIMARY BATHROOM. Through the opening you can clearly see the bathroom beyond: porcelain floor tile, the floating shaker vanity with mirror, frameless glass shower visible.
- Modern matte black flush-mount CEILING FAN with simple blades centered on the ceiling.

Warm off-white walls, warm mid-tone oak wide-plank hardwood flooring, simple crown moulding. No furniture, no rug, no art, no decor.

Wide-angle two-point perspective from the doorway, 16:9, sharp, photorealistic.`,

  bathroom: `Modern craftsman primary bathroom, real estate photography.

Layout:
- Floating shaker double vanity on the BACK wall.
- Frameless glass walk-in shower on the RIGHT wall.
- TALL BLACK-FRAMED FROSTED PICTURE WINDOW ON THE LEFT WALL.
- Freestanding oval white soaking tub on the floor.

Warm off-white walls, large-format warm-light porcelain floor, crown moulding, matte black hardware. Cool natural daylight from the LEFT WALL window. No tub surround, no niches, no decor.

Wide-angle two-point perspective, 16:9, sharp, photorealistic.`,

  livingRoom: `Modern craftsman living room interior, real estate photography. This is the living room end of an open-concept great room — the same architectural envelope as the kitchen, with no walls or partitions separating the two spaces. The kitchen is at the opposite end of the room, behind the camera. The architecture, finishes, floor, walls, and ceiling all continue uninterrupted from the kitchen into this living room area.
Warm off-white walls throughout, the same warm off-white as the kitchen end, simple craftsman-style flat casing around windows and doorways, flat profile baseboards, simple low-profile crown moulding at the ceiling, no ornate trim.
Warm mid-tone oak wide-plank hardwood flooring throughout, continuous from the kitchen end with no transition.
The back wall (the short end of the great room opposite the kitchen) is the living room focal wall. Centered on this back wall is a modern craftsman gas fireplace: a linear flush-mounted gas insert with a horizontal rectangular firebox opening at chest height, surrounded by plain matte large-format porcelain tile in a warm neutral light tone, no pattern, no veining, no subway, no mosaic. A single simple warm mid-tone wood mantel beam runs horizontally above the firebox. The fireplace is flush to the floor with NO raised hearth, NO stone, NO brick.
On EACH side of the fireplace, flanking it left and right symmetrically, are matching built-in shaker cabinetry units: flat-slab matte off-white painted lower cabinets running from the floor to about counter height, capped with a simple white quartz or painted top, and a flat blank wall area above each one. The fireplace + flanking built-ins together form one continuous symmetric back wall composition.
Tall floor-to-ceiling black-framed picture windows running along the LEFT long side wall, three vertical panels side by side, flooding the great room with cool natural daylight. Sheer white linen curtain panels at the edges of the windows, not covering the glass.
The RIGHT long side wall is plain warm off-white wall with simple flat casing around a doorway opening leading to the rest of the house.
The living room floor is COMPLETELY EMPTY: NO sofa, NO chairs, NO coffee table, NO rug, NO ottoman, NO floor lamp, NO furniture of any kind. The room is shown as a vacant staged real-estate photo with bare hardwood floor visible across the entire room.
NO ceiling beams, NO ceiling fan, NO chandelier, NO pendant lights — just simple recessed ceiling cans. NO accent wall, NO wallpaper, NO art on the walls, NO decorative objects on the built-ins, NO houseplants, NO throw pillows, NO TV mounted above the fireplace.
Wide straight-on camera angle at standing eye height, positioned at the kitchen end of the great room (the kitchen is behind the camera, not visible in frame) looking toward the back wall of the living room, centered on the fireplace, showing the full symmetric back wall composition, the full left side wall with the tall windows, and the right side wall with the doorway opening.
Warm but neutral white balance, natural daylight, photorealistic real estate photography, 35mm lens, f/8, sharp edges throughout, no bokeh, no shallow depth of field.
Wide landscape framing, 16:9 aspect ratio.`,

  kitchen: `Modern craftsman kitchen interior, real estate photography.
Simple shaker-style perimeter cabinets and shaker-style island base, both painted the same matte warm off-white, no wood tones on any cabinetry.
Honed neutral light quartz countertops throughout the perimeter and the island, simple straight edge profile.
Plain matte warm-white large-format porcelain backsplash behind the counter, no subway pattern, no hex, no mosaic, no pattern at all.
Warm mid-tone oak wide-plank hardwood flooring throughout.
Warm off-white walls.
Matte black slim bar pull hardware on cabinets.
Simple craftsman-style flat casing around the window and doorways, flat profile baseboards, no ornate trim.
U-shaped kitchen layout with a proper work triangle between the sink, range, and refrigerator:
Sink centered on the back wall under a tall black-framed picture window, flooding the room with cool natural daylight.
Slide-in stainless gas range on the LEFT return wall, perpendicular to the sink. The range is a true slide-in: the cooktop surface sits FLUSH with the adjacent countertops on both sides with no gap and no lip, the control knobs are on the FRONT face of the range above the oven door, and there is NO back guard, NO high back, NO back panel, NO control panel rising up behind the cooktop. The backsplash wall behind the range is fully exposed and continuous with the rest of the backsplash run. Above the range there is a low-profile flush ceiling vent — no chimney hood, no range hood canopy, no wood-wrapped hood, no soffit above the range, no boxed enclosure above the range, no valance above the range, the upper cabinets above the range run continuously to the ceiling with no break.
An EMPTY refrigerator alcove on the RIGHT return wall, perpendicular to the sink. The alcove is an empty recessed bay in the cabinetry sized to receive a standard 36-inch refrigerator — flanked on both sides by tall floor-to-ceiling cabinet columns and capped above by a short cabinet that defines the top of the bay. There is NO refrigerator placed in the alcove. There is no appliance of any kind in the alcove. The alcove is empty, showing the back wall and floor of the recess. This is an architectural feature, not an appliance.
This creates the work triangle layout: sink at the back under the window, range on the left return wall, empty refrigerator alcove on the right return wall.
Kitchen island parallel to the back wall in the center of the room, flat panel ends, no waterfall, no barstools in front of it.
Simple undercabinet lighting, recessed ceiling cans.
Wide straight-on camera angle at counter height, centered on the island, showing the full back wall with the window behind the sink, plus both return walls with the range on the left and the refrigerator column on the right.
No pendants hanging over the island, no decorative objects on the counters, no wall oven, no secondary appliances visible, no open shelving, no ceiling beams, no plate rail.
Warm but neutral white balance, natural daylight, photorealistic real estate photography, 35mm lens, f/8, sharp edges throughout, no bokeh, no shallow depth of field.
Wide landscape framing, 16:9 aspect ratio.`,
};

async function main() {
  const room = process.argv[2];
  const count = Number(process.argv[3] ?? 2);

  if (!room || !PROMPTS[room]) {
    console.error(`Usage: generate-nest-room.ts <room> [count]`);
    console.error(`Available rooms: ${Object.keys(PROMPTS).join(", ")}`);
    process.exit(1);
  }

  const prompt = PROMPTS[room];
  const outDir = path.resolve(`tmp/nest-${room}-candidates`);
  await mkdir(outDir, { recursive: true });

  const ai = new GoogleGenAI({ apiKey });

  console.log(`Generating ${count} candidates for ${room}...`);
  console.log(`Output: ${outDir}`);

  const runs = Array.from({ length: count }, (_, i) => i + 1);
  const results = await Promise.allSettled(
    runs.map(async (n) => {
      const t0 = Date.now();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
        config: {
          imageConfig: { aspectRatio: "16:9" },
        } as Record<string, unknown>,
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p) => p.inlineData?.data);
      if (!imagePart?.inlineData?.data) {
        throw new Error("no inline image data returned");
      }

      const buf = Buffer.from(imagePart.inlineData.data, "base64");
      const outPath = path.join(outDir, `candidate-${n}.png`);
      await writeFile(outPath, buf);
      const ms = Date.now() - t0;
      console.log(`  candidate-${n}.png (${(buf.length / 1024).toFixed(0)}KB, ${ms}ms)`);
      return outPath;
    }),
  );

  const ok = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected");
  console.log(`\nDone. ${ok}/${count} succeeded.`);
  for (const f of failed) {
    if (f.status === "rejected") console.error(`  failed:`, f.reason?.message ?? f.reason);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
