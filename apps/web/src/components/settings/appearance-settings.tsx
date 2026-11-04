import { useEffect } from "react";
import { Check, Moon, Smartphone, Sun } from "lucide-react";

import { colorThemeIds, type UiPreferences } from "@vyasen/contracts";
import {
  ChoiceCards,
  RangeControl,
  SelectControl,
  SettingToggle,
  SettingsSection,
} from "@/components/settings/settings-controls";
import { useTheme } from "@/providers/theme-provider";

const themeDetails: Record<
  UiPreferences["colorTheme"],
  {
    label: string;
    swatch: string;
    detail: string;
    previewBackground: string;
    previewSurface: string;
    previewPanel: string;
  }
> = {
  onyx: {
    label: "Veo Onyx",
    swatch: "#e5e7eb",
    detail: "Charcoal & soft white",
    previewBackground: "#202020",
    previewSurface: "#090909",
    previewPanel: "#52525b",
  },
  steel: {
    label: "Steel Blue",
    swatch: "#7f9cb5",
    detail: "Cool steel & muted blue",
    previewBackground: "#252c33",
    previewSurface: "#161b20",
    previewPanel: "#4d6478",
  },
  ocean: {
    label: "Ocean Blue",
    swatch: "#7193ff",
    detail: "Default · clear & confident",
    previewBackground: "#202b43",
    previewSurface: "#111a2d",
    previewPanel: "#405681",
  },
  midnight: {
    label: "Midnight Azure",
    swatch: "#4166d4",
    detail: "Deep blue & luminous",
    previewBackground: "#10274a",
    previewSurface: "#07152e",
    previewPanel: "#234780",
  },
  brainwave: {
    label: "Brainwave Slate",
    swatch: "#1996e8",
    detail: "Cool graphite & electric blue",
    previewBackground: "#1b303e",
    previewSurface: "#10212c",
    previewPanel: "#285b7d",
  },
  arctic: {
    label: "Arctic Frost",
    swatch: "#93c5fd",
    detail: "Icy blue & cool steel",
    previewBackground: "#1f2c3d",
    previewSurface: "#101a27",
    previewPanel: "#3d6b9e",
  },
  violet: {
    label: "Ultra Violet",
    swatch: "#a78bfa",
    detail: "Indigo depth & soft violet",
    previewBackground: "#2b2340",
    previewSurface: "#191327",
    previewPanel: "#5b45a0",
  },
  lilac: {
    label: "Velvet Lilac",
    swatch: "#c18cff",
    detail: "Plum depth & soft lavender",
    previewBackground: "#33263c",
    previewSurface: "#201926",
    previewPanel: "#664a7c",
  },
  barbie: {
    label: "Barbie Pink",
    swatch: "#ff62b0",
    detail: "Bright & iconic",
    previewBackground: "#351126",
    previewSurface: "#210817",
    previewPanel: "#963568",
  },
  magenta: {
    label: "Neon Magenta",
    swatch: "#e935c1",
    detail: "Bold & electric",
    previewBackground: "#361430",
    previewSurface: "#210c1e",
    previewPanel: "#8a2c76",
  },
  rose: {
    label: "Studio Rose",
    swatch: "#fb6f92",
    detail: "Expressive & warm",
    previewBackground: "#332329",
    previewSurface: "#21171c",
    previewPanel: "#754554",
  },
  signal: {
    label: "Signal Red",
    swatch: "#f04462",
    detail: "Crisp & high-impact",
    previewBackground: "#3b111b",
    previewSurface: "#260b12",
    previewPanel: "#792337",
  },
  live: {
    label: "Live Red",
    swatch: "#ff234c",
    detail: "Near-black & vivid red",
    previewBackground: "#310b11",
    previewSurface: "#1b080b",
    previewPanel: "#8d1b31",
  },
  coral: {
    label: "Coral Reef",
    swatch: "#ff8a75",
    detail: "Warm coral & deep charcoal",
    previewBackground: "#382420",
    previewSurface: "#241612",
    previewPanel: "#8a4a3c",
  },
  copper: {
    label: "Copper Slate",
    swatch: "#d49376",
    detail: "Mineral gray & copper",
    previewBackground: "#322a25",
    previewSurface: "#1f1a17",
    previewPanel: "#71594d",
  },
  ember: {
    label: "Ember Orange",
    swatch: "#ff8a34",
    detail: "Warm & focused",
    previewBackground: "#3b291b",
    previewSurface: "#23180f",
    previewPanel: "#87512e",
  },
  sunlit: {
    label: "Sunlit Yellow",
    swatch: "#f6c945",
    detail: "Bright & optimistic",
    previewBackground: "#39321b",
    previewSurface: "#242010",
    previewPanel: "#837139",
  },
  sand: {
    label: "Desert Sand",
    swatch: "#e5c07b",
    detail: "Warm neutral & sand",
    previewBackground: "#37301f",
    previewSurface: "#231e12",
    previewPanel: "#8a7440",
  },
  noir: {
    label: "Noir Gold",
    swatch: "#d4b16a",
    detail: "Ink black & antique gold",
    previewBackground: "#26231c",
    previewSurface: "#151310",
    previewPanel: "#6b5a33",
  },
  lime: {
    label: "Electric Lime",
    swatch: "#a3e635",
    detail: "Graphite & vivid chartreuse",
    previewBackground: "#273217",
    previewSurface: "#17200e",
    previewPanel: "#587532",
  },
  grove: {
    label: "Grove Green",
    swatch: "#4ac28a",
    detail: "Fresh & grounded",
    previewBackground: "#20372a",
    previewSurface: "#122419",
    previewPanel: "#347c59",
  },
  aurora: {
    label: "Aurora Teal",
    swatch: "#36d8c5",
    detail: "Cool & luminous",
    previewBackground: "#143331",
    previewSurface: "#09221f",
    previewPanel: "#1c766d",
  },
  graphite: {
    label: "Graphite Studio",
    swatch: "#8b68ff",
    detail: "Graphite & violet",
    previewBackground: "#292337",
    previewSurface: "#191521",
    previewPanel: "#59487d",
  },
  mint: {
    label: "Mint Breeze",
    swatch: "#5eead4",
    detail: "Crisp mint & deep slate",
    previewBackground: "#1c332f",
    previewSurface: "#0e1f1c",
    previewPanel: "#2f7d6e",
  },
};

