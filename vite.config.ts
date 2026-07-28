import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Eventia Móvil — PWA instalable. El service worker cachea el cascarón
// (Fase 5 endurece el offline); el manifest la hace instalable con el
// logo Eventia.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icono-192.png", "icono-512.png", "apple-touch-icon.png"],
      manifest: {
        name: "Eventia Móvil",
        short_name: "Eventia",
        description: "La app de terreno de Eventia",
        theme_color: "#ffffff",
        background_color: "#f9fafb",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
});
