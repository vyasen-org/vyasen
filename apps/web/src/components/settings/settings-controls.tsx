import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

export function SettingsSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function SettingToggle({
  checked,
  description,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  description?: string;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        aria-label={label}
        disabled={disabled}
      />
    </div>
  );
}

export function ChoiceCards<T extends string>({
  choices,
  columns = 2,
  onChange,
  value,
}: {
  choices: readonly {
    id: T;
    label: string;
    detail?: string;
    swatch?: string;
  }[];
  columns?: 2 | 3 | 4;
  onChange: (value: T) => void;
  value: T;
}) {
  const columnClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <div className={cn("grid gap-3", columnClass)}>
      {choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          aria-pressed={value === choice.id}
          onClick={() => onChange(choice.id)}
          className={cn(
            "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:border-accent/50",
            value === choice.id
              ? "border-accent bg-accent/10"
              : "border-border bg-background",
          )}
        >
          {choice.swatch && (
            <span
              aria-hidden="true"
              className="size-7 shrink-0 rounded-full border border-border"
              style={{ backgroundColor: choice.swatch }}
            />
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{choice.label}</span>
            {choice.detail && (
              <span className="mt-1 block text-xs text-muted-foreground">
                {choice.detail}
              </span>
            )}
          </span>
          {value === choice.id && (
            <span className="size-2 shrink-0 rounded-full bg-accent" />
          )}
        </button>
      ))}
    </div>
  );
}

export function RangeControl({
  label,
  max,
  min,
  onChange,
  suffix = "",
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  suffix?: string;
  value: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {value}
          {suffix}
        </span>
      </span>
      <input
        className="w-full accent-accent"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        aria-label={label}
      />
    </label>
  );
}

export function SelectControl<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  value: T;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <select
        className="h-10 min-w-40 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
