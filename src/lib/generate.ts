import { createHash } from "crypto";
import type { Option, SubCategory } from "@/types";

export interface SwatchImage {
  label: string;
  buffer: Buffer;
  mediaType: string;
}

/**
 * Bump this when prompt semantics materially change so old cached images are not reused.
 */
export const GENERATION_CACHE_VERSION = "v8";

export interface PromptPolicyOverrides {
  invariantRulesAlways?: string[];
  invariantRulesWhenSelected?: Record<string, string[]>;
  invariantRulesWhenNotSelected?: Record<string, string[]>;
}

const INVARIANT_RULES_BY_SUBCATEGORY: Record<string, string[]> = {
  "kitchen-cabinet-color": [
    "Apply cabinet color ONLY to perimeter/wall cabinets. Do NOT apply it to island cabinetry.",
  ],
  "kitchen-island-cabinet-color": [
    "Apply island cabinet color ONLY to island base cabinets in the foreground. Do NOT apply it to perimeter/wall cabinets.",
  ],
  "kitchen-cabinet-hardware": [
    "Keep hardware count and placement identical. Do NOT add or remove pulls/knobs.",
  ],
  "kitchen-sink": [
    "Keep the sink basin in the exact same cutout position, scale, and orientation. Do NOT mirror/flip/rotate it.",
  ],
  "kitchen-faucet": [
    "Keep faucet base location and spout direction exactly as in the source photo. Do NOT mirror/flip it.",
  ],
  "dishwasher": [
    "Keep the dishwasher in the same slot next to the sink. Do NOT relocate it.",
  ],
  "refrigerator": [
    "Keep the refrigerator in its built-in alcove. Do NOT move, resize, or relocate it.",
  ],
  "range": [
    "Keep the range in the same back-wall cutout between the same cabinets. Do NOT move or relocate it.",
    "A kitchen range in this step is a SINGLE-oven appliance: exactly one oven door below the cooktop. Do NOT add a second/upper oven door or a stacked double-oven look.",
  ],
};

const INVARIANT_RULES_BY_OPTION_ID: Record<string, string[]> = {
  "range-ge-included-freestanding": [
    "Freestanding range: include the raised backguard/control panel behind the burners.",
    "This is still a single-oven range: one oven cavity/door only, with no upper oven compartment.",
  ],
  "range-ge-gas-slide-in": [
    "Slide-in range: NO raised backguard panel; the cooktop sits flush with the countertop and backsplash is visible directly behind it.",
    "If the source photo shows a freestanding range backguard, remove that backguard and restore matching backsplash tile directly behind the range.",
    "This is still a single-oven range: one oven cavity/door only, with no upper oven compartment.",
  ],
  "range-ge-gas-slide-in-convection": [
    "Slide-in range: NO raised backguard panel; the cooktop sits flush with the countertop and backsplash is visible directly behind it.",
    "If the source photo shows a freestanding range backguard, remove that backguard and restore matching backsplash tile directly behind the range.",
    "This is still a single-oven range: one oven cavity/door only, with no upper oven compartment.",
  ],
};

/**
 * Resolve a swatch URL to a Buffer (downloads from Supabase Storage).
 * Return null if the swatch can't be loaded.
 */
