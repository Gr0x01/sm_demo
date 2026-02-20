import { revalidateTag } from "next/cache";

/**
 * Invalidates all cached data for an org.
 * Called by every admin mutation API route.
 */
export function invalidateOrgCache(
  orgId: string,
  opts?: { orgSlug?: string; floorplanId?: string; floorplanSlug?: string }
) {
  revalidateTag(`categories:${orgId}`, "max");
  if (opts?.orgSlug) revalidateTag(`org:${opts.orgSlug}`, "max");
  if (opts?.floorplanId) revalidateTag(`steps:${opts.floorplanId}`, "max");
  if (opts?.floorplanSlug) revalidateTag(`floorplan:${orgId}:${opts.floorplanSlug}`, "max");
}
