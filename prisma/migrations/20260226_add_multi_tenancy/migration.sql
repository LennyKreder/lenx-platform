-- Multi-tenancy migration: Add Store, AdminUser, storeId to all models
-- All existing data is assigned to the LBL store

-- Use a deterministic UUID for the LBL store so we can reference it
-- This UUID is also used in prisma/seed.ts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lbl_store_id') THEN
    PERFORM NULL;
  END IF;
END $$;

-- ============================================
-- 1. Create Store table
-- ============================================
CREATE TABLE "store" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "domains" JSONB NOT NULL,
    "defaultLocale" VARCHAR(5) NOT NULL DEFAULT 'en',
    "locales" JSONB NOT NULL DEFAULT '["en"]',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Europe/Amsterdam',
    "hasShipping" BOOLEAN NOT NULL DEFAULT false,
    "hasDigitalDelivery" BOOLEAN NOT NULL DEFAULT false,
    "hasMultilingual" BOOLEAN NOT NULL DEFAULT false,
    "hasBolIntegration" BOOLEAN NOT NULL DEFAULT false,
    "hasBundles" BOOLEAN NOT NULL DEFAULT false,
    "hasTemplates" BOOLEAN NOT NULL DEFAULT false,
    "hasBlog" BOOLEAN NOT NULL DEFAULT true,
    "hasReviews" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" VARCHAR(500),
    "faviconUrl" VARCHAR(500),
    "primaryColor" VARCHAR(7),
    "accentColor" VARCHAR(7),
    "footerText" TEXT,
    "defaultMetaTitle" VARCHAR(200),
    "defaultMetaDescription" VARCHAR(300),
    "stripeAccountId" VARCHAR(100),
    "stripeWebhookSecret" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_code_key" ON "store"("code");

-- ============================================
-- 2. Insert LBL store with known ID
-- ============================================
INSERT INTO "store" ("id", "code", "name", "domains", "defaultLocale", "locales", "currency", "hasDigitalDelivery", "hasMultilingual", "hasBundles", "hasTemplates", "hasBlog", "hasReviews", "updatedAt")
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'lbl',
    'Layouts by Lenny',
    '["layoutsbylenny.com"]',
    'en',
    '["en","nl"]',
    'EUR',
    true,
    true,
    true,
    true,
    true,
    true,
    CURRENT_TIMESTAMP
);

-- ============================================
-- 3. Create AdminUser table
-- ============================================
CREATE TABLE "admin_user" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'admin',
    "storeAccess" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_user_email_key" ON "admin_user"("email");

-- ============================================
-- 4. Add storeId to existing models
-- ============================================

