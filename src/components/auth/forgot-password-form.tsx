"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { requestPasswordResetAction } from "@/app/(auth)/actions";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AuthStateIcon } from "@/components/auth/auth-state-icon";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, {
    error: null,
  });

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <AuthStateIcon icon={Mail} tone="accent" pulse />
        <div className="flex flex-col gap-2">
          <h2 className="font-sans text-lg font-medium tracking-wide text-foreground">
            Check your inbox
          </h2>
          <p className="mx-auto max-w-[280px] font-mono text-[12px] leading-relaxed text-muted-foreground">
            If an account exists for that address, we&apos;ve sent a link to reset the password.
          </p>
        </div>
        <Button
          variant="outline"
          className="mt-4 h-11 w-full gap-2 rounded-md border-border text-sm hover:border-accent hover:bg-transparent hover:text-foreground"
          render={<Link href="/login" />}
          nativeButton={false}
        >
          <ArrowLeft className="size-4" />
          Return to login
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-8">
      <AuthField
        label="Email"
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="founder@startup.io"
        showReadyStatus
      />

      {state.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}

      <div className="flex flex-col gap-5">
        <AuthSubmitButton pending={isPending} pendingLabel="Sending…">
          Send reset link
        </AuthSubmitButton>

        <Link
          href="/login"
          className="text-center font-mono text-[11px] tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
