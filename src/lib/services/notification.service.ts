import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  signalAlertEmailTemplate,
  weeklyDigestEmailTemplate,
  type DigestProjectSummary,
} from "@/lib/email-templates";
import { appUrl } from "@/lib/config";
import { formatSourceLabel } from "@/lib/sources/format";
import type { SourceType } from "@/generated/prisma/client";

const DIGEST_LIST_CAP = 5;

const SNIPPET_LENGTH = 160;

// Called from poll.ts right after a Signal is created. Takes plain data
// rather than IDs to re-query, since the caller already has the product/user
// loaded from the same batch (avoids N+1 queries in the polling hot loop).
export async function notifySignalCreated({
  userEmail,
  notifyNewSignal,
  productId,
  productName,
  sourceType,
  sourceName,
  signalId,
  title,
  body,
}: {
  userEmail: string;
  notifyNewSignal: boolean;
  productId: string;
  productName: string;
  sourceType: SourceType;
  sourceName: string;
  signalId: string;
  title: string;
  body: string;
}): Promise<void> {
  if (!notifyNewSignal) return;

  const snippet = body.length > SNIPPET_LENGTH ? `${body.slice(0, SNIPPET_LENGTH)}…` : body;
  const { subject, html } = signalAlertEmailTemplate({
    productName,
    sourceLabel: formatSourceLabel(sourceType, sourceName),
    title,
    snippet,
    signalUrl: `${appUrl}/projects/${productId}/signals/${signalId}`,
  });
  await sendEmail({ to: userEmail, subject, html });
}

// Invoked by the weekly-digest cron. Per-user, per-project stats over the
// trailing 7 days — mirrors the Dashboard page's queries but windowed to a
// week for repliesSent/usersAcquired too (the Dashboard itself shows
// all-time replies), since the digest is framed as "your week in review".
//
// Beyond the stat counts, this also surfaces the actual open work queue —
// unreplied Signals, Sources that just crossed into postable access, and
// drafted-but-unsent Outreach messages — the same three query shapes the
// (now-reverted) This Week page used, re-wired into the digest instead of a
// standalone page. Unlike the stat counts, these three are current-standing
// backlog, not "new this week" — an unreplied signal from three weeks ago
// still belongs in "needs your attention" — except the "just unlocked"
// nudge, which IS time-windowed to this week specifically (via Source's
// `updatedAt`), since an account that's been postable for months shouldn't
// re-announce itself every single digest.
export async function sendWeeklyDigests(): Promise<{ usersNotified: number }> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: { notifyWeeklyDigest: true, products: { some: {} } },
    select: {
      email: true,
      products: { select: { id: true, name: true } },
    },
  });

  let usersNotified = 0;

  for (const user of users) {
    const projects: DigestProjectSummary[] = await Promise.all(
      user.products.map(async (product) => {
        const unrepliedSignalsWhere = {
          source: { productId: product.id },
          replied: false,
          dismissed: false,
        } as const;
        const unsentOutreachWhere = {
          productId: product.id,
          status: "DRAFT",
          draftMessage: { not: null },
        } as const;

        const [
          signalsThisWeek,
          repliesSent,
          usersAcquired,
          unrepliedSignals,
          unrepliedSignalsTotal,
          justReadySources,
          unsentOutreach,
          unsentOutreachTotal,
        ] = await Promise.all([
          prisma.signal.count({
            where: {
              source: { productId: product.id },
              createdAt: { gte: oneWeekAgo },
            },
          }),
          prisma.signal.count({
            where: {
              source: { productId: product.id },
              replied: true,
              repliedAt: { gte: oneWeekAgo },
            },
          }),
          prisma.signup.count({
            where: {
              productId: product.id,
              trackedLinkId: { not: null },
              createdAt: { gte: oneWeekAgo },
            },
          }),
          prisma.signal.findMany({
            where: unrepliedSignalsWhere,
            include: { source: true },
            orderBy: [{ relevanceScore: "desc" }, { postedAt: "desc" }],
            take: DIGEST_LIST_CAP,
          }),
          prisma.signal.count({ where: unrepliedSignalsWhere }),
          // HN sources are created already-READY (no gate to "unlock"), so
          // they're excluded here — same reasoning as the Dashboard's own
          // readySources query.
          prisma.source.findMany({
            where: {
              productId: product.id,
              selected: true,
              type: "REDDIT_SUBREDDIT",
              karmaStatus: "READY",
              updatedAt: { gte: oneWeekAgo },
            },
            select: { name: true, type: true },
          }),
          prisma.lead.findMany({
            where: unsentOutreachWhere,
            orderBy: { createdAt: "desc" },
            take: DIGEST_LIST_CAP,
          }),
          prisma.lead.count({ where: unsentOutreachWhere }),
        ]);

        return {
          name: product.name,
          signalsThisWeek,
          repliesSent,
          usersAcquired,
          dashboardUrl: `${appUrl}/projects/${product.id}/dashboard`,
          signalsUrl: `${appUrl}/projects/${product.id}/signals`,
          sourcesUrl: `${appUrl}/projects/${product.id}/sources`,
          outreachUrl: `${appUrl}/projects/${product.id}/outreach`,
          unrepliedSignals: unrepliedSignals.map((signal) => ({
            title: signal.title,
            sourceLabel: formatSourceLabel(signal.source.type, signal.source.name),
            relevanceScore: signal.relevanceScore,
            url: `${appUrl}/projects/${product.id}/signals/${signal.id}`,
          })),
          unrepliedSignalsTotal,
          justReadySources: justReadySources.map((s) => formatSourceLabel(s.type, s.name)),
          unsentOutreach: unsentOutreach.map((lead) => ({ name: lead.name })),
          unsentOutreachTotal,
        };
      })
    );

    // Skip a wholly-empty week — nothing new AND nothing pending isn't
    // worth the send.
    const hasActivity = projects.some(
      (p) =>
        p.signalsThisWeek > 0 ||
        p.repliesSent > 0 ||
        p.usersAcquired > 0 ||
        p.unrepliedSignalsTotal > 0 ||
        p.justReadySources.length > 0 ||
        p.unsentOutreachTotal > 0
    );
    if (!hasActivity) continue;

    const { subject, html } = weeklyDigestEmailTemplate({ projects });
    await sendEmail({ to: user.email, subject, html });
    usersNotified += 1;
  }

  return { usersNotified };
}
