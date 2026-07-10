import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Sign up — Getrive" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <>
      <AuthCard title="Create your account" subtitle="Start listening for your first users">
        <SignupForm callbackUrl={callbackUrl} />
      </AuthCard>

      <p className="mt-6 text-center font-mono text-[10px] text-muted-foreground/70">
        By creating an account, you agree to Getrive&apos;s{" "}
        <Link href="/terms" className="border-b border-transparent pb-[1px] text-accent transition-colors hover:border-foreground hover:text-foreground">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="border-b border-transparent pb-[1px] text-accent transition-colors hover:border-foreground hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>

      <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"}
          className="ml-1 border-b border-transparent pb-[1px] text-accent transition-colors hover:border-foreground hover:text-foreground"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
