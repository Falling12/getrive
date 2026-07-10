import { CheckCircle2, Eye, OctagonAlert } from "lucide-react";
import type { KarmaStatus } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

const STYLES: Record<KarmaStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  READY: { label: "Ready", icon: CheckCircle2, className: "border-accent/30 bg-accent/10 text-accent" },
  WATCH: {
    label: "Watch",
    icon: Eye,
    className: "border-muted-foreground/30 bg-muted-foreground/10 text-muted-foreground",
  },
  BLOCKED: {
    label: "Blocked",
    icon: OctagonAlert,
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

export function KarmaStatusBadge({ status }: { status: KarmaStatus }) {
  const { label, icon: Icon, className } = STYLES[status];
  return (
    <div className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1", className)}>
      <Icon className="size-3.5" />
      <span className="font-mono text-[10px] font-semibold tracking-widest uppercase">{label}</span>
    </div>
  );
}
