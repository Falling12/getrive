// Single source of truth for the landing page's FAQ content — both the
// visible FaqSection and the FAQPage JSON-LD in app/page.tsx read from
// this array, so the structured data never drifts from what a visitor
// (or crawler) actually sees on the page. Every answer restates something
// already said elsewhere on the landing page (how-it-works, trust-section,
// pricing-section, feature-highlights, social-proof) rather than
// introducing new claims.
import { MONITORED_CHANNEL_NAMES, formatChannelList } from "@/lib/channels";

export interface Faq {
  question: string;
  answer: string;
}

export const FAQS: Faq[] = [
  {
    question: "What is Getrive?",
    answer: `Getrive listens across ${formatChannelList(MONITORED_CHANNEL_NAMES)} for people already describing the exact pain point your product solves, then helps you draft an authentic reply. Nothing is posted without you reviewing it first.`,
  },
  {
    question: "Will replying like this get me banned or called out for self-promotion?",
    answer:
      "That's the risk we designed around. Every draft is built to lead with genuine help, not a pitch, and you review and edit it before sending from your own account — nothing is ever mass-posted or sent automatically. Getrive respects that most subreddits (rightly) ban naked self-promo: it finds the conversation, but you're the one having it.",
  },
  {
    question: "Does Getrive post replies automatically?",
    answer: `No. Getrive drafts, it doesn't post — every draft sits in front of you before anything happens, and you remain the final human operator on ${formatChannelList([...MONITORED_CHANNEL_NAMES, "anywhere else"], "or")}. Auto-reply systems are disabled by design.`,
  },
  {
    question: "Which platforms does Getrive monitor?",
    answer:
      "Reddit (the subreddits you choose), Hacker News, IndieHackers, Stack Exchange (per site you pick), and Ask MetaFilter, polled continuously and fairly, oldest-checked-first. More channels are planned.",
  },
  {
    question: "How does Getrive know which posts are actually relevant?",
    answer:
      "Every post is read against your product's actual description and positioning, not keyword-matched — only genuine, high-intent matches reach you, scored against a relevance threshold (70% by default). Only posts that clear that bar land in your queue; the demos on this page show real examples of scores in that range.",
  },
  {
    question: "How much does Getrive cost?",
    answer:
      "Getrive is currently in early access on a single free plan ($0) while the team works directly with founders to get it right. It includes Reddit + Hacker News + IndieHackers + Stack Exchange + Ask MetaFilter monitoring, AI relevance scoring, reply & outreach drafting, and signup attribution. There's no paid tier yet.",
  },
  {
    question: "Can Getrive tell me if a reply actually brought in a signup?",
    answer:
      "Yes — when a reply brings someone in, a tracked link connects that signup back to the exact post and channel that produced it, so it's real attribution rather than a guess.",
  },
];
