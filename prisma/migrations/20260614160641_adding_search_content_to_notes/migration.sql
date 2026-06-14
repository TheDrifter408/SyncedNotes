-- DropIndex
DROP INDEX "Note_userId_updatedAt_idx";

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "searchContent" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Note_userId_updatedAt_searchContent_idx" ON
"Note" USING
gin(
  to_tsvector(
    'english',
    coalesce("title",'') || ' ' || coalesce("searchContent", '')
  )
);
