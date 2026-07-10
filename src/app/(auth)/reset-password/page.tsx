import Link from "next/link";
import type { Metadata } from "next";
import { CircleAlert, ArrowRight } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthStateIcon } from "@/components/auth/auth-state-icon";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Reset password — Getrive" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthCard>
        <div className="flex flex-col items-center gap-6 text-center">
          <AuthStateIcon icon={CircleAlert} tone="neutral" />
          <div className="flex flex-col gap-2">
            <h2 className="font-sans text-lg font-medium tracking-wide text-foreground">
              Invalid link
            </h2>
            <p className="mx-auto max-w-[280px] font-mono text-[12px] leading-relaxed text-muted-foreground">
              This reset link is missing, invalid, or has expired.
            </p>
          </div>
          <Button
            variant="outline"
            className="mt-2 h-11 w-full gap-2 rounded-md border-border text-sm hover:border-accent hover:bg-transparent hover:text-foreground"
            render={<Link href="/forgot-password" />}
            nativeButton={false}
          >
            Request new link
            <ArrowRight className="size-4 text-accent" />
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password">
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
