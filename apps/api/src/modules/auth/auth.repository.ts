import { sql, type Kysely, type Transaction } from "kysely";

import type {
  AuthSession,
  AuthUser,
} from "@vyasen/contracts";
import type { Database } from "@vyasen/database";

type Executor = Kysely<Database> | Transaction<Database>;

export interface EmailCodeRecord {
  id: string;
  email: string;
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  attemptCount: number;
}

export interface SessionRecord {
  id: string;
  userId: string;
  lastActiveAt: Date;
}

export interface SessionMetadata {
  ipAddress: string | null;
  userAgent: string | null;
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
}

export function createAuthRepository(db: Executor) {
  return {
    consumeRateLimit(
      bucketHash: string,
      now: Date,
      windowMs: number,
      maxRequests: number,
    ) {
      const windowEnd = new Date(now.getTime() + windowMs);
      return sql<{ request_count: number; window_started_at: Date }>`
        INSERT INTO auth_rate_limits
          (bucket_hash, window_started_at, request_count, expires_at)
        VALUES
          (${bucketHash}, ${now}, 1, ${windowEnd})
        ON CONFLICT (bucket_hash) DO UPDATE SET
          window_started_at = CASE
            WHEN auth_rate_limits.expires_at <= ${now}
              THEN ${now}
            ELSE auth_rate_limits.window_started_at
          END,
          request_count = CASE
            WHEN auth_rate_limits.expires_at <= ${now}
              THEN 1
            ELSE LEAST(auth_rate_limits.request_count + 1, ${maxRequests + 1})
          END,
          expires_at = CASE
            WHEN auth_rate_limits.expires_at <= ${now}
              THEN ${windowEnd}
            ELSE auth_rate_limits.expires_at
          END
        RETURNING request_count, window_started_at
      `.execute(db);
    },

    async invalidateOpenCodes(executor: Executor, email: string, now: Date) {
      await executor
        .updateTable("email_verification_codes")
        .set({ consumed_at: now })
        .where("email", "=", email)
        .where("purpose", "=", "sign_in")
        .where("consumed_at", "is", null)
        .execute();
    },

    async insertEmailCode(
      executor: Executor,
      email: string,
      codeHash: string,
      expiresAt: Date,
    ): Promise<string> {
      const code = await executor
        .insertInto("email_verification_codes")
        .values({
          email,
          code_hash: codeHash,
          purpose: "sign_in",
          expires_at: expiresAt,
        })
        .returning("id")
        .executeTakeFirstOrThrow();
      return code.id;
    },

    async findEmailCodeForUpdate(
      executor: Executor,
      challengeId: string,
      email: string,
    ): Promise<EmailCodeRecord | undefined> {
      const row = await executor
        .selectFrom("email_verification_codes")
        .select([
          "id",
          "email",
          "code_hash",
          "expires_at",
          "consumed_at",
          "attempt_count",
        ])
        .where("id", "=", challengeId)
        .where("email", "=", email)
        .where("purpose", "=", "sign_in")
        .forUpdate()
        .executeTakeFirst();
      return row
        ? {
            id: row.id,
            email: row.email,
            codeHash: row.code_hash,
            expiresAt: row.expires_at,
            consumedAt: row.consumed_at,
            attemptCount: row.attempt_count,
          }
        : undefined;
    },

    async updateEmailCodeAttempt(
      executor: Executor,
      id: string,
      attemptCount: number,
      consumedAt: Date | null,
    ) {
      await executor
        .updateTable("email_verification_codes")
        .set({ attempt_count: attemptCount, consumed_at: consumedAt })
        .where("id", "=", id)
        .execute();
    },

    async consumeEmailCode(executor: Executor, id: string, now: Date) {
      await executor
        .updateTable("email_verification_codes")
        .set({ consumed_at: now })
        .where("id", "=", id)
        .where("consumed_at", "is", null)
        .execute();
    },

    async consumeEmailCodeById(id: string, now: Date) {
      await db
        .updateTable("email_verification_codes")
        .set({ consumed_at: now })
        .where("id", "=", id)
        .where("consumed_at", "is", null)
        .execute();
    },

    async findUserByEmail(executor: Executor, email: string) {
      return executor
        .selectFrom("users")
        .select([
          "id",
          "email",
          "email_verified_at",
          "name",
          "image",
          "created_at",
          "status",
        ])
        .where("email", "=", email)
        .executeTakeFirst();
    },

    async findUserById(executor: Executor, userId: string) {
      return executor
        .selectFrom("users")
        .select([
          "id",
          "email",
          "email_verified_at",
          "name",
          "image",
          "created_at",
          "status",
        ])
        .where("id", "=", userId)
        .executeTakeFirst();
    },

    async findUserByIdForUpdate(executor: Executor, userId: string) {
      return executor
        .selectFrom("users")
        .select([
          "id",
          "email",
          "email_verified_at",
          "name",
          "image",
          "created_at",
          "status",
        ])
        .where("id", "=", userId)
        .forUpdate()
        .executeTakeFirst();
    },

    async insertUser(
      executor: Executor,
      values: {
        email: string;
        emailVerifiedAt: Date;
        name: string | null;
        image: string | null;
      },
    ) {
      return executor
        .insertInto("users")
        .values({
          email: values.email,
          email_verified_at: values.emailVerifiedAt,
          name: values.name,
          image: values.image,
          last_login_at: values.emailVerifiedAt,
        })
        .onConflict((conflict) => conflict.column("email").doNothing())
        .returning(["id", "email"])
        .executeTakeFirst();
    },

    async markEmailVerified(executor: Executor, userId: string, now: Date) {
      await executor
        .updateTable("users")
        .set((expression) => ({
          email_verified_at: expression.fn.coalesce(
            "email_verified_at",
            expression.val(now),
          ),
          updated_at: now,
        }))
        .where("id", "=", userId)
        .execute();
    },

    async updateLoginTime(executor: Executor, userId: string, now: Date) {
      await executor
        .updateTable("users")
        .set({ last_login_at: now, updated_at: now })
        .where("id", "=", userId)
        .execute();
    },

    async findIdentity(executor: Executor, provider: "email" | "google", subject: string) {
      return executor
        .selectFrom("auth_identities")
        .select(["id", "user_id", "provider", "provider_subject"])
        .where("provider", "=", provider)
        .where("provider_subject", "=", subject)
        .executeTakeFirst();
    },

    async findUserProviderIdentity(
      executor: Executor,
      userId: string,
      provider: "email" | "google",
    ) {
      return executor
        .selectFrom("auth_identities")
        .select(["id", "provider_subject"])
        .where("user_id", "=", userId)
        .where("provider", "=", provider)
        .executeTakeFirst();
    },

    async insertIdentity(
      executor: Executor,
      userId: string,
      provider: "email" | "google",
      subject: string,
    ) {
      return executor
        .insertInto("auth_identities")
        .values({
          user_id: userId,
          provider,
          provider_subject: subject,
        })
        .onConflict((conflict) =>
          conflict.columns(["provider", "provider_subject"]).doNothing(),
        )
        .returning(["id", "user_id"])
        .executeTakeFirst();
    },

    async deleteUser(executor: Executor, userId: string) {
      await executor.deleteFrom("users").where("id", "=", userId).execute();
    },

    async createSession(
      executor: Executor,
      values: {
        userId: string;
        tokenHash: string;
        metadata: SessionMetadata;
        now: Date;
        expiresAt: Date;
      },
    ): Promise<string> {
      await executor
        .selectFrom("users")
        .select("id")
        .where("id", "=", values.userId)
        .forUpdate()
        .executeTakeFirstOrThrow();

      const activeSessions = await executor
        .selectFrom("sessions")
        .select("id")
        .where("user_id", "=", values.userId)
        .where("revoked_at", "is", null)
        .where("expires_at", ">", values.now)
        .orderBy("created_at", "asc")
        .forUpdate()
        .execute();

      const sessionsToRevoke = activeSessions.slice(
        0,
        Math.max(0, activeSessions.length - 4),
      );
      if (sessionsToRevoke.length > 0) {
        await executor
          .updateTable("sessions")
          .set({ revoked_at: values.now })
          .where(
            "id",
            "in",
            sessionsToRevoke.map((session) => session.id),
          )
          .execute();
      }

      const session = await executor
        .insertInto("sessions")
        .values({
          user_id: values.userId,
          token_hash: values.tokenHash,
          ip_address: values.metadata.ipAddress,
          user_agent: values.metadata.userAgent,
          device_name: values.metadata.deviceName,
          device_type: values.metadata.deviceType,
          browser: values.metadata.browser,
          os: values.metadata.os,
          created_at: values.now,
          last_active_at: values.now,
          expires_at: values.expiresAt,
        })
        .returning("id")
        .executeTakeFirstOrThrow();
      return session.id;
    },

    async findActiveSession(tokenHash: string, now: Date) {
      return db
        .selectFrom("sessions")
        .select(["id", "user_id", "last_active_at"])
        .where("token_hash", "=", tokenHash)
        .where("revoked_at", "is", null)
        .where("expires_at", ">", now)
        .executeTakeFirst();
    },

    async updateSessionActivity(id: string, now: Date) {
      await db
        .updateTable("sessions")
        .set({ last_active_at: now })
        .where("id", "=", id)
        .where("revoked_at", "is", null)
        .execute();
    },

    async listSessions(userId: string, now: Date): Promise<AuthSession[]> {
      const rows = await db
        .selectFrom("sessions")
        .select([
          "id",
          "device_name",
          "device_type",
          "browser",
          "os",
          "created_at",
          "last_active_at",
          "expires_at",
        ])
        .where("user_id", "=", userId)
        .where("revoked_at", "is", null)
        .where("expires_at", ">", now)
        .orderBy("last_active_at", "desc")
        .limit(5)
        .execute();
      return rows.map((row) => ({
        id: row.id,
        deviceName: row.device_name,
        deviceType: row.device_type,
        browser: row.browser,
        os: row.os,
        createdAt: row.created_at.toISOString(),
        lastActiveAt: row.last_active_at.toISOString(),
        expiresAt: row.expires_at.toISOString(),
        current: false,
      }));
    },

    async revokeSession(userId: string, sessionId: string, now: Date) {
      return db
        .updateTable("sessions")
        .set({ revoked_at: now })
        .where("id", "=", sessionId)
        .where("user_id", "=", userId)
        .where("revoked_at", "is", null)
        .returning("id")
        .executeTakeFirst();
    },

    async revokeAllSessions(userId: string, now: Date) {
      await db
        .updateTable("sessions")
        .set({ revoked_at: now })
        .where("user_id", "=", userId)
        .where("revoked_at", "is", null)
        .execute();
    },

    async revokeSessionByToken(tokenHash: string, now: Date) {
      await db
        .updateTable("sessions")
        .set({ revoked_at: now })
        .where("token_hash", "=", tokenHash)
        .where("revoked_at", "is", null)
        .execute();
    },

    async insertGoogleNonce(nonceHash: string, now: Date, expiresAt: Date) {
      await db
        .insertInto("auth_nonces")
        .values({
          nonce_hash: nonceHash,
          purpose: "google_one_tap",
          created_at: now,
          expires_at: expiresAt,
        })
        .execute();
    },

    async consumeGoogleNonce(
      executor: Executor,
      nonceHash: string,
      now: Date,
    ): Promise<boolean> {
      const nonce = await executor
        .updateTable("auth_nonces")
        .set({ consumed_at: now })
        .where("nonce_hash", "=", nonceHash)
        .where("purpose", "=", "google_one_tap")
        .where("expires_at", ">", now)
        .where("consumed_at", "is", null)
        .returning("nonce_hash")
        .executeTakeFirst();
      return Boolean(nonce);
    },

    async cleanupExpiredData(now: Date) {
      await sql`
        WITH expired AS (
          SELECT id
          FROM email_verification_codes
          WHERE expires_at < ${now}
             OR (consumed_at < ${new Date(now.getTime() - 24 * 60 * 60 * 1000)})
          ORDER BY expires_at
          LIMIT 5000
        )
        DELETE FROM email_verification_codes AS codes
        USING expired
        WHERE codes.id = expired.id
      `.execute(db);

      await sql`
        WITH expired AS (
          SELECT id
          FROM sessions
          WHERE (expires_at < ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)})
             OR (revoked_at < ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)})
          ORDER BY expires_at
          LIMIT 5000
        )
        DELETE FROM sessions
        USING expired
        WHERE sessions.id = expired.id
      `.execute(db);

      await sql`
        WITH expired AS (
          SELECT bucket_hash
          FROM auth_rate_limits
          WHERE expires_at < ${now}
          ORDER BY expires_at
          LIMIT 5000
        )
        DELETE FROM auth_rate_limits AS limits
        USING expired
        WHERE limits.bucket_hash = expired.bucket_hash
      `.execute(db);

      await sql`
        WITH expired AS (
          SELECT nonce_hash
          FROM auth_nonces
          WHERE expires_at < ${now}
             OR consumed_at < ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}
          ORDER BY expires_at
          LIMIT 5000
        )
        DELETE FROM auth_nonces
        USING expired
        WHERE auth_nonces.nonce_hash = expired.nonce_hash
      `.execute(db);
    },
  };
}

export function toAuthUser(row: {
  id: string;
  email: string;
  email_verified_at: Date | null;
  name: string | null;
  image: string | null;
  created_at: Date;
}): AuthUser {
  return {
    id: row.id,
    email: row.email,
    emailVerifiedAt: row.email_verified_at?.toISOString() ?? null,
    name: row.name,
    image: row.image,
    createdAt: row.created_at.toISOString(),
  };
}

export type UserRecord = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createAuthRepository>["findUserByEmail"]>>
>;
export type IdentityRecord = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createAuthRepository>["findIdentity"]>>
>;
export type AuthRepository = ReturnType<typeof createAuthRepository>;
