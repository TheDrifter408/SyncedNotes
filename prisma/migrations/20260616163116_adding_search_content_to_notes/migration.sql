-- CreateIndex
CREATE INDEX "Note_userId_updatedAt_searchContent_idx" ON "Note"("userId", "updatedAt", "searchContent");
