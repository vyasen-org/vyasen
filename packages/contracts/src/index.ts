import { z } from "zod";
export * from "./identity";

export const workspaceRoles = [
  "admin",
  "principal",
  "teacher",
  "student",
  "hr",
] as const;

export const workspaceRoleSchema = z.enum(workspaceRoles);

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;

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
  authPhoneCodeRequestSchema,
  authPhoneCodeResponseSchema,
  authPhoneCodeVerificationSchema,
  authPasswordSignInSchema,
  authPasswordSignupSchema,
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
  AuthPhoneCodeRequest,
  AuthPhoneCodeResponse,
  AuthPhoneCodeVerification,
  AuthPasswordSignIn,
  AuthPasswordSignup,
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
