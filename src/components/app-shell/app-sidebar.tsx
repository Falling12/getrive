import { AuthMark } from "@/components/auth/auth-mark";
import { AccountLink } from "@/components/app-shell/account-link";
import { ProjectSwitcher, type ProjectSummary } from "@/components/app-shell/project-switcher";
import { NavList } from "@/components/app-shell/nav-list";

export function AppSidebar({
  projectId,
  projectName,
  projects,
  unrepliedSignalCount,
  email,
  image,
  showSearchPipeline = false,
}: {
  projectId: string;
  projectName: string;
  projects: ProjectSummary[];
  unrepliedSignalCount: number;
  email: string;
  image?: string | null;
  showSearchPipeline?: boolean;
}) {
  return (
    <aside className="relative z-40 hidden h-full w-[240px] shrink-0 flex-col border-r border-border bg-background/80 backdrop-blur-md md:flex">
      <div className="flex h-16 items-center px-6 pt-2">
        <AuthMark />
      </div>

      <div className="mb-2">
        <ProjectSwitcher currentProjectId={projectId} currentProjectName={projectName} projects={projects} />
      </div>

      <NavList
        projectId={projectId}
        unrepliedSignalCount={unrepliedSignalCount}
        showSearchPipeline={showSearchPipeline}
      />

      <AccountLink email={email} image={image} />
    </aside>
  );
}
