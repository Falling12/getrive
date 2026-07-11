import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { verifyEmailToken } from "@/lib/services/user.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthBackdrop } from "@/components/auth/auth-backdrop";
import { AuthMark } from "@/components/auth/auth-mark";
import { brandSans, brandMono } from "@/lib/fonts";
import { EventOnMount } from "@/components/analytics/event-on-mount";

export const metadata: Metadata = {
  title: "Verify email — Getrive",
  robots: { index: false, follow: false },
};

// Deliberately outside the (auth) route group: unlike login/signup, this must
// work for a user who's already signed in (the common case — they sign up,
// land on onboarding, then click the link in their inbox).
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailToken(token) : { success: false };

  return (
    <div
      className={`${brandSans.variable} ${brandMono.variable} theme-getrive relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-12 font-sans text-foreground`}
    >
      <AuthBackdrop />

      <div
        className="animate-[auth-enter_0.8s_cubic-bezier(0.175,0.885,0.32,1)_forwards] relative z-10 flex w-full max-w-[400px] flex-col items-center text-center opacity-0"
        style={{ animationDelay: "0.1s" }}
      >
        <AuthMark withWordmark={false} className="mb-8 justify-center" />

        <Card className="w-full rounded-xl border border-border shadow-[0_0_20px_-4px_var(--accent)]">
          <CardContent className="flex flex-col items-center gap-4 px-8 py-10 text-center sm:px-10">
            {result.success ? (
              <>
                <EventOnMount event="email_verified" />
                <CheckCircle2 className="size-10 text-accent" />
                <h1 className="font-sans text-xl font-medium tracking-wide text-foreground">
                  Email confirmed
                </h1>
                <p className="text-sm text-muted-foreground">
                  Your email address has been verified.
                </p>
              </>
            ) : (
              <>
                <XCircle className="size-10 text-destructive" />
                <h1 className="font-sans text-xl font-medium tracking-wide text-destructive">
                  Invalid or expired link
                </h1>
                <p className="text-sm text-muted-foreground">
                  This verification link no longer works. You can request a new one from Settings.
                </p>
              </>
            )}
            <Button
              className="mt-2 h-11 w-full rounded-md text-sm"
              render={<Link href="/onboarding" />}
              nativeButton={false}
            >
              Continue to Getrive
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
