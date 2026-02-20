import type { NextConfig } from "next";

const PASSTHROUGH =
  "(?!api|admin|_next|auth|try|favicon\\.ico|robots\\.txt|sitemap\\.xml)";

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
        // Subdomain paths: stone-martin.withfin.ch/kinkade → /stone-martin/kinkade
        {
          source: `/:path(${PASSTHROUGH}.*)`,
          has: [{ type: "host", value: "(?<orgSlug>[^.]+)\\.withfin\\.ch" }],
          destination: "/:orgSlug/:path",
        },
        // Localhost dev: demo.localhost:3000/floorplan → /demo/floorplan
        {
          source: `/:path(${PASSTHROUGH}.*)`,
          has: [{ type: "host", value: "(?<orgSlug>[^.]+)\\.localhost" }],
          destination: "/:orgSlug/:path",
        },
      ],
    };
  },
  async redirects() {
    return [{ source: "/demo", destination: "/try", permanent: true }];
  },
};

export default nextConfig;
