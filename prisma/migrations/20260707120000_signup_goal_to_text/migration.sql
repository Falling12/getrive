-- AlterTable
-- signupGoal changes from a numeric target to a short free-text goal
-- statement. Cast existing integer values to their text representation
-- instead of dropping them.
ALTER TABLE "products" ALTER COLUMN "signupGoal" TYPE TEXT USING "signupGoal"::TEXT;
