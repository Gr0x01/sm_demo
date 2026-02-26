import { createHash } from "crypto";
import sharp from "sharp";
import type { Option, SubCategory } from "@/types";

export interface SwatchImage {
  label: string;
  buffer: Buffer;
  mediaType: string;
  anchorHex?: string;
}

/**
 * Bump this when prompt semantics materially change so old cached images are not reused.
 */
export const GENERATION_CACHE_VERSION = "v21";

export interface PromptPolicyOverrides {
  invariantRulesAlways?: string[];
  invariantRulesWhenSelected?: Record<string, string[]>;
  invariantRulesWhenNotSelected?: Record<string, string[]>;
}

/**
 * Resolve a swatch URL to a Buffer (downloads from Supabase Storage).
 * Return null if the swatch can't be loaded.
 */
export type SwatchBufferResolver = (swatchUrl: string) => Promise<{ buffer: Buffer; mediaType: string } | null>;

function toHexChannel(value: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(value)));
  return clamped.toString(16).padStart(2, "0").toUpperCase();
}

/**
 * Derive a representative color anchor from the swatch image itself (not DB metadata).
 * Uses a downscaled image mean to stay robust across JPG/PNG/WebP swatches.
 */
async function extractSwatchAnchorHex(buffer: Buffer): Promise<string | null> {
  try {
    const stats = await sharp(buffer)
      .removeAlpha()
      .resize(64, 64, { fit: "inside" })
      .stats();
    const [r, g, b] = stats.channels;
    if (!r || !g || !b) return null;
    return `#${toHexChannel(r.mean)}${toHexChannel(g.mean)}${toHexChannel(b.mean)}`;
  } catch {
    return null;
  }
}

/**
 * Build the edit prompt text and collect swatch images for ALL visual selections.
 * Every selection with a swatchUrl sends its image to the AI.
 * Returns { prompt, swatches } — the route assembles these into the multimodal message.
 *
 * @param optionLookup Map of "subId:optId" → { option, subCategory }
 * @param spatialHints Map of subcategoryId → spatial hint text
 * @param sceneDescription Optional scene description for this step's hero image
 * @param photoSpatialHint Optional per-photo spatial guidance text
 * @param resolveSwatchBuffer Callback to download swatch from Supabase Storage.
 */
