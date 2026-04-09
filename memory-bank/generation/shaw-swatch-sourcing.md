# Shaw Industries Swatch Sourcing

Stone Martin sources nearly all its tile and hardwood from **Shaw Industries** (builder ceramics + Shaw Floors hardwood). This doc captures the CDN pattern, SKU format, and line→SKU→color mappings so future sessions don't have to rediscover them.

## CDN pattern

```
https://img.shawinc.com/s7/is/image/ShawIndustries/{SKU}_MAIN?wid=2000
```

- `wid=` sets output width. 2000 is max; use 1000 for quicker previews.
- Returns a clean flat catalog shot with no watermarks, logos, or price tags.
- Usually shows the material in its natural lay pattern (running bond for subways, grid for 12x24 porcelain, etc.).
- Square source images — 2000x2000 is common.

## SKU format

`TG{line}_{colorcode}` for ceramic tile. `HW{line}_{colorcode}` for hardwood.

## Known color codes

| Code  | Name              |
|-------|-------------------|
| 00100 | White             |
| 00125 | Silver / Light Grey |
| 00150 | Pearl / Silver    |
| 00400 | Glacier (pale blue-grey) |
| 00450 | Mint              |
| 00500 | Warm Grey / Cream / Grey |
| 00550 | Taupe             |
| 00950 | Carbon / Dark Grey |

Not every line stocks every color — probe a color code against a line's CDN URL to verify it exists (404 if it doesn't).

## Known SM → Shaw line mapping

Discovered during the SM swatch audit (2026-04-09). All SKUs verified by downloading and visually inspecting.

### Ceramic tile (wall + floor + backsplash)

| Line                        | SKU prefix | Format                | Known colors               |
|-----------------------------|------------|-----------------------|----------------------------|
| Naive 3x12                  | `TG44E`    | 3x12 subway           | White, Pearl, Mint         |
| Vesper 6x6 Matte            | `TG60F`    | 6x6                   | Alba, Callisto, Eminent    |
| Vesper 6x6 Gloss            | `TG59F`    | 6x6                   | Awaken                     |
| Sphinx 12x24                | `TG65C`    | 12x24 porcelain       | White, Cream, Grey         |
| Omega 13 (Omega 13x13)      | `TG67D`    | 13x13                 | Bone, Grey, Silver         |
| Baker Blvd 4x16 Matte       | `TG78F`    | 4x16 subway           | White, Glacier, Warm Grey, Taupe, Carbon |
| Baker Blvd 4x16 Gloss       | `TG05G`    | 4x16 subway           | White                      |
| Baker Blvd 4x12 Beveled     | `TG03G`    | 4x12 beveled subway   | White                      |
| Baker Blvd Herringbone Matte| `TG77F`    | herringbone mosaic    | Glacier, Carbon, Warm Grey, Taupe |
| Baker Blvd Penny Matte      | `TG79F`    | penny round mosaic    | White, Glacier, Warm Grey, Taupe, Carbon |
| Baker Blvd 2in Hex Matte    | `TG98F`    | 2in hex mosaic        | White, Glacier, Warm Grey, Taupe, Carbon |
| Hoover Matte Penny Round    | `TG82D`    | penny round mosaic    | White only (verified)      |
| Infinity 12x24              | `TG00E`    | 12x24 porcelain       | Calacatta, Marquant        |

### Hardwood

| Line          | SKU prefix | Format           | Known colors     |
|---------------|------------|------------------|------------------|
| Mariner Oak   | `HW713`    | 7" plank hardwood | Voyage, Port     |

### Non-Shaw sources

| Brand                    | Product                      | Notes |
|--------------------------|------------------------------|-------|
| MILEstone Tiles          | Onyx 12x24 Matte             | `milestonetiles.com`. SM was using MILEstone's hero panel images with their own red text watermark stamped on top. |
| Better Home Products     | Park Presidio hardware       | Factory Direct Hardware CDN. No full 3-piece set shot exists — each piece (towel bar, ring, paper holder) has individual catalog images. Finish code `DB` = Dark Bronze (SM calls it "Oil Rubbed Bronze"). |
| Glass Warehouse          | Kira arched mirrors, Trinity radius mirrors | "FR2436" = Frameless Radius 24x36, "FA2638" = Frameless Arched 26x38. KB Authority (`kbauthority.com`) hosts catalog shots but serves the same silhouette image for all color variants — unusable for Black/Gold specific finishes. Head-on silhouette shots are actually WORSE than SM's 3/4 perspective originals (3/4 shows frame depth + finish). Don't replace mirrors. |

## URL inference trick

If you find one Shaw SKU for a line, you can usually infer all color variants by swapping the color code in the CDN URL. Then curl each to test `http 200 + size > 2000` to verify the variant exists.

Example — discovering TG79F Baker Blvd Penny Matte colors:
```bash
for code in 00100 00125 00150 00200 00400 00450 00500 00550 00950; do
  url="https://img.shawinc.com/s7/is/image/ShawIndustries/TG79F_${code}_MAIN?wid=1000"
  result=$(curl -sLo "/tmp/TG79F_${code}.jpg" -w "%{http_code}:%{size_download}" "$url")
  http=$(echo $result | cut -d: -f1)
  size=$(echo $result | cut -d: -f2)
  if [ "$http" = "200" ] && [ "$size" -gt 2000 ]; then
    echo "OK ${code}"
  fi
done
```

## Audit & replacement tooling

All scripts under `scripts/`:

- `audit-sm-swatches.ts` — download every SM swatch to `tmp/sm-swatches/`, render `tmp/swatch-audit.html` with size flags + visual review overlay. Flags `--download` to also persist the raw bytes to disk.
- `build-swatch-review-batches.mjs` — split `tmp/sm-swatches-manifest.json` into per-subagent review batches (by category cluster) for visual review subagents.
- `build-swatch-replacement-batches.mjs` — split flagged swatches by brand/product line for research subagents.
- `build-swatch-replacement-review.mjs` — render `tmp/swatch-replacements.html` with current-vs-candidate side-by-side, approve/reject UI backed by localStorage, export button.
- `upload-approved-swatches.ts` — read exported `swatch-decisions.json`, resize through `sharp` + JPEG q85 (matching `SwatchUpload.tsx`), overwrite Supabase Storage file in place, cache-bust the DB `swatch_url`. Supports `--decisions <path>` and `--dry-run`.

## Lessons

- **Swatch quality > prompt text** for generation. A swatch with 1–2 tiles visible makes Flux render giant tiles regardless of prompt. A clean 6+ tile catalog shot gives Flux an unambiguous scale signal.
- **Mirrors are an exception** to "head-on is always better" — 3/4 angle is the correct perspective because it shows frame depth and finish.
- **Don't auto-upload from subagent research** — even with reliable CDN sources, catalog images occasionally have subtle mismatches (wrong finish, wrong tile format, cropped oddly). Human review before upload catches these cheaply.
- **Subagents hit 529 overload** when launched 10+ in parallel. Run research batches in waves of 3 to avoid it.
- **Never run Read on full-size catalog images (2000px+)** — blows the subagent's context window. Resize via `sharp` to 256px first, then Read the thumbnail.
