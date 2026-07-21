import type { Metadata } from "next";
import Link from "next/link";
import { GuidePageShell, GuideJsonLd } from "@/components/guides/guide-page-shell";
import { getGuide } from "@/lib/guides";
import { SITE_NAME } from "@/lib/seo";

const guide = getGuide("customer-discovery-for-solo-founders")!;

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
          Most customer discovery advice assumes you have a network to pull interviews from, or a
          budget for a research panel. Solo, pre-revenue, no network — the process has to be lighter
          than that, and it has to run continuously rather than as a one-time project you do before
          building, then never repeat.
        </p>

        <h2>1. Write the problem down before you look for people</h2>
        <p>
          One paragraph: who has this problem, what they&apos;re doing about it today, and why
          that&apos;s not good enough. Not a persona document — just enough specificity that you&apos;ll
          recognize the right conversation when you see it, instead of reading everything as
          potentially relevant.
        </p>

        <h2>2. Find where they already talk, not where you wish they talked</h2>
        <p>
          Skip the interview-request DMs to strangers — response rates are low and the people who do
          reply are self-selected as unusually generous with their time, not representative. Instead,
          find the subreddits, Hacker News threads, and forums where your audience already discusses
          the problem for reasons that have nothing to do with you. What they say there, unprompted,
          is more honest than what they&apos;ll say in a scheduled call with the person who built the
          thing.
        </p>

        <h2>3. Collect verbatim language, not your own summary</h2>
        <p>
          When someone describes the problem in their own words, save the exact phrase — not your
          paraphrase of it. Verbatim language is what eventually becomes your landing page copy and
          your positioning; a founder&apos;s summary of the problem and a user&apos;s actual words for
          it are reliably different, and the user&apos;s words convert better because they&apos;re what
          the next person searches for too.
        </p>

        <h2>4. Reply, don&apos;t just observe</h2>
        <p>
          Reading is discovery; replying is discovery plus a chance at a first user. If you&apos;ve
          found someone describing your exact problem, a genuinely useful reply (not a pitch — see{" "}
          <Link href="/guides/founder-led-sales-reddit">the founder-led sales guide</Link> for how to
          do this without getting flagged as spam) turns the same research pass into a distribution
          channel.
        </p>

        <h2>5. Run it weekly, not once</h2>
        <p>
          Treat this as a standing habit, not a phase you complete before building. The problem
          your users describe shifts as the market shifts and as you talk to more of them — a
          discovery pass from three months ago is stale, not archived research.
        </p>

        <p>
          The part of this that&apos;s genuinely hard to sustain by hand is step 2 at any real
          frequency — checking five-plus communities every week for new relevant threads is real,
          repeated work. {SITE_NAME} does exactly this continuously across Reddit, Hacker News, and a
          few other public communities, scoring each post against your actual product description, so
          the weekly habit doesn&apos;t depend on remembering to do it. See the{" "}
          <Link href="/guides/how-to-get-your-first-users">first-users playbook</Link> for what to do
          once a relevant thread surfaces. <Link href="/signup">Start free</Link>.
        </p>
      </GuidePageShell>
    </>
  );
}
