import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finch",
    short_name: "Finch",
    description: "Upgrade visualization for home builders.",
    start_url: "/",
    display: "browser",
    background_color: "#F8FAFC",
    theme_color: "#1b2d4e",
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
