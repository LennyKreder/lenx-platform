-- AlterTable
ALTER TABLE "blogpost" ADD COLUMN     "writer" VARCHAR(20) NOT NULL DEFAULT 'lenny';

-- CreateTable
CREATE TABLE "blogposttag" (
    "postId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "blogposttag_pkey" PRIMARY KEY ("postId","tagId")
);

-- AddForeignKey
ALTER TABLE "blogposttag" ADD CONSTRAINT "blogposttag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blogpost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blogposttag" ADD CONSTRAINT "blogposttag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
