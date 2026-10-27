import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import nodemailer, { type Transporter } from "nodemailer";

import type { AppConfig } from "../../config";
import { AppError } from "../../errors";

export interface GoogleIdentity {
  subject: string;
  email: string;
  name: string | null;
  image: string | null;
  nonce?: string;
}

export interface SignedOAuthState {
  state: string;
  nonce: string;
  codeVerifier: string;
  expiresAt: number;
  returnTo: string;
}

export interface EmailDeliveryFailure {
  errorName: string;
  code: string | null;
  command: string | null;
  responseCode: number | null;
  response: string | null;
  syscall: string | null;
}

export class GoogleProvider {
  private readonly client: OAuth2Client;

  constructor(
    private readonly clientId: string,
    clientSecret: string,
    redirectUri: string,
  ) {
    this.client = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  createAuthorizationUrl(
    state: string,
    nonce: string,
    codeChallenge: string,
  ): string {
    return this.client.generateAuthUrl({
      access_type: "online",
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
      nonce,
      prompt: "select_account",
      scope: ["openid", "email", "profile"],
      state,
    });
  }

  async exchangeCode(
    code: string,
    codeVerifier: string,
    expectedNonce: string,
  ): Promise<GoogleIdentity> {
    const { tokens } = await this.client.getToken({ code, codeVerifier });
    if (!tokens.id_token) {
      throw new AppError(401, "google_auth_failed", "Google sign-in could not be completed.");
    }
    const identity = await this.verifyIdentityToken(tokens.id_token);
    if (identity.nonce !== expectedNonce) {
      throw new AppError(401, "google_auth_failed", "Google sign-in could not be completed.");
    }
    return identity;
  }

  async verifyOneTapCredential(credential: string): Promise<GoogleIdentity> {
    return this.verifyIdentityToken(credential);
  }

  private async verifyIdentityToken(token: string): Promise<GoogleIdentity> {
    let payload;

    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new AppError(
        401,
        "google_auth_failed",
        "Google sign-in could not be verified. Try again.",
      );
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const audienceIsValid = Array.isArray(payload?.aud)
      ? payload.aud.includes(this.clientId) && payload.azp === this.clientId
      : payload?.aud === this.clientId;
    const issuerIsValid =
      payload?.iss === "accounts.google.com" ||
      payload?.iss === "https://accounts.google.com";

    if (
      !payload ||
      !audienceIsValid ||
      !issuerIsValid ||
      !payload.exp ||
      payload.exp <= nowInSeconds ||
      payload.email_verified !== true ||
      !payload.sub ||
      !payload.email
    ) {
      throw new AppError(
        401,
        "google_auth_failed",
        "Google sign-in could not be verified. Try again.",
      );
    }

    return {
      subject: payload.sub,
      email: payload.email.trim().toLowerCase(),
      name: payload.name?.slice(0, 200) ?? null,
      image: safeGoogleImage(payload.picture),
      nonce: payload.nonce,
    };
  }
}

export class EmailProvider {
  private readonly transporter: Transporter | null;

  constructor(
    private readonly config: AppConfig["smtp"],
    private readonly onDeliveryFailure?: (failure: EmailDeliveryFailure) => void,
  ) {
    this.transporter = config
      ? nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth:
            config.user && config.password
              ? { user: config.user, pass: config.password }
              : undefined,
          requireTLS: !config.secure,
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 15_000,
        })
      : null;
  }

  async sendSignInCode(email: string, code: string, expiresInMinutes: number) {
    if (!this.transporter || !this.config) {
      throw new AppError(
        503,
        "email_delivery_unavailable",
        "Email sign-in is temporarily unavailable. Please try again later.",
      );
    }

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: email,
        subject: "Your School SMS sign-in code",
        text: `Your sign-in code is ${code}. It expires in ${expiresInMinutes} minutes. If you did not request this code, you can ignore this email.`,
      });
    } catch (error) {
      const details =
        typeof error === "object" && error !== null
          ? error as {
              code?: unknown;
              command?: unknown;
              response?: unknown;
              responseCode?: unknown;
              syscall?: unknown;
            }
          : {};
      this.onDeliveryFailure?.({
        errorName: error instanceof Error ? error.name : "unknown",
        code: typeof details.code === "string" ? details.code : null,
        command:
          typeof details.command === "string" ? details.command : null,
        responseCode:
          typeof details.responseCode === "number"
            ? details.responseCode
            : null,
        response:
          typeof details.response === "string"
            ? details.response
                .replace(
                  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
                  "[email]",
                )
                .slice(0, 500)
            : null,
        syscall:
          typeof details.syscall === "string" ? details.syscall : null,
      });
      throw error;
    }
  }
}

export function hashVerificationCode(code: string, secret: string): string {
  return createHmac("sha256", secret).update(code).digest("hex");
}

export function hashesMatch(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");
  return (
    expected.length === actual.length &&
    expected.length > 0 &&
    timingSafeEqual(expected, actual)
  );
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRateLimitKey(key: string, secret: string): string {
  return createHmac("sha256", secret).update(key).digest("hex");
}

export function createOAuthState(
  state: SignedOAuthState,
  secret: string,
): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readOAuthState(
  value: string | undefined,
  secret: string,
): SignedOAuthState | null {
  if (!value) return null;

  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return null;

  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest();
  const actualSignature = Buffer.from(signature, "base64url");
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("state" in parsed) ||
      !("nonce" in parsed) ||
      !("codeVerifier" in parsed) ||
      !("expiresAt" in parsed) ||
      !("returnTo" in parsed) ||
      typeof parsed.state !== "string" ||
      typeof parsed.nonce !== "string" ||
      typeof parsed.codeVerifier !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      typeof parsed.returnTo !== "string"
    ) {
      return null;
    }
    return {
      state: parsed.state,
      nonce: parsed.nonce,
      codeVerifier: parsed.codeVerifier,
      expiresAt: parsed.expiresAt,
      returnTo: parsed.returnTo,
    };
  } catch {
    return null;
  }
}

function safeGoogleImage(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (url.hostname === "googleusercontent.com" ||
        url.hostname.endsWith(".googleusercontent.com"))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function createPkcePair(): {
  verifier: string;
  challenge: string;
} {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createOAuthNonce(): string {
  return randomBytes(32).toString("base64url");
}
