import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { MONITORED_CHANNEL_NAMES, formatChannelList } from "@/lib/channels";

export const metadata: Metadata = {
  title: "Privacy Policy — Getrive",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated="July 21, 2026">
      <p>
        This page explains what personal data Getrive collects, why, under what legal basis, and who
        it&apos;s shared with — written to meet the UK/EU General Data Protection Regulation
        (GDPR)&apos;s transparency requirements as well as plainly explain things. Getrive is the{" "}
        <strong>data controller</strong> for the data described below. It&apos;s currently operated
        by an individual founder, not yet through a registered company; contact details are at the
        bottom of this page.
      </p>

      <h2>Legal basis, at a glance</h2>
      <p>
        Each section below explains its own legal basis inline, next to the data it actually
        covers — this is just a quick index if you want the summary first:
      </p>
      <ul>
        <li><strong>Contract</strong> (Art. 6(1)(b)) — account &amp; product data, verification/reset emails, your own product data sent to AI providers.</li>
        <li><strong>Legitimate interest</strong> (Art. 6(1)(f)) — public post content we process (see that section for the full balancing test), signal-alert/digest emails (with an opt-out).</li>
        <li><strong>Consent</strong> (Art. 6(1)(a)) — analytics cookies, the signup-attribution capture, both gated behind the cookie banner and withdrawable at any time.</li>
      </ul>

      <h2>Account &amp; product data</h2>
      <p>
        We collect what you give us directly: your email, and, if you sign up with a password
        rather than Google, that password (hashed, never stored in plain text). If you sign in
        with Google, we receive your name, email, and profile picture from Google — nothing else
        from your Google account. Either way, we also collect the product details you enter (name,
        description, target customer, website URL, signup goal).
      </p>
      <p>
        <strong>Legal basis:</strong> processing this is necessary to provide the account and
        product you&apos;ve asked us to run (contract, GDPR Art. 6(1)(b)).
      </p>

      <h2>Public post content we process (Reddit, Hacker News &amp; more)</h2>
      <p>
        To find relevant signals, Getrive fetches public post content from the channels you choose to
        monitor — Reddit subreddits (via Reddit&apos;s public RSS feeds), Hacker News (via its
        public API), IndieHackers (via a public feed), Stack Exchange sites (via the official public
        API), and Ask MetaFilter (via a public RSS feed). We only process publicly-visible posts —
        never private messages, DMs, or anything requiring a login to view.
      </p>
      <p>
        This content was written by other people — Reddit users, Hacker News commenters, and so on —
        who are not Getrive account holders and haven&apos;t agreed to our terms. If that content
        includes personal data (a username, something identifying they chose to share publicly), we
        process it too, for as long as it takes to score relevance and, if you act on it, draft a
        reply.
      </p>
      <p>
        <strong>Legal basis:</strong> legitimate interest (GDPR Art. 6(1)(f)) — the data was already
        made public by its author on a platform that itself makes it publicly accessible, we only use
        it for the narrow purpose of relevance scoring and reply drafting, we don&apos;t build
        profiles of individual authors across posts, and it isn&apos;t retained once that purpose is
        served. Because this content doesn&apos;t come from the author directly, GDPR Art. 14 would
        otherwise require notifying each one individually — we rely on the Art. 14(5)(b) exemption for
        cases where that would involve disproportionate effort (there&apos;s no practical way to
        contact every author of every post we score). If you&apos;re the author of a public post
        Getrive has processed and want to know what we hold or have it removed, contact us below and
        we&apos;ll act on it.
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
          your own website if you use &ldquo;Prefill from your website&rdquo; during setup, and
          individual posts from any monitored channel (Reddit, Hacker News, IndieHackers, Stack
          Exchange, or Ask MetaFilter — to draft a suggested reply).
        </li>
        <li>
          <strong>OpenAI</strong> (GPT) — individual posts from any monitored channel (Reddit, Hacker
          News, IndieHackers, Stack Exchange, or Ask MetaFilter), scored for relevance against your
          product description.
        </li>
      </ul>
      <p>
        Both are US-based companies; sending data to them is an international transfer outside the
        UK/EEA under GDPR. Both process API data under their own published data-processing terms,
        which include contractual safeguards (Standard Contractual Clauses) covering exactly this
        kind of transfer, and neither uses API data to train their models by default. Each provider
        processes this data under its own API terms and privacy commitments; Getrive doesn&apos;t
        control their retention practices beyond what their API terms specify.
      </p>
      <p>
        <strong>Legal basis:</strong> contract (Art. 6(1)(b)) for account holders&apos; own product
        data; legitimate interest (Art. 6(1)(f)) for public post content, for the same reasons given
        above.
      </p>

      <h2>Emails we send</h2>
      <p>
        Account verification and password-reset emails are sent whenever you request them —
        necessary to run the account you asked for (contract, Art. 6(1)(b)). Instant signal alerts
        and the weekly digest are sent based on your own preference toggles in Settings &gt;
        Notifications (&ldquo;Instant signal alerts&rdquo; and &ldquo;Weekly digest&rdquo;), on by
        default as part of delivering the product&apos;s core value (legitimate interest, Art.
        6(1)(f)) — you can turn either off at any time from that page, and doing so takes effect
        immediately.
      </p>

      <h2>Cookies &amp; similar technologies</h2>
      <p>
        On the public site, nothing beyond what&apos;s strictly necessary runs before you make a
        choice in the consent banner (powered by Silktide Consent Manager, an open-source tool that
        itself stores your choice in your browser&apos;s local storage, not a cookie). You can change
        your choice at any time via the &ldquo;Cookie settings&rdquo; link in the footer.
      </p>
      <ul>
        <li>
          <strong>Necessary</strong> (always on, no consent required) — your signed-in session, and a
          small preference cookie remembering which results filter tab you last had open. Legal
          basis: necessary to provide the service you&apos;re using (Art. 6(1)(b)); exempt from
          consent under the ePrivacy rules as strictly necessary.
        </li>
        <li>
          <strong>Analytics</strong> (off until you accept) — PostHog, described below. Legal basis:
          your consent (Art. 6(1)(a)), given or withdrawn in the banner.
        </li>
        <li>
          <strong>Attribution</strong> (off until you accept) — the signup-attribution capture
          described below. Legal basis: your consent (Art. 6(1)(a)), given or withdrawn in the
          banner.
        </li>
      </ul>

      <h2>Product analytics</h2>
      <p>
        Getrive uses <strong>PostHog</strong> (hosted on PostHog&apos;s EU Cloud, based in the EU) to
        understand how the product is actually used — page views, clicks, scroll depth, and session
        recordings of your browsing and in-app activity, across both the public site and the
        logged-in product. This is how we find what&apos;s confusing or broken, rather than guessing.
        Session recordings automatically mask password fields. We never send PostHog your email,
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

      <h2>Where your data is processed</h2>
      <p>
        Getrive is hosted on Vercel, with a Postgres database, both of which may process data outside
        the UK/EEA depending on region configuration. Combined with the AI providers above and our
        email provider (Resend), this means your data can be processed in the US as well as the
        UK/EEA. Where a provider is outside the UK/EEA, we rely on their own GDPR-compliant transfer
        mechanism (typically Standard Contractual Clauses) rather than transferring data on terms of
        our own.
      </p>

      <h2>Data security</h2>
      <p>
        Passwords are hashed, never stored in plain text. Sessions are signed and encrypted (Auth.js
        / NextAuth). Traffic to and from Getrive is encrypted in transit (HTTPS/TLS). No system is
        perfectly secure, but these are concrete, real measures, not a generic promise.
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
        post history, monitored sources, tracked links, and signup/attribution
        records. We don&apos;t retain any of this after deletion — Getrive has no billing or
        invoicing system that would require keeping records for legal reasons.
      </p>

      <h2>Your rights</h2>
      <p>If you&apos;re in the UK or EEA, GDPR gives you the right to:</p>
      <ul>
        <li><strong>Access</strong> — get a copy of the personal data we hold about you.</li>
        <li><strong>Rectification</strong> — have inaccurate data corrected.</li>
        <li><strong>Erasure</strong> — have your data deleted (see Data retention &amp; deletion above).</li>
        <li><strong>Restriction</strong> — ask us to limit how we use your data in specific circumstances.</li>
        <li><strong>Object</strong> — object to processing based on legitimate interest, including the public-post processing described above.</li>
        <li><strong>Portability</strong> — receive your data in a portable format (see the export option in Settings).</li>
        <li><strong>Withdraw consent</strong> — for anything based on consent (analytics, attribution), at any time via &ldquo;Cookie settings&rdquo; in the footer, with no effect on processing before withdrawal.</li>
        <li>
          <strong>Lodge a complaint</strong> — with a data protection supervisory authority. Getrive
          is based in Hungary, so the lead authority is the{" "}
          <a href="https://www.naih.hu/panaszuegyintezes-rendje" target="_blank" rel="noopener noreferrer">
            NAIH
          </a>{" "}
          (Nemzeti Adatvédelmi és Információszabadság Hatóság); if you&apos;re in the UK, you can
          instead complain to the{" "}
          <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer">
            ICO
          </a>
          . We&apos;d appreciate the chance to make it right first, but you&apos;re not required to
          contact us before complaining to either.
        </li>
      </ul>
      <p>
        To exercise any of these, contact us below. We respond within one month of a verified
        request, as GDPR Art. 12(3) requires — extendable by a further two months for complex or
        numerous requests, in which case we&apos;ll tell you within the first month and explain why.
        This is currently a one-person operation, so we aim to respond well inside that window
        rather than up against it, but the one-month figure is the actual commitment, not an
        estimate.
      </p>

      <h2>Children&apos;s privacy</h2>
      <p>
        Getrive isn&apos;t intended for anyone under 16. We don&apos;t knowingly collect data from
        children; if you believe a child has created an account, contact us and we&apos;ll delete it.
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
