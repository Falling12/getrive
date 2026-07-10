-- Twitter/X monitoring was never implementable (no self-serve API access)
-- and every UI path already blocked selecting it — existing rows are
-- inert placeholder suggestions, never a real monitored source.
DELETE FROM "sources" WHERE "type" = 'TWITTER_SEARCH';

-- Postgres has no ALTER TYPE ... DROP VALUE, so recreate the enum without it.
CREATE TYPE "SourceType_new" AS ENUM ('REDDIT_SUBREDDIT', 'HACKERNEWS');

ALTER TABLE "sources" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "sources" ALTER COLUMN "type" TYPE "SourceType_new" USING ("type"::text::"SourceType_new");
ALTER TABLE "sources" ALTER COLUMN "type" SET DEFAULT 'REDDIT_SUBREDDIT';

DROP TYPE "SourceType";
ALTER TYPE "SourceType_new" RENAME TO "SourceType";
