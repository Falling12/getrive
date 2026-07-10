"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(app)/actions";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() => startTransition(() => signOutAction())}
      className="w-fit gap-2 rounded-md"
    >
      <LogOut className="size-4" />
      {isPending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
