import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  MoveVertical,
} from "lucide-react";

import { useTheme } from "@/providers/theme-provider";

interface DragState {
  lastX: number;
  lastY: number;
  locked: boolean;
}

export function ElasticScroller() {
  const { preferences } = useTheme();
  const [visible, setVisible] = useState(false);
  const [locked, setLocked] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("down");
  const dragState = useRef<DragState | null>(null);

  useEffect(() => {
    if (!preferences.elasticScrollerEnabled) {
      setVisible(false);
      return;
    }
    let hideTimer = 0;
    const onScroll = () => {
      const hasLongPage =
        document.documentElement.scrollHeight > window.innerHeight + 80;
      setVisible(hasLongPage);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(
        () => setVisible(false),
        preferences.elasticScrollerHideDelay * 1000,
      );
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(hideTimer);
    };
  }, [
    preferences.elasticScrollerEnabled,
    preferences.elasticScrollerHideDelay,
  ]);

  if (!preferences.elasticScrollerEnabled) return null;

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      lastX: event.clientX,
      lastY: event.clientY,
      locked: false,
    };
    setVisible(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const activeDrag = dragState.current;
    if (!activeDrag) return;
    const deltaX = event.clientX - activeDrag.lastX;
    const deltaY = event.clientY - activeDrag.lastY;

    if (!activeDrag.locked) {
      const crossedLockSide =
        preferences.elasticScrollerLockSide === "left"
          ? deltaX < -28
          : deltaX > 28;
      if (crossedLockSide) {
        activeDrag.locked = true;
        setLocked(true);
      }
    } else {
      const crossedUnlockSide =
        preferences.elasticScrollerUnlockSide === "left"
          ? deltaX < -28
          : deltaX > 28;
      if (crossedUnlockSide) {
        activeDrag.locked = false;
        setLocked(false);
      }
    }

    if (deltaY !== 0) {
      setDirection(deltaY < 0 ? "up" : "down");
      window.scrollBy({
        top: deltaY * (activeDrag.locked ? 4 : 1.5),
        behavior: "auto",
      });
    }
    activeDrag.lastX = event.clientX;
    activeDrag.lastY = event.clientY;
  };

  const stopDragging = () => {
    dragState.current = null;
    setLocked(false);
  };

  const DirectionIcon =
    preferences.elasticScrollerDirectionIcon === "chevron"
      ? direction === "up"
        ? ChevronUp
        : ChevronDown
      : preferences.elasticScrollerDirectionIcon === "arrow"
        ? direction === "up"
          ? ArrowUp
          : ArrowDown
        : MoveVertical;

  return (
    <button
      type="button"
      aria-label={
        locked
          ? "Elastic scroller locked. Drag vertically to scroll; cross the unlock side to stop."
          : "Elastic scroller. Drag vertically to scroll; cross the lock side to lock scrolling."
      }
      aria-pressed={locked}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      className={`fixed bottom-5 right-5 z-50 grid size-12 touch-none place-items-center rounded-2xl border border-border bg-surface text-accent transition-[opacity,transform] duration-200 ${
        preferences.elasticScrollerDepth === "raised"
          ? "shadow-[0_8px_24px_rgba(0,0,0,0.35),inset_0_1px_rgba(255,255,255,0.12)]"
          : "shadow-sm"
      } ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
    >
      <DirectionIcon
        size={20}
        className={`${
          preferences.elasticScrollerAnimateDirection
            ? "transition-transform duration-200"
            : ""
        } ${direction === "up" ? "rotate-180" : ""}`}
      />
      {locked && (
        <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-surface bg-accent" />
      )}
    </button>
  );
}
