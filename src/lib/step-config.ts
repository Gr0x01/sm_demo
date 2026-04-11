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
 * Action clause rules (enforced at save time):
 * - Lowercase start, no trailing period — clauses are fragments joined by
 *   the builder into bullet lines.
 * - 4–18 words per clause (medium-band per BFL fundamentals guide).
 * - No negative framing: `not`, `no`, `never`, `only`, `avoid`, `except`.
 * - No material/color/pattern words: swatches are sole appearance authority.
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
   * "Photorealistic real estate photography, natural daylight, neutral white balance."
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

