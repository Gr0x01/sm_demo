/**
 * Centralized model constants.
 * Update here when upgrading models — all call sites import from this file.
 *
 * When changing models, also update the cost map in posthog-server.ts.
 */
export const VISION_MODEL = "gemini-3-flash-preview";
export const IMAGE_MODEL = "gemini-3-pro-image-preview";

/** Models the Gemini generation path supports. OpenAI models are excluded — they require a different SDK path. */
export const SUPPORTED_IMAGE_MODELS = new Set([
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
]);

/** Resolve a client-provided model name to a safe, supported model. Shared by generate + check routes. */
export function resolveImageModel(requested: unknown): string {
  if (typeof requested === "string" && SUPPORTED_IMAGE_MODELS.has(requested)) return requested;
  return IMAGE_MODEL;
}
