import type { Metadata } from "next";
import Link from "next/link";
import { GuidePageShell, GuideJsonLd } from "@/components/guides/guide-page-shell";
import { getGuide } from "@/lib/guides";
import { SITE_NAME } from "@/lib/seo";

const guide = getGuide("hacker-news-monitoring-for-leads")!;

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
          &ldquo;Monitoring&rdquo; sounds like it requires infrastructure, but you can build a
          serviceable version of it today with search operators and free public APIs &mdash; before
          deciding whether it&apos;s worth automating.
        </p>

        <h2>Hacker News: Algolia&apos;s search API</h2>
        <p>
          HN&apos;s own search is limited, but Algolia indexes every post and comment and exposes it
          at{" "}
          <a href="https://hn.algolia.com/" target="_blank" rel="noopener noreferrer">hn.algolia.com</a>{" "}
          with a free public API behind it. Sort by &ldquo;Date&rdquo; instead of relevance to catch
          new posts as they appear, and search comments (not just post titles) &mdash; most
          problem-statements worth replying to are buried in a comment thread, not the headline. You
          can bookmark a saved search URL per phrase and check it daily, or build a tiny script
          against the API if you want it pushed to you.
        </p>

        <h2>Reddit: RSS, not the app</h2>
        <p>
          Every subreddit and every search query has an RSS feed (append <code>.rss</code> to most
          Reddit URLs), which you can pipe into any feed reader for a passive stream instead of
          checking manually. This is slower to set up than it sounds worth, but it&apos;s the only
          fully free, no-login way to get continuous coverage of a subreddit without hitting Reddit&apos;s
          bot-detection on unauthenticated API access.
        </p>

        <h2>IndieHackers, Stack Exchange, Ask MetaFilter</h2>
        <p>
          Lower volume than Reddit or HN, but worth including if your audience overlaps: IndieHackers
          has a public feed, Stack Exchange sites expose a full public API per-site, and Ask
          MetaFilter has an RSS feed for new questions. The value here is that questions posted to
          these are almost always explicit asks &mdash; less inference required to tell if a post is
          relevant.
        </p>

        <h2>Scoring relevance is the actual hard part</h2>
        <p>
          Once you have a stream of posts, the bottleneck stops being discovery and becomes judgment:
          most posts that match a keyword aren&apos;t actually relevant, and reading every one to find
          the handful that are is what makes manual monitoring stop scaling around the second or
          third channel. This is the part that&apos;s genuinely hard to do well by hand at volume
          &mdash; keyword filters catch too much noise, and reading everything doesn&apos;t scale past
          a channel or two.
        </p>
        <p>
          {SITE_NAME} runs this same search across Reddit, Hacker News, IndieHackers, Stack Exchange,
          and Ask MetaFilter continuously, but scores each post by reading it against your actual
          product description rather than matching keywords &mdash; so a post using different words
          for the same problem still surfaces, and a post that happens to contain your keyword but
          isn&apos;t actually relevant gets filtered out before it reaches you. See the{" "}
          <Link href="/guides/how-to-get-your-first-users">first-users playbook</Link> for what to do
          once a relevant thread surfaces. <Link href="/signup">Start free</Link>.
        </p>
      </GuidePageShell>
    </>
  );
}
