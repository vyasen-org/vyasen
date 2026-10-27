import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Mail,
  Megaphone,
  ShieldCheck,
} from "lucide-react";

import { SettingsSection } from "@/components/settings/settings-controls";
import { Switch } from "@/components/ui/switch";
import { useAuthSessionQuery } from "@/services/auth";

const notificationPreferenceDefaults = {
  inApp: true,
  email: true,
  attendance: true,
  assignments: true,
  grades: true,
  announcements: true,
  fees: true,
};

type NotificationPreferences = typeof notificationPreferenceDefaults;
type NotificationPreference = keyof NotificationPreferences;

const notificationPreferenceKeys = Object.keys(
  notificationPreferenceDefaults,
) as NotificationPreference[];
const notificationStorageKey = "school-sms-notification-preferences";

function readNotificationPreferences(userId: string): NotificationPreferences {
  try {
    const storedValue = window.localStorage.getItem(
      `${notificationStorageKey}:${userId}`,
    );
    if (!storedValue) return { ...notificationPreferenceDefaults };

    const storedPreferences: unknown = JSON.parse(storedValue);
    if (
      typeof storedPreferences !== "object" ||
      storedPreferences === null ||
      Array.isArray(storedPreferences)
    ) {
      console.warn(
        "Saved notification preferences were invalid; defaults were restored.",
      );
      return { ...notificationPreferenceDefaults };
    }

    const saved = storedPreferences as Record<string, unknown>;
    const preferences = { ...notificationPreferenceDefaults };
    let invalidValue = false;

    for (const key of notificationPreferenceKeys) {
      const value = saved[key];
      if (typeof value === "boolean") {
        preferences[key] = value;
      } else if (value !== undefined) {
        invalidValue = true;
      }
    }

    if (invalidValue) {
      console.warn(
        "Some saved notification preferences were invalid; defaults were restored for those options.",
      );
    }
    return preferences;
  } catch (error) {
    console.error("Could not read saved notification preferences.", error);
    return { ...notificationPreferenceDefaults };
  }
}

function NotificationToggle({
  checked,
  description,
  icon: Icon,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  icon: typeof Bell;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="theme-surface-panel-strong flex items-center gap-3 rounded-xl p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
        <Icon aria-hidden="true" size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        aria-label={label}
      />
    </div>
  );
}

export function NotificationsSettings() {
  const sessionQuery = useAuthSessionQuery();
  const navigate = useNavigate();
  const user = sessionQuery.data?.user;
  const userId = user?.id;
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    () =>
      userId
        ? readNotificationPreferences(userId)
        : { ...notificationPreferenceDefaults },
  );
  const [saveStatus, setSaveStatus] = useState<
    "saved" | "saving" | "error"
  >("saved");

  useEffect(() => {
    if (sessionQuery.isSuccess && !user) {
      void navigate({ to: "/settings/appearance", replace: true });
    }
  }, [navigate, sessionQuery.isSuccess, user]);

  useEffect(() => {
    if (userId) setPreferences(readNotificationPreferences(userId));
  }, [userId]);

  function updatePreference(key: NotificationPreference, value: boolean) {
    if (!userId) return;

    const updatedPreferences = { ...preferences, [key]: value };
    setPreferences(updatedPreferences);
    setSaveStatus("saving");
    try {
      window.localStorage.setItem(
        `${notificationStorageKey}:${userId}`,
        JSON.stringify(updatedPreferences),
      );
      setSaveStatus("saved");
    } catch (error) {
      console.error("Could not save notification preferences.", error);
      setSaveStatus("error");
    }
  }

  if (sessionQuery.isPending) {
    return (
      <div
        aria-label="Loading notification settings"
        className="min-h-80 animate-pulse rounded-2xl bg-surface"
      />
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-5 py-6">
      <section className="theme-surface-panel rounded-2xl p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <Bell aria-hidden="true" size={19} />
            </span>
            <div>
              <h2 className="text-base font-semibold">Notifications</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose which school updates you would like to receive.
              </p>
            </div>
          </div>
          <div
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {saveStatus === "error" ? (
              <>
                <ShieldCheck aria-hidden="true" className="text-rose-400" size={14} />
                Could not save on this device
              </>
            ) : (
              <>
                <Check aria-hidden="true" className="text-emerald-400" size={14} />
                {saveStatus === "saving" ? "Saving..." : "Saved on this device"}
              </>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <SettingsSection
            title="Delivery"
            description="Choose where optional updates should reach you."
          >
            <NotificationToggle
              checked={preferences.inApp}
              description="Show activity and reminders in the notification center."
              icon={Bell}
              label="In-app notifications"
              onChange={(value) => updatePreference("inApp", value)}
            />
            <NotificationToggle
              checked={preferences.email}
              description="Receive optional updates at your account email address."
              icon={Mail}
              label="Email notifications"
              onChange={(value) => updatePreference("email", value)}
            />
          </SettingsSection>

          <SettingsSection
            title="School activity"
            description="Fine-tune updates about your attendance, learning, and school."
          >
            <NotificationToggle
              checked={preferences.attendance}
              description="Absences, late arrivals, and attendance record updates."
              icon={ClipboardCheck}
              label="Attendance updates"
              onChange={(value) => updatePreference("attendance", value)}
            />
            <NotificationToggle
              checked={preferences.assignments}
              description="New assignments, approaching deadlines, and exam schedules."
              icon={CalendarDays}
              label="Assignments & exams"
              onChange={(value) => updatePreference("assignments", value)}
            />
            <NotificationToggle
              checked={preferences.grades}
              description="New grades, report cards, and teacher feedback."
              icon={Check}
              label="Grades & feedback"
              onChange={(value) => updatePreference("grades", value)}
            />
            <NotificationToggle
              checked={preferences.announcements}
              description="School announcements, events, and important notices."
              icon={Megaphone}
              label="School announcements"
              onChange={(value) => updatePreference("announcements", value)}
            />
            <NotificationToggle
              checked={preferences.fees}
              description="Fee reminders, payment confirmations, and receipts."
              icon={CircleDollarSign}
              label="Fees & payments"
              onChange={(value) => updatePreference("fees", value)}
            />
          </SettingsSection>
        </div>
      </section>
      <p className="text-xs text-muted-foreground">
        These preferences are stored in this browser and do not yet control
        notification delivery.
      </p>
    </div>
  );
}
