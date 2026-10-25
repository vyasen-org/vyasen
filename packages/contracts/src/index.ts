import { z } from "zod";

export const schoolRoles = [
  "admin",
  "principal",
  "teacher",
  "student",
  "hr",
] as const;

export const schoolRoleSchema = z.enum(schoolRoles);

export type SchoolRole = z.infer<typeof schoolRoleSchema>;

export {
  appearancePreferenceSchema,
  colorThemeIds,
  colorThemeSchema,
  defaultUiPreferences,
  sidebarPreferenceSchema,
  uiPreferencesSchema,
} from "./preferences";
export type {
  AppearancePreferences,
  SidebarPreferences,
  UiPreferences,
} from "./preferences";
export {
  authEmailCodeRequestSchema,
  authEmailCodeResponseSchema,
  authEmailCodeVerificationSchema,
  authErrorResponseSchema,
  authGoogleCredentialSchema,
  authGoogleAuthorizeQuerySchema,
  authGoogleCallbackQuerySchema,
  authGoogleLinkResponseSchema,
  authGoogleNonceResponseSchema,
  authSessionListResponseSchema,
  authSessionParamsSchema,
  authSessionResponseSchema,
  authSessionsResponseSchema,
  authUserSchema,
} from "./auth";
export type {
  AuthEmailCodeRequest,
  AuthEmailCodeResponse,
  AuthEmailCodeVerification,
  AuthGoogleCredential,
  AuthGoogleAuthorizeQuery,
  AuthGoogleCallbackQuery,
  AuthGoogleNonceResponse,
  AuthSession,
  AuthSessionParams,
  AuthSessionListResponse,
  AuthSessionResponse,
  AuthSessionsResponse,
  AuthUser,
} from "./auth";
