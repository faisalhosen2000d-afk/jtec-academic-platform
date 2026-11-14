import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JTEC Academic Platform",
    short_name: "JTEC Academic",
    description:
      "The academic platform for Jhenaidah Textile Engineering College — materials, notices, results, and rankings in one place.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#060A12",
    theme_color: "#060A12",
    orientation: "portrait",
    icons: [
      {
        src: "/jtec-logo.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}