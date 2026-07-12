"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signupAction } from "@/app/(auth)/actions";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { HONEYPOT_FIELD, TIMING_FIELD } from "@/lib/bot-protection";
import { track } from "@/lib/analytics/posthog-client";

export function SignupForm({ callbackUrl }: { callbackUrl?: string }) {
  const [error, formAction, isPending] = useActionState(signupAction, undefined);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Captured once, at first render, so the server action can check how long
  // the form was actually open before submission — see lib/bot-protection.ts.
  const [renderedAt] = useState(() => Date.now());

  const passwordsMismatch =
    confirmTouched && confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    track("signup_started");
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setConfirmTouched(true);
    if (password !== confirmPassword) {
      event.preventDefault();
      return;
    }
    // Fired on submission attempt, not success — email_verified later in the
    // funnel is what confirms the account actually went through. `method`
    // distinguishes this from the Google button's own signup_submitted (see
    // google-signin-button.tsx), so both paths still roll up into one funnel step.
    track("signup_submitted", { method: "email" });
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
      <input type="hidden" name={TIMING_FIELD} value={renderedAt} />

      {/* Honeypot — invisible to real users, left for scripted form-fillers
          to populate. Not `type="hidden"` or `display:none`, since some bots
          specifically skip those; absolutely positioned off-screen instead. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
      >
        <label htmlFor={HONEYPOT_FIELD}>Company website</label>
        <input
          type="text"
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

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
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="••••••••••••"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
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

      <AuthField
        label="Confirm password"
        id="confirmPassword"
        name="confirmPassword"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="••••••••••••"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        onBlur={() => setConfirmTouched(true)}
        error={passwordsMismatch ? "Passwords don't match." : undefined}
      />

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <AuthSubmitButton pending={isPending} pendingLabel="Creating account…">
        Create account
      </AuthSubmitButton>
    </form>
  );
}
