import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SwitchProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-checked" | "onChange" | "role" | "type"
> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function Switch({
  checked,
  className,
  disabled = false,
  onCheckedChange,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      data-checked={checked}
      className={cn(
        "theme-switch relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "theme-switch-thumb pointer-events-none absolute left-0.5 top-1/2 size-5 -translate-y-1/2 rounded-full shadow-sm transition-transform duration-200 ease-in-out",
          checked && "translate-x-[1.375rem]",
        )}
      />
    </button>
  );
}
