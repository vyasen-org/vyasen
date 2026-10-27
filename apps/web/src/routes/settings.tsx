import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { SettingsLayout } from "@/components/settings/settings-layout";

export const Route = createFileRoute("/settings")({
  component: SettingsRouteLayout,
});

function SettingsRouteLayout() {
  return (
    <AppShell>
      <SettingsLayout />
    </AppShell>
  );
}
