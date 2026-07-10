import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/auth/google-icon";
import { signInWithGoogleAction } from "@/app/(auth)/actions";

// Server-rendered — no client state, just a form posting to a server
// action, same as the credentials forms' underlying <form action={...}>.
export function GoogleSignInButton({ callbackUrl }: { callbackUrl?: string }) {
  return (
    <form action={signInWithGoogleAction}>
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
