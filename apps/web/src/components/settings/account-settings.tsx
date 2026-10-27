import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ApiError } from "@/lib/api-client";
import { useAuthSessionQuery, useLogoutMutation } from "@/services/auth";
import { CreditCard, LogOut, ShieldAlert, Trash2 } from "lucide-react";

function AccountSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof CreditCard;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="theme-surface-panel rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Icon aria-hidden="true" size={18} className="mt-0.5 text-accent" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          <div className="mt-4 rounded-xl border border-border bg-background/60 p-4">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export function AccountSettings() {
  const sessionQuery = useAuthSessionQuery();
  const logoutMutation = useLogoutMutation();
  const navigate = useNavigate();
  const user = sessionQuery.data?.user;
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    if (sessionQuery.isSuccess && !user) {
      void navigate({ to: "/settings/appearance", replace: true });
    }
  }, [navigate, sessionQuery.isSuccess, user]);

  if (sessionQuery.isPending) {
    return (
      <div
        aria-label="Loading account settings"
        className="mt-5 min-h-72 animate-pulse rounded-2xl bg-surface"
      />
    );
  }

  if (sessionQuery.isError) {
    return (
      <div
        role="alert"
        className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
      >
        <p>Unable to load your account settings.</p>
        <button
          type="button"
          className="mt-3 font-medium text-accent underline underline-offset-4"
          onClick={() => void sessionQuery.refetch()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!user) return null;

  const accountName = user.name?.trim() || user.email;

  return (
    <div className="space-y-4 py-5">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review your account access and sign-in session.
        </p>
      </header>

      <AccountSection
        icon={CreditCard}
        title="Membership"
        description="Account and workspace access"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Signed-in account
            </p>
            <p className="mt-1 truncate text-sm font-medium">{accountName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Workspace membership and order history are not available here yet.
            </p>
          </div>
          <button
            type="button"
            disabled
            aria-describedby="account-orders-note"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-3 text-xs font-medium text-accent-foreground opacity-60"
          >
            <CreditCard size={14} />
            View orders
          </button>
        </div>
        <p id="account-orders-note" className="sr-only">
          Order history is not available yet.
        </p>
      </AccountSection>

      <AccountSection
        icon={Trash2}
        title="Deactivate account"
        description="Account deactivation is not currently available."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Need to deactivate?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Contact your school administrator for help with account access.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground opacity-60"
          >
            <Trash2 size={14} />
            Deactivate account
          </button>
        </div>
      </AccountSection>

      <AccountSection
        icon={LogOut}
        title="Session"
        description="Sign out of your active session on this device."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You can sign in again at any time.
            </p>
          </div>
          <button
            type="button"
            disabled={logoutMutation.isPending}
            onClick={() => {
              setLogoutError("");
              logoutMutation.mutate(undefined, {
                onSuccess: () =>
                  void navigate({
                    to: "/settings/appearance",
                    replace: true,
                  }),
                onError: (error) => {
                  setLogoutError(
                    error instanceof ApiError
                      ? error.message
                      : "Unable to sign out. Please try again.",
                  );
                },
              });
            }}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-3 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            <LogOut size={14} />
            {logoutMutation.isPending ? "Signing out..." : "Sign out"}
          </button>
        </div>
        {logoutError && (
          <p role="alert" className="mt-3 text-xs text-destructive">
            <ShieldAlert aria-hidden="true" className="mr-1 inline" size={14} />
            {logoutError}
          </p>
        )}
      </AccountSection>
    </div>
  );
}
