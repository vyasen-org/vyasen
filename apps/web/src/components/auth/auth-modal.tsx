import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Mail,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { ApiError, apiBaseUrl } from "@/lib/api-client";
import {
  authKeys,
  getAuthSession,
  useGoogleNonceQuery,
  useGoogleSignInMutation,
  useRequestEmailCodeMutation,
  useVerifyEmailCodeMutation,
} from "@/services/auth";

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

const codeSchema = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/, "Enter the 6-digit code to continue."),
});

type EmailValues = z.infer<typeof emailSchema>;
type CodeValues = z.infer<typeof codeSchema>;
type AuthStep = "email" | "verification";
const emailCodeResendCooldownSeconds = 2 * 60;

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.9c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.38 37.13 46.98 31.3 46.98 24.55Z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
    </svg>
  );
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  return `${name.slice(0, 2)}${"•".repeat(Math.max(4, name.length - 2))}@${domain}`;
}

function readableError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) {
    return "Unable to reach the sign-in service. Check your connection and try again.";
  }
  return "Sign-in could not be completed. Please try again.";
}

export function AuthModal({
  onOpenChange,
  notice,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  notice?: string;
  open: boolean;
}) {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [googleOAuthPending, setGoogleOAuthPending] = useState(false);
  const googlePopupRef = useRef<Window | null>(null);
  const googlePopupPollRef = useRef<number | null>(null);
  const queryClient = useQueryClient();
  const emailCodeMutation = useRequestEmailCodeMutation();
  const verifyEmailMutation = useVerifyEmailCodeMutation();
  const googleSignInMutation = useGoogleSignInMutation();
  const googleNonceQuery = useGoogleNonceQuery(open && step === "email");
  const googleReady = Boolean(
    googleNonceQuery.data?.clientId && googleNonceQuery.data.nonce,
  );

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    if (!open || step !== "verification" || resendSeconds <= 0) return;
    const timeoutId = window.setTimeout(
      () => setResendSeconds((remaining) => Math.max(0, remaining - 1)),
      1000,
    );
    return () => window.clearTimeout(timeoutId);
  }, [open, resendSeconds, step]);

  useEffect(
    () => () => {
      if (googlePopupPollRef.current !== null) {
        window.clearInterval(googlePopupPollRef.current);
      }
      googlePopupRef.current?.close();
    },
    [],
  );

  useEffect(() => {
    if (open && notice) setFeedback(notice);
  }, [notice, open]);

  useEffect(() => {
    if (googleNonceQuery.isError && open) {
      setFeedback(readableError(googleNonceQuery.error));
    }
  }, [googleNonceQuery.error, googleNonceQuery.isError, open]);

  useEffect(() => {
    const clientId = googleNonceQuery.data?.clientId;
    const nonce = googleNonceQuery.data?.nonce;
    if (!open || step !== "email" || !clientId || !nonce) return;

    let active = true;
    const initializeGoogle = () => {
      if (!active || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        nonce,
        callback: (response) => {
          if (!active) return;
          googleSignInMutation.mutate(
            { credential: response.credential },
            {
              onSuccess: () => handleOpenChange(false),
              onError: (error) => {
                setFeedback(readableError(error));
                void queryClient.invalidateQueries({
                  queryKey: authKeys.googleNonce(),
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
      script.addEventListener("error", handleGoogleScriptError);
    }

    function handleGoogleScriptError() {
      if (active) {
        setFeedback("Google sign-in could not be loaded. Please try again.");
      }
    }

    return () => {
      active = false;
      script?.removeEventListener("load", initializeGoogle);
      script?.removeEventListener("error", handleGoogleScriptError);
    };
  }, [
    googleNonceQuery.data,
    googleSignInMutation.mutate,
    open,
    queryClient,
    step,
  ]);

  function resetFlow() {
    if (googlePopupPollRef.current !== null) {
      window.clearInterval(googlePopupPollRef.current);
      googlePopupPollRef.current = null;
    }
    googlePopupRef.current?.close();
    googlePopupRef.current = null;
    setGoogleOAuthPending(false);
    setStep("email");
    setEmail("");
    setChallengeId("");
    setCode("");
    setResendSeconds(0);
    setFeedback("");
    emailForm.reset();
    codeForm.reset();
    emailCodeMutation.reset();
    verifyEmailMutation.reset();
    googleSignInMutation.reset();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetFlow();
    onOpenChange(nextOpen);
  }

  function submitEmail(values: EmailValues) {
    setFeedback("");
    emailCodeMutation.mutate(
      { email: values.email },
      {
        onSuccess: (response) => {
          setEmail(values.email.trim().toLowerCase());
          setChallengeId(response.challengeId);
          setCode("");
          codeForm.reset();
          setFeedback(response.message);
          setResendSeconds(emailCodeResendCooldownSeconds);
          setStep("verification");
        },
        onError: (error) => {
          setFeedback(readableError(error));
          setResendSeconds(
            error instanceof ApiError ? error.retryAfterSeconds ?? 0 : 0,
          );
        },
      },
    );
  }

  function resendCode() {
    if (resendSeconds > 0 || emailCodeMutation.isPending) return;
    setFeedback("");
    emailCodeMutation.mutate(
      { email },
      {
        onSuccess: (response) => {
          setChallengeId(response.challengeId);
          setCode("");
          codeForm.reset();
          setFeedback(response.message);
          setResendSeconds(emailCodeResendCooldownSeconds);
        },
        onError: (error) => {
          setFeedback(readableError(error));
          setResendSeconds(
            error instanceof ApiError ? error.retryAfterSeconds ?? 0 : 0,
          );
        },
      },
    );
  }

  function submitCode(values: CodeValues) {
    if (!challengeId) {
      setFeedback("Request a new sign-in code before verifying.");
      return;
    }
    setFeedback("");
    verifyEmailMutation.mutate(
      { challengeId, email, code: values.code },
      {
        onSuccess: () => handleOpenChange(false),
        onError: (error) => setFeedback(readableError(error)),
      },
    );
  }

  function continueWithGoogle() {
    if (!googleReady) return;
    const returnTo =
      window.location.pathname + window.location.search + window.location.hash;
    const parameters = new URLSearchParams({ returnTo });
    const popup = window.open(
      `${apiBaseUrl}/api/v1/auth/google/authorize?${parameters.toString()}`,
      "school-sms-google-sign-in",
      "popup,width=500,height=640",
    );
    if (!popup) {
      setFeedback(
        "Your browser blocked the Google sign-in window. Allow pop-ups and try again.",
      );
      return;
    }

    popup.opener = null;
    googlePopupRef.current = popup;
    setGoogleOAuthPending(true);
    setFeedback("");

    const startedAt = Date.now();
    let checkingSession = false;
    googlePopupPollRef.current = window.setInterval(async () => {
      if (popup.closed) {
        if (googlePopupPollRef.current !== null) {
          window.clearInterval(googlePopupPollRef.current);
          googlePopupPollRef.current = null;
        }
        googlePopupRef.current = null;
        setGoogleOAuthPending(false);
        setFeedback("Google sign-in was closed before it finished.");
        return;
      }

      if (Date.now() - startedAt > 5 * 60 * 1000) {
        if (googlePopupPollRef.current !== null) {
          window.clearInterval(googlePopupPollRef.current);
          googlePopupPollRef.current = null;
        }
        googlePopupRef.current = null;
        popup.close();
        setGoogleOAuthPending(false);
        setFeedback("Google sign-in timed out. Please try again.");
        return;
      }

      if (checkingSession) return;

      let popupOrigin: string;
      try {
        popupOrigin = popup.location.origin;
      } catch {
        return;
      }
      if (popupOrigin !== window.location.origin) return;

      const popupSearch = new URLSearchParams(popup.location.search);
      const authResult = popupSearch.get("auth");
      if (authResult === "google-failed" || authResult === "link-required") {
        if (googlePopupPollRef.current !== null) {
          window.clearInterval(googlePopupPollRef.current);
          googlePopupPollRef.current = null;
        }
        googlePopupRef.current = null;
        popup.close();
        setGoogleOAuthPending(false);
        setFeedback(
          authResult === "link-required"
            ? "This Google account matches an existing sign-in. Sign in with that method before linking Google."
            : "Google sign-in could not be completed. Please try again.",
        );
        return;
      }

      checkingSession = true;
      try {
        const session = await getAuthSession();
        if (googlePopupRef.current !== popup) return;
        if (session?.user) {
          if (googlePopupPollRef.current !== null) {
            window.clearInterval(googlePopupPollRef.current);
            googlePopupPollRef.current = null;
          }
          googlePopupRef.current = null;
          popup.close();
          queryClient.setQueryData(authKeys.session(), session);
          handleOpenChange(false);
        }
      } catch (error) {
        if (googlePopupRef.current !== popup) return;
        if (googlePopupPollRef.current !== null) {
          window.clearInterval(googlePopupPollRef.current);
          googlePopupPollRef.current = null;
        }
        googlePopupRef.current = null;
        popup.close();
        setGoogleOAuthPending(false);
        setFeedback(readableError(error));
      } finally {
        checkingSession = false;
      }
    }, 500);
  }

  const busy =
    emailCodeMutation.isPending ||
    verifyEmailMutation.isPending ||
    googleSignInMutation.isPending;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-[3px]" />
        <Dialog.Content
          aria-modal="true"
          aria-describedby="auth-dialog-description"
          className="fixed left-1/2 top-1/2 z-[101] max-h-[calc(100dvh-2rem)] w-[min(100%-2rem,410px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl shadow-black/40 outline-none sm:p-8"
        >
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close sign-in dialog"
              className="absolute right-4 top-4 grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X size={18} />
            </button>
          </Dialog.Close>

          {step === "email" ? (
            <>
              <div className="mb-6 flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <GraduationCap size={20} />
                </span>
                <span className="text-lg font-bold tracking-tight">
                  School SMS
                </span>
              </div>
              <Dialog.Title className="text-xl font-semibold tracking-tight">
                Welcome to School SMS
              </Dialog.Title>
              <Dialog.Description
                id="auth-dialog-description"
                className="mt-1 text-sm text-muted-foreground"
              >
                Log in or sign up to continue
              </Dialog.Description>

              <div className="mt-6 space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full border-border bg-surface font-medium hover:bg-muted"
                  disabled={!googleReady || busy || googleOAuthPending}
                  aria-busy={googleSignInMutation.isPending || googleOAuthPending}
                  onClick={continueWithGoogle}
                >
                  <GoogleMark />
                  {googleOAuthPending
                    ? "Waiting for Google..."
                    : "Continue with Google"}
                </Button>
                {googleNonceQuery.data?.clientId === null && (
                  <p className="text-center text-xs text-muted-foreground">
                    Google sign-in is not configured.
                  </p>
                )}

                <div className="flex items-center gap-3" aria-hidden="true">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <form
                  className="space-y-3"
                  noValidate
                  onSubmit={emailForm.handleSubmit(submitEmail)}
                >
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-medium"
                  >
                    Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-invalid={Boolean(emailForm.formState.errors.email)}
                    aria-describedby={
                      emailForm.formState.errors.email
                        ? "auth-email-error"
                        : undefined
                    }
                    {...emailForm.register("email")}
                    className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 aria-[invalid=true]:border-rose-500"
                  />
                  {emailForm.formState.errors.email && (
                    <p
                      id="auth-email-error"
                      role="alert"
                      className="text-xs text-rose-400"
                    >
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="h-11 w-full"
                    disabled={busy}
                    aria-busy={emailCodeMutation.isPending}
                  >
                    {emailCodeMutation.isPending
                      ? "Sending code..."
                      : "Continue with email"}
                    {!emailCodeMutation.isPending && <ArrowRight size={16} />}
                  </Button>
                </form>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                We&apos;ll email you a one-time code. No password needed.
              </p>
            </>
          ) : (
            <>
              <div className="mb-5 grid grid-cols-3 items-center">
                <button
                  type="button"
                  aria-label="Back to email entry"
                  onClick={() => {
                    setFeedback("");
                    codeForm.reset();
                    setStep("email");
                  }}
                  className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <ArrowLeft size={19} />
                </button>
                <span className="grid size-12 place-items-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
                  <Mail size={22} />
                </span>
                <span aria-hidden="true" />
              </div>
              <div className="text-center">
                <Dialog.Title className="text-2xl font-semibold tracking-tight">
                  Check your email
                </Dialog.Title>
                <Dialog.Description
                  id="auth-dialog-description"
                  className="mt-2 text-sm leading-6 text-muted-foreground"
                >
                  Enter the 6-digit code for
                  <span className="block font-medium text-foreground">
                    {maskEmail(email)}
                  </span>
                </Dialog.Description>
              </div>

              <form
                className="mt-6"
                noValidate
                onSubmit={codeForm.handleSubmit(submitCode)}
              >
                <div className="relative mx-auto grid max-w-85 grid-cols-6 gap-2 rounded-xl focus-within:ring-1 focus-within:ring-accent p-2">
                  {Array.from({ length: 6 }, (_, index) => (
                    <span
                      key={index}
                      aria-hidden="true"
                      className={`grid aspect-[0.82] place-items-center rounded-xl border bg-surface text-xl font-semibold transition-colors ${
                        code[index]
                          ? "border-accent text-foreground"
                          : "border-border text-transparent"
                      }`}
                    >
                      {code[index] ?? "0"}
                    </span>
                  ))}
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-label="6-digit verification code"
                    aria-invalid={Boolean(codeForm.formState.errors.code)}
                    maxLength={6}
                    value={code}
                    onChange={(event) => {
                      const digits = event.currentTarget.value
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      setCode(digits);
                      codeForm.setValue("code", digits, {
                        shouldValidate: codeForm.formState.isSubmitted,
                      });
                    }}
                    onPaste={(event) => {
                      const digits = event.clipboardData
                        .getData("text")
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      if (!digits) return;
                      event.preventDefault();
                      setCode(digits);
                      codeForm.setValue("code", digits, {
                        shouldValidate: codeForm.formState.isSubmitted,
                      });
                    }}
                    className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0 focus-visible:outline-none"
                  />
                </div>
                {codeForm.formState.errors.code && (
                  <p role="alert" className="mt-2 text-center text-xs text-rose-400">
                    {codeForm.formState.errors.code.message}
                  </p>
                )}
                <Button
                  type="submit"
                  className="mt-5 h-12 w-full"
                  disabled={busy}
                  aria-busy={verifyEmailMutation.isPending}
                >
                  {verifyEmailMutation.isPending ? "Verifying..." : "Verify"}
                  {!verifyEmailMutation.isPending && <ArrowRight size={17} />}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                {resendSeconds > 0 ? (
                  <>
                    Didn&apos;t get it? Resend in{" "}
                    <span className="tabular-nums">
                      {Math.floor(resendSeconds / 60)}:
                      {String(resendSeconds % 60).padStart(2, "0")}
                    </span>
                  </>
                ) : (
                  <>
                    Didn&apos;t get it?{" "}
                    <button
                      type="button"
                      onClick={resendCode}
                      disabled={emailCodeMutation.isPending}
                      className="font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {emailCodeMutation.isPending ? "Sending..." : "Resend code"}
                    </button>
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => {
                  setFeedback("");
                  codeForm.reset();
                  setStep("email");
                }}
                className="mt-3 flex w-full items-center justify-center gap-1 text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Use a different email
              </button>
            </>
          )}

          {feedback && (
            <p
              role="status"
              aria-live="polite"
              className="mt-4 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-center text-xs leading-5 text-muted-foreground"
            >
              {feedback}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
