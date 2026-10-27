import { createFileRoute } from "@tanstack/react-router";

import { SidebarSettings } from "@/components/settings/sidebar-settings";

export const Route = createFileRoute("/settings/sidebar")({
  component: SidebarSettings,
});
