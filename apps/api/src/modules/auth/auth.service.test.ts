import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { Migrator } from "kysely";
import type { AppConfig } from "../../config";
import { AppError } from "../../errors";
import { createDatabase } from "@school-sms/database";
import { PlatformMigrationProvider } from "@school-sms/database/migrations";
import {
  createSessionToken,
  hashSessionToken,
  EmailProvider,
} from "./auth.provider";
import { AuthService } from "./auth.service";
import { createAuthRepository, type SessionMetadata } from "./auth.repository";

const testDatabaseUrl = process.env.AUTH_TEST_DATABASE_URL;
const testConfig: AppConfig = {
  apiHost: "127.0.0.1",
  apiPort: 4000,
  apiPublicOrigin: "http://localhost:4000",
  authCodeHashSecret: "test-code-secret-value-longer-than-32-characters",
  authRateLimitSecret: "test-rate-secret-value-longer-than-32-characters",
  authStateSecret: "test-state-secret-value-longer-than-32-characters",
  databaseUrl:
    testDatabaseUrl ?? "postgres://test:test@127.0.0.1:5432/school_sms_auth_test",
  googleClientId: null,
  googleClientSecret: null,
  googleRedirectUri: "http://localhost:4000/api/v1/auth/google/callback",
  nodeEnv: "test",
  sessionCookieDomain: undefined,
  sessionCookieName: "school_sms_session",
  sessionCookieSameSite: "lax",
  sessionCookieSecure: false,
  smtp: null,
  trustProxy: false,
  webOrigins: ["http://localhost:3000"],
};

class CapturingEmailProvider extends EmailProvider {
  readonly codes: string[] = [];

  constructor() {
    super(null);
  }

  override async sendSignInCode(
    _email: string,
    code: string,
    _expiresInMinutes: number,
  ) {
    this.codes.push(code);
  }
}

test(
  "email verification is single-use under concurrency and new sessions stay capped at five",
  { skip: !testDatabaseUrl },
  async () => {
    if (!testDatabaseUrl) return;
    const url = new URL(testDatabaseUrl);
    if (
      !["127.0.0.1", "localhost", "::1"].includes(url.hostname) ||
      url.pathname !== "/school_sms_auth_test"
    ) {
      throw new Error(
        "AUTH_TEST_DATABASE_URL must point to the local school_sms_auth_test database.",
      );
    }

    const db = createDatabase(testDatabaseUrl);
    try {
      const migrationsFolder = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../../../../packages/database/src/migrations",
      );
      const migrator = new Migrator({
        db,
        provider: new PlatformMigrationProvider(migrationsFolder),
      });
      const migration = await migrator.migrateToLatest();
      if (migration.error) throw migration.error;

      await db.deleteFrom("email_verification_codes").execute();
      await db.deleteFrom("auth_rate_limits").execute();
      await db.deleteFrom("auth_nonces").execute();
      await db.deleteFrom("users").execute();

      const emailProvider = new CapturingEmailProvider();
      const service = new AuthService({
        db,
        config: testConfig,
        emailProvider,
        googleProvider: null,
      });
      const email = "auth-flow@example.test";
      const challenge = await service.requestEmailCode(email, "127.0.0.1");
      const code = emailProvider.codes[0];
      assert.match(code, /^\d{6}$/);

      const metadata: SessionMetadata = {
        ipAddress: "127.0.0.1",
        userAgent: "Test browser",
        deviceName: "Test browser",
        deviceType: "desktop",
        browser: "Test",
        os: "Test OS",
      };
      const verify = () =>
        service.verifyEmailCode(challenge.challengeId, email, code, metadata);
      const attempts = await Promise.allSettled([verify(), verify()]);
      const successful = attempts.filter((attempt) => attempt.status === "fulfilled");
      const rejected = attempts.filter((attempt) => attempt.status === "rejected");

      assert.equal(successful.length, 1);
      assert.equal(rejected.length, 1);
      assert.ok(
        rejected[0].status === "rejected" &&
          rejected[0].reason instanceof AppError &&
          rejected[0].reason.code === "invalid_verification_code",
      );

      const user = await db
        .selectFrom("users")
        .select(["id", "email", "email_verified_at"])
        .where("email", "=", email)
        .executeTakeFirstOrThrow();
      assert.equal(user.email_verified_at instanceof Date, true);

      const firstSession = await db
        .selectFrom("sessions")
        .select("id")
        .where("user_id", "=", user.id)
        .executeTakeFirstOrThrow();

      for (let index = 0; index < 6; index += 1) {
        const now = new Date(Date.now() + index * 1000);
        await db.transaction().execute(async (trx) => {
          await createAuthRepository(trx).createSession(trx, {
            userId: user.id,
            tokenHash: hashSessionToken(createSessionToken()),
            metadata,
            now,
            expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          });
        });
      }

      const activeSessions = await db
        .selectFrom("sessions")
        .select("id")
        .where("user_id", "=", user.id)
        .where("revoked_at", "is", null)
        .where("expires_at", ">", new Date())
        .execute();
      const originalSession = await db
        .selectFrom("sessions")
        .select("revoked_at")
        .where("id", "=", firstSession.id)
        .executeTakeFirstOrThrow();

      assert.equal(activeSessions.length, 5);
      assert.ok(originalSession.revoked_at instanceof Date);
    } finally {
      await db.destroy();
    }
  },
);
