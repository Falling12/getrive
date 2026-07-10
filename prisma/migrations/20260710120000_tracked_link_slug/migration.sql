-- AlterTable
ALTER TABLE "tracked_links" ADD COLUMN     "slug" TEXT;

-- Backfill existing rows with a random slug (application code generates
-- slugs for new rows going forward; this only covers rows that predate the
-- column).
UPDATE "tracked_links" SET "slug" = substr(md5(random()::text || id), 1, 10) WHERE "slug" IS NULL;

-- AlterTable
ALTER TABLE "tracked_links" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tracked_links_slug_key" ON "tracked_links"("slug");
