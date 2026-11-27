import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const studioOrigin = process.env.VITE_STUDIO_PROXY_TARGET?.trim() || "https://studio.asaifali-studio.workers.dev";
export default defineConfig({
  base: "/shared-frontend/flowpilot/",
  plugins: [react()],
  server: {
    port: 5175,
    host: true,
    proxy: { "/api/workspace/apps/flowpilot": { target: studioOrigin, changeOrigin: true, secure: true } },
  },
});
