/*
  Warnings:

  - You are about to drop the column `snippet` on the `signals` table. All the data in the column will be lost.
  - Added the required column `body` to the `signals` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "KarmaStatus" AS ENUM ('READY', 'WATCH', 'BLOCKED');

-- AlterTable
ALTER TABLE "monitored_subreddits" ADD COLUMN     "currentKarma" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "karmaStatus" "KarmaStatus" NOT NULL DEFAULT 'WATCH',
ADD COLUMN     "karmaThreshold" INTEGER,
ADD COLUMN     "selfPromoNotes" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "redditConnectedAt" TIMESTAMP(3),
ADD COLUMN     "redditUsername" TEXT,
ADD COLUMN     "websiteUrl" TEXT;

-- AlterTable
ALTER TABLE "scored_reddit_posts" ADD COLUMN     "permalink" TEXT,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "signals" DROP COLUMN "snippet",
ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "repliedAt" TIMESTAMP(3),
ADD COLUMN     "repliedPostUrl" TEXT,
ADD COLUMN     "replyDraft" TEXT,
ADD COLUMN     "replyToneNote" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notifyNewSignal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyWeeklyDigest" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "tracked_links" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "signalId" TEXT,
    "label" TEXT NOT NULL,
    "utmSource" TEXT NOT NULL DEFAULT 'reddit',
    "utmMedium" TEXT NOT NULL DEFAULT 'comment',
    "utmCampaign" TEXT,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracked_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signups" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "trackedLinkId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracked_links_productId_idx" ON "tracked_links"("productId");

-- CreateIndex
CREATE INDEX "signups_productId_idx" ON "signups"("productId");

-- AddForeignKey
ALTER TABLE "tracked_links" ADD CONSTRAINT "tracked_links_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_links" ADD CONSTRAINT "tracked_links_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "signals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signups" ADD CONSTRAINT "signups_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signups" ADD CONSTRAINT "signups_trackedLinkId_fkey" FOREIGN KEY ("trackedLinkId") REFERENCES "tracked_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;
