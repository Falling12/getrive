-- CreateTable
CREATE TABLE "positionings" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "statementCandidates" JSONB NOT NULL,
    "selectedStatement" TEXT,
    "icpCandidates" JSONB NOT NULL,
    "selectedIcpName" TEXT,
    "selectedIcpReasoning" TEXT,
    "selectedIcpLanguage" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positionings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "positionings_productId_key" ON "positionings"("productId");

-- AddForeignKey
ALTER TABLE "positionings" ADD CONSTRAINT "positionings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
