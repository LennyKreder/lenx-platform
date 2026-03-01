-- Rename store table to site
ALTER TABLE "store" RENAME TO "site";

-- Rename storeId columns to siteId in all referencing tables
ALTER TABLE "slugroute" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "category" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "producttemplate" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "product" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "tag" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "bundle" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "customer" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "order" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "review" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "discount" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "discountcode" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "newslettersubscriber" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "sitesetting" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "contentpage" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "blogpost" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "sales_channel" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "shipping_zone" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "coupon" RENAME COLUMN "storeId" TO "siteId";
ALTER TABLE "email_template" RENAME COLUMN "storeId" TO "siteId";

-- Rename storeAccess to siteAccess in admin_user
ALTER TABLE "admin_user" RENAME COLUMN "storeAccess" TO "siteAccess";
