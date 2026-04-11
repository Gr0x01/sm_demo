import { createHash } from "crypto";
import type { Option, SubCategory } from "@/types";
import type { StepPhotoGenerationPolicyRecord } from "@/lib/db-queries";
import type { PromptProse } from "@/lib/step-config";
import { getPhotoScopedIds, normalizePrimaryAccentAsWallPaint } from "@/lib/photo-scope";
import { resolveScopedFlooringSelections } from "@/lib/flooring-selection";
import { resolvePhotoGenerationPolicy, type ResolvedPhotoGenerationPolicy } from "@/lib/photo-generation-policy";
import { IMAGE_MODEL } from "@/lib/models";
import { getSubcategoryPriority, sortSelectionsByVisualImpact } from "@/lib/visual-impact-sort";

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
export const GENERATION_CACHE_VERSION = "v3.0";

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

  const sortedSelections = sortSelectionsByVisualImpact(visualSelections);

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
          // Paint: hex alongside swatch for precision under varied lighting.
          // Covers wall paint subcategories AND painted cabinet options (not stains).
          const isPaint = subId.includes("paint") || option.promptDescriptor?.toLowerCase().includes("painted");
          const paintHex = isPaint ? option.swatchColor?.trim() : null;
          const hexPart = paintHex ? `, exact color ${paintHex}` : "";
          const dimPart = dims ? ` (${dims})` : "";
          const line = `Apply image ${imageIndex} to ${surface}${dimPart}${hexPart}.`;
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
        // Paint: add hex for precision (swatch alone renders too dark under varied lighting)
        const isPaint = changedSubcategoryId.includes("paint") || option.promptDescriptor?.toLowerCase().includes("painted");
        const paintHex = isPaint ? option.swatchColor?.trim() : null;
        const hexPart = paintHex ? `, exact color ${paintHex}` : "";
        const dimPart = dims ? ` (${dims})` : "";
        const prompt = `Apply image 2 to ${surface}${dimPart}${hexPart}. Match image 2 exactly. Preserve natural sunlight.`;
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

// ---------- Prose prompt builders (BFL Flux 2 editing mode, v2) ----------
//
// Shape and rules are documented on the `PromptProse` type in step-config.ts.
// Everything here follows the BFL editing guide quotes captured in
// memory-bank/generation/bfl-prompting-guide.md — specifically:
//
//   - "Start short. Add only what changes the image." (fundamentals)
//   - "Reference images carry visual details. Your prompt describes what
//      should change." (Klein guide)
//   - "Word order matters — FLUX.2 pays more attention to what comes first."
//      (Max guide)
//
// Bare-minimum assembly: lead → action bullets (visual-impact sorted) →
// preserve tail (empty on day 1) → style trailer.

/**
 * Raised when a PromptProse object is structurally invalid. Used by both the
 * runtime builders and the admin save-time validator so error messages are
 * identical between the UI and the generation pipeline.
 */
export class PromptProseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromptProseError";
  }
}

/** Default lead clause appended in front of the action bullets. */
const DEFAULT_PROSE_LEAD = "Apply the following finishes to this kitchen photo:";

/**
 * Default style trailer. "real estate photography" anchors the photographic
 * genre (prevents editorial/product drift) and "neutral white balance"
 * counters Flux's documented warm cast on interiors.
 */
const DEFAULT_PROSE_STYLE = "Photorealistic real estate photography, natural daylight, neutral white balance.";

const IMAGE_TOKEN = "{image}";

/** Negative-framing and BFL-forbidden tokens. Forbidden in every field. */
const FORBIDDEN_NEGATIVE_WORDS = [
  "not", "no", "never", "without", "don't", "dont",
  "only", "avoid", "except",
  // "island" collapses to a BFL surface class — describe positionally instead.
  "island",
];

/**
 * Material/color/format words forbidden inside action clauses. The swatch is
 * the sole appearance authority; the action clause describes the SURFACE, not
 * what's on it. This list is enforced only on `actions` — style/lead/preserve
 * are allowed to use camera/film/photographic vocabulary.
 */
