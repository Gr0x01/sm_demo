import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/try", "/vs/"], disallow: ["/admin/"] }],
    sitemap: "https://withfin.ch/sitemap.xml",
  };
}
