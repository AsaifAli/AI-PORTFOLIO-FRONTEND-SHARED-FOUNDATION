import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const harnessOrigin = env.VITE_HARNESS_PROXY_TARGET?.trim() || "https://ai-engineering-evaluation-harness.onrender.com";
  const proxy = {
    "/health": { target: harnessOrigin, changeOrigin: true, secure: true },
    "/api": { target: harnessOrigin, changeOrigin: true, secure: true },
  };

  return {
    plugins: [react()],
    server: { port: 5178, host: true, proxy },
    preview: { port: 4178, host: true, proxy },
  };
});
