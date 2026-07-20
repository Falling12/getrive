import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Layers, Plus, ArrowRight } from "lucide-react";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Your projects — Getrive" };

// The canonical post-login landing spot (see (auth)/actions.ts's
// safeCallbackUrl) — self-routes from there without callers needing to know
// which state the account is in: no completed project yet -> onboarding,
// exactly one -> straight into its dashboard, more than one -> this picker.
// With MAX_PROJECTS_PER_ACCOUNT capped at 1 (see lib/limits.ts), the picker
// itself is effectively unreachable today, but stays in place for if that
// cap is ever raised.
export default async function ProjectsPage() {
  const session = await requireSession();

  const projects = await prisma.product.findMany({
    where: {
      userId: session.user.id,
      archivedAt: null,
      sources: { some: { selected: true } },
    },
    select: { id: true, name: true, description: true },
    orderBy: { createdAt: "asc" },
  });

  if (projects.length === 0) redirect("/onboarding");
  if (projects.length === 1) redirect(`/projects/${projects[0].id}/home`);

  return (
    <div className="flex w-full flex-col items-center pt-16 pb-16 md:pt-24">
      <div className="flex w-full max-w-2xl flex-col gap-8 px-4 md:px-8">
        <header>
          <h1 className="text-2xl font-medium tracking-wide text-foreground">Your projects</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Pick a project to continue, or start a new one.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}/home`}
              className="group flex items-center gap-4 rounded-lg border border-border bg-background/80 p-5 transition-colors hover:border-accent/40"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded border border-border bg-secondary/40">
                <Layers className="size-4 text-accent" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium text-foreground">{project.name}</span>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {project.description}
                </span>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
            </Link>
          ))}

          <Link
            href="/onboarding"
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 p-5 font-mono text-xs tracking-wider text-muted-foreground uppercase transition-colors hover:border-muted-foreground/50 hover:text-foreground"
          >
            <Plus className="size-3.5" />
            New project
          </Link>
        </div>
      </div>
    </div>
  );
}