function ThemePreview({
  theme,
}: {
  theme: (typeof themeDetails)[UiPreferences["colorTheme"]];
}) {
  return (
    <span
      aria-hidden="true"
      className="flex h-[90px] gap-2 rounded-xl border border-border/50 p-2"
      style={{ backgroundColor: theme.previewBackground }}
    >
      <span
        className="w-1/5 shrink-0 space-y-1 rounded-lg p-2"
        style={{ backgroundColor: theme.previewSurface }}
      >
        <span className="block h-1 rounded-full" style={{ backgroundColor: theme.swatch }} />
        <span className="block h-1 rounded-full opacity-70" style={{ backgroundColor: theme.swatch }} />
        <span className="block h-1 rounded-full opacity-50" style={{ backgroundColor: theme.swatch }} />
      </span>
      <span
        className="min-w-0 flex-1 space-y-2 rounded-lg p-2"
        style={{ backgroundColor: theme.previewSurface }}
      >
        <span className="block h-1 rounded-full bg-white/50" />
        <span className="block h-1 w-2/3 rounded-full bg-white/30" />
        <span className="grid grid-cols-2 gap-1">
          <span className="h-7 rounded" style={{ backgroundColor: theme.previewPanel }} />
          <span className="h-7 rounded opacity-80" style={{ backgroundColor: theme.previewPanel }} />
        </span>
      </span>
    </span>
  );
}

const displayModes = [
  {
    id: "system",
    label: "Use device setting",
    detail: "Match your system preference",
    icon: Smartphone,
  },
  {
    id: "dark",
    label: "Dark",
    detail: "Use a dark color scheme",
    icon: Moon,
  },
  {
    id: "light",
    label: "Light",
    detail: "Use a light color scheme",
    icon: Sun,
  },
] as const;

