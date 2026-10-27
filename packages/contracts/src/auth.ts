import { z } from "zod";

const emailSchema = z.string().trim().email().max(254);

export const authEmailCodeRequestSchema = z.object({
  email: emailSchema,
});

export const authEmailCodeResponseSchema = z.object({
  challengeId: z.uuid(),
  expiresInSeconds: z.number().int().positive(),
  message: z.string(),
});

export const authEmailCodeVerificationSchema = z.object({
  challengeId: z.uuid(),
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/),
});

export const authGoogleCredentialSchema = z.object({
  credential: z.string().min(1).max(8192),
});

export const authUserSchema = z.object({
  id: z.uuid(),
  email: emailSchema,
  emailVerifiedAt: z.iso.datetime().nullable(),
  name: z.string().max(200).nullable(),
  image: z.string().url().nullable(),
  createdAt: z.iso.datetime(),
});

export const authSessionSchema = z.object({
  id: z.uuid(),
  deviceName: z.string().max(200).nullable(),
  deviceType: z.string().max(40).nullable(),
  browser: z.string().max(120).nullable(),
  os: z.string().max(120).nullable(),
  createdAt: z.iso.datetime(),
  lastActiveAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  current: z.boolean(),
});

export const authSessionResponseSchema = z.object({
  user: authUserSchema,
});

export const authSessionsResponseSchema = z.object({
  sessions: z.array(authSessionSchema).max(5),
});

export const authSessionListResponseSchema = authSessionsResponseSchema;

export const authGoogleLinkResponseSchema = z.object({
  linked: z.literal(true),
});

export const authGoogleNonceResponseSchema = z.object({
  clientId: z.string().min(1).nullable(),
  nonce: z.string().min(1).nullable(),
  expiresInSeconds: z.number().int().nonnegative(),
});

export const authGoogleAuthorizeQuerySchema = z.object({
  returnTo: z.string().max(2048).optional(),
});

export const authGoogleCallbackQuerySchema = z
  .object({
    code: z.string().max(4096).optional(),
    state: z.string().max(256).optional(),
    error: z.string().max(128).optional(),
  })
  .passthrough();

export const authSessionParamsSchema = z.object({
  sessionId: z.uuid(),
});

export const authErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type AuthEmailCodeRequest = z.infer<typeof authEmailCodeRequestSchema>;
export type AuthEmailCodeResponse = z.infer<typeof authEmailCodeResponseSchema>;
export type AuthEmailCodeVerification = z.infer<
  typeof authEmailCodeVerificationSchema
>;
export type AuthGoogleCredential = z.infer<
  typeof authGoogleCredentialSchema
>;
export type AuthGoogleNonceResponse = z.infer<
  typeof authGoogleNonceResponseSchema
>;
export type AuthGoogleAuthorizeQuery = z.infer<
  typeof authGoogleAuthorizeQuerySchema
>;
export type AuthGoogleCallbackQuery = z.infer<
  typeof authGoogleCallbackQuerySchema
>;
export type AuthSessionParams = z.infer<typeof authSessionParamsSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;
export type AuthSessionsResponse = z.infer<typeof authSessionsResponseSchema>;
export type AuthSessionListResponse = z.infer<
  typeof authSessionListResponseSchema
>;
