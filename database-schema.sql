-- Full database schema for lbl-website
-- Generated from Prisma schema
-- Run this in TablePlus first, then run seed.sql

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "language" (
    "id" VARCHAR(5) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "nativeName" VARCHAR(50) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slugroute" (
    "id" SERIAL NOT NULL,
    "languageCode" VARCHAR(5) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "entityType" VARCHAR(20) NOT NULL,
    "categoryId" INTEGER,
    "templateId" INTEGER,
    "productId" INTEGER,
    "tagId" INTEGER,
    "bundleId" INTEGER,
    "redirectToId" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slugroute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" SERIAL NOT NULL,
    "parentId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorytranslation" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "languageCode" VARCHAR(5) NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "categorytranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producttemplate" (
    "id" SERIAL NOT NULL,
    "fileProperties" JSONB NOT NULL DEFAULT '{}',
    "variables" JSONB NOT NULL DEFAULT '[]',
    "defaultPriceInCents" INTEGER NOT NULL DEFAULT 0,
    "device" VARCHAR(20),
    "orientation" VARCHAR(20),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "producttemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producttemplatetranslation" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "languageCode" VARCHAR(5) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "title" VARCHAR(200),
    "seoTitle" VARCHAR(200),
    "description" TEXT,

    CONSTRAINT "producttemplatetranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER,
    "categoryId" INTEGER,
    "year" INTEGER,
    "theme" VARCHAR(50),
    "language" VARCHAR(10),
    "templateVariables" JSONB NOT NULL DEFAULT '{}',
    "priceInCents" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "images" JSONB NOT NULL DEFAULT '[]',
    "etsyListingId" VARCHAR(100),
    "downloadCode" VARCHAR(12) NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producttranslation" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "languageCode" VARCHAR(5) NOT NULL,
    "name" VARCHAR(200),
    "title" VARCHAR(200),
    "seoTitle" VARCHAR(200),
    "description" TEXT,

    CONSTRAINT "producttranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productfile" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "templateSet" VARCHAR(20),
    "timeFormat" VARCHAR(10),
    "weekStart" VARCHAR(10),
    "calendar" VARCHAR(20),
    "filePath" VARCHAR(500) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "fileSize" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tagtranslation" (
    "id" SERIAL NOT NULL,
    "tagId" INTEGER NOT NULL,
    "languageCode" VARCHAR(5) NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "tagtranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producttag" (
    "productId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "producttag_pkey" PRIMARY KEY ("productId","tagId")
);

-- CreateTable
CREATE TABLE "producttemplatetag" (
    "templateId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "producttemplatetag_pkey" PRIMARY KEY ("templateId","tagId")
);

-- CreateTable
CREATE TABLE "bundle" (
    "id" SERIAL NOT NULL,
    "discountPercent" INTEGER,
    "fixedPriceInCents" INTEGER,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "theme" VARCHAR(50),
    "isAllAccess" BOOLEAN NOT NULL DEFAULT false,
    "etsyListingId" VARCHAR(100),
    "downloadCode" VARCHAR(12) NOT NULL,
    "images" JSONB NOT NULL DEFAULT '[]',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundletranslation" (
    "id" SERIAL NOT NULL,
    "bundleId" INTEGER NOT NULL,
    "languageCode" VARCHAR(5) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "title" VARCHAR(200),
    "seoTitle" VARCHAR(200),
    "description" TEXT,

    CONSTRAINT "bundletranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundleitem" (
    "id" SERIAL NOT NULL,
    "bundleId" INTEGER NOT NULL,
    "productId" INTEGER,
    "categoryId" INTEGER,

    CONSTRAINT "bundleitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "billingCountry" VARCHAR(2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customersession" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "customersession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customeraccess" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "productId" INTEGER,
    "bundleId" INTEGER,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" VARCHAR(20) NOT NULL DEFAULT 'purchase',
    "orderId" INTEGER,

    CONSTRAINT "customeraccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "rating" INTEGER NOT NULL,
    "reviewerName" VARCHAR(100) NOT NULL,
    "reviewText" TEXT NOT NULL,
    "verifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER,
    "customerEmail" VARCHAR(255) NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "externalId" VARCHAR(100),
    "billingCountry" VARCHAR(2),
    "subtotalInCents" INTEGER NOT NULL,
    "discountInCents" INTEGER NOT NULL DEFAULT 0,
    "totalInCents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "discountCodeId" INTEGER,
    "discountCodeApplied" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderitem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER,
    "bundleId" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceInCents" INTEGER NOT NULL,

    CONSTRAINT "orderitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(20) NOT NULL,
    "valueInCents" INTEGER,
    "valuePercent" INTEGER,
    "scope" VARCHAR(20) NOT NULL,
    "productId" INTEGER,
    "categoryId" INTEGER,
    "bundleId" INTEGER,
    "excludeBundles" BOOLEAN NOT NULL DEFAULT false,
    "excludeAllAccessBundle" BOOLEAN NOT NULL DEFAULT false,
    "targetYear" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discountcode" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(20) NOT NULL,
    "valueInCents" INTEGER,
    "valuePercent" INTEGER,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "maxUsesPerCustomer" INTEGER,
    "minOrderInCents" INTEGER,
    "excludeBundles" BOOLEAN NOT NULL DEFAULT false,
    "excludeAllAccessBundle" BOOLEAN NOT NULL DEFAULT false,
    "targetYear" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discountcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discountcodeusage" (
    "id" SERIAL NOT NULL,
    "discountCodeId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discountcodeusage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "downloadlog" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER,
    "productId" INTEGER,
    "accessCode" VARCHAR(12),
    "productFileId" INTEGER,
    "fileKey" VARCHAR(150) NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "downloadlog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sitesetting" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sitesetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "slugroute_languageCode_idx" ON "slugroute"("languageCode");

-- CreateIndex
CREATE INDEX "slugroute_categoryId_idx" ON "slugroute"("categoryId");

-- CreateIndex
CREATE INDEX "slugroute_templateId_idx" ON "slugroute"("templateId");

-- CreateIndex
CREATE INDEX "slugroute_productId_idx" ON "slugroute"("productId");

-- CreateIndex
CREATE INDEX "slugroute_tagId_idx" ON "slugroute"("tagId");

-- CreateIndex
CREATE INDEX "slugroute_bundleId_idx" ON "slugroute"("bundleId");

-- CreateIndex
CREATE INDEX "slugroute_isPrimary_idx" ON "slugroute"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "slugroute_languageCode_slug_key" ON "slugroute"("languageCode", "slug");

-- CreateIndex
CREATE INDEX "category_isActive_idx" ON "category"("isActive");

-- CreateIndex
CREATE INDEX "category_parentId_idx" ON "category"("parentId");

-- CreateIndex
CREATE INDEX "categorytranslation_categoryId_idx" ON "categorytranslation"("categoryId");

-- CreateIndex
CREATE INDEX "categorytranslation_languageCode_idx" ON "categorytranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "categorytranslation_categoryId_languageCode_key" ON "categorytranslation"("categoryId", "languageCode");

-- CreateIndex
CREATE INDEX "producttemplate_isActive_idx" ON "producttemplate"("isActive");

-- CreateIndex
CREATE INDEX "producttemplate_device_idx" ON "producttemplate"("device");

-- CreateIndex
CREATE INDEX "producttemplate_orientation_idx" ON "producttemplate"("orientation");

-- CreateIndex
CREATE INDEX "producttemplatetranslation_templateId_idx" ON "producttemplatetranslation"("templateId");

-- CreateIndex
CREATE INDEX "producttemplatetranslation_languageCode_idx" ON "producttemplatetranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "producttemplatetranslation_templateId_languageCode_key" ON "producttemplatetranslation"("templateId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "product_downloadCode_key" ON "product"("downloadCode");

-- CreateIndex
CREATE INDEX "product_templateId_idx" ON "product"("templateId");

-- CreateIndex
CREATE INDEX "product_categoryId_idx" ON "product"("categoryId");

-- CreateIndex
CREATE INDEX "product_downloadCode_idx" ON "product"("downloadCode");

-- CreateIndex
CREATE INDEX "product_etsyListingId_idx" ON "product"("etsyListingId");

-- CreateIndex
CREATE INDEX "product_isPublished_idx" ON "product"("isPublished");

-- CreateIndex
CREATE INDEX "product_isFeatured_idx" ON "product"("isFeatured");

-- CreateIndex
CREATE INDEX "product_year_idx" ON "product"("year");

-- CreateIndex
CREATE INDEX "product_theme_idx" ON "product"("theme");

-- CreateIndex
CREATE INDEX "product_language_idx" ON "product"("language");

-- CreateIndex
CREATE INDEX "producttranslation_productId_idx" ON "producttranslation"("productId");

-- CreateIndex
CREATE INDEX "producttranslation_languageCode_idx" ON "producttranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "producttranslation_productId_languageCode_key" ON "producttranslation"("productId", "languageCode");

-- CreateIndex
CREATE INDEX "productfile_productId_idx" ON "productfile"("productId");

-- CreateIndex
CREATE INDEX "productfile_isActive_idx" ON "productfile"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "productfile_productId_templateSet_timeFormat_weekStart_cale_key" ON "productfile"("productId", "templateSet", "timeFormat", "weekStart", "calendar");

-- CreateIndex
CREATE INDEX "tagtranslation_tagId_idx" ON "tagtranslation"("tagId");

-- CreateIndex
CREATE INDEX "tagtranslation_languageCode_idx" ON "tagtranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "tagtranslation_tagId_languageCode_key" ON "tagtranslation"("tagId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "bundle_downloadCode_key" ON "bundle"("downloadCode");

-- CreateIndex
CREATE INDEX "bundle_downloadCode_idx" ON "bundle"("downloadCode");

-- CreateIndex
CREATE INDEX "bundle_isPublished_idx" ON "bundle"("isPublished");

-- CreateIndex
CREATE INDEX "bundle_isFeatured_idx" ON "bundle"("isFeatured");

-- CreateIndex
CREATE INDEX "bundle_isAllAccess_idx" ON "bundle"("isAllAccess");

-- CreateIndex
CREATE INDEX "bundletranslation_bundleId_idx" ON "bundletranslation"("bundleId");

-- CreateIndex
CREATE INDEX "bundletranslation_languageCode_idx" ON "bundletranslation"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "bundletranslation_bundleId_languageCode_key" ON "bundletranslation"("bundleId", "languageCode");

-- CreateIndex
CREATE INDEX "bundleitem_bundleId_idx" ON "bundleitem"("bundleId");

-- CreateIndex
CREATE INDEX "bundleitem_productId_idx" ON "bundleitem"("productId");

-- CreateIndex
CREATE INDEX "bundleitem_categoryId_idx" ON "bundleitem"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_email_key" ON "customer"("email");

-- CreateIndex
CREATE INDEX "customer_email_idx" ON "customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customersession_token_key" ON "customersession"("token");

-- CreateIndex
CREATE INDEX "customersession_token_idx" ON "customersession"("token");

-- CreateIndex
CREATE INDEX "customersession_customerId_idx" ON "customersession"("customerId");

-- CreateIndex
CREATE INDEX "customersession_expiresAt_idx" ON "customersession"("expiresAt");

-- CreateIndex
CREATE INDEX "customeraccess_customerId_idx" ON "customeraccess"("customerId");

-- CreateIndex
CREATE INDEX "customeraccess_productId_idx" ON "customeraccess"("productId");

-- CreateIndex
CREATE INDEX "customeraccess_bundleId_idx" ON "customeraccess"("bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "customeraccess_customerId_productId_key" ON "customeraccess"("customerId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "customeraccess_customerId_bundleId_key" ON "customeraccess"("customerId", "bundleId");

-- CreateIndex
CREATE INDEX "review_productId_idx" ON "review"("productId");

-- CreateIndex
CREATE INDEX "review_customerId_idx" ON "review"("customerId");

-- CreateIndex
CREATE INDEX "review_approved_idx" ON "review"("approved");

-- CreateIndex
CREATE INDEX "review_rating_idx" ON "review"("rating");

-- CreateIndex
CREATE INDEX "review_createdAt_idx" ON "review"("createdAt");

-- CreateIndex
CREATE INDEX "order_customerId_idx" ON "order"("customerId");

-- CreateIndex
CREATE INDEX "order_discountCodeId_idx" ON "order"("discountCodeId");

-- CreateIndex
CREATE INDEX "order_customerEmail_idx" ON "order"("customerEmail");

-- CreateIndex
CREATE INDEX "order_source_idx" ON "order"("source");

-- CreateIndex
CREATE INDEX "order_externalId_idx" ON "order"("externalId");

-- CreateIndex
CREATE INDEX "order_status_idx" ON "order"("status");

-- CreateIndex
CREATE INDEX "order_createdAt_idx" ON "order"("createdAt");

-- CreateIndex
CREATE INDEX "order_billingCountry_idx" ON "order"("billingCountry");

-- CreateIndex
CREATE INDEX "orderitem_orderId_idx" ON "orderitem"("orderId");

-- CreateIndex
CREATE INDEX "orderitem_productId_idx" ON "orderitem"("productId");

-- CreateIndex
CREATE INDEX "orderitem_bundleId_idx" ON "orderitem"("bundleId");

-- CreateIndex
CREATE INDEX "discount_scope_idx" ON "discount"("scope");

-- CreateIndex
CREATE INDEX "discount_productId_idx" ON "discount"("productId");

-- CreateIndex
CREATE INDEX "discount_categoryId_idx" ON "discount"("categoryId");

-- CreateIndex
CREATE INDEX "discount_bundleId_idx" ON "discount"("bundleId");

-- CreateIndex
CREATE INDEX "discount_isActive_idx" ON "discount"("isActive");

-- CreateIndex
CREATE INDEX "discount_startsAt_idx" ON "discount"("startsAt");

-- CreateIndex
CREATE INDEX "discount_endsAt_idx" ON "discount"("endsAt");

-- CreateIndex
CREATE INDEX "discount_targetYear_idx" ON "discount"("targetYear");

-- CreateIndex
CREATE UNIQUE INDEX "discountcode_code_key" ON "discountcode"("code");

-- CreateIndex
CREATE INDEX "discountcode_code_idx" ON "discountcode"("code");

-- CreateIndex
CREATE INDEX "discountcode_isActive_idx" ON "discountcode"("isActive");

-- CreateIndex
CREATE INDEX "discountcode_startsAt_idx" ON "discountcode"("startsAt");

-- CreateIndex
CREATE INDEX "discountcode_endsAt_idx" ON "discountcode"("endsAt");

-- CreateIndex
CREATE INDEX "discountcode_targetYear_idx" ON "discountcode"("targetYear");

-- CreateIndex
CREATE INDEX "discountcodeusage_discountCodeId_idx" ON "discountcodeusage"("discountCodeId");

-- CreateIndex
CREATE INDEX "discountcodeusage_orderId_idx" ON "discountcodeusage"("orderId");

-- CreateIndex
CREATE INDEX "discountcodeusage_customerId_idx" ON "discountcodeusage"("customerId");

-- CreateIndex
CREATE INDEX "downloadlog_customerId_idx" ON "downloadlog"("customerId");

-- CreateIndex
CREATE INDEX "downloadlog_productId_idx" ON "downloadlog"("productId");

-- CreateIndex
CREATE INDEX "downloadlog_accessCode_idx" ON "downloadlog"("accessCode");

-- CreateIndex
CREATE INDEX "downloadlog_productFileId_idx" ON "downloadlog"("productFileId");

-- CreateIndex
CREATE INDEX "downloadlog_downloadedAt_idx" ON "downloadlog"("downloadedAt");

-- AddForeignKey
ALTER TABLE "slugroute" ADD CONSTRAINT "slugroute_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slugroute" ADD CONSTRAINT "slugroute_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slugroute" ADD CONSTRAINT "slugroute_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "producttemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slugroute" ADD CONSTRAINT "slugroute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slugroute" ADD CONSTRAINT "slugroute_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slugroute" ADD CONSTRAINT "slugroute_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slugroute" ADD CONSTRAINT "slugroute_redirectToId_fkey" FOREIGN KEY ("redirectToId") REFERENCES "slugroute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorytranslation" ADD CONSTRAINT "categorytranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorytranslation" ADD CONSTRAINT "categorytranslation_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producttemplatetranslation" ADD CONSTRAINT "producttemplatetranslation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "producttemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producttemplatetranslation" ADD CONSTRAINT "producttemplatetranslation_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "producttemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producttranslation" ADD CONSTRAINT "producttranslation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producttranslation" ADD CONSTRAINT "producttranslation_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productfile" ADD CONSTRAINT "productfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tagtranslation" ADD CONSTRAINT "tagtranslation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tagtranslation" ADD CONSTRAINT "tagtranslation_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producttag" ADD CONSTRAINT "producttag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producttag" ADD CONSTRAINT "producttag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producttemplatetag" ADD CONSTRAINT "producttemplatetag_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "producttemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producttemplatetag" ADD CONSTRAINT "producttemplatetag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundletranslation" ADD CONSTRAINT "bundletranslation_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundletranslation" ADD CONSTRAINT "bundletranslation_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundleitem" ADD CONSTRAINT "bundleitem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundleitem" ADD CONSTRAINT "bundleitem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundleitem" ADD CONSTRAINT "bundleitem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customersession" ADD CONSTRAINT "customersession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customeraccess" ADD CONSTRAINT "customeraccess_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customeraccess" ADD CONSTRAINT "customeraccess_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customeraccess" ADD CONSTRAINT "customeraccess_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customeraccess" ADD CONSTRAINT "customeraccess_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitem" ADD CONSTRAINT "orderitem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitem" ADD CONSTRAINT "orderitem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderitem" ADD CONSTRAINT "orderitem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount" ADD CONSTRAINT "discount_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount" ADD CONSTRAINT "discount_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount" ADD CONSTRAINT "discount_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discountcodeusage" ADD CONSTRAINT "discountcodeusage_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "discountcode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