export type SwatchBufferResolver = (swatchUrl: string) => Promise<{ buffer: Buffer; mediaType: string } | null>;

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
  const selectedOptionIds = new Set<string>();
  const dynamicInvariantRules = new Set<string>();
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
    selectedOptionIds.add(option.id);

    if (subId === "range") {
      const optionName = option.name.toLowerCase();
      if (optionName.includes("slide in") || optionName.includes("slide-in")) {
        dynamicInvariantRules.add(
          "Selected range is slide-in: NO raised backguard panel; the cooktop sits flush with the countertop and backsplash is visible directly behind it."
        );
        dynamicInvariantRules.add(
          "If the source photo shows a freestanding range backguard, remove that backguard and restore matching backsplash tile directly behind the range."
        );
      }
      if (optionName.includes("freestanding") || optionName.includes("free standing")) {
        dynamicInvariantRules.add(
          "Selected range is freestanding: include a raised backguard/control panel behind the burners."
        );
      }
    }

    const hint = spatialHints[subId];
    const descriptor = option.promptDescriptor?.trim();
    const descriptorSuffix = descriptor ? ` (${descriptor})` : "";
    const label = hint
      ? `${subCategory.name}: ${option.name}${descriptorSuffix} → apply to ${hint}`
      : `${subCategory.name}: ${option.name}${descriptorSuffix}`;

    if (option.swatchUrl && resolveSwatchBuffer) {
      try {
        const resolved = await resolveSwatchBuffer(option.swatchUrl);
        if (resolved) {
          swatches.push({ label, buffer: resolved.buffer, mediaType: resolved.mediaType });
          listLines.push(`${listIndex}. ${label} (use swatch #${swatchIndex})`);
          swatchIndex += 1;
          listIndex += 1;
        } else {
          listLines.push(`${listIndex}. ${label} (no swatch image available; follow text exactly)`);
          listIndex += 1;
        }
      } catch {
        listLines.push(`${listIndex}. ${label} (no swatch image available; follow text exactly)`);
        listIndex += 1;
      }
    } else {
      // No swatch image available — describe by name
      listLines.push(`${listIndex}. ${label} (no swatch image available; follow text exactly)`);
      listIndex += 1;
    }
  }

  if (listLines.length === 0) {
    return {
      prompt: "This is a photo of a room in a new-construction home. Return this image unchanged.",
      swatches: [],
    };
  }

  const invariantRules = new Set<string>();
  for (const subId of selectedSubIds) {
    const rules = INVARIANT_RULES_BY_SUBCATEGORY[subId];
    if (!rules) continue;
    for (const rule of rules) invariantRules.add(rule);
  }
  for (const optionId of selectedOptionIds) {
    const rules = INVARIANT_RULES_BY_OPTION_ID[optionId];
    if (!rules) continue;
    for (const rule of rules) invariantRules.add(rule);
  }
  for (const rule of dynamicInvariantRules) {
    invariantRules.add(rule);
  }
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

  const hasApplianceSelection =
    selectedSubIds.has("dishwasher") ||
    selectedSubIds.has("refrigerator") ||
    selectedSubIds.has("range");
  const editObjective = hasApplianceSelection
    ? "Edit this room photo to match the selected finishes and appliance models."
    : "Edit this room photo. Change ONLY the color/texture of these surfaces — nothing else:";
  const applianceRuleBlock = hasApplianceSelection
    ? `\n- Appliance selections (dishwasher/refrigerator/range) may require model-shape changes. Replace ONLY the selected appliance in-place to match the swatch and descriptor.
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
- For each item marked "(no swatch image available; follow text exactly)", use the text descriptor and keep edits subtle.
- The "→ apply to" text tells you WHERE in the photo to apply each change. Treat each listed target as a separate mask; do NOT bleed one finish into another.
- If a requested surface or appliance is not clearly visible in the source photo, do NOT invent new geometry or objects to satisfy the request. Leave that target unchanged instead of hallucinating additions.
- Different rooms have different flooring. Tile stays in bathrooms. LVP/hardwood stays in closets, bedrooms, and hallways. Do NOT extend one flooring material into another room.
- Do NOT add, remove, or move any object except in-place replacement of explicitly selected appliances. Keep exact counts of cabinets, drawer fronts, fixtures, and hardware.
- Do NOT invent new cabinet seams/panels, remove panel grooves, or simplify existing door geometry.
- Preserve all structural details: cabinet door panel style (shaker, beadboard, etc.), countertop edges, trim profiles.
- If an edit is difficult, under-edit the finish rather than changing layout, geometry, or object position.
- Keep the exact camera angle, perspective, lighting, and room layout.
- Photorealistic result with accurate shadows and reflections.${applianceRuleBlock}${invariantBlock}`;

  return { prompt, swatches };
}

/**
 * Build a deterministic signature of the prompt context fields that affect generation output.
 * Used in the selections hash so cache invalidates when prompts/spatial hints change.
 */
export function buildPromptContextSignature(aiConfig: {
  sceneDescription?: string | null;
  photo: { photoBaseline?: string | null; spatialHint?: string | null };
  spatialHints?: Record<string, string> | null;
}): string {
  if (!aiConfig) return "";
  const sortedSpatialHints = Object.entries(aiConfig.spatialHints ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
  return [
    `scene:${aiConfig.sceneDescription ?? ""}`,
    `photoBaseline:${aiConfig.photo.photoBaseline ?? ""}`,
    `photoSpatialHint:${aiConfig.photo.spatialHint ?? ""}`,
    `spatialHints:${sortedSpatialHints}`,
  ].join("||");
}

export function hashSelections(selections: Record<string, string>): string {
  const sorted = Object.keys(selections)
    .sort()
    .map((k) => `${k}:${selections[k]}`)
    .join("|");
  return createHash("sha256").update(sorted).digest("hex").slice(0, 16);
}
