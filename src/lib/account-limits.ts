import { prisma } from "@/lib/prisma";

// Server-only DB helpers for the account-wide caps in lib/limits.ts — split
// out from that file specifically because limits.ts's plain constants are
// also imported by client components (e.g. source-card.tsx, for
// CONSECUTIVE_FAILURE_ALERT_THRESHOLD); pulling prisma into that module
// broke the client bundle ("chunking context does not support external
// modules (request: node:module)").

// Total sources currently monitored (selected: true) across every project
// the account owns — the query MAX_MONITORED_SOURCES_PER_ACCOUNT is checked
// against. Centralized here (rather than duplicated at each of the 4 call
// sites that flip a source to selected: true) so the cap and the count it's
// measured against can't drift apart.
export async function countAccountMonitoredSources(userId: string): Promise<number> {
  return prisma.source.count({
    where: { selected: true, product: { userId } },
  });
}

// "Completed" projects for MAX_PROJECTS_PER_ACCOUNT — same definition
// projects/page.tsx already uses to decide what's a real, pickable project:
// not archived, and has at least one selected source (so an abandoned
// mid-onboarding draft, which is invisible in the UI, never counts against
// the cap or blocks a founder from actually finishing onboarding).
export async function countActiveProjects(userId: string): Promise<number> {
  return prisma.product.count({
    where: { userId, archivedAt: null, sources: { some: { selected: true } } },
  });
}