const FORBIDDEN_ACTION_MATERIAL_WORDS = [
  // Wood / stone materials
  "wood", "wooden", "oak", "walnut", "maple", "cherry", "pine", "birch",
  "marble", "granite", "quartz", "quartzite", "slate", "travertine", "limestone",
  // Tile formats
  "subway", "herringbone", "hexagon", "mosaic", "tile", "plank",
  // Colors
  "white", "black", "blue", "onyx", "beige", "taupe", "gray", "grey",
  "green", "red", "yellow", "brown", "cream", "ivory", "fog", "dove",
];

/** Hex code like #fff / #ffffff / #ffffffff. */
const HEX_COLOR_RE = /#[0-9a-f]{3,8}\b/i;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countToken(text: string, token: string): number {
  let count = 0;
  let idx = 0;
  while ((idx = text.indexOf(token, idx)) !== -1) {
    count++;
    idx += token.length;
  }
  return count;
}

function findForbiddenWord(text: string, forbidden: readonly string[]): string | null {
  const lower = text.toLowerCase();
  for (const word of forbidden) {
    // Word-boundary match. Escape any regex metachars in the forbidden word.
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(lower)) return word;
  }
  return null;
}

/**
 * Plural-permissive forbidden-word check for material/color words. Catches
 * both "tile" and "tiles", "plank" and "planks", etc. Irregular plurals
 * (cherries, etc.) aren't covered, but the common leak surfaces are.
 * Kept separate from `findForbiddenWord` because negative framing words
 * (`not`, `no`, `only`) don't pluralize.
 */
function findForbiddenMaterialWord(
  text: string,
  forbidden: readonly string[],
): string | null {
  const lower = text.toLowerCase();
  for (const word of forbidden) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // `s?` allows an optional trailing "s" for plural forms.
    if (new RegExp(`\\b${escaped}s?\\b`, "i").test(lower)) return word;
  }
  return null;
}

/**
 * A single prompt-time action entry. Unifies the two kinds of entries the
 * builder emits — one per ordinary selected subcategory, and one per merge
 * that fired — so visual-impact sort, swatch resolution, and image-index
 * substitution work uniformly over both.
 */
type ActionEntry = {
  /** Slug used for visual-impact sort. For merges, the first slug in `when`. */
  sortSlug: string;
  /** The clause template with exactly one {image} token. */
  template: string;
  /** Swatch URL to resolve. Already known to be non-null by the time we build this. */
  swatchUrl: string;
  /** Label for the SwatchImage record (for debugging / logs). */
  label: string;
  /** `subcategoryId` on the SwatchImage record. For merges, the first sub in `when`. */
  swatchSubcategoryId: string;
  /**
   * Optional `option.dimensions` text. Emitted as a parenthetical after the
   * substituted `{image}` token. Used to supply scale/size context that the
   * swatch image alone cannot carry (e.g. "thin 5-inch bar pull"). This is
   * the BFL-documented exception to swatch authority — see the prompting
   * guide's "Swatch Authority Rule" section.
   */
  dimensions?: string;
};

/**
 * Phase 1 of full-generation assembly: resolve merge declarations against
 * the current selections.
 *
 * A merge fires when every subcategory in `when` is present in
 * `visualSelections` AND they all resolve to the same `swatch_url`. When it
 * fires, those subcategories are removed from the working selections and a
 * single merged entry takes their place.
 *
 * Swatch URL equality is the correct detection criterion because it maps
 * directly to BFL's failure mode: two options pointing at the same storage
 * path produce byte-identical input images, which BFL dedupes into one
 * visual class and ignores competing clauses. Options that happen to share
 * the same hex but use different swatch files would not trigger BFL's
 * collapse, so we don't need hex fallback.
 *
 * Declarations are evaluated in order. A subcategory consumed by one merge
 * is unavailable to later merges. This is the simplest conflict resolution
 * for overlapping declarations; the validator prevents overlap at save time
 * anyway.
 */
