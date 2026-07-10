import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in — Getrive" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <>
      <AuthCard title="Sign in" subtitle="Access your Getrive account">
        <LoginForm callbackUrl={callbackUrl} />
      </AuthCard>

      <p className="mt-8 text-center font-mono text-[11px] text-muted-foreground">
        New to Getrive?{" "}
        <Link
          href={callbackUrl ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/signup"}
          className="ml-1 border-b border-transparent pb-[1px] text-accent transition-colors hover:border-foreground hover:text-foreground"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
