/**
 * Converts a name to a URL-friendly slug.
 * e.g. "Cabinet Style - Premium Oak" → "cabinet-style-premium-oak"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
