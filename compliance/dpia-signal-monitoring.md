# Data Protection Impact Assessment: Public Post Monitoring & Scoring

Internal record, not published. Follows the ICO's standard DPIA structure. Covers Getrive's core
processing activity: continuously polling public posts from Reddit, Hacker News, IndieHackers,
Stack Exchange, and Ask MetaFilter, scoring them for relevance against a user's product, and
drafting suggested replies.

Last reviewed: 2026-07-21.

**This document is a good-faith working draft, not a substitute for legal review.** A DPIA is a
risk judgment with real consequences if the risk is misjudged — the reasoning below should be
checked by someone qualified before being treated as final, especially §5's risk conclusions.

---

## 1. Do we need a DPIA?

Yes, on a precautionary basis. The EDPB's own guidance (WP248) lists "systematic monitoring of a
publicly accessible area on a large scale" as one of the criteria that typically indicates
high-risk processing requiring a DPIA. Continuous, cross-channel polling of public posts —
matching two or more of the WP248 criteria (systematic monitoring; data processed on a large
scale, in the sense of ongoing/ever-growing volume rather than one-off) — plausibly meets that bar
even though no single post is individually high-risk. Screening in rather than arguing it out is
the lower-risk choice here.

## 2. Describe the processing

- **Nature:** automated fetching of public post content via each channel's own public API/RSS
  feed (Reddit RSS, HN's official API, IndieHackers' public feed, Stack Exchange's official API,
  Ask MetaFilter's RSS), continuous polling on a fair, oldest-checked-first schedule. Each post is
  sent to OpenAI for a relevance score against the requesting user's product description, and — if
  the user acts on it — to Anthropic to draft a suggested reply. Nothing is posted, commented, or
  sent on the post author's platform without a human (the Getrive user) reviewing and manually
  sending it from their own account.
- **Scope:** every new post in a channel a Getrive user has chosen to monitor, for as long as that
  monitoring is active. Volume grows with the number of active users and channels, not fixed.
- **Context:** post authors have no relationship with Getrive, didn't post expecting AI relevance
  scoring, and have no visibility into or control over this processing beyond what's already true
  of any public post being read, cited, or otherwise processed by any third party. This is
  materially the same exposure as a human doing manual keyword searches across these same public
  channels — Getrive automates and scales that search, it doesn't gain access data-subjects didn't
  already make public.
- **Purpose:** let a Getrive user (a founder) find people already describing a problem their
  product solves, so they can reply authentically instead of cold-pitching strangers.

## 3. Consultation

No formal external consultation performed (solo-founder operation, no other stakeholders/DPO to
consult, no data subjects practically reachable to consult per §4's disproportionate-effort
reasoning). This is itself a limitation worth surfacing rather than glossing over — a company at
greater scale would be expected to do more here.

## 4. Necessity, proportionality, and the legitimate interest balancing test

This also functions as the Art. 6(1)(f) Legitimate Interest Assessment for this processing
activity (referenced from the ROPA and the public privacy policy).

**Purpose test** — is there a genuine, specific business purpose? Yes: connecting founders to
people already expressing the exact problem their product solves, as an alternative to cold
outreach. Not vague or pretextual.

**Necessity test** — is this processing necessary to achieve that purpose, or is there a
less-intrusive way? Scoring is necessary because the volume of public posts across multiple
channels is too high for manual review to find genuinely relevant ones — that's the actual product
value being offered. A less-intrusive alternative (e.g., simple keyword matching instead of AI
scoring) would reduce accuracy without meaningfully reducing the privacy footprint, since the
underlying data processed (public post text) is the same either way.

**Balancing test** — do the data subjects' (post authors') interests, rights, or freedoms override
this interest?
- *In favor of processing:* the content is already public, published by the author specifically
  to be read by others on that platform; the processing doesn't change who can see the post
  (Getrive doesn't republish it anywhere); no profile is built of an individual author across
  multiple posts — each post is scored independently, once, for one user's product; the output
  (a relevance score and optional draft reply) is only ever seen by the single Getrive user who
  set up that monitoring, never shared further; nothing is posted back to the platform without a
  human review step.
- *Against processing / risk to the data subject:* an author might reasonably not expect their
  post to be read by an AI system for commercial lead-generation purposes, even though it's
  technically public; a small residual chance a resulting reply feels like unwanted solicitation
  to the recipient, even though every reply is human-reviewed and platform self-promotion rules
  are a stated part of the product's own guidance to users.
- **Conclusion:** the balance favors legitimate interest, conditioned on the mitigations in §6
  actually holding (narrow purpose limitation, no cross-post profiling, no re-publication, human
  review before any reply is sent). This conclusion should be revisited if any of those conditions
  change — see §7.

## 5. Identify and assess risks

| Risk | Likelihood | Severity | Overall |
|---|---|---|---|
| Post author unaware their public post was processed by AI | High | Low | Low-Medium |
| A drafted reply, if sent, reads as unwanted solicitation to the recipient | Low (human review required before send) | Low-Medium | Low |
| Post content sent to OpenAI/Anthropic retained or used beyond stated purpose | Low (per provider terms) but not independently verified (see ROPA action items) | Medium | Medium |
| Scope creep: monitoring expanded to non-public or authenticated content | Currently none (design constraint, not just policy) | High if it occurred | Low (mitigated by design) |
| Cross-post profiling of a specific author over time | Not currently implemented | High if implemented | Low (mitigated by design) |

## 6. Measures to reduce risk

Already in place:
- Only public, non-authenticated content is fetched — no login bypass, no private/DM access, by
  design (not merely by policy).
- No cross-post author profiling — each post is scored independently for the requesting user's
  product; Getrive doesn't build or expose an aggregate view of a given author across posts.
- Human-in-the-loop: no reply is ever sent automatically; the Getrive user reviews and sends
  manually from their own account.
- Public privacy policy discloses this processing, its legal basis, and gives post authors a
  contact channel to object or request removal (Art. 14(5)(b) disproportionate-effort exemption
  relied on for individual notice, but a reactive channel is offered instead).

Outstanding (tracked in `ropa.md`'s action items, not resolved by this document alone):
- Independently verify OpenAI's and Anthropic's actual DPA/retention terms rather than relying on
  general published policy.
- Consider a periodic (e.g. annual) re-screening of this DPIA rather than only on major feature
  change, given the processing scales with user growth even without a design change.

## 7. Sign-off and review trigger

Signed off by: Csanád Senk (controller), as a good-faith working assessment — not reviewed by
external counsel or a DPO as of the last-reviewed date above.

**Re-assess this DPIA if any of the following change:** a new channel is added that involves
authenticated/non-public content; replies become capable of being sent without human review;
any form of cross-post profiling of an individual author is introduced; user/post volume grows to
a scale where the "large-scale" characterization in §1 becomes unambiguous rather than
precautionary; or a data subject complaint/regulator inquiry raises a concern not already covered
here.
