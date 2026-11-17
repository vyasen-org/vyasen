import { defineConfig } from "@playwright/test";
export default defineConfig({
  timeout: 90000,
  expect: { timeout: 20000 },
  testDir: "./tests",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4317",
    channel: "chrome",
    headless: true,
    navigationTimeout: 60000,
  },
  webServer: [
    {
      command: "pnpm --filter @vyasen/api exec tsx test/identity-server.ts",
      cwd: "../..",
      url: "http://127.0.0.1:4318/api/v1/health",
      timeout: 90000,
    },
    {
      command: "pnpm exec vite --host 127.0.0.1 --port 4317 --strictPort",
      url: "http://127.0.0.1:4317",
      env: { VITE_API_BASE_URL: "http://127.0.0.1:4318" },
      timeout: 90000,
    },
  ],
});
