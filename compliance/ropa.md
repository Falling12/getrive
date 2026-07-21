# Records of Processing Activities (GDPR Art. 30)

Internal record, not published. Covers what Article 30(1) requires: purposes, data subjects,
data categories, recipients, international transfers and their safeguards, retention, and a
general description of security measures — per processing activity.

**Controller:** Getrive, operated by Csanád Senk (individual, not yet a registered company),
based in Hungary. Contact: senkcsani@gmail.com.

**No DPO appointed.** Not required under Art. 37 at current scale (no large-scale special-category
processing, no large-scale systematic monitoring beyond the single activity assessed in the
accompanying DPIA, no public-authority processing). Revisit if that changes.

**No EU representative required** (Art. 27) — the controller is itself established in the EU
(Hungary), so Art. 27 (which applies to non-EU controllers) doesn't apply.

Last reviewed: 2026-07-21. Review whenever a new data flow, provider, or feature is added —
this document decays the same way the rest of the codebase does if it's not kept current.

---

## 1. Account & product data

- **Purpose:** provide the Getrive account and product workspace a user signs up for.
- **Data subjects:** Getrive account holders (founders using the product).
- **Data categories:** email, hashed password (credentials signup) or name/email/profile picture
  (Google signup), product name/description/target customer/website URL/signup goal.
- **Recipients:** none beyond the controller and the processors listed in §7 (hosting, database).
- **International transfers:** see §7 (hosting/database infrastructure).
- **Retention:** until account deletion (user-initiated, manual, via email request).
- **Security measures:** passwords hashed (never stored plaintext); session auth via signed/
  encrypted JWTs (Auth.js / NextAuth v5).
- **Legal basis:** Contract, Art. 6(1)(b).

## 2. Public post content (Reddit, Hacker News, IndieHackers, Stack Exchange, Ask MetaFilter)

- **Purpose:** score public posts for relevance to a user's product, draft a suggested reply.
- **Data subjects:** authors of public posts on the monitored channels — not Getrive account
  holders, no relationship with Getrive, no notice given directly (see DPIA §4 for the Art. 14(5)(b)
  disproportionate-effort reasoning).
- **Data categories:** publicly-posted text content, which may incidentally include personal data
  the author chose to publish (username, self-disclosed identifying details). Never private
  messages, DMs, or anything requiring login to view.
- **Recipients:** OpenAI and Anthropic (see §3), as sub-processors for scoring/drafting only.
- **International transfers:** to the US, via OpenAI and Anthropic (see §3 for safeguards).
- **Retention:** processed for scoring/drafting at ingestion time; not retained as a distinct
  processing purpose beyond what's needed to display the resulting Signal in-product, which
  persists until the associated project/account is deleted (see §1 retention).
- **Security measures:** fetched over the channel's own public API/RSS — no authentication bypass,
  no access to non-public content.
- **Legal basis:** Legitimate interest, Art. 6(1)(f) — see the DPIA (`dpia-signal-monitoring.md`)
  for the full necessity/proportionality/balancing analysis, which functions as this activity's
  Legitimate Interest Assessment.

## 3. Third-party AI providers (OpenAI, Anthropic)

- **Purpose:** generate product positioning/channel suggestions (Anthropic); score post relevance
  and draft replies (both).
- **Data subjects:** account holders (their product data) and public post authors (post content).
- **Data categories:** product description/target customer/website text; individual public post
  content.
- **Recipients:** OpenAI, L.L.C. and Anthropic, PBC (both US-based).
- **International transfers:** EU/UK → US. Safeguard relied on: each provider's own standard
  contractual clauses (SCCs) as incorporated into their API/business terms.
  **Action item (not yet verified in this record):** confirm which specific DPA/SCC document each
  provider's account terms actually incorporate, and file a copy or link here. Neither provider's
  API terms have been independently reviewed against this ROPA as of the last-reviewed date above.
- **Retention:** governed by each provider's own API data retention policy — not independently
  verified against a signed DPA as of the last-reviewed date (see action item above).
- **Legal basis:** Contract (Art. 6(1)(b)) for account holders' own data; legitimate interest
  (Art. 6(1)(f)) for public post content (see DPIA).

## 4. Emails

- **Purpose:** account verification, password reset, signal alerts, weekly digest.
- **Data subjects:** account holders.
- **Data categories:** email address, email content (varies by template).
- **Recipients:** Resend (email delivery provider).
- **International transfers:** to be confirmed — Resend's data-residency/DPA terms not yet
  independently verified against this ROPA. **Action item.**
- **Retention:** verification/reset emails are transactional, not stored beyond send logs held by
  Resend under its own terms; alert/digest sends are opt-out via account preference at any time.
- **Legal basis:** Contract (Art. 6(1)(b)) for verification/reset; legitimate interest
  (Art. 6(1)(f)) for alert/digest, with an opt-out.

## 5. Product analytics (PostHog)

- **Purpose:** understand product usage (page views, clicks, session recordings) to find friction.
- **Data subjects:** anyone visiting the public site or using the logged-in product, who has
  accepted the "Analytics" consent category.
- **Data categories:** behavioral/usage events, internal account id (not email/name/password),
  session recordings (password fields auto-masked).
- **Recipients:** PostHog (hosted on PostHog's EU Cloud).
- **International transfers:** none — EU-hosted specifically to avoid this.
- **Retention:** per PostHog's own EU Cloud retention terms (not independently re-verified here).
- **Legal basis:** Consent, Art. 6(1)(a) — gated behind the Silktide consent banner; off by default.

## 6. Signup attribution capture

- **Purpose:** connect a signup back to the specific reply/post that produced it, on Getrive's own
  site (dogfooding the same feature offered to users for their own sites).
- **Data subjects:** visitors to getrive.app who arrive via a tagged reply link.
- **Data categories:** a randomly-generated visitor token stored in `localStorage`, linked to which
  tracked link (post/reply) referred them.
- **Recipients:** none — first-party only.
- **International transfers:** none beyond general hosting (§7).
- **Retention:** cleared from `localStorage` immediately once successfully reported after signup;
  otherwise persists client-side until overwritten by a new tagged visit.
- **Legal basis:** Consent, Art. 6(1)(a) — gated behind the Silktide consent banner ("Attribution"
  category); off by default.

## 7. Hosting & infrastructure

- **Purpose:** run the application and store its data.
- **Data subjects:** all of the above.
- **Data categories:** all of the above, as stored/processed at rest and in transit.
- **Recipients:** Vercel (application hosting), database provider (Postgres — specific vendor not
  recorded here as of the last-reviewed date; **action item**: confirm and document).
- **International transfers:** possible, depending on region configuration — not pinned to a
  specific EU-only region as of the last-reviewed date. **Action item:** confirm Vercel/database
  region configuration and document the actual safeguard relied on (SCCs vs. an EU-only region
  that avoids the question entirely).
- **Retention:** per the retention periods above, per data category.
- **Security measures:** TLS in transit (standard for both providers); see also §1's password
  hashing and session handling.

---

## Outstanding action items

None of these block the public privacy policy from being accurate — it correctly describes *that*
data goes to these providers and *that* a transfer safeguard is relied on. What's still open is
independently confirming and filing the specifics, which is account/contract-level work, not
something resolvable by editing code or this document:

1. Locate and file each processor's DPA/SCC documentation: OpenAI, Anthropic, Resend, Vercel,
   the database provider.
2. Confirm actual hosting/database region and whether it's EU-only or genuinely international.
3. Decide whether a formal DPO appointment becomes necessary as the product and its monitoring
   scale grow (revisit alongside the DPIA's risk re-assessment trigger — see that document).
