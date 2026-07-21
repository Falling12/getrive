import type { Metadata } from "next";
import Link from "next/link";
import { GuidePageShell, GuideJsonLd } from "@/components/guides/guide-page-shell";
import { getGuide } from "@/lib/guides";
import { SITE_NAME } from "@/lib/seo";

const guide = getGuide("cold-outreach-alternative")!;

export const metadata: Metadata = {
  title: `${guide.title} — ${SITE_NAME}`,
  description: guide.description,
  alternates: { canonical: `/guides/${guide.slug}` },
};

export default function Page() {
  return (
    <>
      <GuideJsonLd guide={guide} />
      <GuidePageShell guide={guide}>
        <p>
          Cold email and cold DMs still work at scale, with a real sales team, a real list-building
          budget, and enough volume that a low reply rate is fine. None of that describes a solo
          founder sending 30 emails a week and hearing back from one. The problem isn&apos;t your
          subject line — it&apos;s that you&apos;re asking someone to care about a problem they
          weren&apos;t thinking about, from someone they&apos;ve never heard of.
        </p>

        <h2>Why the reply rate is structurally against you</h2>
        <p>
          A cold message has to do two things at once: convince someone the problem is worth solving
          right now, and convince them you&apos;re worth trusting to solve it — both from a stranger,
          in an inbox already full of the same pitch from five other tools. Compare that to replying
          to someone who just posted &ldquo;does anyone know a tool that does X&rdquo;: the first
          problem is already solved. They told you the problem exists and that they&apos;re actively
          looking. All that&apos;s left is trust, which a genuinely useful reply builds in the same
          message it&apos;s delivered in.
        </p>

        <h2>What community-first outreach actually looks like</h2>
        <p>
          Not &ldquo;post about your product in relevant subreddits&rdquo; — that&apos;s just cold
          outreach with worse targeting and a higher chance of a ban. The actual shift is upstream of
          outreach entirely: instead of building a list and writing a pitch, you watch for the moment
          someone describes your exact problem in public, and you reply to that specific person, in
          that specific context, with a specific answer to what they actually asked. The&nbsp;
          <Link href="/guides/how-to-get-your-first-users">first-users playbook</Link> covers the
          mechanics of finding those moments; <Link href="/guides/founder-led-sales-reddit">the
          Reddit-specific guide</Link> covers how to reply without getting flagged as spam.
        </p>

        <h2>The tradeoff, honestly</h2>
        <p>
          This approach doesn&apos;t scale the way a cold email list does — you can&apos;t buy more
          volume. What it trades for that is a completely different starting trust level and a much
          higher signal-to-noise ratio per message sent. For a founder with no brand recognition and
          no list, that trade is usually the right one: ten high-context replies to people already
          looking beats two hundred cold emails to people who weren&apos;t.
        </p>
        <p>
          The bottleneck this approach runs into is volume of discovery, not willingness to write —
          finding those moments across enough communities, every day, by hand, is the part that stops
          scaling first. {SITE_NAME} exists for that specific gap: it watches Reddit, Hacker News, and
          a handful of other public communities continuously and surfaces the threads that actually
          match your product, so the search isn&apos;t the bottleneck anymore.{" "}
          <Link href="/signup">Start free</Link>.
        </p>
      </GuidePageShell>
    </>
  );
}
