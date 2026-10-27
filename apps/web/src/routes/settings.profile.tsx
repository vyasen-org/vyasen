import { createFileRoute } from "@tanstack/react-router";

import { ProfileSettings } from "@/components/settings/profile-settings";

export const Route = createFileRoute("/settings/profile")({
  component: ProfileSettings,
});
