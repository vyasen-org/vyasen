import { Outlet, useRouterState } from "@tanstack/react-router";

import { SettingsNavigation } from "@/components/settings/settings-navigation";

export function SettingsLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const activeTabId = pathname.split("/").pop() + "-settings-tab";
  // const activeTabId = pathname.endsWith("/sidebar")
  //   ? "sidebar-settings-tab"
  //   : "appearance-settings-tab";

  return (
    <div className="mx-auto relative">
      <header>
        {/* <p className="text-sm text-muted-foreground">Workspace preferences</p> */}
        <h1 className="text-4xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your personal preferences and interface experience.
        </p>
      </header>
      <SettingsNavigation />
      <section
        id="settings-content"
        role="tabpanel"
        aria-labelledby={activeTabId}
        tabIndex={0}
      >
        <Outlet />
      </section>
    </div>
  );
}
