import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LOGISDATA Control Room",
    short_name: "LOGISDATA",
    description: "Bilingual interactive supply-chain audit control room for AAST.",
    start_url: "/",
    display: "standalone",
    background_color: "#06121d",
    theme_color: "#06121d",
    orientation: "any",
    categories: ["business", "productivity", "education"],
    icons: [
      { src: "/aast-logo.png", sizes: "104x103", type: "image/png", purpose: "any" },
    ],
  };
}
