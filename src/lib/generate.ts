import { createHash } from "crypto";
import type { Option, SubCategory } from "@/types";
import type { StepPhotoGenerationPolicyRecord } from "@/lib/db-queries";
import { getPhotoScopedIds, normalizePrimaryAccentAsWallPaint } from "@/lib/photo-scope";
import { resolveScopedFlooringSelections } from "@/lib/flooring-selection";
import { resolvePhotoGenerationPolicy, type ResolvedPhotoGenerationPolicy } from "@/lib/photo-generation-policy";
import { IMAGE_MODEL } from "@/lib/models";

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

    // Merge spatial hints: source hint expands to cover both zones.
    // Strip exclusion clauses (". NOT ..." / " — NOT ...") since the merged
    // selection now intentionally covers both zones.
    if (spatialHints && spatialHints[linkedSub] && spatialHints[subId]) {
      const stripExclusion = (h: string) => h
        .replace(/[.—–]\s*NOT\b.*$/i, "")          // legacy: ". NOT the island" / "— NOT the perimeter"
        .replace(/\.\s*(The island|Island|Perimeter wall cabinets|Perimeter)[^.]*separate[^.]*\.?$/i, "")  // BFL-style: "The island is a separate cabinet selection."
        .replace(/,\s*(separate|distinct)\s+from\s+[^.]+$/i, "")  // ", distinct from the perimeter cabinets"
        .trim();
      spatialHints[linkedSub] = `${stripExclusion(spatialHints[linkedSub])} and ${stripExclusion(spatialHints[subId])}`;
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

/**
 * Strip exclusion rules from a freshly-fetched optionLookup for linked subcategories
 * that were already merged by resolveLinkedOptions in the route handler.
 *
 * The route handler removes linked subs from selections and merges spatial hints,
 * but the Inngest function re-fetches optionLookup from DB — losing the rule stripping.
 * This function re-applies just the rule stripping by detecting merged linked subs:
 * subcategories that are scoped but not in selections, with a linkedToSubcategory
 * pointing to a selected subcategory.
 *
 * Mutates optionLookup in place.
 */
export function stripExclusionRulesForMergedLinks(
  scopedSubcategoryIds: string[],
  selections: Record<string, string>,
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
): void {
  for (const subId of scopedSubcategoryIds) {
    if (subId in selections) continue;
    for (const [key, entry] of optionLookup) {
      if (!key.startsWith(`${subId}:`)) continue;
      const linkedSub = entry.option.linkedToSubcategory;
      if (!linkedSub || !(linkedSub in selections)) continue;
      const sourceKey = `${linkedSub}:${selections[linkedSub]}`;
      const sourceEntry = optionLookup.get(sourceKey);
      if (sourceEntry?.subCategory.generationRules?.length) {
        sourceEntry.subCategory = {
          ...sourceEntry.subCategory,
          generationRules: sourceEntry.subCategory.generationRules.filter(
            r => !r.toLowerCase().includes("do not apply it to"),
          ),
        };
      }
      break;
    }
  }
}

export interface SwatchImage {
  label: string;
  buffer: Buffer;
  mediaType: string;
  /** Subcategory ID this swatch belongs to (for pass splitting). */
  subcategoryId: string;
}

/**
 * Bump this when prompt semantics materially change so old cached images are not reused.
 */
export const GENERATION_CACHE_VERSION = "v2.12";

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
/**
 * Full-generation prompt for Flux 2.
 *
 * Each surface gets a self-contained "Apply image N to [location]" line.
 * No opening sentence, no rules block, no scene block — Flux sees the
 * base photo directly and attends most strongly to early tokens.
 * Dimensions are integrated inline ("as [format] to [location]").
 */
export async function buildEditPrompt(
  visualSelections: Record<string, string>,
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
  spatialHints: Record<string, string>,
  resolveSwatchBuffer?: SwatchBufferResolver,
  defaultSurfaceColors?: Record<string, string>,
): Promise<{ prompt: string; swatches: SwatchImage[] }> {
  const lines: string[] = [];
  const swatches: SwatchImage[] = [];
  // BFL numbering: input_image = image 1 (base photo), input_image_2 = image 2, etc.
  let imageIndex = 2;

  // Sort by visual impact — highest-impact surfaces get earliest word position.
  // More specific patterns first (island-cabinet before cabinet-color).
  const SUBCATEGORY_PRIORITY: [string, number][] = [
    ["island-cabinet", 1],     // renders after perimeter cabinets (priority 0)
    ["cabinet-color", 0],      // perimeter cabinets — largest surface
    ["counter", 2],
    ["backsplash", 3],
    ["floor", 4],
    ["paint", 5],
  ];
  function getSubcategoryPriority(slug: string): number {
    for (const [pattern, priority] of SUBCATEGORY_PRIORITY) {
      if (slug.includes(pattern)) return priority;
    }
    return 99;
  }
  const sortedSelections = Object.entries(visualSelections).sort(([a], [b]) => {
    const pa = getSubcategoryPriority(a);
    const pb = getSubcategoryPriority(b);
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });

  for (const [subId, optId] of sortedSelections) {
    const found = optionLookup.get(`${subId}:${optId}`);
    if (!found) continue;

    const { option, subCategory } = found;

    // Suppress zero-change options
    if (optId.endsWith("-none") || optId.endsWith("-no-upgrade")) continue;
    if (!option.swatchUrl && !option.swatchColor && !option.promptDescriptor) continue;

    const hint = spatialHints[subId];
    const surface = hint || subCategory.name;
    const dims = option.dimensions?.trim();

    if (option.swatchUrl && resolveSwatchBuffer) {
      try {
        const resolved = await resolveSwatchBuffer(option.swatchUrl);
        if (resolved) {
          swatches.push({ label: subCategory.name, buffer: resolved.buffer, mediaType: resolved.mediaType, subcategoryId: subId });
          // Cabinet paint is a recolor of existing door geometry, not a material
          // replacement. "Apply image N to X" + "match exactly" lets Flux drift
          // door profile / rails / hardware because a flat color swatch has no
          // geometric anchor. Recolor verb + positive preservation clause pins
          // the structure.
          //
          // Detection is structural (by subcategory slug), NOT by descriptor
          // text — SM's cabinet options have NULL prompt_descriptor, and
          // relying on the descriptor text would leave SM on the broken
          // template. Every *-cabinet-color subcategory is paint or stain by
          // construction; we carve stains out because stain swatches carry
          // grain texture and the material-transfer template suits them.
          const isCabinetColorSub = subId.includes("cabinet-color");
          const isStain = option.name?.toLowerCase().includes("stain")
            || option.promptDescriptor?.toLowerCase().includes("stain");
          const isCabinetPaint = isCabinetColorSub && !isStain;
          // isPaint still covers wall paint for the hex append; cabinet paint
          // is additive so SM cabinets get hex even without a descriptor.
          const isPaint = subId.includes("paint")
            || option.promptDescriptor?.toLowerCase().includes("painted")
            || isCabinetPaint;
          const paintHex = isPaint ? option.swatchColor?.trim() : null;
          const hexPart = paintHex ? `, exact color ${paintHex}` : "";
          const dimPart = dims ? ` (${dims})` : "";
          const line = isCabinetPaint
            ? `Recolor ${surface} to the color in image ${imageIndex}${hexPart}. A color change only — door profile, shaker rails, stiles, panel recesses, and hardware remain as they appear in image 1. The stainless steel refrigerator, range, microwave, oven, vent hood, sink, and faucet remain as they appear in image 1.`
            : `Apply image ${imageIndex} to ${surface}${dimPart}${hexPart}.`;
          lines.push(line);
          imageIndex++;
          continue;
        }
      } catch { /* fallback below */ }
    }

    if (option.swatchUrl && !swatches.some(s => s.subcategoryId === subId)) {
      console.warn(`[buildEditPrompt] Swatch resolution failed for ${subId}: ${option.swatchUrl}`);
    }

    // Fallback (no swatch image): hex color or option name
    const hex = option.swatchColor?.trim();
    if (hex) {
      lines.push(`${surface} in color ${hex}.`);
    } else {
      lines.push(`${surface}: ${option.name}.`);
    }
  }

  // Hex preservation for unselected surfaces (end of prompt = lowest attention)
  if (defaultSurfaceColors) {
    const subCategoryById = new Map<string, SubCategory>();
    for (const [, { subCategory }] of optionLookup) {
      if (!subCategoryById.has(subCategory.id)) subCategoryById.set(subCategory.id, subCategory);
    }
    for (const [subId, hex] of Object.entries(defaultSurfaceColors)) {
      if (subId in visualSelections) continue;
      const sub = subCategoryById.get(subId);
      if (!sub) continue;
      const hint = spatialHints[subId];
      const surface = hint || sub.name;
      lines.push(`${surface} stays at color ${hex}.`);
    }
  }

  if (lines.length === 0) {
    return { prompt: "Return this image unchanged.", swatches: [] };
  }

  const prompt = `${lines.join("\n")}
Photorealistic, neutral white balance, natural sunlight.`.trimEnd();

  return { prompt, swatches };
}

/**
 * Scoped-edit prompt for Flux 2 (Flux-native format).
 *
 * Uses "Apply image 2 to [surface]" matching the full-gen format.
 * Klein/Flex preserve unchanged surfaces by default, so we keep this
 * minimal: target surface + swatch reference + location.
 */
export async function buildScopedEditPrompt(
  changedSubcategoryId: string,
  changedOptionId: string,
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
  spatialHints: Record<string, string>,
  resolveSwatchBuffer?: SwatchBufferResolver,
): Promise<{ prompt: string; swatches: SwatchImage[] }> {
  const swatches: SwatchImage[] = [];
  const changed = optionLookup.get(`${changedSubcategoryId}:${changedOptionId}`);
  if (!changed) {
    return { prompt: "Return this image unchanged.", swatches: [] };
  }

  const { option, subCategory } = changed;

  const hint = spatialHints[changedSubcategoryId];
  const surface = hint || subCategory.name;
  const dims = option.dimensions?.trim();

  // Resolve swatch — Flux-native format: "Apply image 2 to [surface]"
  if (option.swatchUrl && resolveSwatchBuffer) {
    try {
      const resolved = await resolveSwatchBuffer(option.swatchUrl);
      if (resolved) {
        swatches.push({ label: subCategory.name, buffer: resolved.buffer, mediaType: resolved.mediaType, subcategoryId: changedSubcategoryId });
        // Cabinet paint: recolor, not material replacement. Detection is by
        // subcategory slug (not descriptor text) so SM cabinets — which have
        // NULL prompt_descriptor — get the same fix as Demo cabinets.
        // See buildEditPrompt for the full rationale.
        const isCabinetColorSub = changedSubcategoryId.includes("cabinet-color");
        const isStain = option.name?.toLowerCase().includes("stain")
          || option.promptDescriptor?.toLowerCase().includes("stain");
        const isCabinetPaint = isCabinetColorSub && !isStain;
        const isPaint = changedSubcategoryId.includes("paint")
          || option.promptDescriptor?.toLowerCase().includes("painted")
          || isCabinetPaint;
        const paintHex = isPaint ? option.swatchColor?.trim() : null;
        const hexPart = paintHex ? `, exact color ${paintHex}` : "";
        const dimPart = dims ? ` (${dims})` : "";
        const prompt = isCabinetPaint
          ? `Recolor ${surface} to the color in image 2${hexPart}. A color change only — door profile, shaker rails, stiles, panel recesses, and hardware remain as they appear in image 1. The stainless steel refrigerator, range, microwave, oven, vent hood, sink, and faucet remain as they appear in image 1.`
          : `Apply image 2 to ${surface}${dimPart}${hexPart}. Match image 2 exactly. Preserve natural sunlight.`;
        return { prompt, swatches };
      }
    } catch { /* fallback below */ }
  }

  // Fallback (no swatch image): hex color or option name
  // Keep article for readability when surface is a bare subcategory name
  const article = /^(all|the|every)\b/i.test(surface) ? "" : "the ";
  const hex = option.swatchColor?.trim();
  const fallback = hex ? `Apply color ${hex} to` : `Apply ${option.name} to`;
  const prompt = `${fallback} ${article}${surface}. Preserve natural sunlight.`;

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

  const resolvedPolicy = resolvePhotoGenerationPolicy({
    orgSlug: policyContext.orgSlug,
    floorplanSlug: policyContext.floorplanSlug,
    stepSlug: aiConfig.stepSlug,
    stepPhotoId: policyContext.stepPhotoId,
    imagePath: aiConfig.photo.imagePath,
    modelName,
    selections: scopedSelections,
  }, dbPolicy);

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
