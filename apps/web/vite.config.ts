import { fileURLToPath } from "node:url";
import path from "node:path";

import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

const envDirectory = path.resolve(rootDirectory, "../..");

export default defineConfig(({ mode }) => {
  const appName =
    loadEnv(mode, envDirectory, "VITE_").VITE_APP_NAME?.trim() || "Vyasen";
  const escapedAppName = appName
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  return {
    envDir: envDirectory,
    plugins: [
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
      }),
      tailwindcss(),
      react(),
      {
        name: "vyasen-app-name",
        transformIndexHtml(html) {
          return html.replaceAll("%APP_NAME%", escapedAppName);
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(rootDirectory, "src"),
      },
    },
    server: {
      host: "127.0.0.1",
      port: 3000,
      strictPort: true,
    },
  };
});
