/** Subdomain detection and path building utilities. */

export function isSubdomainHost(host: string): boolean {
  return host.endsWith(".withfin.ch") || /^[^.]+\.localhost/.test(host);
}

/** Server-side subdomain check (uses next/headers). */
export async function isSubdomain(): Promise<boolean> {
  const { headers } = await import("next/headers");
  const host = (await headers()).get("host") ?? "";
  return isSubdomainHost(host);
}

/** Client-side subdomain check. */
export function isSubdomainClient(): boolean {
  if (typeof window === "undefined") return false;
  return isSubdomainHost(window.location.host);
}

/**
 * Build a path that works on both subdomains and bare domain.
 * On subdomains the orgSlug is already in the host, so omit it from the path.
 */
export function buildDemoPath(orgSlug: string, rest: string, subdomain: boolean): string {
  return subdomain ? `/${rest}` : `/${orgSlug}/${rest}`;
}
