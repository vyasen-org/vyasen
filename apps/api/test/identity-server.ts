// Local browser-test process only. This file is not imported by the application.
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Migrator, sql } from "kysely";
import { createDatabase } from "@vyasen/database";
import { PlatformMigrationProvider } from "@vyasen/database/migrations";
import { EmailProvider, SmsProvider } from "../src/modules/auth/auth.provider";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://identity_test@127.0.0.1:55439/postgres";
process.env.AUTH_CODE_HASH_SECRET =
  "browser-test-code-secret-32-characters-long";
process.env.AUTH_RATE_LIMIT_SECRET =
  "browser-test-rate-secret-32-characters-long";
process.env.AUTH_STATE_SECRET = "browser-test-state-secret-32-characters-long";
const { config } = await import("../src/config");
const { buildApp } = await import("../src/app");
const name = "vyasen_browser_test_" + randomUUID().replaceAll("-", "");
const admin = createDatabase(process.env.DATABASE_URL);
await sql`CREATE DATABASE ${sql.id(name)}`.execute(admin);
const databaseUrl = "postgresql://identity_test@127.0.0.1:55439/" + name;
const db = createDatabase(databaseUrl);
const migration = await new Migrator({
  db,
  provider: new PlatformMigrationProvider(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../packages/database/src/migrations",
    ),
  ),
}).migrateToLatest();
if (migration.error) throw migration.error;
const codes = new Map<string, string>();
class TestSms extends SmsProvider {
  enabled = false;
  constructor() {
    super(null);
  }
  override isAvailable() {
    return this.enabled;
  }
  override async sendSignInCode(destination: string, code: string) {
    codes.set(destination, code);
  }
}
const sms = new TestSms();
class TestEmail extends EmailProvider {
  constructor() {
    super(null);
  }
  override async sendSignInCode(destination: string, code: string) {
    codes.set(destination, code);
  }
}
const app = await buildApp(
  {
    ...config,
    databaseUrl,
    googleClientId: null,
    googleClientSecret: null,
    sms: null,
    smtp: null,
    webOrigins: ["http://127.0.0.1:4317"],
    sessionCookieDomain: undefined,
  },
  { email: new TestEmail(), google: null, sms },
);
app.get("/test-code", async (req) => {
  const query = req.query as { destination?: string };
  return { code: codes.get(query.destination ?? "") };
});
app.get("/test-sms", async (req) => {
  sms.enabled = (req.query as { enabled?: string }).enabled === "true";
  return { sms: sms.enabled };
});
await app.listen({ host: "127.0.0.1", port: 4318 });
let closing = false;
async function cleanup() {
  if (closing) return;
  closing = true;
  await app.close();
  await db.destroy();
  await sql`DROP DATABASE ${sql.id(name)}`.execute(admin);
  await admin.destroy();
}
process.on("SIGINT", () => {
  void cleanup().then(() => process.exit());
});
process.on("SIGTERM", () => {
  void cleanup().then(() => process.exit());
});
