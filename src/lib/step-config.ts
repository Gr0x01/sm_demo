/**
 * Subcategory slug patterns that classify as fixture (metallic/object) surfaces
 * vs structural (paint/textured) surfaces. Used by the two-pass split logic
 * in fluxGenerate AND by the hex-anchor injection logic in buildProsePrompt
 * to skip D102 hex injection for metallic surfaces (they render from the
 * swatch image alone; hex injection flattens the metallic finish to bright
 * paint — see watchlist row 4 / D103 vs row 3 / D102).
 */
export const FIXTURE_PATTERNS = ["hardware", "faucet", "sink", "lighting", "fan", "refrigerator", "range", "dishwasher"];

/** Check if a subcategory slug matches one of the fixture patterns. */
export function isFixtureSubcategory(subId: string): boolean {
  return FIXTURE_PATTERNS.some(p => subId.includes(p));
}

/**
 * Check if a subcategory slug is hardware (cabinet pulls/knobs, door hardware, etc.).
 * Used by the metallic hex-skip rule — bronze hardware hex (#804A2E) flattened
 * to bright saturated paint (D103). Neutral metallic fixtures (sink/faucet/fridge)
 * don't exhibit the same distortion so they still get hex anchors for pass-2
 * attention binding.
 */
export function isHardwareSubcategory(subId: string): boolean {
  return subId.includes("hardware");
}

/**
 * Subcategory slug patterns that require the Flux 2 Max model for full-gen
 * rendering. Empty list as of 2026-04-16: hardware was the only routed
 * subcategory, and was removed when Demo Nest kitchen migrated from
 * combo SKUs (Seaver/Sedona/Stanton) to a single T-bar pull SKU in three
 * finishes (cabinet-pull-black/gold/stainless). The new swatch shape
 * matches the source photo's existing pull geometry, so finish swaps are
 * pure color/material changes that Flex handles cleanly without needing
 * Max's shape-fidelity routing. Lab-validated on Flex single-pass and
 * Flex+Flex 2-pass bundles before shipping.
 *
 * Re-add a pattern here only when a new subcategory ships with shape
 * complexity that Flex can't handle from the swatch alone, AND the
 * extra cost/latency of Max routing is justified by the visual delta.
 */
export const MAX_ROUTING_PATTERNS: string[] = [];

/** Check if a subcategory slug requires Max routing for full-gen. */
export function requiresMaxRouting(subId: string): boolean {
  return MAX_ROUTING_PATTERNS.some(p => subId.includes(p));
}

/**
 * Single source of truth for "does this selection set trip hardware routing".
 * Both `deriveGenerationContext` (cache-key layer in generate.ts) and
 * `selectFullGenModel` (pipeline layer in flux-pipeline.ts) call this so the
 * cache key and the model that actually runs can't diverge. A hardware sub
 * with no swatchUrl (`-none` / builder-standard default) does NOT trip it —
 * routing only fires when there's something real to render.
 */
export function hasHardwareRoutingTrigger(
  selections: Record<string, string>,
  optionLookup: Map<string, { option: { swatchUrl?: string | null } }>,
): boolean {
  for (const [subId, optId] of Object.entries(selections)) {
    if (!requiresMaxRouting(subId)) continue;
    const entry = optionLookup.get(`${subId}:${optId}`);
    if (entry?.option.swatchUrl) return true;
  }
  return false;
}

export interface StepPhoto {
  id: string;
  imagePath: string;   // Supabase Storage path
  imageUrl: string;    // Resolved public URL
  label: string;
  isHero: boolean;
  sortOrder: number;
  spatialHint: string | null;
  photoBaseline: string | null;  // text description for AI prompt
  subcategoryIds?: string[] | null;  // scopes which selections are sent to AI for this photo
  remapAccentAsWallPaint?: boolean;
  promptProse?: PromptProse | null;
}

/**
 * Per-photo prompt spec for BFL Flux 2 editing mode.
 *
 * Shape follows what the BFL editing guide actually documents: reference
 * images carry visual details, the prompt describes WHAT CHANGES and WHERE.
 * No scene narration (the base image is the scene). No preservation in the
 * bare-minimum version — unselected surfaces are trusted to the base image
 * by default; `preserve` exists as an escape hatch only, and is empty until
 * empirical tests show Max drifting on specific unselected surfaces.
 *
 * Substitution contract (enforced by buildProsePrompt + save-time validation):
 * - `{image}` — exactly one per action clause. Substituted with "image 2",
 *   "image 3", … based on visual-impact sort order. Base photo is "image 1".
 *
 * Action clause rules (enforced at save time — see `validatePromptProse` and
 * `validateActionClause` in `src/lib/generate.ts` for the canonical lists):
 * - Lowercase start, no trailing period — clauses are fragments joined by
 *   the builder into bullet lines.
 * - 4–30 words per clause. BFL's medium band is 4–18, but photos with
 *   structurally segmented surfaces (multiple disconnected backsplash zones,
 *   multi-wall cabinet runs with unique architecture) need enumeration that
 *   doesn't fit in 18 words. The 30-word ceiling is a deliberate exception
 *   per-photo authors should only use when sweep directives have been shown
 *   to fail.
 * - No negative framing: `not`, `no`, `never`, `without`, `don't`, `dont`,
 *   `only`, `avoid`, `except`.
 * - No material/color/pattern words (and their plural forms): swatches are
 *   sole appearance authority.
 * - No hex color codes.
 * - The standalone word `island` is forbidden (BFL groups surfaces by that
 *   word); describe positionally instead.
 */
