import type { Metadata } from "next";
import Link from "next/link";
import { GuidePageShell, GuideJsonLd } from "@/components/guides/guide-page-shell";
import { getGuide } from "@/lib/guides";
import { SITE_NAME } from "@/lib/seo";

const guide = getGuide("founder-led-sales-reddit")!;

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
          Reddit is one of the highest-intent places to find early users &mdash; and one of the
          easiest places to get permanently banned from, if you treat it like an ad channel. The
          difference between a founder who builds a reputation there and one who gets shadowbanned
          within a week comes down to a few concrete habits.
        </p>

        <h2>Read the subreddit&apos;s rules before you post anything</h2>
        <p>
          Almost every subreddit with commercial value has an explicit self-promotion policy, usually
          in the sidebar or a pinned post. Common patterns: a minimum account age or karma before
          you&apos;re allowed to link anything, a &ldquo;9:1 rule&rdquo; (nine non-promotional
          comments for every one that mentions your product), or a dedicated weekly
          self-promo/&ldquo;Feedback Friday&rdquo; thread that&apos;s the only place links are
          allowed. Violating these gets your comment removed at best, your account shadowbanned at
          worst &mdash; and a shadowban is silent, so you can keep posting for weeks without knowing
          nothing is showing up.
        </p>

        <h2>Answer the question first</h2>
        <p>
          The single biggest tell of a low-effort promotional reply is that it could be copy-pasted
          onto any thread mentioning the general topic. A good reply engages with the specific detail
          in the post &mdash; their stack, their constraint, why the obvious answer doesn&apos;t work
          for them &mdash; before it gets anywhere near mentioning a product. If you&apos;d be
          comfortable posting the same reply with the product mention deleted, and it would still be
          useful, you&apos;ve got the ratio right.
        </p>

        <h2>Disclose, don&apos;t hide</h2>
        <p>
          &ldquo;Full disclosure, I built this&rdquo; reads as more trustworthy than a reply that
          pretends to be a neutral third party recommending your own product &mdash; and if you&apos;re
          caught doing the latter (it happens often enough that r/SaaS and similar subreddits actively
          watch for it), the ban is often permanent and the thread gets called out publicly. Reddit
          users are unusually good at detecting astroturfing; the honest version is also the
          lower-risk one.
        </p>

        <h2>Post from one real account, consistently</h2>
        <p>
          Brand-new accounts that show up only to drop a link are the exact pattern subreddit
          moderators and Reddit&apos;s own spam filters are tuned to catch. Comment on other people&apos;s
          posts with no product angle at all sometimes &mdash; it builds the account history that
          makes your eventual product mention read as a real person rather than a marketing account.
        </p>

        <h2>Finding the threads worth replying to</h2>
        <p>
          Reddit&apos;s native search is weak for this; searching by keyword directly on{" "}
          <a href="https://www.reddit.com/search/" target="_blank" rel="noopener noreferrer">reddit.com/search</a>{" "}
          with the &ldquo;New&rdquo; sort, or via Google with <code>site:reddit.com</code>, surfaces
          more than the in-app search does. For continuous coverage across the subreddits you care
          about without checking manually, see our{" "}
          <Link href="/guides/how-to-get-your-first-users">guide to finding your first users</Link>.
        </p>

        <p>
          {SITE_NAME} handles the &ldquo;find the thread&rdquo; half of this automatically &mdash;
          it polls the subreddits you choose, scores each post for relevance against your product,
          and drafts a reply for you to review. You still write the final call and post it yourself,
          which matters here specifically: a human account posting a human-reviewed reply is exactly
          what stays inside every self-promo rule above.{" "}
          <Link href="/signup">Try it free</Link>.
        </p>
      </GuidePageShell>
    </>
  );
}
