"use client";

import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/auth/google-icon";
import { signInWithGoogleAction } from "@/app/(auth)/actions";
import { track } from "@/lib/analytics/posthog-client";

// This same button is used on both /signup and /login (Google's own flow
// doesn't distinguish the two — an unrecognized Google account just gets
// created via the adapter either way). `page` is only here so the signup
// funnel's signup_submitted event fires for the signup page's click and not
// a login page click from a returning user, mirroring the "attempt, not
// success" semantics signup-form.tsx already uses for the credentials path.
export function GoogleSignInButton({
  callbackUrl,
  page,
}: {
  callbackUrl?: string;
  page: "signup" | "login";
}) {
  return (
    <form
      action={signInWithGoogleAction}
      onSubmit={() => {
        if (page === "signup") track("signup_submitted", { method: "google" });
      }}
    >
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
      <Button
        type="submit"
        variant="outline"
        size="lg"
        className="h-11 w-full gap-2 rounded-md text-sm"
      >
        <GoogleIcon className="size-4" />
        Continue with Google
      </Button>
    </form>
  );
}
