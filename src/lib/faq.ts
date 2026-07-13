// Single source of truth for the landing page's FAQ content — both the
// visible FaqSection and the FAQPage JSON-LD in app/page.tsx read from
// this array, so the structured data never drifts from what a visitor
// (or crawler) actually sees on the page. Every answer restates something
// already said elsewhere on the landing page (how-it-works, trust-section,
// pricing-section, feature-highlights, social-proof) rather than
// introducing new claims.
export interface Faq {
  question: string;
  answer: string;
}

export const FAQS: Faq[] = [
  {
    question: "What is Getrive?",
    answer:
      "Getrive listens across Reddit and Hacker News for people already describing the exact pain point your product solves, then helps you draft an authentic reply. Nothing is posted without you reviewing it first.",
  },
  {
    question: "Does Getrive post replies automatically?",
    answer:
      "No. Getrive is a diagnostic instrument, not an autonomous bot — every draft sits in front of you before anything happens, and you remain the final human operator on Reddit, Hacker News, or anywhere else. Auto-reply systems are disabled by design.",
  },
  {
    question: "Which platforms does Getrive monitor?",
    answer:
      "Reddit (the subreddits you choose) and Hacker News, polled continuously and fairly, oldest-checked-first. More channels are planned.",
  },
  {
    question: "How does Getrive know which posts are actually relevant?",
    answer:
      "Every post is read against your product's actual description and positioning, not keyword-matched — only genuine, high-intent matches reach you, scored against a relevance threshold (70% by default).",
  },
  {
    question: "How much does Getrive cost?",
    answer:
      "Getrive is currently in early access on a single free plan ($0) while the team works directly with founders to get it right. It includes Reddit + Hacker News monitoring, AI relevance scoring, reply & outreach drafting, and signup attribution. There's no paid tier yet.",
  },
  {
    question: "Can Getrive tell me if a reply actually brought in a signup?",
    answer:
      "Yes — when a reply brings someone in, a tracked link connects that signup back to the exact post and channel that produced it, so it's real attribution rather than a guess.",
  },
];
