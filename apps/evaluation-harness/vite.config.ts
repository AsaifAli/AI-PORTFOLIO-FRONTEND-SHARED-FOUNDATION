import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const studioOrigin = process.env.VITE_STUDIO_PROXY_TARGET?.trim() || "https://studio.asaifali-studio.workers.dev";

export default defineConfig({
  base: "/shared-frontend/evaluation-harness/",
  plugins: [react()],
  server: {
    port: 5178,
    host: true,
    proxy: { "/api/workspace/apps/evaluation-harness": { target: studioOrigin, changeOrigin: true, secure: true } },
  },
});
