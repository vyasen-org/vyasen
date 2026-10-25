import {
  authEmailCodeRequestSchema,
  authEmailCodeResponseSchema,
  authEmailCodeVerificationSchema,
  authGoogleCredentialSchema,
  authGoogleLinkResponseSchema,
  authGoogleNonceResponseSchema,
  authSessionResponseSchema,
  authSessionsResponseSchema,
  type AuthEmailCodeRequest,
  type AuthEmailCodeVerification,
  type AuthGoogleCredential,
} from "@school-sms/contracts";

import { apiRequest, apiRequestNoContent, ApiError } from "@/lib/api-client";

export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const,
  sessions: () => [...authKeys.all, "sessions"] as const,
  googleNonce: () => [...authKeys.all, "google-nonce"] as const,
};

export async function getAuthSession(signal?: AbortSignal) {
  try {
    return await apiRequest("/auth/session", authSessionResponseSchema, {
      method: "GET",
      signal,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function getAuthSessions(signal?: AbortSignal) {
  return apiRequest("/auth/sessions", authSessionsResponseSchema, {
    method: "GET",
    signal,
  });
}

export function requestEmailCode(values: AuthEmailCodeRequest) {
  const body = authEmailCodeRequestSchema.parse(values);
  return apiRequest("/auth/email/codes", authEmailCodeResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function verifyEmailCode(values: AuthEmailCodeVerification) {
  const body = authEmailCodeVerificationSchema.parse(values);
  return apiRequest("/auth/email/sessions", authSessionResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getGoogleNonce(signal?: AbortSignal) {
  return apiRequest("/auth/google/nonce", authGoogleNonceResponseSchema, {
    method: "GET",
    signal,
  });
}

export function signInWithGoogleCredential(values: AuthGoogleCredential) {
  const body = authGoogleCredentialSchema.parse(values);
  return apiRequest("/auth/google/one-tap", authSessionResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function linkGoogleIdentity(values: AuthGoogleCredential) {
  const body = authGoogleCredentialSchema.parse(values);
  return apiRequest("/auth/google/identities", authGoogleLinkResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function logout() {
  return apiRequestNoContent("/auth/session", {
    method: "DELETE",
  });
}

export function revokeSession(sessionId: string) {
  return apiRequestNoContent(
    `/auth/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
  );
}

export function logoutAllSessions() {
  return apiRequestNoContent("/auth/sessions", {
    method: "DELETE",
  });
}
