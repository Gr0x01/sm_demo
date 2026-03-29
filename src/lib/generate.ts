import { createHash } from "crypto";
import sharp from "sharp";
import type { Option, SubCategory } from "@/types";
import type { StepPhotoGenerationPolicyRecord } from "@/lib/db-queries";
import { getPhotoScopedIds, normalizePrimaryAccentAsWallPaint } from "@/lib/photo-scope";
import { resolveScopedFlooringSelections } from "@/lib/flooring-selection";
import { resolvePhotoGenerationPolicy, type ResolvedPhotoGenerationPolicy } from "@/lib/photo-generation-policy";
import { IMAGE_MODEL, ISOLATION_IMAGE_MODEL, REFINEMENT_IMAGE_MODEL } from "@/lib/models";

/**
 * Resolve linked options (e.g. "Match to Main Kitchen Cabinet Color").
 *
 * When the linked option resolves to the SAME swatch as the source:
 *   - Removes the linked subcategory from selections entirely
 *   - Merges spatial hints so the source covers both zones
 *   - Strips exclusion rules (e.g. "Do NOT apply to island") from the source
 *
 * When it resolves to a DIFFERENT swatch (shouldn't happen for "Match" options,
 * but defensive): copies the swatch so buildEditPrompt sees two swatch-backed selections.
 *
 * Mutates selections, spatialHints, and optionLookup in place.
 */
export function resolveLinkedOptions(
  selections: Record<string, string>,
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
  spatialHints?: Record<string, string>,
): void {
  for (const [subId, optId] of Object.entries(selections)) {
    const entry = optionLookup.get(`${subId}:${optId}`);
    if (!entry) continue;
    const linkedSub = entry.option.linkedToSubcategory;
    if (!linkedSub || entry.option.swatchUrl) continue;

    const sourceOptId = selections[linkedSub];
    if (!sourceOptId) continue;
    const sourceEntry = optionLookup.get(`${linkedSub}:${sourceOptId}`);
    if (!sourceEntry?.option.swatchUrl) continue;

    // Same swatch → merge into one selection covering both zones
    // Remove linked subcategory from selections
    delete selections[subId];

    // Merge spatial hints: source hint expands to cover both zones
    if (spatialHints && spatialHints[linkedSub] && spatialHints[subId]) {
      spatialHints[linkedSub] = `${spatialHints[linkedSub]} AND ${spatialHints[subId]}`;
      delete spatialHints[subId];
    }

    // Strip exclusion rules from the source subcategory (e.g. "Do NOT apply it to island")
    if (sourceEntry.subCategory.generationRules?.length) {
      sourceEntry.subCategory = {
        ...sourceEntry.subCategory,
        generationRules: sourceEntry.subCategory.generationRules.filter(
          r => !r.toLowerCase().includes("do not apply it to"),
        ),
      };
    }
  }
}

export interface SwatchImage {
  label: string;
  buffer: Buffer;
  mediaType: string;
  anchorHex?: string;
}

/**
 * Bump this when prompt semantics materially change so old cached images are not reused.
 */