function resolveMerges(
  visualSelections: Record<string, string>,
  mergedClauses: PromptProse["mergedClauses"],
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
): { reducedSelections: Record<string, string>; mergedEntries: ActionEntry[] } {
  if (!mergedClauses || mergedClauses.length === 0) {
    return { reducedSelections: { ...visualSelections }, mergedEntries: [] };
  }

  const reducedSelections = { ...visualSelections };
  const mergedEntries: ActionEntry[] = [];
  const consumed = new Set<string>();

  for (const entry of mergedClauses) {
    if (entry.when.length < 2) continue;
    if (entry.when.some(subId => consumed.has(subId))) continue;
    if (!entry.when.every(subId => subId in reducedSelections)) continue;

    const swatchUrls = entry.when.map(subId => {
      const found = optionLookup.get(`${subId}:${reducedSelections[subId]}`);
      return found?.option.swatchUrl ?? null;
    });
    const firstUrl = swatchUrls[0];
    if (!firstUrl) continue;
    if (!swatchUrls.every(u => u === firstUrl)) continue;

    // Merge fires. Consume the subcategories and emit a synthetic entry.
    const firstFound = optionLookup.get(`${entry.when[0]}:${reducedSelections[entry.when[0]]}`);
    if (!firstFound) continue;

    for (const subId of entry.when) {
      delete reducedSelections[subId];
      consumed.add(subId);
    }

    mergedEntries.push({
      sortSlug: entry.when[0],
      template: entry.clause,
      swatchUrl: firstUrl,
      label: firstFound.subCategory.name,
      swatchSubcategoryId: entry.when[0],
      dimensions: firstFound.option.dimensions?.trim() || undefined,
    });
  }

  return { reducedSelections, mergedEntries };
}

/**
 * Full-generation prompt builder for BFL Flux 2 editing mode.
 *
 * Assembles: lead → action bullets (sorted by visual impact) → preserve tail
 * → style trailer. Each action references its swatch via `image N` where N is
 * the 1-indexed position in input_image_2..input_image_8 (base photo is
 * image 1). Clauses that target a selection without a resolvable swatch throw
 * — there is no text-only fallback.
 *
 * Pipeline: (1) resolve merges against selections, (2) build a unified
 * ActionEntry list, (3) visual-impact sort, (4) resolve swatches + substitute
 * image indices, (5) assemble.
 *
 * `opts.emitPreserve` — default true. Set false for the fixture pass of a
 * two-pass split where every structural sub is absent from `visualSelections`;
 * emitting preservation in that pass would ask Flux to "preserve" surfaces
 * pass 1 just rewrote.
 */
