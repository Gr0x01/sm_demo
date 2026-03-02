import type { NextConfig } from "next";

// Negative lookahead: paths that should NOT be rewritten on subdomains.
// Excludes API routes, admin, framework paths, and any path whose first
// segment contains a dot (static files like logo.svg, robots.txt, etc.)
const PASSTHROUGH =
  "(?!api|admin|_next|auth|try|vs|floorplans|rooms|swatches|ingest|[^/]*\\.[^/]*)";

const nextConfig: NextConfig = {
  // Required for PostHog reverse proxy — prevents Next.js from
  // redirecting /ingest to /ingest/ which breaks the proxy
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Subdomain: stonemartin.withfin.ch/* → /stonemartin/*
        // Single rule handles both root (/) and paths (/kinkade) to prevent cascading
        {
          source: `/:path(${PASSTHROUGH}.*)*`,
          has: [{ type: "host", value: "(?<orgSlug>[^.]+)\\.withfin\\.ch" }],
          destination: "/:orgSlug/:path*",
        },
        // Localhost dev: demo.localhost:3000/* → /demo/*
        {
          source: `/:path(${PASSTHROUGH}.*)*`,
          has: [{ type: "host", value: "(?<orgSlug>[^.]+)\\.localhost" }],
          destination: "/:orgSlug/:path*",
        },
      ],
      afterFiles: [
        // PostHog reverse proxy — avoids ad blockers, keeps data flowing
        {
          source: "/ingest/static/:path*",
          destination: "https://us-assets.i.posthog.com/static/:path*",
        },
        {
          source: "/ingest/:path*",
          destination: "https://us.i.posthog.com/:path*",
        },
      ],
    };
  },
  async redirects() {
    return [];
  },
};

export default nextConfig;
