import { cn } from "@/lib/utils";

// Shared by AccountLink (desktop sidebar) and MobileNavDrawer (mobile header)
// — both render the same "avatar linking to /settings" concept, just at
// different sizes. Google sign-in populates `image` (see auth.ts's Google
// profile() mapping); credentials-only accounts never have one, so the
// email-initial circle is the permanent fallback, not a loading state.
export function UserAvatar({
  email,
  image,
  className,
}: {
  email: string;
  image?: string | null;
  className?: string;
}) {
  if (image) {
    return (
      // Plain <img>, not next/image: a small external avatar from whichever
      // OAuth provider, not worth wiring up remote-pattern config for.
      // Google's own image CDN 403s without a referrer policy of "no-referrer"
      // or "same-origin" in some embedding contexts.
      <img
        src={image}
        alt=""
        referrerPolicy="no-referrer"
        className={cn("rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full border border-border bg-secondary/40 font-mono text-xs text-foreground",
        className
      )}
    >
      {email.charAt(0).toUpperCase()}
    </span>
  );
}
