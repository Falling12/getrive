"use client";

import { useTransition } from "react";
import { Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  archiveProjectAction,
  unarchiveProjectAction,
} from "@/app/(app)/projects/[projectId]/settings/actions";

export function DangerZone({
  projectId,
  projectName,
  archivedAt,
}: {
  projectId: string;
  projectName: string;
  archivedAt: Date | null;
}) {
  const [isPending, startTransition] = useTransition();

  if (archivedAt) {
    return (
      <div className="flex flex-col items-start justify-between gap-4 rounded border border-border bg-secondary/10 p-4 sm:flex-row sm:items-center">
        <p className="max-w-md font-mono text-[11px] leading-relaxed text-muted-foreground">
          This project has been archived and is hidden from your project list. Its data — signals,
          subreddits, tracked links — is untouched.
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => startTransition(() => unarchiveProjectAction(projectId))}
          className="shrink-0 gap-2 rounded-md"
        >
          <RotateCcw className="size-4" />
          {isPending ? "Restoring…" : "Restore project"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center">
      <div className="flex max-w-md flex-col gap-2">
        <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
          Hides &ldquo;{projectName}&rdquo; from your project list and stops ingestion. Nothing is
          deleted — you can restore it later from this same page. There&apos;s no self-serve
          permanent-delete button yet.
        </p>
        <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
          Want this project permanently and irreversibly deleted instead — including all its
          signals, sources, outreach leads, and tracked links? Email{" "}
          <a href="mailto:senkcsani@gmail.com" className="text-accent hover:text-foreground">
            senkcsani@gmail.com
          </a>
          .
        </p>
      </div>
      <Button
        type="button"
        variant="destructive"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(`Archive "${projectName}"? You can restore it later from this page.`)) {
            return;
          }
          startTransition(() => archiveProjectAction(projectId));
        }}
        className="shrink-0 gap-2 rounded-md"
      >
        <Archive className="size-4" />
        {isPending ? "Archiving…" : "Archive project"}
      </Button>
    </div>
  );
}
