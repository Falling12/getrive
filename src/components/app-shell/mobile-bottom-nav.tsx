"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, SEARCH_NAV_ITEM } from "@/components/app-shell/nav-items";
import { cn } from "@/lib/utils";

export function MobileBottomNav({
  projectId,
  unrepliedSignalCount,
  showSearchPipeline = false,
}: {
  projectId: string;
  unrepliedSignalCount: number;
  showSearchPipeline?: boolean;
}) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const items = showSearchPipeline ? [...NAV_ITEMS, SEARCH_NAV_ITEM] : NAV_ITEMS;

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 grid h-16 shrink-0 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden",
        showSearchPipeline ? "grid-cols-8" : "grid-cols-7"
      )}
      aria-label="Primary"
    >
      {items.map(({ segment, label, icon: Icon }) => {
        const href = `${base}/${segment}`;
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={segment}
            href={href}
            data-tour={segment === "signals" || segment === "sources" ? `nav-${segment}` : undefined}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1",
              isActive ? "text-accent" : "text-muted-foreground"
            )}
          >
            {isActive && (
              <span className="absolute top-0 h-[2px] w-8 rounded-b-full bg-accent" />
            )}
            <span className="relative">
              <Icon className="size-[19px]" />
              {segment === "signals" && unrepliedSignalCount > 0 && (
                <span className="absolute -top-1 -right-2 flex min-w-[14px] items-center justify-center rounded-full bg-accent px-1 font-mono text-[8px] leading-[14px] text-background">
                  {unrepliedSignalCount > 9 ? "9+" : unrepliedSignalCount}
                </span>
              )}
            </span>
            <span className="font-mono text-[9px] tracking-wide uppercase">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
