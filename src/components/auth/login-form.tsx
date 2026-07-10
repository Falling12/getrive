"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { loginAction } from "@/app/(auth)/actions";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [error, formAction, isPending] = useActionState(loginAction, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex w-full flex-col gap-6">
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}

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

      <AuthField
        label="Password"
        id="password"
        name="password"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        required
        placeholder="••••••••••••"
        labelAside={
          <Link
            href="/forgot-password"
            className="font-mono text-[10px] tracking-widest text-accent uppercase transition-colors hover:text-foreground"
          >
            Forgot?
          </Link>
        }
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-0 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
      />

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <AuthSubmitButton pending={isPending} pendingLabel="Signing in…">
        Sign in
      </AuthSubmitButton>
    </form>
  );
}
