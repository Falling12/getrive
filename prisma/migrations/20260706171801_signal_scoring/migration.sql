-- AlterTable
ALTER TABLE "products" ADD COLUMN     "relevanceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.7;

-- CreateTable
CREATE TABLE "scored_reddit_posts" (
    "id" TEXT NOT NULL,
    "monitoredSubredditId" TEXT NOT NULL,
    "redditPostId" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scored_reddit_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signals" (
    "id" TEXT NOT NULL,
    "monitoredSubredditId" TEXT NOT NULL,
    "redditPostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL,
    "relevanceReason" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "replied" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scored_reddit_posts_monitoredSubredditId_redditPostId_key" ON "scored_reddit_posts"("monitoredSubredditId", "redditPostId");

-- CreateIndex
CREATE INDEX "signals_monitoredSubredditId_idx" ON "signals"("monitoredSubredditId");

-- CreateIndex
CREATE UNIQUE INDEX "signals_monitoredSubredditId_redditPostId_key" ON "signals"("monitoredSubredditId", "redditPostId");

-- AddForeignKey
ALTER TABLE "scored_reddit_posts" ADD CONSTRAINT "scored_reddit_posts_monitoredSubredditId_fkey" FOREIGN KEY ("monitoredSubredditId") REFERENCES "monitored_subreddits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_monitoredSubredditId_fkey" FOREIGN KEY ("monitoredSubredditId") REFERENCES "monitored_subreddits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
