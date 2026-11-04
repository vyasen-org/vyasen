import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type UIEvent,
} from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  GraduationCap,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Settings,
  X,
} from "lucide-react";
import type { SchoolRole } from "@vyasen/contracts";

import { roleLabels, roleNavigation } from "@/components/navigation-config";
import { ElasticScroller } from "@/components/elastic-scroller";
import { ProfileMenu } from "@/components/profile-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/providers/theme-provider";

type SidebarPosition = "left" | "right" | "top" | "bottom";
type FloatingButtonPosition = { left: number; top: number };

const FLOATING_BUTTON_SIZE = 48;
const FLOATING_BUTTON_MARGIN = 12;

function SidebarContents({
  collapsed,
  canToggleCollapsed,
  hiddenMode,
  horizontal,
  onCloseHidden,
  onNavigate,
  onProfileMenuOpen,
  onRoleChange,
  onToggleCollapsed,
  role,
  position,
}: {
  collapsed: boolean;
  canToggleCollapsed: boolean;
  hiddenMode: boolean;
  horizontal: boolean;
  onCloseHidden: () => void;
  onNavigate?: () => void;
  onProfileMenuOpen: () => void;
  onRoleChange: (role: SchoolRole) => void;
  onToggleCollapsed: () => void;
  role: SchoolRole;
  position: SidebarPosition;
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { preferences } = useTheme();
  const items = roleNavigation[role];

  return (
    <>
      <SidebarHeader
        className={`relative flex h-16 shrink-0 items-center gap-3 px-2 ${
          horizontal
            ? "flex-row sm:px-4"
            : collapsed
              ? "justify-center"
              : "justify-between"
        } ${!horizontal ? "w-full" : ""}`}
      >
        <span
          className={`flex min-w-0 items-center gap-2 ${
            collapsed
              ? "group-hover/sidebar:invisible group-focus-within/sidebar:invisible"
              : ""
          }`}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-lg shadow-accent/20">
            {collapsed && !horizontal ? (
              <span className="text-2xl font-bold leading-none">S</span>
            ) : (
              <GraduationCap size={22} />
            )}
          </span>
          {(!collapsed || horizontal) && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-tight">
                <img src="/static/app-icon.jpg" alt="Vyasen" className="h-6 w-6 mr-2 inline-block"/> Vyasen
              </span>
              {!horizontal && (hiddenMode || canToggleCollapsed) && (
                <span className="block text-xs text-muted-foreground">
                  School workspace
                </span>
              )}
            </span>
          )}
        </span>
        {!horizontal && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              hiddenMode
                ? "Close sidebar"
                : collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
            }
            aria-expanded={hiddenMode ? true : !collapsed}
            className={`sidebar-toggle-button size-8 shrink-0 text-muted-foreground ${
              collapsed && !hiddenMode
                ? "absolute right-2 hidden group-hover/sidebar:inline-flex group-focus-within/sidebar:inline-flex"
                : ""
            }`}
            onClick={hiddenMode ? onCloseHidden : onToggleCollapsed}
          >
            {hiddenMode ? (
              <X size={17} />
            ) : position === "right" ? (
              collapsed ? (
                <PanelRightOpen size={17} />
              ) : (
                <PanelRightClose size={17} />
              )
            ) : collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent
        className={
          horizontal
            ? "flex min-w-0 flex-1 flex-row items-center overflow-x-auto overflow-y-hidden px-1"
            : "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-2"
        }
      >
        {!collapsed && !horizontal && (
          <SidebarGroupLabel className="max-sm:hidden">
            Workspace · {roleLabels[role]}
          </SidebarGroupLabel>
        )}
        <nav
          aria-label={`${role} navigation`}
          className={horizontal ? "min-w-0 flex-1" : ""}
        >
          <SidebarMenu
            className={
              horizontal
                ? "flex w-max min-w-full flex-row items-center gap-1.5"
                : "flex-col"
            }
          >
            {items.map((item, index) => {
              const Icon = item.icon;
              const isActive = item.to
                ? pathname === item.to ||
                  (item.to === "/settings/appearance" &&
                    pathname.startsWith("/settings"))
                : false;
              const iconStyle = {
                color:
                  preferences.sidebarIconStyle === "multicolor"
                    ? [
                        "#60a5fa",
                        "#c084fc",
                        "#34d399",
                        "#fbbf24",
                        "#fb7185",
                        "#22d3ee",
                        "#a3e635",
                      ][index % 7]
                    : preferences.sidebarIconColorMode === "custom"
                      ? preferences.sidebarIconColor
                      : undefined,
              } satisfies CSSProperties;
              const iconClassName =
                `shrink-0 ${
                  collapsed ? "size-6" : "size-5"
                } ${
                  preferences.sidebarIconStyle === "multicolor" ||
                  preferences.sidebarIconColorMode === "custom"
                    ? ""
                    : preferences.sidebarIconColorMode === "theme" || isActive
                      ? "text-accent"
                      : "text-muted-foreground"
                }`;
              const labelClass = horizontal
                ? "inline"
                : collapsed
                  ? "hidden"
                  : "min-w-0 flex-1 truncate";
              const buttonClass = horizontal
                ? "w-auto shrink-0 px-3"
                : collapsed
                  ? "size-12 justify-center px-0"
                  : "min-w-0 overflow-hidden max-sm:justify-center max-sm:px-0";
              const elevatedMenuClassName = preferences.elevatedSidebarMenus
                ? isActive
                  ? "shadow-sm shadow-accent/10"
                  : "shadow-sm shadow-black/5 hover:shadow-md hover:shadow-accent/10"
                : "";
              const shortcut = preferences.showKeyboardShortcuts
                ? item.shortcut
                : undefined;
              const shortcutPrefix =
                preferences.shortcutKeyStyle === "mac" ||
                (preferences.shortcutKeyStyle === "system" &&
                  navigator.platform.toLowerCase().includes("mac"))
                  ? "⌘"
                  : "Ctrl";
              const shortcutLabel = shortcut
                ? `${shortcutPrefix} ${shortcut}`
                : undefined;

              const content = (
                <>
                  <Icon className={iconClassName} style={iconStyle} />
                  <span className={labelClass}>{item.label}</span>
                  {shortcutLabel && !horizontal && !collapsed && (
                    <span className="ml-auto hidden rounded-md bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
                      {shortcutLabel}
                    </span>
                  )}
                  {!item.to && !collapsed && !horizontal && (
                    <span className="ml-auto hidden rounded-full bg-surface px-2 py-0.5 text-[10px] text-muted-foreground sm:inline">
                      Soon
                    </span>
                  )}
                </>
              );

              return (
                <SidebarMenuItem
                  key={item.label}
                  className={horizontal ? "w-auto shrink-0" : ""}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {item.to ? (
                        <SidebarMenuButton
                          asChild
                          active={isActive}
                          className={`${buttonClass} ${elevatedMenuClassName}`}
                        >
                          <Link to={item.to} onClick={onNavigate}>
                            {content}
                          </Link>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton
                          type="button"
                          disabled
                          aria-label={`${item.label}, coming soon`}
                          className={`${buttonClass} ${elevatedMenuClassName} cursor-not-allowed opacity-70`}
                        >
                          {content}
                        </SidebarMenuButton>
                      )}
                    </TooltipTrigger>
                    {(collapsed || horizontal) && (
                      <TooltipContent
                        side={
                          horizontal
                            ? preferences.sidebarPosition === "bottom"
                              ? "top"
                              : "bottom"
                            : preferences.sidebarPosition === "right"
                              ? "left"
                              : "right"
                        }
                      >
                        {item.label}
                        {shortcutLabel ? ` · ${shortcutLabel}` : ""}
                        {!item.to ? " · Coming soon" : ""}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </nav>
      </SidebarContent>

      <SidebarFooter
        className={`flex gap-2 ${
          horizontal
            ? "ml-auto h-16 shrink-0 flex-row items-center px-2 sm:px-4"
            : `mt-auto w-full shrink-0 flex-col px-2 pb-2 pt-2 ${
                collapsed ? "items-center" : "items-stretch"
              }`
        }`}
      >
        <ProfileMenu
          role={role}
          onRoleChange={onRoleChange}
          onOpenChange={(open) => {
            if (open) onProfileMenuOpen();
          }}
          compact={collapsed || horizontal}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/settings/appearance"
              aria-label="Settings"
              onClick={onNavigate}
              className={`theme-interactive-glow theme-tab-surface flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                collapsed || horizontal
                  ? "size-12 shrink-0 justify-center p-0"
                  : "min-w-0 overflow-hidden"
              } ${pathname.startsWith("/settings") ? "active" : ""}`}
            >
              <Settings className="size-5 shrink-0" />
              {!collapsed && !horizontal && (
                <span>Settings</span>
              )}
            </Link>
          </TooltipTrigger>
          {(collapsed || horizontal) && (
            <TooltipContent
              side={
                horizontal
                  ? position === "bottom"
                    ? "top"
                    : "bottom"
                  : position === "right"
                    ? "left"
                    : "right"
              }
            >
              Settings
            </TooltipContent>
          )}
        </Tooltip>
      </SidebarFooter>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { preferences, updatePreference } = useTheme();
  const [role, setRole] = useState<SchoolRole>("admin");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [hiddenSidebarOpen, setHiddenSidebarOpen] = useState(false);
  const [tabletSidebarExpanded, setTabletSidebarExpanded] = useState(false);
  const [dockHidden, setDockHidden] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(
    () => (typeof window === "undefined" ? 1024 : window.innerWidth),
  );
  const [viewportHeight, setViewportHeight] = useState(
    () => (typeof window === "undefined" ? 768 : window.innerHeight),
  );
  const [resizingWidth, setResizingWidth] = useState<number | null>(null);
  const resizeStart = useRef<{ pointerX: number; width: number } | null>(null);
  const floatingButtonDrag = useRef<{
    offsetX: number;
    offsetY: number;
    pointerX: number;
    pointerY: number;
    moved: boolean;
  } | null>(null);
  const suppressFloatingButtonClick = useRef(false);
  const [draggingFloatingButtonPosition, setDraggingFloatingButtonPosition] =
    useState<FloatingButtonPosition | null>(null);
  const previousScrollTop = useRef(0);
  const isSmallScreen = viewportWidth < 640;
  const isTabletWidth = viewportWidth >= 640 && viewportWidth < 768;
  const sidebarBehavior = isSmallScreen
    ? preferences.sidebarMobileBehavior
    : preferences.sidebarBehavior;
  const position: SidebarPosition = isSmallScreen
    ? preferences.sidebarMobilePosition
    : preferences.sidebarPosition;
  const horizontal = position === "top" || position === "bottom";
  const hiddenMode = !horizontal && sidebarBehavior === "hidden";
  const fixedHiddenWidth = viewportWidth >= 1024 ? 320 : 300;
  const fixedHiddenSizing = hiddenMode && !isSmallScreen && !isTabletWidth;
  const maxSidebarWidth = viewportWidth > 1024 ? 500 : 350;
  const tabletCollapsed =
    isTabletWidth && !horizontal && sidebarBehavior === "pinned";
  const collapsed =
    !horizontal &&
    !tabletSidebarExpanded &&
    resizingWidth === null &&
    ((!fixedHiddenSizing && preferences.sidebarWidth < 150) ||
      tabletCollapsed ||
      (!hiddenMode && preferences.sidebarCollapsed));
  const tabletOverlayOpen = tabletCollapsed && tabletSidebarExpanded;
  const preferredSidebarWidth = Math.min(
    preferences.sidebarWidth,
    maxSidebarWidth,
  );
  const sidebarWidth = fixedHiddenSizing
    ? fixedHiddenWidth
    : hiddenMode
      ? (resizingWidth ?? preferredSidebarWidth)
      : collapsed
        ? 64
        : (resizingWidth ?? preferredSidebarWidth);
  const collapsedContents =
    collapsed || (resizingWidth !== null && sidebarWidth < 150);
  const dockIsVisible = horizontal
    ? sidebarVisible
    : hiddenMode
      ? hiddenSidebarOpen
      : true;

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };
    window.addEventListener("resize", updateViewportSize);
    return () => window.removeEventListener("resize", updateViewportSize);
  }, []);

  useEffect(() => {
    setSidebarVisible(true);
    setHiddenSidebarOpen(false);
    setTabletSidebarExpanded(false);
    setDockHidden(false);
    previousScrollTop.current = 0;
  }, [isSmallScreen, isTabletWidth, position, sidebarBehavior]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key.toLowerCase() === "b" &&
        (event.ctrlKey || event.metaKey) &&
        !event.altKey
      ) {
        event.preventDefault();
        if (horizontal) {
          setSidebarVisible((visible) => !visible);
        } else if (hiddenMode) {
          setHiddenSidebarOpen((open) => !open);
        } else if (tabletCollapsed) {
          setTabletSidebarExpanded((expanded) => !expanded);
        } else if (!tabletCollapsed) {
          updatePreference("sidebarCollapsed", !preferences.sidebarCollapsed);
        } else {
          return;
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    hiddenMode,
    horizontal,
    preferences.sidebarCollapsed,
    tabletCollapsed,
    updatePreference,
  ]);

  function handleMainScroll(event: UIEvent<HTMLDivElement>) {
    if (!horizontal || sidebarBehavior !== "hide-on-scroll") {
      setDockHidden(false);
      return;
    }
    const currentScrollTop = event.currentTarget.scrollTop;
    const previous = previousScrollTop.current;
    if (currentScrollTop < 80 || currentScrollTop < previous - 4) {
      setDockHidden(false);
    } else if (currentScrollTop > previous + 4) {
      setDockHidden(true);
    }
    previousScrollTop.current = currentScrollTop;
  }

  const contentLayout =
    preferences.mainContentLayout === "contained"
      ? "max-w-5xl"
      : preferences.mainContentLayout === "wide"
        ? "max-w-[1440px]"
        : "max-w-none";
  const dockBase =
    position === "left"
      ? "inset-y-0 left-0"
      : position === "right"
        ? "inset-y-0 right-0"
        : position === "top"
          ? "inset-x-0 top-0 h-16 flex-row"
          : "inset-x-0 bottom-0 h-16 flex-row";
  const hiddenTransform =
    horizontal && dockHidden
      ? position === "top"
        ? "-translate-y-full"
        : "translate-y-full"
      : hiddenMode && !hiddenSidebarOpen
        ? position === "left"
          ? "-translate-x-full"
          : "translate-x-full"
        : "";
  const dockClass = `theme-sidebar-surface group/sidebar z-40 flex fixed ${dockBase} border-border transition-transform duration-300 ease-out ${
    horizontal
      ? `flex-row items-center border-r-0 px-2 sm:px-4 ${
          position === "top" ? "border-b" : "border-b-0 border-t"
        }`
      : `flex-col ${
          position === "left" ? "border-r" : "border-r-0 border-l"
        }`
  } ${hiddenMode ? "shadow-2xl" : ""} ${hiddenTransform} ${
    dockHidden ? "pointer-events-none" : ""
  } ${
    hiddenMode && !hiddenSidebarOpen ? "pointer-events-none" : ""
  }`;
  const reservedSidebarWidth =
    hiddenMode || collapsed || tabletCollapsed
      ? 64
      : sidebarWidth;
  const contentPositionStyle: CSSProperties = horizontal
    ? {}
    : position === "left"
      ? { marginLeft: reservedSidebarWidth }
      : { marginRight: reservedSidebarWidth };
  const contentPositionClass = horizontal
    ? sidebarVisible && !dockHidden
      ? position === "top"
        ? "pt-16"
        : "pb-16"
      : ""
    : "";
  const frameHeightClass = horizontal && sidebarVisible && !dockHidden
    ? "h-[calc(100dvh-5rem)]"
    : "h-[calc(100dvh-1rem)]";

  const maxFloatingButtonLeft = Math.max(
    FLOATING_BUTTON_MARGIN,
    viewportWidth - FLOATING_BUTTON_SIZE - FLOATING_BUTTON_MARGIN,
  );
  const maxFloatingButtonTop = Math.max(
    FLOATING_BUTTON_MARGIN,
    viewportHeight - FLOATING_BUTTON_SIZE - FLOATING_BUTTON_MARGIN,
  );
  const savedFloatingButtonPosition = preferences.floatingSidebarButtonPosition;
  const floatingButtonPosition =
    draggingFloatingButtonPosition ?? {
      left:
        FLOATING_BUTTON_MARGIN +
        (maxFloatingButtonLeft - FLOATING_BUTTON_MARGIN) *
          savedFloatingButtonPosition.x,
      top:
        FLOATING_BUTTON_MARGIN +
        (maxFloatingButtonTop - FLOATING_BUTTON_MARGIN) *
          savedFloatingButtonPosition.y,
    };
  const horizontalDockAutoHidden =
    horizontal &&
    sidebarBehavior === "hide-on-scroll" &&
    (dockHidden || !sidebarVisible);
  const floatingButtonVisible =
    preferences.floatingSidebarButtonEnabled &&
    (horizontalDockAutoHidden || (hiddenMode && !hiddenSidebarOpen));

  function clampFloatingButtonPosition(left: number, top: number) {
    return {
      left: Math.max(
        FLOATING_BUTTON_MARGIN,
        Math.min(maxFloatingButtonLeft, left),
      ),
      top: Math.max(
        FLOATING_BUTTON_MARGIN,
        Math.min(maxFloatingButtonTop, top),
      ),
    };
  }

  function startDraggingFloatingButton(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (!event.isPrimary || event.button !== 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    floatingButtonDrag.current = {
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
      pointerX: event.clientX,
      pointerY: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function dragFloatingButton(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = floatingButtonDrag.current;
    if (!drag) return;
    if (
      Math.abs(event.clientX - drag.pointerX) > 4 ||
      Math.abs(event.clientY - drag.pointerY) > 4
    ) {
      drag.moved = true;
    }
    if (!drag.moved) return;
    setDraggingFloatingButtonPosition(
      clampFloatingButtonPosition(
        event.clientX - drag.offsetX,
        event.clientY - drag.offsetY,
      ),
    );
  }

  function finishDraggingFloatingButton(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const drag = floatingButtonDrag.current;
    if (!drag) return;
    if (drag.moved) {
      const position = clampFloatingButtonPosition(
        event.clientX - drag.offsetX,
        event.clientY - drag.offsetY,
      );
      updatePreference("floatingSidebarButtonPosition", {
        x:
          maxFloatingButtonLeft === FLOATING_BUTTON_MARGIN
            ? 1
            : (position.left - FLOATING_BUTTON_MARGIN) /
              (maxFloatingButtonLeft - FLOATING_BUTTON_MARGIN),
        y:
          maxFloatingButtonTop === FLOATING_BUTTON_MARGIN
            ? 1
            : (position.top - FLOATING_BUTTON_MARGIN) /
              (maxFloatingButtonTop - FLOATING_BUTTON_MARGIN),
      });
      suppressFloatingButtonClick.current = true;
    }
    floatingButtonDrag.current = null;
    setDraggingFloatingButtonPosition(null);
  }

  function activateFloatingButton() {
    if (suppressFloatingButtonClick.current) {
      suppressFloatingButtonClick.current = false;
      return;
    }
    if (horizontal) {
      setSidebarVisible(true);
      setDockHidden(false);
      return;
    }
    if (hiddenMode) setHiddenSidebarOpen(true);
  }

  function resizeSidebar(event: ReactPointerEvent<HTMLDivElement>) {
    const start = resizeStart.current;
    if (!start) return;
    const delta =
      position === "left"
        ? event.clientX - start.pointerX
        : start.pointerX - event.clientX;
    setResizingWidth(
      Math.max(
        64,
        Math.min(maxSidebarWidth, Math.round(start.width + delta)),
      ),
    );
  }

  function finishSidebarResize(event: ReactPointerEvent<HTMLDivElement>) {
    const start = resizeStart.current;
    if (!start) return;
    const delta =
      position === "left"
        ? event.clientX - start.pointerX
        : start.pointerX - event.clientX;
    const width = Math.max(
      64,
      Math.min(maxSidebarWidth, Math.round(start.width + delta)),
    );
    applySidebarWidth(width);
    resizeStart.current = null;
    setResizingWidth(null);
    if (
      hiddenMode &&
      (event.clientY < 0 ||
        event.clientY > window.innerHeight ||
        (position === "left"
          ? event.clientX > width
          : event.clientX < window.innerWidth - width))
    ) {
      setHiddenSidebarOpen(false);
    }
  }

  function handleResizeKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const positionDirection = position === "left" ? direction : -direction;
    const step = event.shiftKey ? 32 : 16;
    const baseWidth =
      collapsed && preferences.sidebarWidth >= 150
        ? 64
        : preferences.sidebarWidth;
    applySidebarWidth(
      Math.max(
        64,
        Math.min(
          maxSidebarWidth,
          baseWidth + positionDirection * step,
        ),
      ),
    );
  }

  function applySidebarWidth(width: number) {
    const boundedWidth = Math.max(64, Math.min(maxSidebarWidth, width));
    updatePreference("sidebarWidth", boundedWidth);
    if (boundedWidth < 150) {
      updatePreference("sidebarCollapsed", true);
      setTabletSidebarExpanded(false);
    } else {
      updatePreference("sidebarCollapsed", false);
    }
  }

  function toggleCollapsed() {
    if (tabletCollapsed) {
      if (!tabletSidebarExpanded && preferences.sidebarWidth <= 64) {
        updatePreference("sidebarWidth", 256);
      }
      setTabletSidebarExpanded((expanded) => !expanded);
      return;
    }
    if (
      preferences.sidebarCollapsed ||
      preferences.sidebarWidth < 150 ||
      preferences.sidebarWidth <= 64
    ) {
      updatePreference("sidebarCollapsed", false);
      if (preferences.sidebarWidth < 150) {
        updatePreference("sidebarWidth", 256);
      }
      return;
    }
    updatePreference("sidebarCollapsed", true);
  }

  return (
    <div
      className={`min-h-screen bg-surface text-foreground ${
        position === "bottom" ? "flex flex-col" : ""
      }`}
      data-sidebar-position={position}
    >
      <TooltipProvider delayDuration={300}>
        {tabletOverlayOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-30 cursor-default bg-transparent"
            onClick={() => setTabletSidebarExpanded(false)}
          />
        )}
        {hiddenMode && !hiddenSidebarOpen && (
          <>
            <button
              type="button"
              aria-label="Open sidebar"
              className={`fixed inset-y-0 z-30 hidden w-2 cursor-pointer bg-transparent hover:bg-accent/30 focus-visible:bg-accent/30 focus-visible:outline-none sm:block ${
                position === "left" ? "left-0" : "right-0"
              }`}
              onPointerEnter={(event) => {
                if (event.pointerType !== "touch") setHiddenSidebarOpen(true);
              }}
              onFocus={() => setHiddenSidebarOpen(true)}
              onClick={() => setHiddenSidebarOpen(true)}
            />
          </>
        )}

        {position !== "bottom" && (
          <Sidebar
            id="school-workspace-navigation"
            aria-label="School workspace navigation"
            aria-hidden={!dockIsVisible || dockHidden}
            inert={!dockIsVisible || dockHidden}
            onPointerLeave={() => {
              if (hiddenMode && !resizeStart.current) {
                setHiddenSidebarOpen(false);
              }
            }}
            style={!horizontal ? { width: sidebarWidth } : undefined}
            className={`${dockClass} ${
              tabletOverlayOpen ? "z-40 shadow-2xl" : ""
            }`}
          >
            <SidebarContents
              collapsed={collapsedContents}
              canToggleCollapsed
              hiddenMode={hiddenMode}
              horizontal={horizontal}
              role={role}
              onRoleChange={setRole}
              onNavigate={() => {
                if (hiddenMode) setHiddenSidebarOpen(false);
                if (tabletOverlayOpen) setTabletSidebarExpanded(false);
              }}
              onCloseHidden={() => setHiddenSidebarOpen(false)}
              onProfileMenuOpen={() => {
                if (hiddenMode) setHiddenSidebarOpen(false);
              }}
              onToggleCollapsed={toggleCollapsed}
              position={position}
            />
            {!horizontal && !fixedHiddenSizing && (
              <div
                role="separator"
                aria-label="Resize sidebar"
                aria-orientation="vertical"
                aria-valuemin={64}
                aria-valuemax={maxSidebarWidth}
                aria-valuenow={sidebarWidth}
                aria-valuetext={`${sidebarWidth} pixels`}
                tabIndex={0}
                className={`absolute inset-y-0 z-20 hidden w-1.5 touch-none cursor-col-resize bg-transparent transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none md:block ${
                  position === "left" ? "right-0" : "left-0"
                }`}
                onPointerDown={(event) => {
                  resizeStart.current = {
                    pointerX: event.clientX,
                    width: sidebarWidth,
                  };
                  setResizingWidth(sidebarWidth);
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={resizeSidebar}
                onPointerUp={finishSidebarResize}
                onPointerCancel={() => {
                  resizeStart.current = null;
                  setResizingWidth(null);
                }}
                onKeyDown={handleResizeKeyDown}
              />
            )}
          </Sidebar>
        )}

        <div
          style={contentPositionStyle}
          className={`${contentPositionClass} p-2 ${
            position === "bottom" ? "order-1" : ""
          }`}
        >
          <main
            className={`${frameHeightClass} overflow-hidden rounded-2xl border border-border bg-background shadow-xl transition-[height] duration-300`}
          >
            <div
              className="h-full overflow-y-auto overscroll-contain"
              onScroll={handleMainScroll}
            >
              <div
                className={`mx-auto w-full ${contentLayout} px-4 py-7 sm:px-6 lg:px-8`}
              >
                {children}
              </div>
            </div>
          </main>
        </div>

        {position === "bottom" && (
          <Sidebar
            id="school-workspace-navigation"
            aria-label="School workspace navigation"
            aria-hidden={!dockIsVisible || dockHidden}
            inert={!dockIsVisible || dockHidden}
            onPointerLeave={() => {
              if (hiddenMode) setHiddenSidebarOpen(false);
            }}
            className={`${dockClass} order-2`}
          >
            <SidebarContents
              collapsed={collapsed}
              canToggleCollapsed={false}
              hiddenMode={false}
              horizontal
              role={role}
              onRoleChange={setRole}
              onNavigate={() => undefined}
              onCloseHidden={() => setHiddenSidebarOpen(false)}
              onProfileMenuOpen={() => undefined}
              onToggleCollapsed={toggleCollapsed}
              position={position}
            />
          </Sidebar>
        )}

        {horizontal &&
          !sidebarVisible &&
          !horizontalDockAutoHidden &&
          !preferences.floatingSidebarButtonEnabled && (
          <Button
            variant="secondary"
            size="icon"
            aria-label="Show sidebar"
            aria-controls="school-workspace-navigation"
            className={`fixed z-50 rounded-xl border border-border bg-surface shadow-lg ${
              position === "top"
                ? "left-1/2 top-0 -translate-x-1/2"
                : "bottom-0 left-1/2 -translate-x-1/2"
            }`}
            onClick={() => {
              setSidebarVisible(true);
              setDockHidden(false);
            }}
          >
            <Menu size={17} />
          </Button>
        )}

        {floatingButtonVisible && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={horizontal ? "Show sidebar" : "Open sidebar"}
            aria-controls="school-workspace-navigation"
            className="fixed z-50 touch-none rounded-full border border-border bg-surface shadow-xl"
            style={{
              left: floatingButtonPosition.left,
              top: floatingButtonPosition.top,
              width: FLOATING_BUTTON_SIZE,
              height: FLOATING_BUTTON_SIZE,
            }}
            onPointerDown={startDraggingFloatingButton}
            onPointerMove={dragFloatingButton}
            onPointerUp={finishDraggingFloatingButton}
            onPointerCancel={finishDraggingFloatingButton}
            onClick={activateFloatingButton}
          >
            <Menu size={19} />
          </Button>
        )}

        <ElasticScroller />
      </TooltipProvider>
    </div>
  );
}
