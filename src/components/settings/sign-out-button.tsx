"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(app)/actions";
import { resetIdentity } from "@/lib/analytics/posthog-client";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() => {
        // Otherwise a shared/kiosk device would keep merging the next
        // person who logs in into this session's already-identified profile.
        resetIdentity();
        startTransition(() => signOutAction());
      }}
      className="w-fit gap-2 rounded-md"
    >
      <LogOut className="size-4" />
      {isPending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
