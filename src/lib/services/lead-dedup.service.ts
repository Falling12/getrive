import { prisma } from "@/lib/prisma";
import { formatSourceLabel } from "@/lib/sources/format";

export interface KnownLeadMatch {
  detail: string;
}

function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/^[@/]+/, "");
}

// Once outreach involves named, specific people, the same real person could
// plausibly show up twice — found manually via one channel and pasted into
// Outreach, then later post something on Reddit/HN that becomes a Signal
// (or vice versa) — risking a second, redundant, "didn't we already talk?"
// contact. This is intentionally loose (case-insensitive substring-free
// exact match on a founder-typed handle, no cross-platform identity
// resolution) — a simple username index is enough for MVP; it warns, it
// doesn't block, since the founder may have good reason to reach out again
// (a different channel, a follow-up after no response).
export async function findKnownLeadMatches(
  productId: string,
  handle: string
): Promise<KnownLeadMatch[]> {
  const normalized = normalizeHandle(handle);
  if (!normalized) return [];

  const [existingLeads, signalsFromSameAuthor] = await Promise.all([
    prisma.lead.findMany({
      where: { productId, handle: { not: null } },
      select: { name: true, handle: true, status: true, createdAt: true },
    }),
    prisma.signal.findMany({
      where: { source: { productId } },
      select: { author: true, replied: true, createdAt: true, source: { select: { type: true, name: true } } },
    }),
  ]);

  const matches: KnownLeadMatch[] = [];

  for (const lead of existingLeads) {
    if (lead.handle && normalizeHandle(lead.handle) === normalized) {
      matches.push({
        detail: `Already added as an Outreach lead ("${lead.name}", status: ${lead.status.toLowerCase().replace("_", " ")}).`,
      });
    }
  }

  for (const signal of signalsFromSameAuthor) {
    if (normalizeHandle(signal.author) === normalized) {
      const sourceLabel = formatSourceLabel(signal.source.type, signal.source.name);
      matches.push({
        detail: signal.replied
          ? `Already replied to their post in ${sourceLabel}.`
          : `Posted a signal in ${sourceLabel} that hasn't been replied to yet.`,
      });
    }
  }

  return matches;
}
