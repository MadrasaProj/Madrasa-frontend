import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/**", "favicon.ico"],
      manifest: {
        name: "Darul Huda – Madrasa Management",
        short_name: "Darul Huda",
        description: "Modern Madrasa Management System",
        theme_color: "#059669",
        background_color: "#faf9f6",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
          {
            src: "/icons/apple-touch-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
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
    port: 9000,
  },
});
