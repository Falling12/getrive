-- CreateEnum
CREATE TYPE "BaseRateClass" AS ENUM ('HIGH', 'LOW');

-- CreateEnum
CREATE TYPE "SearchPlatform" AS ENUM ('REDDIT', 'STACKEXCHANGE');

-- CreateEnum
CREATE TYPE "QueryVariantType" AS ENUM ('LITERAL', 'COLLOQUIAL', 'PLATFORM_IDIOMATIC');

-- CreateEnum
CREATE TYPE "QueryStatus" AS ENUM ('ACTIVE', 'PROPOSED', 'RETIRED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "baseRateClass" "BaseRateClass",
ADD COLUMN     "baseRateMatchCount" INTEGER,
ADD COLUMN     "baseRateMeasuredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "search_queries" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "platform" "SearchPlatform" NOT NULL,
    "variantType" "QueryVariantType" NOT NULL,
    "status" "QueryStatus" NOT NULL DEFAULT 'ACTIVE',
    "retiredReason" TEXT,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "passCount" INTEGER NOT NULL DEFAULT 0,
    "avgMatchScore" DOUBLE PRECISION,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_results" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "platform" "SearchPlatform" NOT NULL,
    "venue" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "answerCount" INTEGER,
    "hasAcceptedAnswer" BOOLEAN,
    "threadState" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_queries_productId_platform_status_idx" ON "search_queries"("productId", "platform", "status");

-- CreateIndex
CREATE INDEX "search_results_productId_idx" ON "search_results"("productId");

-- CreateIndex
CREATE INDEX "search_results_queryId_idx" ON "search_results"("queryId");

-- CreateIndex
CREATE UNIQUE INDEX "search_results_productId_platform_venue_externalId_key" ON "search_results"("productId", "platform", "venue", "externalId");

-- AddForeignKey
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_results" ADD CONSTRAINT "search_results_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_results" ADD CONSTRAINT "search_results_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "search_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
