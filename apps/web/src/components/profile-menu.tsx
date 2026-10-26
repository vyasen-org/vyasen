import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  LogIn,
  LogOut,
  Settings2,
  UserRound,
} from "lucide-react";
import type { SchoolRole } from "@school-sms/contracts";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiError } from "@/lib/api-client";
import { useAuthSessionQuery, useLogoutMutation } from "@/services/auth";

const roleLabels: Record<SchoolRole, string> = {
  admin: "Administrator",
  principal: "Principal",
  teacher: "Teacher",
  student: "Student",
  hr: "HR",
};

interface ProfileMenuProps {
  role: SchoolRole;
  onRoleChange: (role: SchoolRole) => void;
  onOpenChange?: (open: boolean) => void;
  compact?: boolean;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfileMenu({
  role,
  onRoleChange,
  onOpenChange,
  compact = false,
}: ProfileMenuProps) {
  const [logoutError, setLogoutError] = useState("");
  const sessionQuery = useAuthSessionQuery();
  const logoutMutation = useLogoutMutation();
  const user = sessionQuery.data?.user;
  const name = user?.name?.trim() || user?.email.split("@")[0] || "Account";

  if (sessionQuery.isPending) {
    return (
      <div
        aria-label="Loading profile"
        className={`h-11 animate-pulse rounded-xl bg-surface/45 ${
          compact ? "w-11 shrink-0" : "w-full"
        }`}
      />
    );
  }

  if (!user) {
    return (
      <Link
        to="/"
        search={{ login: 1 }}
        aria-label="Log in"
        className={`flex min-w-0 items-center gap-2 rounded-xl bg-surface/45 p-1.5 text-left text-muted-foreground outline-none transition-colors hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent ${
          compact ? "size-11 shrink-0 justify-center p-0" : "w-full"
        }`}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
          <LogIn size={18} />
        </span>
        <span className={compact ? "sr-only" : "min-w-0 flex-1"}>
          <span className="block text-sm font-semibold">Login</span>
          <span className="block truncate text-xs text-muted-foreground">
            Sign in for more
          </span>
        </span>
        {!compact && <ChevronDown size={15} className="rotate-[-90deg]" />}
      </Link>
    );
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        setLogoutError("");
        onOpenChange?.(open);
      }}
    >
      <DropdownMenuTrigger
        className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-xl bg-surface/45 p-1.5 text-left outline-none transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent ${
          compact ? "size-11 shrink-0 justify-center p-0" : "w-full"
        }`}
        aria-label="Open user profile menu"
      >
        <Avatar className={compact ? "size-10" : "size-9"}>
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback>
            {getInitials(name) || <UserRound size={17} />}
          </AvatarFallback>
        </Avatar>
        <span className={compact ? "sr-only" : "min-w-0 flex-1"}>
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </span>
        {!compact && (
          <ChevronDown size={15} className="shrink-0 text-muted-foreground" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="z-[70] max-h-[calc(100dvh-1rem)] w-[min(18rem,calc(100vw-1rem))] overflow-y-auto p-2"
      >
        <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2">
          <Avatar className="size-10">
            {user.image && <AvatarImage src={user.image} alt="" />}
            <AvatarFallback>
              {getInitials(name) || <UserRound size={17} />}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {name}
            </span>
            <span className="mt-0.5 block truncate font-normal">
              {user.email}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Preview role</DropdownMenuLabel>
        {(Object.keys(roleLabels) as SchoolRole[]).map((nextRole) => (
          <DropdownMenuItem
            key={nextRole}
            onSelect={() => onRoleChange(nextRole)}
          >
            <UserRound size={15} />
            <span className="flex-1">{roleLabels[nextRole]}</span>
            {role === nextRole && <Check size={15} className="text-accent" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <Settings2 size={15} />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={logoutMutation.isPending}
          onSelect={(event) => {
            event.preventDefault();
            setLogoutError("");
            logoutMutation.mutate(undefined, {
              onError: (error) => {
                setLogoutError(
                  error instanceof ApiError
                    ? error.message
                    : "Unable to sign out. Please try again.",
                );
              },
            });
          }}
          className="text-rose-400 data-[highlighted]:text-rose-300"
        >
          <LogOut size={15} />
          {logoutMutation.isPending ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
        {logoutError && (
          <p role="alert" className="px-3 pb-2 pt-1 text-xs text-rose-400">
            {logoutError}
          </p>
        )}
        <p className="px-3 pb-2 pt-1 text-[11px] leading-relaxed text-muted-foreground">
          Role options are previews only. Access controls are not active yet.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
