-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_productId_fkey";

-- DropForeignKey
ALTER TABLE "tracked_links" DROP CONSTRAINT "tracked_links_leadId_fkey";

-- AlterTable
ALTER TABLE "tracked_links" DROP COLUMN "leadId";

-- DropTable
DROP TABLE "leads";

-- DropEnum
DROP TYPE "OutreachStatus";

