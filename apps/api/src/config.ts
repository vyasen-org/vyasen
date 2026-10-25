import dotenv from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env"),
  quiet: true,
});

const strongSecret = z
  .string()
  .min(32)
  .refine(
    (value) =>
      !/change[\s_-]?me|replace[\s_-]?this/i.test(value),
    "Replace the example value with a randomly generated secret.",
  );

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === ""
      ? undefined
      : value,
  z.string().trim().min(1).optional(),
);

const smtpFromSchema = z.string().trim().refine((value) => {
  if (z.email().safeParse(value).success) return true;
  const namedAddress = /^([^<>\r\n]+?)\s*<([^<>\r\n]+)>$/.exec(value);
  return Boolean(
    namedAddress?.[1]?.trim() &&
      namedAddress[2] &&
      z.email().safeParse(namedAddress[2]).success,
  );
}, "SMTP_FROM must be an email address or a display name followed by an email address.");

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_HOST: z.string().trim().min(1).default("127.0.0.1"),
  API_PUBLIC_ORIGIN: z.url().default("http://localhost:4000"),
  WEB_ORIGINS: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.url(),
  AUTH_CODE_HASH_SECRET: strongSecret,
  AUTH_STATE_SECRET: strongSecret,
  AUTH_RATE_LIMIT_SECRET: strongSecret,
  SESSION_COOKIE_NAME: z.string().trim().min(1).default("school_sms_session"),
  SESSION_COOKIE_DOMAIN: optionalText,
  SESSION_COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),
  TRUST_PROXY: z.string().default(""),
  GOOGLE_CLIENT_ID: optionalText,
  GOOGLE_CLIENT_SECRET: optionalText,
  GOOGLE_REDIRECT_URI: optionalText,
  SMTP_HOST: optionalText,
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: optionalText,
  SMTP_PASSWORD: optionalText,
  SMTP_FROM: smtpFromSchema.default("no-reply@school-sms.example"),
});

const environment = environmentSchema.parse(process.env);

if (Boolean(environment.GOOGLE_CLIENT_ID) !== Boolean(environment.GOOGLE_CLIENT_SECRET)) {
  throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together.");
}

if (environment.SESSION_COOKIE_SAME_SITE === "none" && environment.NODE_ENV !== "production") {
  throw new Error("SameSite=None cookies may only be used in production.");
}

if (Boolean(environment.SMTP_USER) !== Boolean(environment.SMTP_PASSWORD)) {
  throw new Error("SMTP_USER and SMTP_PASSWORD must be configured together.");
}

const webOrigins = environment.WEB_ORIGINS.split(",")
  .map((origin) => new URL(origin.trim()).origin)
  .filter((origin, index, origins) => origins.indexOf(origin) === index);

if (webOrigins.length === 0) {
  throw new Error("At least one WEB_ORIGINS entry is required.");
}

const apiPublicOrigin = new URL(environment.API_PUBLIC_ORIGIN).origin;
const googleRedirectUri =
  environment.GOOGLE_REDIRECT_URI ??
  `${apiPublicOrigin}/api/v1/auth/google/callback`;
const parsedGoogleRedirectUri = new URL(googleRedirectUri);

if (
  parsedGoogleRedirectUri.origin !== apiPublicOrigin ||
  parsedGoogleRedirectUri.pathname !== "/api/v1/auth/google/callback" ||
  parsedGoogleRedirectUri.search ||
  parsedGoogleRedirectUri.hash
) {
  throw new Error(
    "GOOGLE_REDIRECT_URI must use API_PUBLIC_ORIGIN and the registered auth callback path.",
  );
}

if (new URL(environment.DATABASE_URL).protocol !== "postgresql:" &&
    new URL(environment.DATABASE_URL).protocol !== "postgres:") {
  throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
}

if (
  environment.NODE_ENV === "production" &&
  (webOrigins.some((origin) => !origin.startsWith("https://")) ||
    !apiPublicOrigin.startsWith("https://"))
) {
  throw new Error("Production API and web origins must use HTTPS.");
}

const trustProxy = environment.TRUST_PROXY
  ? environment.TRUST_PROXY.split(",").map((entry) => entry.trim())
  : false;
if (Array.isArray(trustProxy) && trustProxy.some((entry) => entry === "*" || entry === "true")) {
  throw new Error("TRUST_PROXY must list trusted proxy addresses, not trust every proxy.");
}

export const config = {
  apiHost: environment.API_HOST,
  apiPort: environment.API_PORT,
  apiPublicOrigin,
  authCodeHashSecret: environment.AUTH_CODE_HASH_SECRET,
  authRateLimitSecret: environment.AUTH_RATE_LIMIT_SECRET,
  authStateSecret: environment.AUTH_STATE_SECRET,
  databaseUrl: environment.DATABASE_URL,
  googleClientId: environment.GOOGLE_CLIENT_ID ?? null,
  googleClientSecret: environment.GOOGLE_CLIENT_SECRET ?? null,
  googleRedirectUri,
  nodeEnv: environment.NODE_ENV,
  sessionCookieDomain: environment.SESSION_COOKIE_DOMAIN,
  sessionCookieName: environment.SESSION_COOKIE_NAME,
  sessionCookieSameSite: environment.SESSION_COOKIE_SAME_SITE,
  sessionCookieSecure:
    environment.NODE_ENV === "production" ||
    environment.SESSION_COOKIE_SAME_SITE === "none",
  smtp: environment.SMTP_HOST
    ? {
        host: environment.SMTP_HOST,
        port: environment.SMTP_PORT,
        secure: environment.SMTP_SECURE === "true",
        user: environment.SMTP_USER,
        password: environment.SMTP_PASSWORD,
        from: environment.SMTP_FROM,
      }
    : null,
  trustProxy,
  webOrigins,
} as const;

export type AppConfig = typeof config;
