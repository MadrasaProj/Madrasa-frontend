import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
 import sourceIdentifier from 'vite-plugin-source-identifier'


export default defineConfig({
  plugins: [
        sourceIdentifier(),

     react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      includeAssets: ["icons/**", "favicon.ico"],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: "Smart Madrasa",
        short_name: "Smart Madrasa",
        description: "Modern Madrasa Management System",
        theme_color: "#059669",
        background_color: "#faf9f6",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        id: "/",
        prefer_related_applications: false,
        categories: ["education", "productivity"],
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icons/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("react-router-dom")
          )
            return "vendor";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("recharts")) return "charts";
          if (id.includes("lucide-react")) return "icons";
        },
      },
    },
  },
  server: {
    port: 1234,
    allowedHosts: ["port1234.fayis.site"],
  },
});
