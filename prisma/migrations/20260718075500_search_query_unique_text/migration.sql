-- CreateIndex
CREATE UNIQUE INDEX "search_queries_productId_platform_text_key" ON "search_queries"("productId", "platform", "text");