export async function buildProsePrompt(
  prose: PromptProse,
  visualSelections: Record<string, string>,
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
  resolveSwatchBuffer?: SwatchBufferResolver,
  opts: { emitPreserve?: boolean } = {},
): Promise<{ prompt: string; swatches: SwatchImage[] }> {
  const { emitPreserve = true } = opts;

  // Phase 1: resolve merges. After this, `reducedSelections` no longer
  // contains the subcategories that were consumed by a merge; they're
  // represented by `mergedEntries` instead.
  const { reducedSelections, mergedEntries } = resolveMerges(
    visualSelections,
    prose.mergedClauses,
    optionLookup,
  );

  // Phase 2: build a unified list of ActionEntry records. Single entries for
  // each remaining selection, plus every merged entry.
  const entries: ActionEntry[] = [...mergedEntries];

  for (const [subId, optId] of Object.entries(reducedSelections)) {
    const found = optionLookup.get(`${subId}:${optId}`);
    if (!found) continue;
    const { option, subCategory } = found;

    if (optId.endsWith("-none") || optId.endsWith("-no-upgrade")) continue;
    if (!option.swatchUrl && !option.swatchColor && !option.promptDescriptor) continue;

    const template = prose.actions?.[subId];
    if (!template) {
      throw new PromptProseError(
        `Missing actions["${subId}"] in prompt_prose. Every selected subcategory must have an action clause.`,
      );
    }

    if (!option.swatchUrl) {
      throw new PromptProseError(
        `actions["${subId}"] references a swatch, but option "${option.id}" has no swatchUrl.`,
      );
    }

    entries.push({
      sortSlug: subId,
      template,
      swatchUrl: option.swatchUrl,
      label: subCategory.name,
      swatchSubcategoryId: subId,
      dimensions: option.dimensions?.trim() || undefined,
    });
  }

  // Phase 3: visual-impact sort, using each entry's sortSlug.
  entries.sort((a, b) => {
    const pa = getSubcategoryPriority(a.sortSlug);
    const pb = getSubcategoryPriority(b.sortSlug);
    if (pa !== pb) return pa - pb;
    return a.sortSlug.localeCompare(b.sortSlug);
  });

  if (entries.length === 0) {
    return { prompt: "Return this image unchanged.", swatches: [] };
  }

  // Phase 4: resolve swatches and substitute image indices.
  const swatches: SwatchImage[] = [];
  const actionLines: string[] = [];
  let imageIndex = 2; // image 1 = base photo

  for (const entry of entries) {
    if (!resolveSwatchBuffer) {
      throw new PromptProseError(
        `Cannot resolve swatch for "${entry.sortSlug}": no resolver provided.`,
      );
    }
    const resolved = await resolveSwatchBuffer(entry.swatchUrl);
    if (!resolved) {
      throw new PromptProseError(
        `Swatch failed to resolve for "${entry.sortSlug}" at ${entry.swatchUrl}.`,
      );
    }

    swatches.push({
      label: entry.label,
      buffer: resolved.buffer,
      mediaType: resolved.mediaType,
      subcategoryId: entry.swatchSubcategoryId,
    });

    const substituted = entry.template.replace(IMAGE_TOKEN, `image ${imageIndex}`);
    const withDims = entry.dimensions ? `${substituted} (${entry.dimensions})` : substituted;
    actionLines.push(`- ${withDims}`);
    imageIndex++;
  }

  // Phase 5: assemble lead → bullets → preserve → style.
  const lead = (prose.lead ?? DEFAULT_PROSE_LEAD).trim();
  const style = (prose.style ?? DEFAULT_PROSE_STYLE).trim();

  const segments: string[] = [];
  segments.push(lead);
  segments.push(actionLines.join("\n"));

  if (emitPreserve && prose.preserve && prose.preserve.length > 0) {
    const preserveLines = prose.preserve
      .map(p => p.trim())
      .filter(p => p.length > 0);
    if (preserveLines.length > 0) segments.push(preserveLines.join("\n"));
  }

  segments.push(style);

  return { prompt: segments.join("\n"), swatches };
}

/**
 * Scoped-edit prompt builder. Reuses the same `actions[subId]` clause as
 * full-generation — a single-surface change to the island uses the exact
 * same "apply {image} to the freestanding center base structure in the
 * foreground" line with the swatch bound to image 2. No lead, no style
 * trailer, no preserve — Klein/Flex preserve unchanged surfaces by default.
 */
