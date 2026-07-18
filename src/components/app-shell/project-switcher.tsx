"use client";

import { useRef } from "react";
import Link from "next/link";
import { Layers, Check, Plus, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ProjectSummary {
  id: string;
  name: string;
}

export function ProjectSwitcher({
  currentProjectId,
  currentProjectName,
  projects,
  variant = "sidebar",
}: {
  currentProjectId: string;
  currentProjectName: string;
  projects: ProjectSummary[];
  // "sidebar": full-width row used in the desktop sidebar and mobile
  // drawer. "compact": small centered pill used in the mobile top bar (see
  // MobileNavDrawer).
  variant?: "sidebar" | "compact";
}) {
  // Same portal-scoping fix as UserMenu: anchor the popup to a local,
  // non-portaled div so it inherits the .theme-getrive CSS variables
  // instead of escaping to document.body's default (light) theme.
  const themeScopeRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={themeScopeRef} className={variant === "sidebar" ? "px-3" : undefined}>
      <DropdownMenu>
        {variant === "compact" ? (
          <DropdownMenuTrigger className="group flex items-center gap-2 rounded-full border border-transparent px-3 py-1.5 transition-colors active:border-border active:bg-secondary/30">
            <span className="size-1.5 shrink-0 animate-[auth-pulse-slow_2s_ease-in-out_infinite] rounded-full bg-accent" />
            <span className="max-w-[120px] truncate font-mono text-[11px] tracking-wide text-foreground uppercase">
              {currentProjectName}
            </span>
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
        ) : (
          <DropdownMenuTrigger className="group flex w-full items-center justify-between rounded-md border border-transparent px-3 py-2 transition-all hover:border-border/60 hover:bg-secondary/20">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded border border-border bg-secondary/50">
                <Layers className="size-3 text-accent" />
              </span>
              <span className="truncate text-sm font-medium text-foreground">
                {currentProjectName}
              </span>
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent
          side="bottom"
          align={variant === "compact" ? "center" : "start"}
          container={themeScopeRef}
          className={cn(
            "border-border bg-popover/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_40px_-15px_rgba(0,0,0,0.5)] backdrop-blur-md",
            variant === "compact" ? "w-[240px]" : "w-[212px]"
          )}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>Your projects</DropdownMenuLabel>
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                render={<Link href={`/projects/${project.id}/dashboard`} />}
              >
                <span className="flex-1 truncate">{project.name}</span>
                {project.id === currentProjectId && <Check className="size-3.5 text-accent" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/onboarding" />}>
            <Plus className="size-3.5" />
            New project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
