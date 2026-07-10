import Link from "next/link";
import { Settings } from "lucide-react";
import { UserAvatar } from "@/components/app-shell/user-avatar";

// The account entry point (avatar + email + gear) — links out to the
// global, project-independent /settings page (account prefs, sign out).
// Distinct from the per-project "Settings" nav item, which manages that
// one project's product details/Reddit connection/data export.
export function AccountLink({ email, image }: { email: string; image?: string | null }) {
  return (
    <div className="mt-auto p-4">
      <div className="mb-4 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
      <Link
        href="/settings"
        className="group flex w-full items-center gap-3 rounded-md border border-transparent p-2 text-left transition-all hover:border-border/50 hover:bg-secondary/20"
      >
        <UserAvatar
          email={email}
          image={image}
          className="relative size-8 shrink-0 overflow-hidden border border-border"
        />
        <span className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="block truncate font-mono text-[10px] leading-tight text-muted-foreground">
            {email}
          </span>
        </span>
        <Settings className="size-4 shrink-0 text-muted-foreground transition-all duration-300 group-hover:rotate-90 group-hover:text-foreground" />
      </Link>
    </div>
  );
}
