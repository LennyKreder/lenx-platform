-- AlterTable
ALTER TABLE "producttemplate" ALTER COLUMN "themeSelection" SET DATA TYPE VARCHAR(20);

-- RenamePrimaryKey
ALTER TABLE "site" RENAME CONSTRAINT "store_pkey" TO "site_pkey";

-- AlterTable
ALTER TABLE "site"
ADD COLUMN     "company_info" JSONB,
ADD COLUMN     "contact_email" VARCHAR(200),
ADD COLUMN     "from_email" VARCHAR(300),
ADD COLUMN     "ga_tracking_id" VARCHAR(50);

-- RenameForeignKey
ALTER TABLE "blogpost" RENAME CONSTRAINT "blogpost_storeId_fkey" TO "blogpost_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "bundle" RENAME CONSTRAINT "bundle_storeId_fkey" TO "bundle_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "category" RENAME CONSTRAINT "category_storeId_fkey" TO "category_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "contentpage" RENAME CONSTRAINT "contentpage_storeId_fkey" TO "contentpage_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "coupon" RENAME CONSTRAINT "coupon_storeId_fkey" TO "coupon_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "customer" RENAME CONSTRAINT "customer_storeId_fkey" TO "customer_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "discount" RENAME CONSTRAINT "discount_storeId_fkey" TO "discount_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "discountcode" RENAME CONSTRAINT "discountcode_storeId_fkey" TO "discountcode_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "email_template" RENAME CONSTRAINT "email_template_storeId_fkey" TO "email_template_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "newslettersubscriber" RENAME CONSTRAINT "newslettersubscriber_storeId_fkey" TO "newslettersubscriber_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "order" RENAME CONSTRAINT "order_storeId_fkey" TO "order_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "product" RENAME CONSTRAINT "product_storeId_fkey" TO "product_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "producttemplate" RENAME CONSTRAINT "producttemplate_storeId_fkey" TO "producttemplate_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "review" RENAME CONSTRAINT "review_storeId_fkey" TO "review_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "sales_channel" RENAME CONSTRAINT "sales_channel_storeId_fkey" TO "sales_channel_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "shipping_zone" RENAME CONSTRAINT "shipping_zone_storeId_fkey" TO "shipping_zone_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "sitesetting" RENAME CONSTRAINT "sitesetting_storeId_fkey" TO "sitesetting_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "slugroute" RENAME CONSTRAINT "slugroute_storeId_fkey" TO "slugroute_siteId_fkey";

-- RenameForeignKey
ALTER TABLE "tag" RENAME CONSTRAINT "tag_storeId_fkey" TO "tag_siteId_fkey";

-- RenameIndex
ALTER INDEX "blogpost_storeId_idx" RENAME TO "blogpost_siteId_idx";

-- RenameIndex
ALTER INDEX "blogpost_storeId_slug_key" RENAME TO "blogpost_siteId_slug_key";

-- RenameIndex
ALTER INDEX "bundle_storeId_idx" RENAME TO "bundle_siteId_idx";

-- RenameIndex
ALTER INDEX "category_storeId_idx" RENAME TO "category_siteId_idx";

-- RenameIndex
ALTER INDEX "contentpage_storeId_idx" RENAME TO "contentpage_siteId_idx";

-- RenameIndex
ALTER INDEX "contentpage_storeId_slug_key" RENAME TO "contentpage_siteId_slug_key";

-- RenameIndex
ALTER INDEX "coupon_storeId_code_key" RENAME TO "coupon_siteId_code_key";

-- RenameIndex
ALTER INDEX "customer_storeId_email_key" RENAME TO "customer_siteId_email_key";

-- RenameIndex
ALTER INDEX "customer_storeId_idx" RENAME TO "customer_siteId_idx";

-- RenameIndex
ALTER INDEX "discount_storeId_idx" RENAME TO "discount_siteId_idx";

-- RenameIndex
ALTER INDEX "discountcode_storeId_code_key" RENAME TO "discountcode_siteId_code_key";

-- RenameIndex
ALTER INDEX "discountcode_storeId_idx" RENAME TO "discountcode_siteId_idx";

-- RenameIndex
ALTER INDEX "email_template_storeId_type_locale_key" RENAME TO "email_template_siteId_type_locale_key";

-- RenameIndex
ALTER INDEX "newslettersubscriber_storeId_email_key" RENAME TO "newslettersubscriber_siteId_email_key";

-- RenameIndex
ALTER INDEX "newslettersubscriber_storeId_idx" RENAME TO "newslettersubscriber_siteId_idx";

-- RenameIndex
ALTER INDEX "order_storeId_idx" RENAME TO "order_siteId_idx";

-- RenameIndex
ALTER INDEX "order_storeId_orderNumber_key" RENAME TO "order_siteId_orderNumber_key";

-- RenameIndex
ALTER INDEX "product_storeId_idx" RENAME TO "product_siteId_idx";

-- RenameIndex
ALTER INDEX "producttemplate_storeId_idx" RENAME TO "producttemplate_siteId_idx";

-- RenameIndex
ALTER INDEX "review_storeId_idx" RENAME TO "review_siteId_idx";

-- RenameIndex
ALTER INDEX "store_code_key" RENAME TO "site_code_key";

-- RenameIndex
ALTER INDEX "slugroute_storeId_idx" RENAME TO "slugroute_siteId_idx";

-- RenameIndex
ALTER INDEX "slugroute_storeId_languageCode_slug_key" RENAME TO "slugroute_siteId_languageCode_slug_key";

-- RenameIndex
ALTER INDEX "tag_storeId_idx" RENAME TO "tag_siteId_idx";