export async function buildEditPrompt(
  visualSelections: Record<string, string>,
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
  spatialHints: Record<string, string>,
  sceneDescription?: string | null,
  photoSpatialHint?: string | null,
  resolveSwatchBuffer?: SwatchBufferResolver,
  promptPolicyOverrides?: PromptPolicyOverrides,
): Promise<{ prompt: string; swatches: SwatchImage[] }> {
  const listLines: string[] = [];
  const swatches: SwatchImage[] = [];
  const selectedSubIds = new Set<string>();
  const dynamicInvariantRules = new Set<string>();
  let hasApplianceSelection = false;
  let listIndex = 1;
  let swatchIndex = 1;

  // Deterministic order keeps prompt↔swatch mapping stable.
  const sortedSelections = Object.entries(visualSelections).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  for (const [subId, optId] of sortedSelections) {
    const found = optionLookup.get(`${subId}:${optId}`);
    if (!found) continue;

    selectedSubIds.add(subId);

    const { option, subCategory } = found;
    if (subCategory.isAppliance) hasApplianceSelection = true;

    // Collect DB-driven generation rules from subcategory and option
    if (subCategory.generationRules) {
      for (const rule of subCategory.generationRules) dynamicInvariantRules.add(rule);
    }
    if (option.generationRules) {
      for (const rule of option.generationRules) dynamicInvariantRules.add(rule);
    }

    const hint = spatialHints[subId];
    const descriptor = option.promptDescriptor?.trim();
    const descriptorSuffix = descriptor ? ` (${descriptor})` : "";
    const targetLabel = hint
      ? `${subCategory.name} → apply to ${hint}`
      : `${subCategory.name}`;
    const applianceLabel = hint
      ? `${subCategory.name}: ${option.name}${descriptorSuffix} → apply to ${hint}`
      : `${subCategory.name}: ${option.name}${descriptorSuffix}`;
    // Swatch-backed edits are swatch-authoritative for appearance, including appliances.
    const swatchBackedLabel = targetLabel;

    // Build fallback label when no swatch image is available.
    // Appliances: keep name + descriptor (AI needs model identification).
    // Finishes: use hex as sole color authority — never expose name/descriptor for color.
    const buildFallbackLabel = () => {
      if (subCategory.isAppliance) {
        return `${applianceLabel} (no swatch image available; follow text exactly)`;
      }
      const hex = option.swatchColor?.trim();
      if (hex) {
        return `${targetLabel} (no swatch; target color ${hex})`;
      }
      return `${targetLabel} (no swatch image available; keep existing color)`;
    };

    if (option.swatchUrl && resolveSwatchBuffer) {
      try {
        const resolved = await resolveSwatchBuffer(option.swatchUrl);
        if (resolved) {
          const anchorHex = await extractSwatchAnchorHex(resolved.buffer);
          swatches.push({ label: swatchBackedLabel, buffer: resolved.buffer, mediaType: resolved.mediaType, anchorHex: anchorHex ?? undefined });
          const anchorSuffix = anchorHex ? `; swatch-derived color anchor ${anchorHex}` : "";
          listLines.push(`${listIndex}. ${swatchBackedLabel} (use swatch #${swatchIndex}${anchorSuffix})`);
          swatchIndex += 1;
          listIndex += 1;
        } else {
          listLines.push(`${listIndex}. ${buildFallbackLabel()}`);
          listIndex += 1;
        }
      } catch {
        listLines.push(`${listIndex}. ${buildFallbackLabel()}`);
        listIndex += 1;
      }
    } else {
      listLines.push(`${listIndex}. ${buildFallbackLabel()}`);
      listIndex += 1;
    }
  }

  if (listLines.length === 0) {
    return {
      prompt: "This is a photo of a room in a new-construction home. Return this image unchanged.",
      swatches: [],
    };
  }

  const invariantRules = new Set<string>(dynamicInvariantRules);
  for (const rule of promptPolicyOverrides?.invariantRulesAlways ?? []) {
    invariantRules.add(rule);
  }
  for (const [subId, rules] of Object.entries(promptPolicyOverrides?.invariantRulesWhenSelected ?? {})) {
    if (!selectedSubIds.has(subId)) continue;
    for (const rule of rules) invariantRules.add(rule);
  }
  for (const [subId, rules] of Object.entries(promptPolicyOverrides?.invariantRulesWhenNotSelected ?? {})) {
    if (selectedSubIds.has(subId)) continue;
    for (const rule of rules) invariantRules.add(rule);
  }
  const invariantBlock =
    invariantRules.size > 0
      ? `\nCRITICAL FIXED-GEOMETRY RULES:\n${Array.from(invariantRules).map((r) => `- ${r}`).join("\n")}`
      : "";
  const hasCommonWallPaintSelection = selectedSubIds.has("common-wall-paint");
  const hasAccentColorSelection = selectedSubIds.has("accent-color");
  const hasFireplaceMantelAccentSelection = selectedSubIds.has("fireplace-mantel-accent");
  const hasWainscotingSelection = selectedSubIds.has("wainscoting");
  const hasPerspectiveSensitiveTrimSelection =
    hasWainscotingSelection ||
    hasFireplaceMantelAccentSelection;
  const wallPaintRuleBlock =
    hasCommonWallPaintSelection && hasAccentColorSelection
      ? `\n- Common Wall Paint and Accent Color are separate wall-finish targets. Keep them in separate wall zones; do NOT blend or average them.
- Accent Color applies only to accent-designated wall zones for this photo.
- Common Wall Paint applies only to non-accent painted drywall wall zones for this photo.
- Do NOT paint non-wall surfaces: tile, cabinets, mirrors, glass, trim, doors, countertops, or flooring unless those categories are explicitly selected.`
      : hasCommonWallPaintSelection
      ? `\n- Common Wall Paint applies to ALL visible painted drywall wall surfaces across every visible zone/room in frame (including bathroom, closet, hallway, and kitchen zones when visible).
- Do NOT paint non-wall surfaces: tile, cabinets, mirrors, glass, trim, doors, countertops, or flooring unless those categories are explicitly selected.`
      : hasAccentColorSelection
      ? `\n- Accent Color applies to the accent-designated painted drywall wall zones visible in this photo.
- Do NOT paint non-wall surfaces: tile, cabinets, mirrors, glass, trim, doors, countertops, or flooring unless those categories are explicitly selected.`
      : "";
  const trimPerspectiveRuleBlock = hasPerspectiveSensitiveTrimSelection
    ? `\n- Perspective-lock for trim edits: keep the exact original camera position, focal length, vanishing points, and framing. No zoom, crop, tilt, pan, or lens shift.
- For wainscoting and fireplace accent/shiplap edits, apply changes as in-place planar overlays on existing wall surfaces only.
- Do NOT move, resize, redraw, or re-proportion architectural geometry (fireplace opening, mantel structure, windows, doors, casing, crown, baseboards, wall corners, ceiling beams).`
    : "";
  const fireplaceAccentIsolationRuleBlock =
    hasFireplaceMantelAccentSelection && !hasWainscotingSelection
      ? `\n- Fireplace Mantel Accent (including shiplap/box-style) applies ONLY to the accent wall zone directly above the fireplace mantel.
- Do NOT add or extend any paneling, shiplap, shadow-box trim, or wainscoting to non-fireplace walls when wainscoting is not selected.
- Keep all existing non-fireplace wall panel layouts unchanged.`
      : hasFireplaceMantelAccentSelection
      ? `\n- Fireplace Mantel Accent applies ONLY to the accent wall zone directly above the fireplace mantel; do NOT propagate this treatment to other walls.`
      : "";
  const panelingGuardRuleBlock = !hasWainscotingSelection
    ? `\n- Wainscoting/paneling/shiplap are OFF unless explicitly selected. Do NOT add, extend, remove, or restyle any wall paneling anywhere in the image.
- If the source photo already contains paneling, keep its footprint, height, seams, and style unchanged.`
    : "";
  const fireplaceAccentOffRuleBlock = !hasFireplaceMantelAccentSelection
    ? `\n- Fireplace mantel accent/shiplap is OFF unless explicitly selected. Keep the fireplace wall detailing exactly as in the source photo.`
    : "";

  const editObjective = hasApplianceSelection
    ? "Edit this room photo to match the selected finishes and appliance models."
    : "Edit this room photo. Change ONLY the color/texture of these surfaces — nothing else:";
  const applianceRuleBlock = hasApplianceSelection
    ? `\n- Appliance selections (dishwasher/refrigerator/range) may require model-shape changes. Replace ONLY the selected appliance in-place.
- If an appliance has a swatch, use that swatch as the ONLY appearance authority for finish/color/material.
- Only if an appliance has no swatch image available, follow the text descriptor for appearance.
- Keep each appliance in the same location, opening, perspective, and approximate footprint.`
    : "";

  const sceneContextLines: string[] = [];
  if (sceneDescription?.trim()) {
    sceneContextLines.push(`SCENE: ${sceneDescription.trim()}`);
  }
  if (photoSpatialHint?.trim()) {
    sceneContextLines.push(`PHOTO_LAYOUT: ${photoSpatialHint.trim()}`);
  }
  const sceneBlock = sceneContextLines.length > 0 ? `${sceneContextLines.join("\n")}\n\n` : "";
  const swatchMappingLine =
    swatches.length > 0
      ? `Swatch mapping: after the base room photo, attached swatches are ordered #1..#${swatches.length}.`
      : "No swatch attachments were provided; use text instructions only.";

  const prompt = `${sceneBlock}${editObjective}

${listLines.join("\n")}

RULES:
- ${swatchMappingLine}
- For each item marked "(use swatch #N)", match that swatch's color, pattern, and texture EXACTLY on the specified surface.
- For swatch-backed edits (including appliances), the swatch image is the ONLY appearance authority. Treat option names/descriptors as non-authoritative for color/finish/material.
- If a line includes "swatch-derived color anchor #RRGGBB", use it as a numeric target from that swatch image and avoid hue drift (no unintended green/blue cast).
- For each item marked "(no swatch image available; follow text exactly)", use the text descriptor and keep edits subtle.
- The "→ apply to" text tells you WHERE in the photo to apply each change. Treat each listed target as a separate mask; do NOT bleed one finish into another.
- If a requested surface or appliance is not clearly visible in the source photo, do NOT invent new geometry or objects to satisfy the request. Leave that target unchanged instead of hallucinating additions.
- Different rooms can have different flooring. Keep bathroom tile in bathroom zones only.
- Bedrooms and nearby spaces may be carpet or hard-surface depending on the selected flooring options; follow those selected options exactly for each visible room.
- Do NOT bleed one flooring material across doorway boundaries into a room that should keep a different selected material.
- If a bathroom is visible through a doorway, keep bathroom floor tile unchanged unless a bathroom tile selection is explicitly included for that photo.
- Do NOT add, remove, or move any object except in-place replacement of explicitly selected appliances. Keep exact counts of cabinets, drawer fronts, fixtures, and hardware.
- In doorway or multi-room views, keep edits inside the explicitly targeted visible zone and do NOT propagate flooring/fixtures into adjacent rooms.
- Never add televisions, media walls, built-ins, or extra cabinetry unless that exact item is explicitly selected in the list above.
- Never convert bathroom fixture types (tub, vanity, shower, toilet) unless the selected options explicitly target that fixture and it is clearly visible.
- Do NOT invent new cabinet seams/panels, remove panel grooves, or simplify existing door geometry.
- Preserve all structural details: cabinet door panel style (shaker, beadboard, etc.), countertop edges, trim profiles.
- If an edit is difficult, under-edit the finish rather than changing layout, geometry, or object position.
- Keep the exact camera angle, perspective, lighting, and room layout.
- Photorealistic result with accurate shadows and reflections.${wallPaintRuleBlock}${trimPerspectiveRuleBlock}${fireplaceAccentIsolationRuleBlock}${panelingGuardRuleBlock}${fireplaceAccentOffRuleBlock}${applianceRuleBlock}${invariantBlock}`;

  return { prompt, swatches };
}

