import { Loader2 } from "lucide-react";

export function ReplyDraftSkeleton() {
  return (
    <section className="flex w-full flex-col gap-4">
      <h2 className="font-mono text-[13px] font-medium tracking-widest text-muted-foreground uppercase">
        Getrive AI draft
      </h2>
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-background/50 py-16">
        <Loader2 className="size-5 animate-spin text-accent" />
        <p className="font-mono text-xs text-muted-foreground">
          Writing a draft reply, tailored to this post and subreddit…
        </p>
      </div>
    </section>
  );
}
