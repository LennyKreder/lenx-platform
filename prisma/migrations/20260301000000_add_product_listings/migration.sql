-- ============================================
-- Phase 1: Create webshop channels for each site
-- ============================================

-- Insert a webshop SalesChannel for every site that doesn't have one
INSERT INTO "sales_channel" ("siteId", "type", "code", "name", "country", "isLvb", "isActive", "createdAt", "updatedAt")
SELECT
  s."id",
  'webshop',
  s."code" || '_webshop',
  s."name" || ' Webshop',
  NULL,
  false,
  true,
  NOW(),
  NOW()
FROM "site" s
WHERE NOT EXISTS (
  SELECT 1 FROM "sales_channel" sc
  WHERE sc."siteId" = s."id" AND sc."type" = 'webshop'
);

-- ============================================
-- Phase 2: Create product_listing table
-- ============================================

CREATE TABLE "product_listing" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "channelId" INTEGER NOT NULL,
    "variantId" INTEGER,
    "priceInCents" INTEGER NOT NULL DEFAULT 0,
    "compare_at_price_in_cents" INTEGER,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "externalId" VARCHAR(100),
    "deliveryCode" VARCHAR(20),
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_listing_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "product_listing_productId_idx" ON "product_listing"("productId");
CREATE INDEX "product_listing_channelId_idx" ON "product_listing"("channelId");
CREATE INDEX "product_listing_variantId_idx" ON "product_listing"("variantId");
CREATE INDEX "product_listing_isPublished_idx" ON "product_listing"("isPublished");
CREATE INDEX "product_listing_isFeatured_idx" ON "product_listing"("isFeatured");
CREATE INDEX "product_listing_externalId_idx" ON "product_listing"("externalId");
CREATE UNIQUE INDEX "product_listing_productId_channelId_variantId_key" ON "product_listing"("productId", "channelId", "variantId");

-- Foreign keys
ALTER TABLE "product_listing" ADD CONSTRAINT "product_listing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_listing" ADD CONSTRAINT "product_listing_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "sales_channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_listing" ADD CONSTRAINT "product_listing_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- Phase 3: Migrate existing product data → webshop listings
-- ============================================

-- Create a webshop listing for every existing product
INSERT INTO "product_listing" ("productId", "channelId", "priceInCents", "compare_at_price_in_cents", "currency", "isPublished", "isFeatured", "publishedAt", "externalId", "isActive", "createdAt", "updatedAt")
SELECT
  p."id",
  sc."id",
  p."priceInCents",
  p."compare_at_price_in_cents",
  p."currency",
  p."isPublished",
  p."isFeatured",
  p."publishedAt",
  p."etsyListingId",
  true,
  p."createdAt",
  NOW()
FROM "product" p
JOIN "sales_channel" sc ON sc."siteId" = p."siteId" AND sc."type" = 'webshop';

-- ============================================
-- Phase 4: Migrate existing ChannelListing → ProductListing (for Bol channels)
-- ============================================

INSERT INTO "product_listing" ("productId", "channelId", "variantId", "priceInCents", "currency", "isPublished", "externalId", "deliveryCode", "lastSyncError", "isActive", "createdAt", "updatedAt")
SELECT
  cl."productId",
  cl."channelId",
  cl."variantId",
  cl."priceInCents",
  'EUR',
  cl."isActive",
  cl."externalOfferId",
  cl."deliveryCode",
  cl."lastSyncError",
  cl."isActive",
  cl."createdAt",
  NOW()
FROM "channel_listing" cl
ON CONFLICT ("productId", "channelId", "variantId") DO NOTHING;

-- ============================================
-- Phase 5: Schema changes to existing tables
-- ============================================

-- Add listing_id to orderitem
ALTER TABLE "orderitem" ADD COLUMN "listing_id" INTEGER;
CREATE INDEX "orderitem_listing_id_idx" ON "orderitem"("listing_id");
ALTER TABLE "orderitem" ADD CONSTRAINT "orderitem_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "product_listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old ChannelListing
ALTER TABLE "channel_listing" DROP CONSTRAINT "channel_listing_channelId_fkey";
ALTER TABLE "channel_listing" DROP CONSTRAINT "channel_listing_productId_fkey";
ALTER TABLE "channel_listing" DROP CONSTRAINT "channel_listing_variantId_fkey";
DROP TABLE "channel_listing";

-- Update SalesChannel unique constraint
DROP INDEX "sales_channel_code_key";
CREATE INDEX "sales_channel_siteId_idx" ON "sales_channel"("siteId");
CREATE UNIQUE INDEX "sales_channel_siteId_type_country_key" ON "sales_channel"("siteId", "type", "country");
