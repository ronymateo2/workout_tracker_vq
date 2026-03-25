import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rurana",
    short_name: "Rurana",
    description:
      "Workout tracker PWA para registrar sesiones con pesas, bandas e isométricos.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef2f8",
    theme_color: "#f4f6fb",
    orientation: "portrait",
    lang: "es-CO",
    categories: ["health", "productivity", "sports"],
    icons: [
      {
        src: "/icon?size=192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon?size=512",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
