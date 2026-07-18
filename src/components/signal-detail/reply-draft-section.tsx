import { notFound } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { generateReply } from "@/lib/ai/reply-generation";
import { describeSelectedIcp } from "@/lib/services/positioning.service";
import { getOrCreateSignalTrackedLink, buildTrackedUrl } from "@/lib/tracked-links";
import { ReplyEditor } from "@/components/signal-detail/reply-editor";

// Deliberately its own async Server Component, rendered inside a <Suspense>
// boundary from the page — the reply draft is the one slow part of this
// page (a real Claude call on first view), so it streams in on its own
// instead of blocking the post content the founder actually came to read.
export async function ReplyDraftSection({
  projectId,
  signalId,
  userId,
}: {
  projectId: string;
  signalId: string;
  userId: string;
}) {
  const signal = await prisma.signal.findFirst({
    where: { id: signalId, source: { product: { userId } } },
    include: { source: { include: { product: { include: { positioning: true } } } } },
  });
  if (!signal) notFound();

  if (!signal.replyDraft) {
    // Caught here rather than left to propagate — this is a Server
    // Component with no nested error.tsx boundary anywhere in the app, so an
    // unhandled throw would blow away the entire page (global-error.tsx) for
    // what's otherwise just one failed AI call. Falling back to an empty
    // draft lets the founder retry via the existing, already-error-handled
    // "Regenerate angle" button instead.
    try {
      const { reply, toneNote } = await generateReply({
        productName: signal.source.product.name,
        productDescription: signal.source.product.description,
        positioningStatement: signal.source.product.positioning?.selectedStatement,
        icpContext:
          describeSelectedIcp(signal.source.product.positioning) ??
          signal.source.product.targetCustomer,
        sourceType: signal.source.type,
        sourceName: signal.source.name,
        postTitle: signal.title,
        postBody: signal.body,
      });
      await prisma.signal.update({
        where: { id: signal.id },
        data: { replyDraft: reply, replyToneNote: toneNote },
      });
      signal.replyDraft = reply;
      signal.replyToneNote = toneNote;
    } catch (error) {
      console.error("Reply generation failed", error);
      Sentry.captureException(error, { tags: { feature: "reply-generation" } });
      signal.replyToneNote = "Couldn't generate a draft automatically — click Regenerate to try again.";
    }
  }

  const trackedLink = await getOrCreateSignalTrackedLink({
    productId: signal.source.product.id,
    signalId: signal.id,
    sourceType: signal.source.type,
    sourceName: signal.source.name,
    postTitle: signal.title,
  });
  const trackedUrl = buildTrackedUrl(signal.source.product.websiteUrl, trackedLink);

  return (
    <section className="flex w-full flex-col gap-4">
      <h2 className="font-mono text-[13px] font-medium tracking-widest text-muted-foreground uppercase">
        Getrive AI draft
      </h2>
      <ReplyEditor
        projectId={projectId}
        signalId={signal.id}
        initialReply={signal.replyDraft ?? ""}
        initialToneNote={signal.replyToneNote ?? ""}
        trackedUrl={trackedUrl}
        postUrl={signal.permalink}
      />
    </section>
  );
}
