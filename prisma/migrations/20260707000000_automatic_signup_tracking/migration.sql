-- CreateEnum
CREATE TYPE "SignupSource" AS ENUM ('MANUAL', 'AUTOMATIC');

-- AlterTable
ALTER TABLE "signups" ADD COLUMN "source" "SignupSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "visitorToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "signups_visitorToken_key" ON "signups"("visitorToken");
