-- AlterTable
ALTER TABLE "search_results" ADD COLUMN     "duplicateOfId" TEXT;

-- AddForeignKey
ALTER TABLE "search_results" ADD CONSTRAINT "search_results_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "search_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;
