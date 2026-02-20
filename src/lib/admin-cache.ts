import { revalidateTag } from "next/cache";

/**
 * Invalidates all cached data for an org.
 * Called by every admin mutation API route.
 */
export function invalidateOrgCache(orgId: string, orgSlug?: string) {
  revalidateTag(`categories:${orgId}`, "max");
  if (orgSlug) {
    revalidateTag(`org:${orgSlug}`, "max");
  }
}
