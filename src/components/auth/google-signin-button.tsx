"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/auth/google-icon";
import { signInWithGoogleAction } from "@/app/(auth)/actions";
import { track } from "@/lib/analytics/posthog-client";

// useFormStatus only reports the enclosing <form>'s pending state from a
// descendant component, not from the component that renders the <form>
// itself — hence this split. Needed because signInWithGoogleAction redirects
// via a thrown NEXT_REDIRECT rather than returning state, so useActionState
// isn't an option here the way it is for the credentials form.
function GoogleButtonContent() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="lg"
      disabled={pending}
      className="h-11 w-full gap-2 rounded-md text-sm"
    >
      <GoogleIcon className="size-4" />
      {pending ? "Redirecting to Google…" : "Continue with Google"}
    </Button>
  );
}

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
      <GoogleButtonContent />
    </form>
  );
}
