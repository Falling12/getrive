-- AlterTable
ALTER TABLE "products" ADD COLUMN     "activeIngestionStartedAt" TIMESTAMP(3),
ADD COLUMN     "activeMeasurementStartedAt" TIMESTAMP(3),
ADD COLUMN     "lastIngestionAt" TIMESTAMP(3),
ADD COLUMN     "lastIngestionErrors" INTEGER,
ADD COLUMN     "lastIngestionFiltered" INTEGER,
ADD COLUMN     "lastIngestionMatched" INTEGER,
ADD COLUMN     "lastIngestionScored" INTEGER,
ADD COLUMN     "lastIngestionSignals" INTEGER;

-- AlterTable
ALTER TABLE "sources" ADD COLUMN     "discoveredViaSearch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "venueMiningDismissedAt" TIMESTAMP(3);
