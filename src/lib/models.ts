/**
 * Centralized model constants.
 * Update here when upgrading models — all call sites import from this file.
 *
 * When changing models, also update the cost map in posthog-server.ts.
 */
export const VISION_MODEL = "gemini-3-flash-preview";
export const IMAGE_MODEL = "gpt-image-1.5";
export const ISOLATION_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
export const REFINEMENT_IMAGE_MODEL = "gemini-3-pro-image-preview";