function DisplayModePreview({ mode }: { mode: "light" | "dark" | "system" }) {
  const isDark = mode === "dark";

  function WorkspacePreview({ dark }: { dark: boolean }) {
    return (
      <div
        className={`flex min-w-0 flex-1 gap-2 rounded-lg p-2 ${
          dark ? "bg-slate-950" : "bg-slate-100"
        }`}
      >
        <div
          className={`w-1/5 shrink-0 space-y-1 rounded-md p-2 ${
            dark ? "bg-slate-900" : "bg-white"
          }`}
        >
          <span className="block h-1 rounded-full bg-accent/80" />
          <span className="block h-1 rounded-full bg-accent/50" />
          <span className="block h-1 rounded-full bg-accent/50" />
        </div>
        <div
          className={`min-w-0 flex-1 space-y-2 rounded-md p-2 ${
            dark ? "bg-slate-900" : "bg-white"
          }`}
        >
          <span
            className={`block h-1 rounded-full ${
              dark ? "bg-slate-500" : "bg-slate-400"
            }`}
          />
          <span
            className={`block h-1 w-2/3 rounded-full ${
              dark ? "bg-slate-700" : "bg-slate-300"
            }`}
          />
          <span className="grid grid-cols-2 gap-1">
            <span className="h-7 rounded bg-accent/40" />
            <span className="h-7 rounded bg-accent/50" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="flex h-24 gap-2 rounded-xl border border-border/70 bg-background/40 p-2"
    >
      {mode === "system" ? (
        <>
          <WorkspacePreview dark={false} />
          <WorkspacePreview dark />
        </>
      ) : (
        <WorkspacePreview dark={isDark} />
      )}
    </div>
  );
}

export function AppearanceSettings() {
  const { preferences, updatePreference } = useTheme();

  useEffect(() => {
    const updateFullScreenPreference = () =>
      updatePreference("fullScreen", Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", updateFullScreenPreference);
    return () =>
      document.removeEventListener(
        "fullscreenchange",
        updateFullScreenPreference,
      );
  }, [updatePreference]);

  function toggleThemePool(theme: UiPreferences["colorTheme"]) {
    const selected = preferences.themeRotationPool.includes(theme);
    const nextPool = selected
      ? preferences.themeRotationPool.filter((item) => item !== theme)
      : [...preferences.themeRotationPool, theme];
    if (nextPool.length > 0) updatePreference("themeRotationPool", nextPool);
  }

  async function toggleFullScreen(enabled: boolean) {
    try {
      if (enabled && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else if (!enabled && document.fullscreenElement) {
        await document.exitFullscreen();
      }
      updatePreference("fullScreen", enabled);
    } catch (error) {
      console.warn("Could not change full-screen mode.", error);
    }
  }

  return (
    <div className="space-y-5 py-6">
      <SettingsSection
        title="Display mode"
        description="Choose a light or dark workspace, or follow your device."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {displayModes.map(({ id, label, detail, icon: Icon }) => {
            const selected = preferences.colorMode === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => updatePreference("colorMode", id)}
                className={`rounded-xl border p-3 text-left transition-colors hover:border-accent/50 ${
                  selected
                    ? "border-accent bg-accent/10"
                    : "border-border bg-background"
                }`}
              >
                <DisplayModePreview mode={id} />
                <span className="mt-3 flex items-center gap-2">
                  <span
                    className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                      selected
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-muted-foreground text-transparent"
                    }`}
                  >
                    {selected && <Check aria-hidden="true" size={13} />}
                  </span>
                  <Icon
                    aria-hidden="true"
                    size={18}
                    className="shrink-0 text-muted-foreground"
                  />
                  <span className="text-sm font-medium">{label}</span>
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {detail}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Color theme"
        description="Pick the color palette used by navigation, tabs, and controls."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {colorThemeIds.map((themeId) => {
            const theme = themeDetails[themeId];
            const selected = preferences.colorTheme === themeId;
            return (
              <button
                key={themeId}
                type="button"
                aria-pressed={selected}
                onClick={() => updatePreference("colorTheme", themeId)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  selected
                    ? "border-accent bg-accent/10"
                    : "border-border bg-background hover:border-accent/50"
                }`}
              >
                <ThemePreview theme={theme} />
                <span className="mt-2 flex items-center gap-2">
                  <span
                    className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                      selected
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-muted-foreground"
                    }`}
                  >
                    {selected && <Check aria-hidden="true" size={13} />}
                  </span>
                  <span className="min-w-0 truncate text-sm font-semibold">
                    {theme.label}
                  </span>
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {theme.detail}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Theme rotation"
        description="Choose a theme at random when you open a new app session."
      >
        <SettingToggle
          label="Random theme on app open"
          description="Start each new app session with a theme from your selected pool."
          checked={preferences.themeRotationEnabled}
          onChange={(value) => updatePreference("themeRotationEnabled", value)}
        />
        {preferences.themeRotationEnabled && (
          <fieldset className="grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-medium">
              Themes in rotation
            </legend>
            {colorThemeIds.map((themeId) => (
              <label
                key={themeId}
                className="flex items-center gap-3 rounded-xl bg-background px-3 py-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={preferences.themeRotationPool.includes(themeId)}
                  onChange={() => toggleThemePool(themeId)}
                  disabled={
                    preferences.themeRotationPool.length === 1 &&
                    preferences.themeRotationPool.includes(themeId)
                  }
                  className="size-4 accent-accent"
                />
                <span
                  className="size-4 rounded-full"
                  style={{ backgroundColor: themeDetails[themeId].swatch }}
                />
                {themeDetails[themeId].label}
              </label>
            ))}
          </fieldset>
        )}
      </SettingsSection>

      <SettingsSection
        title="Reading mode"
        description="Shift the display tone and tune a paper-like grain."
      >
        <div className="rounded-xl border border-dashed border-border bg-background p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Live preview</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Preview the reading mode without applying it across the app.
              </p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Preview only
            </span>
          </div>
          <div className="mt-4">
            <SettingToggle
              label="Preview reading mode"
              checked={preferences.readingModePreview}
              onChange={(value) =>
                updatePreference("readingModePreview", value)
              }
            />
          </div>
        </div>
        <SettingToggle
          label="Reading mode"
          description="Apply your selected temperature, texture, and colors across the application."
          checked={preferences.readingModeEnabled}
          onChange={(value) => updatePreference("readingModeEnabled", value)}
        />
        <div className="grid gap-5 border-t border-border pt-4 sm:grid-cols-2">
          <RangeControl
            label="Color temperature"
            min={0}
            max={100}
            value={preferences.readingTemperature}
            onChange={(value) => updatePreference("readingTemperature", value)}
          />
          <RangeControl
            label="Texture"
            min={0}
            max={100}
            suffix="%"
            value={preferences.readingTexture}
            onChange={(value) => updatePreference("readingTexture", value)}
          />
          <RangeControl
            label="Grain size"
            min={1}
            max={10}
            value={preferences.readingGrainSize}
            onChange={(value) => updatePreference("readingGrainSize", value)}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Scrollbars"
        description="Choose when scrollbars appear and how they look in content areas."
      >
        <SettingToggle
          label="Show scrollbars"
          description="Display content scrollbar controls alongside wheel, touch, and keyboard scrolling."
          checked={preferences.scrollbarVisibility === "visible"}
          onChange={(value) =>
            updatePreference(
              "scrollbarVisibility",
              value ? "visible" : "hidden",
            )
          }
        />
        <ChoiceCards
          value={preferences.scrollbarStyle}
          onChange={(value) => updatePreference("scrollbarStyle", value)}
          choices={[
            { id: "classic", label: "Classic", detail: "System scrollbar" },
            {
              id: "minimal",
              label: "Minimal",
              detail: "Slim content scrollbar",
            },
            { id: "floating", label: "Floating", detail: "Lightweight track" },
          ]}
        />
      </SettingsSection>

      <SettingsSection
        title="Elastic scroller"
        description="Customize the floating drag control for long lists."
      >
        <SettingToggle
          label="Enable elastic scroller"
          description="The drag-control preferences are saved for the scrolling shell."
          checked={preferences.elasticScrollerEnabled}
          onChange={(value) =>
            updatePreference("elasticScrollerEnabled", value)
          }
        />
        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <ChoiceCards
            value={preferences.elasticScrollerDepth}
            onChange={(value) =>
              updatePreference("elasticScrollerDepth", value)
            }
            choices={[
              { id: "flat", label: "Flat", detail: "Original flat control" },
              {
                id: "raised",
                label: "Raised",
                detail: "Raised control & socket",
              },
            ]}
          />
          <SelectControl
            label="Direction icon"
            value={preferences.elasticScrollerDirectionIcon}
            onChange={(value) =>
              updatePreference("elasticScrollerDirectionIcon", value)
            }
            options={[
              { value: "classic", label: "2D · Classic arrow" },
              { value: "arrow", label: "Arrow" },
              { value: "chevron", label: "Chevron" },
            ]}
          />
          <SelectControl
            label="Lock side"
            value={preferences.elasticScrollerLockSide}
            onChange={(value) =>
              updatePreference("elasticScrollerLockSide", value)
            }
            options={[
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
          />
          <SelectControl
            label="Unlock side"
            value={preferences.elasticScrollerUnlockSide}
            onChange={(value) =>
              updatePreference("elasticScrollerUnlockSide", value)
            }
            options={[
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
          />
        </div>
        <SettingToggle
          label="Animate direction changes"
          description="Rotate the icon when direction changes. Turn off to switch instantly."
          checked={preferences.elasticScrollerAnimateDirection}
          onChange={(value) =>
            updatePreference("elasticScrollerAnimateDirection", value)
          }
        />
        <RangeControl
          label="Hide after scrolling stops"
          min={1}
          max={10}
          suffix="s"
          value={preferences.elasticScrollerHideDelay}
          onChange={(value) =>
            updatePreference("elasticScrollerHideDelay", value)
          }
        />
      </SettingsSection>

      <SettingsSection title="Interface">
        <ChoiceCards
          value={preferences.controlRoundness}
          onChange={(value) => updatePreference("controlRoundness", value)}
          choices={[
            { id: "sharp", label: "Sharp", detail: "Crisp corners" },
            { id: "rounded", label: "Rounded", detail: "Balanced roundness" },
            { id: "pill", label: "Pill", detail: "Soft action buttons" },
          ]}
        />
        <SettingToggle
          label="Elevated surfaces"
          description="Add subtle edge light and depth to cards and navigation."
          checked={preferences.elevatedSurfaces}
          onChange={(value) => updatePreference("elevatedSurfaces", value)}
        />
        <SelectControl
          label="Shortcut key style"
          value={preferences.shortcutKeyStyle}
          onChange={(value) => updatePreference("shortcutKeyStyle", value)}
          options={[
            { value: "system", label: "Follow your system" },
            { value: "mac", label: "Command (⌘)" },
            { value: "windows", label: "Control (Ctrl)" },
          ]}
        />
      </SettingsSection>

      <SettingsSection title="Screen">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Full screen</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Expand the app to fill your screen.
            </p>
          </div>
          <button
            type="button"
            aria-pressed={preferences.fullScreen}
            onClick={() => void toggleFullScreen(!preferences.fullScreen)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
              preferences.fullScreen
                ? "border-accent bg-accent/15 text-accent"
                : "border-border bg-background hover:bg-muted"
            }`}
          >
            {preferences.fullScreen ? "Exit full screen" : "Enter full screen"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Sun size={14} /> Light
          </span>
          <span className="inline-flex items-center gap-1">
            <Moon size={14} /> Dark
          </span>
          <span>·</span>
          <span>Preferences are stored in this browser.</span>
        </div>
      </SettingsSection>
    </div>
  );
}
