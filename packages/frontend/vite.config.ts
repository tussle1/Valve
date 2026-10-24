import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GitHub Pages base path - set to '/Valve/' for deployment to https://tussle1.github.io/Valve/
// Set to '/' for custom domain or root deployment
const base = process.env.GITHUB_PAGES ? "/Valve/" : "/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:3001",
        ws: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ["monaco-editor", "@monaco-editor/react"],
          xterm: ["xterm", "xterm-addon-fit", "xterm-addon-web-links"],
          vendor: ["react", "react-dom", "react-router-dom", "zustand"],
        },
      },
    },
  },
});