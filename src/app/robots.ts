import type { MetadataRoute } from "next";

// Tenant slugs to block from indexing (all except "demo").
// Add new builder slugs here as tenants are onboarded.
const BLOCKED_TENANT_SLUGS = ["stonemartin"];

const MARKETING_ALLOW = ["/", "/try", "/vs/", "/demo/", "/research/"];
const MARKETING_DISALLOW = [
  "/admin/",
  "/api/",
  "/auth/",
  ...BLOCKED_TENANT_SLUGS.map((s) => `/${s}/`),
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default rule for all crawlers
      {
        userAgent: "*",
        allow: MARKETING_ALLOW,
        disallow: MARKETING_DISALLOW,
      },
      // Explicitly welcome AI search crawlers
      {
        userAgent: ["GPTBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Google-Extended"],
        allow: MARKETING_ALLOW,
        disallow: MARKETING_DISALLOW,
      },
    ],
    sitemap: "https://withfin.ch/sitemap.xml",
  };
}