-- SlugRoute: add storeId, migrate data, update constraint
ALTER TABLE "slugroute" ADD COLUMN "storeId" TEXT;
UPDATE "slugroute" SET "storeId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "slugroute" ALTER COLUMN "storeId" SET NOT NULL;
DROP INDEX "slugroute_languageCode_slug_key";
CREATE UNIQUE INDEX "slugroute_storeId_languageCode_slug_key" ON "slugroute"("storeId", "languageCode", "slug");
CREATE INDEX "slugroute_storeId_idx" ON "slugroute"("storeId");
ALTER TABLE "slugroute" ADD CONSTRAINT "slugroute_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Category: add storeId
ALTER TABLE "category" ADD COLUMN "storeId" TEXT;
UPDATE "category" SET "storeId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "category" ALTER COLUMN "storeId" SET NOT NULL;
CREATE INDEX "category_storeId_idx" ON "category"("storeId");
ALTER TABLE "category" ADD CONSTRAINT "category_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ProductTemplate: add storeId
ALTER TABLE "producttemplate" ADD COLUMN "storeId" TEXT;
UPDATE "producttemplate" SET "storeId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "producttemplate" ALTER COLUMN "storeId" SET NOT NULL;
CREATE INDEX "producttemplate_storeId_idx" ON "producttemplate"("storeId");
ALTER TABLE "producttemplate" ADD CONSTRAINT "producttemplate_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Product: add storeId
ALTER TABLE "product" ADD COLUMN "storeId" TEXT;
UPDATE "product" SET "storeId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "product" ALTER COLUMN "storeId" SET NOT NULL;
CREATE INDEX "product_storeId_idx" ON "product"("storeId");
ALTER TABLE "product" ADD CONSTRAINT "product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Tag: add storeId
ALTER TABLE "tag" ADD COLUMN "storeId" TEXT;
UPDATE "tag" SET "storeId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "tag" ALTER COLUMN "storeId" SET NOT NULL;
CREATE INDEX "tag_storeId_idx" ON "tag"("storeId");
ALTER TABLE "tag" ADD CONSTRAINT "tag_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Bundle: add storeId
ALTER TABLE "bundle" ADD COLUMN "storeId" TEXT;
UPDATE "bundle" SET "storeId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "bundle" ALTER COLUMN "storeId" SET NOT NULL;
CREATE INDEX "bundle_storeId_idx" ON "bundle"("storeId");
ALTER TABLE "bundle" ADD CONSTRAINT "bundle_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Customer: add storeId, update unique constraint
ALTER TABLE "customer" ADD COLUMN "storeId" TEXT;
UPDATE "customer" SET "storeId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "customer" ALTER COLUMN "storeId" SET NOT NULL;
DROP INDEX "customer_email_key";
CREATE UNIQUE INDEX "customer_storeId_email_key" ON "customer"("storeId", "email");
CREATE INDEX "customer_storeId_idx" ON "customer"("storeId");
ALTER TABLE "customer" ADD CONSTRAINT "customer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Order: add storeId, update unique constraint
ALTER TABLE "order" ADD COLUMN "storeId" TEXT;
UPDATE "order" SET "storeId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "order" ALTER COLUMN "storeId" SET NOT NULL;
-- Drop old unique on orderNumber (was nullable unique)
DROP INDEX IF EXISTS "order_orderNumber_key";
CREATE UNIQUE INDEX "order_storeId_orderNumber_key" ON "order"("storeId", "orderNumber");
CREATE INDEX "order_storeId_idx" ON "order"("storeId");
ALTER TABLE "order" ADD CONSTRAINT "order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Review: add storeId
ALTER TABLE "review" ADD COLUMN "storeId" TEXT;
UPDATE "review" SET "storeId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "review" ALTER COLUMN "storeId" SET NOT NULL;
CREATE INDEX "review_storeId_idx" ON "review"("storeId");
ALTER TABLE "review" ADD CONSTRAINT "review_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Discount: add storeId
ALTER TABLE "discount" ADD COLUMN "storeId" TEXT;
UPDATE "discount" SET "storeId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "discount" ALTER COLUMN "storeId" SET NOT NULL;
CREATE INDEX "discount_storeId_idx" ON "discount"("storeId");
ALTER TABLE "discount" ADD CONSTRAINT "discount_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DiscountCode: add storeId, update unique constraint
ALTER TABLE "discountcode" ADD COLUMN "storeId" TEXT;
UPDATE "discountcode" SET "storeId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "discountcode" ALTER COLUMN "storeId" SET NOT NULL;
DROP INDEX "discountcode_code_key";
CREATE UNIQUE INDEX "discountcode_storeId_code_key" ON "discountcode"("storeId", "code");
CREATE INDEX "discountcode_storeId_idx" ON "discountcode"("storeId");
ALTER TABLE "discountcode" ADD CONSTRAINT "discountcode_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- NewsletterSubscriber: add storeId, update unique constraint
ALTER TABLE "newslettersubscriber" ADD COLUMN "storeId" TEXT;
UPDATE "newslettersubscriber" SET "storeId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "newslettersubscriber" ALTER COLUMN "storeId" SET NOT NULL;
DROP INDEX "newslettersubscriber_email_key";
CREATE UNIQUE INDEX "newslettersubscriber_storeId_email_key" ON "newslettersubscriber"("storeId", "email");
CREATE INDEX "newslettersubscriber_storeId_idx" ON "newslettersubscriber"("storeId");
ALTER TABLE "newslettersubscriber" ADD CONSTRAINT "newslettersubscriber_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ContentPage: add storeId, update unique constraint
ALTER TABLE "contentpage" ADD COLUMN "storeId" TEXT;
UPDATE "contentpage" SET "storeId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "contentpage" ALTER COLUMN "storeId" SET NOT NULL;
DROP INDEX "contentpage_slug_key";
CREATE UNIQUE INDEX "contentpage_storeId_slug_key" ON "contentpage"("storeId", "slug");
CREATE INDEX "contentpage_storeId_idx" ON "contentpage"("storeId");
ALTER TABLE "contentpage" ADD CONSTRAINT "contentpage_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- BlogPost: add storeId, update unique constraint
ALTER TABLE "blogpost" ADD COLUMN "storeId" TEXT;
UPDATE "blogpost" SET "storeId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "blogpost" ALTER COLUMN "storeId" SET NOT NULL;
DROP INDEX "blogpost_slug_key";
CREATE UNIQUE INDEX "blogpost_storeId_slug_key" ON "blogpost"("storeId", "slug");
CREATE INDEX "blogpost_storeId_idx" ON "blogpost"("storeId");
ALTER TABLE "blogpost" ADD CONSTRAINT "blogpost_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- 5. Update SiteSetting to be per-store
-- ============================================
-- SiteSetting currently has key as PK. We need to change to composite PK (storeId, key).
-- Add storeId column, migrate data, recreate PK.
ALTER TABLE "sitesetting" ADD COLUMN "storeId" VARCHAR(100);
UPDATE "sitesetting" SET "storeId" = '00000000-0000-0000-0000-000000000001';
ALTER TABLE "sitesetting" ALTER COLUMN "storeId" SET NOT NULL;
ALTER TABLE "sitesetting" DROP CONSTRAINT "sitesetting_pkey";
ALTER TABLE "sitesetting" ADD CONSTRAINT "sitesetting_pkey" PRIMARY KEY ("storeId", "key");
ALTER TABLE "sitesetting" ADD CONSTRAINT "sitesetting_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- 6. Create new tables for future phases
-- ============================================

