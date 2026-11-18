import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import { IdentityService } from "./identity.service";
import { identityRepository } from "./identity.repository";

import type { AuthSession, AuthUser } from "@vyasen/contracts";
import type { Database } from "@vyasen/database";

import type { AppConfig } from "../../config";
import { AppError, invalidCodeError } from "../../errors";
import {
  createOAuthNonce,
  createOAuthState,
  createPkcePair,
  createSessionToken,
  EmailProvider,
  GoogleProvider,
  hashRateLimitKey,
  hashSessionToken,
  readOAuthState,
  SmsProvider,
  type GoogleIdentity,
  type SignedOAuthState,
} from "./auth.provider";
import {
  createAuthRepository,
  toAuthUser,
  type SessionMetadata,
  type UserRecord,
} from "./auth.repository";

const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const oneTapNonceLifetimeMs = 5 * 60 * 1000;
const oauthStateLifetimeMs = 10 * 60 * 1000;

interface AuthServiceDependencies {
  db: Kysely<Database>;
  config: AppConfig;
  emailProvider: EmailProvider;
  googleProvider: GoogleProvider | null;
  smsProvider?: SmsProvider | null;
}

interface AuthenticatedSession {
  user: AuthUser;
  sessionId: string;
  token: string;
}

interface GoogleSignInResult extends AuthenticatedSession {
  kind: "success";
}

export class AuthService {
  private readonly repository;

  constructor(private readonly dependencies: AuthServiceDependencies) {
    this.repository = createAuthRepository(dependencies.db);
  }

  async requestEmailCode(emailInput: string, ipAddress: string) {
    return this.identityService().issue(
      { destination: emailInput, channel: "email", purpose: "sign_in" },
      ipAddress,
      null,
    );
  }

  async verifyEmailCode(
    challengeId: string,
    emailInput: string,
    code: string,
    metadata: SessionMetadata,
  ): Promise<AuthenticatedSession> {
    const result = await this.identityService().verify(
      {
        destination: emailInput,
        channel: "email",
        purpose: "sign_in",
        challengeId,
        code,
      },
      metadata,
      null,
    );
    if (!("token" in result)) throw invalidCodeError();
    return result;
  }

  private identityService() {
    return new IdentityService(
      this.dependencies.db,
      this.dependencies.config,
      this.dependencies.emailProvider,
      this.dependencies.smsProvider ?? new SmsProvider(null),
    );
  }

  async beginGoogleOAuth(returnTo: string) {
    const provider = this.requireGoogleProvider();
    const now = Date.now();
    const safeReturnTo = this.validateReturnTo(returnTo);
    const pkce = createPkcePair();
    const oauthState: SignedOAuthState = {
      state: randomUUID(),
      nonce: createOAuthNonce(),
      codeVerifier: pkce.verifier,
      expiresAt: now + oauthStateLifetimeMs,
      returnTo: safeReturnTo,
    };
    const cookieValue = createOAuthState(
      oauthState,
      this.dependencies.config.authStateSecret,
    );
    await this.repository.insertGoogleNonce(
      this.dependencies.db,
      hashSessionToken(oauthState.nonce),
      new Date(),
      new Date(oauthState.expiresAt),
    );

    return {
      authorizationUrl: provider.createAuthorizationUrl(
        oauthState.state,
        oauthState.nonce,
        pkce.challenge,
      ),
      cookieValue,
    };
  }

