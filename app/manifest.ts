import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Product Research Copilot",
    short_name: "Research Copilot",
    description:
      "Describe a product problem and get a synthesized research report — patterns, UX insights, and prioritized recommendations.",
    start_url: "/",
    display: "standalone",
    background_color: "#16150f",
    theme_color: "#16150f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
