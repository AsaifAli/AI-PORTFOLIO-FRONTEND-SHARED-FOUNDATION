import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiOrigin = process.env.VITE_EVIDENCEFLOW_PROXY_TARGET?.trim() || "https://langgraph-rag-hdkn.onrender.com";
export default defineConfig({
  base: "/shared-frontend/evidenceflow/",
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: { "/api/v1": { target: apiOrigin, changeOrigin: true, secure: true } },
  },
});
