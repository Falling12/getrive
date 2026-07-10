import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthStateIcon({
  icon: Icon,
  tone = "neutral",
  pulse = false,
}: {
  icon: LucideIcon;
  tone?: "accent" | "neutral";
  pulse?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative mb-2 flex size-16 items-center justify-center rounded-full",
        tone === "accent"
          ? "border border-accent/30 bg-accent/10 text-foreground shadow-[0_0_30px_rgba(74,106,94,0.2)]"
          : "border border-muted-foreground/20 bg-foreground/5 text-muted-foreground"
      )}
    >
      <Icon className="relative z-10 size-7" />
      {pulse && <span className="absolute inset-0 animate-ping rounded-full border border-accent/30" />}
    </div>
  );
}
