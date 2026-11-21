import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpenCheck,
  CalendarDays,
  Check,
  ClipboardCheck,
  ClipboardList,
  Info,
  LayoutDashboard,
  Plus,
  Star,
} from "lucide-react";

import {
  ChoiceCards,
  SettingToggle,
  SettingsSection,
} from "@/components/settings/settings-controls";
import { useTheme } from "@/providers/theme-provider";

const iconColors = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Blue", value: "#1683e3" },
  { label: "Green", value: "#28b463" },
  { label: "Rose", value: "#d52c66" },
  { label: "Amber", value: "#f39200" },
  { label: "Cyan", value: "#18b2c4" },
] as const;

const iconStyleChoices = [
  {
    id: "multicolor",
    label: "Multicolor",
    detail: "Each icon is displayed with its own color",
    recommended: true,
  },
  {
    id: "monochrome",
    label: "Monochrome",
    detail: "All icons use a single color",
    recommended: false,
  },
] as const;

const iconColorModes = [
  {
    id: "theme",
    label: "Follow color theme",
    detail: "Icons match the current theme color",
  },
  {
    id: "adaptive",
    label: "Adaptive neutral",
    detail: "Icons adapt to light or dark mode",
  },
  {
    id: "custom",
    label: "Custom",
    detail: "Choose any color you prefer",
  },
] as const;

const previewItems = [
  { label: "Home", icon: LayoutDashboard },
  { label: "Classes", icon: BookOpenCheck },
  { label: "Exams", icon: ClipboardCheck },
  { label: "Assignments", icon: ClipboardList },
  { label: "Timetable", icon: CalendarDays },
] as const;

const positionChoices = [
  { id: "left", label: "Left", detail: "Vertical navigation", icon: ArrowLeft },
  {
    id: "right",
    label: "Right",
    detail: "Vertical navigation",
    icon: ArrowRight,
  },
  { id: "top", label: "Top", detail: "Horizontal navigation", icon: ArrowUp },
  {
    id: "bottom",
    label: "Bottom",
    detail: "Horizontal navigation",
    icon: ArrowDown,
  },
] as const;

