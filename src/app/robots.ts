import type { MetadataRoute } from "next";

// Tenant slugs to block from indexing (all except "demo").
// Add new builder slugs here as tenants are onboarded.
const BLOCKED_TENANT_SLUGS = ["stonemartin"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/try", "/vs/", "/demo/", "/research/"],
        disallow: [
          "/admin/",
          "/api/",
          "/auth/",
          ...BLOCKED_TENANT_SLUGS.map((s) => `/${s}/`),
        ],
      },
    ],
    sitemap: "https://withfin.ch/sitemap.xml",
  };
}
