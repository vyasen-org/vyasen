import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  colorThemeIds,
  defaultUiPreferences,
  uiPreferencesSchema,
  type UiPreferences,
} from "@vyasen/contracts";

const PREFERENCES_KEY = "vyasen-ui-preferences";

interface ThemeContextValue {
  preferences: UiPreferences;
  updatePreference: <Key extends keyof UiPreferences>(
    key: Key,
    value: UiPreferences[Key],
  ) => void;
  resetPreferences: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPreferences(): UiPreferences {
  try {
    const storedValue = window.localStorage.getItem(PREFERENCES_KEY);
    if (!storedValue) return defaultUiPreferences;

    const storedPreferences: unknown = JSON.parse(storedValue);
    const result = uiPreferencesSchema.safeParse(storedPreferences);
    if (result.success) {
      const saved =
        typeof storedPreferences === "object" && storedPreferences !== null
          ? (storedPreferences as Record<string, unknown>)
          : {};
      const legacyPosition = saved.sidebarPosition;
      const legacyHorizontalBehavior =
        saved.sidebarHeaderBehavior === "hide-on-scroll" &&
        (legacyPosition === "top" || legacyPosition === "bottom");
      return {
        ...result.data,
        sidebarMobilePosition:
          typeof saved.sidebarMobilePosition === "string"
            ? result.data.sidebarMobilePosition
            : legacyPosition === "bottom"
              ? "bottom"
              : result.data.sidebarMobilePosition,
        sidebarBehavior:
          typeof saved.sidebarBehavior === "string"
            ? result.data.sidebarBehavior
            : legacyHorizontalBehavior
              ? "hide-on-scroll"
              : result.data.sidebarBehavior,
        fullScreen: false,
      };
    }

    console.warn(
      "Saved appearance settings were invalid; defaults were restored.",
    );
  } catch (error) {
    console.warn(
      "Could not read saved appearance settings; defaults were restored.",
      error,
    );
  }
  return defaultUiPreferences;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] =
    useState<UiPreferences>(readPreferences);

  useEffect(() => {
    if (!preferences.themeRotationEnabled) return;
    try {
      if (
        window.sessionStorage.getItem("vyasen-theme-rotated") === "true"
      ) {
        return;
      }
      const eligibleThemes = preferences.themeRotationPool.filter((theme) =>
        colorThemeIds.includes(theme),
      );
      const themes = eligibleThemes.length
        ? eligibleThemes
        : [preferences.colorTheme];
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];
      window.sessionStorage.setItem("vyasen-theme-rotated", "true");
      setPreferences((current) => ({ ...current, colorTheme: randomTheme }));
    } catch (error) {
      console.warn(
        "Could not rotate the appearance theme for this session.",
        error,
      );
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.warn(
        "Could not save appearance settings in this browser.",
        error,
      );
    }
  }, [preferences]);

  useEffect(() => {
    const root = document.documentElement;
    const applyColorMode = () => {
      const effectiveMode =
        preferences.colorMode === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : preferences.colorMode;
      root.dataset.theme = effectiveMode;
    };

    applyColorMode();
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", applyColorMode);
    return () => mediaQuery.removeEventListener("change", applyColorMode);
  }, [preferences.colorMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.colorTheme = preferences.colorTheme;
    root.dataset.readingMode =
      preferences.readingModeEnabled || preferences.readingModePreview
        ? "on"
        : "off";
    root.dataset.scrollbars = preferences.scrollbarVisibility;
    root.dataset.scrollbarStyle = preferences.scrollbarStyle;
    root.dataset.controlRoundness = preferences.controlRoundness;
    root.dataset.elevatedSurfaces = String(preferences.elevatedSurfaces);
    root.style.setProperty(
      "--reading-temperature",
      `${(preferences.readingTemperature - 50) * 0.32}deg`,
    );
    root.style.setProperty(
      "--reading-tint-opacity",
      `${Math.abs(preferences.readingTemperature - 50) / 250}`,
    );
    root.style.setProperty(
      "--reading-tint",
      preferences.readingTemperature < 50
        ? "hsl(205 70% 55%)"
        : "hsl(34 95% 58%)",
    );
    root.style.setProperty(
      "--reading-texture-opacity",
      `${
        (preferences.readingModeEnabled || preferences.readingModePreview
          ? preferences.readingTexture
          : 0) / 100
      }`,
    );
    root.style.setProperty(
      "--reading-grain-size",
      `${preferences.readingGrainSize}px`,
    );
  }, [preferences]);

  const updatePreference = useCallback(
    <Key extends keyof UiPreferences>(key: Key, value: UiPreferences[Key]) => {
      setPreferences((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const resetPreferences = useCallback(() => {
    setPreferences(defaultUiPreferences);
    try {
      window.sessionStorage.removeItem("vyasen-theme-rotated");
    } catch (error) {
      console.warn("Could not reset the session theme rotation.", error);
    }
  }, []);

  const value = useMemo(
    () => ({ preferences, updatePreference, resetPreferences }),
    [preferences, updatePreference, resetPreferences],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
