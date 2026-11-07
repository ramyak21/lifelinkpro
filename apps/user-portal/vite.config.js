import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// User portal. Shared code is imported as "@lifelink/shared/..." (packages/shared/src).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@lifelink/shared": fileURLToPath(new URL("../../packages/shared/src", import.meta.url)) },
    dedupe: ["react", "react-dom", "react-router-dom"]
  },
  // strictPort: the API's CORS allowlist (CLIENT_URL) names this exact port
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true }
});
