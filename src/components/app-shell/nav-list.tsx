"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { NAV_GROUPS, NAV_ITEMS, SEARCH_NAV_ITEM, SETTINGS_NAV_ITEM } from "@/components/app-shell/nav-items";
import { cn } from "@/lib/utils";

const ITEM_BY_SEGMENT = new Map(
  [...NAV_ITEMS, SEARCH_NAV_ITEM, SETTINGS_NAV_ITEM].map((item) => [item.segment, item])
);

function NavRow({
  href,
  label,
  icon: Icon,
  isActive,
  badge,
  onNavigate,
  dataTour,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  badge?: number;
  onNavigate?: () => void;
  dataTour?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      data-tour={dataTour}
      className={cn(
        "relative flex items-center justify-between rounded px-3 py-2.5 text-sm font-medium transition-colors",
        isActive ? "bg-secondary/40 text-foreground" : "text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
      )}
    >
      {isActive && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />}
      <span className="flex items-center gap-3">
        <Icon className={cn("size-[18px]", isActive && "text-accent")} />
        {label}
      </span>
      {!!badge && (
        <span className="rounded bg-accent/20 px-1.5 py-0.5 font-mono text-[10px] text-accent">{badge}</span>
      )}
    </Link>
  );
}

// Shared, grouped nav content rendered inside both the desktop sidebar's
// fixed rail (AppSidebar) and the mobile drawer (MobileNavDrawer), so the
// two never drift apart and both get the same "Signal ops"/"Growth"
// grouping (see nav-items.ts). `onNavigate` lets the mobile drawer close
// itself when a link is clicked.
export function NavList({
  projectId,
  unrepliedSignalCount,
  showSearchPipeline = false,
  onNavigate,
}: {
  projectId: string;
  unrepliedSignalCount: number;
  showSearchPipeline?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const settingsHref = `${base}/${SETTINGS_NAV_ITEM.segment}`;

  return (
    <nav className="flex flex-1 flex-col gap-5 px-3">
      {NAV_GROUPS.map((group) => {
        const segments = group.segments.filter((segment) => segment !== "search" || showSearchPipeline);
        if (segments.length === 0) return null;
        return (
          <div key={group.label ?? "top"} className="flex flex-col gap-1">
            {group.label && (
              <p className="px-3 pb-1 font-mono text-[10px] tracking-widest text-muted-foreground/60 uppercase">
                {group.label}
              </p>
            )}
            {segments.map((segment) => {
              const item = ITEM_BY_SEGMENT.get(segment)!;
              const href = `${base}/${segment}`;
              return (
                <NavRow
                  key={segment}
                  href={href}
                  label={item.label}
                  icon={item.icon}
                  isActive={pathname.startsWith(href)}
                  badge={segment === "signals" ? unrepliedSignalCount : undefined}
                  onNavigate={onNavigate}
                  dataTour={segment === "signals" || segment === "sources" ? `nav-${segment}` : undefined}
                />
              );
            })}
          </div>
        );
      })}

      <div className="mt-auto flex flex-col gap-1 border-t border-border/60 pt-3">
        <NavRow
          href={settingsHref}
          label={SETTINGS_NAV_ITEM.label}
          icon={SETTINGS_NAV_ITEM.icon}
          isActive={pathname.startsWith(settingsHref)}
          onNavigate={onNavigate}
        />
      </div>
    </nav>
  );
}
