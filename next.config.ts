import type { NextConfig } from "next";

// Negative lookahead: paths that should NOT be rewritten on subdomains.
// Excludes API routes, admin, framework paths, and any path whose first
// segment contains a dot (static files like logo.svg, robots.txt, etc.)
const PASSTHROUGH =
  "(?!api|admin|_next|auth|try|floorplans|rooms|swatches|[^/]*\\.[^/]*)";

const nextConfig: NextConfig = {
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
    };
  },
  async redirects() {
    return [{ source: "/demo", destination: "/try", permanent: true }];
  },
};

export default nextConfig;
