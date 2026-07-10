import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SettingsSection } from "@/components/settings/settings-section";
import { NotificationToggle } from "@/components/settings/notification-toggle";
import { SignOutButton } from "@/components/settings/sign-out-button";

export const metadata: Metadata = { title: "Account settings — Getrive" };

// Account-wide settings — independent of any single project. Project-scoped
// settings (product details, Reddit connection, data export) live at
// /projects/[projectId]/settings instead.
export default async function AccountSettingsPage() {
  const session = await requireSession();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  return (
    <div className="flex w-full flex-col items-center pt-16 pb-24 md:pt-20 overflow-auto">
      <div className="flex w-full max-w-2xl flex-col gap-10 px-4 md:px-8">
        <div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Link>
          <header className="mt-4">
            <h1 className="text-2xl font-medium tracking-wide text-foreground">
              Account settings
            </h1>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Preferences for your account across all projects.
            </p>
          </header>
        </div>

        <SettingsSection title="Account" subtitle="Signed in as">
          <p className="text-sm text-foreground">{user.email}</p>
        </SettingsSection>

        <SettingsSection title="Notifications" subtitle="Alert frequency">
          <div className="flex flex-col divide-y divide-border">
            <NotificationToggle
              field="notifyNewSignal"
              label="Instant signal alerts"
              description="Email me whenever a new signal is found."
              defaultChecked={user.notifyNewSignal}
            />
            <NotificationToggle
              field="notifyWeeklyDigest"
              label="Weekly digest"
              description="A summary email of the past 7 days."
              defaultChecked={user.notifyWeeklyDigest}
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Session" subtitle="Sign out of Getrive">
          <SignOutButton />
        </SettingsSection>

        <SettingsSection title="Data & privacy" subtitle="Export or delete your data">
          <p className="text-sm text-foreground">
            Export any project&apos;s data from that project&apos;s Settings page. To permanently
            delete a single project or your entire account — including all signals, sources,
            outreach leads, and tracked links — email{" "}
            <a href="mailto:senkcsani@gmail.com" className="text-accent hover:text-foreground">
              senkcsani@gmail.com
            </a>{" "}
            and we&apos;ll take care of it. This is a manual process for now (there&apos;s no
            self-serve delete button yet), but every request is honored. See our{" "}
            <Link href="/privacy" className="text-accent hover:text-foreground">
              Privacy Policy
            </Link>{" "}
            for details on what gets deleted.
          </p>
        </SettingsSection>

        <footer className="flex gap-4 border-t border-border pt-6 font-mono text-[11px] text-muted-foreground">
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
        </footer>
      </div>
    </div>
  );
}
