-- 1. Add siteType to site table
ALTER TABLE "site" ADD COLUMN "site_type" VARCHAR(20) NOT NULL DEFAULT 'digital';
UPDATE "site" SET "site_type" = 'physical' WHERE "code" IN ('matcare', 'clariz', 'jellybean');

-- 2. Add type to category table
ALTER TABLE "category" ADD COLUMN "type" VARCHAR(20) NOT NULL DEFAULT 'product';
CREATE INDEX "category_type_idx" ON "category"("type");

-- 3. Create product_family table
CREATE TABLE "product_family" (
    "id" SERIAL NOT NULL,
    "site_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_family_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "product_family_site_id_idx" ON "product_family"("site_id");
ALTER TABLE "product_family" ADD CONSTRAINT "product_family_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Add physical product fields to product table
ALTER TABLE "product" ADD COLUMN "category_id" INT;
ALTER TABLE "product" ADD COLUMN "compare_at_price_in_cents" INT;
ALTER TABLE "product" ADD COLUMN "cost_price_in_cents" INT;
ALTER TABLE "product" ADD COLUMN "vat_rate" INT NOT NULL DEFAULT 21;
ALTER TABLE "product" ADD COLUMN "sku" VARCHAR(50);
ALTER TABLE "product" ADD COLUMN "ean" VARCHAR(20);
ALTER TABLE "product" ADD COLUMN "weight_grams" INT;
ALTER TABLE "product" ADD COLUMN "hs_code" VARCHAR(20);
ALTER TABLE "product" ADD COLUMN "country_of_origin" VARCHAR(2);
ALTER TABLE "product" ADD COLUMN "family_id" INT;
ALTER TABLE "product" ADD COLUMN "family_value" VARCHAR(100);

-- 5. Add indexes and foreign keys for new product fields
CREATE INDEX "product_category_id_idx" ON "product"("category_id");
CREATE INDEX "product_family_id_idx" ON "product"("family_id");
CREATE INDEX "product_sku_idx" ON "product"("sku");

ALTER TABLE "product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product" ADD CONSTRAINT "product_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "product_family"("id") ON DELETE SET NULL ON UPDATE CASCADE;
