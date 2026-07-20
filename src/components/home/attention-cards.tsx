import Link from "next/link";
import { AlertTriangle, Compass, HourglassIcon, ArrowRight } from "lucide-react";

export interface AgingSignalItem {
  id: string;
  title: string;
}

export interface FailingSourceItem {
  name: string;
  consecutiveFailures: number;
}

// The Dashboard's "Needs attention" section, reshaped into contextual cards
// that sit above the Home feed — each renders only while its condition is
// true, so a healthy project shows nothing here at all (no empty-state
// filler). These cards are also the only routine bridge from Home into
// Targeting: config is revisited by exception, not by habit.
export function AttentionCards({
  projectId,
  positioningStale,
  failingSources,
  agingSignals,
}: {
  projectId: string;
  positioningStale: boolean;
  failingSources: FailingSourceItem[];
  agingSignals: AgingSignalItem[];
}) {
  if (!positioningStale && failingSources.length === 0 && agingSignals.length === 0) return null;

  return (
    <section aria-label="Needs attention" className="flex flex-col gap-2">
      {failingSources.map((src) => (
        <AttentionCard
          key={src.name}
          href={`/projects/${projectId}/targeting#sources`}
          tone="destructive"
          icon={<AlertTriangle className="size-4" />}
          tag="Ingestion failing"
          action="Check source"
        >
          <strong className="font-medium text-foreground">{src.name}</strong> —{" "}
          {src.consecutiveFailures} failed fetch attempts in a row. This isn&apos;t just a quiet
          source.
        </AttentionCard>
      ))}

      {positioningStale && (
        <AttentionCard
          href={`/projects/${projectId}/targeting#positioning`}
          tone="accent"
          icon={<Compass className="size-4" />}
          tag="Positioning stale"
          action="Review"
        >
          <strong className="font-medium text-foreground">Your product description changed</strong>{" "}
          since the positioning statement and ICP were picked — scoring and reply drafts still use
          the old ones.
        </AttentionCard>
      )}

      {agingSignals.map((signal) => (
        <AttentionCard
          key={signal.id}
          href={`/projects/${projectId}/signals/${signal.id}`}
          tone="neutral"
          icon={<HourglassIcon className="size-4" />}
          tag="Waiting > 24h"
          action="Draft reply"
        >
          &ldquo;{signal.title}&rdquo; has no drafted reply yet.
        </AttentionCard>
      ))}
    </section>
  );
}

const TONE_STYLES = {
  destructive: {
    card: "border-destructive/30 bg-destructive/5 hover:bg-destructive/10",
    icon: "text-destructive",
    tag: "text-destructive/80",
  },
  accent: {
    card: "border-accent/40 bg-accent/5 hover:bg-accent/10",
    icon: "text-accent",
    tag: "text-accent",
  },
  neutral: {
    card: "border-border bg-background/80 hover:bg-secondary/15",
    icon: "text-muted-foreground",
    tag: "text-muted-foreground",
  },
} as const;

function AttentionCard({
  href,
  tone,
  icon,
  tag,
  action,
  children,
}: {
  href: string;
  tone: keyof typeof TONE_STYLES;
  icon: React.ReactNode;
  tag: string;
  action: string;
  children: React.ReactNode;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <Link
      href={href}
      className={`group flex items-start gap-3 rounded-xl border p-4 transition-colors md:items-center ${styles.card}`}
    >
      <span className={`mt-0.5 shrink-0 md:mt-0 ${styles.icon}`}>{icon}</span>
      <span className="min-w-0 flex-1 text-[13px] leading-snug text-muted-foreground">
        <span className={`mr-2 font-mono text-[10px] tracking-wider uppercase ${styles.tag}`}>{tag}</span>
        {children}
      </span>
      <span className="hidden shrink-0 items-center gap-1 font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition-colors group-hover:text-foreground md:flex">
        {action}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