export async function buildProseScopedEdit(
  prose: PromptProse,
  changedSubcategoryId: string,
  changedOptionId: string,
  optionLookup: Map<string, { option: Option; subCategory: SubCategory }>,
  resolveSwatchBuffer?: SwatchBufferResolver,
): Promise<{ prompt: string; swatches: SwatchImage[] }> {
  const changed = optionLookup.get(`${changedSubcategoryId}:${changedOptionId}`);
  if (!changed) {
    return { prompt: "Return this image unchanged.", swatches: [] };
  }

  const template = prose.actions?.[changedSubcategoryId];
  if (!template) {
    throw new PromptProseError(
      `Missing actions["${changedSubcategoryId}"] in prompt_prose. Scoped edits reuse the full-gen actions map.`,
    );
  }

  if (!resolveSwatchBuffer) {
    throw new PromptProseError(
      `Cannot resolve swatch for "${changedSubcategoryId}": no resolver provided.`,
    );
  }
  if (!changed.option.swatchUrl) {
    throw new PromptProseError(
      `actions["${changedSubcategoryId}"] references a swatch, but option "${changed.option.id}" has no swatchUrl.`,
    );
  }
  const resolved = await resolveSwatchBuffer(changed.option.swatchUrl);
  if (!resolved) {
    throw new PromptProseError(
      `actions["${changedSubcategoryId}"] swatch failed to resolve for option "${changed.option.id}".`,
    );
  }

  const swatches: SwatchImage[] = [{
    label: changed.subCategory.name,
    buffer: resolved.buffer,
    mediaType: resolved.mediaType,
    subcategoryId: changedSubcategoryId,
  }];

  // Capitalize the first letter (templates are authored lowercase) and add a
  // terminal period. That's the minimum to turn an action clause into a
  // standalone edit instruction.
  //
  // Light preservation trailer appended for scoped-edit context ONLY: the
  // same action clauses are used for both full-gen and scoped-edit paths, but
  // full-gen doesn't need preservation (every other surface is also changing)
  // while scoped-edit does (bleed into adjacent surfaces is a known Pro
  // limitation). Kept short and positive per BFL's Klein guidance on
  // "maintain all other aspects of the original image".
  const clause = template.replace(IMAGE_TOKEN, "image 2");
  const dims = changed.option.dimensions?.trim();
  const clauseWithDims = dims ? `${clause} (${dims})` : clause;
  const capitalized = clauseWithDims.charAt(0).toUpperCase() + clauseWithDims.slice(1);
  const withPeriod = capitalized.endsWith(".") ? capitalized : `${capitalized}.`;
  const prompt = `${withPeriod} Maintain all other aspects of the original image.`;

  return { prompt, swatches };
}

/**
 * Validate one action clause (either an `actions[subId]` entry or a
 * `mergedClauses[i].clause` entry). Enforces every rule that applies to
 * clauses that end up as bullet lines in the assembled prompt.
 *
 * `loc` is a human-readable location like `actions["cabinets"]` or
 * `mergedClauses[0].clause` so error messages point at the offending field.
 */
function validateActionClause(loc: string, clause: unknown): void {
  if (typeof clause !== "string") {
    throw new PromptProseError(`${loc} must be a string.`);
  }
  const trimmed = clause.trim();
  if (trimmed.length === 0) {
    throw new PromptProseError(`${loc} must not be empty.`);
  }

  const imageCount = countToken(trimmed, IMAGE_TOKEN);
  if (imageCount !== 1) {
    throw new PromptProseError(
      `${loc} must contain exactly one {image} token (found ${imageCount}).`,
    );
  }

  const wc = wordCount(trimmed);
  if (wc < 4 || wc > 18) {
    throw new PromptProseError(`${loc} must be 4–18 words (got ${wc}).`);
  }

  if (/^[A-Z]/.test(trimmed)) {
    throw new PromptProseError(
      `${loc} must start lowercase (clauses are joined into bullet lines by the builder).`,
    );
  }
  if (trimmed.endsWith(".")) {
    throw new PromptProseError(
      `${loc} must not end with a period (builder appends separators).`,
    );
  }

  // Strip the literal {image} token before scanning so nothing inside the
  // placeholder is mistaken for forbidden text.
  const scanText = trimmed.replace(IMAGE_TOKEN, "");
  const neg = findForbiddenWord(scanText, FORBIDDEN_NEGATIVE_WORDS);
  if (neg) {
    throw new PromptProseError(
      `${loc} contains forbidden word "${neg}" (use positive framing; describe "island" positionally).`,
    );
  }
  const mat = findForbiddenMaterialWord(scanText, FORBIDDEN_ACTION_MATERIAL_WORDS);
  if (mat) {
    throw new PromptProseError(
      `${loc} contains forbidden material/color word "${mat}" (swatch image is the sole material authority).`,
    );
  }
  if (HEX_COLOR_RE.test(scanText)) {
    throw new PromptProseError(
      `${loc} contains a hex color code (swatch image is the sole color authority).`,
    );
  }
}

/**
 * Validate a PromptProse object without resolving swatches. Used by the admin
 * PATCH handler at save time. Throws `PromptProseError` on any structural
 * problem so the API and the editor UI surface identical error text.
 *
 * `requiredActionSubIds` is the set of subcategory IDs the photo is scoped to;
 * every entry in it must have an `actions[subId]` clause so generation can't
 * fail at runtime with missing prose. Pass an empty array to validate
 * structure only (skips photo-scope enforcement).
 */
