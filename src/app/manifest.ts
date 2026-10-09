import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Namane Tyres",
    short_name: "Namane Tyres",
    description: "Tyre fitting, repairs, sales and roadside assistance in Gaborone.",
    start_url: "/",
    display: "standalone",
    shortcuts: [
      { name: "My requests", short_name: "My requests", description: "View requests made from this device", url: "/account", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] },
      { name: "Operations", short_name: "Operations", description: "Open protected Namane Tyres operations", url: "/admin", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] }
    ],
    background_color: "#111827",
    theme_color: "#111827",
    orientation: "portrait-primary",
    lang: "en",
    categories: ["business", "automotive"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
