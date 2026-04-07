/**
 * Centralized model constants.
 * Update here when upgrading models — all call sites import from this file.
 *
 * When changing models, also update the cost map in posthog-server.ts.
 */
export const VISION_MODEL = "gemini-3-flash-preview";
export const IMAGE_MODEL = "flux-2-max";
export const SCOPED_EDIT_MODEL = "flux-2-flex";
