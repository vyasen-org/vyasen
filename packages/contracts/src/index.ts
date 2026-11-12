import { z } from "zod";

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
