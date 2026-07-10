-- Hand-written (not `prisma migrate dev`-generated): the auto-diff can't
-- detect a table/column rename and would emit DROP + CREATE, destroying
-- real data (20 sources, 575 scored posts, 55 signals at time of writing).
-- Every rename below uses RENAME TO / RENAME COLUMN / RENAME CONSTRAINT /
-- ALTER INDEX ... RENAME so existing rows and relationships survive intact.
-- Constraint/index names are renamed to match what Prisma would generate
-- fresh for the new model names, so future `prisma migrate dev` diffs
-- against this history stay clean.

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('REDDIT_SUBREDDIT', 'HACKERNEWS', 'TWITTER_SEARCH');

-- RenameTable: monitored_subreddits -> sources
ALTER TABLE "monitored_subreddits" RENAME TO "sources";
ALTER TABLE "sources" RENAME CONSTRAINT "monitored_subreddits_pkey" TO "sources_pkey";
ALTER TABLE "sources" RENAME CONSTRAINT "monitored_subreddits_productId_fkey" TO "sources_productId_fkey";
ALTER INDEX "monitored_subreddits_productId_idx" RENAME TO "sources_productId_idx";
ALTER INDEX "monitored_subreddits_productId_name_key" RENAME TO "sources_productId_name_key";

-- AlterTable: add generalized-source columns
ALTER TABLE "sources" ADD COLUMN "type" "SourceType" NOT NULL DEFAULT 'REDDIT_SUBREDDIT';
ALTER TABLE "sources" ADD COLUMN "config" JSONB;

-- RenameTable: scored_reddit_posts -> scored_posts
ALTER TABLE "scored_reddit_posts" RENAME TO "scored_posts";
ALTER TABLE "scored_posts" RENAME COLUMN "monitoredSubredditId" TO "sourceId";
ALTER TABLE "scored_posts" RENAME COLUMN "redditPostId" TO "externalId";
ALTER TABLE "scored_posts" RENAME CONSTRAINT "scored_reddit_posts_pkey" TO "scored_posts_pkey";
ALTER TABLE "scored_posts" RENAME CONSTRAINT "scored_reddit_posts_monitoredSubredditId_fkey" TO "scored_posts_sourceId_fkey";
ALTER INDEX "scored_reddit_posts_monitoredSubredditId_redditPostId_key" RENAME TO "scored_posts_sourceId_externalId_key";

-- RenameColumn: signals.monitoredSubredditId -> sourceId, redditPostId -> externalId
ALTER TABLE "signals" RENAME COLUMN "monitoredSubredditId" TO "sourceId";
ALTER TABLE "signals" RENAME COLUMN "redditPostId" TO "externalId";
ALTER TABLE "signals" RENAME CONSTRAINT "signals_monitoredSubredditId_fkey" TO "signals_sourceId_fkey";
ALTER INDEX "signals_monitoredSubredditId_idx" RENAME TO "signals_sourceId_idx";
ALTER INDEX "signals_monitoredSubredditId_redditPostId_key" RENAME TO "signals_sourceId_externalId_key";
