import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { MobileTopBar } from "@/components/app-shell/mobile-top-bar";
import { MobileBottomNav } from "@/components/app-shell/mobile-bottom-nav";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const session = await requireSession();
  const { projectId } = await params;

  const [project, projects, unrepliedSignalCount] = await Promise.all([
    prisma.product.findFirst({
      where: { id: projectId, userId: session.user.id },
      select: { name: true },
    }),
    // Only fully-onboarded, non-archived projects show up in the switcher —
    // a product with no selected sources yet is an abandoned/in-progress
    // draft (e.g. from a retried onboarding submission), not a real project.
    prisma.product.findMany({
      where: {
        userId: session.user.id,
        archivedAt: null,
        sources: { some: { selected: true } },
      },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.signal.count({
      where: { source: { productId: projectId }, replied: false, dismissed: false },
    }),
  ]);

  if (!project) notFound();

  return (
    <>
      <AppSidebar
        projectId={projectId}
        projectName={project.name}
        projects={projects}
        unrepliedSignalCount={unrepliedSignalCount}
        email={session.user.email ?? ""}
      />
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <MobileTopBar
          projectId={projectId}
          projectName={project.name}
          projects={projects}
          email={session.user.email ?? ""}
        />
        <main className="relative z-10 flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
        <MobileBottomNav projectId={projectId} unrepliedSignalCount={unrepliedSignalCount} />
      </div>
    </>
  );
}
