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
export interface PromptProse {
  version: 2;
  /**
   * Per-surface action clauses, keyed by subcategory slug. Each value is a
   * lowercase imperative fragment containing exactly one `{image}` token.
   * See clause rules above.
   */
  actions: Record<string, string>;
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