/**
 * Per-material action clause object. Used when a subcategory mixes options of
 * different material classes (e.g. paint + stain in the same kitchen-cabinet-color
 * sub) and a single verb cannot serve all options. Runtime picks the right key
 * based on the selected option's `render_mode`:
 *   - `hex_paint` → `paint` clause (D100 paint+hex pattern)
 *   - anything else (hex_stain / textured / metallic) → `stain` clause
 *     (D101 stain+hex pattern — stain is the non-paint branch)
 * At least one key must be set. Each clause follows the same validation rules
 * as a string action clause.
 */
export interface MaterialActionClause {
  paint?: string;
  stain?: string;
}

export type ActionClause = string | MaterialActionClause;

export interface PromptProse {
  version: 2;
  /**
   * Per-surface action clauses, keyed by subcategory slug. Each value is either
   * a lowercase imperative fragment containing exactly one `{image}` token
   * (single-material catalog), OR a `MaterialActionClause` object with
   * per-material variants when the catalog mixes paint and stain options in
   * the same subcategory. See clause rules above.
   */
  actions: Record<string, ActionClause>;
  /**
   * Optional override for the lead-in clause. Defaults to
   * "Apply the following finishes to this kitchen photo:". Use for non-kitchen
   * photos (bathroom, exterior, etc.) or photo-specific framing. Max 12 words.
   */
  lead?: string;
  /**
   * Optional override for the style trailer. Defaults to
   * "Shot on Canon 5D Mark IV. Soft diffused afternoon fill light, neutral interior photography."
   * (locked across NK + NB + NBR 2026-04-14, watchlist row 12-f).
   * Max 20 words. Material/color words are allowed here (for camera/film
   * references); only negative framing is forbidden.
   */
  style?: string;
  /**
   * Optional positive preservation clauses appended at the very end of the
   * prompt (lowest-attention position). EMPTY on day 1 — the bare-minimum
   * version trusts Max to leave unselected surfaces alone via the base image.
   * Populated only when empirical tests show Max freelancing specific surfaces.
   * Each clause ≤18 words, positive framing (no "Do NOT"), no `{image}` token.
   */
  preserve?: string[];
  /**
   * Optional merge declarations. Each entry merges multiple subcategories into
   * a single action clause when all of them resolve to the same swatch. This
   * handles the "same color applied to both cabinets and island" case where
   * BFL otherwise collapses two byte-identical input images and ignores the
   * later clause.
   *
   * The merge FIRES when:
   * - Every subcategory in `when` is present in the current selections, AND
   * - Every subcategory in `when` resolves to the same `swatch_url`.
   *
   * When it fires the builder drops all `when` subcategories from the action
   * iteration and emits the single `clause` with one swatch reference. The
   * fallback (individual `actions[subId]` clauses) still runs when the merge
   * does NOT fire — e.g. when the island is a different color than the
   * perimeter cabinets.
   *
   * `clause` follows the same rules as action clauses (lowercase start, no
   * trailing period, 4–30 words, exactly one `{image}` token, no forbidden
   * words). Sort order uses the first slug in `when`.
   */
  mergedClauses?: Array<{
    when: string[];
    clause: string;
  }>;
}

export interface StepSection {
  title: string;
  subCategoryIds: string[];
}

export interface StepConfig {
  id: string;
  number: number;
  name: string;
  subtitle: string;
  heroImage: string | string[];
  heroVariant: "full" | "compact" | "split" | "none";
  showGenerateButton: boolean;
  sections: StepSection[];
  /** Subcategory IDs from other steps that are visible in this step's hero photo */
  alsoIncludeIds?: string[];
  /** What's actually shown in the hero photo — selections matching these are NOT sent to the AI */
  photoBaseline?: Record<string, string>;
  /** Per-photo data for multi-tenant gallery visualization (undefined for SM demo) */
  photos?: StepPhoto[];
}

