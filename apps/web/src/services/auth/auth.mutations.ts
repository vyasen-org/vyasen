import { useMutation, useQueryClient } from "@tanstack/react-query";

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

export function useVerifyEmailCodeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyEmailCode,
    onSuccess: async (session) => {
      queryClient.setQueryData(authKeys.session(), session);
      await queryClient.invalidateQueries({ queryKey: authKeys.sessions() });
    },
  });
}

export function useGoogleSignInMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signInWithGoogleCredential,
    onSuccess: async (session) => {
      queryClient.setQueryData(authKeys.session(), session);
      await queryClient.invalidateQueries({ queryKey: authKeys.sessions() });
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
      queryClient.setQueryData(authKeys.session(), null);
      await queryClient.removeQueries({ queryKey: authKeys.sessions() });
      await queryClient.removeQueries({ queryKey: authKeys.googleNonce() });
    },
  });
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.all }),
  });
}

export function useLogoutAllSessionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutAllSessions,
    onSuccess: async () => {
      queryClient.setQueryData(authKeys.session(), null);
      await queryClient.removeQueries({ queryKey: authKeys.sessions() });
      await queryClient.removeQueries({ queryKey: authKeys.googleNonce() });
    },
  });
}
