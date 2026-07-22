-- AlterTable
ALTER TABLE "search_queries" ADD COLUMN     "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastSuccessfulRunAt" TIMESTAMP(3);
