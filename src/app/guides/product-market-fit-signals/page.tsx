import type { Metadata } from "next";
import Link from "next/link";
import { GuidePageShell, GuideJsonLd } from "@/components/guides/guide-page-shell";
import { getGuide } from "@/lib/guides";
import { SITE_NAME } from "@/lib/seo";

const guide = getGuide("product-market-fit-signals")!;

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
          The usual advice — track retention curves, watch a Sean Ellis survey score, wait for the
          40% &ldquo;very disappointed&rdquo; threshold — assumes you already have enough users for
          any of those numbers to be statistically meaningful. With ten or twenty early users, a
          retention curve is noise. What&apos;s actually useful this early is qualitative: specific
          things people say and do that are hard to fake and easy to miss if you&apos;re not looking
          for them.
        </p>

        <h2>Signals worth tracking before you have metrics</h2>
        <ul>
          <li>
            <strong>People describing your exact problem, unprompted, in public.</strong> Not
            answering a survey about your product — posting in a community about the pain point
            before they know your product exists. This is the strongest signal there is, because
            there&apos;s zero incentive to say it if it isn&apos;t true.
          </li>
          <li>
            <strong>&ldquo;Does this exist yet?&rdquo; threads.</strong> Someone describing the exact
            shape of your product and asking if anyone&apos;s built it — a direct, unsolicited
            statement that the market wants this to exist.
          </li>
          <li>
            <strong>Frustration with the current best alternative.</strong> Complaints about the
            closest existing tool or workaround, specifically about the part your product does
            differently — tells you the wedge is real, not imagined.
          </li>
          <li>
            <strong>Unprompted feature requests from actual users.</strong> Early users asking for
            more of something, rather than you having to convince them to use what&apos;s there, is a
            much stronger signal than praise.
          </li>
          <li>
            <strong>People using it in a way you didn&apos;t design for.</strong> A sign the product
            solved a real problem well enough that someone stretched it, rather than abandoning it the
            moment it didn&apos;t fit their exact use case.
          </li>
        </ul>

        <h2>Where these signals actually show up</h2>
        <p>
          The first three happen almost entirely outside your own product — in the same public
          communities where people describe problems before they&apos;ve found a solution: Reddit,
          Hacker News, niche forums for your specific audience. See{" "}
          <Link href="/guides/hacker-news-monitoring-for-leads">the monitoring guide</Link> for how to
          actually watch these continuously rather than checking occasionally, which is how most of
          this signal gets missed — the threads that matter are one search away, but only if
          you&apos;re looking on the right day.
        </p>
        <p>
          The last two only show up once you have users at all, which is its own case for finding
          the first ones through the channels above rather than waiting — see the{" "}
          <Link href="/guides/how-to-get-your-first-users">first-users playbook</Link>. {SITE_NAME}
          scores exactly this kind of unprompted, public problem-description across Reddit, Hacker
          News, and a few other communities, so the signal doesn&apos;t depend on remembering to go
          looking for it. <Link href="/signup">Try it free</Link>.
        </p>
      </GuidePageShell>
    </>
  );
}