  private async recordGoogleFailure<T>(
    userId: string | null,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      await this.repository.insertSecurityEvent(
        this.dependencies.db,
        userId,
        "google_auth_failed",
        null,
      );
      throw error;
    }
  }

  completeGoogleOAuth(
    code: string,
    state: string,
    stateCookie: string | undefined,
    metadata: SessionMetadata,
  ) {
    return this.recordGoogleFailure(null, () =>
      this.completeGoogleOAuthVerified(code, state, stateCookie, metadata),
    );
  }

  private async completeGoogleOAuthVerified(
    code: string,
    state: string,
    stateCookie: string | undefined,
    metadata: SessionMetadata,
  ) {
    await this.enforceRateLimit(
      `google-oauth-callback-ip:${metadata.ipAddress ?? "unknown"}`,
      20,
      15 * 60 * 1000,
    );
    const provider = this.requireGoogleProvider();
    const oauthState = readOAuthState(
      stateCookie,
      this.dependencies.config.authStateSecret,
    );
    if (
      !oauthState ||
      oauthState.state !== state ||
      oauthState.expiresAt <= Date.now()
    ) {
      throw new AppError(
        400,
        "google_state_invalid",
        "Google sign-in expired. Please try again.",
      );
    }

    if (
      !(await this.repository.consumeGoogleNonce(
        this.dependencies.db,
        hashSessionToken(oauthState.nonce),
        new Date(),
      ))
    ) {
      throw new AppError(
        400,
        "google_state_invalid",
        "Google sign-in expired. Please try again.",
      );
    }
    const identity = await provider.exchangeCode(
      code,
      oauthState.codeVerifier,
      oauthState.nonce,
    );
    const result = await this.signInWithGoogleIdentity(identity, metadata);
    return { ...result, returnTo: oauthState.returnTo };
  }

  async createOneTapNonce(ipAddress: string) {
    const clientId = this.dependencies.config.googleClientId;
    if (!clientId || !this.dependencies.googleProvider) {
      return { clientId: null, nonce: null, expiresInSeconds: 0 };
    }
    await this.enforceRateLimit(
      `google-nonce-ip:${ipAddress}`,
      30,
      60 * 60 * 1000,
    );
    const nonce = createOAuthNonce();
    const now = new Date();
    await this.repository.insertGoogleNonce(
      this.dependencies.db,
      hashSessionToken(nonce),
      now,
      new Date(now.getTime() + oneTapNonceLifetimeMs),
    );
    return {
      clientId,
      nonce,
      expiresInSeconds: oneTapNonceLifetimeMs / 1000,
    };
  }

  signInWithOneTap(
    credential: string,
    metadata: SessionMetadata,
  ): Promise<AuthenticatedSession> {
    return this.recordGoogleFailure(null, () =>
      this.signInWithOneTapVerified(credential, metadata),
    );
  }

  private async signInWithOneTapVerified(
    credential: string,
    metadata: SessionMetadata,
  ): Promise<AuthenticatedSession> {
    const provider = this.requireGoogleProvider();
    await this.enforceRateLimit(
      `google-one-tap-ip:${metadata.ipAddress ?? "unknown"}`,
      20,
      15 * 60 * 1000,
    );
    const identity = await provider.verifyOneTapCredential(credential);
    if (!identity.nonce) {
      throw new AppError(
        401,
        "google_auth_failed",
        "Google sign-in could not be verified.",
      );
    }
    const result = await this.signInWithGoogleIdentity(
      identity,
      metadata,
      true,
    );
    return {
      user: result.user,
      sessionId: result.sessionId,
      token: result.token,
    };
  }

  linkGoogleIdentity(
    userId: string,
    credential: string,
    ipAddress: string,
  ): Promise<void> {
    return this.recordGoogleFailure(userId, () =>
      this.linkGoogleIdentityVerified(userId, credential, ipAddress),
    );
  }

  private async linkGoogleIdentityVerified(
    userId: string,
    credential: string,
    ipAddress: string,
  ): Promise<void> {
    const provider = this.requireGoogleProvider();
    await this.enforceRateLimit(
      `google-link-ip:${ipAddress}`,
      20,
      15 * 60 * 1000,
    );
    const identity = await provider.verifyOneTapCredential(credential);
    if (!identity.nonce) {
      throw new AppError(
        401,
        "google_auth_failed",
        "Google sign-in could not be verified.",
      );
    }
    const nonce = identity.nonce;

    const now = new Date();
    const result = await this.dependencies.db
      .transaction()
      .execute(async (trx) => {
        const repository = createAuthRepository(trx);
        const nonceConsumed = await repository.consumeGoogleNonce(
          trx,
          hashSessionToken(nonce),
          now,
        );
        if (!nonceConsumed) return "invalid_nonce" as const;

        const user = await repository.findUserByIdForUpdate(trx, userId);
        if (!user || user.status !== "active")
          return "account_unavailable" as const;

        const linkedIdentity = await repository.findIdentity(
          trx,
          "google",
          identity.subject,
        );
        if (linkedIdentity) {
          return linkedIdentity.user_id === userId
            ? ("linked" as const)
            : ("identity_in_use" as const);
        }

        const inserted = await repository.insertIdentity(
          trx,
          userId,
          "google",
          identity.subject,
        );
        if (!inserted) {
          const concurrentIdentity = await repository.findIdentity(
            trx,
            "google",
            identity.subject,
          );
          return concurrentIdentity?.user_id === userId
            ? ("linked" as const)
            : ("identity_in_use" as const);
        }

        await identityRepository(trx).audit(userId, "identity_linked");
        return "linked" as const;
      });

    if (result === "invalid_nonce") {
      throw new AppError(
        401,
        "google_auth_failed",
        "Google sign-in could not be verified.",
      );
    }
    if (result === "account_unavailable") {
      throw new AppError(401, "unauthorized", "Sign in to link an account.");
    }
    if (result === "identity_in_use") {
      throw new AppError(
        409,
        "google_identity_conflict",
        "A Google account is already linked.",
      );
    }
  }

  async authenticateSession(token: string | undefined) {
    if (!token) return null;
    const now = new Date();
    const session = await this.repository.findActiveSession(
      this.dependencies.db,
      hashSessionToken(token),
      now,
    );
    if (!session) return null;

    const user = await this.repository.findUserById(
      this.dependencies.db,
      session.user_id,
    );
    if (!user || user.status !== "active") {
      await this.repository.revokeSessionByToken(
        this.dependencies.db,
        hashSessionToken(token),
        now,
      );
      return null;
    }

    if (now.getTime() - session.last_active_at.getTime() >= 5 * 60 * 1000) {
      await this.repository.updateSessionActivity(
        this.dependencies.db,
        session.id,
        now,
      );
    }
    return { user: toAuthUser(user), sessionId: session.id };
  }

  async listSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<AuthSession[]> {
    const sessions = await this.repository.listSessions(
      this.dependencies.db,
      userId,
      new Date(),
    );
    return sessions.map((session) => ({
      ...session,
      current: session.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.dependencies.db
      .transaction()
      .execute((trx) =>
        this.repository.revokeSession(trx, userId, sessionId, new Date()),
      );
  }

  async revokeAllSessions(userId: string) {
    await this.dependencies.db
      .transaction()
      .execute((trx) =>
        this.repository.revokeAllSessions(trx, userId, new Date()),
      );
  }

  async logout(token: string | undefined) {
    if (token) {
      await this.dependencies.db
        .transaction()
        .execute((trx) =>
          this.repository.revokeSessionByToken(
            trx,
            hashSessionToken(token),
            new Date(),
          ),
        );
    }
  }

  async cleanupExpiredData() {
    await this.repository.cleanupExpiredData(this.dependencies.db, new Date());
  }

  googleOAuthReturnTo(stateCookie: string | undefined): string {
    const state = readOAuthState(
      stateCookie,
      this.dependencies.config.authStateSecret,
    );
    return state && state.expiresAt > Date.now()
      ? this.validateReturnTo(state.returnTo)
      : "/";
  }

  private async signInWithGoogleIdentity(
    identity: GoogleIdentity,
    metadata: SessionMetadata,
    consumeNonce = false,
  ): Promise<GoogleSignInResult> {
    const now = new Date();
    const token = createSessionToken();
    const outcome = await this.dependencies.db
      .transaction()
      .execute(async (trx) => {
        const repository = createAuthRepository(trx);

        if (consumeNonce) {
          if (!identity.nonce) return { kind: "invalid_nonce" } as const;
          const consumed = await repository.consumeGoogleNonce(
            trx,
            hashSessionToken(identity.nonce),
            now,
          );
          if (!consumed) return { kind: "invalid_nonce" } as const;
        }

        let linkedIdentity = await repository.findIdentity(
          trx,
          "google",
          identity.subject,
        );
        let user: UserRecord | undefined;

        if (linkedIdentity) {
          user = await repository.findUserById(trx, linkedIdentity.user_id);
        } else {
          const existingEmailUser = await repository.findUserByEmail(
            trx,
            identity.email,
          );
          if (existingEmailUser) {
            return { kind: "identity_link_required" } as const;
          }

          const insertedUser = await repository.insertUser(trx, {
            email: identity.email,
            emailVerifiedAt: now,
            name: identity.name,
            image: identity.image,
          });

          if (!insertedUser) {
            linkedIdentity = await repository.findIdentity(
              trx,
              "google",
              identity.subject,
            );
            if (!linkedIdentity) {
              return { kind: "identity_link_required" } as const;
            }
            user = await repository.findUserById(trx, linkedIdentity.user_id);
          } else {
            const insertedIdentity = await repository.insertIdentity(
              trx,
              insertedUser.id,
              "google",
              identity.subject,
            );

            if (!insertedIdentity) {
              const concurrentIdentity = await repository.findIdentity(
                trx,
                "google",
                identity.subject,
              );
              await repository.deleteUser(trx, insertedUser.id);
              if (!concurrentIdentity) {
                throw new Error(
                  "A concurrent Google identity could not be loaded.",
                );
              }
              user = await repository.findUserById(
                trx,
                concurrentIdentity.user_id,
              );
            } else {
              user = await repository.findUserById(trx, insertedUser.id);
              await repository.insertSecurityEvent(
                trx,
                insertedUser.id,
                "account_created",
                insertedIdentity.id,
              );
            }
          }
        }

        if (!user)
          throw new Error("A Google-authenticated user could not be loaded.");
        user = await repository.findUserByIdForUpdate(trx, user.id);
        if (!user) return { kind: "account_disabled" } as const;
        const authorizedIdentity = await repository.findIdentity(
          trx,
          "google",
          identity.subject,
        );
        if (
          !authorizedIdentity ||
          authorizedIdentity.user_id !== user.id ||
          (linkedIdentity && authorizedIdentity.id !== linkedIdentity.id)
        )
          return { kind: "invalid_nonce" } as const;
        if (user.status !== "active")
          return { kind: "account_disabled" } as const;

        await repository.updateLoginTime(trx, user.id, now);
        const sessionId = await repository.createSession(trx, {
          userId: user.id,
          tokenHash: hashSessionToken(token),
          metadata,
          now,
          expiresAt: new Date(now.getTime() + sessionLifetimeMs),
        });
        const refreshedUser = await repository.findUserById(trx, user.id);
        if (!refreshedUser)
          throw new Error("A signed-in user could not be loaded.");

        return {
          kind: "success",
          sessionId,
          user: toAuthUser(refreshedUser),
        } as const;
      });

    if (outcome.kind === "invalid_nonce") {
      throw new AppError(
        401,
        "google_auth_failed",
        "Google sign-in could not be verified.",
      );
    }
    if (outcome.kind === "identity_link_required") {
      throw new AppError(
        409,
        "identity_link_required",
        "Sign in with your existing method before linking this Google account.",
      );
    }
    if (outcome.kind === "account_disabled") {
      throw new AppError(403, "account_disabled", "This account is disabled.");
    }

    return {
      kind: "success",
      user: outcome.user,
      sessionId: outcome.sessionId,
      token,
    };
  }

  private async enforceRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
  ) {
    const now = new Date();
    const bucketHash = hashRateLimitKey(
      key,
      this.dependencies.config.authRateLimitSecret,
    );
    const result = await this.repository.consumeRateLimit(
      bucketHash,
      now,
      windowMs,
      maxRequests,
    );
    const entry = result.rows[0];
    if (!entry)
      throw new Error("The authentication rate limit could not be checked.");
    if (entry.request_count > maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(
          (entry.window_started_at.getTime() + windowMs - now.getTime()) / 1000,
        ),
      );
      throw new AppError(
        429,
        "rate_limited",
        "Too many attempts. Please wait before trying again.",
        retryAfterSeconds,
      );
    }
  }

  private requireGoogleProvider(): GoogleProvider {
    if (!this.dependencies.googleProvider) {
      throw new AppError(
        503,
        "google_auth_unavailable",
        "Google sign-in is not configured.",
      );
    }
    return this.dependencies.googleProvider;
  }

  private validateReturnTo(candidate: string): string {
    if (
      !candidate.startsWith("/") ||
      candidate.startsWith("//") ||
      candidate.includes("\\")
    ) {
      return "/";
    }
    try {
      const url = new URL(candidate, this.dependencies.config.webOrigins[0]);
      return this.dependencies.config.webOrigins.includes(url.origin)
        ? `${url.pathname}${url.search}${url.hash}`
        : "/";
    } catch {
      return "/";
    }
  }
}
