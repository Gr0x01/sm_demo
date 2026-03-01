import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/try"], disallow: ["/admin/"] }],
    sitemap: "https://withfin.ch/sitemap.xml",
  };
}
