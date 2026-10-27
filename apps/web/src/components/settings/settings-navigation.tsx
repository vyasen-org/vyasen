import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Cog, Palette, PanelLeft, UserRound } from "lucide-react";
import {
  handleRovingTabKeyDown,
  scrollKeyboardFocusedTabIntoView,
} from "@/accessibility/roving-tab-focus";
import { useAuthSessionQuery } from "@/services/auth";

const publicSettingsLinks = [
  { label: "Appearance", to: "/settings/appearance", icon: Palette },
  { label: "Sidebar", to: "/settings/sidebar", icon: PanelLeft },
] as const;
const profileSettingsLink = {
  label: "Profile",
  to: "/settings/profile",
  icon: UserRound,
} as const;
const notificationsSettingsLink = {
  label: "Notifications",
  to: "/settings/notifications",
  icon: Bell,
} as const;
const accountSettingsLink = {
  label: "Account",
  to: "/settings/account",
  icon: Cog,
} as const;

export function SettingsNavigation() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const sessionQuery = useAuthSessionQuery();
  const settingsLinks = sessionQuery.data?.user
    ? [
        ...publicSettingsLinks,
        notificationsSettingsLink,
        profileSettingsLink,
        accountSettingsLink,
      ]
    : publicSettingsLinks;

  return (
    <nav
      role="tablist"
      aria-label="Settings pages"
      className="settings-page-tablist sticky top-0 z-10 mt-7 flex gap-1 overflow-x-auto border-b bg-background"
    >
      {settingsLinks.map(({ label, to, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            id={`${label.toLowerCase()}-settings-tab`}
            data-settings-tab={label.toLowerCase()}
            role="tab"
            aria-selected={active}
            aria-controls="settings-content"
            tabIndex={active ? 0 : -1}
            onFocus={scrollKeyboardFocusedTabIntoView}
            onKeyDown={handleRovingTabKeyDown}
            className={`settings-page-tab flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium ${
              active ? "settings-nav-active" : ""
            }`}
          >
            <Icon aria-hidden="true" size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