/**
 * Build a deterministic signature of the prompt context fields that affect generation output.
 * Used in the selections hash so cache invalidates when prompts/spatial hints/generation rules change.
 */
export function buildPromptContextSignature(
  aiConfig: {
    sceneDescription?: string | null;
    photo: { photoBaseline?: string | null; spatialHint?: string | null };
    spatialHints?: Record<string, string> | null;
  },
  selections?: Record<string, string>,
  optionLookup?: Map<string, { option: Option; subCategory: SubCategory }>,
): string {
  if (!aiConfig) return "";
  const sortedSpatialHints = Object.entries(aiConfig.spatialHints ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");

  // Build a deterministic signature of generation rules that apply to the current selections
  let rulesSignature = "";
  if (selections && optionLookup) {
    const ruleParts: string[] = [];
    for (const [subId, optId] of Object.entries(selections).sort(([a], [b]) => a.localeCompare(b))) {
      const found = optionLookup.get(`${subId}:${optId}`);
      if (!found) continue;
      if (found.subCategory.generationRules?.length) {
        ruleParts.push(`s:${subId}:${found.subCategory.generationRules.join(";")}`);
      }
      if (found.option.generationRules?.length) {
        ruleParts.push(`o:${optId}:${found.option.generationRules.join(";")}`);
      }
    }
    if (ruleParts.length > 0) rulesSignature = ruleParts.join("|");
  }

  return [
    `scene:${aiConfig.sceneDescription ?? ""}`,
    `photoBaseline:${aiConfig.photo.photoBaseline ?? ""}`,
    `photoSpatialHint:${aiConfig.photo.spatialHint ?? ""}`,
    `spatialHints:${sortedSpatialHints}`,
    `rules:${rulesSignature}`,
  ].join("||");
}

export function hashSelections(selections: Record<string, string>): string {
  const sorted = Object.keys(selections)
    .sort()
    .map((k) => `${k}:${selections[k]}`)
    .join("|");
  return createHash("sha256").update(sorted).digest("hex").slice(0, 16);
}
