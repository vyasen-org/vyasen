import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AuthSessionResponse } from "@vyasen/contracts";
import { identityKeys } from "./identity.service";

import {
  authKeys,
  linkGoogleIdentity,
  logout,
  logoutAllSessions,
  requestEmailCode,
  revokeSession,
  signInWithGoogleCredential,
  verifyEmailCode,
} from "./auth.service";

export function useRequestEmailCodeMutation() {
  return useMutation({ mutationFn: requestEmailCode });
}

export async function adoptAuthSession(
  queryClient: ReturnType<typeof useQueryClient>,
  session: AuthSessionResponse,
) {
  await queryClient.cancelQueries({ queryKey: identityKeys.all });
  await queryClient.cancelQueries({ queryKey: authKeys.session() });
  queryClient.removeQueries({ queryKey: identityKeys.all });
  queryClient.setQueryData(authKeys.session(), session);
  await queryClient.invalidateQueries({ queryKey: authKeys.sessions() });
}

export async function clearPrivateSession(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.cancelQueries();
  queryClient.clear();
  queryClient.setQueryData(authKeys.session(), null);
}

export function useVerifyEmailCodeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyEmailCode,
    onSuccess: async (session) => {
      await adoptAuthSession(queryClient, session);
    },
  });
}

export function useGoogleSignInMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signInWithGoogleCredential,
    onSuccess: async (session) => {
      await adoptAuthSession(queryClient, session);
    },
  });
}

export function useGoogleLinkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: linkGoogleIdentity,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: authKeys.session() }),
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await clearPrivateSession(queryClient);
    },
  });
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
      if (!queryClient.getQueryData(authKeys.session()))
        await clearPrivateSession(queryClient);
    },
  });
}

export function useLogoutAllSessionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutAllSessions,
    onSuccess: async () => {
      await clearPrivateSession(queryClient);
    },
  });
}
