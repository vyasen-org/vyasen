import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { identityKeys } from "./identity.service";

import {
  authKeys,
  getAuthSession,
  getAuthSessions,
  getGoogleNonce,
} from "./auth.service";

export function useAuthSessionQuery() {
  const client = useQueryClient();
  const session = useQuery({
    queryKey: authKeys.session(),
    queryFn: ({ signal }) => getAuthSession(signal),
    retry: false,
  });
  useEffect(() => {
    if (session.isSuccess && !session.data) {
      void client.cancelQueries({ queryKey: identityKeys.all }).then(() => {
        client.removeQueries({ queryKey: identityKeys.all });
      });
    }
  }, [client, session.isSuccess, session.data]);
  return session;
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
