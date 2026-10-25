import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Sidebar({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-background",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("shrink-0", className)} {...props} />;
}

export function SidebarContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-h-0 flex-1 overflow-y-auto", className)}
      {...props}
    />
  );
}

export function SidebarFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("shrink-0", className)} {...props} />;
}

export function SidebarGroupLabel({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "px-3 pb-2 pt-7 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarMenu({
  className,
  ...props
}: HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("grid gap-1.5", className)} {...props} />;
}

export function SidebarMenuItem({
  className,
  ...props
}: HTMLAttributes<HTMLLIElement>) {
  return <li className={cn("min-w-0 list-none", className)} {...props} />;
}

type SidebarMenuButtonProps = ComponentProps<"button"> & {
  active?: boolean;
  asChild?: boolean;
};

export function SidebarMenuButton({
  active = false,
  asChild = false,
  className,
  ...props
}: SidebarMenuButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={cn(
        "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active
          ? "bg-accent/15 text-accent"
          : "bg-surface/45 text-muted-foreground hover:bg-surface hover:text-foreground",
        className,
      )}
      aria-current={active ? "page" : undefined}
      {...props}
    />
  );
}