export function validatePromptProse(
  prose: PromptProse,
  requiredActionSubIds: readonly string[],
): void {
  if (prose.version !== 2) {
    throw new PromptProseError(
      `prompt_prose.version must be 2 (got ${(prose as { version?: unknown }).version}).`,
    );
  }
  if (!prose.actions || typeof prose.actions !== "object") {
    throw new PromptProseError(
      "prompt_prose.actions is required and must be an object keyed by subcategory slug.",
    );
  }
  if (Object.keys(prose.actions).length === 0) {
    throw new PromptProseError("prompt_prose.actions must contain at least one entry.");
  }

  // ----- actions -----
  for (const [subId, clause] of Object.entries(prose.actions)) {
    validateActionClause(`actions["${subId}"]`, clause);
  }

  // ----- required coverage -----
  for (const subId of requiredActionSubIds) {
    if (!(subId in prose.actions)) {
      throw new PromptProseError(
        `prompt_prose.actions is missing an entry for required subcategory "${subId}".`,
      );
    }
  }

  // ----- optional mergedClauses -----
  if (prose.mergedClauses !== undefined) {
    if (!Array.isArray(prose.mergedClauses)) {
      throw new PromptProseError("prompt_prose.mergedClauses must be an array.");
    }
    const requiredSet = new Set(requiredActionSubIds);
    // Slugs claimed by ANY previous entry — used to detect cross-entry overlap.
    const seenSubsAcrossEntries = new Set<string>();
    for (let i = 0; i < prose.mergedClauses.length; i++) {
      const entry = prose.mergedClauses[i];
      const loc = `mergedClauses[${i}]`;
      if (!entry || typeof entry !== "object") {
        throw new PromptProseError(`${loc} must be an object with \`when\` and \`clause\`.`);
      }
      if (!Array.isArray(entry.when) || entry.when.length < 2) {
        throw new PromptProseError(
          `${loc}.when must be an array of at least 2 subcategory slugs.`,
        );
      }
      // Slugs seen inside THIS entry's when array — used to detect a repeat
      // within a single declaration (e.g. `when: ["a", "a"]`).
      const seenInThisEntry = new Set<string>();
      for (const subId of entry.when) {
        if (typeof subId !== "string" || subId.length === 0) {
          throw new PromptProseError(`${loc}.when contains a non-string or empty slug.`);
        }
        if (!(subId in prose.actions)) {
          throw new PromptProseError(
            `${loc}.when references "${subId}", but it has no fallback entry in actions. Every merged subcategory must have an action clause that runs when the merge does not fire.`,
          );
        }
        // Only enforce photo-scope coverage when the caller supplied a scope.
        // An empty `requiredActionSubIds` means "validate structure only" (used
        // by some tests and the client-side validator).
        if (requiredActionSubIds.length > 0 && !requiredSet.has(subId)) {
          throw new PromptProseError(
            `${loc}.when references "${subId}", which is not in this photo's subcategory scope.`,
          );
        }
        if (seenInThisEntry.has(subId)) {
          throw new PromptProseError(
            `${loc}.when contains "${subId}" more than once in the same entry.`,
          );
        }
        if (seenSubsAcrossEntries.has(subId)) {
          throw new PromptProseError(
            `${loc}.when references "${subId}", which already appears in another mergedClauses entry. Subcategories may only participate in one merge.`,
          );
        }
        seenInThisEntry.add(subId);
        seenSubsAcrossEntries.add(subId);
      }
      validateActionClause(`${loc}.clause`, entry.clause);
    }
  }

  // ----- optional lead -----
  if (prose.lead !== undefined) {
    if (typeof prose.lead !== "string") {
      throw new PromptProseError("prompt_prose.lead must be a string.");
    }
    const wc = wordCount(prose.lead);
    if (wc > 12) {
      throw new PromptProseError(`prompt_prose.lead must be ≤12 words (got ${wc}).`);
    }
    if (prose.lead.includes(IMAGE_TOKEN)) {
      throw new PromptProseError("prompt_prose.lead must not contain {image}.");
    }
    const neg = findForbiddenWord(prose.lead, FORBIDDEN_NEGATIVE_WORDS);
    if (neg) {
      throw new PromptProseError(`prompt_prose.lead contains forbidden word "${neg}".`);
    }
  }

  // ----- optional style -----
  if (prose.style !== undefined) {
    if (typeof prose.style !== "string") {
      throw new PromptProseError("prompt_prose.style must be a string.");
    }
    const wc = wordCount(prose.style);
    if (wc > 20) {
      throw new PromptProseError(`prompt_prose.style must be ≤20 words (got ${wc}).`);
    }
    if (prose.style.includes(IMAGE_TOKEN)) {
      throw new PromptProseError("prompt_prose.style must not contain {image}.");
    }
    const neg = findForbiddenWord(prose.style, FORBIDDEN_NEGATIVE_WORDS);
    if (neg) {
      throw new PromptProseError(`prompt_prose.style contains forbidden word "${neg}".`);
    }
  }

  // ----- optional preserve[] -----
  // Preserve clauses intentionally skip FORBIDDEN_ACTION_MATERIAL_WORDS —
  // authors may need to name the current color of an unchanged surface
  // ("keep the brass hardware", "keep the existing oak flooring") to anchor
  // BFL. Only negative framing is forbidden here.
  if (prose.preserve !== undefined) {
    if (!Array.isArray(prose.preserve)) {
      throw new PromptProseError("prompt_prose.preserve must be an array of strings.");
    }
    for (let i = 0; i < prose.preserve.length; i++) {
      const clause = prose.preserve[i];
      if (typeof clause !== "string") {
        throw new PromptProseError(`prompt_prose.preserve[${i}] must be a string.`);
      }
      if (clause.trim().length === 0) {
        throw new PromptProseError(`prompt_prose.preserve[${i}] must not be empty.`);
      }
      const wc = wordCount(clause);
      if (wc > 18) {
        throw new PromptProseError(`prompt_prose.preserve[${i}] must be ≤18 words (got ${wc}).`);
      }
      if (clause.includes(IMAGE_TOKEN)) {
        throw new PromptProseError(`prompt_prose.preserve[${i}] must not contain {image}.`);
      }
      const neg = findForbiddenWord(clause, FORBIDDEN_NEGATIVE_WORDS);
      if (neg) {
        throw new PromptProseError(
          `prompt_prose.preserve[${i}] contains forbidden word "${neg}" (use positive framing).`,
        );
      }
    }
  }
}

