"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { NAV_ITEMS, SETTINGS_NAV_ITEM } from "@/components/app-shell/nav-items";
import { cn } from "@/lib/utils";

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

// Shared nav content rendered inside both the desktop sidebar's fixed rail
// (AppSidebar) and the mobile drawer (MobileNavDrawer), so the two never
// drift apart. `onNavigate` lets the mobile drawer close itself when a link
// is clicked.
export function NavList({
  projectId,
  unrepliedSignalCount,
  onNavigate,
}: {
  projectId: string;
  unrepliedSignalCount: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const settingsHref = `${base}/${SETTINGS_NAV_ITEM.segment}`;

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const href = `${base}/${item.segment}`;
        // Signal detail pages live under the legacy /signals/[id] path but
        // belong to the Home feed — keep Home lit while reading one.
        const isActive =
          pathname.startsWith(href) ||
          (item.segment === "home" && pathname.startsWith(`${base}/signals`));
        return (
          <NavRow
            key={item.segment}
            href={href}
            label={item.label}
            icon={item.icon}
            isActive={isActive}
            badge={item.segment === "home" ? unrepliedSignalCount : undefined}
            onNavigate={onNavigate}
            dataTour={item.segment === "targeting" ? "nav-targeting" : undefined}
          />
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
