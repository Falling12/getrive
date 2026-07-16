// One-off verification script for Reddit multi-subreddit RSS batching
// (lib/reddit/fetch-posts.ts's fetchNewPostsForSubreddits) — not part of the
// shipped app. MAX_SUBREDDITS_PER_BATCH was chosen conservatively without
// empirical confirmation that Reddit's r/sub1+sub2+.../new/.rss endpoint
// actually holds up at that size. This script finds the real ceiling
// against live Reddit, not a guess.
//
// Hits the real, unauthenticated Reddit RSS endpoint, so every request in
// here is spaced ~62s apart to respect the same global per-IP rate limit
// lib/reddit/poll.ts is built around (see fetch-posts.ts's comment on
// BROWSER_USER_AGENT). This makes the full run take roughly 10-12 minutes —
// expected, not a bug.
//
// Run with:
//   npx tsx scripts/verify-reddit-batching.ts
import { fetchNewPostsForSubreddits, MAX_SUBREDDITS_PER_BATCH } from "@/lib/reddit/fetch-posts";

// 60 real, distinct, high/medium-traffic, SFW subreddits — enough to push
// past MAX_SUBREDDITS_PER_BATCH (40) and find where (if anywhere) Reddit's
// combined-feed endpoint actually breaks, not just where we assumed it would.
const SUBREDDIT_POOL = [
  "startups", "Entrepreneur", "SaaS", "smallbusiness", "marketing", "webdev",
  "programming", "technology", "business", "freelance", "sysadmin", "aws",
  "javascript", "reactjs", "node", "selfhosted", "devops", "artificial",
  "MachineLearning", "dataengineering", "cscareerquestions", "personalfinance",
  "productivity", "EntrepreneurRideAlong", "growmybusiness", "digital_marketing",
  "SEO", "content_marketing", "ecommerce", "Shopify", "microsaas", "SideProject",
  "indiehackers", "startup_ideas", "ProductManagement", "UXDesign", "design",
  "graphic_design", "Frontend", "sales", "remotework", "WFH", "consulting",
  "accounting", "legaladvice", "socialmedia", "PPC", "GrowthHacking",
  "Bootstrapped", "indiebiz", "nocode", "LowCode", "Python", "golang", "rust",
  "docker", "kubernetes", "opensource", "github", "api",
];

const REQUEST_SPACING_MS = 62_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface StepResult {
  size: number;
  ok: boolean;
  elapsedMs?: number;
  totalEntries?: number;
  subredditsWithPosts?: number;
  error?: string;
}

async function timedFetch(names: string[]): Promise<{ elapsedMs: number; postsByName: Map<string, unknown[]> }> {
  const startedAt = Date.now();
  const postsByName = await fetchNewPostsForSubreddits(names);
  return { elapsedMs: Date.now() - startedAt, postsByName };
}