export function SidebarSettings() {
  const { preferences, updatePreference } = useTheme();
  const [customColorDraft, setCustomColorDraft] = useState(
    preferences.sidebarIconColor,
  );
  const [isSmallScreen, setIsSmallScreen] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 639px)").matches,
  );
  const [canResizeSidebar, setCanResizeSidebar] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches,
  );

  useEffect(() => {
    const smallScreenQuery = window.matchMedia("(max-width: 639px)");
    const resizeSidebarQuery = window.matchMedia("(min-width: 768px)");
    const updateScreenSizes = () => {
      setIsSmallScreen(smallScreenQuery.matches);
      setCanResizeSidebar(resizeSidebarQuery.matches);
    };
    updateScreenSizes();
    smallScreenQuery.addEventListener("change", updateScreenSizes);
    resizeSidebarQuery.addEventListener("change", updateScreenSizes);
    return () => {
      smallScreenQuery.removeEventListener("change", updateScreenSizes);
      resizeSidebarQuery.removeEventListener("change", updateScreenSizes);
    };
  }, []);

  useEffect(() => {
    setCustomColorDraft(preferences.sidebarIconColor);
  }, [preferences.sidebarIconColor]);

  const horizontal = isSmallScreen
    ? true
    : preferences.sidebarPosition === "top" ||
      preferences.sidebarPosition === "bottom";
  const activePosition = isSmallScreen
    ? preferences.sidebarMobilePosition
    : preferences.sidebarPosition;

  return (
    <div className="space-y-5 py-6">
      <SettingsSection
        title="Sidebar"
        description="Choose how navigation appears and fits your workspace."
      >
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <h3 className="text-sm font-semibold">Sidebar position</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {isSmallScreen
              ? "Choose the top or bottom position for small screens."
              : "Choose where the school navigation appears on larger screens."}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {positionChoices.map(({ id, label, detail, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={activePosition === id}
                onClick={() => {
                  if (isSmallScreen) {
                    if (id === "top" || id === "bottom") {
                      updatePreference("sidebarMobilePosition", id);
                    }
                    return;
                  }
                  if (preferences.sidebarPosition !== id) {
                    const currentIsHorizontal =
                      preferences.sidebarPosition === "top" ||
                      preferences.sidebarPosition === "bottom";
                    const nextIsHorizontal = id === "top" || id === "bottom";
                    updatePreference("sidebarPosition", id);
                    if (currentIsHorizontal !== nextIsHorizontal) {
                      updatePreference(
                        "sidebarBehavior",
                        nextIsHorizontal ? "hide-on-scroll" : "pinned",
                      );
                    }
                  }
                }}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  activePosition === id
                    ? "border-accent bg-accent/10"
                    : "border-border bg-background hover:border-accent/50"
                } ${
                  isSmallScreen && (id === "left" || id === "right")
                    ? "hidden"
                    : ""
                }`}
              >
                <span className="grid size-9 place-items-center rounded-xl bg-surface text-accent">
                  <Icon size={17} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {detail}
                  </span>
                </span>
                {activePosition === id && (
                  <Check size={16} className="text-accent" />
                )}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Sidebar behavior</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {horizontal
              ? "Pin top or bottom navigation, or hide it while scrolling."
              : "Pin the sidebar in place, or reveal it only when needed."}
          </p>
          <div className="mt-3">
            {isSmallScreen ? (
              <ChoiceCards
                value={preferences.sidebarMobileBehavior}
                onChange={(value) =>
                  updatePreference("sidebarMobileBehavior", value)
                }
                choices={[
                  {
                    id: "pinned",
                    label: "Pinned",
                    detail: "Keep navigation in view",
                  },
                  {
                    id: "hide-on-scroll",
                    label: "Hide while scrolling",
                    detail: "Reveal when scrolling up",
                  },
                ]}
              />
            ) : horizontal ? (
              <ChoiceCards
                value={preferences.sidebarBehavior}
                onChange={(value) =>
                  updatePreference("sidebarBehavior", value)
                }
                choices={[
                  {
                    id: "pinned",
                    label: "Pinned",
                    detail: "Keep navigation in view",
                  },
                  {
                    id: "hide-on-scroll",
                    label: "Hide while scrolling",
                    detail: "Reveal when scrolling up",
                  },
                ]}
              />
            ) : (
              <ChoiceCards
                value={preferences.sidebarBehavior}
                onChange={(value) =>
                  updatePreference("sidebarBehavior", value)
                }
                choices={[
                  {
                    id: "pinned",
                    label: "Pinned",
                    detail: "Keep the sidebar in place",
                  },
                  {
                    id: "hidden",
                    label: "Hidden",
                    detail: "Reveal from the screen edge",
                  },
                ]}
              />
            )}
          </div>
          {!horizontal && canResizeSidebar && (
            <p className="mt-3 text-xs text-muted-foreground">
              On medium screens and larger, drag a pinned sidebar edge—even
              when collapsed—to resize. The maximum is 350 pixels up to 1024px
              wide and 500 pixels on wider screens. Widths below 150 pixels
              collapse automatically. Hidden sidebars use a fixed responsive
              width so navigation labels remain visible.
            </p>
          )}
          <div className="mt-5 border-t border-border pt-4">
            <SettingToggle
              label="Floating navigation button"
              description="Show a draggable circular button over the content when navigation is hidden or auto-hidden."
              checked={preferences.floatingSidebarButtonEnabled}
              onChange={(value) =>
                updatePreference("floatingSidebarButtonEnabled", value)
              }
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Icon style"
        description="Choose how icons are displayed in the sidebar."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {iconStyleChoices.map((choice) => {
            const selected = preferences.sidebarIconStyle === choice.id;
            const multicolor = choice.id === "multicolor";
            return (
              <button
                key={choice.id}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  updatePreference("sidebarIconStyle", choice.id)
                }
                className={`flex min-w-0 flex-col gap-4 rounded-xl border p-4 text-left transition-colors sm:flex-row sm:items-center sm:p-5 ${
                  selected
                    ? "border-accent bg-accent/10"
                    : "border-border bg-background hover:border-accent/50"
                }`}
              >
                <span className="w-full shrink-0 rounded-xl bg-slate-950/70 p-3 sm:w-[42%] sm:max-w-[260px]">
                  {previewItems.map(({ label, icon: Icon }, index) => {
                    const previewColor = multicolor
                      ? [
                          "#1683e3",
                          "#a855f7",
                          "#22c55e",
                          "#f39200",
                          "#ef476f",
                        ][index]
                      : preferences.sidebarIconColorMode === "custom"
                        ? preferences.sidebarIconColor
                        : undefined;
                    const previewIconClass = multicolor
                      ? ""
                      : preferences.sidebarIconColorMode === "theme"
                        ? "text-accent"
                        : preferences.sidebarIconColorMode === "adaptive"
                          ? "text-slate-400"
                          : "";
                    return (
                      <span
                        key={label}
                        className="flex h-8 items-center gap-3 px-1 text-xs font-medium text-slate-100"
                      >
                        <Icon
                          className={`size-5 shrink-0 ${previewIconClass}`}
                          style={
                            previewColor
                              ? { color: previewColor }
                              : undefined
                          }
                        />
                        <span className="truncate">{label}</span>
                      </span>
                    );
                  })}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                        selected
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-muted-foreground"
                      }`}
                    >
                      {selected && <Check size={13} />}
                    </span>
                    <span className="text-base font-semibold">
                      {choice.label}
                    </span>
                  </span>
                  <span className="mt-2 block text-sm text-muted-foreground">
                    {choice.detail}
                  </span>
                  {choice.recommended && (
                    <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-medium text-emerald-400">
                      <Star size={12} fill="currentColor" />
                      Recommended
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Icon color"
        description="Choose the color used for sidebar icons when Monochrome style is selected."
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Pick a color behavior for monochrome sidebar icons.
          </p>
          <span className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground sm:flex">
            <Info size={15} />
            This setting won&apos;t affect Multicolor style
          </span>
        </div>
        <span className="flex items-center gap-2 text-xs text-muted-foreground sm:hidden">
          <Info size={15} />
          This setting won&apos;t affect Multicolor style
        </span>
        <div className="grid gap-3 lg:grid-cols-3">
          {iconColorModes.map((mode) => {
            const selected = preferences.sidebarIconColorMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  updatePreference("sidebarIconColorMode", mode.id)
                }
                className={`flex min-h-24 items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  selected
                    ? "border-accent bg-accent/10"
                    : "border-border bg-background hover:border-accent/50"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border ${
                    selected
                      ? "border-accent bg-accent text-accent-foreground ring-4 ring-accent/15"
                      : "border-muted-foreground"
                  }`}
                >
                  {selected && <Check size={16} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {mode.label}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {mode.detail}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {preferences.sidebarIconColorMode === "custom" && (
          <div className="grid gap-5 border-t border-border pt-4 md:grid-cols-[1fr_1fr]">
            <div>
              <h3 className="text-sm font-semibold">Quick colors</h3>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {iconColors.map(({ label, value }) => {
                  const selected = preferences.sidebarIconColor === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${label} icon color`}
                      aria-pressed={selected}
                      onClick={() => {
                        setCustomColorDraft(value);
                        updatePreference("sidebarIconColorMode", "custom");
                        updatePreference("sidebarIconColor", value);
                      }}
                      className={`grid size-11 shrink-0 place-items-center rounded-2xl transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        selected ? "bg-accent/10" : "bg-background"
                      }`}
                    >
                      <span
                        className={`grid size-8 place-items-center rounded-full border-2 ${
                          selected
                            ? "border-accent ring-2 ring-accent ring-offset-2 ring-offset-surface"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: value }}
                      >
                        {selected && (
                          <Check size={15} className="text-white" />
                        )}
                      </span>
                    </button>
                  );
                })}
                <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-background px-3 text-xs font-medium hover:bg-background/80">
                  <Plus size={17} />
                  Custom
                  <input
                    type="color"
                    aria-label="Choose custom icon color"
                    value={preferences.sidebarIconColor}
                    onChange={(event) => {
                      const color = event.currentTarget.value;
                      setCustomColorDraft(color);
                      updatePreference("sidebarIconColorMode", "custom");
                      updatePreference("sidebarIconColor", color);
                    }}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Color value</h3>
              <label className="mt-4 flex h-14 items-center gap-3 rounded-xl border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-accent">
                <input
                  type="text"
                  aria-label="Icon color hex value"
                  value={customColorDraft}
                  maxLength={7}
                  spellCheck={false}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setCustomColorDraft(value);
                    if (/^#[\da-f]{6}$/i.test(value)) {
                      updatePreference("sidebarIconColorMode", "custom");
                      updatePreference("sidebarIconColor", value);
                    }
                  }}
                  onBlur={() => setCustomColorDraft(preferences.sidebarIconColor)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                />
                <input
                  type="color"
                  aria-label="Choose icon color"
                  value={preferences.sidebarIconColor}
                  onChange={(event) => {
                    const color = event.currentTarget.value;
                    setCustomColorDraft(color);
                    updatePreference("sidebarIconColorMode", "custom");
                    updatePreference("sidebarIconColor", color);
                  }}
                  className="size-8 cursor-pointer border-0 bg-transparent p-0"
                />
              </label>
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title="Menu behavior"
        description="Tune how navigation works in your school workspace."
      >
        <SettingToggle
          label="Show keyboard shortcuts"
          description="Display shortcut hints when hovering or focusing menu items."
          checked={preferences.showKeyboardShortcuts}
          onChange={(value) => updatePreference("showKeyboardShortcuts", value)}
        />
        <SettingToggle
          label="Elevate sidebar menus"
          description="Add subtle edge light and depth to sidebar menu items."
          checked={preferences.elevatedSidebarMenus}
          onChange={(value) => updatePreference("elevatedSidebarMenus", value)}
        />
      </SettingsSection>
    </div>
  );
}
