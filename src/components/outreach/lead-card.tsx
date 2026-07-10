import { AtSign } from "lucide-react";
import type { OutreachStatus } from "@/generated/prisma/client";
import { formatRelativeTime } from "@/lib/format";
import { OutreachDraftEditor } from "@/components/outreach/outreach-draft-editor";
import { LeadStatusActions } from "@/components/outreach/lead-status-actions";

export interface LeadCardData {
  id: string;
  name: string;
  handle: string | null;
  context: string;
  draftMessage: string | null;
  draftToneNote: string | null;
  status: OutreachStatus;
  sentAt: Date | null;
  createdAt: Date;
}

export function LeadCard({
  projectId,
  lead,
  trackedUrl,
}: {
  projectId: string;
  lead: LeadCardData;
  trackedUrl: string | null;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-border bg-background/80 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-medium text-foreground">{lead.name}</h3>
            {lead.handle && (
              <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <AtSign className="size-3" />
                {lead.handle.replace(/^[@/]+/, "")}
              </span>
            )}
            <span className="font-mono text-[10px] text-muted-foreground/50">
              {formatRelativeTime(lead.createdAt)}
            </span>
          </div>
          <p className="mt-1.5 max-w-[68ch] text-[13px] leading-relaxed text-muted-foreground/80">
            {lead.context}
          </p>
        </div>
      </div>

      <OutreachDraftEditor
        projectId={projectId}
        leadId={lead.id}
        initialMessage={lead.draftMessage}
        initialToneNote={lead.draftToneNote}
        trackedUrl={trackedUrl}
      />

      <div className="flex justify-end border-t border-border/40 pt-3">
        <LeadStatusActions projectId={projectId} leadId={lead.id} status={lead.status} sentAt={lead.sentAt} />
      </div>
    </article>
  );
}
