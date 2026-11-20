import {
  useAuthSessionsQuery,
  useRevokeSessionMutation,
  useLogoutAllSessionsMutation,
} from "@/services/auth";
import { Button } from "@/components/ui/button";

export function SessionSettings() {
  const sessions = useAuthSessionsQuery();
  const revoke = useRevokeSessionMutation();
  const logoutAll = useLogoutAllSessionsMutation();
  return (
    <section className="theme-surface-panel space-y-4 rounded-2xl p-5 sm:p-6">
      <h2 className="text-sm font-semibold">Signed-in devices</h2>
      {sessions.isPending && <p role="status">Loading sessions...</p>}
      {sessions.error && <p role="alert">{sessions.error.message}</p>}
      {sessions.data?.sessions.map((session) => (
        <div
          key={session.id}
          className="flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          <span>
            {session.deviceName ?? "Browser"}{" "}
            {session.current ? "(this device)" : ""}
            <span className="block text-xs text-muted-foreground">
              Last active {new Date(session.lastActiveAt).toLocaleString()}
            </span>
          </span>
          <Button
            variant="outline"
            disabled={revoke.isPending}
            onClick={() => {
              if (window.confirm("Sign out this device?"))
                revoke.mutate(session.id);
            }}
          >
            Revoke session
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        disabled={logoutAll.isPending}
        onClick={() => {
          if (window.confirm("Sign out all devices?")) logoutAll.mutate();
        }}
      >
        Sign out all devices
      </Button>
      {(revoke.error || logoutAll.error) && (
        <p role="alert">{(revoke.error || logoutAll.error)?.message}</p>
      )}
    </section>
  );
}