-- ProductVariant
CREATE TABLE "product_variant" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "sku" VARCHAR(50),
    "ean" VARCHAR(20),
    "name" VARCHAR(100) NOT NULL,
    "priceOverride" INTEGER,
    "weightGrams" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_variant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_variant_productId_sku_key" ON "product_variant"("productId", "sku");
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Inventory
CREATE TABLE "inventory" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER,
    "variantId" INTEGER,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "quantityReserved" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_productId_key" ON "inventory"("productId");
CREATE UNIQUE INDEX "inventory_variantId_key" ON "inventory"("variantId");
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- InventoryMovement
CREATE TABLE "inventory_movement" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "variantId" INTEGER,
    "quantityChange" INTEGER NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "referenceType" VARCHAR(20),
    "referenceId" INTEGER,
    "notes" TEXT,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movement_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SalesChannel
CREATE TABLE "sales_channel" (
    "id" SERIAL NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "country" VARCHAR(2),
    "apiClientId" VARCHAR(255),
    "apiClientSecret" VARCHAR(255),
    "isLvb" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_channel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sales_channel_code_key" ON "sales_channel"("code");
ALTER TABLE "sales_channel" ADD CONSTRAINT "sales_channel_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ChannelListing
CREATE TABLE "channel_listing" (
    "id" SERIAL NOT NULL,
    "channelId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "variantId" INTEGER,
    "externalOfferId" VARCHAR(50),
    "priceInCents" INTEGER NOT NULL,
    "deliveryCode" VARCHAR(20),
    "stockSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_listing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "channel_listing_channelId_productId_variantId_key" ON "channel_listing"("channelId", "productId", "variantId");
ALTER TABLE "channel_listing" ADD CONSTRAINT "channel_listing_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "sales_channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "channel_listing" ADD CONSTRAINT "channel_listing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "channel_listing" ADD CONSTRAINT "channel_listing_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- BolSyncLog
CREATE TABLE "bol_sync_log" (
    "id" SERIAL NOT NULL,
    "channelId" INTEGER NOT NULL,
    "syncType" VARCHAR(30) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "recordsSynced" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "bol_sync_log_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "bol_sync_log" ADD CONSTRAINT "bol_sync_log_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "sales_channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ShippingZone
CREATE TABLE "shipping_zone" (
    "id" SERIAL NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "countries" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "shipping_zone_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "shipping_zone" ADD CONSTRAINT "shipping_zone_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ShippingRate
CREATE TABLE "shipping_rate" (
    "id" SERIAL NOT NULL,
    "zoneId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "minWeightGrams" INTEGER,
    "maxWeightGrams" INTEGER,
    "priceInCents" INTEGER NOT NULL,
    "freeAboveInCents" INTEGER,
    "carrier" VARCHAR(20),
    "carrierService" VARCHAR(30),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "shipping_rate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "shipping_rate" ADD CONSTRAINT "shipping_rate_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "shipping_zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Coupon
CREATE TABLE "coupon" (
    "id" SERIAL NOT NULL,
    "storeId" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "valueInCents" INTEGER NOT NULL,
    "minOrderInCents" INTEGER,
    "maxUses" INTEGER,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "coupon_storeId_code_key" ON "coupon"("storeId", "code");
ALTER TABLE "coupon" ADD CONSTRAINT "coupon_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EmailTemplate
CREATE TABLE "email_template" (
    "id" SERIAL NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "subject" VARCHAR(300) NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_template_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_template_storeId_type_locale_key" ON "email_template"("storeId", "type", "locale");
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
