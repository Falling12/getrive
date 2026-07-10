-- DropIndex
DROP INDEX "products_userId_key";

-- CreateIndex
CREATE INDEX "products_userId_idx" ON "products"("userId");
