import { createHash } from "node:crypto";

import { sql, type Kysely, type Transaction } from "kysely";

import type { AuthSession, AuthUser } from "@vyasen/contracts";
import type { Database } from "@vyasen/database";
import { AppError } from "../../errors";

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

function normalizeDestinationValue(value: string): string {
  return value.trim().toLowerCase();
}

function hashDestinationValue(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
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
        .updateTable("auth_challenges")
        .set({ consumed_at: now })
        .where("destination_hash", "=", hashDestinationValue(email))
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
      const row = await executor
        .insertInto("auth_challenges")
        .values({
          channel: "email",
          purpose: "sign_in",
          destination_hash: hashDestinationValue(email),
          secret_hash: codeHash,
          expires_at: expiresAt,
          attempt_count: 0,
        })
        .returning("id")
        .executeTakeFirstOrThrow();
      return row.id;
    },

    async findEmailCodeForUpdate(
      executor: Executor,
      challengeId: string,
      email: string,
    ): Promise<EmailCodeRecord | undefined> {
      const row = await executor
        .selectFrom("auth_challenges")
        .select([
          "id",
          "destination_hash",
          "secret_hash",
          "expires_at",
          "consumed_at",
          "attempt_count",
        ])
        .where("id", "=", challengeId)
        .where("destination_hash", "=", hashDestinationValue(email))
        .where("purpose", "=", "sign_in")
        .forUpdate()
        .executeTakeFirst();

      return row
        ? {
            id: row.id,
            email: normalizeDestinationValue(email),
            codeHash: row.secret_hash,
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
        .updateTable("auth_challenges")
        .set({ attempt_count: attemptCount, consumed_at: consumedAt })
        .where("id", "=", id)
        .execute();
    },

    async consumeEmailCode(executor: Executor, id: string, now: Date) {
      await executor
        .updateTable("auth_challenges")
        .set({ consumed_at: now })
        .where("id", "=", id)
        .where("consumed_at", "is", null)
        .execute();
    },

    async consumeEmailCodeById(id: string, now: Date) {
      await db
        .updateTable("auth_challenges")
        .set({ consumed_at: now })
        .where("id", "=", id)
        .where("consumed_at", "is", null)
        .execute();
    },

    async findUserByEmail(
      executor: Executor,
      email: string,
    ): Promise<UserRecord | undefined> {
      const emailIdentity = await executor
        .selectFrom("auth_identities")
        .select(["user_id", "provider_subject", "verified_at"])
        .where("provider", "=", "email")
        .where("provider_subject", "=", email)
        .executeTakeFirst();

      if (!emailIdentity) return undefined;

      const user = await executor
        .selectFrom("users")
        .leftJoin("personal_profiles", "personal_profiles.user_id", "users.id")
        .select([
          "users.id",
          "users.status",
          "users.created_at",
          "users.updated_at",
          "users.last_login_at",
          "personal_profiles.first_name",
          "personal_profiles.middle_name",
          "personal_profiles.surname",
          "personal_profiles.image_url",
        ])
        .where("users.id", "=", emailIdentity.user_id)
        .executeTakeFirst();

      if (!user) return undefined;

      return {
        id: user.id,
        email: emailIdentity.provider_subject,
        email_verified_at: emailIdentity.verified_at,
        name: composeDisplayName(
          user.first_name,
          user.middle_name,
          user.surname,
        ),
        image: user.image_url,
        created_at: user.created_at,
        status: user.status,
      };
    },

    async findUserById(
      executor: Executor,
      userId: string,
    ): Promise<UserRecord | undefined> {
      const user = await executor
        .selectFrom("users")
        .leftJoin("personal_profiles", "personal_profiles.user_id", "users.id")
        .select([
          "users.id",
          "users.status",
          "users.created_at",
          "users.updated_at",
          "users.last_login_at",
          "personal_profiles.first_name",
          "personal_profiles.middle_name",
          "personal_profiles.surname",
          "personal_profiles.image_url",
        ])
        .where("users.id", "=", userId)
        .executeTakeFirst();

      if (!user) return undefined;

      const emailIdentity = await executor
        .selectFrom("auth_identities")
        .select(["provider_subject", "verified_at"])
        .where("user_id", "=", userId)
        .where("provider", "=", "email")
        .executeTakeFirst();

      return {
        id: user.id,
        email: emailIdentity?.provider_subject ?? "",
        email_verified_at: emailIdentity?.verified_at ?? null,
        name: composeDisplayName(
          user.first_name,
          user.middle_name,
          user.surname,
        ),
        image: user.image_url,
        created_at: user.created_at,
        status: user.status,
      };
    },

    async findUserByIdForUpdate(
      executor: Executor,
      userId: string,
    ): Promise<UserRecord | undefined> {
      const user = await executor
        .selectFrom("users")
        .leftJoin("personal_profiles", "personal_profiles.user_id", "users.id")
        .select([
          "users.id",
          "users.status",
          "users.created_at",
          "users.updated_at",
          "users.last_login_at",
          "personal_profiles.first_name",
          "personal_profiles.middle_name",
          "personal_profiles.surname",
          "personal_profiles.image_url",
        ])
        .where("users.id", "=", userId)
        .forUpdate("users")
        .executeTakeFirst();

      if (!user) return undefined;

      const emailIdentity = await executor
        .selectFrom("auth_identities")
        .select(["provider_subject", "verified_at"])
        .where("user_id", "=", userId)
        .where("provider", "=", "email")
        .forUpdate()
        .executeTakeFirst();

      return {
        id: user.id,
        email: emailIdentity?.provider_subject ?? "",
        email_verified_at: emailIdentity?.verified_at ?? null,
        name: composeDisplayName(
          user.first_name,
          user.middle_name,
          user.surname,
        ),
        image: user.image_url,
        created_at: user.created_at,
        status: user.status,
      };
    },

    async insertUser(
      executor: Executor,
      values: {
        email: string;
        emailVerifiedAt: Date;
        name: string | null;
        image: string | null;
      },
    ): Promise<UserRecord | undefined> {
      await sql`select pg_advisory_xact_lock(hashtextextended(${"contact:email:" + values.email}, 0))`.execute(
        executor,
      );
      const contactOwner = await executor
        .selectFrom("user_contacts")
        .select("id")
        .where("type", "=", "email")
        .where("normalized_value", "=", values.email)
        .executeTakeFirst();
      if (contactOwner)
        throw new AppError(
          409,
          "identity_link_required",
          "Sign in to the existing account before linking this method.",
        );
      const created = await executor
        .insertInto("users")
        .values({
          status: "active",
          last_login_at: values.emailVerifiedAt,
          updated_at: values.emailVerifiedAt,
        })
        .returning([
          "id",
          "status",
          "created_at",
          "updated_at",
          "last_login_at",
        ])
        .executeTakeFirst();

      if (!created) return undefined;

      const nameParts = values.name?.trim().split(/\s+/) ?? [];
      const firstName = nameParts[0]?.slice(0, 100) ?? null;
      const lastName = nameParts.slice(1).join(" ").slice(0, 100) || null;

      await executor
        .insertInto("personal_profiles")
        .values({
          user_id: created.id,
          first_name: firstName,
          surname: lastName,
          image_url: values.image,
        })
        .execute();

      await executor
        .insertInto("user_contacts")
        .values({
          user_id: created.id,
          type: "email",
          normalized_value: values.email,
          verified_at: values.emailVerifiedAt,
          is_primary: true,
        })
        .onConflict((conflict) =>
          conflict.columns(["user_id", "type", "normalized_value"]).doNothing(),
        )
        .execute();

      return {
        id: created.id,
        email: values.email,
        email_verified_at: values.emailVerifiedAt,
        name: composeDisplayName(firstName, null, lastName),
        image: values.image,
        created_at: created.created_at,
        status: created.status,
      };
    },

    async markEmailVerified(executor: Executor, userId: string, now: Date) {
      await executor
        .updateTable("auth_identities")
        .set({ verified_at: now, last_used_at: now })
        .where("user_id", "=", userId)
        .where("provider", "=", "email")
        .execute();

      await executor
        .updateTable("user_contacts")
        .set({ verified_at: now, updated_at: now })
        .where("user_id", "=", userId)
        .where("type", "=", "email")
        .execute();
    },

    async updateLoginTime(executor: Executor, userId: string, now: Date) {
      await executor
        .updateTable("users")
        .set({ last_login_at: now, updated_at: now })
        .where("id", "=", userId)
        .execute();
    },

    async findIdentity(
      executor: Executor,
      provider: "email" | "phone" | "google",
      subject: string,
    ) {
      return executor
        .selectFrom("auth_identities")
        .select([
          "id",
          "user_id",
          "provider",
          "provider_subject",
          "verified_at",
        ])
        .where("provider", "=", provider)
        .where("provider_subject", "=", subject)
        .executeTakeFirst();
    },

    async findUserProviderIdentity(
      executor: Executor,
      userId: string,
      provider: "email" | "phone" | "google",
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
      provider: "email" | "phone" | "google",
      subject: string,
    ) {
      return executor
        .insertInto("auth_identities")
        .values({
          user_id: userId,
          provider,
          provider_subject: subject,
          verified_at: new Date(),
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
          created_at: values.now,
          last_active_at: values.now,
          expires_at: values.expiresAt,
        })
        .returning("id")
        .executeTakeFirstOrThrow();
      await executor
        .insertInto("auth_security_events")
        .values({
          user_id: values.userId,
          event_type: "session_created",
          metadata: {},
        })
        .execute();
      return session.id;
    },

    async findActiveSession(executor: Executor, tokenHash: string, now: Date) {
      return executor
        .selectFrom("sessions")
        .select(["id", "user_id", "last_active_at"])
        .where("token_hash", "=", tokenHash)
        .where("revoked_at", "is", null)
        .where("expires_at", ">", now)
        .executeTakeFirst();
    },

    async updateSessionActivity(executor: Executor, id: string, now: Date) {
      await executor
        .updateTable("sessions")
        .set({ last_active_at: now })
        .where("id", "=", id)
        .where("revoked_at", "is", null)
        .execute();
    },

    async listSessions(
      executor: Executor,
      userId: string,
      now: Date,
    ): Promise<AuthSession[]> {
      const rows = await executor
        .selectFrom("sessions")
        .select([
          "id",
          "device_name",
          "created_at",
          "last_active_at",
          "expires_at",
          "user_agent",
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
        deviceType: null,
        browser: null,
        os: null,
        createdAt: row.created_at.toISOString(),
        lastActiveAt: row.last_active_at.toISOString(),
        expiresAt: row.expires_at.toISOString(),
        current: false,
      }));
    },

    async revokeSession(
      executor: Executor,
      userId: string,
      sessionId: string,
      now: Date,
    ) {
      const revoked = await executor
        .updateTable("sessions")
        .set({ revoked_at: now })
        .where("id", "=", sessionId)
        .where("user_id", "=", userId)
        .where("revoked_at", "is", null)
        .returning("id")
        .executeTakeFirst();
      if (revoked)
        await this.insertSecurityEvent(
          executor,
          userId,
          "session_revoked",
          null,
        );
      return revoked;
    },

    async revokeAllSessions(executor: Executor, userId: string, now: Date) {
      const revoked = await executor
        .updateTable("sessions")
        .set({ revoked_at: now })
        .where("user_id", "=", userId)
        .where("revoked_at", "is", null)
        .returning("id")
        .execute();
      if (revoked.length)
        await this.insertSecurityEvent(
          executor,
          userId,
          "sessions_revoked_all",
          null,
        );
    },

    async revokeSessionByToken(
      executor: Executor,
      tokenHash: string,
      now: Date,
    ) {
      const revoked = await executor
        .updateTable("sessions")
        .set({ revoked_at: now })
        .where("token_hash", "=", tokenHash)
        .where("revoked_at", "is", null)
        .returning("user_id")
        .executeTakeFirst();
      if (revoked)
        await this.insertSecurityEvent(
          executor,
          revoked.user_id,
          "session_revoked",
          null,
        );
    },

    async insertGoogleNonce(
      executor: Executor,
      nonceHash: string,
      now: Date,
      expiresAt: Date,
    ) {
      await executor
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

    async cleanupExpiredData(executor: Executor, now: Date) {
      await sql`
        WITH expired AS (
          SELECT id
          FROM auth_challenges
          WHERE expires_at < ${now}
             OR (consumed_at < ${new Date(now.getTime() - 24 * 60 * 60 * 1000)})
          ORDER BY expires_at
          LIMIT 5000
        )
        DELETE FROM auth_challenges AS challenges
        USING expired
        WHERE challenges.id = expired.id
      `.execute(executor);

      await sql`
        WITH expired AS (
          SELECT id
          FROM sessions
          WHERE expires_at < ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)}
             OR revoked_at < ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)}
          ORDER BY expires_at
          LIMIT 5000
        )
        DELETE FROM sessions
        USING expired
        WHERE sessions.id = expired.id
      `.execute(executor);

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
      `.execute(executor);

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
      `.execute(executor);
    },

    async insertSecurityEvent(
      executor: Executor,
      userId: string | null,
      eventType: string,
      identityId: string | null,
      metadata: Record<string, unknown> = {},
    ) {
      await executor
        .insertInto("auth_security_events")
        .values({
          user_id: userId,
          event_type: eventType,
          identity_id: identityId,
          metadata,
        })
        .execute();
    },
  };
}

function composeDisplayName(
  firstName: string | null | undefined,
  middleName: string | null | undefined,
  surname: string | null | undefined,
): string | null {
  const parts = [firstName, middleName, surname].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
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

export type UserRecord = {
  id: string;
  email: string;
  email_verified_at: Date | null;
  name: string | null;
  image: string | null;
  created_at: Date;
  status: "active" | "disabled";
};

export type IdentityRecord = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createAuthRepository>["findIdentity"]>>
>;
export type AuthRepository = ReturnType<typeof createAuthRepository>;
