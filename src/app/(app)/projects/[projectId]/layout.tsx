import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isUnlimitedAccount } from "@/lib/limits";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { MobileNavDrawer } from "@/components/app-shell/mobile-nav-drawer";
import { ProductTour } from "@/components/tour/product-tour";

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

  // The search-intelligence pipeline nav item is allowlist-only (see
  // lib/limits.ts's UNLIMITED_ACCOUNT_EMAILS) — computed here, server-side,
  // and passed down as a plain boolean rather than having AppSidebar/
  // MobileBottomNav import the allowlist themselves, which would ship the
  // actual email addresses into the client JS bundle for every founder.
  const showSearchPipeline = isUnlimitedAccount(session.user.email);

  return (
    <>
      <ProductTour />
      <AppSidebar
        projectId={projectId}
        projectName={project.name}
        projects={projects}
        unrepliedSignalCount={unrepliedSignalCount}
        email={session.user.email ?? ""}
        image={session.user.image}
        showSearchPipeline={showSearchPipeline}
      />
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <MobileNavDrawer
          projectId={projectId}
          projectName={project.name}
          projects={projects}
          unrepliedSignalCount={unrepliedSignalCount}
          email={session.user.email ?? ""}
          image={session.user.image}
          showSearchPipeline={showSearchPipeline}
        />
        <main className="relative z-10 flex-1 overflow-y-auto">{children}</main>
      </div>
    </>
  );
}
