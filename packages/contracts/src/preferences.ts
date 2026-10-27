import { z } from "zod";

export const colorThemeIds = [
  "onyx",
  "steel",
  "midnight",
  "ocean",
  "brainwave",
  "arctic",
  "violet",
  "graphite",
  "lilac",
  "barbie",
  "magenta",
  "rose",
  "signal",
  "live",
  "coral",
  "copper",
  "ember",
  "sunlit",
  "sand",
  "noir",
  "lime",
  "grove",
  "aurora",
  "mint",
] as const;

export const colorThemeSchema = z.enum(colorThemeIds);

export const appearancePreferenceSchema = z.object({
  colorMode: z.enum(["light", "dark", "system"]),
  colorTheme: colorThemeSchema,
  themeRotationEnabled: z.boolean(),
  themeRotationPool: z.array(colorThemeSchema).min(1),
  readingModeEnabled: z.boolean(),
  readingModePreview: z.boolean(),
  readingTemperature: z.number().int().min(0).max(100),
  readingTexture: z.number().int().min(0).max(100),
  readingGrainSize: z.number().int().min(1).max(10),
  scrollbarVisibility: z.enum(["visible", "hidden"]),
  scrollbarStyle: z.enum(["classic", "minimal", "floating"]),
  elasticScrollerEnabled: z.boolean(),
  elasticScrollerDepth: z.enum(["flat", "raised"]),
  elasticScrollerDirectionIcon: z.enum(["arrow", "chevron", "classic"]),
  elasticScrollerLockSide: z.enum(["left", "right"]),
  elasticScrollerUnlockSide: z.enum(["left", "right"]),
  elasticScrollerAnimateDirection: z.boolean(),
  elasticScrollerHideDelay: z.number().int().min(1).max(10),
  controlRoundness: z.enum(["sharp", "rounded", "pill"]),
  elevatedSurfaces: z.boolean(),
  shortcutKeyStyle: z.enum(["system", "mac", "windows"]),
  fullScreen: z.boolean(),
});

export const sidebarPreferenceSchema = z.object({
  sidebarPosition: z.enum(["left", "right", "top", "bottom"]),
  sidebarMobilePosition: z.enum(["top", "bottom"]).default("top"),
  sidebarBehavior: z
    .enum(["pinned", "hide-on-scroll", "hidden"])
    .default("pinned"),
  sidebarMobileBehavior: z
    .enum(["pinned", "hide-on-scroll"])
    .default("hide-on-scroll"),
  sidebarWidth: z.number().int().min(64).max(500).default(256),
  floatingSidebarButtonEnabled: z.boolean().default(true),
  floatingSidebarButtonPosition: z
    .object({
      x: z.number().min(0).max(1).default(1),
      y: z.number().min(0).max(1).default(1),
    })
    .default({ x: 1, y: 1 }),
  sidebarIconStyle: z.enum(["monochrome", "multicolor"]),
  sidebarIconColorMode: z.enum(["theme", "adaptive", "custom"]).default("custom"),
  sidebarIconColor: z.string().regex(/^#[\da-f]{6}$/i),
  mainContentLayout: z.enum(["contained", "wide", "full"]),
  showKeyboardShortcuts: z.boolean(),
  elevatedSidebarMenus: z.boolean(),
  hideSidebar: z.boolean(),
  sidebarCollapsed: z.boolean(),
});

export const uiPreferencesSchema = appearancePreferenceSchema.extend(
  sidebarPreferenceSchema.shape,
);

export type AppearancePreferences = z.infer<typeof appearancePreferenceSchema>;
export type SidebarPreferences = z.infer<typeof sidebarPreferenceSchema>;
export type UiPreferences = z.infer<typeof uiPreferencesSchema>;

export const defaultUiPreferences: UiPreferences = {
  colorMode: "dark",
  colorTheme: "ocean",
  themeRotationEnabled: false,
  themeRotationPool: ["ocean", "midnight", "lilac"],
  readingModeEnabled: false,
  readingModePreview: false,
  readingTemperature: 50,
  readingTexture: 0,
  readingGrainSize: 3,
  scrollbarVisibility: "visible",
  scrollbarStyle: "minimal",
  elasticScrollerEnabled: true,
  elasticScrollerDepth: "raised",
  elasticScrollerDirectionIcon: "classic",
  elasticScrollerLockSide: "right",
  elasticScrollerUnlockSide: "left",
  elasticScrollerAnimateDirection: true,
  elasticScrollerHideDelay: 2,
  controlRoundness: "rounded",
  elevatedSurfaces: true,
  shortcutKeyStyle: "system",
  fullScreen: false,
  sidebarPosition: "left",
  sidebarMobilePosition: "top",
  sidebarBehavior: "pinned",
  sidebarMobileBehavior: "hide-on-scroll",
  sidebarWidth: 256,
  floatingSidebarButtonEnabled: true,
  floatingSidebarButtonPosition: { x: 1, y: 1 },
  sidebarIconStyle: "monochrome",
  sidebarIconColorMode: "custom",
  sidebarIconColor: "#818cf8",
  mainContentLayout: "wide",
  showKeyboardShortcuts: true,
  elevatedSidebarMenus: true,
  hideSidebar: false,
  sidebarCollapsed: false,
};