async function main() {
  console.log(`Testing batch sizes against live Reddit RSS. This takes ~10-12 minutes (${REQUEST_SPACING_MS / 1000}s spacing per request).\n`);

  // Escalate past the currently-configured limit to see if there's headroom,
  // stopping as soon as one size actually fails.
  const stepSizes = [1, 5, 10, 20, 30, MAX_SUBREDDITS_PER_BATCH, 50, SUBREDDIT_POOL.length].filter(
    (size, index, all) => size <= SUBREDDIT_POOL.length && all.indexOf(size) === index
  );

  const results: StepResult[] = [];
  let lastSuccessfulSize = 0;
  let lastSuccessfulNames: string[] = [];

  for (const size of stepSizes) {
    const names = SUBREDDIT_POOL.slice(0, size);
    console.log(`--- Batch size ${size} (${names.join("+")}) ---`);

    try {
      const { elapsedMs, postsByName } = await timedFetch(names);
      const totalEntries = [...postsByName.values()].reduce((sum, posts) => sum + posts.length, 0);
      const subredditsWithPosts = [...postsByName.values()].filter((posts) => posts.length > 0).length;

      console.log(
        `OK — ${elapsedMs}ms, ${totalEntries} total posts across ${subredditsWithPosts}/${size} subreddits with at least one recent post`
      );
      results.push({ size, ok: true, elapsedMs, totalEntries, subredditsWithPosts });
      lastSuccessfulSize = size;
      lastSuccessfulNames = names;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`FAILED — ${message}`);
      results.push({ size, ok: false, error: message });
      console.log("\nStopping escalation at the first failure.");
      break;
    }

    // Always wait, even after the last escalation step — the correctness
    // spot-check below fires its own request right after this loop, so
    // skipping the wait "because this was the last step" (a bug an earlier
    // run of this script actually hit) just moves the same collision there.
    console.log(`Waiting ${REQUEST_SPACING_MS / 1000}s before the next request (Reddit's rate limit)...\n`);
    await sleep(REQUEST_SPACING_MS);
  }

  // Correctness spot-check: fetch a few of the last successful batch's
  // subreddits solo and diff post IDs against what the combined batch
  // produced for them — confirms the permalink-based splitting isn't
  // silently losing or misattributing posts on real data, not just that
  // requests succeed.
  if (lastSuccessfulNames.length > 0) {
    console.log(`\n--- Correctness spot-check: solo fetch vs. combined batch (size ${lastSuccessfulSize}) ---`);
    const { postsByName: combined } = await timedFetch(lastSuccessfulNames);
    const sampleNames = lastSuccessfulNames.slice(0, 3);

    for (const name of sampleNames) {
      console.log(`Waiting ${REQUEST_SPACING_MS / 1000}s before solo-checking r/${name}...`);
      await sleep(REQUEST_SPACING_MS);
      const { postsByName: solo } = await timedFetch([name]);
      const soloIds = new Set(solo.get(name.toLowerCase())?.map((p) => (p as { id: string }).id));
      const combinedIds = new Set(combined.get(name.toLowerCase())?.map((p) => (p as { id: string }).id));
      const missingFromCombined = [...soloIds].filter((id) => !combinedIds.has(id));
      const extraInCombined = [...combinedIds].filter((id) => !soloIds.has(id));

      if (missingFromCombined.length === 0 && extraInCombined.length === 0) {
        console.log(`r/${name}: MATCH — ${soloIds.size} posts, identical in solo and combined fetch`);
      } else {
        // Expected occasionally near the top of "new" if a post lands
        // between the two requests, not necessarily a bucketing bug — call
        // it out but don't treat it as a hard failure.
        console.log(
          `r/${name}: DIFFERS — solo ${soloIds.size} posts, combined ${combinedIds.size} posts, ` +
            `${missingFromCombined.length} missing, ${extraInCombined.length} extra (could be new posts landing between the two requests, not necessarily a bug)`
        );
      }
    }
  }

  console.log("\n=== Summary ===");
  for (const result of results) {
    if (result.ok) {
      console.log(
        `size ${result.size}: OK, ${result.elapsedMs}ms, ${result.totalEntries} posts, ${result.subredditsWithPosts}/${result.size} subreddits active`
      );
    } else {
      console.log(`size ${result.size}: FAILED — ${result.error}`);
    }
  }

  console.log(`\nCurrently configured MAX_SUBREDDITS_PER_BATCH = ${MAX_SUBREDDITS_PER_BATCH}`);
  console.log(`Largest size that worked in this run: ${lastSuccessfulSize}`);
  if (lastSuccessfulSize > MAX_SUBREDDITS_PER_BATCH) {
    console.log(
      `There's untapped headroom — consider raising MAX_SUBREDDITS_PER_BATCH toward ${lastSuccessfulSize} (with margin).`
    );
  } else if (lastSuccessfulSize < MAX_SUBREDDITS_PER_BATCH) {
    console.log(
      `The configured limit is ABOVE what this run confirmed — lower MAX_SUBREDDITS_PER_BATCH to ${lastSuccessfulSize} (with margin) before relying on it.`
    );
  } else {
    console.log("The configured limit matches the largest size tested here — it held.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