export const GENERATION_CACHE_VERSION = "v39";

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
  scopedSubcategoryIds: string[],
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
    // Dimensions supplement the swatch with scale info (swatch photos can't convey size).
    const dimSuffix = option.dimensions?.trim() ? `; dimensions: ${option.dimensions.trim()}` : "";
    const swatchBackedLabel = `${targetLabel}${dimSuffix}`;

    // Build fallback label when no swatch image is available.
    // Appliances: keep name + descriptor (AI needs model identification).
    // Finishes: use hex as sole color authority — never expose name/descriptor for color.
    // No swatch + no hex: include option name so "No Wainscoting" etc. are visible to the AI.
    const buildFallbackLabel = () => {
      if (subCategory.isAppliance) {
        return `${applianceLabel} (no swatch image available; follow text exactly)`;
      }
      const hex = option.swatchColor?.trim();
      if (hex) {
        return `${targetLabel} (no swatch; target color ${hex})`;
      }
      return `${targetLabel}: ${option.name}${descriptorSuffix} (no swatch image available)`;
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

  // Negative-guard rules: for each subcategory in photo scope but NOT in the edit list,
  // inject its generationRulesWhenNotSelected into the invariant rules.
  const subCategoryById = new Map<string, SubCategory>();
  for (const [, { subCategory }] of optionLookup) {
    if (!subCategoryById.has(subCategory.id)) {
      subCategoryById.set(subCategory.id, subCategory);
    }
  }
  for (const subId of scopedSubcategoryIds) {
    if (selectedSubIds.has(subId)) continue;
    const sub = subCategoryById.get(subId);
    if (sub?.generationRulesWhenNotSelected?.length) {
      for (const rule of sub.generationRulesWhenNotSelected) {
        dynamicInvariantRules.add(rule);
      }
    }
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
      ? `\n\nSURFACE & PLACEMENT RULES:\n${Array.from(invariantRules).map((r) => `- ${r}`).join("\n")}`
      : "";

  // Detect flooring selections to conditionally include flooring boundary rules
  const hasFlooringSelection = [...selectedSubIds].some(subId =>
    subCategoryById.get(subId)?.name?.toLowerCase().includes("floor")
  );

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

  const flooringRules = hasFlooringSelection
    ? `\n- Different rooms can have different flooring. Do NOT bleed one flooring material across doorway boundaries into a room with a different selected material.
- Keep bathroom tile in bathroom zones only. If a bathroom is visible through a doorway, keep its floor tile unchanged unless a bathroom tile selection is explicitly included.`
    : "";

  const applianceRules = hasApplianceSelection
    ? `\n- Appliance selections may require model-shape changes. Replace ONLY the selected appliance in-place.
- Keep each appliance in the same location, opening, perspective, and approximate footprint.
- Appliance swatches are authoritative for finish/color/material. Only follow text descriptors when no swatch is available.`
    : "";

  const prompt = `${sceneBlock}Edit this room photo to match the selected finishes and appliance models.

${listLines.join("\n")}

RULES:
- ${swatchMappingLine}
- For each item marked "(use swatch #N)", match that swatch's color, pattern, and texture EXACTLY on the specified surface.
- For swatch-backed edits (including appliances), the swatch image is the ONLY appearance authority. Treat option names/descriptors as non-authoritative for color/finish/material.
- If a line includes "swatch-derived color anchor #RRGGBB", use it as a numeric target from that swatch image and avoid hue drift (no unintended green/blue cast).
- If a line includes "dimensions:", use them as scale/format context alongside the swatch (e.g. tile size, plank width, mosaic pattern).
- For each item marked "(no swatch image available; follow text exactly)", use the text descriptor and keep edits subtle.
- The "→ apply to" text tells you WHERE in the photo to apply each change. Treat each listed target as a separate mask; do NOT bleed one finish into another.
- If a requested surface or appliance is not clearly visible in the source photo, do NOT invent new geometry or objects to satisfy the request. Leave that target unchanged instead of hallucinating additions.${flooringRules}
- Do NOT add, remove, or move any object except in-place replacement of explicitly selected appliances. Keep exact counts of cabinets, drawer fronts, fixtures, and hardware.
- Never add extra cabinetry, built-ins, or pantry units unless that exact item is explicitly selected in the list above.
- In doorway or multi-room views, keep edits inside the explicitly targeted visible zone and do NOT propagate flooring/fixtures into adjacent rooms.
- Do NOT invent new cabinet seams/panels, remove panel grooves, or simplify existing door geometry.
- Preserve all structural details: cabinet door panel style (shaker, beadboard, etc.), countertop edges, trim profiles.
- If an edit is difficult, under-edit the finish rather than changing layout, geometry, or object position.
- Keep the exact camera angle, perspective, lighting, and room layout.
- Photorealistic result with accurate shadows and reflections.${applianceRules}${invariantBlock}`;

  return { prompt, swatches };
}

/**
 * Build a scoped edit prompt for changing a single surface in an already-generated image.
 * Reuses the policy/rules system from buildEditPrompt but produces a targeted prompt.
 */
export async function buildScopedEditPrompt(
  changedSubcategoryId: string,
  changedOptionId: string,
  allSelections: Record<string, string>,
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
  spatialHints: Record<string, string>,
  scopedSubcategoryIds: string[],
  sceneDescription?: string | null,
  photoSpatialHint?: string | null,
  resolveSwatchBuffer?: SwatchBufferResolver,
  promptPolicyOverrides?: PromptPolicyOverrides,
): Promise<{ prompt: string; swatches: SwatchImage[] }> {
  const swatches: SwatchImage[] = [];
  const changed = optionLookup.get(`${changedSubcategoryId}:${changedOptionId}`);
  if (!changed) {
    return { prompt: "Return this image unchanged.", swatches: [] };
  }

  const { option, subCategory } = changed;

  // Resolve swatch for the changed surface
  let swatchLine = "";
  if (option.swatchUrl && resolveSwatchBuffer) {
    try {
      const resolved = await resolveSwatchBuffer(option.swatchUrl);
      if (resolved) {
        const anchorHex = await extractSwatchAnchorHex(resolved.buffer);
        swatches.push({ label: subCategory.name, buffer: resolved.buffer, mediaType: resolved.mediaType, anchorHex: anchorHex ?? undefined });
        const anchorSuffix = anchorHex ? ` (swatch-derived color anchor ${anchorHex})` : "";
        swatchLine = `Match attached swatch #1 exactly for color, pattern, and texture${anchorSuffix}.`;
      }
    } catch { /* fallback below */ }
  }
  if (!swatchLine) {
    const hex = option.swatchColor?.trim();
    if (hex) {
      swatchLine = `Apply color ${hex}.`;
    } else {
      swatchLine = `Apply: ${option.name}${option.promptDescriptor ? ` (${option.promptDescriptor})` : ""}.`;
    }
  }

  const dimLine = option.dimensions?.trim() ? `\nDimensions/format: ${option.dimensions.trim()}` : "";
  const hint = spatialHints[changedSubcategoryId];
  const locationLine = hint ? `\nLocation: ${hint}` : "";

  // Build preserve list from other selections
  const preserveLines: string[] = [];
  for (const [subId, optId] of Object.entries(allSelections).sort(([a], [b]) => a.localeCompare(b))) {
    if (subId === changedSubcategoryId) continue;
    const found = optionLookup.get(`${subId}:${optId}`);
    if (!found) continue;
    preserveLines.push(`- ${found.subCategory.name}`);
  }
  preserveLines.push("- All appliances, fixtures, hardware, and lighting");
  preserveLines.push("- Room layout, camera angle, and perspective");

  // Collect generation rules from policy system (same logic as buildEditPrompt)
  const selectedSubIds = new Set(Object.keys(allSelections));
  const dynamicInvariantRules = new Set<string>();

  for (const [subId, optId] of Object.entries(allSelections)) {
    const found = optionLookup.get(`${subId}:${optId}`);
    if (!found) continue;
    if (found.subCategory.generationRules) {
      for (const rule of found.subCategory.generationRules) dynamicInvariantRules.add(rule);
    }
    if (found.option.generationRules) {
      for (const rule of found.option.generationRules) dynamicInvariantRules.add(rule);
    }
  }

  // Negative-guard rules for unselected subcategories
  const subCategoryById = new Map<string, SubCategory>();
  for (const [, { subCategory: sc }] of optionLookup) {
    if (!subCategoryById.has(sc.id)) subCategoryById.set(sc.id, sc);
  }
  for (const subId of scopedSubcategoryIds) {
    if (selectedSubIds.has(subId)) continue;
    const sub = subCategoryById.get(subId);
    if (sub?.generationRulesWhenNotSelected?.length) {
      for (const rule of sub.generationRulesWhenNotSelected) dynamicInvariantRules.add(rule);
    }
  }

  // Policy overrides
  const invariantRules = new Set<string>(dynamicInvariantRules);
  for (const rule of promptPolicyOverrides?.invariantRulesAlways ?? []) invariantRules.add(rule);
  for (const [subId, rules] of Object.entries(promptPolicyOverrides?.invariantRulesWhenSelected ?? {})) {
    if (!selectedSubIds.has(subId)) continue;
    for (const rule of rules) invariantRules.add(rule);
  }
  for (const [subId, rules] of Object.entries(promptPolicyOverrides?.invariantRulesWhenNotSelected ?? {})) {
    if (selectedSubIds.has(subId)) continue;
    for (const rule of rules) invariantRules.add(rule);
  }

  const rulesBlock = invariantRules.size > 0
    ? `\n\nSURFACE & PLACEMENT RULES:\n${Array.from(invariantRules).map(r => `- ${r}`).join("\n")}`
    : "";

  // Scene context
  const sceneContextLines: string[] = [];
  if (sceneDescription?.trim()) sceneContextLines.push(`SCENE: ${sceneDescription.trim()}`);
  if (photoSpatialHint?.trim()) sceneContextLines.push(`PHOTO_LAYOUT: ${photoSpatialHint.trim()}`);
  const sceneBlock = sceneContextLines.length > 0 ? `${sceneContextLines.join("\n")}\n\n` : "";

  const prompt = `${sceneBlock}TASK: Edit this room visualization. Change ONLY the ${subCategory.name}.

WHAT TO CHANGE:
${subCategory.name} — apply the material/color from the attached swatch.${dimLine}${locationLine}
${swatchLine}

DO NOT MODIFY (these must remain exactly as they currently appear):
${preserveLines.join("\n")}

Photorealistic result with accurate shadows and reflections.${rulesBlock}`;

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
  scopedSubcategoryIds?: string[],
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
    const selectedSubIds = new Set<string>();
    for (const [subId, optId] of Object.entries(selections).sort(([a], [b]) => a.localeCompare(b))) {
      const found = optionLookup.get(`${subId}:${optId}`);
      if (!found) continue;
      selectedSubIds.add(subId);
      if (found.subCategory.generationRules?.length) {
        ruleParts.push(`s:${subId}:${found.subCategory.generationRules.join(";")}`);
      }
      if (found.option.generationRules?.length) {
        ruleParts.push(`o:${optId}:${found.option.generationRules.join(";")}`);
      }
      if (found.option.dimensions?.trim()) {
        ruleParts.push(`d:${optId}:${found.option.dimensions.trim()}`);
      }
      if (found.option.needsIsolation) {
        ruleParts.push(`iso:${optId}`);
      }
    }
    // Negative-guard rules: include generationRulesWhenNotSelected for in-scope but unselected subcategories
    if (scopedSubcategoryIds?.length) {
      const subCategoryById = new Map<string, SubCategory>();
      for (const [, { subCategory }] of optionLookup) {
        if (!subCategoryById.has(subCategory.id)) {
          subCategoryById.set(subCategory.id, subCategory);
        }
      }
      for (const subId of [...scopedSubcategoryIds].sort()) {
        if (selectedSubIds.has(subId)) continue;
        const sub = subCategoryById.get(subId);
        if (sub?.generationRulesWhenNotSelected?.length) {
          ruleParts.push(`ns:${subId}:${sub.generationRulesWhenNotSelected.join(";")}`);
        }
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
    `scopedIds:${[...(scopedSubcategoryIds ?? [])].sort().join(",")}`,
  ].join("||");
}

// ---------- Shared helpers for generate + check routes ----------

export type StepPhotoAiConfig = NonNullable<Awaited<ReturnType<typeof import("@/lib/db-queries").getStepPhotoAiConfig>>>;
export type OptionLookupMap = Map<string, { option: Option; subCategory: SubCategory }>;

export function buildSceneDescription(aiConfig: StepPhotoAiConfig): string | null {
  if (aiConfig.photo.photoBaseline?.trim()) return aiConfig.photo.photoBaseline.trim();
  if (aiConfig.sceneDescription?.trim()) return aiConfig.sceneDescription.trim();
  return null;
}

export function filterSpatialHints(
  spatialHints: Record<string, string>,
  allowedIds: Set<string> | null,
): Record<string, string> {
  if (!allowedIds) return { ...spatialHints };
  return Object.fromEntries(
    Object.entries(spatialHints).filter(([key]) => allowedIds.has(key)),
  );
}

export interface DerivedGenerationContext {
  scopedSelections: Record<string, string>;
  scopedSubcategoryIds: string[];
  photoScopedIds: Set<string> | null;
  spatialHints: Record<string, string>;
  sceneDescription: string | null;
  promptContextSignature: string;
  resolvedPolicy: ResolvedPhotoGenerationPolicy;
  selectionsHash: string;
  selectionsFingerprint: string;
  /** The composite key that was hashed — use as selections_json for DB claims. */
  hashInputs: Record<string, string>;
  modelName: string;
  /** Pre-computed hashes for single-surface diff matching (partial cache). */
  leaveOneOutHashes: string[];
}

/**
 * Shared pipeline that derives everything needed for generation cache lookup and dispatch.
 * Used by both /api/generate/photo (generate) and /api/generate/photo/check (cache check).
 */
export function deriveGenerationContext(
  aiConfig: StepPhotoAiConfig,
  mergedSelections: Record<string, string>,
  optionLookup: OptionLookupMap,
  policyContext: { orgSlug: string; floorplanSlug: string; stepPhotoId: string },
  dbPolicy: StepPhotoGenerationPolicyRecord | null,
): DerivedGenerationContext {
  const sectionSubIds = aiConfig.sections.flatMap(s => s.subcategory_ids ?? []);
  const alsoInclude = aiConfig.alsoIncludeIds ?? [];
  const photoScopedIds = getPhotoScopedIds(
    aiConfig.photo.subcategoryIds,
    [...sectionSubIds, ...alsoInclude],
  );

  let scopedSelections = mergedSelections;
  if (photoScopedIds) {
    scopedSelections = Object.fromEntries(
      Object.entries(scopedSelections).filter(([key]) => photoScopedIds.has(key)),
    );
  }

  const flooringContextText = [
    aiConfig.photo.photoBaseline ?? "",
    aiConfig.photo.spatialHint ?? "",
    aiConfig.sceneDescription ?? "",
  ].join("\n");
  scopedSelections = resolveScopedFlooringSelections(scopedSelections, flooringContextText);
  const spatialHints = filterSpatialHints(aiConfig.spatialHints, photoScopedIds);
  resolveLinkedOptions(scopedSelections, optionLookup, spatialHints);
  scopedSelections = normalizePrimaryAccentAsWallPaint(scopedSelections, aiConfig.photo.remapAccentAsWallPaint);

  const sceneDescription = buildSceneDescription(aiConfig);

  const modelName = IMAGE_MODEL;
  const scopedSubcategoryIds = photoScopedIds ? [...photoScopedIds] : [];
  const promptContext = buildPromptContextSignature({
    sceneDescription,
    spatialHints,
    photo: {
      photoBaseline: aiConfig.photo.photoBaseline,
      spatialHint: aiConfig.photo.spatialHint,
    },
  }, scopedSelections, optionLookup, scopedSubcategoryIds);

  let resolvedPolicy = resolvePhotoGenerationPolicy({
    orgSlug: policyContext.orgSlug,
    floorplanSlug: policyContext.floorplanSlug,
    stepSlug: aiConfig.stepSlug,
    stepPhotoId: policyContext.stepPhotoId,
    imagePath: aiConfig.photo.imagePath,
    modelName,
    selections: scopedSelections,
  }, dbPolicy);

  // Option-driven flash isolation: scan selected options for needs_isolation flag
  const optionIsolatedSubs = new Set<string>();
  for (const [subId, optId] of Object.entries(scopedSelections)) {
    const found = optionLookup.get(`${subId}:${optId}`);
    if (found?.option.needsIsolation) {
      optionIsolatedSubs.add(subId);
    }
  }
  if (optionIsolatedSubs.size > 0) {
    const existingSubs = new Set(resolvedPolicy.flashPostPass?.isolateSubcategories ?? []);
    for (const sub of optionIsolatedSubs) existingSubs.add(sub);
    resolvedPolicy = {
      ...resolvedPolicy,
      flashPostPass: {
        reason: resolvedPolicy.flashPostPass?.reason ?? "option-level isolation",
        model: resolvedPolicy.flashPostPass?.model ?? ISOLATION_IMAGE_MODEL,
        isolateSubcategories: [...existingSubs],
      },
    };
  }

  // Option-driven Pro refinement: scan for stain cabinet options that need a post-pass
  const STAIN_MARKER = "wood STAIN";
  const cabinetPostPassSubs = new Set<string>();
  for (const [subId, optId] of Object.entries(scopedSelections)) {
    const found = optionLookup.get(`${subId}:${optId}`);
    if (!found) continue;
    const rules = found.option.generationRules ?? [];
    if (rules.some(r => r.includes(STAIN_MARKER))) {
      cabinetPostPassSubs.add(subId);
    }
  }
  // Also include subcategories whose selected option links TO a detected stain subcategory
  // (e.g. "Match to Main" island links to kitchen-cabinet-color)
  for (const [subId, optId] of Object.entries(scopedSelections)) {
    if (cabinetPostPassSubs.has(subId)) continue;
    const found = optionLookup.get(`${subId}:${optId}`);
    if (found?.option.linkedToSubcategory && cabinetPostPassSubs.has(found.option.linkedToSubcategory)) {
      cabinetPostPassSubs.add(subId);
    }
  }
  if (cabinetPostPassSubs.size > 0) {
    // If backsplash also needs isolation, include it in the Pro post-pass (Pro handles both)
    // and remove it from Flash (so Flash doesn't also run)
    const proSubs = new Set(cabinetPostPassSubs);
    if (resolvedPolicy.flashPostPass) {
      for (const sub of resolvedPolicy.flashPostPass.isolateSubcategories) {
        proSubs.add(sub);
      }
      // Suppress Flash — Pro handles everything
      resolvedPolicy = { ...resolvedPolicy, flashPostPass: undefined };
    }
    resolvedPolicy = {
      ...resolvedPolicy,
      proPostPass: {
        reason: "cabinet stain refinement",
        model: REFINEMENT_IMAGE_MODEL,
        subcategories: [...proSubs],
      },
    };
  }

  const hashInputs: Record<string, string> = {
    ...scopedSelections,
    _stepPhotoId: policyContext.stepPhotoId,
    _model: modelName,
    _cacheVersion: GENERATION_CACHE_VERSION,
    _promptPolicy: resolvedPolicy.policyKey,
    _promptContext: promptContext,
  };
  const selectionsHash = hashSelections(hashInputs);
  const selectionsFingerprint = hashSelections(scopedSelections);
  const leaveOneOutHashes = computeLeaveOneOutHashes(hashInputs, scopedSelections);

  return {
    scopedSelections,
    scopedSubcategoryIds,
    photoScopedIds,
    spatialHints,
    sceneDescription,
    promptContextSignature: promptContext,
    resolvedPolicy,
    selectionsHash,
    selectionsFingerprint,
    hashInputs,
    modelName,
    leaveOneOutHashes,
  };
}

/**
 * Compute leave-one-out hashes for single-surface diff matching.
 * For each subcategory in scopedSelections, computes a hash of all selections
 * EXCEPT that subcategory, plus stable context keys (_stepPhotoId, _model, _cacheVersion).
 *
 * Excludes _promptContext because it contains per-selection generation rules —
 * changing any selection changes _promptContext, which would defeat the purpose
 * of leave-one-out matching. The identifyChangedSubcategory check after the
 * query is the true correctness gate.
 */
export function computeLeaveOneOutHashes(
  hashInputs: Record<string, string>,
  scopedSelections: Record<string, string>,
): string[] {
  // Only include stable metadata keys — _promptContext changes per-selection
  const stableBase: Record<string, string> = {};
  for (const [k, v] of Object.entries(hashInputs)) {
    if (k === "_promptContext") continue;
    stableBase[k] = v;
  }

  return Object.keys(scopedSelections).sort().map(subId => {
    const without = { ...stableBase };
    delete without[subId];
    return hashSelections(without);
  });
}

/**
 * Given two selections maps, find the one subcategory that differs.
 * Returns null if they differ by 0 or 2+ subcategories.
 */
export function identifyChangedSubcategory(
  baseSelectionsJson: Record<string, unknown>,
  newSelections: Record<string, string>,
): { subcategoryId: string; oldOptionId: string; newOptionId: string } | null {
  // Filter out _-prefixed metadata keys from the base
  const baseSelections: Record<string, string> = {};
  for (const [k, v] of Object.entries(baseSelectionsJson)) {
    if (!k.startsWith("_") && typeof v === "string") baseSelections[k] = v;
  }

  let changed: { subcategoryId: string; oldOptionId: string; newOptionId: string } | null = null;
  const allKeys = new Set([...Object.keys(baseSelections), ...Object.keys(newSelections)]);

  for (const key of allKeys) {
    const oldVal = baseSelections[key];
    const newVal = newSelections[key];
    if (oldVal !== newVal) {
      if (changed) return null; // 2+ diffs
      changed = { subcategoryId: key, oldOptionId: oldVal ?? "", newOptionId: newVal ?? "" };
    }
  }

  return changed;
}

export function hashSelections(selections: Record<string, string>): string {
  const sorted = Object.keys(selections)
    .sort()
    .map((k) => `${k}:${selections[k]}`)
    .join("|");
  return createHash("sha256").update(sorted).digest("hex").slice(0, 16);
}
