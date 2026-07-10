"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthMark } from "@/components/auth/auth-mark";
import { AccountLink } from "@/components/app-shell/account-link";
import { ProjectSwitcher, type ProjectSummary } from "@/components/app-shell/project-switcher";
import { NAV_ITEMS } from "@/components/app-shell/nav-items";
import { cn } from "@/lib/utils";

export function AppSidebar({
  projectId,
  projectName,
  projects,
  unrepliedSignalCount,
  email,
  image,
}: {
  projectId: string;
  projectName: string;
  projects: ProjectSummary[];
  unrepliedSignalCount: number;
  email: string;
  image?: string | null;
}) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <aside className="relative z-40 hidden h-full w-[240px] shrink-0 flex-col border-r border-border bg-background/80 backdrop-blur-md md:flex">
      <div className="flex h-16 items-center px-6 pt-2">
        <AuthMark />
      </div>

      <div className="mb-2">
        <ProjectSwitcher currentProjectId={projectId} currentProjectName={projectName} projects={projects} />
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ segment, label, icon: Icon }) => {
          const href = `${base}/${segment}`;
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={segment}
              href={href}
              className={cn(
                "relative flex items-center justify-between rounded px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary/40 text-foreground"
                  : "text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
              )}
            >
              {isActive && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />}
              <span className="flex items-center gap-3">
                <Icon className={cn("size-[18px]", isActive && "text-accent")} />
                {label}
              </span>
              {segment === "signals" && unrepliedSignalCount > 0 && (
                <span className="rounded bg-accent/20 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                  {unrepliedSignalCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <AccountLink email={email} image={image} />
    </aside>
  );
}
