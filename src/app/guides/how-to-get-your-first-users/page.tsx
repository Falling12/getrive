import type { Metadata } from "next";
import Link from "next/link";
import { GuidePageShell, GuideJsonLd } from "@/components/guides/guide-page-shell";
import { getGuide } from "@/lib/guides";
import { SITE_NAME } from "@/lib/seo";

const guide = getGuide("how-to-get-your-first-users")!;

export const metadata: Metadata = {
  title: `${guide.title} — ${SITE_NAME}`,
  description: guide.description,
  alternates: { canonical: `/guides/${guide.slug}` },
};

// Mirrors the visible "The manual playbook" <ol> below exactly (minus
// inline links/code formatting, which HowToStep.text doesn't support) —
// structured data has to match what's actually on the page.
const HOW_TO_STEPS = [
  {
    name: "Write down the phrases someone in pain would actually type",
    text: "Write down the 5-10 phrases someone in pain would actually type — not your product category, the symptom. \"How do I find users\" beats \"lead generation software.\"",
  },
  {
    name: "Search those phrases across Reddit, Hacker News, and Google",
    text: "Search each phrase on Reddit search, Hacker News (via Algolia's HN search), and Google with site:reddit.com filters.",
  },
  {
    name: "Read the whole thread before replying",
    text: "Read the whole thread before replying. A reply that ignores context someone already gave reads as a bot, even from a human.",
  },
  {
    name: "Lead with a genuinely useful answer",
    text: "Lead with a genuinely useful answer — the kind you'd give if you had no product to mention at all. Mention your product only if it's the honest next step, and only once, near the end.",
  },
  {
    name: "Check the subreddit's self-promo rules before you post",
    text: "Check the subreddit's self-promo rules before you post. Many require a minimum comment history or restrict promotion to specific days/threads — getting this wrong gets you banned, not just downvoted.",
  },
  {
    name: "Repeat daily",
    text: "Repeat daily. The volume of relevant threads on any single day is low; the compounding value comes from consistency over weeks.",
  },
];

export default function Page() {
  return (
    <>
      <GuideJsonLd guide={guide} howToSteps={HOW_TO_STEPS} />
      <GuidePageShell guide={guide}>
        <p>
          Most advice on getting your first users boils down to &ldquo;do things that don&apos;t
          scale,&rdquo; which is true but not actionable. Here&apos;s the specific version: your
          first users aren&apos;t found by broadcasting to strangers, they&apos;re found by showing
          up in conversations that are already happening about the problem you solve.
        </p>

        <h2>Why cold outreach underperforms early on</h2>
        <p>
          A cold DM or cold email asks someone to context-switch into caring about your product.
          Someone who just posted &ldquo;does anyone know a tool that does X&rdquo; has already done
          that work for you &mdash; they&apos;re actively looking, in public, right now. Replying to
          that person converts at a completely different rate than interrupting someone who wasn&apos;t
          thinking about the problem at all. The skill isn&apos;t writing a better cold message; it&apos;s
          finding more of the first kind of person.
        </p>

        <h2>Where those conversations happen</h2>
        <ul>
          <li>
            <strong>Reddit</strong> &mdash; niche subreddits built around the exact job your product
            does, plus adjacent ones where your audience hangs out for other reasons.
          </li>
          <li>
            <strong>Hacker News</strong> &mdash; &ldquo;Ask HN&rdquo; threads and comment sections on
            posts about problems adjacent to yours.
          </li>
          <li>
            <strong>IndieHackers, Stack Exchange, Ask MetaFilter</strong> &mdash; smaller volume, but
            often higher intent, since people posting there are already asking specific,
            solution-seeking questions.
          </li>
        </ul>

        <h2>The manual playbook</h2>
        <ol>
          <li>
            Write down the 5&ndash;10 phrases someone in pain would actually type &mdash; not your
            product category, the symptom. &ldquo;How do I find users&rdquo; beats &ldquo;lead
            generation software.&rdquo;
          </li>
          <li>Search each phrase on Reddit search, Hacker News (via Algolia&apos;s HN search), and Google with <code>site:reddit.com</code> filters.</li>
          <li>
            Read the whole thread before replying. A reply that ignores context someone already gave
            reads as a bot, even from a human.
          </li>
          <li>
            Lead with a genuinely useful answer &mdash; the kind you&apos;d give if you had no product
            to mention at all. Mention your product only if it&apos;s the honest next step, and only
            once, near the end.
          </li>
          <li>
            Check the subreddit&apos;s self-promo rules before you post. Many require a minimum
            comment history or restrict promotion to specific days/threads &mdash; getting this wrong
            gets you banned, not just downvoted. See our <Link href="/guides/founder-led-sales-reddit">guide to founder-led sales on Reddit</Link> for the specifics.
          </li>
          <li>Repeat daily. The volume of relevant threads on any single day is low; the compounding value comes from consistency over weeks.</li>
        </ol>

        <h2>Where it breaks down</h2>
        <p>
          This works, but it doesn&apos;t scale by hand: checking five communities for new relevant
          threads every day, reading each one for actual fit, and drafting a non-spammy reply is
          real, repeated work. That&apos;s the exact gap {SITE_NAME} is built for &mdash; it polls
          Reddit, Hacker News, and the channels above continuously, scores each post against your
          product&apos;s actual description rather than keyword-matching, and drafts a reply for
          threads that clear a relevance bar. Nothing posts automatically; you still review and send
          every reply yourself, from your own account.
        </p>
        <p>
          If you&apos;d rather do the search-and-reply loop above without the manual overhead,{" "}
          <Link href="/signup">Getrive is free to start</Link>.
        </p>
      </GuidePageShell>
    </>
  );
}