/**
 * Build a deterministic signature of the prompt context fields that affect generation output.
 * Used in the selections hash so cache invalidates when prompts/spatial hints/generation rules change.
 */
export function buildPromptContextSignature(
  aiConfig: {
    sceneDescription?: string | null;
    photo: { photoBaseline?: string | null; spatialHint?: string | null; promptProse?: PromptProse | null };
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

  // Serialize prompt_prose deterministically — key order matters for the hash.
  const prose = aiConfig.photo.promptProse;
  let proseSignature = "";
  if (prose) {
    const stableStringify = (obj: unknown): string => {
      if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
      if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
      const keys = Object.keys(obj as Record<string, unknown>).sort();
      return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify((obj as Record<string, unknown>)[k])}`).join(",")}}`;
    };
    proseSignature = stableStringify(prose);
  }

  return [
    `scene:${aiConfig.sceneDescription ?? ""}`,
    `photoBaseline:${aiConfig.photo.photoBaseline ?? ""}`,
    `photoSpatialHint:${aiConfig.photo.spatialHint ?? ""}`,
    `spatialHints:${sortedSpatialHints}`,
    `rules:${rulesSignature}`,
    `scopedIds:${[...(scopedSubcategoryIds ?? [])].sort().join(",")}`,
    `prose:${proseSignature}`,
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
      promptProse: aiConfig.photo.promptProse,
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
