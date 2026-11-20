import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const workspaces = ["Greenwood Academy", "Cedar Grove College"];

export function WorkspaceSwitcher({ compact = false }: { compact?: boolean }) {
  const [selectedWorkspace, setSelectedWorkspace] = useState(workspaces[0]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "default"}
          className={
            compact
              ? "size-10 shrink-0"
              : "h-auto max-w-64 justify-start gap-3 px-2 py-1.5 text-left"
          }
          aria-label={`Switch institution. Current institution: ${selectedWorkspace}`}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
            <Building2 size={18} />
          </span>
          <span
            className={compact ? "sr-only" : "hidden min-w-0 flex-1 sm:block"}
          >
            <span className="block truncate text-sm font-semibold">
              {selectedWorkspace}
            </span>
            <span className="block text-xs text-muted-foreground">
              Institution workspace
            </span>
          </span>
          {!compact && (
            <ChevronsUpDown
              size={15}
              className="hidden text-muted-foreground sm:block"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>Your institutions</DropdownMenuLabel>
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace}
            onSelect={() => setSelectedWorkspace(workspace)}
          >
            <Building2 size={16} className="text-muted-foreground" />
            <span className="flex-1">{workspace}</span>
            {selectedWorkspace === workspace && (
              <Check size={15} className="text-accent" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <Plus size={16} />
          Add or join an institution
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
