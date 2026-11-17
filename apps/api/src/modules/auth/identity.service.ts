import {
  argon2,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import type { Kysely } from "kysely";
import type { Database } from "@vyasen/database";
import {
  identityChallengeSchema,
  identityVerificationSchema,
  personalProfileSchema,
} from "@vyasen/contracts";
import type { AppConfig } from "../../config";
import { AppError, invalidCodeError } from "../../errors";
import {
  EmailProvider,
  SmsProvider,
  createSessionToken,
  hashRateLimitKey,
  hashSessionToken,
  hashesMatch,
  hashVerificationCode,
} from "./auth.provider";
import {
  createAuthRepository,
  toAuthUser,
  type SessionMetadata,
} from "./auth.repository";
import {
  identityRepository,
  type IdentityExecutor,
} from "./identity.repository";

type Challenge = z.infer<typeof identityChallengeSchema>;
const derive = promisify(argon2);
export async function encodePassword(password: string) {
  const salt = randomBytes(16);
  const hash = await derive("argon2id", {
    message: password,
    nonce: salt,
    parallelism: 1,
    tagLength: 32,
    memory: 65536,
    passes: 3,
  });
  return `$argon2id$v=19$m=65536,t=3,p=1$${salt.toString("base64")}$${hash.toString("base64")}`;
}
export async function checkPassword(encoded: string, password: string) {
  const parts = encoded.split("$");
  if (
    parts.length !== 6 ||
    parts[1] !== "argon2id" ||
    parts[2] !== "v=19" ||
    parts[3] !== "m=65536,t=3,p=1"
  )
    return false;
  try {
    const hash = await derive("argon2id", {
      message: password,
      nonce: Buffer.from(parts[4], "base64"),
      parallelism: 1,
      tagLength: 32,
      memory: 65536,
      passes: 3,
    });
    const expected = Buffer.from(parts[5], "base64");
    return expected.length === hash.length && timingSafeEqual(expected, hash);
  } catch {
    return false;
  }
}

export class IdentityService {
  constructor(
    private readonly db: Kysely<Database>,
    private readonly config: AppConfig,
    private readonly email: EmailProvider,
    private readonly sms: SmsProvider,
  ) {}
  availability() {
    return { sms: this.sms.isAvailable() };
  }
  private normalize(input: Challenge) {
    if (input.channel === "sms") {
      if (!this.sms.isAvailable())
        throw new AppError(
          503,
          "sms_unavailable",
          "SMS is unavailable. Use email or Google.",
        );
      if (!/^\+[1-9]\d{7,14}$/.test(input.destination))
        throw new AppError(
          400,
          "invalid_phone",
          "Use an international phone number starting with +.",
        );
      return input.destination;
    }
    if (!z.email().safeParse(input.destination).success)
      throw new AppError(400, "invalid_email", "Enter a valid email.");
    return input.destination.trim().toLowerCase();
  }
  private digest(value: string) {
    return hashRateLimitKey(value, this.config.authCodeHashSecret);
  }
  private async limit(key: string, max: number, window: number) {
    const result = await createAuthRepository(this.db).consumeRateLimit(
      hashRateLimitKey(key, this.config.authRateLimitSecret),
      new Date(),
      window,
      max,
    );
    if (result.rows[0].request_count > max)
      throw new AppError(
        429,
        "rate_limited",
        "Too many attempts. Try later.",
        Math.ceil(window / 1000),
      );
  }
  async issue(input: Challenge, ip: string, userId: string | null) {
    const destination = this.normalize(input);
    if (["account_link", "contact_verify"].includes(input.purpose) && !userId)
      throw new AppError(401, "unauthorized", "Sign in first.");
    await this.limit("challenge-ip:" + ip, 20, 3600000);
    await this.limit("challenge-destination:" + destination, 5, 3600000);
    await this.limit("challenge-cooldown:" + destination, 1, 120000);
    const id = randomUUID();
    const code = randomInt(1000000).toString().padStart(6, "0");
    const provider = input.channel === "email" ? "email" : "phone";
    const repo = identityRepository(this.db);
    const identity = await repo.identity(provider, destination);
    await repo.issue({
      id,
      user_id: userId ?? identity?.user_id ?? null,
      auth_identity_id: identity?.id ?? null,
      channel: input.channel,
      purpose: input.purpose,
      destination_hash: this.digest(destination),
      secret_hash: hashVerificationCode(
        id + ":" + input.purpose + ":" + code,
        this.config.authCodeHashSecret,
      ),
      expires_at: new Date(Date.now() + 600000),
    });
    try {
      if (input.channel === "email")
        await this.email.sendSignInCode(destination, code, 10);
      else await this.sms.sendSignInCode(destination, code, 10);
    } catch {
      await repo.consume(id);
      throw new AppError(
        503,
        "delivery_unavailable",
        "Verification delivery is unavailable.",
      );
    }
    return {
      challengeId: id,
      expiresInSeconds: 600,
      message:
        "If this destination can receive a verification code, it has been sent.",
    };
  }
  async verify(
    input: z.infer<typeof identityVerificationSchema>,
    metadata: SessionMetadata,
    userId: string | null,
  ) {
    const destination = this.normalize(input);
    await this.limit("verify-ip:" + metadata.ipAddress, 30, 900000);
    const result = await this.db.transaction().execute(async (trx) => {
      const repo = identityRepository(trx);
      const challenge = await repo.challenge(input.challengeId);
      if (
        !challenge ||
        challenge.consumed_at ||
        challenge.expires_at <= new Date() ||
        challenge.attempt_count >= 5 ||
        challenge.purpose !== input.purpose ||
        challenge.channel !== input.channel ||
        challenge.destination_hash !== this.digest(destination) ||
        (["contact_verify", "account_link"].includes(input.purpose) &&
          (!userId || challenge.user_id !== userId))
      )
        return null;
      if (
        !hashesMatch(
          challenge.secret_hash,
          hashVerificationCode(
            challenge.id + ":" + challenge.purpose + ":" + input.code,
            this.config.authCodeHashSecret,
          ),
        )
      ) {
        await repo.attempt(challenge.id, challenge.attempt_count + 1);
        return null;
      }
      await repo.consume(challenge.id);
      const provider = input.channel === "email" ? "email" : "phone";
      await repo.serialize("identity:" + provider + ":" + destination);
      const identity = await repo.identity(provider, destination);
      if (
        input.purpose === "sign_in" &&
        challenge.auth_identity_id &&
        (identity?.id !== challenge.auth_identity_id ||
          identity.user_id !== challenge.user_id)
      ) {
        return null;
      }
      if (input.purpose === "signup") {
        if (input.channel !== "email")
          throw new AppError(
            400,
            "invalid_purpose",
            "Password signup requires email.",
          );
        if (identity)
          throw new AppError(
            409,
            "identity_unavailable",
            "Use an existing sign-in method.",
          );
        const proof = createSessionToken();
        await repo.issue({
          id: randomUUID(),
          user_id: null,
          auth_identity_id: null,
          channel: "email",
          purpose: "password_setup",
          destination_hash: this.digest(destination),
          secret_hash: hashSessionToken(proof),
          expires_at: new Date(Date.now() + 300000),
        });
        return { proof };
      }
      if (
        input.purpose === "contact_verify" ||
        input.purpose === "account_link"
      ) {
        if (!userId) throw new AppError(401, "unauthorized", "Sign in first.");
        const user = await repo.lockUser(userId);
        if (user.status !== "active")
          throw new AppError(403, "account_disabled", "Account unavailable.");
        if (input.purpose === "account_link") {
          if (identity && identity.user_id !== userId)
            throw new AppError(409, "identity_conflict", "Method unavailable.");
          if (!identity) await repo.addIdentity(userId, provider, destination);
        } else if (!(await repo.addContact(userId, provider, destination)))
          throw new AppError(
            409,
            "contact_unavailable",
            "Contact unavailable.",
          );
        await repo.audit(userId, input.purpose);
        return { success: true as const };
      }
      let id = identity?.user_id;
      if (!id) {
        id = await repo.createUser();
        await repo.addIdentity(id, provider, destination);
        if (!(await repo.addContact(id, provider, destination)))
          throw new AppError(
            409,
            "contact_unavailable",
            "Contact unavailable.",
          );
        await repo.audit(id, "account_created");
      }
      return this.session(trx, id, metadata);
    });
    if (!result) throw invalidCodeError();
    return result;
  }
  async signup(
    email: string,
    proof: string,
    password: string,
    metadata: SessionMetadata,
  ) {
    const destination = email.trim().toLowerCase();
    await this.limit("signup-ip:" + metadata.ipAddress, 10, 3600000);
    const encoded = await encodePassword(password);
    return this.db.transaction().execute(async (trx) => {
      const repo = identityRepository(trx);
      await repo.serialize("identity:email:" + destination);
      // Proofs are random 256-bit values; stored hashes are safe for indexed lookup.
      const record = await trx
        .selectFrom("auth_challenges")
        .select("id")
        .where("purpose", "=", "password_setup")
        .where("secret_hash", "=", hashSessionToken(proof))
        .forUpdate()
        .executeTakeFirst();
      const challenge = record && (await repo.challenge(record.id));
      if (
        !challenge ||
        challenge.consumed_at ||
        challenge.expires_at <= new Date() ||
        challenge.destination_hash !== this.digest(destination)
      )
        throw invalidCodeError();
      if (await repo.identity("email", destination))
        throw new AppError(
          409,
          "identity_conflict",
          "Use an existing sign-in method.",
        );
      await repo.consume(challenge.id);
      const id = await repo.createUser();
      await repo.addIdentity(id, "email", destination);
      if (!(await repo.addContact(id, "email", destination)))
        throw new AppError(409, "contact_unavailable", "Contact unavailable.");
      await repo.credentialSet(id, encoded);
      await repo.audit(id, "account_created");
      return this.session(trx, id, metadata);
    });
  }
  async password(email: string, password: string, metadata: SessionMetadata) {
    await this.limit("password-ip:" + metadata.ipAddress, 20, 900000);
    await this.limit(
      "password-email:" + email.trim().toLowerCase(),
      10,
      900000,
    );
    const repo = identityRepository(this.db);
    const identity = await repo.identity("email", email.trim().toLowerCase());
    const credential = identity && (await repo.credential(identity.user_id));
    // Perform the same expensive derivation for absent credentials.
    const encoded =
      credential?.password_hash ??
      "$argon2id$v=19$m=65536,t=3,p=1$MDEyMzQ1Njc4OWFiY2RlZg==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    const valid = await checkPassword(encoded, password);
    if (!valid || !identity) {
      await repo.audit(identity?.user_id ?? null, "password_sign_in_failed");
      throw new AppError(
        401,
        "invalid_credentials",
        "Email or password is incorrect.",
      );
    }
    return this.db
      .transaction()
      .execute((trx) => this.session(trx, identity.user_id, metadata));
  }
  private async session(
    trx: IdentityExecutor,
    id: string,
    metadata: SessionMetadata,
  ) {
    const repo = identityRepository(trx);
    if ((await repo.lockUser(id)).status !== "active")
      throw new AppError(403, "account_disabled", "Account unavailable.");
    const auth = createAuthRepository(trx);
    const token = createSessionToken();
    await auth.updateLoginTime(trx, id, new Date());
    const sessionId = await auth.createSession(trx, {
      userId: id,
      tokenHash: hashSessionToken(token),
      metadata,
      now: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    });
    return {
      user: toAuthUser((await auth.findUserById(trx, id))!),
      token,
      sessionId,
    };
  }
  account(id: string) {
    return identityRepository(this.db).account(id);
  }
  async updateProfile(
    id: string,
    input: z.infer<typeof personalProfileSchema>,
  ) {
    await identityRepository(this.db).profile(id, input);
    return this.account(id);
  }
  async changeMethod(id: string, item: string, action: "primary" | "unlink") {
    return this.db.transaction().execute(async (trx) => {
      const repo = identityRepository(trx);
      await repo.lockUser(id);
      if (
        !(action === "primary"
          ? await repo.primary(id, item)
          : await repo.unlink(id, item))
      )
        throw new AppError(
          409,
          "operation_unavailable",
          "Operation unavailable or last sign-in method.",
        );
      await repo.audit(
        id,
        action === "primary" ? "contact_primary_changed" : "identity_unlinked",
      );
      return { success: true as const };
    });
  }
}
