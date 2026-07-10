"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Check } from "lucide-react";
import { resetPasswordAction } from "@/app/(auth)/actions";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { AuthStateIcon } from "@/components/auth/auth-state-icon";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, { error: null });
  const [showPassword, setShowPassword] = useState(false);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <AuthStateIcon icon={Check} tone="accent" />
        <div className="flex flex-col gap-2">
          <h2 className="font-sans text-lg font-medium tracking-wide text-foreground">
            Password updated
          </h2>
          <p className="mx-auto max-w-[280px] font-mono text-[12px] leading-relaxed text-muted-foreground">
            Your password has been reset.
          </p>
        </div>
        <Button
          size="lg"
          className="h-11 w-full gap-2 rounded-md text-sm"
          render={<Link href="/login" />}
          nativeButton={false}
        >
          Go to sign in
        </Button>
      </div>
    );
  }

  const toggle = (
    <button
      type="button"
      onClick={() => setShowPassword((value) => !value)}
      aria-label={showPassword ? "Hide password" : "Show password"}
      className="absolute top-1/2 right-0 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
    >
      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-6">
      <input type="hidden" name="token" value={token} />

      <AuthField
        label="New password"
        id="password"
        name="password"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="••••••••••••"
        trailing={toggle}
      />

      <AuthField
        label="Confirm new password"
        id="confirmPassword"
        name="confirmPassword"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="••••••••••••"
      />

      {state.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}

      <AuthSubmitButton pending={isPending} pendingLabel="Saving…">
        Save new password
      </AuthSubmitButton>
    </form>
  );
}
