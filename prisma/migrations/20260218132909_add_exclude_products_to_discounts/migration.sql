-- AlterTable
ALTER TABLE "discount" ADD COLUMN     "excludeProducts" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "discountcode" ADD COLUMN     "excludeProducts" BOOLEAN NOT NULL DEFAULT false;
