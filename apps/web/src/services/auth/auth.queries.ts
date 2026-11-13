import { useQuery } from "@tanstack/react-query";

import {
  authKeys,
  getAuthSession,
  getAuthSessions,
  getGoogleNonce,
} from "./auth.service";

export function useAuthSessionQuery() {
  return useQuery({
    queryKey: authKeys.session(),
    queryFn: ({ signal }) => getAuthSession(signal),
    retry: false,
  });
}

export function useAuthSessionsQuery(enabled = true) {
  return useQuery({
    queryKey: authKeys.sessions(),
    queryFn: ({ signal }) => getAuthSessions(signal),
    enabled,
  });
}

export function useGoogleNonceQuery(enabled: boolean) {
  return useQuery({
    queryKey: authKeys.googleNonce(),
    queryFn: ({ signal }) => getGoogleNonce(signal),
    enabled,
    staleTime: 4 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
