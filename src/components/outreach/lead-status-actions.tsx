"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, MessageSquareReply, XCircle } from "lucide-react";
import type { OutreachStatus } from "@/generated/prisma/client";
import { formatRelativeTime } from "@/lib/format";
import {
  markLeadOutcomeAction,
  markLeadSentAction,
} from "@/app/(app)/projects/[projectId]/outreach/actions";

export function LeadStatusActions({
  projectId,
  leadId,
  status,
  sentAt,
}: {
  projectId: string;
  leadId: string;
  status: OutreachStatus;
  sentAt: Date | null;
}) {
  const [localStatus, setLocalStatus] = useState(status);
  const [localSentAt, setLocalSentAt] = useState(sentAt);
  const [isPending, startTransition] = useTransition();

  if (localStatus === "RESPONDED" || localStatus === "NO_RESPONSE") {
    return (
      <div
        className={`flex items-center gap-1.5 rounded border px-3 py-2 font-mono text-[11px] tracking-wider uppercase ${
          localStatus === "RESPONDED"
            ? "border-accent/20 bg-accent/10 text-accent"
            : "border-border bg-secondary/10 text-muted-foreground"
        }`}
      >
        {localStatus === "RESPONDED" ? (
          <CheckCircle2 fill="currentColor" className="size-3.5" />
        ) : (
          <XCircle className="size-3.5" />
        )}
        {localStatus === "RESPONDED" ? "Responded" : "No response"}
      </div>
    );
  }

  if (localStatus === "SENT") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] text-muted-foreground/70">
          Sent {localSentAt ? formatRelativeTime(localSentAt) : "recently"}
        </span>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await markLeadOutcomeAction(projectId, leadId, "RESPONDED");
              setLocalStatus("RESPONDED");
            })
          }
          className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
        >
          <MessageSquareReply className="size-3.5" />
          Responded
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await markLeadOutcomeAction(projectId, leadId, "NO_RESPONSE");
              setLocalStatus("NO_RESPONSE");
            })
          }
          className="rounded border border-border px-3 py-1.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground disabled:opacity-50"
        >
          No response
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markLeadSentAction(projectId, leadId);
          setLocalStatus("SENT");
          setLocalSentAt(new Date());
        })
      }
      className="rounded-full px-5 py-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase shadow-[inset_0_0_0_1px_var(--border)] transition-all hover:text-foreground hover:shadow-[inset_0_0_0_1px_var(--accent)] disabled:opacity-50"
    >
      {isPending ? "Saving…" : "Mark as sent"}
    </button>
  );
}
