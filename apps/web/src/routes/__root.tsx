import { lazy, Suspense, useEffect, useRef } from "react";
import {
  createRootRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { z } from "zod";

import {
  useAuthSessionQuery,
  useGoogleNonceQuery,
  useGoogleSignInMutation,
} from "@/services/auth";
import {
  isGoogleOAuthPopup,
  publishGoogleOAuthPopupResult,
} from "@/services/auth/google-oauth-popup";

const AuthModal = lazy(() =>
  import("@/components/auth/auth-modal").then((module) => ({
    default: module.AuthModal,
  })),
);

export const Route = createRootRoute({
  validateSearch: z
    .object({
      login: z.literal(1).optional(),
    })
    .passthrough(),
  component: RootLayout,
});

function RootLayout() {
  const searchString = useRouterState({
    select: (state) => state.location.searchStr,
  });
  const currentLocation = useRouterState({
    select: (state) => ({
      hash: state.location.hash,
      pathname: state.location.pathname,
    }),
  });
  const searchParams = new URLSearchParams(searchString);
  const navigate = Route.useNavigate();
  const authSessionQuery = useAuthSessionQuery();
  const authenticated = Boolean(authSessionQuery.data?.user);
  const loginRequested = searchParams.get("login") === "1";
  const loginOpen = loginRequested && !authenticated;
  const autoOneTapAttempted = useRef(false);
  const autoOneTapEnabled =
    authSessionQuery.isSuccess &&
    !authenticated &&
    !loginRequested &&
    !autoOneTapAttempted.current;
  const googleNonceQuery = useGoogleNonceQuery(autoOneTapEnabled);
  const googleSignInMutation = useGoogleSignInMutation();
  const authResult = searchParams.get("auth");
  const notice =
    authResult === "link-required"
      ? "This Google account matches an existing sign-in. Sign in with that method before linking Google."
      : authResult === "google-failed"
        ? "Google sign-in could not be completed. Please try again."
        : undefined;

  useEffect(() => {
    if (!authenticated || (!loginRequested && !authResult)) return;
    void navigate({
      to: currentLocation.pathname,
      search: (previous) => ({
        ...previous,
        login: undefined,
        auth: undefined,
      }),
      hash: currentLocation.hash,
      replace: true,
    });
  }, [
    authResult,
    authenticated,
    currentLocation.hash,
    currentLocation.pathname,
    loginRequested,
    navigate,
  ]);

  useEffect(() => {
    const popupId = isGoogleOAuthPopup();
    if (!popupId) return;

    if (authResult === "complete" && authenticated) {
      void publishGoogleOAuthPopupResult(popupId, "complete").then(
        (acknowledged) => {
          if (acknowledged) window.close();
        },
      );
    } else if (
      authResult === "google-failed" ||
      authResult === "link-required"
    ) {
      void publishGoogleOAuthPopupResult(popupId, authResult).then(
        (acknowledged) => {
          if (acknowledged) window.close();
        },
      );
    }
  }, [authResult, authenticated]);

  useEffect(() => {
    if (loginRequested) {
      autoOneTapAttempted.current = true;
      return;
    }

    const clientId = googleNonceQuery.data?.clientId;
    const nonce = googleNonceQuery.data?.nonce;
    if (
      !authSessionQuery.isSuccess ||
      authenticated ||
      !clientId ||
      !nonce ||
      autoOneTapAttempted.current
    ) {
      return;
    }

    let active = true;
    const initializeGoogle = () => {
      if (!active || !window.google) return;
      autoOneTapAttempted.current = true;
      window.google.accounts.id.initialize({
        client_id: clientId,
        nonce,
        callback: (response) => {
          if (!active) return;
          googleSignInMutation.mutate(
            { credential: response.credential },
            {
              onError: () => {
                void navigate({
                  to: currentLocation.pathname,
                  search: (previous) => ({
                    ...previous,
                    login: 1,
                    auth: "google-failed",
                  }),
                  hash: currentLocation.hash,
                  replace: true,
                });
              },
            },
          );
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.prompt();
    };

    const scriptId = "google-identity-services";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (window.google) {
      initializeGoogle();
    } else {
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.append(script);
      }
      script.addEventListener("load", initializeGoogle);
    }

    return () => {
      active = false;
      script?.removeEventListener("load", initializeGoogle);
    };
  }, [
    authSessionQuery.isSuccess,
    authenticated,
    currentLocation.hash,
    currentLocation.pathname,
    googleNonceQuery.data,
    googleSignInMutation.mutate,
    loginRequested,
    navigate,
  ]);

  return (
    <>
      <Outlet />
      <Suspense fallback={null}>
        <AuthModal
          open={loginOpen}
          notice={notice}
          onOpenChange={(open) => {
            if (!open) {
              void navigate({
                to: currentLocation.pathname,
                search: (previous) => ({
                  ...previous,
                  login: undefined,
                  auth: undefined,
                }),
                hash: currentLocation.hash,
                replace: true,
              });
            }
          }}
        />
      </Suspense>
    </>
  );
}
