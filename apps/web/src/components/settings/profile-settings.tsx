import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  Camera,
  Github,
  Globe,
  Linkedin,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthSessionQuery } from "@/services/auth";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function DisabledField({
  icon: Icon,
  label,
  placeholder,
  value,
}: {
  icon?: typeof UserRound;
  label: string;
  placeholder?: string;
  value?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xs font-medium">{label}</span>
      <span className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-muted-foreground">
        {Icon && <Icon size={15} className="shrink-0" />}
        <input
          aria-label={label}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
          disabled
          value={value ?? ""}
          placeholder={placeholder ?? "Available in a future update"}
          readOnly
        />
      </span>
    </label>
  );
}

export function ProfileSettings() {
  const sessionQuery = useAuthSessionQuery();
  const navigate = useNavigate();
  const user = sessionQuery.data?.user;
  const displayName = user?.name?.trim() || user?.email.split("@")[0] || "User";
  const userInitials = initials(displayName) || "U";

  useEffect(() => {
    if (sessionQuery.isSuccess && !user) {
      void navigate({ to: "/settings/appearance", replace: true });
    }
  }, [navigate, sessionQuery.isSuccess, user]);

  if (sessionQuery.isPending) {
    return (
      <div
        aria-label="Loading profile"
        className="grid min-h-80 animate-pulse gap-4 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.5fr)]"
      >
        <div className="rounded-2xl bg-surface" />
        <div className="rounded-2xl bg-surface" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-5 py-6">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.5fr)]">
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="mb-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">Your public profile</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400">
                <ShieldCheck size={12} />
                Profile preview
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              These account details are associated with your sign-in.
            </p>
          </div>

          <div className="flex min-h-[26rem] flex-col items-center rounded-2xl border border-border bg-gradient-to-b from-accent/15 via-background to-background px-5 py-9 text-center">
            <div className="relative">
              <Avatar className="size-32 border-2 border-accent/40 bg-muted text-4xl">
                {user.image && <AvatarImage src={user.image} alt="" />}
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <span
                aria-label="Profile photo editing unavailable"
                className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-xl border border-accent/40 bg-background text-accent"
              >
                <Camera size={15} />
              </span>
            </div>
            <button
              type="button"
              disabled
              className="mt-5 inline-flex h-8 items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 text-xs font-medium text-accent opacity-70"
            >
              <Sparkles size={13} />
              Generate avatar
            </button>
            <h3 className="mt-4 max-w-full truncate text-lg font-semibold">
              {displayName}
            </h3>
            <div className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-xs text-muted-foreground">
              <Mail size={13} />
              <span className="truncate">{user.email}</span>
              {user.emailVerifiedAt && (
                <BadgeCheck
                  size={14}
                  aria-label="Verified email"
                  className="shrink-0 text-emerald-400"
                />
              )}
            </div>
            <p className="mt-6 max-w-xs text-xs leading-5 text-muted-foreground">
              Profile photo and public profile editing will be available in a
              future update.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="border-b border-border pb-5">
            <h2 className="text-sm font-semibold">Personal details</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Your current account identity and future profile options.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="mb-2 block text-xs font-medium">
                  Display name
                </span>
                <input
                  aria-label="Display name"
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  readOnly
                  value={user.name ?? ""}
                  placeholder="No display name set"
                />
              </label>
              <DisabledField
                label="Username"
                placeholder="Username is not set"
                value=""
              />
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-medium">Bio</span>
              <textarea
                aria-label="Bio"
                className="min-h-20 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground/70"
                disabled
                placeholder="Bio editing is not available yet"
                maxLength={160}
              />
              <span className="mt-1 block text-right text-[10px] text-muted-foreground">
                0 / 160
              </span>
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-2 block text-xs font-medium">
                  Email address
                </span>
                <div className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-3">
                  <Mail size={15} className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {user.email}
                  </span>
                  {user.emailVerifiedAt ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-emerald-400">
                      <BadgeCheck size={12} />
                      Verified
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      Not verified
                    </span>
                  )}
                </div>
              </div>
              <DisabledField label="Mobile number" placeholder="Not added" />
            </div>
          </div>

          <div className="pt-5">
            <h2 className="text-sm font-semibold">
              Social &amp; professional links
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Add professional profiles and portfolio links when profile editing
              is available.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DisabledField icon={Linkedin} label="LinkedIn URL" />
              <DisabledField icon={Github} label="GitHub URL" />
              <DisabledField icon={Globe} label="Portfolio" />
            </div>
            <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
              Profile editing and public visibility controls are not available
              yet.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
