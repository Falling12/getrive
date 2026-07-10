import Link from "next/link";
import { AuthMark } from "@/components/auth/auth-mark";
import { ProjectSwitcher, type ProjectSummary } from "@/components/app-shell/project-switcher";

// Replaces the desktop sidebar's brand mark, project switcher, and account
// link on narrow viewports — the sidebar is `hidden` below md with nothing
// standing in for it otherwise, so there was previously no way to switch
// projects or reach account settings on mobile at all.
export function MobileTopBar({
  projectId,
  projectName,
  projects,
  email,
}: {
  projectId: string;
  projectName: string;
  projects: ProjectSummary[];
  email: string;
}) {
  const initial = email.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-3 backdrop-blur-md md:hidden">
      <Link
        href={`/projects/${projectId}/dashboard`}
        className="flex size-8 items-center justify-center rounded border border-transparent transition-colors active:border-border active:bg-secondary/30"
        aria-label="Dashboard"
      >
        <AuthMark withWordmark={false} />
      </Link>

      <ProjectSwitcher
        variant="compact"
        currentProjectId={projectId}
        currentProjectName={projectName}
        projects={projects}
      />

      <Link
        href="/settings"
        className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/40 font-mono text-xs text-foreground"
        aria-label="Account settings"
      >
        {initial}
      </Link>
    </header>
  );
}
