import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { MONITORED_CHANNEL_NAMES, formatChannelList } from "@/lib/channels";

export const metadata: Metadata = {
  title: "Privacy Policy — Getrive",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated="July 18, 2026">
      <p>
        This page explains what data Getrive collects, why, and who it&apos;s shared with. Getrive is
        currently operated by an individual founder, not yet through a registered company.
      </p>

      <h2>Account &amp; product data</h2>
      <p>
        We collect what you give us directly: your email, and, if you sign up with a password
        rather than Google, that password (hashed, never stored in plain text). If you sign in
        with Google, we receive your name, email, and profile picture from Google — nothing else
        from your Google account. Either way, we also collect the product details you enter (name,
        description, target customer, website URL, signup goal).
      </p>

      <h2>Post content from monitored channels</h2>
      <p>
        To find relevant signals, Getrive fetches public post content from the channels you choose to
        monitor — Reddit subreddits (via Reddit&apos;s public RSS feeds), Hacker News (via its
        public API), IndieHackers (via a public feed), Stack Exchange sites (via the official public
        API), and Ask MetaFilter (via a public RSS feed). We only process publicly-visible posts —
        never private messages, DMs, or anything requiring a login to view.
      </p>

      <h2>Outreach lead data</h2>
      <p>
        If you use Outreach to track leads you&apos;ve found yourself elsewhere, the name, optional
        handle, and context notes you type in are stored in your account and sent to Anthropic to
        draft a suggested first-contact message. Getrive doesn&apos;t source, scrape, or import leads
        on its own — this is only data you&apos;ve chosen to enter about someone you&apos;ve already
        identified.
      </p>

      <h2>Third-party AI providers</h2>
      <p>
        Depending on what you&apos;re doing in Getrive, the following data is sent to third-party AI
        providers:
      </p>
      <ul>
        <li>
          <strong>Anthropic</strong> (Claude) — your product description and target customer (to
          generate positioning statements and channel/subreddit suggestions), the scraped text of
          your own website if you use &ldquo;Prefill from your website&rdquo; during setup,
          individual posts from any monitored channel (Reddit, Hacker News, IndieHackers, Stack
          Exchange, or Ask MetaFilter — to draft a suggested reply), and outreach lead context as
          described above (to draft a suggested message).
        </li>
        <li>
          <strong>OpenAI</strong> (GPT) — individual posts from any monitored channel (Reddit, Hacker
          News, IndieHackers, Stack Exchange, or Ask MetaFilter), scored for relevance against your
          product description.
        </li>
      </ul>
      <p>
        Each provider processes this data under its own API terms and privacy commitments; Getrive
        doesn&apos;t control their retention practices beyond what their API terms specify.
      </p>

      <h2>Product analytics</h2>
      <p>
        Getrive uses <strong>PostHog</strong> (hosted on PostHog&apos;s EU Cloud, based in the EU) to
        understand how the product is actually used — page views, clicks, scroll depth, and session
        recordings of your browsing and in-app activity, across both the public site and the
        logged-in product. This is how we find what&apos;s confusing or broken, rather than guessing.
        Session recordings automatically mask password fields, and we additionally mask outreach lead
        names, handles, and notes you enter under Outreach. We never send PostHog your email,
        password, or full name as event data — only your internal account id and category-level
        properties (e.g. which button you clicked, which onboarding step you completed).
      </p>

      <h2>Website tracking (optional, your choice)</h2>
      <p>
        If you choose to use Getrive&apos;s attribution tools on your own website, one of two things
        happens, depending on which option you set up:
      </p>
      <ul>
        <li>
          <strong>No-code redirect:</strong> we log that a signup occurred, with no visitor-level
          data beyond the timestamp and which project it belongs to.
        </li>
        <li>
          <strong>Tracking snippet:</strong> a small script you paste onto your own site stores a
          randomly-generated visitor token in that visitor&apos;s browser (localStorage) to connect a
          signup back to the specific reply that brought them there. This token isn&apos;t linked to
          any other identifying information we collect.
        </li>
      </ul>
      <p>
        <strong>
          If you use the tracking snippet, you — not Getrive — are responsible for your own site&apos;s
          compliance obligations
        </strong>{" "}
        (for example, cookie/tracking consent requirements that may apply in your visitors&apos;
        jurisdictions). Getrive provides the mechanism; how and where you deploy it on your own
        property is your call.
      </p>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>
          We never post, comment, DM, or send anything on your behalf — on{" "}
          {formatChannelList([...MONITORED_CHANNEL_NAMES, "anywhere else"], "or")}.
        </li>
        <li>We don&apos;t sell your data to anyone.</li>
        <li>We don&apos;t process post content beyond what&apos;s needed to score relevance and draft replies.</li>
      </ul>

      <h2>Data retention &amp; deletion</h2>
      <p>
        We keep your account and project data until you ask us to delete it. Archiving a project from
        its Settings page hides it from your project list but keeps its data intact and restorable;
        it is not deletion.
      </p>
      <p>
        To permanently delete a single project or your entire account, email us at{" "}
        <a href="mailto:senkcsani@gmail.com">senkcsani@gmail.com</a>. This is currently a manual
        process — there&apos;s no self-serve delete button yet — but every request is honored.
        Deletion is permanent and covers everything tied to the project or account: signals, scored
        post history, monitored sources, outreach leads, tracked links, and signup/attribution
        records. We don&apos;t retain any of this after deletion — Getrive has no billing or
        invoicing system that would require keeping records for legal reasons.
      </p>

      <h2>Your rights</h2>
      <p>
        You can export your project data at any time from Settings, or request a copy or deletion of
        your data by contacting us below.
      </p>

      <h2>Changes to this policy</h2>
      <p>We may update this policy as the product evolves. Material changes will be reflected by updating the date at the top of this page.</p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or your data:{" "}
        <a href="mailto:senkcsani@gmail.com">senkcsani@gmail.com</a>
      </p>
    </LegalPageShell>
  );
}
