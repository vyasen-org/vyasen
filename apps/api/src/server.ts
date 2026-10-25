import { buildApp } from "./app";
import { config } from "./config";

const app = await buildApp(config);
const cleanupTimer = setInterval(() => {
  void app
    .authService.cleanupExpiredData()
    .catch(() => {
      app.log.error("Authentication cleanup task failed.");
    });
}, 60 * 60 * 1000);
cleanupTimer.unref();

try {
  await app.listen({ host: config.apiHost, port: config.apiPort });
} catch (error) {
  clearInterval(cleanupTimer);
  app.log.error(
    { errorName: error instanceof Error ? error.name : "unknown" },
    "API server failed to start.",
  );
  await app.close();
  process.exitCode = 1;
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    clearInterval(cleanupTimer);
    void app.close().catch(() => {
      app.log.error("API server shutdown failed.");
      process.exitCode = 1;
    });
  });
}
