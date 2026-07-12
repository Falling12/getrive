import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, Compass, Download, ShieldCheck } from "lucide-react";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/config";
import { buildCaptureSnippet, buildReportSnippet } from "@/lib/tracking-snippet";
import { isPositioningStale } from "@/lib/services/positioning.service";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/settings/settings-section";
import { ProductDetailsForm } from "@/components/settings/product-details-form";
import { TrackingSnippetCard } from "@/components/settings/tracking-snippet-card";
import { SignupRedirectGenerator } from "@/components/settings/signup-redirect-generator";
import { DangerZone } from "@/components/settings/danger-zone";

export const metadata: Metadata = { title: "Project settings — Getrive" };

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await requireSession();
  const { projectId } = await params;

  const product = await prisma.product.findFirstOrThrow({
    where: { id: projectId, userId: session.user.id },
    include: { positioning: { select: { sourceDescription: true, sourceTargetCustomer: true } } },
  });
  const positioningStale = isPositioningStale(product, product.positioning);

  return (
    <div className="flex w-full flex-col items-center pt-16 pb-24 md:pt-0">
      <div className="flex w-full max-w-4xl flex-col gap-10 px-4 pt-8 md:px-8 md:pt-12">
        <header>
          <h1 className="text-2xl font-medium tracking-wide text-foreground">Project settings</h1>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Manage this project&apos;s product, connections, and data. For account-wide
            preferences, see your account settings.
          </p>
        </header>

        <SettingsSection title="Product details" subtitle="Core configuration for signal targeting">
          {positioningStale && (
            <div className="mb-6 flex items-start gap-3 rounded border border-accent/40 bg-accent/10 px-4 py-3">
              <AlertTriangle className="mt-[2px] size-4 shrink-0 text-accent" />
              <p className="text-[13px] leading-snug text-muted-foreground">
                <strong className="font-medium text-foreground">Positioning is out of date</strong> —
                the description below has changed since your positioning statement and ICP were
                generated.{" "}
                <Link
                  href={`/projects/${projectId}/positioning`}
                  className="text-accent underline underline-offset-2 hover:text-foreground"
                >
                  Review and regenerate it
                </Link>{" "}
                so replies, outreach, and signal scoring stay accurate.
              </p>
            </div>
          )}
          <ProductDetailsForm
            projectId={projectId}
            defaultValues={{
              name: product.name,
              description: product.description,
              targetCustomer: product.targetCustomer ?? "",
              websiteUrl: product.websiteUrl ?? "",
              signupGoal: product.signupGoal,
              currentSignupCount: product.currentSignupCount,
            }}
          />
        </SettingsSection>

        <SettingsSection title="Reddit connection" subtitle="Authentication & permissions">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <p className="text-sm text-foreground">
                {product.redditUsername
                  ? `Connected as u/${product.redditUsername}`
                  : "Not connected."}
              </p>
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-background/50 px-3 py-1.5">
                <span
                  className={`size-1.5 rounded-full ${product.redditUsername ? "bg-accent" : "bg-muted-foreground/50"}`}
                />
                <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                  {product.redditUsername ? "Connected" : "Not connected"}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-l-2 border-border py-1 pl-4">
              <p className="text-sm text-foreground">
                Reddit connection isn&apos;t available right now — Reddit closed self-serve
                developer access in late 2025/early 2026. We&apos;ll turn this on the moment a
                path back opens up.
              </p>
              <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                <strong className="font-medium text-foreground">Security note:</strong> Getrive
                only ever requests <span className="rounded border border-border px-1 py-0.5 text-accent">read</span>{" "}
                and <span className="rounded border border-border px-1 py-0.5 text-accent">comment</span> scope.
                We never request posting permission, and Getrive never posts on your behalf — every
                reply is copy-pasted and posted by you.
              </p>
            </div>

            <Button disabled className="w-fit gap-2 rounded-md" variant="outline">
              Connect Reddit account
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection title="Automatic signup tracking" subtitle="Close the attribution loop">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Option A — No-code redirect{" "}
                  <span className="ml-1 rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-accent uppercase">
                    Zero code
                  </span>
                </h3>
                <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  Paste a URL into your signup tool&apos;s existing &ldquo;redirect after
                  signup&rdquo; field — no code to write. Reports that a signup happened
                  automatically, but can&apos;t tell which specific reply drove it.
                </p>
              </div>
              <SignupRedirectGenerator
                appUrl={appUrl}
                productId={projectId}
                websiteUrl={product.websiteUrl}
              />
            </div>

            <div className="h-px w-full bg-border" />

            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Option B — Tracking snippet{" "}
                  <span className="ml-1 rounded bg-secondary/40 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                    Full attribution
                  </span>
                </h3>
                <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  Two small script tags instead of a URL. Reports automatically and keeps the
                  per-subreddit breakdown on the Users page working.
                </p>
              </div>
              <TrackingSnippetCard
                captureSnippet={buildCaptureSnippet()}
                reportSnippet={buildReportSnippet(appUrl)}
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Product tour" subtitle="Get re-oriented">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="max-w-md font-mono text-[11px] leading-relaxed text-muted-foreground">
              Walk back through the dashboard, signals, and sources — the same guided tour you saw
              right after onboarding.
            </p>
            <Button
              variant="outline"
              className="shrink-0 gap-2 rounded-md"
              render={<Link href={`/projects/${projectId}/dashboard?tour=1`} />}
              nativeButton={false}
            >
              <Compass className="size-4" />
              Retake tour
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection title="Plan & billing" subtitle="Account tier">
          <div className="flex items-center gap-4 rounded border border-border bg-secondary/10 p-4">
            <div className="flex size-10 items-center justify-center rounded-full border border-border bg-secondary/30 text-accent">
              <ShieldCheck className="size-5" />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-foreground">Early access — free</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                Your account is unrestricted and free during the beta period.
              </span>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Data export" subtitle="Your data, portable">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <p className="max-w-md font-mono text-[11px] leading-relaxed text-muted-foreground">
              Download a full archive of your product, monitored subreddits, signals, and tracked
              links as JSON.
            </p>
            <Button
              variant="outline"
              className="shrink-0 gap-2 rounded-md"
              render={<a href={`/api/settings/export?projectId=${projectId}`} download />}
              nativeButton={false}
            >
              <Download className="size-4" />
              Export JSON
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection title="Danger zone" subtitle="Archive this project">
          <DangerZone
            projectId={projectId}
            projectName={product.name}
            archivedAt={product.archivedAt}
          />
        </SettingsSection>
      </div>
    </div>
  );
}
