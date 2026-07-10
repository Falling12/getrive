-- AlterTable
ALTER TABLE "monitored_subreddits"
ADD COLUMN "lastSuccessfulPollAt" TIMESTAMP(3),
ADD COLUMN "consecutiveFailures" INTEGER NOT NULL DEFAULT 0;
