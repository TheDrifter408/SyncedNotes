/*
  Warnings:

  - Changed the type of `content` on the `Note` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "content",
ADD COLUMN     "content" JSONB NOT NULL;

-- CreateIndex
CREATE INDEX "Note_userId_updatedAt_idx" ON "Note"("userId", "updatedAt");
